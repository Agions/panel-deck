import { convertFileSrc } from '@tauri-apps/api/core';
import React, { useState } from 'react';

import { Card } from '@/components/ui/card';
import type { VideoAnalysis } from '@/shared/types/video';

import VideoAnalyzer from './VideoAnalyzer';
import styles from './VideoEditorView.module.less';
import VideoExporter from './VideoExporter';
import VideoInfo from './VideoInfo';
import VideoPlayer from './VideoPlayer';
import VideoSelector from './VideoSelector';
import VideoUploader from './VideoUploader';

/**
 * 视频编辑视图组件
 * 组合所有视频处理组件
 */
const VideoEditorView = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoAnalysis | null>(null);

  const handleVideoSelect = (videoPath: string) => {
    setSelectedVideo(videoPath);
  };

  const handleVideoUpload = (videoPath: string) => {
    setSelectedVideo(videoPath);
  };

  const handleAnalysisComplete = (info: VideoAnalysis) => {
    setVideoInfo(info);
  };

  const videoSrc = selectedVideo ? convertFileSrc(selectedVideo) : '';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>视频处理</h2>
        <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 14 }}>
          选择、上传、分析和处理视频素材
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: '0 0 66%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="选择视频">
            <VideoSelector onVideoSelect={handleVideoSelect} />
          </Card>

          <Card title="上传视频">
            <VideoUploader onUploadSuccess={handleVideoUpload} />
          </Card>

          {selectedVideo && (
            <>
              <Card title="视频预览">
                <VideoPlayer src={videoSrc} />
              </Card>

              <Card title="视频分析">
                <VideoAnalyzer
                  projectId="current"
                  videoUrl={selectedVideo}
                  onAnalysisComplete={handleAnalysisComplete}
                />
              </Card>
            </>
          )}
        </div>

        <div style={{ flex: '0 0 33%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {videoInfo && (
            <Card title="视频信息">
              <VideoInfo
                name={selectedVideo?.split('/').pop() || 'video'}
                duration={videoInfo?.duration || 0}
                path={selectedVideo || ''}
                metadata={videoInfo as unknown as { width?: number; height?: number; fps?: number; codec?: string; }}
              />
            </Card>
          )}

          {selectedVideo && (
            <Card title="导出视频">
              <VideoExporter projectName={selectedVideo?.split('/').pop() || 'video'} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoEditorView;
