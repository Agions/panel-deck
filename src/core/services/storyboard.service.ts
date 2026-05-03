/**
 * 分镜服务 - Storyboard Service
 * 负责分镜的创建、编辑、生成和管理
 */

import { v4 as uuidv4 } from 'uuid';

import { logger } from '@/core/utils/logger';
import type { StoryboardFrame } from '@/features/storyboard/components/StoryboardEditor';

import { aiService } from './ai.service';
import { imageGenerationService, type ImageGenerationOptions } from './image-generation.service';

// 存储键
const STORYBOARD_STORAGE_KEY = 'PanelFlow-storyboards';

// 分镜服务选项
export interface StoryboardServiceOptions {
  projectId?: string;
  autoSave?: boolean;
}

/**
 * 分镜服务
 * 管理视频分镜的创建、编辑、生成和导出
 */
export class StoryboardService {
  private storyboards: Map<string, StoryboardFrame[]> = new Map();
  private projectId?: string;
  private autoSave: boolean;
  private listeners: Array<(storyboards: StoryboardFrame[]) => void> = [];

  constructor(options: StoryboardServiceOptions = {}) {
    this.projectId = options.projectId;
    this.autoSave = options.autoSave ?? true;
    this.loadFromStorage();
  }

  // ========== 基础 CRUD 操作 ==========

  /**
   * 获取当前项目的所有分镜
   */
  getAll(): StoryboardFrame[] {
    return this.storyboards.get(this.projectId ?? 'default') ?? [];
  }

  /**
   * 根据 ID 获取单个分镜帧
   */
  getById(id: string): StoryboardFrame | undefined {
    const frames = this.getAll();
    return frames.find(f => f.id === id);
  }

  /**
   * 创建新的分镜帧
   */
  create(frameData: Partial<StoryboardFrame> & { title: string; sceneDescription: string }): StoryboardFrame {
    // const now = new Date().toISOString();
    const frame: StoryboardFrame = {
      id: frameData.id ?? uuidv4(),
      title: frameData.title,
      sceneDescription: frameData.sceneDescription,
      composition: frameData.composition ?? '中心构图',
      cameraType: frameData.cameraType ?? 'medium',
      dialogue: frameData.dialogue ?? '',
      duration: frameData.duration || 5,
      imageUrl: frameData.imageUrl,
    };

    const key = this.projectId ?? 'default';
    const frames = this.storyboards.get(key) ?? [];
    frames.push(frame);
    this.storyboards.set(key, frames);

    this.notifyChange();
    this.saveToStorage();

    return frame;
  }

  /**
   * 更新分镜帧
   */
  update(id: string, updates: Partial<StoryboardFrame>): StoryboardFrame | null {
    const key = this.projectId ?? 'default';
    const frames = this.storyboards.get(key) ?? [];
    const index = frames.findIndex(f => f.id === id);

    if (index === -1) return null;

    frames[index] = { ...frames[index], ...updates };
    this.storyboards.set(key, frames);

    this.notifyChange();
    this.saveToStorage();

    return frames[index];
  }

  /**
   * 删除分镜帧
   */
  delete(id: string): boolean {
    const key = this.projectId ?? 'default';
    const frames = this.storyboards.get(key) ?? [];
    const index = frames.findIndex(f => f.id === id);

    if (index === -1) return false;

    frames.splice(index, 1);
    this.storyboards.set(key, frames);

    this.notifyChange();
    this.saveToStorage();

    return true;
  }

  /**
   * 批量创建分镜帧
   */
  bulkCreate(frameDataList: Array<Partial<StoryboardFrame> & { title: string; sceneDescription: string }>): StoryboardFrame[] {
    const key = this.projectId ?? 'default';
    const frames = this.storyboards.get(key) ?? [];

    const newFrames = frameDataList.map(data => ({
      id: data.id ?? uuidv4(),
      title: data.title,
      sceneDescription: data.sceneDescription,
      composition: data.composition ?? '中心构图',
      cameraType: data.cameraType ?? 'medium',
      dialogue: data.dialogue ?? '',
      duration: data.duration || 5,
      imageUrl: data.imageUrl,
    }));

    frames.push(...newFrames);
    this.storyboards.set(key, frames);

    this.notifyChange();
    this.saveToStorage();

    return newFrames;
  }

  /**
   * 清空所有分镜
   */
  clear(): void {
    const key = this.projectId ?? 'default';
    this.storyboards.set(key, []);
    this.notifyChange();
    this.saveToStorage();
  }

  // ========== AI 生成功能 ==========

  /**
   * 从剧本生成完整分镜
   */
  async generateFromScript(
    script: { title: string; content: string; segments?: Array<{ content: string; type: string }> },
    options: {
      provider?: string;
      model?: string;
      frameCount?: number;
    } = {}
  ): Promise<StoryboardFrame[]> {
    const { provider = 'alibaba', model = 'qwen-3.5', frameCount = 8 } = options;

    // 构建提示词
    const prompt = `
请根据以下剧本内容生成 ${frameCount} 个分镜描述。

剧本标题：${script.title}
剧本内容：
${script.content}

请以 JSON 数组格式返回分镜信息，每个分镜包含：
- title: 分镜标题
- sceneDescription: 场景描述（详细描述画面内容）
- composition: 构图方式（如：中心构图、三分法、对角线等）
- cameraType: 镜头类型（如：wide全景、medium中景、closeup特写、pan横摇、tilt竖摇等）
- dialogue: 对话/旁白内容
- duration: 预计时长（秒）

请确保分镜逻辑连贯，镜头语言丰富。
`;

    try {
      const result = await aiService.generate(prompt, { provider, model });

      // 解析返回的 JSON
      let parsedFrames: Partial<StoryboardFrame>[] = [];
      try {
        // 尝试提取 JSON 数组
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedFrames = JSON.parse(jsonMatch[0]);
        }
      } catch {
        logger.warn('Failed to parse AI response as JSON, using fallback');
      }

      // 如果解析失败，生成默认分镜
      if (parsedFrames.length === 0) {
        parsedFrames = this.generateFallbackFrames(script, frameCount);
      }

      // 确保每帧都有必要字段
      const frames = parsedFrames.map((f, i) => ({
        id: f.id ?? uuidv4(),
        title: f.title ?? `分镜 ${i + 1}`,
        sceneDescription: f.sceneDescription ?? '场景描述',
        composition: f.composition ?? '中心构图',
        cameraType: f.cameraType ?? 'medium',
        dialogue: f.dialogue ?? '',
        duration: f.duration || 5,
        imageUrl: f.imageUrl,
      }));

      // 保存到当前项目
      const key = this.projectId ?? 'default';
      this.storyboards.set(key, frames);

      this.notifyChange();
      this.saveToStorage();

      return frames;

    } catch (error) {
      logger.error('Failed to generate storyboard from script:', error);
      throw error;
    }
  }

  /**
   * 生成分镜图像
   */
  async generateFrameImage(
    frameId: string,
    options: ImageGenerationOptions = {}
  ): Promise<string | null> {
    const frame = this.getById(frameId);
    if (!frame) return null;

    try {
      // 构建图像生成提示词
      const prompt = this.buildImagePrompt(frame);

      // 调用图像生成服务
      const result = await imageGenerationService.generateImage(prompt, {
        ...options,
        model: options.model ?? 'seedream-5.0',
      });

      // 更新分镜
      if (result.url) {
        this.update(frameId, { imageUrl: result.url });
      }

      return result.url ?? null;

    } catch (error) {
      logger.error('Failed to generate frame image:', error);
      return null;
    }
  }

  /**
   * 批量生成分镜图像
   */
  async generateAllFrameImages(
    options: ImageGenerationOptions = {},
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, string>> {
    const frames = this.getAll();
    const results = new Map<string, string>();

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      onProgress?.(i + 1, frames.length);

      if (frame.imageUrl) {
        results.set(frame.id, frame.imageUrl);
        continue;
      }

      const imageUrl = await this.generateFrameImage(frame.id, options);
      if (imageUrl) {
        results.set(frame.id, imageUrl);
      }
    }

    return results;
  }

  // ========== 辅助方法 ==========

  /**
   * 构建图像生成提示词
   */
  private buildImagePrompt(frame: StoryboardFrame): string {
    const parts: string[] = [];

    // 场景描述
    parts.push(`场景：${frame.sceneDescription}`);

    // 构图
    parts.push(`构图：${frame.composition}`);

    // 镜头类型
    const cameraMap: Record<string, string> = {
      wide: '全景镜头',
      medium: '中景镜头',
      closeup: '特写镜头',
      pan: '横摇镜头',
      tilt: '竖摇镜头',
      dolly: '推拉镜头',
      tracking: '跟随镜头',
    };
    parts.push(`镜头：${cameraMap[frame.cameraType] ?? frame.cameraType}`);

    // 风格要求
    parts.push('风格：专业视频分镜，画面精美，氛围感强');

    return parts.join('，');
  }

  /**
   * 生成默认分镜（当 AI 生成失败时）
   */
  private generateFallbackFrames(
    script: { title: string; content: string },
    count: number
  ): Partial<StoryboardFrame>[] {
    const frames: Partial<StoryboardFrame>[] = [];
    const scenes = this.splitContentIntoScenes(script.content, count);

    for (let i = 0; i < scenes.length; i++) {
      frames.push({
        title: `分镜 ${i + 1}`,
        sceneDescription: scenes[i],
        composition: '中心构图',
        cameraType: 'medium',
        dialogue: '',
        duration: 5,
      });
    }

    return frames;
  }

  /**
   * 将内容分割成场景
   */
  private splitContentIntoScenes(content: string, count: number): string[] {
    // 按段落分割
    const paragraphs = content.split(/\n+/).filter(p => p.trim());

    if (paragraphs.length <= count) {
      return paragraphs.map(p => p.trim());
    }

    // 平均分配
    const scenes: string[] = [];
    const chunkSize = Math.ceil(paragraphs.length / count);

    for (let i = 0; i < count; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, paragraphs.length);
      const sceneContent = paragraphs.slice(start, end).join(' ');
      scenes.push(sceneContent ?? `场景 ${i + 1}`);
    }

    return scenes;
  }

  // ========== 订阅和通知 ==========

  /**
   * 订阅变更
   */
  subscribe(listener: (storyboards: StoryboardFrame[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 通知订阅者
   */
  private notifyChange(): void {
    const frames = this.getAll();
    this.listeners.forEach(listener => listener(frames));
  }

  // ========== 持久化 ==========

  /**
   * 从存储加载
   */
  private loadFromStorage(): void {
    try {
      const storageKey = this.projectId
        ? `${STORYBOARD_STORAGE_KEY}-${this.projectId}`
        : STORYBOARD_STORAGE_KEY;

      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const frames = JSON.parse(stored) as StoryboardFrame[];
        this.storyboards.set(this.projectId ?? 'default', frames);
      }
    } catch (error) {
      logger.error('Failed to load storyboards from storage:', error);
    }
  }

  /**
   * 保存到存储
   */
  private saveToStorage(): void {
    if (!this.autoSave) return;

    try {
      const storageKey = this.projectId
        ? `${STORYBOARD_STORAGE_KEY}-${this.projectId}`
        : STORYBOARD_STORAGE_KEY;

      const frames = this.getAll();
      localStorage.setItem(storageKey, JSON.stringify(frames));
    } catch (error) {
      logger.error('Failed to save storyboards to storage:', error);
    }
  }

  // ========== 导入导出 ==========

  /**
   * 导出所有分镜
   */
  export(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * 导入分镜
   */
  import(jsonData: string): StoryboardFrame[] {
    try {
      const imported = JSON.parse(jsonData) as StoryboardFrame[];
      const validFrames = imported.filter(f => f.id && f.title && f.sceneDescription);

      const key = this.projectId ?? 'default';
      this.storyboards.set(key, validFrames);

      this.notifyChange();
      this.saveToStorage();

      return validFrames;
    } catch (error) {
      logger.error('Failed to import storyboards:', error);
      return [];
    }
  }
}

// 单例模式
let storyboardServiceInstance: StoryboardService | null = null;

export function getStoryboardService(options?: StoryboardServiceOptions): StoryboardService {
  if (!storyboardServiceInstance) {
    storyboardServiceInstance = new StoryboardService(options);
  }
  return storyboardServiceInstance;
}

export function resetStoryboardService(): void {
  storyboardServiceInstance = null;
}
