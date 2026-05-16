import {
  Storyboard,
  StoryboardScene,
} from '../../../features/manga-pipeline/steps/step2-storyboard/composer';
import { SceneDescription } from '../../../features/manga-pipeline/steps/step2-storyboard/description/scene-describer';
import {
  MaterialMatchingPipeline,
  MaterialMatchingResult,
} from '../../../features/manga-pipeline/steps/step3-material-matching/pipeline-controller';

const createMockScene = (overrides: Partial<StoryboardScene> = {}): StoryboardScene => ({
  sceneId: 'scene-001',
  sceneNumber: 1,
  description: {
    sceneId: 'scene-001',
    sceneNumber: 1,
    prompt: 'anime style, location: 城市街道, scene type: 对话, dark atmosphere',
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

describe('MaterialMatchingPipeline', () => {
  let pipeline: MaterialMatchingPipeline;

  beforeEach(() => {
    pipeline = new MaterialMatchingPipeline();
  });

  describe('constructor', () => {
    it('should have correct id', () => {
      expect(pipeline.id).toBe('material-matching');
    });

    it('should have correct name', () => {
      expect(pipeline.name).toBe('Material Matching');
    });
  });

  describe('process', () => {
    it('should process storyboard and return MaterialMatchingResult', async () => {
      const storyboard = createMockStoryboard();
      const result = (await pipeline.process({ storyboard })) as any;
      expect(result.materialMatching).toBeDefined();
    });

    it('should return matches array', async () => {
      const storyboard = createMockStoryboard();
      const result = (await pipeline.process({ storyboard })) as any;
      expect(Array.isArray(result.materialMatching.matches)).toBe(true);
    });

    it('should return groups array', async () => {
      const storyboard = createMockStoryboard();
      const result = (await pipeline.process({ storyboard })) as any;
      expect(Array.isArray(result.materialMatching.groups)).toBe(true);
    });

    it('should return coverage between 0 and 1', async () => {
      const storyboard = createMockStoryboard();
      const result = (await pipeline.process({ storyboard })) as any;
      expect(result.materialMatching.coverage).toBeGreaterThanOrEqual(0);
      expect(result.materialMatching.coverage).toBeLessThanOrEqual(1);
    });

    it('should generate aiGenerationPlan when no materials found', async () => {
      const storyboard = createMockStoryboard();
      const result = (await pipeline.process({ storyboard })) as any;
      expect(result.materialMatching.aiGenerationPlan).toBeDefined();
      expect(result.materialMatching.aiGenerationPlan.totalScenes).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple scenes', async () => {
      const scenes = [
        createMockScene({ sceneId: 'scene-001', sceneNumber: 1 }),
        createMockScene({ sceneId: 'scene-002', sceneNumber: 2 }),
        createMockScene({ sceneId: 'scene-003', sceneNumber: 3 }),
      ];
      const storyboard = createMockStoryboard(scenes);
      const result = (await pipeline.process({ storyboard })) as any;
      expect(result.materialMatching.matches).toHaveLength(3);
    });

    it('should preserve storyboard in result', async () => {
      const storyboard = createMockStoryboard();
      const result = (await pipeline.process({ storyboard })) as any;
      expect(result.materialMatching.storyboard).toBe(storyboard);
    });
  });

  describe('checkpoint', () => {
    it('should return null by default', () => {
      expect(pipeline.getCheckpoint()).toBeNull();
    });

    it('should be restorable', () => {
      const state = {
        stepId: 'material-matching',
        completed: true,
        data: {},
        timestamp: Date.now(),
      };
      pipeline.restore(state);
      // restore should not throw
      expect(pipeline.getCheckpoint()).toBeDefined();
    });
  });
});
