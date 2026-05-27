/**
 * Step 8: 视频导出
 */
import { Download } from 'lucide-react';
import React, { lazy } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityGateIssue } from '@/core/services';
import { toast } from '@/shared/components/ui/Toast';
import type { ExportSettings } from '@/features/video/components/VideoExporter';

import styles from '../ProjectEdit.module.less';

import QualityGateAlert from './QualityGateAlert';

const VideoExporter = lazy(() => import('@/features/video/components/VideoExporter'));

export interface StepExportProps {
  exportPreset: '9:16' | '16:9' | '1:1';
  exportSettings: Partial<ExportSettings>;
  projectId: string | undefined;
  projectName: string;
  storyboardFrameCount: number;
  qualityGateIssues: QualityGateIssue[];
  qualityGatePassed: boolean;
  saving: boolean;
  onPresetChange: (preset: '9:16' | '16:9' | '1:1') => void;
  onExport: (settings: any) => void;
  onLocateIssue: (issue: QualityGateIssue) => void;
  onSave: () => void;
  onPrev: () => void;
}

function StepExport({
  exportPreset,
  exportSettings,
  projectId,
  projectName,
  storyboardFrameCount,
  qualityGateIssues,
  qualityGatePassed,
  saving,
  onPresetChange,
  onExport,
  onLocateIssue,
  onSave,
  onPrev,
}: StepExportProps) {
  return (
    <Card className={styles.stepCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          视频导出
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">导出最终视频脚本视频。</p>

        <div className={styles.exportPresetBar}>
          <div className="flex gap-2">
            <Button
              variant={exportPreset === '9:16' ? 'default' : 'outline'}
              onClick={() => onPresetChange('9:16')}
            >
              竖屏 9:16
            </Button>
            <Button
              variant={exportPreset === '16:9' ? 'default' : 'outline'}
              onClick={() => onPresetChange('16:9')}
            >
              横屏 16:9
            </Button>
            <Button
              variant={exportPreset === '1:1' ? 'default' : 'outline'}
              onClick={() => onPresetChange('1:1')}
            >
              方屏 1:1
            </Button>
          </div>
        </div>

        <div className={styles.exporterContainer}>
          <QualityGateAlert
            issues={qualityGateIssues}
            passed={qualityGatePassed}
            onLocateIssue={onLocateIssue}
          />
          <VideoExporter
            projectId={projectId}
            projectName={projectName}
            estimatedDuration={Math.max(storyboardFrameCount * 5, 60)}
            initialSettings={exportSettings}
            onExport={async (settings) => {
              if (!qualityGatePassed) {
                toast.error('质量闸门未通过，已阻止导出。请先修复阻断项。');
                return;
              }
              onExport(settings);
              toast.success(`已按 ${exportPreset} 预设完成导出任务`);
            }}
          />
        </div>

        <div className={styles.stepActions}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onPrev}>
              上一步
            </Button>
            <Button variant="default" onClick={onSave} disabled={saving}>
              {saving ? '保存中...' : '保存项目'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StepExport;
