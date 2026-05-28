/**
 * 小说分析服务
 * 提供小说内容解析、场景分割、角色提取、情感分析等功能
 */

import { emotionDetector } from '@/core/domains/novel/services/emotion-detector.service';
import { logger } from '@/core/utils/logger';
import {
  EmotionType,
  type NovelMetadata,
  type Chapter,
  type NovelScene,
  type Character,
  type AnalyzeConfig,
  type AnalyzeResult,
  type NovelStatistics,
  type SceneDescription,
} from '@/shared/types';

import { aiService } from './ai.service';
import {
  extractCharacterNames,
  extractLocations,
  extractTimePeriod,
  generateDefaultPrompt,
  DIALOGUE_PATTERNS,
  CHAPTER_PATTERNS,
  ruleBasedSegmentation,
} from './novel-helpers';

/**
 * 并发控制辅助函数
 * 使用 Promise.allSettled 并发执行任务，支持限制并发数
 */
async function concurrentLimit<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T, index: number) => Promise<R>
): Promise<{ results: R[]; errors: Array<{ item: T; error: unknown; index: number }> }> {
  const results: R[] = new Array(items.length);
  const errors: Array<{ item: T; error: unknown; index: number }> = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchPromises = batch.map((item, batchIndex) => {
      const globalIndex = i + batchIndex;
      return processor(item, globalIndex)
        .then((result) => ({
          success: true as const,
          result,
          index: globalIndex,
          item: undefined as unknown as T,
        }))
        .catch((error) => ({ success: false as const, error, item, index: globalIndex }));
    });

    const batchResults = await Promise.all(batchPromises);

    for (const batchResult of batchResults) {
      if ('error' in batchResult && batchResult.success === false) {
        errors.push({ item: batchResult.item, error: batchResult.error, index: batchResult.index });
      } else if ('result' in batchResult) {
        results[batchResult.index] = batchResult.result;
      }
    }
  }

  return { results, errors };
}

/**
 * 小说分析器
 * 用于解析小说内容并生成结构化数据
 */
class NovelAnalyzer {
  private config: Required<AnalyzeConfig>;

  constructor(config: AnalyzeConfig = {}) {
    this.config = {
      maxChapters: config.maxChapters ?? 50,
      minChapterLength: config.minChapterLength ?? 100,
      sceneMinLength: config.sceneMinLength ?? 200,
      detectCharacters: config.detectCharacters ?? true,
      detectEmotions: config.detectEmotions ?? true,
      generatePrompts: config.generatePrompts ?? true,
      provider: config.provider ?? 'alibaba',
      model: config.model ?? 'qwen-3.5',
    };
  }

  /**
   * 解析小说内容
   * 将原始文本解析为结构化的小说数据
   */
  async parseNovelContent(content: string): Promise<AnalyzeResult> {
    const novelId = `novel_${Date.now()}`;

    // 1. 提取元数据
    const metadata = await this.extractMetadata(content, novelId);

    // 2. 分割章节
    const chapters = await this.segmentChapters(content, novelId, metadata.chapterCount);

    // 3. 分割场景
    const scenes = await this.segmentScenes(chapters);

    // 4. 提取角色
    const characters = await this.extractCharacters(content, scenes);

    // 5. 提取对话
    await this.extractDialogues(scenes, characters);

    // 6. 情感分析
    if (this.config.detectEmotions) {
      emotionDetector.detectEmotions(scenes);
    }

    // 7. 生成图像提示词
    if (this.config.generatePrompts) {
      await this.generateSceneDescriptions(scenes);
    }

    // 8. 计算统计信息
    const statistics = this.calculateStatistics(metadata, chapters, scenes, characters);

    return {
      metadata,
      chapters,
      scenes,
      characters,
      statistics,
    };
  }

  /**
   * 提取小说元数据
   */
  private async extractMetadata(content: string, novelId: string): Promise<NovelMetadata> {
    const prompt = `
请分析以下小说内容，提取元数据信息。

小说内容（前2000字）：
${content.slice(0, 2000)}

请以 JSON 格式返回以下信息：
{
  "title": "小说标题",
  "author": "作者（可选）",
  "genre": "题材类型",
  "summary": "故事概要（100字以内）",
  "wordCount": 总字数,
  "chapterCount": 预估章节数,
  "tags": ["标签1", "标签2"],
  "language": "语言"
}

注意：wordCount 是全文总字数，不是摘要字数。
`;

    try {
      const response = await aiService.generate(prompt, {
        provider: this.config.provider,
        model: this.config.model,
      });

      const data = JSON.parse(response);

      // Validate required fields
      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid AI response format');
      }

      return {
        id: novelId,
        title: (data as Partial<NovelMetadata>).title ?? '未命名小说',
        author: data.author,
        genre: data.genre,
        summary: data.summary,
        wordCount: data.wordCount ?? content.length,
        chapterCount: data.chapterCount ?? 1,
        tags: data.tags ?? [],
        language: data.language ?? 'zh',
        createdAt: new Date().toISOString(),
      };
    } catch {
      // 如果 AI 解析失败，返回默认值
      return {
        id: novelId,
        title: '未命名小说',
        wordCount: content.length,
        chapterCount: 1,
        createdAt: new Date().toISOString(),
      };
    }
  }

  /**
   * 分割章节
   */
  private async segmentChapters(
    content: string,
    novelId: string,
    estimatedChapterCount: number
  ): Promise<Chapter[]> {
    // 使用 CHAPTER_PATTERNS 检测章节标题
    const chapters: Chapter[] = [];
    let currentPosition = 0;

    // 尝试匹配章节标题
    for (const pattern of CHAPTER_PATTERNS) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        for (let i = 0; i < matches.length && i < this.config.maxChapters; i++) {
          const match = matches[i];
          const start = match.index;
          const title = match[1]?.trim() ?? match[0].trim();

          if (start !== undefined && start > currentPosition) {
            const chapterContent = content.slice(currentPosition, start).trim();
            if (chapterContent.length >= this.config.minChapterLength) {
              chapters.push({
                id: `chapter_${novelId}_${i}`,
                novelId,
                title: title ?? `第${i + 1}章`,
                content: chapterContent,
                order: i,
                wordCount: chapterContent.length,
              });
            }
          }
          if (start !== undefined) {
            currentPosition = start + match[0].length;
          }
        }
        break;
      }
    }

    // 如果没有检测到章节标题，按段落分割
    if (chapters.length === 0) {
      const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 50);
      const chapterSize = Math.ceil(paragraphs.length / estimatedChapterCount);

      for (let i = 0; i < paragraphs.length; i += chapterSize) {
        const chunk = paragraphs.slice(i, i + chapterSize).join('\n\n');
        if (chunk.length >= this.config.minChapterLength) {
          chapters.push({
            id: `chapter_${novelId}_${chapters.length}`,
            novelId,
            title: `第${chapters.length + 1}章`,
            content: chunk,
            order: chapters.length,
            wordCount: chunk.length,
          });
        }
      }
    }

    // 收集章节中的信息
    for (const chapter of chapters) {
      chapter.characters = extractCharacterNames(chapter.content);
      chapter.locations = extractLocations(chapter.content);
      chapter.timePeriod = extractTimePeriod(chapter.content);
    }

    return chapters;
  }

  /**
   * 分割场景
   */
  async segmentScenes(chapters: Chapter[]): Promise<NovelScene[]> {
    const MAX_CONCURRENCY = 3; // 限制同时处理的章节数

    const processChapter = async (chapter: Chapter): Promise<NovelScene[]> => {
      const prompt = `
请将以下小说章节分割为场景。每个场景应该有完整的情节发展。

章节内容：
${chapter.content.slice(0, 3000)}${chapter.content.length > 3000 ? '...' : ''}

请以 JSON 数组格式返回，每个场景包含：
{
  "sceneNumber": 场景序号,
  "title": "场景标题（可选）",
  "content": "场景内容",
  "location": "地点",
  "time": "时间",
  "characters": ["出场角色"]
}

注意：
1. 场景要有明确的时间地点转换
2. 每个场景至少 200 字
3. 返回 JSON 数组格式
`;

      try {
        const response = await aiService.generate(prompt, {
          provider: this.config.provider,
          model: this.config.model,
        });

        const aiScenes = JSON.parse(response);
        const scenes: NovelScene[] = [];

        for (let i = 0; i < aiScenes.length; i++) {
          const sceneData = aiScenes[i];
          const sceneId = `scene_${chapter.id}_${i}`;

          scenes.push({
            id: sceneId,
            chapterId: chapter.id,
            sceneNumber: sceneData.sceneNumber || i + 1,
            title: sceneData.title,
            content: sceneData.content,
            location: sceneData.location,
            time: sceneData.time,
            startPosition: 0,
            endPosition: sceneData.content?.length || 0,
            characters: sceneData.characters ?? [],
            dialogues: [],
            emotions: [],
            tags: [],
          });
        }
        return scenes;
      } catch {
        // AI 解析失败，使用规则分割
        return ruleBasedSegmentation(chapter, this.config.sceneMinLength);
      }
    };

    const { results: allScenesArrays, errors } = await concurrentLimit(
      chapters,
      MAX_CONCURRENCY,
      processChapter
    );

    // 记录错误（可选：可以在调试模式输出）
    if (errors.length > 0) {
      logger.warn(`[NovelAnalyzer] ${errors.length} 个章节处理失败，将使用规则分割`);
    }

    // 合并所有场景
    return allScenesArrays.flat();
  }

  /**
   * 基于规则的场景分割（备用方案）
   */
  private ruleBasedSegmentation(chapter: Chapter): NovelScene[] {
    const scenes: NovelScene[] = [];
    const content = chapter.content;

    // 按段落分割
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());

    let currentSceneContent = '';
    let sceneNumber = 0;

    for (const paragraph of paragraphs) {
      currentSceneContent += paragraph + '\n\n';

      // 根据段落长度和内容判断是否结束场景
      if (
        currentSceneContent.length >= this.config.sceneMinLength &&
        (paragraph.includes('。') || paragraph.includes('！') || paragraph.includes('？'))
      ) {
        sceneNumber++;
        scenes.push({
          id: `scene_${chapter.id}_${sceneNumber}`,
          chapterId: chapter.id,
          sceneNumber,
          content: currentSceneContent.trim(),
          characters: this.extractCharacterNames(currentSceneContent),
          startPosition: 0,
          endPosition: currentSceneContent.length,
          dialogues: [],
          emotions: [],
          tags: [],
        });
        currentSceneContent = '';
      }
    }

    // 处理剩余内容
    if (currentSceneContent.trim()) {
      sceneNumber++;
      scenes.push({
        id: `scene_${chapter.id}_${sceneNumber}`,
        chapterId: chapter.id,
        sceneNumber,
        content: currentSceneContent.trim(),
        characters: this.extractCharacterNames(currentSceneContent),
        startPosition: 0,
        endPosition: currentSceneContent.length,
        dialogues: [],
        emotions: [],
        tags: [],
      });
    }

    return scenes;
  }

  /**
   * 提取角色
   */
  async extractCharacters(content: string, scenes: NovelScene[]): Promise<Character[]> {
    const prompt = `
请从以下小说内容中提取所有角色信息。

小说内容（前5000字）：
${content.slice(0, 5000)}

请以 JSON 数组格式返回角色信息：
[
  {
    "name": "角色名",
    "aliases": ["别名1", "别名2"],
    "description": "角色描述",
    "appearance": "外貌特征",
    "personality": "性格特点",
    "background": "背景故事",
    "role": "main/supporting/minor",
    "importance": 重要性分数(1-10)
  }
]

注意：
1. 主角 importance 为 8-10
2. 配角 importance 为 4-7
3. 龙套 importance 为 1-3
4. 返回 JSON 数组格式
`;

    try {
      const response = await aiService.generate(prompt, {
        provider: this.config.provider,
        model: this.config.model,
      });

      const characters = JSON.parse(response);

      return characters.map((char: Partial<Character>, index: number) => ({
        id: `char_${Date.now()}_${index}`,
        name: char.name ?? '未知角色',
        aliases: char.aliases ?? [],
        description: char.description ?? '',
        appearance: char.appearance ?? '',
        personality: char.personality ?? '',
        background: char.background ?? '',
        role: char.role ?? 'minor',
        importance: char.importance || 1,
        dialogues: [],
        relationships: [],
      }));
    } catch {
      // 提取失败，返回基于场景的简单角色列表
      return this.extractCharactersByRule(content, scenes);
    }
  }

  /**
   * 基于规则提取角色（备用方案）
   */
  private extractCharactersByRule(content: string, scenes: NovelScene[]): Character[] {
    const characterMap = new Map<string, Character>();
    const allText = scenes.map((s) => s.content).join(' ');

    // 简单规则：提取所有人名
    const namePattern = /([A-Z][a-z]+|[「『]?[\u4e00-\u9fa5]{2,4}[」』]?)/g;
    const matches = allText.match(namePattern) ?? [];

    const nameCount = new Map<string, number>();
    for (const name of matches) {
      const cleanName = name.replace(/[「』]/g, '').trim();
      if (cleanName.length >= 2 && cleanName.length <= 4) {
        nameCount.set(cleanName, (nameCount.get(cleanName) ?? 0) + 1);
      }
    }

    // 排序并创建角色
    const sortedNames = [...nameCount.entries()]
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1]);

    let importance = 10;
    sortedNames.slice(0, 20).forEach(([name]) => {
      let role: 'main' | 'supporting' | 'minor' = 'minor';
      if (importance >= 8) role = 'main';
      else if (importance >= 4) role = 'supporting';

      characterMap.set(name, {
        id: `char_${Date.now()}_${characterMap.size}`,
        name,
        role,
        importance,
        dialogues: [],
      });

      importance = Math.max(1, importance - 1);
    });

    return Array.from(characterMap.values());
  }

  /**
   * 提取对话
   */
  async extractDialogues(scenes: NovelScene[], characters: Character[]): Promise<void> {
    for (const scene of scenes) {
      // 检测对话模式
      const dialoguePatterns = [
        /「([^」]+)」/g, // 中文引号
        /『([^』]+)』/g, // 中文双引号
        /"([^"]+)"/g, // 英文引号
        /"([^"]+)"/g, // 英文双引号
        /([A-Z][a-z]+)\s*:\s*([^。]+。?)/g, // 英文名:对话
        /([\u4e00-\u9fa5]{2,4})[：:]\s*([^。]+。?)/g, // 中文名:对话
      ];

      const dialogueMap = new Map<string, { content: string; position: number }[]>();

      for (const pattern of dialoguePatterns) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);

        while ((match = regex.exec(scene.content)) !== null) {
          let characterName = '';
          let dialogueContent = '';

          if (pattern.source.includes('[A-Z]')) {
            // 英文模式
            characterName = match[1];
            dialogueContent = match[2];
          } else if (/[\u4e00-\u9fa5]{2,4}[：:]/.test(match[0])) {
            // 中文名:模式
            characterName = match[1];
            dialogueContent = match[2];
          } else {
            // 引号模式 - 需要根据上下文推断说话者
            dialogueContent = match[1];
          }

          if (dialogueContent) {
            if (!dialogueMap.has(characterName ?? 'unknown')) {
              dialogueMap.set(characterName ?? 'unknown', []);
            }
            dialogueMap.get(characterName ?? 'unknown')!.push({
              content: dialogueContent.trim(),
              position: match.index,
            });
          }
        }
      }

      // 转换为 Dialogue 对象
      scene.dialogues = [];
      for (const [character, dialogues] of dialogueMap) {
        for (const dialog of dialogues) {
          // 尝试匹配已知的角色
          const matchedCharacter = characters.find(
            (c) => c.name === character || c.aliases?.includes(character)
          );

          scene.dialogues.push({
            id: `dialogue_${scene.id}_${scene.dialogues.length}`,
            sceneId: scene.id,
            character: matchedCharacter?.name ?? character,
            content: dialog.content,
            position: dialog.position,
          });

          // 更新角色的对话列表
          if (matchedCharacter) {
            matchedCharacter.dialogues ??= [];
            matchedCharacter.dialogues.push(dialog.content);
          }
        }
      }

      // 提取旁白
      const dialogueContent = scene.dialogues.map((d) => d.content).join(' ');
      const paragraphs = scene.content.split(/\n/);
      for (const para of paragraphs) {
        if (para.trim() && !dialogueContent.includes(para.trim())) {
          if (para.length > 20 && !/^[「『""]/.test(para)) {
            scene.narrator = (scene.narrator ?? '') + para;
          }
        }
      }
    }
  }

  /**
   * 生成场景描述
   */
  async generateSceneDescriptions(scenes: NovelScene[]): Promise<SceneDescription[]> {
    const MAX_CONCURRENCY = 5; // 限制同时处理的场景数

    const processScene = async (scene: NovelScene): Promise<SceneDescription> => {
      const prompt = `
请为以下小说场景生成详细的图像生成描述。

场景信息：
- 地点：${scene.location ?? '未指定'}
- 时间：${scene.time ?? '未指定'}
- 内容：${scene.content.slice(0, 500)}
- 角色：${scene.characters.join('、')}

请返回以下 JSON 格式：
{
  "description": "场景视觉描述",
  "visualElements": [
    {
      "type": "character/object/background/effect",
      "name": "元素名称",
      "description": "元素描述",
      "attributes": { "颜色": "描述", "动作": "描述" }
    }
  ],
  "mood": "氛围描述",
  "colorPalette": ["颜色1", "颜色2"],
  "lighting": "光线描述",
  "cameraAngle": "镜头角度",
  "imagePrompt": "AI 图像生成提示词（英文）",
  "negativePrompt": "负面提示词（英文）"
}

注意：
1. imagePrompt 应适合 AI 图像生成
2. 使用英文描述以便 AI 理解
3. 保持画面简洁，避免过多元素
`;

      try {
        const response = await aiService.generate(prompt, {
          provider: this.config.provider,
          model: this.config.model,
        });

        const data = JSON.parse(response);

        return {
          sceneId: scene.id,
          description: data.description ?? '',
          visualElements: data.visualElements ?? [],
          mood: data.mood ?? '',
          colorPalette: data.colorPalette,
          lighting: data.lighting,
          cameraAngle: data.cameraAngle,
          imagePrompt: data.imagePrompt ?? this.generateDefaultPrompt(scene),
          negativePrompt: data.negativePrompt ?? 'low quality, blurry, distorted',
        };
      } catch {
        // 使用默认提示词
        return {
          sceneId: scene.id,
          description: scene.content.slice(0, 100),
          visualElements: [],
          mood: '',
          imagePrompt: this.generateDefaultPrompt(scene),
          negativePrompt: 'low quality, blurry, distorted',
        };
      }
    };

    const { results, errors } = await concurrentLimit(scenes, MAX_CONCURRENCY, processScene);

    if (errors.length > 0) {
      logger.warn(`[NovelAnalyzer] ${errors.length} 个场景描述生成失败`);
    }

    return results;
  }

  /**
   * 生成默认提示词
   */
  private generateDefaultPrompt(scene: NovelScene): string {
    const elements: string[] = [];

    if (scene.location) {
      elements.push(scene.location);
    }

    if (scene.time) {
      elements.push(scene.time);
    }

    if (scene.characters.length > 0) {
      elements.push(scene.characters.slice(0, 2).join(', '));
    }

    return `${elements.join(', ')}, manga style, high quality, detailed`;
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(
    metadata: NovelMetadata,
    chapters: Chapter[],
    scenes: NovelScene[],
    characters: Character[]
  ): NovelStatistics {
    const emotionCounts = new Map<EmotionType, number>();
    const timePeriods = new Set<string>();
    const locations = new Set<string>();

    let dialogueCount = 0;

    for (const scene of scenes) {
      // 统计情感
      for (const emotion of scene.emotions) {
        emotionCounts.set(emotion.type, (emotionCounts.get(emotion.type) ?? 0) + 1);
      }

      // 收集时间和地点
      if (scene.time) timePeriods.add(scene.time);
      if (scene.location) locations.add(scene.location);

      // 统计对话
      dialogueCount += scene.dialogues.length;
    }

    return {
      totalWords: metadata.wordCount,
      totalChapters: chapters.length,
      totalScenes: scenes.length,
      totalCharacters: characters.length,
      mainCharacters: characters.filter((c) => c.role === 'main').length,
      supportingCharacters: characters.filter((c) => c.role === 'supporting').length,
      minorCharacters: characters.filter((c) => c.role === 'minor').length,
      dialogueCount,
      avgChapterLength:
        chapters.length > 0
          ? chapters.reduce((sum, c) => sum + c.wordCount, 0) / chapters.length
          : 0,
      avgSceneLength:
        scenes.length > 0
          ? scenes.reduce((sum, s) => sum + s.content.length, 0) / scenes.length
          : 0,
      locationCount: locations.size,
      timePeriods: Array.from(timePeriods),
      dominantEmotions: Object.fromEntries(emotionCounts) as Record<EmotionType, number>,
      genre: metadata.genre,
    };
  }

  /**
   * 从文本中提取人名
   */
  private extractCharacterNames(text: string): string[] {
    const names = new Set<string>();

    // 中文名模式
    const cnPattern = /[\u4e00-\u9fa5]{2,4}(?=(说|道|问|答|喊|叫|回答|告诉))/g;
    const cnMatches = text.match(cnPattern) ?? [];
    cnMatches.forEach((n) => names.add(n));

    // 英文名模式
    const enPattern = /[A-Z][a-z]+(?=\s+says|\s+asks|\s+answered)/g;
    const enMatches = text.match(enPattern) ?? [];
    enMatches.forEach((n) => names.add(n));

    return Array.from(names).slice(0, 5);
  }

  /**
   * 从文本中提取地点
   */
  private extractLocations(text: string): string[] {
    const locationKeywords = [
      '学校',
      '医院',
      '商场',
      '公园',
      '图书馆',
      '办公室',
      '家',
      '房间',
      '教室',
      '餐厅',
      '咖啡厅',
      '街道',
      '城市',
      '乡村',
      '山',
      '海',
      '河',
      '湖',
      '森林',
      '花园',
      '广场',
      '车站',
      '机场',
    ];

    const locations: string[] = [];
    for (const keyword of locationKeywords) {
      if (text.includes(keyword)) {
        locations.push(keyword);
      }
    }

    return locations;
  }

  /**
   * 从文本中提取时间段
   */
  private extractTimePeriod(text: string): string | undefined {
    const timeKeywords = [
      { pattern: /早上|清晨|黎明|早晨/, value: '清晨' },
      { pattern: /中午|正午|午间/, value: '中午' },
      { pattern: /下午|午后/, value: '下午' },
      { pattern: /傍晚|黄昏|夕阳/, value: '黄昏' },
      { pattern: /晚上|夜间|深夜|午夜/, value: '夜晚' },
    ];

    for (const { pattern, value } of timeKeywords) {
      if (pattern.test(text)) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * 导出为剧本格式
   */
  exportToScript(
    result: AnalyzeResult,
    _format: 'screenplay' | 'comic' | 'manga' = 'manga'
  ): string {
    const lines: string[] = [
      `# ${result.metadata.title}`,
      `作者：${result.metadata.author ?? '未知'}`,
      `字数：${result.metadata.wordCount}`,
      `角色数：${result.characters.length}`,
      '',
      '=== 角色列表 ===',
      '',
    ];

    for (const char of result.characters) {
      lines.push(
        `【${char.name}】`,
        `  角色类型：${char.role === 'main' ? '主角' : char.role === 'supporting' ? '配角' : '龙套'}`,
        `  描述：${char.description || char.personality || '无'}`,
        ''
      );
    }

    lines.push('', '=== 场景列表 ===', '');

    for (const scene of result.scenes) {
      lines.push(
        `【场景 ${scene.sceneNumber}】`,
        `  地点：${scene.location ?? '未指定'}`,
        `  时间：${scene.time ?? '未指定'}`,
        `  角色：${scene.characters.join('、')}`,
        ''
      );

      if (scene.narrator) {
        lines.push(`  旁白：${scene.narrator.slice(0, 100)}...`, '');
      }

      for (const dialogue of scene.dialogues) {
        lines.push(`  ${dialogue.character}：${dialogue.content}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}

// 导出单例
export const novelAnalyzer = new NovelAnalyzer();
export default NovelAnalyzer;
