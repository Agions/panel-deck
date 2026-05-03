import { CharacterGraph } from '../analyzer/character-graph';
import { StoryEvent } from '../parser/event-extractor';
import { CharacterCard } from '../types/character';

export interface GenerateCharacterCardsOptions {
  model?: string;  // 'deepseek' | 'qwen' - 默认 deepseek
}

/**
 * 从文本、人物关系图、事件中生成角色卡
 */
export function generateCharacterCards(
  text: string,
  graph: CharacterGraph,
  events: StoryEvent[],
  options: GenerateCharacterCardsOptions = {}
): CharacterCard[] {
  const _model = options.model ?? 'deepseek';
  const cards: CharacterCard[] = [];

  graph.characters.forEach((charName, index) => {
    const charInfo = graph.characterInfo[charName];
    const charEvents = events.filter(e => e.involvedCharacters.includes(charName));

    // 提取外貌描述（从动作描写中推断）
    charEvents.filter(e =>
      /[外貌|长相|穿着|打扮]/i.test(e.description)
    );

    // 提取性格（从情感事件推断）
    const emotionalTones = charEvents.map(e => e.emotionalTone);
    const personality = inferPersonality(emotionalTones);

    // 提取说话风格（从对话中的口头禅/语气推断）
    const speakingStyle = inferSpeakingStyle(charName, events);

    // 推断音色建议
    const voiceSuggestion = inferVoiceSuggestion(personality, emotionalTones);

    // 获取关系
    const relationships = graph.relations
      .filter(r => r.from === charName || r.to === charName)
      .map(r => ({
        name: r.from === charName ? r.to : r.from,
        type: r.type,
      }));

    // 获取首次出现场景
    const firstScene = charInfo?.firstScene ||
      charEvents[0]?.sceneLocation ||
      events[0]?.sceneLocation ||
      '未知场景';

    cards.push({
      id: `char_${index + 1}`,
      name: charName,
      appearance: generateAppearanceDescription(charName, charEvents),
      personality,
      speakingStyle,
      voiceSuggestion,
      relationships,
      firstAppearance: firstScene,
      assetReferences: [],
    });
  });

  return cards;
}

function inferPersonality(emotionalTones: StoryEvent['emotionalTone'][]): string {
  const counts: Record<string, number> = {};
  emotionalTones.forEach(t => {
    counts[t] = (counts[t] || 0) + 1;
  });

  const traits: string[] = [];
  if (counts['happy'] > 2) traits.push('开朗');
  if (counts['sad'] > 2) traits.push('内向');
  if (counts['angry'] > 2) traits.push('急躁');
  if (counts['tense'] > 2) traits.push('谨慎');
  if (counts['surprising'] > 1) traits.push('好奇');
  if (traits.length === 0) traits.push('中性');

  return traits.join('、');
}

function inferSpeakingStyle(charName: string, events: StoryEvent[]): string {
  // 从对话中提取说话特征
  const dialogueEvents = events.filter(e =>
    e.description.includes(charName + '：') ||
    e.description.includes(charName + '说')
  );

  const patterns: string[] = [];

  // 检查常见语气词
  const hasCasual = dialogueEvents.some(e =>
    /[呗|呀|嘛|哈|啦]/.test(e.description)
  );
  if (hasCasual) patterns.push('口语化');

  const hasFormal = dialogueEvents.some(e =>
    /[请，您|此|该]/.test(e.description)
  );
  if (hasFormal) patterns.push('正式');

  // 检查句式特征
  const hasQuestion = dialogueEvents.some(e => /[？?]$/.test(e.description));
  const hasExclamation = dialogueEvents.some(e => /[！!]$/.test(e.description));

  if (hasQuestion && !hasExclamation) patterns.push('疑问多');
  if (hasExclamation && !hasQuestion) patterns.push('感叹多');
  if (hasQuestion && hasExclamation) patterns.push('语气丰富');

  if (patterns.length === 0) patterns.push('平稳');

  return patterns.join('、');
}

function inferVoiceSuggestion(personality: string, emotionalTones: StoryEvent['emotionalTone'][]): string {
  const hasAngry = emotionalTones.includes('angry');
  const hasHappy = emotionalTones.includes('happy');
  const hasSad = emotionalTones.includes('sad');

  if (personality.includes('急躁') || hasAngry) {
    return '成熟男声（略带沙哑，低沉有力）';
  }
  if (personality.includes('开朗') || hasHappy) {
    return '年轻女声（明亮活泼，语速稍快）';
  }
  if (personality.includes('内向') || hasSad) {
    return '温柔女声（轻柔细腻，语速缓慢）';
  }
  return '标准男声（中性语调，语速适中）';
}

function generateAppearanceDescription(charName: string, events: StoryEvent[]): string {
  // 从事件中提取外貌特征
  const appearanceEvents = events.filter(e =>
    /[高|矮|胖|瘦|长|短|头发|眼睛|穿戴|衣服|帽子]/i.test(e.description)
  );

  if (appearanceEvents.length > 0) {
    // 取第一个有外貌描述的事件
    const match = appearanceEvents[0].description.match(/[^。！.]{5,30}/);
    if (match) return match[0];
  }

  // 默认描述
  return '普通外貌，着装简洁';
}