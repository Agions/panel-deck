import type { Storyboard } from '@/features/manga-pipeline/steps/step2-storyboard/composer';

import {
  PipelineStep,
  StepInput,
  StepOutput,
  CheckpointState,
} from '../../../../core/pipeline/step.interface';

import { BatchGenerationPlan, createAIGenerationPlan } from './services/ai-material-generator';
import { MaterialMatch, batchSearch } from './services/material-searcher';
import { MaterialGroup, groupMaterials } from './services/smart-grouper';

export interface MaterialMatchingResult {
  storyboard: Storyboard;
  matches: MaterialMatch[];
  groups: MaterialGroup[];
  aiGenerationPlan: BatchGenerationPlan | null;
  coverage: number; // 0-1，有素材覆盖的场景比例
}

export class MaterialMatchingPipeline implements PipelineStep<MaterialMatchingResult> {
  id = 'material-matching';
  name = 'Material Matching';

  private _checkpoint: CheckpointState<MaterialMatchingResult> | null = null;
  private _progress: number = 0;
  onProgress?: (event: { stepId: string; progress: number; message: string }) => void;

  setProgressHandler(handler: typeof this.onProgress) {
    this.onProgress = handler;
  }

  private reportProgress(progress: number, message: string) {
    this._progress = progress;
    this.onProgress?.({ stepId: this.id, progress, message });
  }

  async execute(input: StepInput): Promise<StepOutput> {
    return this.process(input);
  }

  async process(input: StepInput): Promise<StepOutput> {
    const { storyboard } = input as StepInput & { storyboard: Storyboard };

    // Step 1: 批量搜索素材
    this.reportProgress(0, '搜索素材');
    const matches = await batchSearch(storyboard, { maxResultsPerScene: 3 });
    this.reportProgress(30, '搜索素材');

    // Step 2: 智能分组
    this.reportProgress(30, '智能分组');
    const groups = groupMaterials(matches);
    this.reportProgress(50, '智能分组');

    // Step 3: 为未匹配场景生成 AI 方案
    const scenesNeedingAI = matches
      .filter((m) => m.matches.length === 0)
      .map((m) => storyboard.scenes.find((s) => s.sceneId === m.sceneId)!)
      .filter(Boolean);

    const aiGenerationPlan =
      scenesNeedingAI.length > 0 ? createAIGenerationPlan(scenesNeedingAI) : null;
    this.reportProgress(70, '生成AI素材方案');

    // Step 4: 计算覆盖率
    this.reportProgress(80, '计算覆盖率');
    const coveredScenes = matches.filter((m) => m.matches.length > 0).length;
    const coverage = coveredScenes / matches.length;
    this.reportProgress(90, '计算覆盖率');
    this.reportProgress(100, '完成');

    const result: MaterialMatchingResult = {
      storyboard,
      matches,
      groups,
      aiGenerationPlan,
      coverage,
    };

    return { materialMatching: result } as StepOutput;
  }

  getCheckpoint() {
    return this._checkpoint;
  }

  restore(state: CheckpointState<MaterialMatchingResult>) {
    this._checkpoint = state;
  }
}
