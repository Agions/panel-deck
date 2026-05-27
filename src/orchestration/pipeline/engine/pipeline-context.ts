/**
 * PipelineContext — 带遥测埋点的执行上下文
 * 集成 telemetry，在每个步骤执行前后自动上报
 */

import { logger } from '@/core/utils/logger';
import type { DomainEvent } from '@/domain/shared/events/domain-events';
import type { EventBus } from '@/infrastructure/queue/event-bus';
import { telemetry, TelemetryEvent } from '@/infrastructure/telemetry/telemetry';

import { DataContext } from './data-context';

export interface IStorage {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  del(key: string): void;
}

export interface PipelineContextParams {
  projectId: string;
  eventBus: EventBus;
  storage?: IStorage;
}

export interface PipelineContext {
  readonly projectId: string;
  readonly data: DataContext;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): Promise<void>;
  setMany(entries: Record<string, unknown>): Promise<void>;
  has(key: string): boolean;
  getStepData(stepId: string): Record<string, unknown>;
  saveCheckpoint(stepId: string): Promise<void>;
  emit(event: DomainEvent): void;
}

export function createPipelineContext(params: PipelineContextParams): PipelineContext {
  const data = new DataContext();

  return {
    get projectId() {
      return params.projectId;
    },
    get data() {
      return data;
    },

    get<T>(key: string): T | undefined {
      return data.get(key) as T | undefined;
    },

    async set<T>(key: string, value: T): Promise<void> {
      await data.set(key, value);
    },

    async setMany(entries: Record<string, unknown>): Promise<void> {
      await data.setMany(entries);
    },

    has(key: string): boolean {
      return data.has(key);
    },

    getStepData(stepId: string): Record<string, unknown> {
      const all = data.getAll();
      const result: Record<string, unknown> = {};
      for (const [k, v] of all) {
        if (k.startsWith(stepId + ':')) {
          result[k.slice(stepId.length + 1)] = v;
        }
      }
      return result;
    },

    async saveCheckpoint(stepId: string): Promise<void> {
      telemetry.trackStep({
        projectId: params.projectId,
        stepId,
        event: TelemetryEvent.PIPELINE_STEP_COMPLETE,
      });

      if (params.storage) {
        const snapshot = data.toJSON();
        params.storage.set('checkpoint:' + params.projectId + ':' + stepId, snapshot);
        logger.debug('[PipelineContext] Checkpoint saved for ' + stepId);
      }
    },

    emit(event: DomainEvent): void {
      params.eventBus.publish(event);
    },
  };
}

export default createPipelineContext;