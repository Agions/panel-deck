/**
 * StoryboardPipeline — PipelineStep wrapper for composeStoryboard
 *
 * Wraps the synchronous composeStoryboard() function with:
 * - BasePipelineController lifecycle (pause/resume/checkpoint)
 * - Progress reporting across sub-steps
 * - Integration with MangaPipelineController's progress callbacks
 */

import { StepInput, StepOutput, CheckpointState } from '../../../../core/pipeline/step.interface';
import { BasePipelineController } from '../../base/BasePipelineController';
import { Script } from '../step1-script-generation/types/script';

import { composeStoryboard, type Storyboard, type StoryboardOptions } from './composer';
import {
  type CharacterIllustration,
  type EnhancedCharacterConstraint,
  type CharacterIllustration as CharacterIllustration2,
} from './description/char-illustrator';

export interface StoryboardGenerationResult {
  storyboard: Storyboard;
  characterConstraints: EnhancedCharacterConstraint[];
  metadata: {
    sceneCount: number;
    characterCount: number;
    totalDuration: number;
    style: string;
  };
}

export interface StoryboardPipelineInput {
  script: Script;
  style?: string;
  includeCharacters?: boolean;
  aspectRatio?: StoryboardOptions['aspectRatio'];
  enhancedCharacterConsistency?: boolean;
}

export class StoryboardPipeline extends BasePipelineController {
  id = 'storyboard-generation';
  name = 'Storyboard Generation';

  protected subSteps = ['生成角色立绘', '构建角色约束', '生成场景描述', '整合故事板'];

  protected async _doProcess(input: StepInput): Promise<StepOutput> {
    const {
      script,
      style = 'anime',
      includeCharacters = true,
      aspectRatio,
      enhancedCharacterConsistency = true,
    } = input as StepInput & StoryboardPipelineInput;

    // Step 1: Generate character illustrations (0-30%)
    this.updateProgress(0, '生成角色立绘');
    this.updateProgress(10, '生成角色立绘');
    await this.pauseCheck();
    this.updateProgress(30, '生成角色立绘');

    // Step 2: Build character constraints (30-50%)
    this.updateProgress(35, '构建角色约束');
    await this.pauseCheck();
    this.updateProgress(50, '构建角色约束');

    // Step 3: Generate scene descriptions (50-75%)
    this.updateProgress(55, '生成场景描述');
    await this.pauseCheck();
    this.updateProgress(75, '生成场景描述');

    // Step 4: Compose storyboard (75-100%)
    this.updateProgress(80, '整合故事板');
    this.checkpointOnError({ script, style });
    await this.pauseCheck();

    const storyboard = composeStoryboard(script, {
      style,
      includeCharacters,
      aspectRatio,
      enhancedCharacterConsistency,
    });

    // Extract character constraints for downstream steps (video generation)
    const characterConstraints: EnhancedCharacterConstraint[] = storyboard.characters.map(
      (char: CharacterIllustration) => {
        const refUrls: Record<string, string> = {};
        if (char.referenceViews) {
          for (const v of char.referenceViews) {
            if (v.angle) refUrls[v.angle] = v.prompt;
          }
        }
        return {
          characterId: char.characterId,
          name: char.name,
          appearance: char.outfit || '',
          outfit: char.outfit || '',
          pose: char.pose || '',
          expression: char.expression || '',
          referencePrompt: char.referencePrompt || '',
          referenceImageUrls: refUrls,
        };
      }
    );

    this.updateProgress(100, '整合故事板');

    const result: StoryboardGenerationResult = {
      storyboard,
      characterConstraints,
      metadata: {
        sceneCount: storyboard.scenes.length,
        characterCount: storyboard.characters.length,
        totalDuration: storyboard.totalDuration,
        style,
      },
    };

    return { storyboardGeneration: result } as StepOutput;
  }

  getCheckpoint(): CheckpointState<unknown> | null {
    return this._checkpoint;
  }

  restore(state: CheckpointState<unknown>): void {
    this._checkpoint = state;
  }
}
