/**
 * AI 视频分析服务
 * 提供智能视频分析功能：场景检测、物体识别、情感分析、内容理解
 */

import { v4 as uuidv4 } from 'uuid';

import type { VideoInfo, VideoAnalysis, Scene, Keyframe, ObjectDetection, EmotionAnalysis } from '@/core/types';
import { logger } from '@/core/utils/logger';

import { aiService } from './ai.service';

// 分析配置
export interface VideoAnalysisConfig {
  enableSceneDetection: boolean;    // 场景检测
  enableObjectDetection: boolean;   // 物体识别
  enableEmotionAnalysis: boolean;   // 情感分析
  enableContentSummary: boolean;    // 内容摘要
  enableKeyframeExtraction: boolean; // 关键帧提取
  sceneThreshold: number;           // 场景切换阈值
  maxKeyframes: number;             // 最大关键帧数
}

// 默认配置
export const DEFAULT_ANALYSIS_CONFIG: VideoAnalysisConfig = {
  enableSceneDetection: true,
  enableObjectDetection: true,
  enableEmotionAnalysis: true,
  enableContentSummary: true,
  enableKeyframeExtraction: true,
  sceneThreshold: 0.3,
  maxKeyframes: 10,
};

// 预定义的场景类型
export const SCENE_TYPES = [
  'intro',           // 开场
  'dialogue',        // 对话
  'action',          // 动作
  'narration',       // 叙述
  'transition',      // 转场
  'explanation',     // 讲解
  'demo',            // 演示
  'conclusion',      // 结尾
  'background',      // 背景
  'highlight',       // 高光
] as const;

export type SceneType = typeof SCENE_TYPES[number];

class VideoAnalysisService {
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * 完整的视频分析
   */
  async analyzeVideo(
    videoInfo: VideoInfo,
    config: Partial<VideoAnalysisConfig> = {}
  ): Promise<VideoAnalysis> {
    const finalConfig = { ...DEFAULT_ANALYSIS_CONFIG, ...config };
    const analysisId = uuidv4();

    const result: VideoAnalysis = {
      id: analysisId,
      videoId: videoInfo.id,
      scenes: [],
      keyframes: [],
      objects: [],
      emotions: [],
      summary: '',
      stats: {
        sceneCount: 0,
        objectCount: 0,
        avgSceneDuration: 0,
        sceneTypes: {},
        objectCategories: {},
        dominantEmotions: {},
      },
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. 关键帧提取
      if (finalConfig.enableKeyframeExtraction) {
        result.keyframes = await this.extractKeyframes(videoInfo, finalConfig.maxKeyframes);
      }

      // 2. 场景检测
      if (finalConfig.enableSceneDetection) {
        result.scenes = await this.detectScenes(videoInfo, finalConfig.sceneThreshold);
      }

      // 3. 物体检测（模拟）
      if (finalConfig.enableObjectDetection) {
        result.objects = await this.detectObjects(videoInfo, result.scenes);
      }

      // 4. 情感分析（模拟）
      if (finalConfig.enableEmotionAnalysis) {
        result.emotions = await this.analyzeEmotions(videoInfo, result.scenes);
      }

      // 5. 内容摘要
      if (finalConfig.enableContentSummary) {
        result.summary = await this.generateSummary(videoInfo, result);
      }

      // 6. 统计信息
      result.stats = this.calculateStats(result);

    } catch (error) {
      logger.error('视频分析失败:', error);
      throw error;
    }

    return result;
  }

  /**
   * 提取关键帧
   */
  async extractKeyframes(videoInfo: VideoInfo, count: number = 10): Promise<Keyframe[]> {
    const keyframes: Keyframe[] = [];
    const duration = videoInfo.duration!;
    const interval = duration / (count + 1);

    for (let i = 1; i <= count; i++) {
      const timestamp = Math.round(interval * i);
      keyframes.push({
        id: uuidv4(),
        timestamp,
        thumbnail: '', // 缩略图由前端使用 Canvas 生成
        description: `第 ${i} 个关键帧于 ${this.formatTime(timestamp)}`,
      });
    }

    return keyframes;
  }

  /**
   * 场景检测
   */
  async detectScenes(videoInfo: VideoInfo, _threshold: number = 0.3): Promise<Scene[]> {
    // 使用 AI 分析视频场景
    // 这里使用模拟实现，实际应该使用计算机视觉模型
    const scenes: Scene[] = [];
    const duration = videoInfo.duration;
    const avgSceneDuration = 30; // 平均场景时长
    const sceneCount = Math.max(1, Math.floor(duration! / avgSceneDuration));

    const sceneTypeSamples = SCENE_TYPES.slice(0, 5);

    for (let i = 0; i < sceneCount; i++) {
      const startTime = Math.round(i * avgSceneDuration);
      const endTime = Math.min(Math.round((i + 1) * avgSceneDuration), duration!);

      // 随机分配场景类型
      const sceneType = sceneTypeSamples[i % sceneTypeSamples.length] as SceneType;

      scenes.push({
        id: uuidv4(),
        startTime,
        endTime,
        thumbnail: '',
        description: this.getSceneDescription(sceneType),
        tags: [sceneType, `场景${i + 1}`],
        type: sceneType,
        confidence: 0.7 + Math.random() * 0.3,
      });
    }

    return scenes;
  }

  /**
   * 物体检测（模拟）
   */
  async detectObjects(videoInfo: VideoInfo, scenes: Scene[]): Promise<ObjectDetection[]> {
    // 预定义的物体类别
    const objectCategories = ['人物', '物品', '文字', '背景', '动物', '车辆'];
    const commonObjects = [
      '人物', '人脸', '文字', '手机', '电脑', '书本',
      '桌子', '椅子', '窗户', '门', '杯子', '衣服'
    ];

    const detections: ObjectDetection[] = [];

    for (const scene of scenes) {
      // 每个场景随机检测 1-3 个物体
      const objectCount = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < objectCount; i++) {
        const category = objectCategories[Math.floor(Math.random() * objectCategories.length)];
        const label = commonObjects[Math.floor(Math.random() * commonObjects.length)];

        detections.push({
          id: uuidv4(),
          sceneId: scene.id,
          category,
          label,
          confidence: 0.5 + Math.random() * 0.5,
          bbox: {
            x: Math.random() * 0.8,
            y: Math.random() * 0.8,
            width: 0.1 + Math.random() * 0.3,
            height: 0.1 + Math.random() * 0.3,
          },
          timestamp: scene.startTime,
        });
      }
    }

    return detections;
  }

  /**
   * 情感分析（模拟）
   */
  async analyzeEmotions(videoInfo: VideoInfo, scenes: Scene[]): Promise<EmotionAnalysis[]> {
    const emotionsList = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'fear'];
    const analyses: EmotionAnalysis[] = [];

    for (const scene of scenes) {
      // 随机分配情感
      const emotions = emotionsList.map(emotion => ({
        id: uuidv4(),
        name: emotion,
        score: Math.random(),
      }));

      // 归一化分数
      const total = emotions.reduce((sum, e) => sum + e.score, 0);
      emotions.forEach(e => e.score = e.score / total);

      // 找出主导情感
      const dominant = emotions.reduce((max, e) =>
        e.score > max.score ? e : max
      , emotions[0]);

      analyses.push({
        id: uuidv4(),
        sceneId: scene.id,
        timestamp: scene.startTime,
        emotions,
        dominant: dominant.name,
        intensity: dominant.score,
      });
    }

    return analyses;
  }

  /**
   * 使用 AI 生成内容摘要
   */
  async generateSummary(videoInfo: VideoInfo, analysis: Partial<VideoAnalysis>): Promise<string> {
    try {
      // 构建分析提示
      const prompt = `请为以下视频生成一个简洁的内容摘要：

视频信息：
- 时长：${this.formatTime(videoInfo.duration!)}
- 分辨率：${videoInfo!.width}x${videoInfo!.height}
- 格式：${videoInfo.format}

场景分析：
${analysis.scenes?.map(s => `- ${s.type}: ${s.description}`).join('\n') || '无'}

物体识别：
${this.groupByCategory(analysis.objects || []).map(([cat, objs]) => `- ${cat}: ${objs.length}个`).join('\n') || '无'}

请生成 2-3 句话的内容摘要。`;

      const summary = await aiService.generate(prompt, {
        model: 'gpt-3.5-turbo',
        provider: 'openai',
      });

      return summary;
    } catch (error) {
      logger.error('生成摘要失败:', error);
      // 返回默认摘要
      return this.generateDefaultSummary(videoInfo, analysis);
    }
  }

  /**
   * 生成默认摘要（当 AI 失败时）
   */
  private generateDefaultSummary(videoInfo: VideoInfo, analysis: Partial<VideoAnalysis>): string {
    const sceneCount = analysis.scenes?.length ?? 0;
    const objectTypes = Object.keys(analysis.stats?.objectCategories ?? {});

    return `视频时长 ${this.formatTime(videoInfo.duration!)}，分辨率 ${videoInfo.width}x${videoInfo.height}。` +
      `包含 ${sceneCount} 个场景${objectTypes.length > 0 ? `，主要元素包括 ${objectTypes.slice(0, 3).join('、')}` : ''}。`;
  }

  /**
   * 计算统计信息
   */
  private calculateStats(analysis: VideoAnalysis): VideoAnalysis['stats'] {
    const sceneCount = analysis.scenes.length;
    const objectCount = analysis.objects.length;

    // 场景类型统计
    const sceneTypes: Record<string, number> = {};
    analysis.scenes.forEach(scene => {
      const type = scene.type ?? 'unknown';
      sceneTypes[type] = (sceneTypes[type] ?? 0) + 1;
    });

    // 物体类别统计
    const objectCategories: Record<string, number> = {};
    analysis.objects.forEach(obj => {
      objectCategories[obj.category] = (objectCategories[obj.category] ?? 0) + 1;
    });

    // 情感统计
    const dominantEmotions: Record<string, number> = {};
    analysis.emotions.forEach(emo => {
      dominantEmotions[emo.dominant] = (dominantEmotions[emo.dominant] ?? 0) + 1;
    });

    // 平均场景时长
    const totalDuration = analysis.scenes.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
    const avgSceneDuration = sceneCount > 0 ? totalDuration / sceneCount : 0;

    return {
      sceneCount,
      objectCount,
      avgSceneDuration,
      sceneTypes,
      objectCategories,
      dominantEmotions,
    };
  }

  /**
   * 按类别分组物体
   */
  private groupByCategory(objects: ObjectDetection[]): [string, ObjectDetection[]][] {
    const groups = new Map<string, ObjectDetection[]>();

    objects.forEach(obj => {
      const list = groups.get(obj.category) ?? [];
      list.push(obj);
      groups.set(obj.category, list);
    });

    return Array.from(groups.entries());
  }

  /**
   * 获取场景描述
   */
  private getSceneDescription(type: SceneType): string {
    const descriptions: Record<SceneType, string> = {
      intro: '视频开场部分，通常用于介绍主题',
      dialogue: '对话场景，包含人物交流',
      action: '动作场景，展示具体行为',
      narration: '叙述场景，画外音或旁白',
      transition: '转场过渡',
      explanation: '讲解说明，解释内容',
      demo: '演示展示，操作示范',
      conclusion: '结尾总结，回顾要点',
      background: '背景画面',
      highlight: '精彩高光时刻',
    };

      return descriptions[type] ?? '未知场景类型';
  }

  /**
   * 格式化时间
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 取消分析
   */
  cancelAnalysis(analysisId: string): void {
    const controller = this.abortControllers.get(analysisId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(analysisId);
    }
  }

  /**
   * 获取分析建议
   */
  getSuggestions(analysis: VideoAnalysis): string[] {
    const suggestions: string[] = [];

    // 基于场景类型的建议
    const sceneTypes = Object.keys(analysis.stats?.sceneTypes ?? {});
    if (!sceneTypes.includes('intro')) {
      suggestions.push('建议添加开场场景来吸引观众');
    }
    if (!sceneTypes.includes('conclusion')) {
      suggestions.push('建议添加结尾总结来强化内容');
    }

    // 基于情感的建議
    const emotions = analysis.stats?.dominantEmotions ?? {};
    if (emotions['neutral'] > 0.7) {
      suggestions.push('情感比较单一，可以增加情感变化');
    }

    // 基于物体识别的建议
    if (Object.keys(analysis.stats?.objectCategories || {}).length < 3) {
      suggestions.push('画面元素较少，可以增加更多视觉元素');
    }

    return suggestions;
  }
}

export const videoAnalysisService = new VideoAnalysisService();
export default videoAnalysisService;
