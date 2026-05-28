import { Type, Volume2, Image, Save, Download } from 'lucide-react';
import React, { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import styles from './PropertyPanel.module.less';

interface PropertyPanelProps {
  selectedSegment?: {
    id: string;
    name: string;
    start: number;
    end: number;
    type: string;
  };
  videoInfo?: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    format: string;
  };
  exportSettings?: {
    format: string;
    quality: string;
    resolution: string;
    aspectRatio: string;
    cropMode: string;
    cropAlignment: string;
    smartCropEnabled: boolean;
  };
  onExportSettingsChange?: (settings: Record<string, unknown>) => void;
  onSaveSegment?: () => void;
}

// 字幕设置
const SubtitleSettings = () => (
  <div className={styles.settingsGroup}>
    <h5 className={styles.groupTitle}>
      <Type size={16} style={{ display: 'inline', marginRight: 6 }} /> 字幕设置
    </h5>

    <div className={styles.formWrapper}>
      <div className={styles.formItem}>
        <label className={styles.label}>字幕内容</label>
        <Textarea rows={4} placeholder="输入字幕文本..." className={styles.textArea} />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formItem}>
          <label className={styles.label}>字体大小</label>
          <Slider min={12} max={72} defaultValue={24} className={styles.slider} />
        </div>
        <div className={styles.formItem}>
          <label className={styles.label}>字体颜色</label>
          <input type="color" className={styles.colorInput} defaultValue="#ffffff" />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formItem}>
          <label className={styles.label}>描边颜色</label>
          <input type="color" className={styles.colorInput} defaultValue="#000000" />
        </div>
        <div className={styles.formItem}>
          <label className={styles.label}>描边宽度</label>
          <Slider min={0} max={4} defaultValue={2} className={styles.slider} />
        </div>
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>背景样式</label>
        <Select defaultValue="none">
          <SelectTrigger>
            <SelectValue placeholder="选择样式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">无</SelectItem>
            <SelectItem value="box">方框</SelectItem>
            <SelectItem value="shadow">阴影</SelectItem>
            <SelectItem value="outline">描边</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>位置</label>
        <Select defaultValue="bottom">
          <SelectTrigger>
            <SelectValue placeholder="选择位置" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">顶部</SelectItem>
            <SelectItem value="center">居中</SelectItem>
            <SelectItem value="bottom">底部</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>样式预设</label>
        <Select defaultValue="default">
          <SelectTrigger>
            <SelectValue placeholder="选择预设" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">默认</SelectItem>
            <SelectItem value="modern">现代</SelectItem>
            <SelectItem value="cinematic">电影感</SelectItem>
            <SelectItem value="social">社交媒体</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);

// 音频设置
const AudioSettings = () => (
  <div className={styles.settingsGroup}>
    <h5 className={styles.groupTitle}>
      <Volume2 size={16} style={{ display: 'inline', marginRight: 6 }} /> 音频设置
    </h5>

    <div className={styles.formWrapper}>
      <div className={styles.formItem}>
        <label className={styles.label}>音量</label>
        <Slider defaultValue={80} className={styles.slider} />
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>淡入</label>
        <Slider max={5} defaultValue={0} className={styles.slider} />
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>淡出</label>
        <Slider max={5} defaultValue={0} className={styles.slider} />
      </div>

      <Separator className={styles.separator} />

      <h5 className={styles.groupTitle}>降噪</h5>

      <div className={styles.formItem}>
        <label className={styles.label}>降噪强度</label>
        <Slider defaultValue={0} className={styles.slider} />
      </div>

      <div className={styles.formItem}>
        <div className={styles.switchRow}>
          <label className={styles.label}>回声消除</label>
          <Switch />
        </div>
      </div>
    </div>
  </div>
);

// 视频效果设置
const VideoSettings = () => (
  <div className={styles.settingsGroup}>
    <h5 className={styles.groupTitle}>
      <Image size={16} style={{ display: 'inline', marginRight: 6 }} /> 视频效果
    </h5>

    <div className={styles.formWrapper}>
      <div className={styles.formItem}>
        <label className={styles.label}>亮度</label>
        <Slider defaultValue={50} className={styles.slider} />
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>对比度</label>
        <Slider defaultValue={50} className={styles.slider} />
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>饱和度</label>
        <Slider defaultValue={50} className={styles.slider} />
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>色温</label>
        <Slider defaultValue={50} className={styles.slider} />
      </div>

      <Separator className={styles.separator} />

      <div className={styles.formItem}>
        <label className={styles.label}>预设效果</label>
        <Select defaultValue="none">
          <SelectTrigger>
            <SelectValue placeholder="选择效果" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">无</SelectItem>
            <SelectItem value="vivid">鲜艳</SelectItem>
            <SelectItem value="warm">暖色调</SelectItem>
            <SelectItem value="cool">冷色调</SelectItem>
            <SelectItem value="BW">黑白</SelectItem>
            <SelectItem value="sepia">怀旧</SelectItem>
            <SelectItem value="cinematic">电影感</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);

// 导出设置
const ExportSettings = ({
  exportSettings,
  onChange,
}: {
  exportSettings?: PropertyPanelProps['exportSettings'];
  onChange?: (settings: Record<string, unknown>) => void;
}) => (
  <div className={styles.settingsGroup}>
    <h5 className={styles.groupTitle}>
      <Download size={16} style={{ display: 'inline', marginRight: 6 }} /> 导出设置
    </h5>

    <div className={styles.formWrapper}>
      <div className={styles.formItem}>
        <label className={styles.label}>输出格式</label>
        <Select
          defaultValue={exportSettings?.format || 'mp4'}
          onValueChange={(value) => onChange?.({ format: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp4">MP4</SelectItem>
            <SelectItem value="mov">MOV</SelectItem>
            <SelectItem value="webm">WebM</SelectItem>
            <SelectItem value="gif">GIF</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>分辨率</label>
        <Select
          defaultValue={exportSettings?.resolution || '1080p'}
          onValueChange={(value) => onChange?.({ resolution: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="720p">720p (HD)</SelectItem>
            <SelectItem value="1080p">1080p (Full HD)</SelectItem>
            <SelectItem value="1440p">1440p (2K)</SelectItem>
            <SelectItem value="4k">4K (Ultra HD)</SelectItem>
            <SelectItem value="original">原始分辨率</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>画质</label>
        <Select
          defaultValue={exportSettings?.quality || 'high'}
          onValueChange={(value) => onChange?.({ quality: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">低 (适合社交媒体)</SelectItem>
            <SelectItem value="medium">中</SelectItem>
            <SelectItem value="high">高</SelectItem>
            <SelectItem value="original">原始质量</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>帧率</label>
        <Select defaultValue="30">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24">24 fps (电影)</SelectItem>
            <SelectItem value="30">30 fps (标准)</SelectItem>
            <SelectItem value="60">60 fps (流畅)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className={styles.separator} />

      <div className={styles.formItem}>
        <label className={styles.label}>编码器</label>
        <Select defaultValue="h264">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="h264">H.264 (兼容性最好)</SelectItem>
            <SelectItem value="h265">H.265/HEVC (高压缩率)</SelectItem>
            <SelectItem value="vp9">VP9 (Web优化)</SelectItem>
            <SelectItem value="av1">AV1 (最新标准)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={styles.exportButtons}>
        <Button variant="outline" size="sm">
          <Save size={14} /> 保存设置
        </Button>
        <Button size="sm">
          <Download size={14} /> 开始导出
        </Button>
      </div>
    </div>
  </div>
);

function PropertyPanel({
  selectedSegment,
  videoInfo,
  exportSettings,
  onExportSettingsChange,
  onSaveSegment: _onSaveSegment,
}: PropertyPanelProps) {
  const tabItems = useMemo(
    () => [
      {
        key: 'subtitle',
        label: (
          <span>
            <Type size={14} style={{ display: 'inline', marginRight: 4 }} /> 字幕
          </span>
        ),
        children: <SubtitleSettings />,
      },
      {
        key: 'audio',
        label: (
          <span>
            <Volume2 size={14} style={{ display: 'inline', marginRight: 4 }} /> 音频
          </span>
        ),
        children: <AudioSettings />,
      },
      {
        key: 'video',
        label: (
          <span>
            <Image size={14} style={{ display: 'inline', marginRight: 4 }} /> 效果
          </span>
        ),
        children: <VideoSettings />,
      },
      {
        key: 'export',
        label: (
          <span>
            <Download size={14} style={{ display: 'inline', marginRight: 4 }} /> 导出
          </span>
        ),
        children: (
          <ExportSettings exportSettings={exportSettings} onChange={onExportSettingsChange} />
        ),
      },
    ],
    []
  ); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.panel}>
      {/* 视频信息 */}
      {videoInfo && (
        <div className={styles.videoInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>分辨率</span>
            <span className={styles.infoValue}>
              {videoInfo.width} × {videoInfo.height}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>帧率</span>
            <span className={styles.infoValue}>{videoInfo.fps} fps</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>时长</span>
            <span className={styles.infoValue}>
              {Math.floor(videoInfo.duration / 60)}:
              {String(Math.floor(videoInfo.duration % 60)).padStart(2, '0')}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>格式</span>
            <span className={styles.infoValue}>{videoInfo.format.toUpperCase()}</span>
          </div>
        </div>
      )}

      <Separator className={styles.divider} />

      {/* 片段信息 */}
      {selectedSegment && (
        <div className={styles.segmentInfo}>
          <h5 className={styles.sectionTitle}>当前片段</h5>
          <div className={styles.segmentDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>名称:</span>
              <span>{selectedSegment.name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>时间:</span>
              <span>
                {Math.floor(selectedSegment.start / 60)}:
                {String(Math.floor(selectedSegment.start % 60)).padStart(2, '0')}-
                {Math.floor(selectedSegment.end / 60)}:
                {String(Math.floor(selectedSegment.end % 60)).padStart(2, '0')}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>时长:</span>
              <span>{String((selectedSegment.end - selectedSegment.start).toFixed(1))}s</span>
            </div>
          </div>
        </div>
      )}

      <Separator className={styles.divider} />

      {/* 属性面板标签页 */}
      <Tabs defaultValue="subtitle" className={styles.tabs}>
        <TabsList className={styles.tabsList}>
          {tabItems.map((item) => (
            <TabsTrigger key={item.key} value={item.key}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabItems.map((item) => (
          <TabsContent key={item.key} value={item.key}>
            {item.children}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default PropertyPanel;
