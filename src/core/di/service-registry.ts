/**
 * Service Registry — 服务注册中心
 *
 * 消除步骤（Step）对服务的硬编码 import 依赖
 * 支持：依赖注入 / Mock 替换 / 运行时服务发现
 *
 * 使用方式：
 *   // 注册服务（应用启动时）
 *   ServiceRegistry.register('tts', () => new TTSService());
 *
 *   // 步骤中通过 registry 获取（而非直接 import）
 *   const tts = ServiceRegistry.get<TTSService>('tts');
 *   await tts.synthesize(...);
 *
 *   // Mock 替换（测试时）
 *   ServiceRegistry.register('tts', () => new MockTTSService());
 */

// ========== 类型定义 ==========

export type ServiceFactory<T = unknown> = () => T;
export type ServiceInstance<T = unknown> = T;

interface ServiceRegistration<T = unknown> {
  id: string;
  factory: ServiceFactory<T>;
  instance?: T;
  singleton: boolean;
}

// ========== 服务注册中心 ==========

class ServiceRegistryImpl {
  private services = new Map<string, ServiceRegistration>();
  private globalFallback = new Map<string, ServiceFactory>();

  /**
   * 注册服务
   * @param id 服务唯一标识
   * @param factory 实例工厂（支持 singleton 和 factory 模式）
   * @param singleton true=单例（只调用一次），false=每次 resolve 都新建
   */
  register<T = unknown>(id: string, factory: ServiceFactory<T>, singleton = true): void {
    this.services.set(id, { id, factory, singleton });
  }

  /**
   * 获取服务实例
   */
  get<T = unknown>(id: string): T {
    const reg = this.services.get(id);
    if (!reg) {
      // 尝试 global fallback
      const fallback = this.globalFallback.get(id);
      if (fallback) {
        return fallback() as T;
      }
      throw new Error(`[ServiceRegistry] Service not registered: ${id}`);
    }

    if (reg.singleton) {
      if (!reg.instance) {
        reg.instance = reg.factory() as T;
      }
      return reg.instance as T;
    }

    return reg.factory() as T;
  }

  /**
   * 检查服务是否已注册
   */
  has(id: string): boolean {
    return this.services.has(id) || this.globalFallback.has(id);
  }

  /**
   * 列出所有已注册服务 ID
   */
  list(): string[] {
    return [...this.services.keys(), ...this.globalFallback.keys()];
  }

  /**
   * 清除所有注册（测试用）
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * 全局回退 factory（用于测试时批量替换）
   * 设置后，所有未明确注册的服务都会使用此 factory
   */
  setGlobalFallback(id: string, factory: ServiceFactory): void {
    this.globalFallback.set(id, factory);
  }

  /**
   * 获取现有实例（同步的，不新建）
   */
  getExisting<T = unknown>(id: string): T | undefined {
    const reg = this.services.get(id);
    if (!reg) return undefined;
    return reg.instance as T | undefined;
  }

  /**
   * 替换已有服务的实例（用于热替换）
   */
  override<T = unknown>(id: string, instance: T): void {
    const reg = this.services.get(id);
    if (reg) {
      reg.instance = instance as unknown as T;
    }
  }
}

// ========== 全局单例 ==========

export const ServiceRegistry = new ServiceRegistryImpl();

// ========== 便捷装饰器（用于服务类） ==========

/**
 * 标记类为自动注册服务
 * 使用 @Injectable() 装饰器自动注册到 ServiceRegistry
 *
 * 示例：
 *   @Injectable('tts')
 *   class TTSService { ... }
 *
 *   // 应用启动时调用
 *   bootstrapServices();
 */
export function Injectable(id: string, singleton = true) {
  return function <T extends new (...args: any[]) => any>(ctor: T) {
    ServiceRegistry.register(id, () => new ctor(), singleton);
    return ctor;
  };
}

/**
 * 引导所有 @Injectable 装饰的服务
 */
export function bootstrapServices(): void {
  // Currently a no-op; expansion point for decorator-based registration
}

// ========== 旧 API 兼容层 ==========
// 让现有代码继续工作，不强制所有地方改用 registry

import { aiService } from '@/core/services/ai.service';
import { audioPipelineService } from '@/core/services/audio-pipeline.service';
import { getCharacterService } from '@/core/services/character.service';
import { collaborationService } from '@/core/services/collaboration.service';
import { getCompositionService } from '@/core/services/composition.service';
import { costService } from '@/core/services/cost.service';
import { desktopAppService } from '@/core/services/desktop-app.service';
import { evaluationService } from '@/core/services/evaluation.service';
import { ffmpegWasmService } from '@/core/services/ffmpeg-wasm.service';
import { imageGenerationService } from '@/core/services/image-generation.service';
import { lipSyncService } from '@/core/services/lip-sync.service';
import { novelAnalyzer } from '@/core/services/novel-analyze.service';
import { novelService } from '@/core/services/novel.service';
import { pipelineService } from '@/core/pipeline/index.ts';
import { projectImportExportService } from '@/core/services/project-import-export.service';
import { qualityGateService } from '@/core/services/quality-gate.service';
import { renderQueueService } from '@/core/services/render-queue.service';
import { reviewExportService } from '@/core/services/review-export.service';
import { scriptImportService } from '@/core/services/script-import.service';
import { storyAnalysisService } from '@/core/services/story-analysis.service';
import { getStoryboardService } from '@/core/services/storyboard.service';
import { subtitleService } from '@/core/services/subtitle.service';
import { ttsService } from '@/core/services/tts.service';
import { videoAnalysisService } from '@/core/services/video-analysis.service';
import { secureStorage } from '@/core/services/secure-storage.service';
import { videoCompositorService } from '@/core/services/video-compositor.service';
import { videoService } from '@/core/services/video.service';

/**
 * 注册所有核心服务到全局注册表
 * 在应用初始化时调用一次即可
 */
export function registerCoreServices(): void {
  ServiceRegistry.register('tts', () => ttsService, true);
  ServiceRegistry.register('ffmpeg-wasm', () => ffmpegWasmService, true);
  ServiceRegistry.register('ai', () => aiService, true);
  ServiceRegistry.register('novel', () => novelService, true);
  ServiceRegistry.register('image-generation', () => imageGenerationService, true);
  ServiceRegistry.register('lip-sync', () => lipSyncService, true);
  ServiceRegistry.register('video-compositor', () => videoCompositorService, true);
  ServiceRegistry.register('secure-storage', () => secureStorage, true);
  ServiceRegistry.register('character', () => getCharacterService(), true);
  ServiceRegistry.register('collaboration', () => collaborationService, true);
  ServiceRegistry.register('cost', () => costService, true);
  ServiceRegistry.register('evaluation', () => evaluationService, true);
  ServiceRegistry.register('quality-gate', () => qualityGateService, true);
  ServiceRegistry.register('story-analysis', () => storyAnalysisService, true);
  ServiceRegistry.register('storyboard', () => getStoryboardService(), true);
  ServiceRegistry.register('audio-pipeline', () => audioPipelineService, true);
  ServiceRegistry.register('render-queue', () => renderQueueService, true);
  ServiceRegistry.register('review-export', () => reviewExportService, true);
 

ServiceRegistry.register('subtitle', () => subtitleService, true);
  ServiceRegistry.register('composition', () => getCompositionService(), true);
  ServiceRegistry.register('novel-analyzer', () => novelAnalyzer, true);
  ServiceRegistry.register('pipeline', () => pipelineService, true);
  ServiceRegistry.register('project-import-export', () => projectImportExportService, true);
  ServiceRegistry.register('script-import', () => scriptImportService, true);
  ServiceRegistry.register('desktop-app', () => desktopAppService, true);
  ServiceRegistry.register('video', () => videoService, true);
}
