/**
 * PanelFlow Shared Types
 * Consolidated type definitions from src/types and src/core/types
 */

/**
 * Section Map (for domain split preparation)
 * =========================================
 * Group 1: AI Model Types     - extracted to ai.models.ts
 * Group 2: AI Core Types      - extracted to ai.core.ts
 * Group 3: Video Types        - extracted to video.ts
 * Group 4: Script Types       - extracted to script.ts
 * Group 5: Project Types      - extracted to project.ts
 * Group 6: Novel Types        - extracted to novel.ts
 * Group 7: Composition Types  - extracted to composition.ts
 * Group 8: Legacy Types       - extracted to legacy.ts
 */

// CSS Module type declarations are in src/types/cssmodule.d.ts

// ========== Barrel Exports ==========

export * from './video';
export * from './script';
export * from './project';
export type { AIModelType, AIModelInfo } from './ai.models';
export { AI_MODEL_INFO } from './ai.models';
export type { AIModelSettings } from './ai.core';
export * from './ai.core';
export * from './novel';
export * from './composition';
export * from './legacy';
