import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import {
  Upload,
  Trash2,
  PlayCircle,
  PauseCircle,
  Volume2,
  Headphones,
  Music,
  Settings,
  MicOff,
  Folder,
} from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Popconfirm,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/confirm-dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import {
  message,
  Space,
  Tag,
  Row,
  Col,
  Table,
  Empty,
  Progress,
} from '@/components/ui/ui-components';
import { logger } from '@/core/utils/logger';
import { formatTime, generateId } from '@/shared/utils';

import styles from './AudioEditor.module.less';

// ========== 类型定义 ==========

// 配音轨道类型
export interface VoiceTrack {
  id: string;
  name: string;
  filePath: string;
  fileUrl?: string;
  duration: number;
  startTime: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  type: 'dubbing' | 'voiceover';
}

// 背景音乐类型
export interface BackgroundMusic {
  id: string;
  name: string;
  filePath: string;
  fileUrl?: string;
  duration: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  loop: boolean;
  startTime: number;
}

// 音效类型
export interface SoundEffect {
  id: string;
  name: string;
  filePath: string;
  fileUrl?: string;
  duration: number;
  volume: number;
  startTime: number;
  category: string;
}

// 音频轨道完整配置
export interface AudioTrackConfig {
  voiceTracks: VoiceTrack[];
  backgroundMusic: BackgroundMusic | null;
  soundEffects: SoundEffect[];
  masterVolume: number;
  voiceVolume: number;
  musicVolume: number;
  effectVolume: number;
}

// 组件属性
interface AudioEditorProps {
  projectId?: string;
  onSave?: (config: AudioTrackConfig) => void;
  initialConfig?: Partial<AudioTrackConfig>;
  onConfigChange?: (config: AudioTrackConfig) => void;
  videoDuration?: number;
  disabled?: boolean;
}

import {
  PRESET_BGM_LIST,
  PRESET_SFX_LIST,
  DEFAULT_VOLUME,
} from '@panel-flow/common/constants';

function AudioEditor({
  initialConfig,
  onConfigChange,
  videoDuration = 60,
  disabled = false,
}: AudioEditorProps) {
  // ========== State ==========
  const [voiceTracks, setVoiceTracks] = useState<VoiceTrack[]>(initialConfig?.voiceTracks || []);
  const [backgroundMusic, setBackgroundMusic] = useState<BackgroundMusic | null>(
    initialConfig?.backgroundMusic || null
  );
  const [soundEffects, setSoundEffects] = useState<SoundEffect[]>(
    initialConfig?.soundEffects || []
  );
  const [masterVolume, setMasterVolume] = useState(initialConfig?.masterVolume ?? DEFAULT_VOLUME.master);
  const [voiceVolume, setVoiceVolume] = useState(initialConfig?.voiceVolume ?? DEFAULT_VOLUME.voice);
  const [musicVolume, setMusicVolume] = useState(initialConfig?.musicVolume ?? DEFAULT_VOLUME.music);
  const [effectVolume, setEffectVolume] = useState(initialConfig?.effectVolume ?? DEFAULT_VOLUME.effect);
  const [activeTab, setActiveTab] = useState('voice');

  // 播放状态
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [playingMusic, setPlayingMusic] = useState(false);
  const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);

  // 录音状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 音频元素引用
  const voiceAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // ========== Effects ==========

  // 通知配置变化 - 使用 useMemo 避免每次创建新对象
  const audioConfig = useMemo(() => ({
    voiceTracks,
    backgroundMusic,
    soundEffects,
    masterVolume,
    voiceVolume,
    musicVolume,
    effectVolume,
  }), [voiceTracks, backgroundMusic, soundEffects, masterVolume, voiceVolume, musicVolume, effectVolume]);

  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(audioConfig);
    }
  }, [audioConfig, onConfigChange]);

  // 清理音频元素
  useEffect(() => {
    // Capture refs at effect time to use in cleanup
    const voiceRefs = voiceAudioRefs.current;
    const sfxRefs = sfxAudioRefs.current;
    const musicRef = musicAudioRef.current;

    return () => {
      voiceRefs.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      if (musicRef) {
        musicRef.pause();
        musicRef.src = '';
      }
      sfxRefs.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      // Revoke blob URLs for all voice tracks on unmount to prevent memory leaks
      voiceTracks.forEach((track) => {
        if (track.fileUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(track.fileUrl);
        }
      });
    };
  }, [voiceTracks]);

  // ========== 配音轨道处理 ==========
  const handleVoiceImport = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: '音频文件',
            extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
          },
        ],
      });

      if (!selected || !Array.isArray(selected)) {
        return;
      }

      const newTracks: VoiceTrack[] = [];
      for (const filePath of selected) {
        const fileName = filePath.split('/').pop() || '配音音频';
        const audio = new Audio(convertFileSrc(filePath));

        await new Promise<void>((resolve) => {
          audio.onloadedmetadata = () => {
            newTracks.push({
              id: generateId(),
              name: fileName.replace(/\.[^/.]+$/, ''),
              filePath,
              fileUrl: convertFileSrc(filePath),
              duration: audio.duration,
              startTime: 0,
              volume: 80,
              fadeIn: 0,
              fadeOut: 0,
              type: 'dubbing',
            });
            resolve();
          };
          audio.onerror = () => {
            message.error(`无法加载音频文件: ${fileName}`);
            resolve();
          };
        });
      }

      if (newTracks.length > 0) {
        setVoiceTracks([...voiceTracks, ...newTracks]);
        message.success(`成功导入 ${newTracks.length} 个配音文件`);
      }
    } catch (error) {
      logger.error('导入配音失败:', error);
      message.error('导入配音失败，请重试');
    }
  };

  const handleVoiceRemove = (id: string) => {
    const track = voiceTracks.find((t) => t.id === id);
    // Revoke blob URL to prevent memory leak
    if (track?.fileUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(track.fileUrl);
    }
    setVoiceTracks(voiceTracks.filter((track) => track.id !== id));
    message.success('配音已移除');
  };

  const handleVoicePlay = (track: VoiceTrack) => {
    if (playingVoiceId === track.id) {
      const audio = voiceAudioRefs.current.get(track.id);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingVoiceId(null);
    } else {
      // 停止其他音频
      voiceAudioRefs.current.forEach((audio, id) => {
        if (id !== track.id) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        setPlayingMusic(false);
      }
      sfxAudioRefs.current.forEach((audio, _id) => {
        audio.pause();
        audio.currentTime = 0;
      });
      setPlayingSfxId(null);

      let audio = voiceAudioRefs.current.get(track.id);
      if (!audio && track.fileUrl) {
        audio = new Audio(track.fileUrl);
        voiceAudioRefs.current.set(track.id, audio);
      }
      if (audio) {
        audio.volume = (track.volume / 100) * (voiceVolume / 100) * (masterVolume / 100);
        audio.play();
        setPlayingVoiceId(track.id);
        audio.onended = () => setPlayingVoiceId(null);
      }
    }
  };

  const handleVoiceVolumeChange = (id: string, volume: number) => {
    setVoiceTracks(voiceTracks.map((track) => (track.id === id ? { ...track, volume } : track)));
  };

  const handleVoiceStartTimeChange = (id: string, startTime: number) => {
    setVoiceTracks(voiceTracks.map((track) => (track.id === id ? { ...track, startTime } : track)));
  };

  // ========== 背景音乐处理 ==========
  const handleMusicSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: '音频文件',
            extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
          },
        ],
      });

      if (!selected || Array.isArray(selected)) {
        return;
      }

      const filePath = selected as string;
      const fileName = filePath.split('/').pop() || '背景音乐';
      const audio = new Audio(convertFileSrc(filePath));

      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => {
          setBackgroundMusic({
            id: generateId(),
            name: fileName.replace(/\.[^/.]+$/, ''),
            filePath,
            fileUrl: convertFileSrc(filePath),
            duration: audio.duration,
            volume: 50,
            fadeIn: 2,
            fadeOut: 2,
            loop: true,
            startTime: 0,
          });
          message.success('背景音乐添加成功');
          resolve();
        };
        audio.onerror = () => {
          message.error('无法加载音频文件');
          resolve();
        };
      });
    } catch (error) {
      logger.error('选择背景音乐失败:', error);
      message.error('选择背景音乐失败，请重试');
    }
  };

  const handleMusicRemove = () => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.src = '';
    }
    setBackgroundMusic(null);
    setPlayingMusic(false);
    message.success('背景音乐已移除');
  };

  const handleMusicPlay = () => {
    if (!backgroundMusic) return;

    if (playingMusic) {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.currentTime = 0;
      }
      setPlayingMusic(false);
    } else {
      // 停止其他音频
      voiceAudioRefs.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      setPlayingVoiceId(null);
      sfxAudioRefs.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      setPlayingSfxId(null);

      let audio = musicAudioRef.current;
      if (!audio && backgroundMusic.fileUrl) {
        audio = new Audio(backgroundMusic.fileUrl);
        audio.loop = true;
        musicAudioRef.current = audio;
      }
      if (audio) {
        audio.volume = (backgroundMusic.volume / 100) * (musicVolume / 100) * (masterVolume / 100);
        audio.play();
        setPlayingMusic(true);
      }
    }
  };

  const handleMusicVolumeChange = (volume: number) => {
    if (backgroundMusic) {
      setBackgroundMusic({ ...backgroundMusic, volume });
    }
  };

  const handleMusicLoopChange = (loop: boolean) => {
    if (backgroundMusic) {
      setBackgroundMusic({ ...backgroundMusic, loop });
      if (musicAudioRef.current) {
        musicAudioRef.current.loop = loop;
      }
    }
  };

  // ========== 音效处理 ==========
  const handleSfxImport = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: '音频文件',
            extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'],
          },
        ],
      });

      if (!selected || !Array.isArray(selected)) {
        return;
      }

      const newEffects: SoundEffect[] = [];
      for (const filePath of selected) {
        const fileName = filePath.split('/').pop() || '音效';
        const audio = new Audio(convertFileSrc(filePath));

        await new Promise<void>((resolve) => {
          audio.onloadedmetadata = () => {
            newEffects.push({
              id: generateId(),
              name: fileName.replace(/\.[^/.]+$/, ''),
              filePath,
              fileUrl: convertFileSrc(filePath),
              duration: audio.duration,
              volume: 80,
              startTime: 0,
              category: '自定义',
            });
            resolve();
          };
          audio.onerror = () => {
            message.error(`无法加载音频文件: ${fileName}`);
            resolve();
          };
        });
      }

      if (newEffects.length > 0) {
        setSoundEffects([...soundEffects, ...newEffects]);
        message.success(`成功导入 ${newEffects.length} 个音效文件`);
      }
    } catch (error) {
      logger.error('导入音效失败:', error);
      message.error('导入音效失败，请重试');
    }
  };

  const handleSfxRemove = (id: string) => {
    setSoundEffects(soundEffects.filter((effect) => effect.id !== id));
    message.success('音效已移除');
  };

  const handleSfxPlay = (effect: SoundEffect) => {
    if (playingSfxId === effect.id) {
      const audio = sfxAudioRefs.current.get(effect.id);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingSfxId(null);
    } else {
      // 停止其他音频
      voiceAudioRefs.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      setPlayingVoiceId(null);
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        setPlayingMusic(false);
      }
      sfxAudioRefs.current.forEach((audio, _sfxId) => {
        if (_sfxId !== effect.id) {
          audio.pause();
          audio.currentTime = 0;
        }
      });

      let audio = sfxAudioRefs.current.get(effect.id);
      if (!audio && effect.fileUrl) {
        audio = new Audio(effect.fileUrl);
        sfxAudioRefs.current.set(effect.id, audio);
      }
      if (audio) {
        audio.volume = (effect.volume / 100) * (effectVolume / 100) * (masterVolume / 100);
        audio.play();
        setPlayingSfxId(effect.id);
        audio.onended = () => setPlayingSfxId(null);
      }
    }
  };

  const handleSfxVolumeChange = (id: string, volume: number) => {
    setSoundEffects(
      soundEffects.map((effect) => (effect.id === id ? { ...effect, volume } : effect))
    );
  };

  const handleSfxStartTimeChange = (id: string, startTime: number) => {
    setSoundEffects(
      soundEffects.map((effect) => (effect.id === id ? { ...effect, startTime } : effect))
    );
  };

  // ========== 录音功能 ==========
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const fileName = `录音_${formatTime(recordingTime)}`;

        const newTrack: VoiceTrack = {
          id: generateId(),
          name: fileName,
          filePath: '',
          fileUrl: url,
          duration: recordingTime,
          startTime: 0,
          volume: 80,
          fadeIn: 0,
          fadeOut: 0,
          type: 'voiceover',
        };

        setVoiceTracks([...voiceTracks, newTrack]);
        message.success('录音完成');
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 录音计时
      const timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // 存储timer引用以便清除
      recordingTimerRef.current = timer;
    } catch (error) {
      logger.error('开始录音失败:', error);
      message.error('无法访问麦克风，请检查权限设置');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // ========== 渲染组件 ==========

  // 配音轨道表格列
  const voiceColumns = [
    {
      title: '状态',
      dataIndex: 'id',
      key: 'status',
      width: 60,
      render: (_: unknown, record: VoiceTrack) => (
        <Button
          type="text"
          size="small"
          icon={playingVoiceId === record.id ? <PauseCircle /> : <PlayCircle />}
          onClick={() => handleVoicePlay(record)}
        />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (duration: number) => formatTime(duration),
    },
    {
      title: '音量',
      dataIndex: 'volume',
      key: 'volume',
      width: 120,
      render: (volume: number, record: VoiceTrack) => (
        <Slider
          min={0}
          max={100}
          value={volume}
          onChange={(value) => handleVoiceVolumeChange(record.id, value)}
          disabled={disabled}
        />
      ),
    },
    {
      title: '起始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 120,
      render: (startTime: number, record: VoiceTrack) => (
        <Slider
          min={0}
          max={Math.max(videoDuration - 1, 0)}
          step={0.1}
          value={startTime}
          onChange={(value) => handleVoiceStartTimeChange(record.id, value)}
          disabled={disabled}
          tooltip={{ formatter: (value) => (value ? formatTime(value) : '00:00') }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: VoiceTrack) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="text" danger icon={<Trash2 />} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认移除此配音?</AlertDialogTitle>
              <AlertDialogDescription />
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleVoiceRemove(record.id)}>
                确认
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ];

  // 音效表格列
  const sfxColumns = [
    {
      title: '状态',
      dataIndex: 'id',
      key: 'status',
      width: 60,
      render: (_: unknown, record: SoundEffect) => (
        <Button
          type="text"
          size="small"
          icon={playingSfxId === record.id ? <PauseCircle /> : <PlayCircle />}
          onClick={() => handleSfxPlay(record)}
        />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => <Tag>{category}</Tag>,
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (duration: number) => formatTime(duration),
    },
    {
      title: '音量',
      dataIndex: 'volume',
      key: 'volume',
      width: 120,
      render: (volume: number, record: SoundEffect) => (
        <Slider
          min={0}
          max={100}
          value={volume}
          onChange={(value) => handleSfxVolumeChange(record.id, value)}
          disabled={disabled}
        />
      ),
    },
    {
      title: '起始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 120,
      render: (startTime: number, record: SoundEffect) => (
        <Slider
          min={0}
          max={Math.max(videoDuration - 1, 0)}
          step={0.1}
          value={startTime}
          onChange={(value) => handleSfxStartTimeChange(record.id, value)}
          disabled={disabled}
          tooltip={{ formatter: (value) => (value ? formatTime(value) : '00:00') }}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: SoundEffect) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="text" danger icon={<Trash2 />} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认移除此音效?</AlertDialogTitle>
              <AlertDialogDescription />
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleSfxRemove(record.id)}>确认</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <Volume2 />
          <span>配音配乐编辑</span>
        </Space>
      }
      className={styles.audioEditor}
      extra={
        <Space>
          <Tooltip title="总音量">
            <div className={styles.masterVolumeControl}>
              <Volume2 />
              <Slider
                min={0}
                max={100}
                value={masterVolume}
                onChange={setMasterVolume}
                disabled={disabled}
                className={styles.masterSlider}
              />
              <span>{masterVolume}%</span>
            </div>
          </Tooltip>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={[
          {
            key: 'voice',
            label: (
              <Space>
                <Headphones />
                <span>配音轨道</span>
                <Tag color="blue">{voiceTracks.length}</Tag>
              </Space>
            ),
            children: (
              <div className={styles.tabContent}>
                <div className={styles.toolbar}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<MicOff />}
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      danger={isRecording}
                      disabled={disabled}
                    >
                      {isRecording ? `停止录音 (${formatTime(recordingTime)})` : '开始录音'}
                    </Button>
                    <Button icon={<Upload />} onClick={handleVoiceImport} disabled={disabled}>
                      导入配音
                    </Button>
                  </Space>
                </div>

                {voiceTracks.length > 0 ? (
                  <Table
                    dataSource={voiceTracks as any}
                    columns={voiceColumns as any}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    className={styles.trackTable}
                  />
                ) : (
                  <Empty image={undefined} description="暂无配音，点击上方按钮添加" />
                )}
              </div>
            ),
          },
          {
            key: 'music',
            label: (
              <Space>
                <Music />
                <span>背景音乐</span>
                {backgroundMusic && <Tag color="green">已添加</Tag>}
              </Space>
            ),
            children: (
              <div className={styles.tabContent}>
                <div className={styles.musicSection}>
                  {backgroundMusic ? (
                    <Card className={styles.musicCard} size="small">
                      <div className={styles.musicInfo}>
                        <div className={styles.musicName}>{backgroundMusic.name}</div>
                        <div className={styles.musicMeta}>
                          <span>时长: {formatTime(backgroundMusic.duration)}</span>
                          <span>
                            循环:{' '}
                            <Switch
                              size="small"
                              checked={backgroundMusic.loop}
                              onChange={handleMusicLoopChange}
                              disabled={disabled}
                            />
                          </span>
                        </div>
                      </div>

                      <div className={styles.musicControls}>
                        <Button
                          type="primary"
                          icon={playingMusic ? <PauseCircle /> : <PlayCircle />}
                          onClick={handleMusicPlay}
                          disabled={disabled}
                        >
                          {playingMusic ? '暂停' : '播放'}
                        </Button>
                        <Popconfirm
                          title="确认移除背景音乐?"
                          onConfirm={handleMusicRemove}
                          okText="确认"
                          cancelText="取消"
                        >
                          <Button danger icon={<Trash2 />} disabled={disabled}>
                            移除
                          </Button>
                        </Popconfirm>
                      </div>

                      <div className={styles.volumeControl}>
                        <span>音量:</span>
                        <Slider
                          min={0}
                          max={100}
                          value={backgroundMusic.volume}
                          onChange={handleMusicVolumeChange}
                          disabled={disabled}
                        />
                        <span>{backgroundMusic.volume}%</span>
                      </div>

                      <div className={styles.fadeControl}>
                        <div className={styles.fadeItem}>
                          <span>淡入:</span>
                          <Slider
                            min={0}
                            max={10}
                            step={0.5}
                            value={backgroundMusic.fadeIn}
                            onChange={(value) =>
                              setBackgroundMusic({ ...backgroundMusic, fadeIn: value })
                            }
                            disabled={disabled}
                          />
                          <span>{backgroundMusic.fadeIn}s</span>
                        </div>
                        <div className={styles.fadeItem}>
                          <span>淡出:</span>
                          <Slider
                            min={0}
                            max={10}
                            step={0.5}
                            value={backgroundMusic.fadeOut}
                            onChange={(value) =>
                              setBackgroundMusic({ ...backgroundMusic, fadeOut: value })
                            }
                            disabled={disabled}
                          />
                          <span>{backgroundMusic.fadeOut}s</span>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className={styles.musicSelectArea}>
                      <div className={styles.selectButtons}>
                        <Button
                          type="primary"
                          icon={<Folder />}
                          onClick={handleMusicSelect}
                          disabled={disabled}
                          size="large"
                        >
                          选择本地音乐
                        </Button>
                      </div>

                      <div className={styles.presetSection}>
                        <div className={styles.presetTitle}>推荐背景音乐</div>
                        <div className={styles.presetList}>
                          {PRESET_BGM_LIST.map((bgm) => (
                            <Tag
                              key={bgm.id}
                              className={styles.presetTag}
                              onClick={() => message.info(`将使用预设音乐: ${bgm.name}`)}
                            >
                              {bgm.name}
                              <span className={styles.presetMeta}>- {bgm.category}</span>
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'effects',
            label: (
              <Space>
                <Volume2 />
                <span>音效</span>
                <Tag color="purple">{soundEffects.length}</Tag>
              </Space>
            ),
            children: (
              <div className={styles.tabContent}>
                <div className={styles.toolbar}>
                  <Space>
                    <Button icon={<Upload />} onClick={handleSfxImport} disabled={disabled}>
                      导入音效
                    </Button>
                  </Space>
                </div>

                {soundEffects.length > 0 ? (
                  <Table
                    dataSource={soundEffects as any}
                    columns={sfxColumns as any}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    className={styles.trackTable}
                  />
                ) : (
                  <Empty image={undefined} description="暂无音效，点击上方按钮添加">
                    <div className={styles.presetSfxSection}>
                      <div className={styles.presetTitle}>预设音效分类</div>
                      <div className={styles.presetList}>
                        {PRESET_SFX_LIST.map((sfx) => (
                          <Tag
                            key={sfx.id}
                            className={styles.presetTag}
                            color="blue"
                            onClick={() => message.info(`将使用预设音效: ${sfx.name}`)}
                          >
                            {sfx.name}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </Empty>
                )}
              </div>
            ),
          },
          {
            key: 'mix',
            label: (
              <Space>
                <Settings />
                <span>混音设置</span>
              </Space>
            ),
            children: (
              <div className={styles.tabContent}>
                <Row gutter={[24, 24]}>
                  <Col xs={24} sm={12} md={6}>
                    <Card className={styles.mixCard} size="small">
                      <div className={styles.mixTitle}>
                        <Headphones /> 配音音量
                      </div>
                      <Progress percent={voiceVolume} status="active" />
                      <Slider
                        min={0}
                        max={100}
                        value={voiceVolume}
                        onChange={setVoiceVolume}
                        disabled={disabled}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card className={styles.mixCard} size="small">
                      <div className={styles.mixTitle}>
                        <Music /> 音乐音量
                      </div>
                      <Progress percent={musicVolume} status="active" />
                      <Slider
                        min={0}
                        max={100}
                        value={musicVolume}
                        onChange={setMusicVolume}
                        disabled={disabled}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card className={styles.mixCard} size="small">
                      <div className={styles.mixTitle}>
                        <Volume2 /> 音效音量
                      </div>
                      <Progress percent={effectVolume} status="active" />
                      <Slider
                        min={0}
                        max={100}
                        value={effectVolume}
                        onChange={setEffectVolume}
                        disabled={disabled}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card className={styles.mixCard} size="small">
                      <div className={styles.mixTitle}>
                        <span className={styles.masterIcon}>M</span> 主音量
                      </div>
                      <Progress percent={masterVolume} status="active" />
                      <Slider
                        min={0}
                        max={100}
                        value={masterVolume}
                        onChange={setMasterVolume}
                        disabled={disabled}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card className={styles.summaryCard} size="small" title="音频轨道概览">
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={8}>
                      <div className={styles.summaryItem}>
                        <Headphones /> 配音轨道: <strong>{voiceTracks.length}</strong>
                      </div>
                    </Col>
                    <Col xs={24} sm={8}>
                      <div className={styles.summaryItem}>
                        <Music /> 背景音乐: <strong>{backgroundMusic ? '1' : '0'}</strong>
                      </div>
                    </Col>
                    <Col xs={24} sm={8}>
                      <div className={styles.summaryItem}>
                        <Volume2 /> 音效: <strong>{soundEffects.length}</strong>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}

export default AudioEditor;
