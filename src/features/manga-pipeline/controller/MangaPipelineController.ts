/**
 * MangaPipelineController - 漫剧生成统一流程控制器
 *
 * 编排整个漫剧生成流水线：
 * 1. 脚本生成 (Script Generation)
 * 2. 分镜制作 (Storyboard)
 * 3. 素材匹配 (Material Matching)
 * 4. 语音合成 (Voice Synthesis)
 */

import { StepInput, StepOutput } from '@/core/pipeline/step.interface';
import { lipSyncService } from '@/core/services/lip-sync.service';
import { visualConsistencyScorer } from '@/core/services/visual-consistency-scorer.service';
import { logger } from '@/core/utils/logger';

import { BasePipelineController, StepState } from '../base/BasePipelineController';
import {
  ScriptGenerationPipeline,
  ScriptGenerationResult,
} from '../steps/step1-script-generation/pipeline-controller';
import { Storyboard } from '../steps/step2-storyboard/composer';
import { StoryboardPipeline } from '../steps/step2-storyboard/StoryboardPipeline';
import type { StoryboardGenerationResult } from '../steps/step2-storyboard/StoryboardPipeline';
import {
  MaterialMatchingPipeline,
  MaterialMatchingResult,
} from '../steps/step3-material-matching/pipeline-controller';
import {
  VoiceSynthesisPipeline,
  VoiceSynthesisResult,
} from '../steps/step4-voice-synthesis/pipeline-controller';
import { KeyframePipeline } from '../steps/step5-keyframe/pipeline-controller';
import type { KeyframePipelineResult } from '../steps/step5-keyframe/pipeline-controller';

export enum MangaPipelineStep {
  SCRIPT = 'script',
  STORYBOARD = 'storyboard',
  MATERIAL = 'material',
  VOICE = 'voice',
  KEYFRAME = 'keyframe',
}

export interface MangaPipelineInput {
  text: string;
  title?: string;
  style?: string;
}

export interface MangaPipelineState {
  currentStep: MangaPipelineStep;
  stepState: StepState;
  progress: number;
  subStepName: string;
}

export interface MangaPipelineResult {
  scriptResult?: ScriptGenerationResult;
  storyboard?: Storyboard;
  materialResult?: MaterialMatchingResult;
  voiceResult?: VoiceSynthesisResult;
  keyframeResult?: import('../steps/step5-keyframe/pipeline-controller').KeyframePipelineResult;
  /** 角色约束（从 StoryboardPipeline 流出，供视频生成使用） */
  characterConstraints?: import('../steps/step2-storyboard/StoryboardPipeline').StoryboardGenerationResult['characterConstraints'];
}

/**
 * Progress event emitted by the pipeline
 */
export interface MangaPipelineProgress {
  step: MangaPipelineStep;
  stepProgress: number;
  subStepName: string;
  overallProgress: number;
  state: StepState;
}

/**
 * Progress listener type
 */
export type ProgressListener = (event: MangaPipelineProgress) => void;

/**
 * Unified controller for the entire manga generation pipeline
 */
export class MangaPipelineController extends BasePipelineController {
  id = 'manga-pipeline';
  name = 'Manga Generation Pipeline';

  // Sub-steps across all phases
  protected subSteps = [
    '解析文本',
    '分析叙事结构',
    '生成角色卡片',
    '生成场景',
    '整合剧本',
    '质量评估',
    '生成分镜',
    '匹配素材',
    '合成语音',
    '生成关键帧',
    '合成视频',
  ];

  private scriptPipeline = new ScriptGenerationPipeline();
  private storyboardPipeline = new StoryboardPipeline();
  private materialPipeline = new MaterialMatchingPipeline();
  private voicePipeline = new VoiceSynthesisPipeline();
  private keyframePipeline = new KeyframePipeline();

  private result: MangaPipelineResult = {};
  private currentStep: MangaPipelineStep = MangaPipelineStep.SCRIPT;
  private progressListeners: ProgressListener[] = [];

  constructor() {
    super();

    // Wire up progress callbacks from sub-pipelines
    this.scriptPipeline.setProgressHandler((event) => {
      this.emitProgress(MangaPipelineStep.SCRIPT, event.progress, event.message);
    });
    this.storyboardPipeline.setProgressHandler((event) => {
      this.emitProgress(MangaPipelineStep.STORYBOARD, event.progress, event.message);
    });
    this.voicePipeline.setProgressHandler((event) => {
      this.emitProgress(MangaPipelineStep.VOICE, event.progress, event.message);
    });
    this.materialPipeline.setProgressHandler((event) => {
      this.emitProgress(MangaPipelineStep.MATERIAL, event.progress, event.message);
    });
    this.keyframePipeline.setProgressHandler((event) => {
      this.emitProgress(MangaPipelineStep.KEYFRAME, event.progress, event.message);
    });
  }

  /**
   * Subscribe to progress events
   */
  subscribe(listener: ProgressListener): () => void {
    this.progressListeners.push(listener);
    return () => {
      this.progressListeners = this.progressListeners.filter((l) => l !== listener);
    };
  }

  private emitProgress(step: MangaPipelineStep, stepProgress: number, subStepName: string) {
    const overall = this.calculateOverallProgress(step, stepProgress);
    const event: MangaPipelineProgress = {
      step,
      stepProgress,
      subStepName,
      overallProgress: overall,
      state: this._state,
    };
    this.progressListeners.forEach((l) => l(event));
    this.updateProgress(overall, subStepName);
  }

  private calculateOverallProgress(step: MangaPipelineStep, stepProgress: number): number {
    const weights: Record<MangaPipelineStep, [number, number]> = {
      [MangaPipelineStep.SCRIPT]: [0, 20],
      [MangaPipelineStep.STORYBOARD]: [20, 35],
      [MangaPipelineStep.MATERIAL]: [35, 55],
      [MangaPipelineStep.VOICE]: [55, 75],
      [MangaPipelineStep.KEYFRAME]: [75, 100],
    };
    const [start, end] = weights[step];
    return start + (stepProgress / 100) * (end - start);
  }

  protected async _doProcess(input: StepInput): Promise<StepOutput> {
    const { text, title, style = 'anime' } = input as unknown as MangaPipelineInput;

    this.result = {};
    this.currentStep = MangaPipelineStep.SCRIPT;

    try {
      // ============ Step 1: Script Generation ============
      this.emitProgress(MangaPipelineStep.SCRIPT, 0, '解析文本');
      const scriptOutput = await this.scriptPipeline.process({ text, title });
      const scriptResult = (scriptOutput as StepOutput).scriptGeneration as ScriptGenerationResult;
      this.result.scriptResult = scriptResult;
      this.emitProgress(MangaPipelineStep.SCRIPT, 100, '质量评估');
      await this.pauseCheck();

      // ============ Step 2: Storyboard ============
      this.currentStep = MangaPipelineStep.STORYBOARD;
      this.emitProgress(MangaPipelineStep.STORYBOARD, 0, '生成分镜');
      const storyboardOutput = await this.storyboardPipeline.process({
        script: scriptResult.script,
        style,
      });
      const storyboardResult = (storyboardOutput as StepOutput)
        .storyboardGeneration as StoryboardGenerationResult;
      this.result.storyboard = storyboardResult.storyboard;
      this.result.characterConstraints = storyboardResult.characterConstraints;
      // Pass character constraints to keyframe step (for character consistency in video generation)
      this.emitProgress(MangaPipelineStep.STORYBOARD, 100, '生成分镜');
      await this.pauseCheck();

      // ============ Step 3: Material Matching ============
      this.currentStep = MangaPipelineStep.MATERIAL;
      this.emitProgress(MangaPipelineStep.MATERIAL, 0, '匹配素材');
      const materialOutput = await this.materialPipeline.process({
        storyboard: this.result.storyboard,
      });
      const materialResult = (materialOutput as StepOutput)
        .materialMatching as MaterialMatchingResult;
      this.result.materialResult = materialResult;
      this.emitProgress(MangaPipelineStep.MATERIAL, 100, '匹配素材');
      await this.pauseCheck();

      // ============ Step 4: Voice Synthesis ============
      this.currentStep = MangaPipelineStep.VOICE;
      this.emitProgress(MangaPipelineStep.VOICE, 0, '合成语音');
      const voiceOutput = await this.voicePipeline.process({ script: scriptResult.script });
      const voiceResult = (voiceOutput as StepOutput).voiceSynthesis as VoiceSynthesisResult;
      this.result.voiceResult = voiceResult;
      this.emitProgress(MangaPipelineStep.VOICE, 100, '合成语音');
      await this.pauseCheck();

      // ============ Step 5: Keyframe Generation ============
      this.currentStep = MangaPipelineStep.KEYFRAME;
      this.emitProgress(MangaPipelineStep.KEYFRAME, 0, '生成关键帧');
      // Build keyframe scenes from storyboard
      const keyframeScenes = this.result.storyboard!.scenes.map((scene) => ({
        sceneId: scene.sceneId,
        sceneNumber: scene.description.sceneNumber,
        description: scene.description.prompt,
        location: scene.description.location || '',
        emotion: scene.description.emotion || '',
      }));
      const keyframeOutput = await this.keyframePipeline.process({
        scenes: keyframeScenes,
        style: style,
        aspectRatio: '16:9',
        dialogueSegments: voiceResult.dialogueSegments,
        characterReferences: (this.result.characterConstraints ?? []).map((c) => ({
          characterId: c.characterId,
          name: c.name,
          referencePrompt: c.referencePrompt,
          referenceImageUrls: c.referenceImageUrls
            ? {
                front: c.referenceImageUrls.front,
                side: c.referenceImageUrls.side,
                fullBody: c.referenceImageUrls.fullBody,
              }
            : undefined,
        })),
      });
      this.result.keyframeResult = (keyframeOutput as StepOutput).keyframePipeline as
        | KeyframePipelineResult
        | undefined;

      // ============ Lip Sync（音画同步）============
      // 对有配音的场景进行唇形同步
      if (this.result.keyframeResult) {
        await this.applyLipSync(this.result.keyframeResult);

        // ============ 视觉一致性评估 ============
        // 评估关键帧的角色一致性并记录到 metadata
        const visualResult = await this.evaluateVisualConsistency(this.result.keyframeResult);
        if (visualResult) {
          const kfResult = this.result.keyframeResult as KeyframePipelineResult;
          if (kfResult.metadata) {
            kfResult.metadata.visualConsistencyScore = visualResult.overallScore;
            logger.info(`[MangaPipeline] 视觉一致性评分: ${visualResult.overallScore}/100`);
          }
        }
      }

      this.emitProgress(MangaPipelineStep.KEYFRAME, 100, '合成视频');

      return this.result as StepOutput;
    } catch (err) {
      this.checkpointOnError(this.result);
      throw err;
    }
  }

  /**
   * Skip the current step and continue
   */
  skipCurrentStep(): void {
    // Mark current step as done and move on
    const currentProgress = this.calculateOverallProgress(this.currentStep, 100);
    this.updateProgress(currentProgress);
  }

  /**
   * Get current pipeline state for UI binding
   */
  getPipelineState(): MangaPipelineState {
    return {
      currentStep: this.currentStep,
      stepState: this._state,
      progress: this._progress,
      subStepName: this.subSteps[this.currentSubStep] || '',
    };
  }

  /**
   * Get partial results (useful for checkpoint recovery)
   */
  getPartialResults(): MangaPipelineResult {
    return this.result;
  }

  /**
   * 对关键帧视频片段进行唇形同步（音画对齐）
   * 遍历所有场景，对有 audioUrl 的场景调用 syncLip 生成唇形同步版本
   */
  private async applyLipSync(keyframeResult: KeyframePipelineResult): Promise<void> {
    if (!keyframeResult?.keyframeScenes) return;

    const scenesWithAudio = keyframeResult.keyframeScenes.filter(
      (scene) => scene.audioUrl && scene.keyframes.length > 0
    );

    if (scenesWithAudio.length === 0) {
      logger.info('[MangaPipeline] 无需唇形同步的场景（无配音）');
      return;
    }

    logger.info(`[MangaPipeline] 开始唇形同步，共 ${scenesWithAudio.length} 个场景`);

    // 并发处理所有需要唇形同步的场景（限制并发数防止 API 过载）
    const CONCURRENCY = 3;
    for (let i = 0; i < scenesWithAudio.length; i += CONCURRENCY) {
      const batch = scenesWithAudio.slice(i, i + CONCURRENCY);
      // lip-sync 阶段占 KEYFRAME 步的 60%~80%
      const lipProgress = 60 + Math.round((i / scenesWithAudio.length) * 20);
      this.updateProgress(lipProgress, `唇同步 ${i + 1}/${scenesWithAudio.length}`);
      await Promise.allSettled(
        batch.map(async (scene) => {
          try {
            // 获取场景的首帧图片 URL 作为视频源
            const sourceImageUrl = scene.keyframes[0].startFrame.imageUrl;

            const result = await lipSyncService.syncLip(sourceImageUrl, scene.audioUrl!);

            // 如果是异步任务（processing），轮询等待完成
            if (result.status === 'processing' && result.taskId) {
              let attempts = 0;
              const maxAttempts = 30;
              while (result.status === 'processing' && attempts < maxAttempts) {
                await new Promise((r) => setTimeout(r, 2000));
                const statusResult = await lipSyncService.getLipSyncStatus(result.taskId);
                result.url = statusResult.url || result.url;
                result.status = statusResult.status;
                attempts++;
              }
            }

            if (result.url) {
              // 用唇形同步后的视频 URL 替换首帧图片
              scene.keyframes[0].startFrame.imageUrl = result.url;
              logger.info(`[MangaPipeline] 场景 ${scene.sceneNumber} 唇形同步完成`);
            }
          } catch (err) {
            logger.warn(`[MangaPipeline] 场景 ${scene.sceneNumber} 唇形同步失败: ${err}`);
          }
        })
      );
    }
  }

  /**
   * 评估关键帧视频的角色视觉一致性
   * 提取所有场景的关键帧图像，与角色三视图参考进行比对
   */
  private async evaluateVisualConsistency(
    keyframeResult: KeyframePipelineResult
  ): Promise<ReturnType<typeof visualConsistencyScorer.evaluate> | null> {
    try {
      const scenes = keyframeResult.keyframeScenes;
      if (!scenes || scenes.length === 0) return null;

      // 提取所有关键帧 URL（每个场景取首帧）
      const frameUrls = scenes
        .map((s) => s.keyframes[0]?.startFrame?.imageUrl)
        .filter((url): url is string => !!url);

      if (frameUrls.length === 0) {
        logger.info('[MangaPipeline] 无关键帧图像可用于视觉一致性评估');
        return null;
      }

      // 使用 StoryboardPipeline 输出的 characterReferences 进行真实的视觉一致性评估
      const result = await visualConsistencyScorer.evaluate({
        frameUrls,
        characterReferences: (this.result.characterConstraints ?? []).map((c) => ({
          characterId: c.characterId,
          name: c.name,
          referencePrompt: c.referencePrompt,
          referenceImageUrls: c.referenceImageUrls
            ? {
                front: c.referenceImageUrls.front,
                side: c.referenceImageUrls.side,
                fullBody: c.referenceImageUrls.fullBody,
              }
            : undefined,
        })),
      });

      return result;
    } catch (err) {
      logger.warn(`[MangaPipeline] 视觉一致性评估失败: ${err}`);
      return null;
    }
  }
}
