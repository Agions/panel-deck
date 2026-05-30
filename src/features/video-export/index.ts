/**
 * Video Export — re-export barrel
 * ================================
 * 所有服务已迁移到 @/features/video/services/。
 * 此文件保留以维持向后兼容。
 */

export { videoService } from './services/video.service';
export { videoCompositorService } from './services/video-compositor.service';
export { reviewExportService } from './services/review-export.service';
export { getTauriService } from './services/tauri.service';

export type {
  VideoInfo,
  VideoAnalysis,
  Scene,
  Keyframe,
} from '@/core/types';

export type {
  Scene as ExportScene,
  SceneEffect,
  SubtitleTrack as VideoSubtitleTrack,
  Subtitle as VideoSubtitle,
  BackgroundMusic,
  CompositionOptions,
  CompositionResult,
  ExportProgress as VideoExportProgress,
} from './services/video-compositor.service';

export type {
  ReviewExportInput,
  ReviewExportProjectMeta,
  ReviewExportActivity,
  ReviewExportSource,
  ReviewExportStatus,
  SaveReviewMarkdownOptions,
} from './services/review-export.service';

export type {
  OpenFileOptions,
  SaveFileOptions,
  ShortcutDefinition,
  TrayMenuItem,
  NotificationOptions,
  WindowState,
  VideoClipOptions,
  PreviewOptions,
  ExportOptions,
  ExportProgress,
  ExportProgressCallback,
  DirInfo,
} from './services/tauri.service';