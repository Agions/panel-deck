/**
 * panel-flow Script Types
 * Extracted from src/shared/types/index.ts
 * Script and narrative content types
 */

// Video segment type (used by ScriptEditor and VideoEditor)
export interface VideoSegment {
  id: string;
  start: number;
  end: number;
  type: string;
  content?: string;
}

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
  scenes?: Array<{
    description?: string;
    startTime?: number;
    dialogues?: Array<{ character: string; text: string; duration?: number }>;
  }>;
}
