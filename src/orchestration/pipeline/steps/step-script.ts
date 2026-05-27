/**
 * Step Script Generation — 剧本生成步骤实现
 * 展示：如何实现 IPipelineStep 接口，接入 DAGPipelineEngine
 */

import { logger } from '@/core/utils/logger';
import { ScriptService, type GenerateOptions } from '@/domain/script/services/script.service';
import {
  StepCompletedEvent,
  StepFailedEvent,
} from '@/domain/shared/events/domain-events';

import { BasePipelineStep, StepStatus, type StepResult, type PipelineContext , IStepFactory } from '../engine/step.interface';

/**
 * StepScriptConfig — 剧本生成步骤配置
 */
export interface StepScriptConfig {
  maxScenes?: number;
  style?: string;
  language?: string;
}

/**
 * StepScriptGeneration — 剧本生成步骤
 * 实现 IPipelineStep，接入 DAGPipelineEngine
 */
export class StepScriptGeneration extends BasePipelineStep {
  readonly id = 'script-generation';
  readonly name = '剧本生成';
  readonly stepType = 'script';
  readonly dependencies: string[] = ['import'];

  private config: StepScriptConfig;

  constructor(config: StepScriptConfig = {}) {
    super();
    this.config = config;
  }

  async execute(ctx: PipelineContext): Promise<StepResult> {
    this.reportProgress(0, '初始化剧本生成服务');

    // Get input from context
    const sourceText = ctx.get<string>('sourceText');
    if (!sourceText) {
      throw new Error('No source text found in pipeline context');
    }

    // Check for pause
    await this.checkPause();
    this.checkCancelled();

    this.reportProgress(20, '正在调用 AI 生成剧本');

    // Get ScriptService from context (injected by engine)
    const scriptService = ctx.get<ScriptService>('scriptService');
    if (!scriptService) {
      throw new Error('ScriptService not found in context');
    }

    try {
      // Generate script
      const options: GenerateOptions = {
        style: this.config.style as GenerateOptions['style'],
      };

      const scriptResult = await scriptService.generateScript(sourceText, options);

      this.reportProgress(80, '保存剧本数据');

      // Parse the generated script
      const parsedScript = await scriptService.parseScript(scriptResult.content);

      // Store result in context for downstream steps
      ctx.set('script', parsedScript);
      ctx.set('sceneCount', parsedScript.scenes.length);

      // Emit step completed event
      ctx.emit(new StepCompletedEvent('StepScriptGeneration', this.id, Date.now() - Date.now(), {
        sceneCount: parsedScript.scenes.length,
      }));

      this.reportProgress(100, '剧本生成完成');

      return {
        stepId: this.id,
        status: StepStatus.COMPLETED,
        data: { script: parsedScript, sceneCount: parsedScript.scenes.length },
        metrics: {
          durationMs: Date.now() - Date.now(),
          tokensUsed: 0,
        },
      };
    } catch (err) {
      const error = err as Error;
      logger.error(`[StepScript] Failed: ${error.message}`);

      ctx.emit(new StepFailedEvent('StepScriptGeneration', this.id, error.message, true));

      return {
        stepId: this.id,
        status: StepStatus.FAILED,
        error: error.message,
        metrics: { durationMs: 0 },
      };
    }
  }

  canResume(): boolean {
    return true;
  }
}

// ========== Step Factory (for testing) ==========


export class StepScriptFactory implements IStepFactory {
  createStep(stepType: string, config: unknown): import('../engine/step.interface').IPipelineStep {
    if (stepType === 'script') {
      return new StepScriptGeneration(config as StepScriptConfig);
    }
    throw new Error(`Unknown step type: ${stepType}`);
  }
}