import { ScriptScene } from '../../../features/manga-pipeline/steps/step1-script-generation/types/script';
import {
  generateSceneDescription,
  SceneDescription,
  STYLE_PRESETS,
  StylePreset,
} from '../../../features/manga-pipeline/steps/step2-storyboard/description/scene-describer';

const mockScene: ScriptScene = {
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
  content: '侦探小林在雨中拦住了一个撑着黑伞的神秘女子，她似乎在等待什么人。',
};

describe('scene-describer', () => {
  describe('generateSceneDescription', () => {
    it('应生成包含 sceneId 和 sceneNumber 的描述', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.sceneId).toBe('scene-001');
      expect(result.sceneNumber).toBe(1);
    });

    it('应包含 AI 绘图 prompt', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.prompt).toBeTruthy();
      expect(result.prompt.length).toBeGreaterThan(10);
    });

    it('应包含反向 prompt', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.negativePrompt).toBeTruthy();
    });

    it('应包含风格标签', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.styleHint).toBeTruthy();
    });

    it('应包含时长估算', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('应包含宽高比', () => {
      const result = generateSceneDescription(mockScene);
      expect(['16:9', '9:16', '4:3', '1:1']).toContain(result.aspectRatio);
    });

    it('默认风格应为默认预设', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.styleHint).toBe('默认风格');
      expect(result.aspectRatio).toBe('16:9');
    });

    it('动漫风格应为 anime 预设', () => {
      const result = generateSceneDescription(mockScene, 'anime');
      expect(result.styleHint).toBe('动漫风格');
      expect(result.aspectRatio).toBe('16:9');
    });

    it('漫画风格应为 comic 预设', () => {
      const result = generateSceneDescription(mockScene, 'comic');
      expect(result.styleHint).toBe('漫画风格');
      expect(result.aspectRatio).toBe('16:9');
    });

    it('素描风格应为 sketch 预设', () => {
      const result = generateSceneDescription(mockScene, 'sketch');
      expect(result.styleHint).toBe('素描风格');
      expect(result.aspectRatio).toBe('4:3');
    });

    it('prompt 应包含场景地点', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.prompt).toContain('城市街道');
    });

    it('prompt 应包含时间', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.prompt).toContain('夜晚');
    });

    it('prompt 应包含天气', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.prompt).toContain('下雨');
    });

    it('prompt 应包含人物', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.prompt).toContain('侦探小林');
      expect(result.prompt).toContain('神秘女子');
    });

    it('无天气时 prompt 不应包含 weather', () => {
      const noWeatherScene: ScriptScene = { ...mockScene, weather: undefined };
      const result = generateSceneDescription(noWeatherScene);
      expect(result.prompt).not.toContain('weather:');
    });

    it('无地点时 prompt 不应包含 location', () => {
      const noLocationScene: ScriptScene = { ...mockScene, location: '' };
      const result = generateSceneDescription(noLocationScene);
      expect(result.prompt).not.toContain('location:');
    });

    it('时长估算：对话场景基础为 8 秒', () => {
      const result = generateSceneDescription(mockScene);
      expect(result.duration).toBeGreaterThanOrEqual(8);
    });

    it('时长估算：动作场景应更长', () => {
      const actionScene: ScriptScene = { ...mockScene, type: '动作' };
      const result = generateSceneDescription(actionScene);
      expect(result.duration).toBeGreaterThanOrEqual(12);
    });

    it('时长估算：追逐场景应更长', () => {
      const chaseScene: ScriptScene = { ...mockScene, type: '追逐' };
      const result = generateSceneDescription(chaseScene);
      expect(result.duration).toBeGreaterThanOrEqual(15);
    });

    it('时长估算：独白场景应更短', () => {
      const monologueScene: ScriptScene = { ...mockScene, type: '独白' };
      const result = generateSceneDescription(monologueScene);
      expect(result.duration).toBeGreaterThanOrEqual(6);
    });

    it('时长估算：内容越长，时长越长', () => {
      const shortScene: ScriptScene = { ...mockScene, content: '短' };
      const longScene: ScriptScene = { ...mockScene, content: 'A'.repeat(500) };
      const shortResult = generateSceneDescription(shortScene);
      const longResult = generateSceneDescription(longScene);
      expect(longResult.duration).toBeGreaterThan(shortResult.duration);
    });

    it('内容超长时时长增幅不超过 5 秒', () => {
      const veryLongScene: ScriptScene = { ...mockScene, content: 'A'.repeat(10000) };
      const result = generateSceneDescription(veryLongScene);
      // 基础 8 + 最多 5 = 13
      expect(result.duration).toBeLessThanOrEqual(14);
    });

    it('未知风格回退到默认预设', () => {
      const result = generateSceneDescription(mockScene, 'unknown-style');
      expect(result.styleHint).toBe('默认风格');
    });
  });

  describe('STYLE_PRESETS', () => {
    it('应包含 anime, comic, sketch, default 四种预设', () => {
      expect(STYLE_PRESETS).toHaveProperty('anime');
      expect(STYLE_PRESETS).toHaveProperty('comic');
      expect(STYLE_PRESETS).toHaveProperty('sketch');
      expect(STYLE_PRESETS).toHaveProperty('default');
    });

    it('anime 预设应有正确的属性', () => {
      const preset: StylePreset = STYLE_PRESETS.anime;
      expect(preset.name).toBe('动漫风格');
      expect(preset.promptPrefix).toContain('anime style');
      expect(preset.negativePrompt).toContain('realistic');
      expect(preset.aspectRatio).toBe('16:9');
    });

    it('sketch 预设应为黑白', () => {
      const preset: StylePreset = STYLE_PRESETS.sketch;
      expect(preset.promptPrefix).toContain('black and white');
      expect(preset.negativePrompt).toContain('color');
      expect(preset.aspectRatio).toBe('4:3');
    });
  });
});
