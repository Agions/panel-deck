/**
 * Pipeline Bootstrap — 流水线引导程序
 * 展示：如何将各层组装在一起，形成完整流水线
 */

import { logger } from '@/core/utils/logger';
import type { IScriptService } from '@/domain/script/services/script.service';
import type { AIProvider } from '@/infrastructure/ai/providers/ai-provider.interface';
import { eventBus } from '@/infrastructure/queue/event-bus';
import type { IStorage } from '@/infrastructure/storage/storage.interface';

import { CheckpointManager } from './engine/checkpoint-manager';
import { DAGPipelineEngine } from './engine/dag-pipeline-engine';
import { createPipelineContext } from './engine/pipeline-context';
import { StepImport } from './steps/step-import';
import { StepScriptGeneration } from './steps/step-script';



/**
 * PipelineBootstrap — 流水线引导程序
 * 负责：DI 容器组装 → 步骤注册 → 引擎构建 → 执行
 */
export class PipelineBootstrap {
  private eventBus = eventBus;
  private checkpointManager: CheckpointManager;
  private storage: IStorage;
  private aiProvider: AIProvider;
  private scriptService: IScriptService;

  constructor(
    storage: IStorage,
    aiProvider: AIProvider,
    scriptService: IScriptService
  ) {
    this.storage = storage;
    this.aiProvider = aiProvider;
    this.scriptService = scriptService;

    // 初始化 CheckpointManager
    this.checkpointManager = new CheckpointManager({
      storageKey: 'pipeline-checkpoint',
    });
  }

  /**
   * 创建并执行流水线
   */
  async run(input: {
    prompt: string;
    style?: string;
    maxLength?: number;
  }): Promise<void> {
    logger.info('[PipelineBootstrap] Starting pipeline...');

    // 创建上下文
    const context = createPipelineContext({
      projectId: 'default',
      eventBus: this.eventBus,
    });

    // 创建步骤
    const importStep = new StepImport({ sourceType: "novel" });

    const scriptStep = new StepScriptGeneration({
      style: 'dramatic',
    });

    // 创建引擎
    const engine = new DAGPipelineEngine(
      {
        id: 'default',
        name: '默认流水线',
        steps: [importStep, scriptStep],
        enableCheckpoint: true,
        enableQualityGate: false,
      },
      this.eventBus
    );

    // 执行
    const result = await engine.execute(context);

    if (result.success) {
      logger.info('[PipelineBootstrap] Pipeline completed successfully');
    } else {
      logger.error('[PipelineBootstrap] Pipeline failed:', result.error);
    }
  }
}

export default PipelineBootstrap;
