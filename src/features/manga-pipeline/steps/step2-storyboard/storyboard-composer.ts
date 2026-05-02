import { Script } from '../step1-script-generation/types/script';

import { generateCharacterIllustration, CharacterIllustration } from './description/character-illustration-generator';
import { generateSceneDescription, SceneDescription, CharacterConstraint } from './description/scene-description-generator';

export interface Storyboard {
  scriptId: string;
  title: string;
  totalDuration: number;  // 秒
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
  imageUrl?: string;  // 生成后填充
  status: 'pending' | 'generating' | 'done' | 'failed';
}

export interface StoryboardOptions {
  style?: string;       // 'anime' | 'comic' | 'sketch'
  includeCharacters?: boolean;  // 是否生成角色立绘
  aspectRatio?: SceneDescription['aspectRatio'];
}

export function composeStoryboard(
  script: Script,
  options: StoryboardOptions = {}
): Storyboard {
  const { style = 'anime', includeCharacters = true } = options;

  // 先生成角色立绘（用于后续一致性约束）
  const characterIllustrations: CharacterIllustration[] = includeCharacters
    ? script.characters.map(char => generateCharacterIllustration(char, style))
    : [];

  // 构建角色一致性约束
  const characterConstraints: CharacterConstraint[] = characterIllustrations.map(
    (illust): CharacterConstraint => ({
      characterId: illust.characterId,
      name: illust.name,
      appearance: illust.prompt.match(/appearance: ([^,]+)/)?.[1] || '',
      pose: illust.pose,
      expression: illust.expression,
      outfit: illust.outfit,
    })
  );

  // 生成场景描述（注入角色一致性约束）
  const storyboardScenes: StoryboardScene[] = script.scenes.map(scene => {
    const description = generateSceneDescription(scene, style, characterConstraints);
    // 允许通过 options 覆盖宽高比
    if (options.aspectRatio) {
      description.aspectRatio = options.aspectRatio;
    }
    return {
      sceneId: scene.id,
      sceneNumber: scene.sceneNumber,
      description,
      status: 'pending',
    };
  });

  // 计算总时长
  const totalDuration = storyboardScenes.reduce(
    (sum, s) => sum + s.description.duration,
    0
  );

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
