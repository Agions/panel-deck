/**
 * PanelFlow Shared Types
 * Consolidated type definitions from src/types and src/core/types
 */

export * from './video';

/**
 * Section Map (for domain split preparation)
 * =========================================
 * Group 1: AI Model Types     - Lines 8-63
 * Group 2: AI Core Types      - Lines 65-161
 * Group 3: Video Types        - Lines 163-254
 * Group 4: Script Types       - Lines 255-386
 * Group 5: Project Types      - Lines 290-363
 * Group 6: Novel Types        - Lines 463-722
 * Group 7: Composition Types  - Lines 724-859
 * Group 8: Legacy Types       - Lines 861-918
 */

// CSS Module type declarations are in src/types/cssmodule.d.ts

// ========== AI Model Types (extracted to ai.models.ts) ==========

export { AIModelType, AIModelInfo, AI_MODEL_INFO } from './ai.models';

// ========== AI Core Types (extracted to ai.core.ts) ==========

export * from './ai.core';

// Original types commented out - moved to ai.core.ts
// export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'baidu' | 'alibaba' | 'zhipu' | 'iflytek' | 'tencent' | 'minimax' | 'moonshot' | 'bytedance' | 'kling';
// export type ModelCategory = 'text' | 'code' | 'image' | 'video' | 'audio' | 'all';

// export type TTSProvider = 'edge' | 'azure' | 'aliyun' | 'baidu' | 'iflytek' | 'cosyvoice';

// export interface TTSVoice {
//   id: string;
//   name: string;
//   gender: 'male' | 'female' | 'neutral';
//   language: string;
//   provider: TTSProvider;
//   style?: string;
//   description?: string;
// }

// export interface TTSConfig {
//   provider: TTSProvider;
//   voice: string;
//   speed: number;
//   pitch: number;
//   volume: number;
//   format: 'audio-16khz-32kbitrate-mono-mp3' | 'audio-16khz-64kbitrate-mono-mp3' | 'audio-24khz-48kbitrate-mono-mp3' | 'audio-24khz-96kbitrate-mono-mp3';
// }

// export interface TTSRequest {
//   text: string;
//   config: TTSConfig;
//   signal?: AbortSignal;
// }

// export interface TTSResponse {
//   audio: ArrayBuffer;
//   duration: number;
//   size: number;
//   format: string;
// }

// export interface TTSStreamChunk {
//   audio: ArrayBuffer;
//   isFinal: boolean;
// }

// export interface StreamCallback<T> {
//   (chunk: T): void;
//   (error: Error): void;
// }

// export interface StreamOptions {
//   model: string;
//   messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
//   temperature?: number;
//   max_tokens?: number;
//   onChunk: (content: string, isFinal: boolean) => void;
//   signal?: AbortSignal;
// }

// export interface AIModel {
//   id: string;
//   name: string;
//   provider: ModelProvider;
//   category: ModelCategory[];
//   description: string;
//   features: string[];
//   tokenLimit: number;
//   contextWindow: number;
//   isPro?: boolean;
//   isAvailable?: boolean;
//   apiConfigured?: boolean;
//   pricing?: {
//     input: number;
//     output: number;
//     unit: string;
//   };
// }

// export interface AIModelSettings {
//   enabled: boolean;
//   apiKey?: string;
//   apiSecret?: string;
//   apiUrl?: string;
//   apiVersion?: string;
//   model?: string;
//   temperature?: number;
//   maxTokens?: number;
//   topP?: number;
//   frequencyPenalty?: number;
//   presencePenalty?: number;
// }

// export interface ModelConfigState {
//   selectedModel: string;
//   models: Record<string, AIModelSettings>;
//   isLoading: boolean;
//   error: string | null;
// }

// export interface VideoInfo {
//   id: string;
//   path: string;
//   name: string;
//   duration: number;
//   width: number;
//   height: number;
//   fps: number;
//   format: string;
//   size: number;
//   thumbnail?: string;
//   createdAt: string;
// }

// export interface Scene {
//   id: string;
//   startTime: number;
//   endTime: number;
//   thumbnail: string;
//   description?: string;
//   tags: string[];
//   type?: string;
//   confidence?: number;
//   features?: any;
//   objectCount?: number;
//   dominantEmotion?: string;
// }

// export interface Keyframe {
//   id: string;
//   timestamp: number;
//   thumbnail: string;
//   description?: string;
// }

// export interface ObjectDetection {
//   id: string;
//   sceneId: string;
//   category: string;
//   label: string;
//   confidence: number;
//   bbox: {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//   };
//   timestamp: number;
// }

// export interface EmotionAnalysis {
//   id: string;
//   sceneId: string;
//   timestamp: number;
//   emotions: Array<{
//     id: string;
//     name: string;
//     score: number;
//   }>;
//   dominant: string;
//   intensity: number;
// }

// Simple emotion tag used in video analysis
// export interface Emotion {
//   timestamp: number;
//   type: string;
//   intensity: number;
// }

// export interface VideoAnalysis {
//   id: string;
//   videoId: string;
//   title?: string;
//   duration?: number;
//   scenes: Scene[];
//   keyframes: Keyframe[];
//   objects: ObjectDetection[];
//   keyMoments?: KeyMoment[];
//   emotions: EmotionAnalysis[];
//   summary: string;
//   stats?: {
//     sceneCount: number;
//     objectCount: number;
//     avgSceneDuration: number;
//     sceneTypes: Record<string, number>;
//     objectCategories: Record<string, number>;
//     dominantEmotions: Record<string, number>;
//   };
//   createdAt: string;
// }

export interface ScriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  content: string;
  type: 'narration' | 'dialogue' | 'action' | 'transition';
  notes?: string;
}

export interface ScriptMetadata {
  style: string;
  tone: string;
  length: 'short' | 'medium' | 'long';
  targetAudience: string;
  language: string;
  wordCount: number;
  estimatedDuration: number;
  generatedBy: string;
  generatedAt: string;
  template?: string;
  templateName?: string;
}

export interface Script {
  id: string;
  title: string;
  content: string;
  segments: ScriptSegment[];
  metadata?: ScriptMetadata;
  createdAt: string;
  updatedAt: string;
  videoId?: string;
  modelUsed?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'processing' | 'completed' | 'archived';
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'processing' | 'completed' | 'archived';
  thumbnail?: string;
  videos: VideoInfo[];
  scripts: Script[];
  analysis?: VideoAnalysis;
  characters?: Character[];
  composition?: CompositionProject;
  settings?: ProjectSettings;
  novelMetadata?: any;
  storyboardComments?: any;
  storyboardVersions?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  videoQuality: 'low' | 'medium' | 'high' | 'ultra';
  outputFormat: 'mp4' | 'mov' | 'webm' | 'mkv';
  resolution: '720p' | '1080p' | '2k' | '4k';
  frameRate: 24 | 30 | 60;
  audioCodec: 'aac' | 'mp3' | 'flac';
  videoCodec: 'h264' | 'h265' | 'vp9';
  subtitleEnabled: boolean;
  subtitleStyle: SubtitleStyle;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  outline: boolean;
  outlineColor: string;
  position: 'top' | 'middle' | 'bottom';
  alignment: 'left' | 'center' | 'right';
}

export interface ExportSettings {
  format: 'mp4' | 'mov' | 'webm' | 'mkv';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: '720p' | '1080p' | '2k' | '4k';
  frameRate: 24 | 30 | 60;
  includeSubtitles: boolean;
  burnSubtitles: boolean;
  watermark?: {
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
  };
}

export interface ExportRecord {
  id: string;
  projectId: string;
  format: string;
  quality: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  structure: Array<{
    type: 'intro' | 'hook' | 'body' | 'transition' | 'conclusion' | 'cta';
    name: string;
    duration: number;
    description: string;
  }>;
  style: {
    tone: string;
    pace: 'slow' | 'medium' | 'fast';
    formality: 'casual' | 'neutral' | 'formal';
  };
  examples: string[];
  recommended?: boolean;
  isCustom?: boolean;
  popularity?: number;
}

export interface UserPreferences {
  autoSave: boolean;
  autoSaveInterval: number;
  defaultVideoQuality: 'low' | 'medium' | 'high' | 'ultra';
  defaultOutputFormat: 'mp4' | 'mov' | 'webm';
  enablePreview: boolean;
  previewQuality: 'low' | 'medium' | 'high';
  notifications: boolean;
  soundEffects: boolean;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    timestamp: string;
  };
}

export interface TaskStatus {
  id: string;
  type: 'analysis' | 'script' | 'render' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type DramaWorkflowStep =
  | 'upload'
  | 'analyze'
  | 'template-select'
  | 'script-generate'
  | 'script-dedup'
  | 'script-edit'
  | 'timeline-edit'
  | 'preview'
  | 'export';

export interface VideoClip {
  id: string;
  startTime: number;
  endTime: number;
  sourceVideoId: string;
  sourceVideoPath: string;
  thumbnail?: string;
  transitions?: {
    in?: string;
    out?: string;
  };
  effects?: string[];
}

export interface StoryboardFrame {
  id: string;
  title: string;
  sceneDescription: string;
  composition: string;
  cameraType: string;
  dialogue: string;
  duration: number;
  imageUrl?: string;
}

// ========== Novel Types (from novel.types.ts) ==========

export enum EmotionType {
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  FEARFUL = 'fearful',
  SURPRISED = 'surprised',
  DISGUSTED = 'disgusted',
  NEUTRAL = 'neutral',
  EXCITED = 'excited',
  TENSE = 'tense',
  RELAXED = 'relaxed',
  ROMANTIC = 'romantic',
  MYSTERIOUS = 'mysterious',
  COMEDIC = 'comedic',
  DRAMATIC = 'dramatic',
  ACTION = 'action',
  CALM = 'calm',
}

export type ScriptFormat = 'screenplay' | 'comic' | 'manga' | 'animation' | 'novel';

export interface NovelMetadata {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  summary?: string;
  wordCount: number;
  chapterCount: number;
  tags?: string[];
  language?: string;
  source?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  content: string;
  order: number;
  wordCount: number;
  summary?: string;
  characters?: string[];
  locations?: string[];
  timePeriod?: string;
}

export interface NovelScene {
  id: string;
  chapterId: string;
  sceneNumber: number;
  title?: string;
  content: string;
  location?: string;
  time?: string;
  startPosition: number;
  endPosition: number;
  characters: string[];
  dialogues: Dialogue[];
  narrator?: string;
  emotions: SceneEmotion[];
  tags?: string[];
  imagePrompts?: string[];
}

export interface Dialogue {
  id: string;
  sceneId: string;
  character: string;
  content: string;
  emotion?: EmotionType;
  emotionIntensity?: number;
  position: number;
  isNarration?: boolean;
}

export interface Character {
  id: string;
  name: string;
  aliases?: string[];
  description?: string;
  appearance?: CharacterAppearance;
  personality?: string;
  background?: string;
  role: 'main' | 'supporting' | 'minor' | 'protagonist' | 'antagonist';
  importance?: number;
  firstAppearance?: {
    chapterId: string;
    chapterTitle: string;
    position: number;
  };
  dialogues?: string[];
  relationships?: CharacterRelationship[];
  clothing?: ClothingItem[];
  expressions?: CharacterExpression[];
  consistency?: CharacterConsistency;
  voice?: {
    provider: 'edge' | 'azure' | 'aliyun' | 'baidu' | 'cosyvoice';
    voiceId: string;
    pitch?: number;
    speed?: number;
  };
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  gender?: string;
  age?: string;
  hairStyle?: string;
  hairColor?: string;
  eyeColor?: string;
  skinTone?: string;
  bodyType?: string;
  height?: string;
  weight?: string;
  features?: string[];
}

export interface CharacterRelationship {
  targetCharacterId: string;
  type: 'family' | 'friend' | 'enemy' | 'romantic' | 'mentor' | 'rival' | 'colleague';
  description?: string;
}

export interface SceneEmotion {
  type: EmotionType;
  intensity: number;
  dominant: boolean;
  characters?: string[];
}

export interface AnalyzeConfig {
  maxChapters?: number;
  minChapterLength?: number;
  sceneMinLength?: number;
  detectCharacters?: boolean;
  detectEmotions?: boolean;
  generatePrompts?: boolean;
  provider?: string;
  model?: string;
}

export interface AnalyzeResult {
  metadata: NovelMetadata;
  chapters: Chapter[];
  scenes: NovelScene[];
  characters: Character[];
  statistics: NovelStatistics;
}

export interface NovelStatistics {
  totalWords: number;
  totalChapters: number;
  totalScenes: number;
  totalCharacters: number;
  mainCharacters: number;
  supportingCharacters: number;
  minorCharacters: number;
  dialogueCount: number;
  avgChapterLength: number;
  avgSceneLength: number;
  locationCount: number;
  timePeriods: string[];
  dominantEmotions: Record<EmotionType, number>;
  genre?: string;
}

export interface SceneDescription {
  sceneId: string;
  description: string;
  visualElements: VisualElement[];
  mood: string;
  colorPalette?: string[];
  lighting?: string;
  cameraAngle?: string;
  imagePrompt: string;
  negativePrompt?: string;
}

export interface VisualElement {
  type: 'character' | 'object' | 'background' | 'effect';
  name: string;
  description: string;
  position?: { x: number; y: number; z?: number };
  attributes?: Record<string, string>;
}

export interface ExportOptions {
  format: ScriptFormat;
  includeCharacters: boolean;
  includeDialogues: boolean;
  includeSceneDescriptions: boolean;
  includeImagePrompts: boolean;
  outputLanguage?: string;
}

export type ScriptSourceType = 'file' | 'manual';
export type ScriptFileFormat = 'txt' | 'md' | 'docx' | 'unknown';

export interface ScriptSource {
  sourceType: ScriptSourceType;
  filename: string;
  filePath?: string;
  fileFormat: ScriptFileFormat;
  fileSize: number;
  charCount: number;
  importedAt: string;
}

export interface ScriptChapter {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount: number;
  startIndex: number;
  endIndex: number;
  isAutoSplit: boolean;
}

export interface ScriptValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface ScriptValidationResult {
  valid: boolean;
  issues: ScriptValidationIssue[];
}

export interface StoryAnalysisCharacter {
  name: string;
  role: 'main' | 'supporting' | 'minor';
  traits: string[];
}

export interface StoryAnalysisChapter {
  title: string;
  summary: string;
  keyEvents: string[];
}

export interface StoryAnalysis {
  id: string;
  title: string;
  summary: string;
  genre?: string;
  characters: StoryAnalysisCharacter[];
  conflictPoints: string[];
  chapters: StoryAnalysisChapter[];
  createdAt: string;
  modelInfo?: {
    provider: string;
    model: string;
  };
}

// ========== Composition/Animation Types ==========

export interface CharacterAppearance {
  gender?: string;
  age?: string | number;
  hairStyle?: string;
  hairColor?: string;
  eyeColor?: string;
  skinTone?: string;
  bodyType?: string;
  height?: string | number;
  weight?: string | number;
  features?: string[];
}

export interface ClothingItem {
  type: 'head' | 'top' | 'bottom' | 'shoes' | 'accessory';
  name: string;
  style: string;
  color: string;
  pattern?: string;
  material?: string;
}

export interface CharacterExpression {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  intensity?: 'subtle' | 'neutral' | 'strong' | 'exaggerated';
}

export interface CharacterConsistency {
  seed?: number;
  weights?: {
    appearance: number;
    voice: number;
    behavior: number;
  };
  referenceImages?: string[];
}

export type CameraMotion = 
  | 'static'
  | 'pan-left' | 'pan-right'
  | 'tilt-up' | 'tilt-down'
  | 'dolly-in' | 'dolly-out'
  | 'zoom-in' | 'zoom-out'
  | 'shake' | 'sway'
  | 'follow';

export type TransitionEffect = 
  | 'none'
  | 'fade' | 'crossfade'
  | 'dissolve'
  | 'wipe-left' | 'wipe-right' | 'wipe-up' | 'wipe-down'
  | 'slide-left' | 'slide-right'
  | 'zoom'
  | 'blur';

export type AnimationProperty = 
  | 'position-x' 
  | 'position-y' 
  | 'scale' 
  | 'rotation' 
  | 'opacity' 
  | 'zoom' 
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'pan-x'
  | 'pan-y';

export interface AnimationKeyframe {
  time: number;
  property: AnimationProperty;
  value: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface AnimationTrack {
  property: 'position-x' | 'position-y' | 'scale' | 'rotation' | 'opacity';
  keyframes: AnimationKeyframe[];
}

export interface CameraMotionConfig {
  type: CameraMotion;
  duration: number;
  intensity: number;
  easing?: string;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
}

export interface TransitionConfig {
  effect: TransitionEffect;
  duration: number;
  easing?: string;
  color?: string;
}

export interface FrameAnimation {
  frameId: string;
  cameraMotion: CameraMotionConfig | null;
  keyframes?: AnimationKeyframe[];
  zoom?: number;
  pan?: { x: number; y: number };
  rotation?: number;
  opacity?: number;
  filters?: {
    blur?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
  };
}

export interface CompositionProject {
  id: string;
  projectId: string;
  frames: FrameAnimation[];
  transitions: TransitionConfig[];
  masterSettings: {
    frameDuration: number;
    defaultTransition: TransitionConfig;
    globalEffects?: string[];
  };
  previewState?: {
    currentFrameIndex: number;
    isPlaying: boolean;
    playbackSpeed: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ========== Legacy Types (for backward compatibility) ==========

export interface AppSettings {
  autoSave: boolean;
  defaultAIModel?: AIModelType;
  aiModelsSettings: Partial<Record<AIModelType, AIModelSettings>>;
  theme?: 'light' | 'dark' | 'system';
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec?: string;
  bitrate?: number;
}

export interface KeyMoment {
  time: number;
  description: string;
  type: 'action' | 'transition' | 'highlight';
  importance?: number;
  timestamp?: number;
}

export interface SceneInfo {
  startTime: number;
  endTime: number;
  description: string;
  keyFrame?: string;
}

export interface AudioInfo {
  hasAudio: boolean;
  language?: string;
  transcript?: string;
}

export interface Timeline {
  segments: TimelineSegment[];
  duration: number;
}

export interface TimelineSegment {
  id: string;
  startTime: number;
  endTime: number;
  type: 'video' | 'audio' | 'text';
  data: unknown;
}

export interface ScriptGenerationOptions {
  style?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  purpose?: string;
}
