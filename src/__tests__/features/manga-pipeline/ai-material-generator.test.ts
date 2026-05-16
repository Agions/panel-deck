import { StoryboardScene } from '../../../features/manga-pipeline/steps/step2-storyboard/composer';
import { SceneDescription } from '../../../features/manga-pipeline/steps/step2-storyboard/description/scene-describer';
import {
  createAIGenerationPlan,
  AIGenerationPlan,
  BatchGenerationPlan,
} from '../../../features/manga-pipeline/steps/step3-material-matching/services/ai-material-generator';

const createMockScene = (overrides: Partial<StoryboardScene> = {}): StoryboardScene => ({
  sceneId: 'scene-001',
  sceneNumber: 1,
  description: {
    sceneId: 'scene-001',
    sceneNumber: 1,
    prompt: 'anime style, location: 城市街道, dark atmosphere',
    negativePrompt: 'realistic, photo, low quality',
    styleHint: '动漫风格',
    aspectRatio: '16:9',
    duration: 10,
  } as SceneDescription,
  status: 'pending',
  ...overrides,
});

describe('AIMaterialGenerator', () => {
  describe('createAIGenerationPlan', () => {
    it('should return empty plan for empty scenes array', () => {
      const result = createAIGenerationPlan([]);
      expect(result.totalScenes).toBe(0);
      expect(result.scenes).toHaveLength(0);
      expect(result.totalCost).toBe('low');
      expect(result.totalEstimatedTime).toBe(0);
    });

    it('should create plan for single scene', () => {
      const scenes = [createMockScene({ sceneId: 'scene-001', sceneNumber: 1 })];
      const result = createAIGenerationPlan(scenes);
      expect(result.totalScenes).toBe(1);
      expect(result.scenes).toHaveLength(1);
    });

    it('should set correct priority based on duration', () => {
      const shortScene = createMockScene({
        description: { ...createMockScene().description, duration: 5 } as SceneDescription,
      });
      const mediumScene = createMockScene({
        description: { ...createMockScene().description, duration: 12 } as SceneDescription,
      });
      const longScene = createMockScene({
        description: { ...createMockScene().description, duration: 20 } as SceneDescription,
      });

      const shortPlan = createAIGenerationPlan([shortScene]);
      const mediumPlan = createAIGenerationPlan([mediumScene]);
      const longPlan = createAIGenerationPlan([longScene]);

      expect(shortPlan.scenes[0].priority).toBe('low');
      expect(mediumPlan.scenes[0].priority).toBe('medium');
      expect(longPlan.scenes[0].priority).toBe('high');
    });

    it('should set correct cost based on duration', () => {
      const shortScene = createMockScene({
        description: { ...createMockScene().description, duration: 8 } as SceneDescription,
      });
      const mediumScene = createMockScene({
        description: { ...createMockScene().description, duration: 15 } as SceneDescription,
      });
      const longScene = createMockScene({
        description: { ...createMockScene().description, duration: 25 } as SceneDescription,
      });

      const shortPlan = createAIGenerationPlan([shortScene]);
      const mediumPlan = createAIGenerationPlan([mediumScene]);
      const longPlan = createAIGenerationPlan([longScene]);

      expect(shortPlan.scenes[0].cost).toBe('low');
      expect(mediumPlan.scenes[0].cost).toBe('medium');
      expect(longPlan.scenes[0].cost).toBe('high');
    });

    it('should select text2video model for action scenes', () => {
      const actionScene = createMockScene({
        description: {
          ...createMockScene().description,
          prompt: 'anime style, scene type: 动作, location: test',
        } as SceneDescription,
      });
      const plan = createAIGenerationPlan([actionScene]);
      expect(plan.scenes[0].model).toBe('text2video');
    });

    it('should select text2video model for chase scenes', () => {
      const chaseScene = createMockScene({
        description: {
          ...createMockScene().description,
          prompt: 'anime style, scene type: 追逐, location: test',
        } as SceneDescription,
      });
      const plan = createAIGenerationPlan([chaseScene]);
      expect(plan.scenes[0].model).toBe('text2video');
    });

    it('should select sdxl model for long scenes (>15s)', () => {
      const longScene = createMockScene({
        description: {
          ...createMockScene().description,
          duration: 20,
          prompt: 'anime style, scene type: 对话, location: test',
        } as SceneDescription,
      });
      const plan = createAIGenerationPlan([longScene]);
      expect(plan.scenes[0].model).toBe('sdxl');
    });

    it('should select pix2pix model for short scenes by default', () => {
      const shortScene = createMockScene({
        description: {
          ...createMockScene().description,
          duration: 10,
          prompt: 'anime style, scene type: 对话, location: test',
        } as SceneDescription,
      });
      const plan = createAIGenerationPlan([shortScene]);
      expect(plan.scenes[0].model).toBe('pix2pix');
    });

    it('should estimate generation time based on duration', () => {
      const scene = createMockScene({
        description: {
          ...createMockScene().description,
          duration: 10,
          prompt: 'anime style, scene type: 对话, location: test',
        } as SceneDescription,
      });
      const plan = createAIGenerationPlan([scene]);
      // Base time is duration * 2
      expect(plan.scenes[0].estimatedTime).toBe(20);
    });

    it('should apply 1.5x multiplier for action scenes', () => {
      const actionScene = createMockScene({
        description: {
          ...createMockScene().description,
          duration: 10,
          prompt: 'anime style, scene type: 动作, location: test',
        } as SceneDescription,
      });
      const plan = createAIGenerationPlan([actionScene]);
      // Base time is 10 * 2 = 20, then * 1.5 = 30
      expect(plan.scenes[0].estimatedTime).toBe(30);
    });

    it('should sort plans by priority (high first)', () => {
      const scenes = [
        createMockScene({
          sceneId: 'scene-low',
          description: { ...createMockScene().description, duration: 5 } as SceneDescription,
        }),
        createMockScene({
          sceneId: 'scene-high',
          description: { ...createMockScene().description, duration: 20 } as SceneDescription,
        }),
        createMockScene({
          sceneId: 'scene-medium',
          description: { ...createMockScene().description, duration: 12 } as SceneDescription,
        }),
      ];
      const plan = createAIGenerationPlan(scenes);
      expect(plan.scenes[0].sceneId).toBe('scene-high');
      expect(plan.scenes[1].sceneId).toBe('scene-medium');
      expect(plan.scenes[2].sceneId).toBe('scene-low');
    });

    it('should include sceneId, sceneNumber, prompt, negativePrompt in plan', () => {
      const scene = createMockScene({ sceneId: 'scene-xyz', sceneNumber: 5 });
      const plan = createAIGenerationPlan([scene]);
      const scenePlan = plan.scenes[0];
      expect(scenePlan.sceneId).toBe('scene-xyz');
      expect(scenePlan.sceneNumber).toBe(5);
      expect(scenePlan.prompt).toBeDefined();
      expect(scenePlan.negativePrompt).toBeDefined();
    });

    it('should calculate totalEstimatedTime correctly', () => {
      const scenes = [
        createMockScene({
          sceneId: 's1',
          description: {
            ...createMockScene().description,
            duration: 10,
            prompt: 'anime style, scene type: 对话',
          } as SceneDescription,
        }),
        createMockScene({
          sceneId: 's2',
          description: {
            ...createMockScene().description,
            duration: 15,
            prompt: 'anime style, scene type: 对话',
          } as SceneDescription,
        }),
      ];
      const plan = createAIGenerationPlan(scenes);
      // 10*2 + 15*2 = 20 + 30 = 50
      expect(plan.totalEstimatedTime).toBe(50);
    });

    it('should calculate totalCost based on distribution of scene costs', () => {
      const scenes = [
        createMockScene({
          sceneId: 's1',
          description: { ...createMockScene().description, duration: 25 } as SceneDescription,
        }),
        createMockScene({
          sceneId: 's2',
          description: { ...createMockScene().description, duration: 25 } as SceneDescription,
        }),
        createMockScene({
          sceneId: 's3',
          description: { ...createMockScene().description, duration: 5 } as SceneDescription,
        }),
      ];
      const plan = createAIGenerationPlan(scenes);
      // 2 out of 3 are high cost (>50%), so totalCost should be 'high'
      expect(plan.totalCost).toBe('high');
    });
  });
});
