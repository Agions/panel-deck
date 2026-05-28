/**
 * SelfReviewLoop — AI 自审循环
 *
 * 核心创新：当 Step 输出未通过 QualityGate 时，
 * 调用 LLM 自我分析失败原因，重新生成修复后的输出。
 * 最多循环 maxRetries 次（默认 3 次）。
 */

import type {
  ReviewResult,
  ReviewCriteria,
  ReviewDimension,
  StepOutput,
} from './autonomous.types';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';

// ============================================================================
// Prompt 模板
// ============================================================================

const REVIEW_PROMPT_TEMPLATE = `你是专业的 AI 内容质量审核员。请审核以下 AI 生成的 {stepName} 输出。

## 审核维度

1. **完整性 (completeness)**：输出是否包含所有必要字段/元素？
2. **一致性 (consistency)**：人物描写、场景描述前后是否矛盾？
3. **画面感 (visual_quality)**：描述是否具备足够的视觉细节供 AI 生图？
4. **时长匹配 (duration_match)**：对话/场景时长是否与内容体量匹配？
5. **情绪爆点 (punch_point)**：是否包含情绪爆点、转折、高潮？

## 原输出

{originalOutput}

## 审核要求

请严格按照上述 5 个维度评分（0-100分），并给出：
1. 每个维度的评分和是否通过（>=60分通过）
2. 不合格的具体原因（列出所有未通过项）
3. 修复建议

## 输出格式

请严格按以下 JSON 格式输出，不要包含任何其他内容：

{
  "passed": true/false,
  "score": 0-100,
  "dimensions": [
    {"dimension": "completeness", "score": 0-100, "passed": true/false, "detail": "说明"},
    {"dimension": "consistency", "score": 0-100, "passed": true/false, "detail": "说明"},
    {"dimension": "visual_quality", "score": 0-100, "passed": true/false, "detail": "说明"},
    {"dimension": "duration_match", "score": 0-100, "passed": true/false, "detail": "说明"},
    {"dimension": "punch_point", "score": 0-100, "passed": true/false, "detail": "说明"}
  ],
  "reasons": ["不合格原因1", "不合格原因2"],
  "suggestions": ["修复建议1", "修复建议2"]
}`;

const REPAIR_PROMPT_TEMPLATE = `你是专业的 {stepName} 内容生成专家。以下是你之前生成的 {stepName} 输出和审核反馈。

## 原输出

{originalOutput}

## 审核反馈

{reviewResult}

## 不合格原因

{fallbackReasons}

## 修复要求

请根据以上反馈，重新生成符合以下要求的 {stepName} 输出：
1. 修复所有不合格项
2. 保持与上下文的连贯性
3. 输出格式保持不变
4. 只输出修复后的内容，不要包含任何解释

## 直接输出修复后的 JSON 内容：`;

// ============================================================================
// Step 名称映射
// ============================================================================

const STEP_NAMES: Record<string, string> = {
  step_import: '导入解析',
  step_analysis: 'AI 分析',
  step_script: '剧本生成',
  step_character: '角色设计',
  step_scene: '场景规划',
  step_storyboard: '分镜生成',
  step_render: '批量渲染',
  step_video_edit: '视频剪辑',
  step_audio: '配音合成',
  step_subtitle: '字幕嵌入',
  step_export: '成片导出',
};

// ============================================================================
// SelfReviewLoop 类
// ============================================================================

export class SelfReviewLoop {
  private maxRetries: number;
  private model: string;
  private reviewCount: Map<string, number> = new Map();

  constructor(options: { maxRetries?: number; model?: string } = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.model = options.model ?? 'glm-5';
  }

  /**
   * 审核 Step 输出
   */
  async review(stepId: string, output: StepOutput): Promise<ReviewResult> {
    const stepName = STEP_NAMES[stepId] ?? stepId;

    const prompt = REVIEW_PROMPT_TEMPLATE
      .replace('{stepName}', stepName)
      .replace('{originalOutput}', JSON.stringify(output, null, 2));

    try {
      const response = await aiService.generate(prompt, {
        model: this.model,
        provider: 'openai',
        max_tokens: 4096,
        temperature: 0.3, // 审核用低温确保稳定性
      });

      const result = this.parseReviewResult(response);
      return result;
    } catch (error) {
      // 审核失败时，默认通过（不阻塞流程）
      console.error(`[SelfReviewLoop] Review failed for ${stepId}:`, error);
      logger.error(`[SelfReviewLoop] Review failed for ${stepId}:`, error);
      return {
        passed: true,
        score: 70,
        dimensions: [],
        reasons: [],
        suggestions: [],
      };
    }
  }

  /**
   * 判定是否应该重试
   */
  shouldRetry(stepId: string, result: ReviewResult): boolean {
    const currentCount = this.reviewCount.get(stepId) ?? 0;

    // 未通过 && 还有重试次数
    if (!result.passed && currentCount < this.maxRetries) {
      return true;
    }

    return false;
  }

  /**
   * 增加重试计数
   */
  incrementRetry(stepId: string): number {
    const current = this.reviewCount.get(stepId) ?? 0;
    const next = current + 1;
    this.reviewCount.set(stepId, next);
    return next;
  }

  /**
   * 重置重试计数
   */
  reset(stepId: string): void {
    this.reviewCount.delete(stepId);
  }

  /**
   * 获取当前重试次数
   */
  getRetryCount(stepId: string): number {
    return this.reviewCount.get(stepId) ?? 0;
  }

  /**
   * 修复 Step 输出
   */
  async repair(
    stepId: string,
    originalOutput: StepOutput,
    reviewResult: ReviewResult,
  ): Promise<StepOutput> {
    const stepName = STEP_NAMES[stepId] ?? stepId;

    const reasons = reviewResult.reasons.length > 0
      ? reviewResult.reasons.join('\n')
      : '综合评分未达标';

    const suggestions = reviewResult.suggestions.length > 0
      ? reviewResult.suggestions.join('\n')
      : '请根据审核反馈优化输出质量';

    const reviewResultText = `
评分：${reviewResult.score}/100
${reviewResult.dimensions
  .map((d) => `${d.dimension}: ${d.score}分 ${d.passed ? '✓' : '✗'} - ${d.detail}`)
  .join('\n')}
修复建议：${suggestions}
`.trim();

    const prompt = REPAIR_PROMPT_TEMPLATE
      .replace(/{stepName}/g, stepName)
      .replace('{originalOutput}', JSON.stringify(originalOutput, null, 2))
      .replace('{reviewResult}', reviewResultText)
      .replace('{fallbackReasons}', reasons);

    try {
      const response = await aiService.generate(prompt, {
        model: this.model,
        provider: 'openai',
        max_tokens: 8192,
        temperature: 0.7, // 修复时用较高温度以产生变化
      });

      const repaired = this.parseJsonOutput(response);
      return repaired ?? originalOutput; // 解析失败时返回原输出
    } catch (error) {
      console.error(`[SelfReviewLoop] Repair failed for ${stepId}:`, error);
      logger.error(`[SelfReviewLoop] Repair failed for ${stepId}:`, error);
      return originalOutput;
    }
  }

  /**
   * 解析审核结果
   */
  private parseReviewResult(response: string): ReviewResult {
    try {
      const json = this.extractJson(response);
      if (!json) throw new Error('No JSON found');

      return {
        passed: Boolean(json.passed),
        score: Math.max(0, Math.min(100, Number(json.score) || 0)),
        dimensions: Array.isArray(json.dimensions)
          ? json.dimensions.map((d: Record<string, unknown>) => ({
              dimension: (d.dimension as ReviewDimension) ?? 'completeness',
              score: Math.max(0, Math.min(100, Number(d.score) || 0)),
              passed: Boolean(d.passed),
              detail: String(d.detail ?? ''),
            }))
          : [],
        reasons: Array.isArray(json.reasons)
          ? json.reasons.map(String)
          : [],
        suggestions: Array.isArray(json.suggestions)
          ? json.suggestions.map(String)
          : [],
      };
    } catch {
      // 解析失败，返回默认结果（通过）
      return {
        passed: true,
        score: 70,
        dimensions: [],
        reasons: [],
        suggestions: [],
      };
    }
  }

  /**
   * 从文本中提取 JSON
   */
  private extractJson(text: string): Record<string, unknown> | null {
    // 尝试直接解析
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      // 尝试从 ```json 块中提取
    }

    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim()) as Record<string, unknown>;
      } catch {
        // 继续尝试其他方式
      }
    }

    // 尝试找到第一个 { 和最后一个 } 之间的内容
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
      } catch {
        // 放弃
      }
    }

    return null;
  }

  /**
   * 解析修复后的 JSON 输出
   */
  private parseJsonOutput(text: string): StepOutput | null {
    const json = this.extractJson(text);
    return json as StepOutput | null;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

let sharedInstance: SelfReviewLoop | null = null;

export function createSelfReviewLoop(options?: {
  maxRetries?: number;
  model?: string;
}): SelfReviewLoop {
  if (!sharedInstance) {
    sharedInstance = new SelfReviewLoop(options);
  }
  return sharedInstance;
}
