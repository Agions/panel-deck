/**
 * AI Core Types
 * Core types for AI model integration, TTS, and streaming
 */

// ========== Core Types from src/core/types/index.ts ==========

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'baidu' | 'alibaba' | 'zhipu' | 'iflytek' | 'tencent' | 'minimax' | 'moonshot' | 'bytedance' | 'kling';
export type ModelCategory = 'text' | 'code' | 'image' | 'video' | 'audio' | 'all';

export type TTSProvider = 'edge' | 'azure' | 'aliyun' | 'baidu' | 'iflytek' | 'cosyvoice';

export interface TTSVoice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  provider: TTSProvider;
  style?: string;
  description?: string;
}

export interface TTSConfig {
  provider: TTSProvider;
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
  format: 'audio-16khz-32kbitrate-mono-mp3' | 'audio-16khz-64kbitrate-mono-mp3' | 'audio-24khz-48kbitrate-mono-mp3' | 'audio-24khz-96kbitrate-mono-mp3';
}

export interface TTSRequest {
  text: string;
  config: TTSConfig;
  signal?: AbortSignal;
}

export interface TTSResponse {
  audio: ArrayBuffer;
  duration: number;
  size: number;
  format: string;
}

export interface TTSStreamChunk {
  audio: ArrayBuffer;
  isFinal: boolean;
}

export interface StreamCallback<T> {
  (chunk: T): void;
  (error: Error): void;
}

export interface StreamOptions {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  onChunk: (content: string, isFinal: boolean) => void;
  signal?: AbortSignal;
}

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  category: ModelCategory[];
  description: string;
  features: string[];
  tokenLimit: number;
  contextWindow: number;
  isPro?: boolean;
  isAvailable?: boolean;
  apiConfigured?: boolean;
  pricing?: {
    input: number;
    output: number;
    unit: string;
  };
}

export interface AIModelSettings {
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  apiUrl?: string;
  apiVersion?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ModelConfigState {
  selectedModel: string;
  models: Record<string, AIModelSettings>;
  isLoading: boolean;
  error: string | null;
}
