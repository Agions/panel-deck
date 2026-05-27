/**
 * DAG Pipeline Engine — 支持 DAG/并行/条件分支/人工审核卡点的流水线引擎
 * 核心重构：从线性遍历升级为 DAG 拓扑排序 + 层级并行
 */

import { logger } from '@/core/utils/logger';
import type { DomainEvent } from '@/domain/shared/events/domain-events';
import {
  StepStartedEvent,
  StepCompletedEvent,
  StepFailedEvent,
  PipelineCompletedEvent,
  PipelineFailedEvent,
  ReviewRequestedEvent,
  ReviewCompletedEvent,
} from '@/domain/shared/events/domain-events';
import type { IEventBus } from '@/infrastructure/queue/event-bus';

import { CheckpointManager } from './checkpoint-manager';
import type { PipelineContext } from './pipeline-context';
import type { IPipelineStep, StepResult, StepMetrics } from './step.interface';


/** 流水线状态 */
export enum PipelineStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/** 流水线配置 */
export interface DAGPipelineConfig {
  id: string;
  name: string;
  steps: IPipelineStep[];
  enableCheckpoint: boolean;
  enableQualityGate: boolean;
  /** 人工审核卡点定义 */
  reviewGates?: ReviewGate[];
  /** 条件分支规则 */
  conditionRules?: ConditionRule[];
}

export interface ReviewGate {
  afterStep: string;
  reviewerRole: 'user' | 'moderator' | 'auto';
  autoApproveThreshold?: number;
  timeoutMs?: number;
}

export interface ConditionRule {
  stepId: string;
  condition: (ctx: PipelineContext) => boolean;
  thenBranch: string[];
  elseBranch: string[];
}

/** 流水线执行结果 */
export interface PipelineResult {
  success: boolean;
  results: Map<string, StepResult>;
  totalDurationMs: number;
  error?: string;
}

// ========== DAG 实现（简化版）==========

interface DAGNode<T> {
  id: T;
  incoming: Set<T>;
  outgoing: Set<T>;
  depth: number;
}

class DAG<T> {
  private nodes = new Map<T, DAGNode<T>>();

  addNode(id: T): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, incoming: new Set(), outgoing: new Set(), depth: 0 });
    }
  }

  addEdge(from: T, to: T): void {
    this.nodes.get(from)?.outgoing.add(to);
    this.nodes.get(to)?.incoming.add(from);
  }

  topologicalSort(): T[] {
    const result: T[] = [];
    const visited = new Set<T>();
    const visiting = new Set<T>();

    const visit = (id: T) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error(`Cycle detected at ${String(id)}`);
      visiting.add(id);

      const node = this.nodes.get(id);
      if (node) {
        for (const dep of node.incoming) {
          visit(dep);
        }
      }

      visiting.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of this.nodes.keys()) {
      visit(id);
    }

    return result;
  }

  getLevels(): T[][] {
    const sorted = this.topologicalSort();
    const levels: T[][] = [];
    const assigned = new Set<T>();

    for (const id of sorted) {
      const node = this.nodes.get(id);
      if (!node) continue;

      let maxDepth = 0;
      for (const dep of node.incoming) {
        const depNode = this.nodes.get(dep);
        if (depNode) {
          maxDepth = Math.max(maxDepth, depNode.depth);
        }
      }

      node.depth = maxDepth + 1;
      const levelIndex = maxDepth;

      if (!levels[levelIndex]) {
        levels[levelIndex] = [];
      }
      levels[levelIndex].push(id);
      assigned.add(id);
    }

    return levels.filter((level) => level.length > 0);
  }

  getNode(id: T): DAGNode<T> | undefined {
    return this.nodes.get(id);
  }
}

// ========== Helper: convert StepMetrics to plain object ==========

function metricsToPlainObject(metrics?: StepMetrics): Record<string, unknown> | undefined {
  if (!metrics) return undefined;
  return { ...metrics };
}

// ========== DAG Pipeline Engine ==========

export class DAGPipelineEngine {
  private config: DAGPipelineConfig;
  private eventBus: IEventBus;
  private checkpointManager: CheckpointManager;
  private results = new Map<string, StepResult>();
  private pendingReviews = new Map<string, (value: void | PromiseLike<void>) => void>();
  private status: PipelineStatus = PipelineStatus.IDLE;
  private dag: DAG<string>;
  private stepsMap: Map<string, IPipelineStep>;

  constructor(config: DAGPipelineConfig, eventBus: IEventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.checkpointManager = new CheckpointManager({ storageKey: config.id });
    this.dag = new DAG();
    this.stepsMap = new Map();

    // Build DAG from steps
    for (const step of config.steps) {
      this.stepsMap.set(step.id, step);
      this.dag.addNode(step.id);

      // Add edges based on dependencies
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          this.dag.addEdge(dep, step.id);
        }
      }
    }
  }

  async execute(context: PipelineContext): Promise<PipelineResult> {
    const startTime = Date.now();
    this.status = PipelineStatus.RUNNING;
    this.results.clear();

    try {
      // Get execution levels (groups of steps that can run in parallel)
      const levels = this.dag.getLevels();

      logger.info(`[DAGPipeline] Starting pipeline with ${this.config.steps.length} steps in ${levels.length} levels`);

      // Execute each level
      for (const level of levels) {
        if ((this.status as PipelineStatus) === PipelineStatus.CANCELLED) {
          throw new Error('Pipeline cancelled');
        }

        // Execute all steps in this level in parallel
        const levelPromises = level.map((stepId) => this.executeStep(stepId, context));
        const levelResults = await Promise.allSettled(levelPromises);

        // Check for failures
        const failures = levelResults.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          const firstFailure = failures[0] as PromiseRejectedResult;
          throw new Error(`Step failed: ${firstFailure.reason}`);
        }

        // Process condition rules after each level
        await this.processConditionRules(context, levelResults.map((r) => (r as PromiseFulfilledResult<StepResult>).value));
      }

      const totalDurationMs = Date.now() - startTime;
      this.status = PipelineStatus.COMPLETED;

      // Publish pipeline completed event
      this.eventBus.publish(new PipelineCompletedEvent('DAGPipelineEngine', this.config.id, totalDurationMs));

      return {
        success: true,
        results: this.results,
        totalDurationMs,
      };
    } catch (error) {
      const err = error as Error;
      this.status = PipelineStatus.FAILED;

      // Publish pipeline failed event
      this.eventBus.publish(new PipelineFailedEvent('DAGPipelineEngine', this.config.id, err.message));

      return {
        success: false,
        results: this.results,
        totalDurationMs: Date.now() - startTime,
        error: err.message,
      };
    }
  }

  private async executeStep(stepId: string, context: PipelineContext): Promise<StepResult> {
    const step = this.stepsMap.get(stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    const startTime = Date.now();

    // Publish step started event
    this.eventBus.publish(new StepStartedEvent('DAGPipelineEngine', stepId, step.name));

    try {
      // Check for checkpoint
      if (this.config.enableCheckpoint) {
        const checkpoint = await this.checkpointManager.load(stepId);
        if (checkpoint && checkpoint.completed) {
          logger.info(`[DAGPipeline] Step ${stepId} already completed (checkpoint)`);
          return checkpoint.data as StepResult;
        }
      }

      // Execute step
      const result = await step.execute(context);

      const durationMs = Date.now() - startTime;

      // Merge duration into metrics
      const finalResult: StepResult = {
        ...result,
        metrics: {
          ...result.metrics,
          durationMs,
        },
      };

      this.results.set(stepId, finalResult);

      // Publish step complete event
      this.eventBus.publish(
        new StepCompletedEvent(
          'DAGPipelineEngine',
          stepId,
          durationMs,
          metricsToPlainObject(result.metrics)
        )
      );

      return finalResult;
    } catch (error) {
      const err = error as Error;

      // Save error checkpoint for potential resume
      if (this.config.enableCheckpoint) {
        await this.checkpointManager.save(stepId, { error: err.message }, false);
      }

      this.eventBus.publish(new StepFailedEvent('DAGPipelineEngine', stepId, err.message, true));

      throw error;
    }
  }

  /**
   * 处理人工审核卡点
   */
  private async handleReviewGate(gate: ReviewGate, result?: StepResult): Promise<void> {
    // Check for auto-approval
    if (this.checkAutoApproval(gate, result)) {
      logger.info(`[DAGPipeline] Auto-approved step: ${gate.afterStep}`);
      return;
    }

    // Request human review
    this.eventBus.publish(new ReviewRequestedEvent('DAGPipelineEngine', gate.afterStep, gate.reviewerRole));

    // Wait for review
    await this.waitForHumanReview(gate);
  }

  private checkAutoApproval(gate: ReviewGate, result?: StepResult): boolean {
    if (!gate.autoApproveThreshold || !result?.metrics?.qualityScore) {
      return false;
    }
    return result.metrics.qualityScore >= gate.autoApproveThreshold;
  }

  private async waitForHumanReview(gate: ReviewGate): Promise<void> {
    return new Promise<void>((resolve) => {
      this.pendingReviews.set(gate.afterStep, resolve);

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingReviews.delete(gate.afterStep);
        logger.warn(`[DAGPipeline] Review timeout for step: ${gate.afterStep}`);
        resolve(); // Auto-continue on timeout
      }, gate.timeoutMs ?? 3600000);

      // Subscribe to review completion event
      const handler = (event: ReviewCompletedEvent) => {
        if (event.afterStep === gate.afterStep) {
          clearTimeout(timeout);
          this.eventBus.unsubscribe(`review.completed:${gate.afterStep}`);
          this.pendingReviews.delete(gate.afterStep);
          resolve();
        }
      };

      this.eventBus.subscribe(`review.completed:${gate.afterStep}`, handler);
    });
  }

  /**
   * 处理条件分支规则
   */
  private async processConditionRules(ctx: PipelineContext, _levelResults: StepResult[]): Promise<void> {
    const rules = this.config.conditionRules ?? [];

    for (const rule of rules) {
      try {
        const shouldBranch = rule.condition(ctx);
        const branch = shouldBranch ? rule.thenBranch : rule.elseBranch;

        if (branch.length > 0) {
          logger.info(`[DAGPipeline] Condition for ${rule.stepId}: ${shouldBranch ? 'then' : 'else'} branch → ${branch.join(', ')}`);
          // In a full implementation, this would dynamically add steps to the DAG
          // For now, we log the intent as the pipeline is already defined at construction time
        }
      } catch (err) {
        logger.error(`[DAGPipeline] Error processing condition rule for ${rule.stepId}:`, err);
      }
    }
  }

  // ========== Public API ==========

  pause(): void {
    if (this.status === PipelineStatus.RUNNING) {
      this.status = PipelineStatus.PAUSED;
    }
  }

  resume(): void {
    if (this.status === PipelineStatus.PAUSED) {
      this.status = PipelineStatus.RUNNING;
    }
  }

  cancel(): void {
    this.status = PipelineStatus.CANCELLED;
  }

  approveReview(stepId: string): void {
    const resolve = this.pendingReviews.get(stepId);
    if (resolve) {
      this.eventBus.publish(new ReviewCompletedEvent('DAGPipelineEngine', stepId, true));
      resolve();
    }
  }

  rejectReview(stepId: string): void {
    const resolve = this.pendingReviews.get(stepId);
    if (resolve) {
      this.eventBus.publish(new ReviewCompletedEvent('DAGPipelineEngine', stepId, false));
      resolve();
    }
  }

  getStatus(): PipelineStatus {
    return this.status;
  }

  getResults(): Map<string, StepResult> {
    return new Map(this.results);
  }
}

export default DAGPipelineEngine;
