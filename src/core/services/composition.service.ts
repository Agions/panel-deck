/**
 * 动态合成配置管理服务
 * 负责合成项目的创建、编辑、动画配置、转场管理等
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  CompositionProject,
  FrameAnimation,
  TransitionConfig,
  StoryboardFrame,
  CameraMotion,
  AnimationProperty,
} from '@/core/types';
import { logger } from '@/core/utils/logger';

// 本地存储键
const COMPOSITION_STORAGE_KEY = 'panel-flow-compositions';

export interface CompositionServiceOptions {
  projectId?: string;
  autoSave?: boolean;
}

export interface ComposeFrameData {
  frameId: string;
  cameraMotion?: {
    type: CameraMotion;
    duration: number;
    intensity: number;
  } | null;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  opacity: number;
  filters: {
    blur: number;
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

export interface ExportCompositionData {
  version: string;
  projectId: string;
  frames: Array<ComposeFrameData>;
  transitions: TransitionConfig[];
  masterSettings: {
    frameDuration: number;
    defaultTransition: TransitionConfig;
  };
  exportedAt: string;
}

export class CompositionService {
  private compositions: Map<string, CompositionProject> = new Map();
  private projectId?: string;
  private autoSave: boolean;
  private listeners: Array<(composition: CompositionProject | null) => void> = [];

  constructor(options: CompositionServiceOptions = {}) {
    this.projectId = options.projectId;
    this.autoSave = options.autoSave ?? true;
    this.loadFromStorage();
  }

  /**
   * 创建新的合成项目
   */
  create(
    projectId: string,
    masterSettings?: Partial<CompositionProject['masterSettings']>
  ): CompositionProject {
    const composition: CompositionProject = {
      id: uuidv4(),
      projectId,
      frames: [],
      transitions: [],
      masterSettings: {
        frameDuration: masterSettings?.frameDuration ?? 3,
        defaultTransition: masterSettings?.defaultTransition ?? {
          effect: 'crossfade',
          duration: 0.5,
          easing: 'ease-in-out',
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.compositions.set(composition.id, composition);
    this.notifyChange(composition);
    this.saveToStorage();

    return composition;
  }

  /**
   * 获取项目的合成配置
   */
  getByProjectId(projectId: string): CompositionProject | null {
    for (const comp of this.compositions.values()) {
      if (comp.projectId === projectId) {
        return comp;
      }
    }
    return null;
  }

  /**
   * 获取合成配置（通过ID）
   */
  getById(compositionId: string): CompositionProject | undefined {
    return this.compositions.get(compositionId);
  }

  /**
   * 添加或更新帧动画配置
   */
  setFrameAnimation(
    compositionId: string,
    frameId: string,
    animation: Partial<FrameAnimation>
  ): FrameAnimation | null {
    const comp = this.compositions.get(compositionId);
    if (!comp) return null;

    const existingIndex = comp.frames.findIndex((f) => f.frameId === frameId);

    if (existingIndex >= 0) {
      comp.frames[existingIndex] = {
        ...comp.frames[existingIndex],
        ...animation,
      };
    } else {
      const newFrame: FrameAnimation = {
        frameId,
        cameraMotion: animation.cameraMotion ?? null,
        zoom: animation.zoom ?? 1,
        pan: animation.pan ?? { x: 0, y: 0 },
        rotation: animation.rotation ?? 0,
        opacity: animation.opacity ?? 1,
        filters: animation.filters ?? {
          blur: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
        },
        keyframes: animation.keyframes ?? [],
      };
      comp.frames.push(newFrame);
    }

    comp.updatedAt = new Date().toISOString();
    this.notifyChange(comp);
    this.saveToStorage();

    return comp.frames.find((f) => f.frameId === frameId) || null;
  }

  /**
   * 批量设置帧动画（从分镜批量初始化）
   */
  initializeFromStoryboard(compositionId: string, frames: StoryboardFrame[]): boolean {
    const comp = this.compositions.get(compositionId);
    if (!comp) return false;

    const newFrames: FrameAnimation[] = frames.map((frame) => ({
      frameId: frame.id,
      cameraMotion: null,
      zoom: 1,
      pan: { x: 0, y: 0 },
      rotation: 0,
      opacity: 1,
      filters: {
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
      },
      keyframes: [],
    }));

    comp.frames = newFrames;
    comp.updatedAt = new Date().toISOString();
    this.notifyChange(comp);
    this.saveToStorage();

    return true;
  }

  /**
   * 删除帧动画配置
   */
  deleteFrameAnimation(compositionId: string, frameId: string): boolean {
    const comp = this.compositions.get(compositionId);
    if (!comp) return false;

    const index = comp.frames.findIndex((f) => f.frameId === frameId);
    if (index === -1) return false;

    comp.frames.splice(index, 1);
    comp.updatedAt = new Date().toISOString();
    this.notifyChange(comp);
    this.saveToStorage();

    return true;
  }

  /**
   * 获取帧动画配置
   */
  getFrameAnimation(compositionId: string, frameId: string): FrameAnimation | undefined {
    const comp = this.compositions.get(compositionId);
    return comp?.frames.find((f) => f.frameId === frameId);
  }

  /**
   * 设置转场配置
   */
  setTransition(compositionId: string, index: number, transition: TransitionConfig): boolean {
    const comp = this.compositions.get(compositionId);
    if (!comp) return false;

    if (index >= comp.transitions.length) {
      comp.transitions.push(transition);
    } else {
      comp.transitions[index] = transition;
    }

    comp.updatedAt = new Date().toISOString();
    this.notifyChange(comp);
    this.saveToStorage();

    return true;
  }

  /**
   * 设置默认转场
   */
  setDefaultTransition(compositionId: string, transition: TransitionConfig): boolean {
    const comp = this.compositions.get(compositionId);
    if (!comp) return false;

    comp.masterSettings.defaultTransition = transition;
    comp.updatedAt = new Date().toISOString();
    this.notifyChange(comp);
    this.saveToStorage();

    return true;
  }

  /**
   * 更新全局设置
   */
  updateMasterSettings(
    compositionId: string,
    settings: Partial<CompositionProject['masterSettings']>
  ): boolean {
    const comp = this.compositions.get(compositionId);
    if (!comp) return false;

    comp.masterSettings = {
      ...comp.masterSettings,
      ...settings,
    };
    comp.updatedAt = new Date().toISOString();
    this.notifyChange(comp);
    this.saveToStorage();

    return true;
  }

  /**
   * 添加关键帧到帧配置
   */
  addKeyframe(
    compositionId: string,
    frameId: string,
    keyframe: {
      time: number;
      property: string;
      value: number;
      easing?: string;
    }
  ): boolean {
    const comp = this.compositions.get(compositionId);
    if (!comp) return false;

    const frame = comp.frames.find((f) => f.frameId === frameId);
    if (!frame) return false;

    if (!frame.keyframes) {
      frame.keyframes = [];
    }

    frame.keyframes.push({
      time: keyframe.time,
      property: keyframe.property as AnimationProperty,
      value: keyframe.value,
      easing:
        (keyframe.easing as 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out') || 'ease-in-out',
    });

    // 按时间排序
    frame.keyframes.sort((a, b) => a.time - b.time);

    comp.updatedAt = new Date().toISOString();
    this.notifyChange(comp);
    this.saveToStorage();

    return true;
  }

  /**
   * 删除关键帧
   */
  deleteKeyframe(compositionId: string, frameId: string, keyframeIndex: number): boolean {
    const comp = this.compositions.get(compositionId);
    if (!comp) return false;

    const frame = comp.frames.find((f) => f.frameId === frameId);
    if (!frame?.keyframes || keyframeIndex >= frame.keyframes.length) {
      return false;
    }

    frame.keyframes.splice(keyframeIndex, 1);
    comp.updatedAt = new Date().toISOString();
    this.notifyChange(comp);
    this.saveToStorage();

    return true;
  }

  /**
   * 导出合成数据（供视频合成引擎使用）
   */
  exportComposition(compositionId: string): ExportCompositionData | null {
    const comp = this.compositions.get(compositionId);
    if (!comp) return null;

    return {
      version: '1.0',
      projectId: comp.projectId,
      frames: comp.frames.map((f) => ({
        frameId: f.frameId,
        cameraMotion: f.cameraMotion,
        zoom: f.zoom ?? 1,
        pan: f.pan ?? { x: 0, y: 0 },
        rotation: f.rotation ?? 0,
        opacity: f.opacity ?? 1,
        filters: {
          blur: f.filters?.blur ?? 0,
          brightness: f.filters?.brightness ?? 100,
          contrast: f.filters?.contrast ?? 100,
          saturation: f.filters?.saturation ?? 100,
        },
      })),
      transitions: comp.transitions,
      masterSettings: comp.masterSettings,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * 导入合成数据
   */
  importComposition(data: ExportCompositionData): CompositionProject | null {
    try {
      const composition: CompositionProject = {
        id: uuidv4(),
        projectId: data.projectId,
        frames: data.frames.map((f) => ({
          frameId: f.frameId,
          cameraMotion: f.cameraMotion || null,
          zoom: f.zoom,
          pan: f.pan,
          rotation: f.rotation,
          opacity: f.opacity,
          filters: f.filters,
          keyframes: [],
        })),
        transitions: data.transitions,
        masterSettings: data.masterSettings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.compositions.set(composition.id, composition);
      this.notifyChange(composition);
      this.saveToStorage();

      return composition;
    } catch (error) {
      logger.error('Failed to import composition:', error);
      return null;
    }
  }

  /**
   * 删除合成项目
   */
  delete(compositionId: string): boolean {
    const result = this.compositions.delete(compositionId);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }

  /**
   * 订阅合成配置变更
   */
  subscribe(listener: (composition: CompositionProject | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 从存储加载
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(COMPOSITION_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Array<{
          id: string;
          projectId: string;
          frames: FrameAnimation[];
          transitions: TransitionConfig[];
          masterSettings: CompositionProject['masterSettings'];
          createdAt: string;
          updatedAt: string;
        }>;

        this.compositions = new Map(data.map((comp) => [comp.id, { ...comp }]));
      }
    } catch (error) {
      logger.error('Failed to load compositions from storage:', error);
    }
  }

  /**
   * 保存到存储
   */
  private saveToStorage(): void {
    if (!this.autoSave) return;

    try {
      const data = Array.from(this.compositions.values());
      localStorage.setItem(COMPOSITION_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save compositions to storage:', error);
    }
  }

  /**
   * 通知订阅者
   */
  private notifyChange(composition: CompositionProject | null): void {
    this.listeners.forEach((listener) => listener(composition));
  }

  /**
   * 获取所有合成项目（用于项目列表）
   */
  listAll(): CompositionProject[] {
    return Array.from(this.compositions.values());
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.compositions.clear();
    this.notifyChange(null);
    this.saveToStorage();
  }
}

// 默认导出单例
let compositionServiceInstance: CompositionService | null = null;

export function getCompositionService(options?: CompositionServiceOptions): CompositionService {
  if (!compositionServiceInstance) {
    compositionServiceInstance = new CompositionService(options);
  }
  return compositionServiceInstance;
}

export function resetCompositionService(): void {
  compositionServiceInstance = null;
}
