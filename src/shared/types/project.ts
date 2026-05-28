/**
 * Project Types
 * Extracted from src/shared/types/index.ts
 */

import type { Script } from './script';
import type { StoryboardFrame } from '@/features/storyboard/components/StoryboardEditor';
import type { Character } from './novel';
import type { CompositionProject } from './composition';
import type { AudioTrackConfig } from '@/features/audio/components/AudioEditor';
import type { EvaluationScores } from '@/core/services';

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status?: 'draft' | 'processing' | 'completed' | 'failed';
  content?: string;
  videos?: { id: string; path?: string; name: string; duration?: number; width?: number; height?: number; fps?: number; format?: string; size?: number; thumbnail?: string; createdAt?: string }[];
  scripts?: Script[];
  settings?: ProjectSettings;
  createdAt: string;
  updatedAt: string;
  metadata?: unknown;
  keyFrames?: string[];
  coverImage?: string;
  videoPath?: string;
  thumbnail?: string;
  novelMetadata?: unknown;
  storyboardComments?: unknown[];
  storyboardVersions?: unknown[];
  // Extended properties used by ProjectDetailPage
  storyboardFrames?: StoryboardFrame[];
  characters?: Character[];
  composition?: CompositionProject;
  audioConfig?: AudioTrackConfig;
  evaluationSummary?: EvaluationScores;
  evaluationReport?: { summary?: EvaluationScores };
  // Pipeline progress tracking
  currentStep?: PipelineStep;
}

export interface ProjectSettings {
  videoQuality?: 'low' | 'medium' | 'high';
  outputFormat?: 'mp4' | 'webm' | 'gif';
  resolution?: '480p' | '720p' | '1080p' | '4k';
  frameRate?: number;
  audioCodec?: string;
  videoCodec?: string;
  subtitleEnabled?: boolean;
  subtitleStyle?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    outline?: boolean;
    outlineColor?: string;
    position?: 'top' | 'bottom' | 'center';
    alignment?: 'left' | 'center' | 'right';
  };
}

// Pipeline step tracking
export type PipelineStep = 'import' | 'analysis' | 'script' | 'character' | 'storyboard' | 'render' | 'video_editing' | 'export';
