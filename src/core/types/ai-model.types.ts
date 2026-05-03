/**
 * AI 模型类型
 */
import type { Script } from '../../shared/types/script';

export type AIModelType = 'wenxin' | 'qianwen' | 'spark' | 'chatglm' | 'doubao' | 'deepseek';

/**
 * AI 模型信息
 */
export interface AIModelInfo {
  name: string;
  provider: string;
  description: string;
  icon: string;
  apiKeyFormat: string;
}

/**
 * AI 模型设置
 */
export interface AIModelSettings {
  enabled: boolean;
  apiKey?: string;
  apiUrl?: string;
  apiVersion?: string;
}

/**
 * AI 模型信息映射
 */
export const AI_MODEL_INFO: Record<AIModelType, AIModelInfo> = {
  wenxin: {
    name: '文心一言',
    provider: '百度',
    description: '百度文心大模型，有丰富的中文理解能力。',
    icon: 'WenxinIcon',
    apiKeyFormat: 'API_KEY:SECRET_KEY'
  },
  qianwen: {
    name: '通义千问',
    provider: '阿里云',
    description: '阿里云推出的创新大模型，拥有强大的文本处理能力。',
    icon: 'QianwenIcon',
    apiKeyFormat: 'API_KEY'
  },
  spark: {
    name: '讯飞星火',
    provider: '科大讯飞',
    description: '科大讯飞的认知大模型，支持多种语言理解和生成任务。',
    icon: 'SparkIcon',
    apiKeyFormat: 'APPID:API_KEY:API_SECRET'
  },
  chatglm: {
    name: 'ChatGLM',
    provider: '智谱AI',
    description: '智谱AI推出的开源双语对话模型，支持中英文的对话生成。',
    icon: 'ChatGLMIcon',
    apiKeyFormat: 'API_KEY'
  },
  doubao: {
    name: '豆包',
    provider: '字节跳动',
    description: '字节跳动推出的AI助手，拥有优秀的文本创作和理解能力。',
    icon: 'DoubaoIcon',
    apiKeyFormat: 'API_KEY'
  },
  deepseek: {
    name: 'DeepSeek',
    provider: 'DeepSeek',
    description: '深度搜索推出的大语言模型，拥有强大的创作与思考能力。',
    icon: 'DeepSeekIcon',
    apiKeyFormat: 'API_KEY'
  }
};

/**
 * 脚本生成选项
 */
export interface ScriptGenerationOptions {
  style?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  purpose?: string;
}

/**
 * 存储的应用设置
 */
export interface AppSettings {
  autoSave: boolean;
  defaultAIModel?: AIModelType;
  aiModelsSettings: Partial<Record<AIModelType, AIModelSettings>>;
  theme?: 'light' | 'dark' | 'system';
}

/**
 * 项目数据
 */
/**
 * 项目数据
 */
export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status?: 'draft' | 'processing' | 'completed' | 'failed';
  videos?: VideoInfo[];
  scripts?: Script[];
  settings?: ProjectSettings;
  createdAt: string;
  updatedAt: string;
  metadata?: unknown;
  keyFrames?: string[];
  coverImage?: string;
  videoPath?: string;
  thumbnail?: string;
  novelMetadata?: unknown;
  storyboardComments?: unknown[];
  storyboardVersions?: unknown[];
}

/**
 * 项目设置
 */
export interface ProjectSettings {
  videoQuality?: 'low' | 'medium' | 'high';
  outputFormat?: 'mp4' | 'webm' | 'gif';
  resolution?: '480p' | '720p' | '1080p' | '4k';
  frameRate?: number;
  audioCodec?: string;
  videoCodec?: string;
  subtitleEnabled?: boolean;
  subtitleStyle?: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    outline?: boolean;
    outlineColor?: string;
    position?: 'top' | 'bottom' | 'center';
    alignment?: 'left' | 'center' | 'right';
  };
}

/**
 * 视频信息
 */
export interface VideoInfo {
  id: string;
  path?: string;
  name: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  format?: string;
  size?: number;
  thumbnail?: string;
  createdAt?: string;
}

/**
 * 视频元数据
 */
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec?: string;
  bitrate?: number;
}

// Re-export from shared for backward compatibility
export type { Script, ScriptSegment, ScriptMetadata } from '../../shared/types/script';

/**
 * 时间线
 */
export interface Timeline {
  segments: TimelineSegment[];
  duration: number;
}

export interface TimelineSegment {
  id: string;
  startTime: number;
  endTime: number;
  type: 'video' | 'audio' | 'text';
  data: unknown;
}

/**
 * 视频分析
 */
export interface VideoAnalysis {
  duration: number;
  scenes: SceneInfo[];
  keyFrames: string[];
  audio?: AudioInfo;
  keyMoments?: KeyMoment[];
}

export interface KeyMoment {
  time: number;
  description: string;
  type: 'action' | 'transition' | 'highlight';
}

export interface SceneInfo {
  startTime: number;
  endTime: number;
  description: string;
  keyFrame?: string;
}

export interface AudioInfo {
  hasAudio: boolean;
  language?: string;
  transcript?: string;
} 