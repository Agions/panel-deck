import { Storyboard, StoryboardScene } from '../../step2-storyboard';

export interface MaterialMatch {
  sceneId: string;
  sceneNumber: number;
  matches: MaterialItem[];
  fallback: 'ai_generate' | 'stock footage' | 'placeholder';
  confidence: number; // 0-1
}

export interface MaterialItem {
  id: string;
  type: 'video' | 'image';
  url?: string;
  localPath?: string;
  source: 'pixabay' | 'pexels' | 'local' | 'ai_generated';
  duration?: number; // 秒
  tags: string[];
  resolution?: string;
  credit?: string;
}

export interface SearchQuery {
  keywords: string[];
  type: 'video' | 'image' | 'any';
  duration?: { min: number; max: number };
  resolution?: string;
  mood?: string; // tense, happy, sad, etc.
}

export async function searchMaterial(
  scene: StoryboardScene,
  query: SearchQuery
): Promise<MaterialItem[]> {
  // 模拟搜索（实际接入 Pixabay / Pexels API）
  // 目前返回空数组，表示需要 AI 生成或占位

  const mockResults: MaterialItem[] = [];

  // 模拟：根据关键词搜索
  if (query.keywords.length > 0) {
    // 实际这里会调用 Pixabay/Pexels API
    // 返回格式化的 MaterialItem[]
    // Material search - keywords logged via proper logger
  }

  return mockResults;
}

export async function batchSearch(
  storyboard: Storyboard,
  options: { maxResultsPerScene?: number } = {}
): Promise<MaterialMatch[]> {
  const { maxResultsPerScene = 3 } = options;

  // 并发搜索所有场景（5并发限制）
  const CONCURRENCY = 5;
  const scenes = storyboard.scenes;
  const results: MaterialMatch[] = new Array(scenes.length);

  for (let i = 0; i < scenes.length; i += CONCURRENCY) {
    const batch = scenes.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (scene) => {
        const query = buildSearchQuery(scene);
        const matches = await searchMaterial(scene, query);

        // 截取最多 maxResultsPerScene 个结果
        const limitedMatches = matches.slice(0, maxResultsPerScene);

        // 判断 fallback 策略
        let fallback: MaterialMatch['fallback'] = 'ai_generate';
        if (limitedMatches.length > 0) {
          const avgConfidence =
            limitedMatches.reduce((sum, _m) => sum + 0.7, 0) / limitedMatches.length;
          fallback = avgConfidence > 0.8 ? 'stock footage' : 'ai_generate';
        }

        return {
          sceneId: scene.sceneId,
          sceneNumber: scene.sceneNumber,
          matches: limitedMatches,
          fallback,
          confidence: limitedMatches.length > 0 ? 0.7 : 0,
        };
      })
    );

    // 处理结果（包括失败的）
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results[i + idx] = result.value;
      } else {
        // 失败时返回空匹配，标记为 AI 生成
        results[i + idx] = {
          sceneId: batch[idx].sceneId,
          sceneNumber: batch[idx].sceneNumber,
          matches: [],
          fallback: 'ai_generate',
          confidence: 0,
        };
      }
    });
  }

  return results.filter(Boolean);
}

function buildSearchQuery(scene: StoryboardScene): SearchQuery {
  const { description } = scene;

  const keywords: string[] = [];

  // 地点
  if (description.prompt.includes('location:')) {
    const match = description.prompt.match(/location:\s*([^,]+)/);
    if (match) keywords.push(match[1]);
  }

  // 场景类型
  const sceneTypeMatch = description.prompt.match(/scene type:\s*([^,]+)/);
  if (sceneTypeMatch?.[1]) {
    keywords.push(sceneTypeMatch[1]);
  }

  // 情感 - 从 prompt 中提取（如 dark atmosphere, tense 等关键词）
  const emotionKeywords = description.prompt.match(
    /dark atmosphere|tense|sad|happy|angry|surprising|neutral/i
  );
  const emotion = emotionKeywords ? emotionKeywords[0].toLowerCase() : 'neutral';
  keywords.push(emotion);

  // 过滤空关键词
  const filteredKeywords = keywords.filter(
    (k) => k && typeof k === 'string' && k.trim().length > 0
  );

  return {
    keywords: filteredKeywords,
    type: 'video',
    duration: { min: description.duration - 2, max: description.duration + 2 },
    mood: emotion,
  };
}
