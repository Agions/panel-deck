import { Script } from '../step1-script-generation/types/script';

import {
  generateCharacterIllustration,
  buildCharacterConstraints,
  type CharacterIllustration,
  type EnhancedCharacterConstraint,
} from './description/char-illustrator';
import { generateSceneDescription, type SceneDescription } from './description/scene-describer';

export interface Storyboard {
  scriptId: string;
  title: string;
  totalDuration: number; // 秒
  scenes: StoryboardScene[];
  characters: CharacterIllustration[];
  metadata: {
    generatedAt: number;
    style: string;
    model?: string;
  };
}

export interface StoryboardScene {
  sceneId: string;
  sceneNumber: number;
  description: SceneDescription;
  imageUrl?: string; // 生成后填充
  status: 'pending' | 'generating' | 'done' | 'failed';
}

export interface StoryboardOptions {
  style?: string; // 'anime' | 'comic' | 'sketch'
  includeCharacters?: boolean; // 是否生成角色立绘
  aspectRatio?: SceneDescription['aspectRatio'];
  /** 启用增强角色一致性系统（三视图） */
  enhancedCharacterConsistency?: boolean;
}

/**
 * 构建故事板（增强版）
 *
 * 增强点：
 * 1. 生成角色三视图 reference sheet
 * 2. 构建角色特征 token 供视频生成使用
 * 3. 为每个场景生成 videoPrompt（视频生成专用）
 */
export function composeStoryboard(script: Script, options: StoryboardOptions = {}): Storyboard {
  const {
    style = 'anime',
    includeCharacters = true,
    enhancedCharacterConsistency = true,
  } = options;

  // Step 1: 生成角色立绘（含三视图）
  const characterIllustrations: CharacterIllustration[] = includeCharacters
    ? script.characters.map((char) =>
        generateCharacterIllustration({
          character: char,
          style,
          generateReferenceViews: enhancedCharacterConsistency,
        })
      )
    : [];

  // Step 2: 构建增强角色约束（包含 referencePrompt）
  const characterConstraints: EnhancedCharacterConstraint[] =
    buildCharacterConstraints(characterIllustrations);

  // Step 3: 生成场景描述（注入角色一致性约束 + 视频 prompt）
  const storyboardScenes: StoryboardScene[] = script.scenes.map((scene) => {
    const description = generateSceneDescription(
      {
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        location: scene.location,
        timeOfDay: scene.timeOfDay || '白天',
        weather: scene.weather,
        characters: scene.characters,
        type: scene.type || '对话',
        emotion: scene.emotion,
        cameraHint: scene.cameraHint,
        content: scene.content,
      },
      style,
      characterConstraints
    );

    if (options.aspectRatio) {
      description.aspectRatio = options.aspectRatio;
    }

    return {
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber,
      description,
      status: 'pending' satisfies StoryboardScene['status'],
    };
  });

  // 计算总时长
  const totalDuration = storyboardScenes.reduce((sum, s) => sum + s.description.duration, 0);

  return {
    scriptId: script.id,
    title: script.title,
    totalDuration,
    scenes: storyboardScenes,
    characters: characterIllustrations,
    metadata: {
      generatedAt: Date.now(),
      style,
    },
  };
}
