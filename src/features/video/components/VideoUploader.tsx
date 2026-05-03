import { isTauri, convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Upload, Video } from 'lucide-react';
import React, { useState, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import { logger } from '@/core/utils/logger';

import styles from './VideoUploader.module.less';

interface VideoUploaderProps {
  onUploadSuccess: (videoPath: string) => void;
  initialValue?: string;
}

interface CustomRequestOptions {
  file: File | Blob;
  onProgress?: (event: { percent: number }) => void;
  onSuccess?: (response: unknown) => void;
  onError?: (error: Error) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onUploadSuccess, initialValue }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(initialValue);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTauriApp = isTauri();

  const openFileDialog = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: '视频文件', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
      });

      if (selected && !Array.isArray(selected)) {
        // 转换为应用可访问的URL
        const filePath = selected;
        const fileUrl = convertFileSrc(filePath);
        setVideoUrl(fileUrl);
        onUploadSuccess(filePath);
        toast.success('视频选择成功');
      }
    } catch (error) {
      logger.error('选择文件失败:', error);
      toast.error('选择文件失败');
    }
  };

  const customRequest = async (options: CustomRequestOptions) => {
    const { file: _file, onProgress } = options;
    setUploading(true);
    setProgress(0);

    try {
      // 模拟进度
      const simulateProgress = () => {
        let percent = 0;
        const interval = setInterval(() => {
          percent += Math.floor(Math.random() * 3 + 1);
          if (percent >= 99) {
            clearInterval(interval);
            percent = 99;
          }
          setProgress(percent);
          onProgress?.({ percent });
        }, 100);

        return interval;
      };

      const progressInterval = simulateProgress();

      // 模拟上传过程
      await new Promise((resolve) => setTimeout(resolve, 2000));
      clearInterval(progressInterval);

      // 创建一个视频预览URL
      const reader = new FileReader();
      reader.readAsDataURL(_file as File);
      reader.onload = () => {
        setVideoUrl(reader.result as string);
        setProgress(100);
        onUploadSuccess(reader.result as string);
        toast.success('视频上传成功');
        setUploading(false);
      };
    } catch (error) {
      logger.error('上传失败:', error);
      setUploading(false);
      setProgress(0);
      toast.error('视频上传失败');
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await customRequest({
      file,
      onProgress: ({ percent }) => setProgress(percent),
      onSuccess: () => {},
      onError: () => {},
    });
  };

  return (
    <div className={styles.container}>
      {videoUrl ? (
        <div className={styles.videoPreview}>
          <div className={styles.videoWrapper}>
            <video
              src={videoUrl}
              controls
              className={styles.video}
            />
          </div>
          <div className={styles.videoActions}>
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              onClick={() => {
                setVideoUrl(undefined);
              }}
            >
              重新选择视频
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.uploader}>
          {isTauriApp ? (
            <Button
              variant="outline"
              icon={<Video size={18} />}
              size="lg"
              onClick={openFileDialog}
              loading={uploading}
              className={styles.uploadButton}
            >
              选择视频文件
            </Button>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
              <Button
                variant="outline"
                icon={<Upload size={18} />}
                size="lg"
                loading={uploading}
                className={styles.uploadButton}
                onClick={() => fileInputRef.current?.click()}
              >
                上传视频
              </Button>
            </>
          )}
          <p className={styles.uploadTip}>
            支持MP4、MOV、AVI或MKV格式，最大文件大小500MB
          </p>
          {uploading && <Progress percent={progress} status="active" />}
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
