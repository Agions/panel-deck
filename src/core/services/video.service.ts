/**
 * 视频处理服务
 * 统一的视频处理功能
 */

import { v4 as uuidv4 } from 'uuid';

import type { VideoInfo, VideoAnalysis, Scene, Keyframe } from '@/core/types';
import { logger } from '@/core/utils/logger';

// FFmpeg 命令构建器
class FFmpegCommandBuilder {
  private inputs: string[] = [];
  private filters: string[] = [];
  private outputs: string[] = [];
  private options: string[] = [];

  input(path: string): this {
    this.inputs.push(`-i "${path}"`);
    return this;
  }

  option(...opts: string[]): this {
    this.options.push(...opts);
    return this;
  }

  filter(filter: string): this {
    this.filters.push(filter);
    return this;
  }

  output(path: string, options?: string[]): this {
    const opts = options ? options.join(' ') : '';
    this.outputs.push(`${opts} "${path}"`);
    return this;
  }

  build(): string {
    const parts = [
      'ffmpeg',
      ...this.inputs,
      ...this.options,
      this.filters.length > 0 ? `-vf "${this.filters.join(',')}"` : '',
      ...this.outputs
    ];
    return parts.filter(Boolean).join(' ');
  }
}

class VideoService {
  /**
   * 获取视频信息
   */
  async getVideoInfo(file: File): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);

        resolve({
          id: uuidv4(),
          path: url,
          name: file.name,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          fps: 30, // 默认
          format: file.name.split('.').pop()?.toLowerCase() || 'mp4',
          size: file.size,
          createdAt: new Date().toISOString()
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('无法读取视频文件'));
      };

      video.src = url;
    });
  }

  /**
   * 生成缩略图
   */
  async generateThumbnail(
    videoPath: string,
    timestamp: number = 0,
    width: number = 320
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.crossOrigin = 'anonymous';

      video.onloadeddata = () => {
        // 计算高度保持比例
        const aspectRatio = video.videoHeight / video.videoWidth;
        canvas.width = width;
        canvas.height = Math.round(width * aspectRatio);

        video.currentTime = timestamp;
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnail);
        } else {
          reject(new Error('无法创建画布上下文'));
        }
      };

      video.onerror = () => {
        reject(new Error('无法加载视频'));
      };

      video.src = videoPath;
    });
  }

  /**
   * 提取关键帧
   */
  async extractKeyframes(
    videoPath: string,
    duration: number,
    count: number = 10
  ): Promise<Keyframe[]> {
    const keyframes: Keyframe[] = [];
    const interval = duration / (count + 1);

    for (let i = 1; i <= count; i++) {
      const timestamp = Math.round(interval * i);
      try {
        const thumbnail = await this.generateThumbnail(videoPath, timestamp);
        keyframes.push({
          id: uuidv4(),
          timestamp,
          thumbnail,
          description: `关键帧 ${i}`
        });
      } catch (error) {
        logger.error(`提取关键帧 ${i} 失败:`, error);
      }
    }

    return keyframes;
  }

  /**
   * 场景检测
   */
  async detectScenes(
    videoPath: string,
    duration: number,
    _threshold: number = 0.3
  ): Promise<Scene[]> {
    // 模拟场景检测
    const scenes: Scene[] = [];
    const sceneDuration = 30; // 平均每 30 秒一个场景
    const sceneCount = Math.floor(duration / sceneDuration);

    for (let i = 0; i < sceneCount; i++) {
      const startTime = i * sceneDuration;
      const endTime = Math.min((i + 1) * sceneDuration, duration);

      try {
        const thumbnail = await this.generateThumbnail(videoPath, startTime);
        scenes.push({
          id: uuidv4(),
          startTime,
          endTime,
          thumbnail,
          description: `场景 ${i + 1}`,
          tags: [`场景${i + 1}`]
        });
      } catch (error) {
        logger.error(`检测场景 ${i} 失败:`, error);
      }
    }

    return scenes;
  }

  /**
   * 分析视频
   */
  async analyzeVideo(videoInfo: VideoInfo): Promise<VideoAnalysis> {
    const [keyframes, scenes] = await Promise.all([
      this.extractKeyframes(videoInfo.path!!, videoInfo.duration!!, 10),
      this.detectScenes(videoInfo.path!!, videoInfo.duration!!)
    ]);

    return {
      id: uuidv4(),
      videoId: videoInfo.id,
      scenes,
      keyframes,
      objects: [],
      emotions: [],
      summary: `视频时长 ${this.formatDuration(videoInfo.duration!)}，分辨率 ${videoInfo!.width}x${videoInfo!.height}，包含 ${scenes.length} 个场景。`,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 生成视频预览
   */
  async generatePreview(
    videoPath: string,
    _startTime: number,
    _endTime: number
  ): Promise<string> {
    // 这里应该使用 FFmpeg 生成预览片段
    // 目前返回原视频路径
    return videoPath;
  }

  /**
   * 导出视频
   */
  async exportVideo(
    inputPath: string,
    outputPath: string,
    options: {
      format?: string;
      quality?: 'low' | 'medium' | 'high' | 'ultra';
      resolution?: '720p' | '1080p' | '2k' | '4k';
      includeSubtitles?: boolean;
      subtitlePath?: string;
    }
  ): Promise<string> {
    const builder = new FFmpegCommandBuilder();
    builder.input(inputPath);

    // 质量设置
    const qualityMap = {
      low: ['-crf', '28'],
      medium: ['-crf', '23'],
      high: ['-crf', '18'],
      ultra: ['-crf', '15']
    };

    // 分辨率设置
    const resolutionMap = {
      '720p': '1280:720',
      '1080p': '1920:1080',
      '2k': '2560:1440',
      '4k': '3840:2160'
    };

    const quality = options.quality || 'high';
    const resolution = options.resolution || '1080p';

    builder.option(...qualityMap[quality]);

    if (resolution !== '1080p') {
      builder.filter(`scale=${resolutionMap[resolution]}`);
    }

    // 字幕
    if (options.includeSubtitles && options.subtitlePath) {
      builder.input(options.subtitlePath);
      builder.filter('subtitles=subtitle.srt');
    }

    builder.output(outputPath, ['-c:v', 'libx264', '-c:a', 'aac']);

    const command = builder.build();
    logger.info('FFmpeg 命令:', command);

    // 这里应该实际执行 FFmpeg 命令
    // 目前只是模拟
    await new Promise(resolve => setTimeout(resolve, 2000));

    return outputPath;
  }

  /**
   * 剪辑视频片段
   */
  async clipVideo(
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime: number
  ): Promise<string> {
    const builder = new FFmpegCommandBuilder();
    builder
      .input(inputPath)
      .option('-ss', startTime.toString(), '-t', (endTime - startTime).toString(), '-c', 'copy')
      .output(outputPath);

    const command = builder.build();
    logger.info('剪辑命令:', command);

    await new Promise(resolve => setTimeout(resolve, 1000));
    return outputPath;
  }

  /**
   * 合并视频
   */
  async mergeVideos(
    inputPaths: string[],
    outputPath: string
  ): Promise<string> {
    // 创建临时文件列表
    const fileList = inputPaths.map(p => `file '${p}'`).join('\n');
    logger.info('合并文件列表:', fileList);

    const builder = new FFmpegCommandBuilder();
    builder
      .option('-f', 'concat', '-safe', '0')
      .input('filelist.txt')
      .option('-c', 'copy')
      .output(outputPath);

    const command = builder.build();
    logger.info('合并命令:', command);

    await new Promise(resolve => setTimeout(resolve, 2000));
    return outputPath;
  }

  /**
   * 添加字幕
   */
  async addSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    style?: {
      fontSize?: number;
      fontColor?: string;
      backgroundColor?: string;
      position?: 'top' | 'middle' | 'bottom';
    }
  ): Promise<string> {
    const defaultStyle = {
      fontSize: 24,
      fontColor: '#FFFFFF',
      backgroundColor: '#000000',
      position: 'bottom'
    };

    const finalStyle = { ...defaultStyle, ...style };

    const builder = new FFmpegCommandBuilder();
    builder
      .input(videoPath)
      .filter(`subtitles=${subtitlePath}:force_style='FontSize=${finalStyle.fontSize},PrimaryColour=${finalStyle.fontColor}'`)
      .output(outputPath, ['-c:v', 'libx264', '-c:a', 'copy']);

    const command = builder.build();
    logger.info('字幕命令:', command);

    await new Promise(resolve => setTimeout(resolve, 1500));
    return outputPath;
  }

  /**
   * 格式转换
   */
  async convertFormat(
    inputPath: string,
    outputPath: string,
    format: string
  ): Promise<string> {
    const formatMap: Record<string, string[]> = {
      mp4: ['-c:v', 'libx264', '-c:a', 'aac'],
      webm: ['-c:v', 'libvpx-vp9', '-c:a', 'libopus'],
      mov: ['-c:v', 'libx264', '-c:a', 'aac', '-f', 'mov'],
      avi: ['-c:v', 'libx264', '-c:a', 'mp3', '-f', 'avi']
    };

    const codec = formatMap[format] || formatMap.mp4;

    const builder = new FFmpegCommandBuilder();
    builder
      .input(inputPath)
      .output(outputPath, codec);

    const command = builder.build();
    logger.info('转换命令:', command);

    await new Promise(resolve => setTimeout(resolve, 2000));
    return outputPath;
  }

  /**
   * 格式化时长
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const videoService = new VideoService();
export default videoService;
