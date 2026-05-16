import { Script } from '../../../features/manga-pipeline/steps/step1-script-generation/types/script';
import {
  composeStoryboard,
  Storyboard,
  StoryboardScene,
  StoryboardOptions,
} from '../../../features/manga-pipeline/steps/step2-storyboard/composer';

const mockScript: Script = {
  id: 'script-001',
  title: '雨夜侦探',
  sourceText: '侦探小林在雨夜中拦住了一个神秘女子...',
  estimatedDuration: 5,
  scenes: [
    {
      id: 'scene-001',
      sceneNumber: 1,
      location: '城市街道',
      timeOfDay: '夜晚',
      weather: '下雨',
      characters: ['侦探小林', '神秘女子'],
      type: '对话',
      cameraHint: '中景',
      transition: '切换',
      emotion: 'tense',
      content: '侦探小林在雨中拦住了一个撑着黑伞的神秘女子。',
    },
    {
      id: 'scene-002',
      sceneNumber: 2,
      location: '废弃仓库',
      timeOfDay: '夜晚',
      weather: '阴天',
      characters: ['侦探小林'],
      type: '动作',
      cameraHint: '全景',
      transition: '淡入',
      emotion: 'neutral',
      content: '小林悄悄潜入废弃仓库进行调查。',
    },
  ],
  characters: [
    {
      id: 'char-001',
      name: '侦探小林',
      appearance: '黑色风衣，礼帽，锐利眼神',
      personality: '冷静、谨慎',
      speakingStyle: '正式',
      voiceSuggestion: '低沉有力',
      relationships: [],
      firstAppearance: 'scene-001',
    },
    {
      id: 'char-002',
      name: '神秘女子',
      appearance: '白色连衣裙，长发披肩',
      personality: '神秘',
      speakingStyle: '口语化',
      voiceSuggestion: '轻柔飘渺',
      relationships: [],
      firstAppearance: 'scene-001',
    },
  ],
  metadata: {
    generatedAt: Date.now(),
    model: 'gpt-4',
    version: '1.0',
  },
};

describe('composer', () => {
  describe('composeStoryboard', () => {
    it('应返回包含 scriptId 和 title 的 storyboard', () => {
      const result = composeStoryboard(mockScript);
      expect(result.scriptId).toBe('script-001');
      expect(result.title).toBe('雨夜侦探');
    });

    it('应包含 scenes 数组', () => {
      const result = composeStoryboard(mockScript);
      expect(Array.isArray(result.scenes)).toBe(true);
      expect(result.scenes.length).toBe(2);
    });

    it('每个 scene 应有 sceneId, sceneNumber, description, status', () => {
      const result = composeStoryboard(mockScript);
      result.scenes.forEach((scene) => {
        expect(scene.sceneId).toBeTruthy();
        expect(scene.sceneNumber).toBeTruthy();
        expect(scene.description).toBeTruthy();
        expect(scene.status).toBe('pending');
      });
    });

    it('应包含 characters 数组（默认生成）', () => {
      const result = composeStoryboard(mockScript);
      expect(Array.isArray(result.characters)).toBe(true);
      expect(result.characters.length).toBe(2);
    });

    it('characters 每个元素应有 prompt, negativePrompt, pose, expression', () => {
      const result = composeStoryboard(mockScript);
      result.characters.forEach((char) => {
        expect(char.characterId).toBeTruthy();
        expect(char.name).toBeTruthy();
        expect(char.prompt).toBeTruthy();
        expect(char.negativePrompt).toBeTruthy();
        expect(char.pose).toBeTruthy();
        expect(char.expression).toBeTruthy();
        expect(char.outfit).toBeTruthy();
      });
    });

    it('应计算 totalDuration', () => {
      const result = composeStoryboard(mockScript);
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    it('应包含 metadata', () => {
      const result = composeStoryboard(mockScript);
      expect(result.metadata).toBeTruthy();
      expect(result.metadata.generatedAt).toBeTruthy();
      expect(result.metadata.style).toBeTruthy();
    });

    it('默认风格应为 anime', () => {
      const result = composeStoryboard(mockScript);
      expect(result.metadata.style).toBe('anime');
    });

    describe('options', () => {
      it('style 选项应影响场景和角色的风格', () => {
        const result = composeStoryboard(mockScript, { style: 'comic' });
        expect(result.metadata.style).toBe('comic');
        result.scenes.forEach((scene) => {
          expect(scene.description.styleHint).toBe('漫画风格');
        });
      });

      it('includeCharacters=false 时不生成角色立绘', () => {
        const result = composeStoryboard(mockScript, { includeCharacters: false });
        expect(result.characters.length).toBe(0);
      });

      it('aspectRatio 选项应传递给场景', () => {
        const result = composeStoryboard(mockScript, { aspectRatio: '9:16' });
        result.scenes.forEach((scene) => {
          expect(scene.description.aspectRatio).toBe('9:16');
        });
      });
    });

    describe('scene status', () => {
      it('所有场景初始 status 应为 pending', () => {
        const result = composeStoryboard(mockScript);
        result.scenes.forEach((scene) => {
          expect(scene.status).toBe('pending');
        });
      });
    });

    describe('imageUrl', () => {
      it('imageUrl 初始应为 undefined', () => {
        const result = composeStoryboard(mockScript);
        result.scenes.forEach((scene) => {
          expect(scene.imageUrl).toBeUndefined();
        });
      });
    });

    describe('totalDuration 计算', () => {
      it('totalDuration 应为所有场景时长之和', () => {
        const result = composeStoryboard(mockScript);
        const sum = result.scenes.reduce((acc, s) => acc + s.description.duration, 0);
        expect(result.totalDuration).toBe(sum);
      });
    });
  });
});
