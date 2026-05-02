/**
 * PanelFlow Novel Types
 * Extracted from src/shared/types/index.ts
 * Novel/script analysis and processing types
 */

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
