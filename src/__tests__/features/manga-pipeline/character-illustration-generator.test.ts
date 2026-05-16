import { CharacterCard } from '../../../features/manga-pipeline/steps/step1-script-generation/types/character';
import {
  generateCharacterIllustration,
  CharacterIllustration,
} from '../../../features/manga-pipeline/steps/step2-storyboard/description/char-illustrator';

const mockCharacter: CharacterCard = {
  id: 'char-001',
  name: '侦探小林',
  appearance: '黑色风衣，戴着礼帽，眼神锐利',
  personality: '冷静、谨慎、沉默',
  speakingStyle: '正式',
  voiceSuggestion: '低沉有力',
  relationships: [{ name: '神秘女子', type: '调查对象' }],
  firstAppearance: 'scene-001',
};

describe('char-illustrator', () => {
  describe('generateCharacterIllustration', () => {
    it('应包含 characterId 和 name', () => {
      const result = generateCharacterIllustration(mockCharacter);
      expect(result.characterId).toBe('char-001');
      expect(result.name).toBe('侦探小林');
    });

    it('应生成 AI 绘图 prompt', () => {
      const result = generateCharacterIllustration(mockCharacter);
      expect(result.prompt).toBeTruthy();
      expect(result.prompt.length).toBeGreaterThan(10);
    });

    it('应生成反向 prompt', () => {
      const result = generateCharacterIllustration(mockCharacter);
      expect(result.negativePrompt).toBeTruthy();
      expect(result.negativePrompt).toContain('realistic');
    });

    it('应包含 pose 和 expression', () => {
      const result = generateCharacterIllustration(mockCharacter);
      expect(result.pose).toBeTruthy();
      expect(result.expression).toBeTruthy();
    });

    it('应包含 outfit', () => {
      const result = generateCharacterIllustration(mockCharacter);
      expect(result.outfit).toBeTruthy();
    });

    it('动漫风格 prompt 应包含 anime style', () => {
      const result = generateCharacterIllustration(mockCharacter, 'anime');
      expect(result.prompt).toContain('anime style');
    });

    it('非动漫风格 prompt 应包含 digital art style', () => {
      const result = generateCharacterIllustration(mockCharacter, 'comic');
      expect(result.prompt).toContain('digital art style');
    });

    it('prompt 应包含角色名字', () => {
      const result = generateCharacterIllustration(mockCharacter);
      expect(result.prompt).toContain('侦探小林');
    });

    it('prompt 应包含外貌描述', () => {
      const result = generateCharacterIllustration(mockCharacter);
      expect(result.prompt).toContain('黑色风衣');
    });

    // 性格 → 姿态/表情测试
    describe('性格映射', () => {
      it('开朗性格应生成动态姿态和明亮表情', () => {
        const cheerfulChar: CharacterCard = {
          ...mockCharacter,
          personality: '开朗、活泼',
          speakingStyle: '普通',
        };
        const result = generateCharacterIllustration(cheerfulChar);
        expect(result.pose).toContain('dynamic');
        expect(result.expression).toContain('bright smile');
      });

      it('内向性格应生成保守姿态和内敛表情', () => {
        const introvertedChar: CharacterCard = {
          ...mockCharacter,
          personality: '内向、沉默',
          speakingStyle: '普通',
        };
        const result = generateCharacterIllustration(introvertedChar);
        expect(result.pose).toContain('guarded');
        expect(result.expression).toContain('reserved');
      });

      it('急躁性格应生成紧张姿态和坚定表情', () => {
        const impatientChar: CharacterCard = {
          ...mockCharacter,
          personality: '急躁、暴躁',
          speakingStyle: '普通',
        };
        const result = generateCharacterIllustration(impatientChar);
        expect(result.pose).toContain('tense');
        expect(result.expression).toContain('intense');
      });

      it('谨慎性格应生成稳健姿态和沉静表情', () => {
        const cautiousChar: CharacterCard = {
          ...mockCharacter,
          personality: '谨慎、冷静',
          speakingStyle: '普通',
        };
        const result = generateCharacterIllustration(cautiousChar);
        expect(result.pose).toContain('steady');
        expect(result.expression).toContain('serene');
      });

      it('默认性格应生成自然姿态', () => {
        const normalChar: CharacterCard = {
          ...mockCharacter,
          personality: '普通',
          speakingStyle: '普通',
        };
        const result = generateCharacterIllustration(normalChar);
        expect(result.pose).toContain('natural');
        expect(result.expression).toContain('neutral');
      });
    });

    describe('说话风格映射', () => {
      it('口语化风格应添加休闲姿态', () => {
        const casualChar: CharacterCard = { ...mockCharacter, speakingStyle: '口语化' };
        const result = generateCharacterIllustration(casualChar);
        expect(result.prompt).toContain('casual pose');
      });

      it('正式风格应添加正式姿态', () => {
        const formalChar: CharacterCard = { ...mockCharacter, speakingStyle: '正式' };
        const result = generateCharacterIllustration(formalChar);
        expect(result.prompt).toContain('formal pose');
      });
    });

    describe('默认外观处理', () => {
      it('默认外观不应重复添加到 prompt', () => {
        const defaultChar: CharacterCard = { ...mockCharacter, appearance: '普通外貌，着装简洁' };
        const result = generateCharacterIllustration(defaultChar);
        // 默认外观不应被添加到 prompt
        expect(result.prompt).not.toContain('普通外貌');
      });
    });
  });
});
