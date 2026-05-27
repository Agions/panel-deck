/**
 * PreviewPanel — 实时预览面板
 * 在分镜和合成环节提供实时预览，支持调整参数后即时刷新
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  RefreshCw,
  Maximize2,
  Settings2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Move,
  ZoomIn,
  ZoomOut,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Slider } from '@/components/ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Frame, PreviewOptions } from '@/shared/types/preview';
import styles from './PreviewPanel.module.css';

// ============================================
// Types
// ============================================

export interface PreviewPanelProps {
  frames: Frame[];
  currentFrameIndex?: number;
  isPlaying?: boolean;
  playbackRate?: number;
  options?: PreviewOptions;
  onFrameSelect?: (index: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onRefresh?: () => void;
  onOptionsChange?: (options: PreviewOptions) => void;
  onFullscreen?: () => void;
  renderFrame?: (frame: Frame, options: PreviewOptions) => ReactNode;
}

interface PreviewControlsProps {
  isPlaying: boolean;
  playbackRate: number;
  currentFrame: number;
  totalFrames: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (frame: number) => void;
  onRateChange: (rate: number) => void;
}

// ============================================
// Preview Panel
// ============================================

export function PreviewPanel({
  frames,
  currentFrameIndex = 0,
  isPlaying = false,
  playbackRate = 1,
  options = {},
  onFrameSelect,
  onPlay,
  onPause,
  onRefresh,
  onOptionsChange,
  onFullscreen,
  renderFrame,
}: PreviewPanelProps): React.ReactElement {
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentFrame = frames[currentFrameIndex];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          void (isPlaying ? onPause?.() : onPlay?.());
          break;
        case 'ArrowRight':
          e.preventDefault();
          onFrameSelect?.(Math.min(currentFrameIndex + 1, frames.length - 1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onFrameSelect?.(Math.max(currentFrameIndex - 1, 0));
          break;
        case 'f':
          e.preventDefault();
          onFullscreen?.();
          break;
        case 'r':
          e.preventDefault();
          onRefresh?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentFrameIndex, frames.length, onPlay, onPause, onFrameSelect, onFullscreen, onRefresh]);

  const handleOptionChange = useCallback(
    (key: keyof PreviewOptions, value: number | string | boolean) => {
      onOptionsChange?.({ ...options, [key]: value });
    },
    [options, onOptionsChange]
  );

  if (!currentFrame) {
    return (
      <div className={styles.emptyState} role="status">
        <div className={styles.emptyIcon} aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <path d="M10 8l6 4-6 4V8z" />
          </svg>
        </div>
        <p className={styles.emptyText}>暂无预览内容</p>
      </div>
    );
  }

  return (
    <div
      className={styles.previewPanel}
      ref={containerRef}
      role="region"
      aria-label="实时预览"
    >
      {/* Toolbar */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.frameLabel}>
            帧 {currentFrameIndex + 1} / {frames.length}
          </span>
        </div>
        <div className={styles.toolbarRight}>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              aria-label="刷新预览"
              title="刷新 (R)"
            >
              <RefreshCw size={16} />
            </Button>
          )}
          {onFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onFullscreen}
              aria-label="全屏"
              title="全屏 (F)"
            >
              <Maximize2 size={16} />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="设置" title="设置">
                <Settings2 size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={styles.settingsDropdown}>
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>缩放</label>
                <div className={styles.settingsControl}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOptionChange('zoom', Math.max(0.5, (options.zoom ?? 1) - 0.25))}
                    aria-label="缩小"
                  >
                    <ZoomOut size={14} />
                  </Button>
                  <span className={styles.settingsValue}>{Math.round((options.zoom ?? 1) * 100)}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOptionChange('zoom', Math.min(3, (options.zoom ?? 1) + 0.25))}
                    aria-label="放大"
                  >
                    <ZoomIn size={14} />
                  </Button>
                </div>
              </div>
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>帧率</label>
                <Slider
                  min={0.25}
                  max={2}
                  step={0.25}
                  value={[playbackRate]}
                  onValueChange={(val) => handleOptionChange('playbackRate', Array.isArray(val) ? val[0] : val)}
                  className={styles.settingsSlider}
                />
                <span className={styles.settingsValue}>{playbackRate}x</span>
              </div>
              <div className={styles.settingsGroup}>
                <label className={styles.settingsLabel}>质量</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={styles.qualityButton}>
                      {options.quality ?? 'high'}
                      <ChevronDown size={12} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {['low', 'medium', 'high', 'ultra'].map((q) => (
                      <DropdownMenuItem key={q} onSelect={() => handleOptionChange('quality', q)}>
                        {q.charAt(0).toUpperCase() + q.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Preview Canvas */}
      <div
        className={styles.canvas}
        style={{ transform: `scale(${options.zoom ?? 1})` }}
        role="img"
        aria-label={`预览帧 ${currentFrameIndex + 1}`}
      >
        {renderFrame ? (
          renderFrame(currentFrame, options)
        ) : (
          <div className={styles.frameContent}>
            {currentFrame.imageUrl ? (
              <img
                src={currentFrame.imageUrl}
                alt={`帧 ${currentFrameIndex + 1}`}
                className={styles.frameImage}
                loading="lazy"
              />
            ) : (
              <div className={styles.framePlaceholder}>
                <span>帧 {currentFrameIndex + 1}</span>
              </div>
            )}
            {currentFrame.overlay && (
              <div className={styles.frameOverlay}>{currentFrame.overlay}</div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <PreviewControls
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        currentFrame={currentFrameIndex}
        totalFrames={frames.length}
        onPlay={onPlay ?? (() => {})}
        onPause={onPause ?? (() => {})}
        onSeek={onFrameSelect ?? (() => {})}
        onRateChange={(rate) => handleOptionChange('playbackRate', rate)}
      />

      {/* Thumbnail Strip */}
      <div className={styles.thumbnailStrip} role="listbox" aria-label="帧缩略图">
        {frames.map((frame, idx) => (
          <button
            key={frame.id ?? idx}
            className={`${styles.thumbnail} ${idx === currentFrameIndex ? styles.thumbnailActive : ''}`}
            onClick={() => onFrameSelect?.(idx)}
            role="option"
            aria-selected={idx === currentFrameIndex}
            aria-label={`跳转到帧 ${idx + 1}`}
          >
            <span className={styles.thumbnailIndex}>{idx + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Preview Controls
// ============================================

function PreviewControls({
  isPlaying,
  playbackRate,
  currentFrame,
  totalFrames,
  onPlay,
  onPause,
  onSeek,
  onRateChange,
}: PreviewControlsProps): React.ReactElement {
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className={styles.controls} role="toolbar" aria-label="播放控制">
      {/* Seek Bar */}
      <div className={styles.seekBar}>
        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrame}
          onChange={(e) => onSeek(Number(e.target.value))}
          className={styles.seekInput}
          aria-label={`跳转到帧 ${currentFrame + 1}`}
        />
        <div className={styles.seekProgress}>
          <div
            className={styles.seekFill}
            style={{ width: `${(currentFrame / (totalFrames - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className={styles.controlButtons}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSeek(Math.max(0, currentFrame - 1))}
          aria-label="上一帧"
          disabled={currentFrame === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 5v14l-8-7 8-7zM5 5h2v14H5V5z" transform="rotate(180 12 12)" />
          </svg>
        </Button>

        <Button
          variant="default"
          size="icon"
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? '暂停' : '播放'}
          className={styles.playButton}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSeek(Math.min(totalFrames - 1, currentFrame + 1))}
          aria-label="下一帧"
          disabled={currentFrame === totalFrames - 1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 5v14l8-7-8-7zM19 5h2v14h-2V5z" />
          </svg>
        </Button>

        <div className={styles.controlSpacer} />

        <span className={styles.timeDisplay}>
          {formatTime(currentFrame)} / {formatTime(totalFrames)}
        </span>

        <div className={styles.controlSpacer} />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted((v) => !v)}
          aria-label={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </Button>

        <select
          className={styles.rateSelect}
          value={playbackRate}
          onChange={(e) => onRateChange(Number(e.target.value))}
          aria-label="播放速率"
        >
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
            <option key={rate} value={rate}>
              {rate}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function formatTime(frame: number): string {
  const seconds = Math.floor(frame / 30);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default PreviewPanel;