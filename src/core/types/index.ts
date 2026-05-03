/**
 * @core/types - Backward compatibility re-export from shared/types
 * @deprecated Use @shared/types instead
 */
export * from '@/shared/types';

// Re-export local types (not yet migrated to shared/types)
// Use named exports to avoid conflict with AI types already in shared/types
export type { ProjectData, ProjectSettings, VideoInfo } from './ai-model.types';
export type { StoryboardFrame } from '../../features/storyboard/components/StoryboardEditor';

// Legacy type alias
export type { Script as ScriptData } from '@/shared/types';

// ========== Additional types used by hooks/stores (not in shared/types yet) ==========

export type TaskStatus = {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
};

// Missing type exports
export interface ExportSettings {
  [key: string]: unknown;
}

export interface UserPreferences {
  [key: string]: unknown;
}

export interface ExportRecord {
  [key: string]: unknown;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description?: string;
  content?: string;
}
