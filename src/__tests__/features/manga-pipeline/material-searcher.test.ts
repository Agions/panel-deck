import {
  Storyboard,
  StoryboardScene,
} from '../../../features/manga-pipeline/steps/step2-storyboard/composer';
import { SceneDescription } from '../../../features/manga-pipeline/steps/step2-storyboard/description/scene-describer';
import {
  batchSearch,
  searchMaterial,
  MaterialMatch,
  MaterialItem,
  SearchQuery,
} from '../../../features/manga-pipeline/steps/step3-material-matching/services/material-searcher';

const createMockScene = (overrides: Partial<StoryboardScene> = {}): StoryboardScene => ({
  sceneId: 'scene-001',
  sceneNumber: 1,
  description: {
    sceneId: 'scene-001',
    sceneNumber: 1,
    prompt: 'anime style, location: 城市街道, time: 夜晚, scene type: 对话, dark atmosphere',
    negativePrompt: 'realistic, photo, low quality',
    styleHint: '动漫风格',
    aspectRatio: '16:9',
    duration: 10,
  } as SceneDescription,
  status: 'pending',
  ...overrides,
});

const createMockStoryboard = (scenes: StoryboardScene[] = []): Storyboard => ({
  scriptId: 'script-001',
  title: '测试故事板',
  totalDuration: 30,
  scenes: scenes.length > 0 ? scenes : [createMockScene()],
  characters: [],
  metadata: {
    generatedAt: Date.now(),
    style: 'anime',
  },
});

describe('MaterialSearcher', () => {
  describe('searchMaterial', () => {
    it('should return empty array when no keywords provided', async () => {
      const scene = createMockScene();
      const query: SearchQuery = {
        keywords: [],
        type: 'video',
      };
      const results = await searchMaterial(scene, query);
      expect(results).toEqual([]);
    });

    it('should accept valid search query', async () => {
      const scene = createMockScene();
      const query: SearchQuery = {
        keywords: ['城市街道', '夜晚'],
        type: 'video',
        duration: { min: 8, max: 12 },
        mood: 'tense',
      };
      const results = await searchMaterial(scene, query);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('batchSearch', () => {
    it('should process all scenes in storyboard', async () => {
      const scenes = [
        createMockScene({ sceneId: 'scene-001', sceneNumber: 1 }),
        createMockScene({ sceneId: 'scene-002', sceneNumber: 2 }),
        createMockScene({ sceneId: 'scene-003', sceneNumber: 3 }),
      ];
      const storyboard = createMockStoryboard(scenes);
      const results = await batchSearch(storyboard);
      expect(results).toHaveLength(3);
    });

    it('should return MaterialMatch with correct sceneId and sceneNumber', async () => {
      const scene = createMockScene({ sceneId: 'scene-xyz', sceneNumber: 5 });
      const storyboard = createMockStoryboard([scene]);
      const results = await batchSearch(storyboard);
      expect(results[0].sceneId).toBe('scene-xyz');
      expect(results[0].sceneNumber).toBe(5);
    });

    it('should return fallback ai_generate when no matches found', async () => {
      const storyboard = createMockStoryboard();
      const results = await batchSearch(storyboard);
      expect(results[0].fallback).toBe('ai_generate');
      expect(results[0].matches).toHaveLength(0);
      expect(results[0].confidence).toBe(0);
    });

    it('should respect maxResultsPerScene option', async () => {
      const storyboard = createMockStoryboard();
      const results = await batchSearch(storyboard, { maxResultsPerScene: 2 });
      expect(results).toHaveLength(1);
    });

    it('should handle storyboard with empty scenes', async () => {
      // Create a truly empty storyboard with no scenes
      const emptyStoryboard: Storyboard = {
        scriptId: 'script-001',
        title: '空故事板',
        totalDuration: 0,
        scenes: [],
        characters: [],
        metadata: { generatedAt: Date.now(), style: 'anime' },
      };
      const results = await batchSearch(emptyStoryboard);
      expect(results).toHaveLength(0);
    });
  });
});
