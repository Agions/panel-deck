/**
 * Services 统一导出
 */

// 图像/视频生成服务
export { imageGenerationService, default as ImageGenerationService } from './image-generation.service';
export type { ImageGenerationOptions, ImageGenerationResult, VideoGenerationOptions, VideoGenerationResult, ImageModel } from './image-generation.service';

// 唇同步服务
export { lipSyncService, default as LipSyncService } from './lip-sync.service';
export type { LipSyncOptions, LipSyncResult, TalkingFaceOptions, TalkingFaceResult } from './lip-sync.service';

// 视频合成服务
export { videoCompositorService, default as VideoCompositorService } from './video-compositor.service';
export type { Scene, SubtitleTrack as VideoSubtitleTrack, Subtitle as VideoSubtitle, BackgroundMusic, CompositionOptions, CompositionResult, ExportProgress as VideoExportProgress } from './ffmpeg-wasm.service';

// FFmpeg.wasm 服务
export { ffmpegWasmService, default as FFmpegWasmService, loadFFmpeg, isFFmpegWasmAvailable } from './ffmpeg-wasm.service';
export type { CompositionOptions as FFmpegCompositionOptions, CompositionResult as FFmpegCompositionResult, ExportProgress as FFmpegExportProgress } from './ffmpeg-wasm.service';

// 视频脚本流水线服务
export { mangaPipelineService, default as MangaPipelineService } from './manga-pipeline.service';
export type { PipelineConfig as MangaPipelineConfig, PipelineScene, PipelineResult as MangaPipelineResult, PipelineProgress } from './manga-pipeline.service';

// 核心服务
export { aiService, type AIResponse, type RequestConfig } from './ai.service';
export { novelService, default as NovelService } from './novel.service';
export { novelAnalyzer, default as NovelAnalyzer } from './novel-analyze.service';
export { scriptImportService, default as ScriptImportService } from './script-import.service';
export { storyAnalysisService, default as StoryAnalysisService } from './story-analysis.service';
export { getStoryboardService, resetStoryboardService, type StoryboardServiceOptions } from './storyboard.service';
export { renderQueueService, default as RenderQueueService } from './render-queue.service';
export { audioPipelineService, default as AudioPipelineService } from './audio-pipeline.service';
export { evaluationService, default as EvaluationService } from './evaluation.service';
export { qualityGateService, default as QualityGateService } from './quality-gate.service';
export { collaborationService, default as CollaborationService } from './collaboration.service';
export { reviewExportService, default as ReviewExportService } from './review-export.service';
export { videoService } from './video.service';
export { storageService } from '@/shared/services/storage';
export { costService, default as CostService } from './cost.service';
export { ttsService, DEFAULT_TTS_CONFIG, TTS_VOICES } from './tts.service';
export { videoAnalysisService, DEFAULT_ANALYSIS_CONFIG, SCENE_TYPES } from './video-analysis.service';
export type { VideoAnalysisConfig, SceneType } from './video-analysis.service';
export { subtitleService, DEFAULT_SUBTITLE_STYLE, ASS_STYLE_PRESETS } from './subtitle.service';
export type { SubtitleStyle, SubtitleItem, SubtitleTrack, SubtitleFormat } from './subtitle.service';
export { projectImportExportService } from './project-import-export.service';
export type { ExportFormat, ProjectExportData, ImportOptions, ExportOptions } from './project-import-export.service';
export { desktopAppService } from './desktop-app.service';
export type { ShortcutDefinition, TrayMenuItem, NotificationOptions, WindowState } from './desktop-app.service';

// 增强服务

// Tauri 服务
export { default as TauriService, tauriService } from './tauri.service';
export type { OpenFileOptions, SaveFileOptions, VideoClipOptions, PreviewOptions, ExportProgress, DirInfo } from './tauri.service';

// ========== 简化线性流程引擎 ==========
export {
  PipelineService,
  getPipelineService,
  createDefaultPipeline,
  createImportStep,
  createAnalysisStep,
  createScriptStep,
  createStoryboardStep,
  createCharacterStep,
  createRenderStep,
  createExportStep,
  PIPELINE_STEP_IDS
} from './pipeline.service';
export type {
  PipelineStep,
  PipelineContext,
  PipelineResult,
  PipelineStepResult,
  PipelineConfig,
  PipelineStatus,
  PipelineStepId
} from './pipeline.service';
export type { CostRecord, CostStats, CostBudget, BudgetStatus, CostAlert } from './cost.service';
export type { BenchmarkSample, EvaluationCaseResult, EvaluationScores, EvaluationItemReport, EvaluationReport } from './evaluation.service';
export type { QualityGateIssueLevel, QualityGateIssue, QualityGateThresholds, QualityGateInput, QualityGateMetrics, QualityGateResult } from './quality-gate.service';
export type { FrameComment, StoryboardVersion, VersionDiffSummary } from './collaboration.service';
export type {
  ReviewExportInput,
  ReviewExportProjectMeta,
  ReviewExportActivity,
  ReviewExportSource,
  ReviewExportStatus,
  SaveReviewMarkdownOptions,
} from './review-export.service';
export type { NovelChapter, ScriptScene, Script, NovelParseResult, Storyboard } from './novel.service';
export type { TTSProvider, TTSVoice, TTSConfig, TTSRequest, TTSResponse, TTSStreamChunk } from '@/core/types';
