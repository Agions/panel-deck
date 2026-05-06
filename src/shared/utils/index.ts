/**
 * PanelFlow Shared Utils
 * Consolidated utilities from src/utils and src/core/utils
 */

import { open } from '@tauri-apps/plugin-dialog';
import * as fs from '@tauri-apps/plugin-fs';
import { Variants, Easing } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';

import { logger } from '@/core/utils/logger';
import { exportScriptToPDF } from '@/core/utils/pdf-export';

// ========== General Utilities ==========

type GenericFunction = (...args: unknown[]) => unknown;

/**
 * 防抖函数
 */
export function debounce<T extends GenericFunction>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends GenericFunction>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as unknown as T;

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * 生成唯一 ID - 使用 crypto API 替代 Math.random()
 * 性能更好，碰撞概率更低
 */
export function generateId(): string {
  // 使用 crypto.randomUUID() (ES2021+), 降级到时间戳+随机数
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 降级方案: 时间戳 + 高随机性随机数
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${randomPart}`;
}

/**
 * 下载文件
 */
export function downloadFile(content: string | Blob, filename: string, type?: string): void {
  const blob = content instanceof Blob
    ? content
    : new Blob([content], { type: type || 'text/plain' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 读取文件为 Data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 读取文件为文本
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * 从剪贴板读取
 */
export async function readFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return '';
  }
}

/**
 * 随机颜色
 */
export function randomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * 颜色对比度
 */
export function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 驼峰转短横线
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * 短横线转驼峰
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

/**
 * 数组分块
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 数组去重
 */
export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * 数组排序
 */
export function sortBy<T>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * 对象过滤
 */
export function filterObject<T extends Record<string, unknown>>(
  obj: T,
  predicate: (key: string, value: unknown) => boolean
): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (predicate(key, value)) {
      (result as Record<string, unknown>)[key as string] = value;
    }
  }
  return result;
}

/**
 * 对象映射
 */
export function mapObject<T, U>(
  obj: Record<string, T>,
  mapper: (key: string, value: T) => U
): Record<string, U> {
  const result: Record<string, U> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = mapper(key, value);
  }
  return result;
}

/**
 * 延迟
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < attempts - 1) {
        await delay(delayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError!;
}

/**
 * 检测文件类型
 */
export function detectFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  const typeMap: Record<string, string> = {
    mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
    webm: 'video', flv: 'video', wmv: 'video',
    mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
    webp: 'image', svg: 'image',
    pdf: 'document', doc: 'document', docx: 'document',
    txt: 'text', json: 'code', js: 'code', ts: 'code',
    srt: 'subtitle', vtt: 'subtitle', ass: 'subtitle'
  };

  return typeMap[ext] || 'unknown';
}

/**
 * 验证邮箱
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * 验证 URL
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 安全 JSON 解析
 */
export function safeJSONParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 计算哈希
 */
export async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== Formatting Utilities ==========

/**
 * 格式化日期为YYYY-MM-DD格式
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 格式化日期和时间为YYYY-MM-DD HH:MM:SS格式
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 格式化时间 (mm:ss)
 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * 将秒数格式化为hh:mm:ss的时间格式
 */
export const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const hoursStr = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
  return `${hoursStr}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * 将字节大小格式化为人类可读格式
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化时长为友好显示（例如：2小时30分钟）
 */
export const formatFriendlyDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0秒';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  let result = '';
  if (hours > 0) result += `${hours}小时`;
  if (minutes > 0 || hours > 0) result += `${minutes}分钟`;
  if (secs > 0 && hours === 0) result += `${secs}秒`;
  return result || '0秒';
};

/**
 * 格式化数字，添加千分位分隔符
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

/**
 * 转换为百分比格式
 */
export const formatPercent = (value: number, decimals: number = 0): string => {
  if (isNaN(value)) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
};

// ========== Request Utilities ==========

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoff?: 'linear' | 'exponential' | 'none';
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const defaultRetryCondition = (error: unknown): boolean => {
  if (error instanceof TypeError) return true;
  if (error instanceof Response) return error.status >= 500 || error.status === 429;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('network') || message.includes('fetch') || 
           message.includes('timeout') || message.includes('econnrefused');
  }
  return false;
};

export const retryRequest = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 'exponential',
    retryCondition = defaultRetryCondition,
    onRetry
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && retryCondition(error)) {
        let actualDelay = delay;
        if (backoff === 'exponential') actualDelay = delay * Math.pow(2, attempt);
        else if (backoff === 'linear') actualDelay = delay * (attempt + 1);

        if (onRetry) onRetry(attempt + 1, error);
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
};

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(timeoutError ?? new Error(`请求超时: ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export const retryWithTimeout = async <T>(
  fn: () => Promise<T>,
  retryOptions: Partial<RetryOptions> = {},
  timeoutMs?: number
): Promise<T> => {
  const execute = () => timeoutMs ? withTimeout(fn(), timeoutMs) : fn();
  return retryRequest(execute, retryOptions);
};

export const createCancellableRequest = <T>(
  fn: () => Promise<T>
): { request: Promise<T>; cancel: () => void } => {
  let cancelled = false;

  const request = (async () => {
    const result = await fn();
    if (cancelled) throw new Error('请求已取消');
    return result;
  })();

  const cancel = () => { cancelled = true; };
  return { request, cancel };
};

export const batchRequests = async <T>(
  items: unknown[],
  processor: (item: unknown) => Promise<T>,
  options: { concurrency?: number; onProgress?: (completed: number, total: number) => void } = {}
): Promise<T[]> => {
  const { concurrency = 3, onProgress } = options;
  const results: T[] = new Array(items.length);
  let completed = 0;

  const processItem = async (item: unknown, index: number) => {
    const result = await processor(item);
    results[index] = result;
    completed++;
    if (onProgress) onProgress(completed, items.length);
    return result;
  };

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(batch.map((item, batchIndex) => processItem(item, i + batchIndex)));
  }

  return results;
};

// ========== Request Cache ==========

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

export class RequestCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttl: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? 5 * 60 * 1000;
    this.maxSize = options.maxSize ?? 100;
  }

  private generateKey(...args: unknown[]): string {
    return JSON.stringify(args);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttl ?? this.ttl });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  deleteByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) keysToDelete.push(key);
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

export const requestCache = new RequestCache();

export const withCache = async <T>(
  cache: RequestCache,
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  const cached = cache.get<T>(key);
  if (cached !== null) return cached;
  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
};

// ========== Idle Callback ==========

export interface IdleRunOptions {
  timeoutMs?: number;
}

export function runWhenIdle(task: () => void, options: IdleRunOptions = {}): () => void {
  const timeoutMs = options.timeoutMs ?? 120;
  const g = globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof g.requestIdleCallback === 'function') {
    const id = g.requestIdleCallback(task);
    return () => {
      if (typeof g.cancelIdleCallback === 'function') {
        g.cancelIdleCallback(id);
      }
    };
  }

  const timer = window.setTimeout(task, timeoutMs);
  return () => window.clearTimeout(timer);
}

// ========== Motion/Animation Utilities ==========

export const transitions = {
  fast: { duration: 0.15 },
  normal: { duration: 0.25 },
  slow: { duration: 0.35 }
};

export const easings = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1]
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: easings.standard as unknown as Easing }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2, ease: easings.accelerate as unknown as Easing }
  }
};

export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: easings.standard as unknown as Easing }
  })
};

export const cardHoverVariants: Variants = {
  rest: { y: 0, boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)' },
  hover: {
    y: -5,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    transition: { duration: 0.2, ease: easings.standard as unknown as Easing }
  }
};

export const buttonTapVariants: Variants = {
  rest: { scale: 1 },
  tap: { scale: 0.98 }
};

export const skeletonVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: 1,
    transition: { repeat: Infinity, repeatType: 'reverse' as const, duration: 1 }
  }
};

export const createPageTransition = (customTransitions?: { duration?: number; ease?: number[] }) => ({
  ...pageVariants,
  animate: {
    ...pageVariants.animate,
    transition: {
      ...(pageVariants.animate as any).transition,
      duration: customTransitions?.duration,
      ease: customTransitions?.ease as unknown as Easing | undefined
    }
  }
});

export const createStaggerChildren = (delay: number = 0.05) => ({
  animate: {
    transition: { staggerChildren: delay }
  }
});

// ========== Platform Utilities ==========

export type Platform = 'web' | 'desktop';

const getPlatform = (): Platform => {
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    return 'desktop';
  }
  return 'web';
};

export const platform = getPlatform();
export const isWeb = platform === 'web';
export const isDesktop = platform === 'desktop';
export const isMobile = false;
export const isIOS = false;
export const isAndroid = false;

export interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

class WebStorageAdapter implements StorageAdapter {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}

export const getStorageAdapter = (): StorageAdapter => new WebStorageAdapter();

export const platformUtils = {
  platform,
  isWeb,
  isDesktop,
  isMobile,
  isIOS,
  isAndroid,
  storage: getStorageAdapter()
};

// ========== i18n ==========

export type Language = 'zh' | 'en';

interface Translations {
  [key: string]: { [key: string]: string };
}

const translations: Translations = {
  zh: {
    'app.name': 'PanelFlow AI',
    'app.save': '保存',
    'app.cancel': '取消',
    'app.confirm': '确认',
    'app.delete': '删除',
    'app.edit': '编辑',
    'app.add': '添加',
    'theme.mode': '主题模式',
    'theme.light': '亮色',
    'theme.dark': '暗色',
    'theme.auto': '自动',
    'settings.title': '设置',
  },
  en: {
    'app.name': 'PanelFlow AI',
    'app.save': 'Save',
    'app.cancel': 'Cancel',
    'app.confirm': 'Confirm',
    'app.delete': 'Delete',
    'app.edit': 'Edit',
    'app.add': 'Add',
    'theme.mode': 'Theme Mode',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.auto': 'Auto',
    'settings.title': 'Settings',
  }
};

const getBrowserLanguage = (): Language => {
  const navigatorLang = navigator.language.toLowerCase();
  return navigatorLang.startsWith('zh') ? 'zh' : 'en';
};

export function useTranslation() {
  const [language, setLanguage] = useState<Language>(
    localStorage.getItem('app_language') as Language || getBrowserLanguage()
  );
  
  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);
  
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = translations[language]?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      });
    }
    return text;
  }, [language]);
  
  const changeLanguage = useCallback((newLang: Language) => {
    setLanguage(newLang);
  }, []);
  
  return { t, language, changeLanguage };
}

// ========== React Hooks Re-exports ==========

export { useLocalStorage, useDebounce, useThrottle, useWindowSize, useClickOutside,
         useCountdown, useAsync, usePrevious, useMounted, useUpdateEffect,
         useKeyPress, useOnlineStatus, useMediaQuery, useScrollPosition,
         useVisibility, useAutoSave } from '@/core/utils/hooks';
