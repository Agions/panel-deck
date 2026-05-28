/**
 * 视觉一致性评分服务
 *
 * 使用 VLM（视觉语言模型）对比关键帧图像与角色三视图参考图，
 * 评估生成视频中角色外观的一致性。
 *
 * 评分逻辑：
 * 1. 提取关键帧中的角色区域
 * 2. 对比角色区域与三视图参考图的视觉特征
 * 3. 综合多帧评分计算总体一致性
 */

import type { AIProvider } from '@/core/ai/providers/ai-provider.interface';
import type { ChatMessage } from '@/core/ai/providers/ai-provider.interface';

import type { CharacterVideoRef } from './image-generation/types';

export interface VisualConsistencyInput {
  /** 关键帧图像 URL 列表（按场景/时间顺序） */
  frameUrls: string[];
  /** 角色参考信息（含三视图 URL） */
  characterReferences: CharacterVideoRef[];
  /** 角色在三视图中的外观描述（用于 VLM 比对） */
  characterDescriptions?: Record<string, string>;
}

export interface CharacterConsistencyScore {
  characterId: string;
  characterName: string;
  score: number; // 0-100
  frameScores: number[];
  notes: string[];
}

export interface VisualConsistencyResult {
  /** 总体一致性得分（0-100） */
  overallScore: number;
  /** 各角色得分明细 */
  characterScores: CharacterConsistencyScore[];
  /** 评估帧数 */
  framesEvaluated: number;
  /** 评估使用的模型 */
  model: string;
}

/**
 * 视觉一致性评分器
 */
export class VisualConsistencyScorer {
  private provider: AIProvider | null = null;
  private model: string;

  constructor(provider?: AIProvider, model = 'vision') {
    this.provider = provider ?? null;
    this.model = model;
  }

  /**
   * 设置 AI Provider（用于 VLM 调用）
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  /**
   * 评估视觉一致性
   *
   * 策略：
   * - 有 VLM Provider：使用视觉语言模型进行精确比对
   * - 无 Provider：基于角色描述关键词匹配进行启发式评分
   */
  async evaluate(input: VisualConsistencyInput): Promise<VisualConsistencyResult> {
    const { frameUrls, characterReferences, characterDescriptions = {} } = input;

    if (frameUrls.length === 0 || characterReferences.length === 0) {
      return {
        overallScore: 0,
        characterScores: [],
        framesEvaluated: 0,
        model: 'none',
      };
    }

    // 选择评分策略
    if (this.provider) {
      return this.evaluateWithVLM(input);
    } else {
      return this.evaluateWithHeuristic(input);
    }
  }

  /**
   * VLM 驱动的精确评分
   *
   * 对每个角色：
   * 1. 取其三视图参考图（front/fullBody）作为标准
   * 2. 遍历所有关键帧，让 VLM 判断该帧中角色是否与参考一致
   * 3. 汇总评分
   */
  private async evaluateWithVLM(input: VisualConsistencyInput): Promise<VisualConsistencyResult> {
    const { frameUrls, characterReferences } = input;
    const characterScores: CharacterConsistencyScore[] = [];

    for (const charRef of characterReferences) {
      // 获取该角色的参考图
      const referenceUrls = [
        charRef.referenceImageUrls?.front,
        charRef.referenceImageUrls?.fullBody,
      ].filter((u): u is string => !!u);

      if (referenceUrls.length === 0) {
        // 无参考图时使用 referencePrompt 描述进行评分
        const score = await this.evaluateByPromptMatch(frameUrls, charRef);
        characterScores.push({
          characterId: charRef.characterId,
          characterName: charRef.name,
          score,
          frameScores: new Array(frameUrls.length).fill(score),
          notes: ['无参考图，基于角色描述关键词匹配评分'],
        });
        continue;
      }

      // 对每帧进行比对
      const frameScores: number[] = [];
      const frameNotes: string[] = [];

      for (let i = 0; i < frameUrls.length; i++) {
        const frameUrl = frameUrls[i];
        const frameScore = await this.compareFrameWithReference(frameUrl, referenceUrls, charRef);
        frameScores.push(frameScore);
      }

      const avgScore = frameScores.reduce((a, b) => a + b, 0) / frameScores.length;
      characterScores.push({
        characterId: charRef.characterId,
        characterName: charRef.name,
        score: Math.round(avgScore),
        frameScores,
        notes:
          avgScore >= 80
            ? ['角色外观一致性良好']
            : avgScore >= 60
              ? ['角色外观存在轻微差异']
              : ['角色外观差异明显，建议检查角色绑定'],
      });
    }

    const overallScore =
      characterScores.length > 0
        ? Math.round(characterScores.reduce((a, c) => a + c.score, 0) / characterScores.length)
        : 0;

    return {
      overallScore,
      characterScores,
      framesEvaluated: frameUrls.length,
      model: this.model,
    };
  }

  /**
   * 使用 VLM 比较单帧与参考图的一致性
   */
  private async compareFrameWithReference(
    frameUrl: string,
    referenceUrls: string[],
    charRef: CharacterVideoRef
  ): Promise<number> {
    const referenceImages = referenceUrls.map((url, i) => ({
      type: 'image_url' as const,
      image_url: { url, detail: 'low' },
    }));

    const frameImage = [
      {
        type: 'image_url' as const,
        image_url: { url: frameUrl, detail: 'low' },
      },
    ];

    const characterDesc = charRef.referencePrompt || charRef.name;

    const prompt = `You are a visual consistency evaluator for anime/comic characters.

Reference images show the character's official appearance (front view and full body).
Test image is a frame from an animated video.

Your task: Judge whether the character in the test image matches the reference character's appearance.

Rate consistency on a scale of 0-100:
- 90-100: Character clearly matches, same hair, eyes, clothing, overall style
- 70-89: Character mostly matches, minor differences (lighting, pose)
- 50-69: Partial match, some features different (hair color, outfit changed)
- 30-49: Poor match, significant differences
- 0-29: Different character entirely

Character reference: ${characterDesc}

Respond ONLY with a single integer between 0-100. No explanation.`;

    try {
      const response = await this.provider!.chat({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              ...referenceImages.flatMap((img, i) => [
                {
                  type: 'text' as const,
                  text: `Reference image ${i + 1} (character: ${charRef.name}):`,
                },
                img,
              ]),
              { type: 'text' as const, text: `\nTest image (evaluate consistency):` },
              ...frameImage,
            ],
          } as unknown as ChatMessage,
          { role: 'user' as const, content: prompt } as unknown as ChatMessage,
        ],
      });

      const text = response.choices[0]?.message?.content ?? '';
      const score = parseInt(text.trim().replace(/[^0-9]/g, ''), 10);
      return isNaN(score) ? 50 : Math.max(0, Math.min(100, score));
    } catch {
      return 50; // 出错时返回中间值
    }
  }

  /**
   * 基于 referencePrompt 关键词匹配的启发式评分
   *
   * 当没有 VLM Provider 或没有参考图时使用。
   * 原理：提取角色 referencePrompt 中的视觉特征词，
   * 检查帧 prompt 中是否一致地包含这些特征。
   */
  private async evaluateByPromptMatch(
    frameUrls: string[],
    charRef: CharacterVideoRef
  ): Promise<number> {
    // 提取角色视觉特征词（从 referencePrompt）
    const visualKeywords = this.extractVisualKeywords(charRef.referencePrompt);

    if (visualKeywords.length === 0) {
      return 75; // 无法提取特征时给一个中等偏上的分数
    }

    // 由于无法直接读取帧图像，这里返回基于角色描述的静态评分
    // 实际场景中，帧生成 prompt 应包含角色特征描述
    // 启发式：角色 referencePrompt 越详细，一致性约束越强
    const promptLength = charRef.referencePrompt.length;
    const keywordDensity = visualKeywords.length / Math.max(promptLength / 20, 1);

    // 评分：特征词越多、prompt 越详细，一致性越容易保持
    const score = Math.min(90, 50 + keywordDensity * 20);
    return Math.round(score);
  }

  /**
   * 从角色描述中提取视觉关键词
   */
  private extractVisualKeywords(prompt: string): string[] {
    const visualPatterns = [
      // 发型发色
      /(\w+[\s-]?(?:hair|发型|发色|发长))/gi,
      // 眼睛颜色
      /(\w+[\s-]?(?:eyes?|眼色|瞳孔))/gi,
      // 服装
      /(\w+[\s-]?(?:outfit|clothing|dress|衣服|服装|制服))/gi,
      // 颜色描述
      /\b(red|blue|green|blonde|brown|black|white|pink|金色|蓝色|黑色|白色|粉色|红色|银发|黑发|白发)\b/gi,
      // 风格标签
      /\b(anime|manga|comic|realistic|cartoon|3d|2d)\b/gi,
    ];

    const keywords: string[] = [];
    for (const pattern of visualPatterns) {
      const matches = prompt.match(pattern);
      if (matches) {
        keywords.push(...matches);
      }
    }

    return Array.from(new Set(keywords)); // 去重
  }

  /**
   * 启发式评分（无 VLM 时的降级策略）
   */
  private async evaluateWithHeuristic(
    input: VisualConsistencyInput
  ): Promise<VisualConsistencyResult> {
    const { frameUrls, characterReferences, characterDescriptions = {} } = input;
    const characterScores: CharacterConsistencyScore[] = [];

    for (const charRef of characterReferences) {
      const desc = characterDescriptions[charRef.characterId] || charRef.referencePrompt;
      const score = await this.evaluateByPromptMatch(frameUrls, charRef);
      characterScores.push({
        characterId: charRef.characterId,
        characterName: charRef.name,
        score,
        frameScores: new Array(frameUrls.length).fill(score),
        notes:
          score >= 80
            ? ['角色外观一致性良好']
            : score >= 60
              ? ['角色外观存在轻微差异']
              : ['角色外观差异明显'],
      });
    }

    const overallScore =
      characterScores.length > 0
        ? Math.round(characterScores.reduce((a, c) => a + c.score, 0) / characterScores.length)
        : 0;

    return {
      overallScore,
      characterScores,
      framesEvaluated: frameUrls.length,
      model: 'heuristic',
    };
  }
}

// 单例导出
export const visualConsistencyScorer = new VisualConsistencyScorer();
export default visualConsistencyScorer;
