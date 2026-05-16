import { EMOTION_KEYWORDS } from '../../../utils/emotion-constants';
import {
  buildCharacterReferencePrompts,
  buildCharacterPrompt,
  buildScenePrompt,
  buildVideoPrompt,
  type CharacterView,
  type CharacterRefPrompt,
  ANIME_STYLE,
  COMIC_STYLE,
  SKETCH_STYLE,
} from '../../../utils/prompt-template';
import { CharacterCard } from '../../step1-script-generation/types/character';

// ========== 角色立绘（增强版：含三视图）============

export interface CharacterIllustration {
  characterId: string;
  name: string;
  prompt: string; // 默认正面 prompt
  negativePrompt: string;
  pose: string;
  expression: string;
  outfit: string;
  // --- 增强：角色一致性系统 ---
  referenceViews: CharacterView[]; // 三视图（正面/侧面/全身）
  referencePrompt: string; // 角色特征 token（用于视频生成绑定）
  style: string;
}

export interface CharacterIllustrationInput {
  character: CharacterCard;
  style?: string;
  /** 是否生成三视图（增加一致性但增加 token 消耗） */
  generateReferenceViews?: boolean;
}

/**
 * 生成角色立绘（增强版，支持旧签名兼容）
 * - 基础：正面姿态 prompt
 * - 增强：生成三视图 reference sheet，用于后续视频生成角色绑定
 *
 * @param input - 新签名：{ character, style?, generateReferenceViews? }
 *        或者（旧兼容）：character, style?
 */
export function generateCharacterIllustration(
  input: CharacterIllustrationInput
): CharacterIllustration;
export function generateCharacterIllustration(
  character: CharacterCard,
  style?: string
): CharacterIllustration;
export function generateCharacterIllustration(
  characterOrInput: CharacterCard | CharacterIllustrationInput,
  style?: string
): CharacterIllustration {
  // 兼容旧签名
  let input: CharacterIllustrationInput;
  if ('id' in characterOrInput && 'name' in characterOrInput) {
    // 旧签名：第一个参数是 CharacterCard
    input = { character: characterOrInput, style };
  } else {
    input = characterOrInput as CharacterIllustrationInput;
  }
  const { character, style: s = 'anime', generateReferenceViews = true } = input;

  const preset = getStylePreset(s);

  const isDefaultAppearance = character.appearance === '普通外貌，着装简洁';

  // 生成基础 prompt（正面）
  const prompt = buildCharacterPrompt({
    subject: character.name,
    appearance: isDefaultAppearance ? undefined : character.appearance,
    pose: getPersonalityPose(character.personality, character.speakingStyle).pose,
    emotion: getPersonalityPose(character.personality, character.speakingStyle).expression,
    outfit: isDefaultAppearance ? undefined : character.appearance,
    style: preset,
  });

  // 生成三视图（角色一致性关键）
  const referenceViews = generateReferenceViews
    ? buildCharacterReferencePrompts(
        character.name,
        character.appearance !== '普通外貌，着装简洁'
          ? character.appearance
          : 'ordinary appearance',
        character.appearance,
        s
      )
    : [];

  // 构建角色特征 token（用于视频生成时的角色绑定）
  const referencePrompt = buildCharacterReferenceToken(character, referenceViews);

  const personalityPose = getPersonalityPose(character.personality, character.speakingStyle);
  return {
    characterId: character.id,
    name: character.name,
    prompt,
    negativePrompt: preset.negativePrompt,
    pose: personalityPose.pose,
    expression: personalityPose.expression,
    outfit: character.appearance,
    referenceViews,
    referencePrompt,
    style: s,
  };
}

/**
 * 构建角色特征 token
 * 格式：用于在视频生成时描述角色特征，确保跨镜头一致性
 */
function buildCharacterReferenceToken(
  character: CharacterCard,
  referenceViews: CharacterView[]
): string {
  const parts: string[] = [
    character.name,
    character.appearance !== '普通外貌，着装简洁' ? character.appearance : '',
    getPersonalityPose('').expression, // 使用中性表情
  ].filter(Boolean);

  // 添加参考图描述
  if (referenceViews.length > 0) {
    parts.push('(use character reference for consistent appearance)');
  }

  return parts.join(', ');
}

// ========== 角色约束（用于场景生成时注入）============

export interface EnhancedCharacterConstraint {
  characterId: string;
  name: string;
  /** 外观描述 token */
  appearance: string;
  /** 服装描述 */
  outfit: string;
  /** 姿态描述 */
  pose: string;
  /** 表情描述 */
  expression: string;
  /** 角色特征 token（用于视频生成） */
  referencePrompt: string;
  /** 三视图参考图 URL（生成后填充） */
  referenceImageUrls?: {
    front?: string;
    side?: string;
    fullBody?: string;
  };
}

/**
 * 从 CharacterIllustration 构建场景约束
 */
export function buildCharacterConstraints(
  illustrations: CharacterIllustration[]
): EnhancedCharacterConstraint[] {
  return illustrations.map((illust) => ({
    characterId: illust.characterId,
    name: illust.name,
    appearance: extractField(illust.prompt, 'appearance') || illust.outfit,
    outfit: illust.outfit,
    pose: illust.pose,
    expression: illust.expression,
    referencePrompt: illust.referencePrompt,
  }));
}

/**
 * 辅助：从 prompt 中提取字段值
 */
function extractField(prompt: string, field: string): string | undefined {
  const match = prompt.match(new RegExp(`${field}:\\s*([^,]+)`));
  return match?.[1]?.trim();
}

// ========== 场景描述（集成角色约束）============

export interface SceneDescription {
  sceneId: string;
  sceneNumber: number;
  prompt: string; // AI 绘图 prompt
  negativePrompt: string;
  styleHint: string;
  aspectRatio: '16:9' | '9:16' | '4:3' | '1:1';
  duration: number;
  characterConstraints?: EnhancedCharacterConstraint[];
  location?: string;
  emotion?: string;
  /** 视频生成专用 prompt */
  videoPrompt?: string;
}

export interface StylePreset {
  name: string;
  promptPrefix: string;
  negativePrompt: string;
}

export const LEGACY_STYLE_PRESETS: Record<string, StylePreset> = {
  anime: {
    name: '动漫风格',
    promptPrefix: 'anime style, vibrant colors, detailed illustration, high quality',
    negativePrompt: 'realistic, photo, 3d render, low quality, blurry',
  },
  comic: {
    name: '漫画风格',
    promptPrefix: 'comic style, panel layout, bold lines, halftone dots',
    negativePrompt: 'realistic, photo, watercolor, blurry',
  },
  sketch: {
    name: '素描风格',
    promptPrefix: 'pencil sketch, black and white, detailed linework',
    negativePrompt: 'color, painting, digital art',
  },
  default: {
    name: '默认风格',
    promptPrefix: 'digital illustration, vibrant, detailed, high quality',
    negativePrompt: 'low quality, blurry, amateur',
  },
};

export function generateSceneDescription(
  scene: {
    id: string;
    sceneNumber: number;
    location?: string;
    timeOfDay: string;
    weather?: string;
    characters: string[];
    type: string;
    emotion?: string;
    cameraHint?: string;
    content: string;
  },
  style: string = 'default',
  characterConstraints?: EnhancedCharacterConstraint[]
): SceneDescription {
  const preset = LEGACY_STYLE_PRESETS[style] || LEGACY_STYLE_PRESETS['default'];
  const ctxStyle =
    style === 'anime'
      ? ANIME_STYLE
      : style === 'comic'
        ? COMIC_STYLE
        : style === 'sketch'
          ? SKETCH_STYLE
          : { ...preset, lightingPresets: [], cameraHints: [] };

  // 构建角色约束 prompt
  const charRefs: CharacterRefPrompt[] | undefined = characterConstraints
    ?.filter((c) =>
      scene.characters.some(
        (n) => n.toLowerCase() === c.name.toLowerCase() || n.includes(c.name) || c.name.includes(n)
      )
    )
    .map((c) => ({
      name: c.name,
      appearance: c.appearance,
      outfit: c.outfit,
      pose: c.pose,
      expression: c.expression,
    }));

  // 使用结构化模板构建 prompt
  const prompt = buildScenePrompt({
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    weather: scene.weather,
    characterRefs: charRefs,
    sceneType: scene.type,
    emotion: getEmotionKeyword(scene.emotion),
    camera: scene.cameraHint ? `${scene.cameraHint} shot` : undefined,
    style: ctxStyle,
    extraDescription: scene.content.slice(0, 80),
  });

  // 视频生成 prompt（更长，包含运动信息）
  const videoPrompt = buildVideoPrompt({
    description: prompt,
    characterRefs: charRefs,
    cameraMovement: scene.cameraHint,
    style: ctxStyle,
  });

  return {
    sceneId: scene.id,
    sceneNumber: scene.sceneNumber,
    prompt,
    negativePrompt: preset.negativePrompt,
    styleHint: preset.name,
    aspectRatio: preset.name.includes('动漫') ? '16:9' : '16:9',
    duration: estimateDuration(scene.type, scene.content.length),
    characterConstraints,
    location: scene.location,
    emotion: scene.emotion,
    videoPrompt,
  };
}

// ========== 私有工具函数 ==========

function getStylePreset(style: string) {
  switch (style) {
    case 'anime':
      return ANIME_STYLE;
    case 'comic':
      return COMIC_STYLE;
    case 'sketch':
      return SKETCH_STYLE;
    default:
      return ANIME_STYLE;
  }
}

function getPersonalityPose(
  personality: string,
  speakingStyle?: string
): { pose: string; expression: string } {
  const p = personality || '';
  const s = speakingStyle || '';

  // speakingStyle only overrides when EXPLICITLY set to casual/formal
  // '普通' (default/normal) should fall through to personality-based behavior
  const isExplicitCasual = s.includes('口语化') || s.includes('Casual') || s.includes('casual');
  const isExplicitFormal =
    (s.includes('正式') && !s.includes('普通')) || s.includes('Formal') || s.includes('formal');

  if (isExplicitCasual) {
    return {
      pose: 'casual pose, relaxed stance, one hand in pocket',
      expression: 'relaxed expression, easy smile',
    };
  }
  if (isExplicitFormal) {
    return {
      pose: 'formal pose, upright posture, hands at sides',
      expression: 'formal expression, composed demeanor',
    };
  }

  // personality-based poses (when speakingStyle is '普通' or unset)
  if (p.includes('开朗') || p.includes('活泼')) {
    return {
      pose: 'dynamic pose, one hand raised, energetic stance',
      expression: 'bright smile, cheerful expression, open eyes',
    };
  }
  if (p.includes('内向') || p.includes('沉默')) {
    return {
      pose: 'subtle pose, arms crossed, guarded stance',
      expression: 'reserved expression, slight smile, downward gaze',
    };
  }
  if (p.includes('急躁') || p.includes('暴躁')) {
    return {
      pose: 'tense pose, leaning forward, assertive stance',
      expression: 'intense expression, furrowed brow, determined look',
    };
  }
  if (p.includes('谨慎') || p.includes('冷静')) {
    return {
      pose: 'steady pose, hands clasped, balanced stance',
      expression: 'serene expression, composed look, alert eyes',
    };
  }

  return { pose: 'natural pose, relaxed stance', expression: 'neutral expression, relaxed look' };
}

function getEmotionKeyword(emotion?: string): string {
  return EMOTION_KEYWORDS[emotion || ''] || 'balanced lighting, natural atmosphere';
}

function estimateDuration(sceneType: string, contentLength: number): number {
  const base: Record<string, number> = {
    对话: 8,
    动作: 12,
    追逐: 15,
    对峙: 10,
    情感: 10,
    独白: 6,
  };
  const baseVal = base[sceneType] || 8;
  return baseVal + Math.min(Math.floor(contentLength / 50) * 1, 5);
}
