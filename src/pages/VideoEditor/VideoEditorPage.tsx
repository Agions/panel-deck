import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import {
  Save,
  Undo,
  Redo,
  Download,
  Upload,
  Trash2,
  Plus,
  Maximize,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Tabs, TabPane } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Title, Text } from '@/components/ui/typography';
import { Progress } from '@/components/ui/progress';
import { Empty } from '@/components/ui/empty';
import { Space } from '@/components/ui/space';
import { Tag } from '@/components/ui/tag';
import { Modal } from '@/components/ui/modal';
import { Row, Col } from '@/components/ui/grid';
import { Dropdown } from '@/components/ui/dropdown';
import { tauriService } from '@/core/services';
import { logger } from '@/core/utils/logger';
import { delay } from '@/shared/utils';
import { useProjectStore } from '@/shared/stores';
import { formatTime } from '@/shared/utils';

import styles from './VideoEditorPage.module.less';

// VideoSegment type (compatible with ScriptEditor interface)
interface VideoSegment {
  id: string;
  start: number;
  end: number;
  type: string;
  content?: string;
}

type LayoutType = { Content: 'div'; Header: 'header'; Sider: 'aside' };
const Layout: LayoutType = { Content: 'div', Header: 'header', Sider: 'aside' };
const Content: 'div' = Layout.Content;

const VideoEditor = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { loadProject: loadProjectFromStore } = useProjectStore();

  // 状态管理
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [keyframes, setKeyframes] = useState<string[]>([]);
  const [editHistory, setEditHistory] = useState<VideoSegment[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number>(-1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<string>('mp4');
  const [videoQuality, setVideoQuality] = useState<string>('medium');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [projectData, setProjectData] = useState<{ id: string; name: string }>({
    id: projectId || 'new',
    name: '未命名项目',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // 加载真实项目数据
  useEffect(() => {
    if (!projectId) return;
    const loadProjectData = async () => {
      try {
        const projectText = await tauriService.readText(projectId);
        const data = JSON.parse(projectText);
        setProjectData({ id: data.id, name: data.name });
        if (data.keyFrames) setKeyframes(data.keyFrames);
        if (data.videos && data.videos.length > 0) {
          const first = data.videos[0];
          if (first.path) {
            setVideoSrc(`file://${first.path}`);
            setDuration(first.duration || 0);
          }
        }
      } catch (err) {
        logger.warn('未找到关联项目，使用空白编辑器');
      }
    };
    void loadProjectData();
  }, [projectId]);

  // 加载视频文件
  // eslint-disable react-hooks/purity
  const handleLoadVideo = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: '视频文件',
            extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
          },
        ],
      });

      if (!selected || typeof selected !== 'string') {
        return;
      }

      // 开始分析视频
      setLoading(true);

      try {
        // 设置视频源
        setVideoSrc(`file://${selected}`);

        // 获取视频元数据
        const metadata = await tauriService.getVideoInfo(selected);
        setDuration(metadata.duration);

        // 创建一个默认片段
        const newSegment: VideoSegment = {
          // eslint-disable-next-line react-hooks/purity
          id: `segment-${Date.now()}`,
          start: 0,
          end: metadata.duration,
          type: 'video',
          content: '完整视频',
        };

        setSegments([newSegment]);

        // 添加到历史记录
        addToHistory([newSegment]);

        // 提取关键帧
        const frameCount = Math.max(5, Math.floor(metadata.duration / 10));
        const frames = await tauriService.generateThumbnails(selected, frameCount);

        setKeyframes(frames);

        toast.success('视频加载成功');
      } catch (error) {
        logger.error('视频分析失败:', error);
        toast.error('视频分析失败，请检查文件格式');
      } finally {
        setLoading(false);
      }
    } catch (err) {
      logger.error('选择文件失败:', err);
    }
  };

  // 播放/暂停视频
  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }

    setIsPlaying(!isPlaying);
  };

  // 视频时间更新
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  // 视频加载完成
  const handleVideoLoaded = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  // 添加到历史记录
  const addToHistory = (newSegments: VideoSegment[]) => {
    // 如果当前不在历史记录的末尾，移除后面的记录
    if (historyIndex < editHistory.length - 1) {
      setEditHistory(editHistory.slice(0, historyIndex + 1));
    }

    // 添加新记录
    setEditHistory([...editHistory, newSegments]);
    setHistoryIndex(historyIndex + 1);
  };

  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSegments(editHistory[historyIndex - 1]);
    }
  };

  // 重做
  const handleRedo = () => {
    if (historyIndex < editHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSegments(editHistory[historyIndex]);
    }
  };

  // 添加片段
  // eslint-disable react-hooks/purity
  const handleAddSegment = () => {
    // 创建一个5秒的新片段
    const newSegment: VideoSegment = {
      // eslint-disable-next-line react-hooks/purity
      id: `segment-${Date.now()}`,
      start: Math.min(currentTime, duration - 5),
      end: Math.min(currentTime + 5, duration),
      type: 'video',
      content: `片段 ${segments.length + 1}`,
    };

    const newSegments = [...segments, newSegment];
    setSegments(newSegments);
    addToHistory(newSegments);
    setSelectedSegmentIndex(newSegments.length - 1);
    toast.success('已添加新片段');
  };

  // 删除片段
  const handleDeleteSegment = (index: number) => {
    const newSegments = segments.filter((_, i) => i !== index);
    setSegments(newSegments);
    addToHistory(newSegments);
    setSelectedSegmentIndex(-1);
    toast.success('已删除片段');
  };

  // 选择片段
  const handleSelectSegment = (index: number) => {
    setSelectedSegmentIndex(index);

    // 设置播放头到片段起始位置
    if (videoRef.current && index >= 0 && segments[index]) {
      videoRef.current.currentTime = segments[index].start;
      setCurrentTime(segments[index].start);
    }
  };

  // 保存项目
  const handleSaveProject = async () => {
    setIsSaving(true);

    try {
      // 模拟保存
      await delay(1000);

      // 保存逻辑
      const projectToSave = {
        ...projectData,
        segments,
        updatedAt: new Date().toISOString(),
      };

      await tauriService.writeText(projectId || 'new', JSON.stringify(projectToSave));

      toast.success('项目保存成功');
    } catch (error) {
      logger.error('保存失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 导出视频
  const handleExportVideo = async () => {
    if (segments.length === 0) {
      toast.warning('请先添加需要导出的片段');
      return;
    }

    try {
      // 让用户选择输出文件路径
      const outputPath = await save({
        defaultPath: `export_${Date.now()}.${outputFormat}`,
        filters: [{ name: 'Video Files', extensions: [outputFormat] }],
      });

      if (!outputPath) {
        return; // 用户取消了
      }

      setIsExporting(true);
      setExportProgress(0);
      setExportStatus('正在准备导出...');

      // 准备片段数据
      const videoSegments = segments.map((seg) => ({
        start: seg.start,
        end: seg.end,
        type_field: null,
        content: null,
      }));

      // 模拟进度更新 (实际项目中可通过 WebSocket 或轮询获取真实进度)
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            return prev;
          }
          setExportStatus(
            prev === 0
              ? '正在处理视频...'
              : prev < 30
                ? '正在编码视频...'
                : prev < 60
                  ? '正在生成音频...'
                  : prev < 80
                    ? '正在合成...'
                    : '即将完成...'
          );
          return prev + Math.random() * 15;
        });
      }, 500);

      try {
        // 调用后端 cut_video 命令
        const result = await invoke<string>('cut_video', {
          params: {
            input_path: videoSrc.replace('tauri://localhost/', ''),
            output_path: outputPath,
            segments: videoSegments,
            quality: videoQuality,
            format: outputFormat,
            transition: 'none',
            transition_duration: 0.5,
            volume: 1.0,
            add_subtitles: false,
          },
        });

        // 完成进度
        setExportProgress(100);
        setExportStatus('导出完成!');

        toast.success(`视频导出成功: ${result}`);
      } finally {
        clearInterval(progressInterval);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error('导出失败:', error);
      toast.error(`导出失败: ${errorMessage}`);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus('');
      }, 1000);
    }
  };

  // 渲染顶部工具栏
  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <div className={styles.leftTools}>
        <Button type="primary" icon={<Upload />} onClick={handleLoadVideo} loading={loading}>
          加载视频
        </Button>

        <Tooltip title="撤销">
          <Button icon={<Undo />} disabled={historyIndex <= 0} onClick={handleUndo} />
        </Tooltip>

        <Tooltip title="重做">
          <Button
            icon={<Redo />}
            disabled={historyIndex >= editHistory.length - 1}
            onClick={handleRedo}
          />
        </Tooltip>

        <Tooltip title="添加片段">
          <Button icon={<Plus />} onClick={handleAddSegment} disabled={!videoSrc} />
        </Tooltip>
      </div>

      <div className={styles.rightTools}>
        <Button icon={<Save />} onClick={handleSaveProject} loading={isSaving} disabled={!videoSrc}>
          保存
        </Button>

        <Button
          type="primary"
          icon={<Download />}
          onClick={handleExportVideo}
          loading={isExporting}
          disabled={!videoSrc || segments.length === 0}
        >
          导出
        </Button>
      </div>
    </div>
  );

  // 渲染播放器控制栏
  const renderPlayerControls = () => (
    <div className={styles.playerControls}>
      <Button
        type="text"
        icon={isPlaying ? <PauseCircle /> : <PlayCircle />}
        onClick={togglePlayPause}
        size="large"
        disabled={!videoSrc}
      />

      <div className={styles.timeDisplay}>
        <Text>
          {formatTime(currentTime, { hours: 'always' })} / {formatTime(duration, { hours: 'always' })}
        </Text>
      </div>

      <div className={styles.progressBar}>
        <Progress
          percent={(currentTime / Math.max(duration, 1)) * 100}
          showInfo={false}
          strokeColor="#1E88E5"
          trailColor="#e6e6e6"
        />
      </div>

      <Tooltip title="全屏">
        <Button type="text" icon={<Maximize />} disabled={!videoSrc} />
      </Tooltip>
    </div>
  );

  // 渲染片段列表
  const renderSegmentList = () => (
    <div className={styles.segmentList}>
      <Title level={5} className={styles.sectionTitle}>
        片段列表
      </Title>

      {segments.length === 0 ? (
        <Empty description="暂无片段" image={undefined} />
      ) : (
        segments.map((segment, index) => (
          <Card
            key={index}
            className={`${styles.segmentCard} ${selectedSegmentIndex === index ? styles.selected : ''}`}
            onClick={() => handleSelectSegment(index)}
          >
            <div className={styles.segmentHeader}>
              <Text strong>片段 {index + 1}</Text>
              <Space>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<Trash2 />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSegment(index);
                    }}
                  />
                </Tooltip>
              </Space>
            </div>

            <div className={styles.segmentTime}>
              <Tag color="blue">
                {formatTime(segment.start, { hours: 'always' })} - {formatTime(segment.end, { hours: 'always' })}
              </Tag>
              <Text type="secondary">时长: {formatTime(segment.end - segment.start, { hours: 'always' })}</Text>
            </div>

            {segment.content && (
              <div className={styles.segmentContent}>
                <Text ellipsis>{segment.content}</Text>
              </div>
            )}
          </Card>
        ))
      )}

      <Button
        type="dashed"
        icon={<Plus />}
        block
        onClick={handleAddSegment}
        disabled={!videoSrc}
        className={styles.addSegmentButton}
      >
        添加片段
      </Button>
    </div>
  );

  // 渲染关键帧区域（用 useMemo 缓存，避免每次渲染重新创建 JSX）
  const keyframesEl = useMemo(
    () =>
      keyframes.length === 0 ? (
        <Empty description="暂无关键帧" image={undefined} />
      ) : (
        <div className={styles.keyframeList}>
          {keyframes.map((frame, index) => (
            <div key={index} className={styles.keyframeItem}>
              <img src={frame} alt={`关键帧 ${index + 1}`} className={styles.keyframeImage} />
            </div>
          ))}
        </div>
      ),
    [keyframes]
  );

  return (
    <div className={styles.editorLayout}>
      <div className={styles.editorContent}>
        {/* 导出进度弹窗 */}
        <Modal
          title="导出视频"
          open={isExporting}
          closable={false}
          footer={null}
          maskClosable={false}
          width={400}
        >
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Progress
              type="circle"
              percent={Math.round(exportProgress)}
              status={exportProgress >= 100 ? 'success' : 'active'}
            />
            <div style={{ marginTop: 20 }}>
              <Text strong>{exportStatus}</Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                格式: {outputFormat.toUpperCase()} | 质量:{' '}
                {videoQuality === 'low'
                  ? '低 (720p)'
                  : videoQuality === 'medium'
                    ? '中 (1080p)'
                    : videoQuality === 'high'
                      ? '高 (1080p)'
                      : '超清 (原画)'}
              </Text>
            </div>
          </div>
        </Modal>

        {renderToolbar()}

        <Row gutter={[24, 24]}>
          {/* 视频预览区 */}
          <Col span={16}>
            <Card className={styles.playerCard} title="视频预览">
              {videoSrc ? (
                <div className={styles.playerWrapper}>
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    className={styles.videoPlayer}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleVideoLoaded}
                    onClick={togglePlayPause}
                  >
                    <track kind="captions" src="" label="Captions" default={false} />
                  </video>
                  {renderPlayerControls()}
                </div>
              ) : (
                <div className={styles.emptyPlayer}>
                  <Button type="primary" icon={<Upload />} onClick={handleLoadVideo} size="large">
                    加载视频
                  </Button>
                  <Text type="secondary" style={{ marginTop: 16 }}>
                    支持MP4, MOV, AVI, MKV等格式
                  </Text>
                </div>
              )}
            </Card>

            {/* 时间轴 */}
            <div className={styles.timelineContainer}>
              <div className={styles.timeline} ref={timelineRef}>
                {segments.map((segment, index) => (
                  <div
                    key={index}
                    className={`${styles.timelineSegment} ${selectedSegmentIndex === index ? styles.selected : ''}`}
                    style={{
                      left: `${(segment.start / Math.max(duration, 1)) * 100}%`,
                      width: `${((segment.end - segment.start) / Math.max(duration, 1)) * 100}%`,
                    }}
                    onClick={() => handleSelectSegment(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleSelectSegment(index);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.segmentHandle} />
                    <div className={styles.segmentLabel}>{index + 1}</div>
                    <div className={styles.segmentHandle} />
                  </div>
                ))}

                {/* 播放头 */}
                <div
                  className={styles.playhead}
                  style={{
                    left: `${(currentTime / Math.max(duration, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </Col>

          {/* 右侧工具面板 */}
          <Col span={8}>
            <Tabs defaultActiveKey="trim" className={styles.editorTabs}>
              <TabPane tab="片段" key="trim">
                {renderSegmentList()}
              </TabPane>

              <TabPane tab="关键帧" key="keyframes">
                <div className={styles.keyframesContainer}>
                  <Title level={5} className={styles.sectionTitle}>
                    关键帧
                  </Title>
                  {keyframesEl}
                </div>
              </TabPane>

              <TabPane tab="效果" key="effects">
                <div className={styles.effectsPanel}>
                  <Title level={5} className={styles.sectionTitle}>
                    视频效果
                  </Title>
                  <Empty description="此功能正在开发中" />
                </div>
              </TabPane>

              <TabPane tab="设置" key="settings">
                <div className={styles.settingsPanel}>
                  <Title level={5} className={styles.sectionTitle}>
                    导出设置
                  </Title>

                  <Card className={styles.settingCard}>
                    <div className={styles.settingItem}>
                      <Text strong>输出格式</Text>
                      <Dropdown
                        menu={{
                          items: [
                            { key: 'mp4', label: 'MP4 (H.264+AAC)' },
                            { key: 'mov', label: 'MOV (H.264+AAC)' },
                            { key: 'mkv', label: 'MKV (H.264+AAC)' },
                            { key: 'webm', label: 'WebM (VP9+Opus)' },
                          ],
                          onClick: ({ key }) => setOutputFormat(key),
                        }}
                      >
                        <Button>
                          {outputFormat.toUpperCase()} <Download />
                        </Button>
                      </Dropdown>
                    </div>

                    <div className={styles.settingItem}>
                      <Text strong>视频质量</Text>
                      <Dropdown
                        menu={{
                          items: [
                            { key: 'low', label: '低 (720p, 1.5Mbps)' },
                            { key: 'medium', label: '中 (1080p, 4Mbps)' },
                            { key: 'high', label: '高 (1080p, 8Mbps)' },
                            { key: 'ultra', label: '超清 (原画, 15Mbps)' },
                          ],
                          onClick: ({ key }) => setVideoQuality(key),
                        }}
                      >
                        <Button>
                          {videoQuality === 'low'
                            ? '低 (720p)'
                            : videoQuality === 'medium'
                              ? '中 (1080p)'
                              : videoQuality === 'high'
                                ? '高 (1080p)'
                                : '超清 (原画)'}{' '}
                          <Download />
                        </Button>
                      </Dropdown>
                    </div>
                  </Card>
                </div>
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default VideoEditor;
