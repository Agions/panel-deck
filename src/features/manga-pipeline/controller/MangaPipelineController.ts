/**
 * MangaPipelineController - 漫剧生成统一流程控制器
 * 
 * 编排整个漫剧生成流水线：
 * 1. 脚本生成 (Script Generation)
 * 2. 分镜制作 (Storyboard)
 * 3. 素材匹配 (Material Matching)
 * 4. 语音合成 (Voice Synthesis)
 */

import { BasePipelineController, StepState } from '../base/BasePipelineController';
import { ScriptGenerationPipeline, ScriptGenerationResult } from '../steps/step1-script-generation/pipeline-controller';
import { composeStoryboard, Storyboard } from '../steps/step2-storyboard/storyboard-composer';
import { MaterialMatchingPipeline, MaterialMatchingResult } from '../steps/step3-material-matching/pipeline-controller';
import { VoiceSynthesisPipeline, VoiceSynthesisResult } from '../steps/step4-voice-synthesis/pipeline-controller';
import { KeyframePipeline } from '../steps/step5-keyframe/pipeline-controller';

export enum MangaPipelineStep {
  SCRIPT = 'script',
  STORYBOARD = 'storyboard',
  MATERIAL = 'material',
  VOICE = 'voice',
  KEYFRAME = 'keyframe',
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
  private storyboardPipeline = null as any; // placeholder
  private materialPipeline = new MaterialMatchingPipeline();
  private voicePipeline = new VoiceSynthesisPipeline();
  private keyframePipeline = new KeyframePipeline();

  private result: MangaPipelineResult = {};
  private currentStep: MangaPipelineStep = MangaPipelineStep.SCRIPT;
  private progressListeners: ProgressListener[] = [];

  constructor() {
    super();
    
    // Wire up progress callbacks from sub-pipelines
    this.scriptPipeline.onProgress((event) => {
      this.emitProgress(MangaPipelineStep.SCRIPT, event.progress, event.message);
    });
  }

  /**
   * Subscribe to progress events
   */
  subscribe(listener: ProgressListener): () => void {
    this.progressListeners.push(listener);
    return () => {
      this.progressListeners = this.progressListeners.filter(l => l !== listener);
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
    this.progressListeners.forEach(l => l(event));
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

  protected async processStep(input: any): Promise<any> {
    const { text, title, style = 'anime' } = input;

    this.result = {};
    this.currentStep = MangaPipelineStep.SCRIPT;

    try {
      // ============ Step 1: Script Generation ============
      this.emitProgress(MangaPipelineStep.SCRIPT, 0, '解析文本');
      const scriptOutput = await this.scriptPipeline.process({ text, title });
      const scriptResult = (scriptOutput as any).scriptGeneration as ScriptGenerationResult;
      this.result.scriptResult = scriptResult;
      this.emitProgress(MangaPipelineStep.SCRIPT, 100, '质量评估');
      await this.pauseCheck();

      // ============ Step 2: Storyboard ============
      this.currentStep = MangaPipelineStep.STORYBOARD;
      this.emitProgress(MangaPipelineStep.STORYBOARD, 0, '生成分镜');
      const storyboard = composeStoryboard(scriptResult.script, { style });
      this.result.storyboard = storyboard;
      this.emitProgress(MangaPipelineStep.STORYBOARD, 100, '生成分镜');
      await this.pauseCheck();

      // ============ Step 3: Material Matching ============
      this.currentStep = MangaPipelineStep.MATERIAL;
      this.emitProgress(MangaPipelineStep.MATERIAL, 0, '匹配素材');
      const materialOutput = await this.materialPipeline.process({ storyboard });
      const materialResult = (materialOutput as any).materialMatching as MaterialMatchingResult;
      this.result.materialResult = materialResult;
      this.emitProgress(MangaPipelineStep.MATERIAL, 100, '匹配素材');
      await this.pauseCheck();

      // ============ Step 4: Voice Synthesis ============
      this.currentStep = MangaPipelineStep.VOICE;
      this.emitProgress(MangaPipelineStep.VOICE, 0, '合成语音');
      const voiceOutput = await this.voicePipeline.process({ script: scriptResult.script });
      const voiceResult = (voiceOutput as any).voiceSynthesis as VoiceSynthesisResult;
      this.result.voiceResult = voiceResult;
      this.emitProgress(MangaPipelineStep.VOICE, 100, '合成语音');
      await this.pauseCheck();

      // ============ Step 5: Keyframe Generation ============
      this.currentStep = MangaPipelineStep.KEYFRAME;
      this.emitProgress(MangaPipelineStep.KEYFRAME, 0, '生成关键帧');
      // Build keyframe scenes from storyboard
      const keyframeScenes = this.result.storyboard!.scenes.map(scene => ({
        sceneId: scene.sceneId,
        sceneNumber: scene.description.sceneNumber,
        description: scene.description.prompt,
        location: scene.description.location || '',
        emotion: scene.description.emotion || '',
      }));
      const keyframeOutput = await this.keyframePipeline.process({
        scenes: keyframeScenes,
        style: style as any,
        aspectRatio: '16:9' as any,
      });
      this.result.keyframeResult = (keyframeOutput as any).keyframePipeline;
      this.emitProgress(MangaPipelineStep.KEYFRAME, 100, '合成视频');

      return { mangaPipeline: this.result };
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
}
