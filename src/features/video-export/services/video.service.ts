/**
 * Video Service
 * Unified video processing functionality
 */

import { v4 as uuidv4 } from 'uuid';

import type { VideoInfo, VideoAnalysis, Scene, Keyframe } from '@/core/types';
import { logger } from '@/core/utils/logger';

// FFmpeg Command Builder
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
   * Get video information
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
          fps: 30,
          format: file.name.split('.').pop()?.toLowerCase() || 'mp4',
          size: file.size,
          createdAt: new Date().toISOString()
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to read video file'));
      };

      video.src = url;
    });
  }

  /**
   * Generate thumbnail
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
          reject(new Error('Failed to create canvas context'));
        }
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      video.src = videoPath;
    });
  }

  /**
   * Extract keyframes
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
          description: `Keyframe ${i}`
        });
      } catch (error) {
        logger.error(`Failed to extract keyframe ${i}:`, error);
      }
    }

    return keyframes;
  }

  /**
   * Detect scenes
   */
  async detectScenes(
    videoPath: string,
    duration: number,
    _threshold: number = 0.3
  ): Promise<Scene[]> {
    const scenes: Scene[] = [];
    const sceneDuration = 30;
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
          description: `Scene ${i + 1}`,
          tags: [`scene${i + 1}`]
        });
      } catch (error) {
        logger.error(`Failed to detect scene ${i}:`, error);
      }
    }

    return scenes;
  }

  /**
   * Analyze video
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
      summary: `Video duration ${this.formatDuration(videoInfo.duration!)}, resolution ${videoInfo!.width}x${videoInfo!.height}, contains ${scenes.length} scenes.`,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Generate preview
   */
  async generatePreview(
    videoPath: string,
    _startTime: number,
    _endTime: number
  ): Promise<string> {
    return videoPath;
  }

  /**
   * Export video
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

    const qualityMap: Record<string, string[]> = {
      low: ['-crf', '28'],
      medium: ['-crf', '23'],
      high: ['-crf', '18'],
      ultra: ['-crf', '15']
    };

    const resolutionMap: Record<string, string> = {
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

    if (options.includeSubtitles && options.subtitlePath) {
      builder.input(options.subtitlePath);
      builder.filter('subtitles=subtitle.srt');
    }

    builder.output(outputPath, ['-c:v', 'libx264', '-c:a', 'aac']);

    const command = builder.build();
    logger.info('FFmpeg command:', command);

    await new Promise(resolve => setTimeout(resolve, 2000));

    return outputPath;
  }

  /**
   * Clip video
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
    logger.info('Clip command:', command);

    await new Promise(resolve => setTimeout(resolve, 1000));
    return outputPath;
  }

  /**
   * Merge videos
   */
  async mergeVideos(
    inputPaths: string[],
    outputPath: string
  ): Promise<string> {
    const fileList = inputPaths.map(p => `file '${p}'`).join('\n');
    logger.info('Merge file list:', fileList);

    const builder = new FFmpegCommandBuilder();
    builder
      .option('-f', 'concat', '-safe', '0')
      .input('filelist.txt')
      .option('-c', 'copy')
      .output(outputPath);

    const command = builder.build();
    logger.info('Merge command:', command);

    await new Promise(resolve => setTimeout(resolve, 2000));
    return outputPath;
  }

  /**
   * Add subtitles
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
      position: 'bottom' as const
    };

    const finalStyle = { ...defaultStyle, ...style };

    const builder = new FFmpegCommandBuilder();
    builder
      .input(videoPath)
      .filter(`subtitles=${subtitlePath}:force_style='FontSize=${finalStyle.fontSize},PrimaryColour=${finalStyle.fontColor}'`)
      .output(outputPath, ['-c:v', 'libx264', '-c:a', 'copy']);

    const command = builder.build();
    logger.info('Subtitle command:', command);

    await new Promise(resolve => setTimeout(resolve, 1500));
    return outputPath;
  }

  /**
   * Convert format
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
    logger.info('Convert command:', command);

    await new Promise(resolve => setTimeout(resolve, 2000));
    return outputPath;
  }

  /**
   * Format duration
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
   * Format file size
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
