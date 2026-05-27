/**
 * Pipeline Step Interface — 步骤标准化接口
 * 所有流水线步骤实现此接口，引擎通过 execute() 驱动
 */

import type { DomainEvent } from '@/domain/shared/events/domain-events';

import type { PipelineContext } from './pipeline-context';
export type { PipelineContext };

/** 步骤状态 */
export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  RETRYING = 'retrying',
}

/** 执行模式 */
export enum ExecutionMode {
  SEQUENCE = 'sequence',
  PARALLEL = 'parallel',
  DAG = 'dag',
  LOOP = 'loop',
}

/** 重试策略 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  retryableErrors?: string[];
}

/** 步骤执行结果 */
export interface StepResult {
  readonly stepId: string;
  readonly status: StepStatus;
  readonly data?: unknown;
  readonly metrics?: StepMetrics;
  readonly error?: string;
  readonly checkpoints?: CheckpointInfo[];
}

export interface StepMetrics {
  durationMs: number;
  tokensUsed?: number;
  costEstimate?: number;
  framesProcessed?: number;
  qualityScore?: number;
}

export interface CheckpointInfo {
  id: string;
  completed: boolean;
  timestamp: number;
}

/** 进度事件 */
export interface StepProgressEvent {
  stepId: string;
  progress: number; // 0-100
  message: string;
  detail?: string;
}

/**
 * IPipelineStep — 流水线步骤接口
 * 上层（编排引擎）只依赖此接口，不引用具体实现
 */
export interface IPipelineStep {
  readonly id: string;
  readonly name: string;
  readonly stepType: string;
  readonly executionMode: ExecutionMode;
  readonly dependencies: string[];
  readonly retryPolicy: RetryPolicy;
  readonly enableCheckpoint: boolean;

  /** 异步执行入口 */
  execute(ctx: PipelineContext): Promise<StepResult>;

  /** 检测是否支持从检查点恢复 */
  canResume(): boolean;

  /** 进度回调（引擎设置） */
  onProgress?: (event: StepProgressEvent) => void;

  /** 暂停 */
  pause(): Promise<void>;

  /** 恢复 */
  resume(): void;

  /** 取消 */
  cancel(): void;
}

/**
 * IStepFactory — 步骤工厂接口（用于测试替身）
 */
export interface IStepFactory {
  createStep(stepType: string, config: unknown): IPipelineStep;
}

/** 默认重试策略 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
};

/**
 * BasePipelineStep — 步骤基类（可选继承）
 * 提供公共逻辑：重试、暂停检测、进度报告
 */
export abstract class BasePipelineStep implements IPipelineStep {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly stepType: string;
  readonly executionMode: ExecutionMode = ExecutionMode.SEQUENCE;
  readonly dependencies: string[] = [];
  readonly retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY;
  readonly enableCheckpoint = true;

  private _isPaused = false;
  private _isCancelled = false;
  private _progressHandlers: ((event: StepProgressEvent) => void)[] = [];

  get isPaused(): boolean {
    return this._isPaused;
  }

  onProgress?: (event: StepProgressEvent) => void;

  abstract execute(ctx: PipelineContext): Promise<StepResult>;

  canResume(): boolean {
    return this.enableCheckpoint;
  }

  pause(): Promise<void> {
    this._isPaused = true;
    return Promise.resolve();
  }

  resume(): void {
    this._isPaused = false;
  }

  cancel(): void {
    this._isCancelled = true;
    this._isPaused = false;
  }

  protected async checkPause(): Promise<void> {
    while (this._isPaused) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  protected checkCancelled(): void {
    if (this._isCancelled) {
      throw new Error(`Step ${this.id} cancelled`);
    }
  }

  protected reportProgress(progress: number, message: string, detail?: string): void {
    const event: StepProgressEvent = { stepId: this.id, progress, message, detail };
    this.onProgress?.(event);
    for (const handler of this._progressHandlers) {
      handler(event);
    }
  }

  protected async executeWithRetry(
    ctx: PipelineContext,
    fn: () => Promise<StepResult>
  ): Promise<StepResult> {
    let lastError: Error | null = null;
    let delay = this.retryPolicy.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryPolicy.maxRetries; attempt++) {
      this.checkCancelled();
      await this.checkPause();

      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        const errorMsg = lastError.message;

        // Check if error is retryable
        const isRetryable =
          !this.retryPolicy.retryableErrors ||
          this.retryPolicy.retryableErrors.some((pattern) =>
            errorMsg.includes(pattern)
          );

        if (!isRetryable || attempt === this.retryPolicy.maxRetries) {
          throw lastError;
        }

        logger.warn(`[Step:${this.id}] Retry attempt ${attempt + 1} after ${delay}ms: ${errorMsg}`);
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * this.retryPolicy.backoffMultiplier, this.retryPolicy.maxDelayMs);
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }
}