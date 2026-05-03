import { Download, FileText, FileType, Globe } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/sonner';
import { Tooltip } from '@/components/ui/tooltip';
import type { ScriptData } from '@/core/types';
import { logger } from '@/core/utils/logger';

import styles from './ExportPanel.module.less';

// Placeholder exportScript function until proper implementation is available
const exportScript = async (_script: unknown, _format: string, _filename: string) => {
  // TODO: Implement actual script export functionality
  console.log('exportScript called with:', _script, _format, _filename);
};

// 导出脚本到文件
const _getFormatIcon = (format: ExportFormat) => {
  switch (format) {
    case 'txt':
      return <FileText size={16} />;
    case 'srt':
      return <FileText size={16} />;
    case 'pdf':
      return <FileType size={16} />;
    case 'html':
      return <Globe size={16} />;
    default:
      return <FileText size={16} />;
  }
};

// 导出格式
type ExportFormat = 'txt' | 'srt' | 'pdf' | 'html';

interface ExportPanelProps {
  script: ScriptData;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ script }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt');
  const [filename, setFilename] = useState<string>(`脚本_${script.id || 'draft'}`);
  const [exporting, setExporting] = useState(false);

  // handleFormatChange is no longer needed - using RadioGroup onValueChange directly

  // 处理文件名变更
  const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilename(e.target.value);
  };

  // 执行导出
  const handleExport = async () => {
    if (!filename.trim()) {
      toast.error('请输入有效的文件名');
      return;
    }

    setExporting(true);
    try {
      await exportScript(script, exportFormat as 'txt' | 'srt', filename);
      toast.success(`脚本已成功导出为${exportFormat.toUpperCase()}格式`);
    } catch (error) {
      logger.error('导出失败:', error);
      toast.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card
      title="导出脚本"
      className={styles.exportPanel}
      extra={
        <Tooltip content="导出后的文件将保存到您选择的位置">
          <Button
            variant="default"
            icon={<Download size={16} />}
            onClick={handleExport}
            loading={exporting}
          >
            导出
          </Button>
        </Tooltip>
      }
    >
      <div className={styles.content}>
        <div className={styles.filenameSection}>
          <label htmlFor="filename" className={styles.label}>文件名:</label>
          <Input
            id="filename"
            value={filename}
            onChange={handleFilenameChange}
            placeholder="输入文件名(不含扩展名)"
            className={styles.filenameInput}
          />
        </div>

        <div className={styles.formatSection}>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className={styles.label}>导出格式:</label>
          <RadioGroup value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RadioGroupItem value="txt" id="txt" />
                <label htmlFor="txt" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <FileText size={16} /> 纯文本 (.txt)
                  <span className={styles.formatDesc}>- 简单文本格式，适合通用场景</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RadioGroupItem value="srt" id="srt" />
                <label htmlFor="srt" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <FileText size={16} /> 字幕文件 (.srt)
                  <span className={styles.formatDesc}>- 标准字幕格式，可导入视频编辑软件</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RadioGroupItem value="pdf" id="pdf" />
                <label htmlFor="pdf" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <FileType size={16} /> PDF文档 (.pdf)
                  <span className={styles.formatDesc}>- 带格式的PDF文档，适合打印或分享</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RadioGroupItem value="html" id="html" />
                <label htmlFor="html" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Globe size={16} /> 网页 (.html)
                  <span className={styles.formatDesc}>- 可在浏览器中打开的网页格式</span>
                </label>
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>
    </Card>
  );
};

export default ExportPanel;
