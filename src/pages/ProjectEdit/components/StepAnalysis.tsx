/**
 * Step 1: AI 解析内容
 */
import { Edit } from 'lucide-react';
import React, { lazy } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TextArea } from '@/components/ui/textarea';
import type { NovelMetadata } from '@/features/script/components/NovelImporter';

import styles from '../ProjectEdit.module.less';

const NovelImporter = lazy(() => import('@/features/script/components/NovelImporter'));

export interface StepAnalysisProps {
  content: string;
  novelMetadata: NovelMetadata | null;
  analysisDraft: string;
  analysisState: 'idle' | 'generated' | 'accepted';
  loading: boolean;
  onContentLoad: (newContent: string, metadata: NovelMetadata) => void;
  onRemove: () => void;
  onAnalyze: () => void;
  onAccept: () => void;
  onDraftChange: (v: string) => void;
  onPrev: () => void;
}

function StepAIAnalysis({
  content,
  novelMetadata,
  analysisDraft,
  analysisState,
  loading,
  onContentLoad,
  onRemove,
  onAnalyze,
  onAccept,
  onDraftChange,
  onPrev,
}: StepAnalysisProps) {
  return (
    <Card className={styles.stepCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          AI解析内容
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          使用AI智能分析小说/剧本内容，提取关键信息，生成适合视频脚本展示的剧本。
        </p>

        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">正在AI解析...</p>
            </div>
          </div>
        )}

        <div className={styles.analyzeContent}>
          <NovelImporter
            initialContent={content}
            onContentLoad={onContentLoad}
            onRemove={onRemove}
            loading={false}
          />

          {novelMetadata && (
            <div className={styles.contentInfo}>
              <h4 className="font-semibold mb-2">内容信息</h4>
              <p className="text-sm">文件名: {novelMetadata.filename}</p>
              <p className="text-sm">字符数: {novelMetadata.charCount.toLocaleString()}</p>
              <p className="text-sm">章节数: {novelMetadata.chapterCount}</p>
              <p className="text-sm">预估章节数: {novelMetadata.estimatedChapters}</p>
            </div>
          )}

          {analysisState !== 'idle' && (
            <div className={styles.analysisPanel}>
              <h4 className="font-semibold mb-2">结构化解析结果（可编辑）</h4>
              {analysisState === 'accepted' && (
                <Alert variant="default" className="mb-3 bg-green-50 border-green-200">
                  当前解析结果已接受，可重跑覆盖
                </Alert>
              )}
              <TextArea
                value={analysisDraft}
                rows={14}
                onChange={(e) => onDraftChange(e.target.value)}
                placeholder="AI 解析 JSON 结果"
              />
            </div>
          )}
        </div>

        <div className={styles.stepActions}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onPrev}>
              上一步
            </Button>
            {analysisState !== 'idle' && (
              <Button variant="outline" onClick={onAnalyze} disabled={loading}>
                重新解析
              </Button>
            )}
            {analysisState === 'generated' || analysisState === 'accepted' ? (
              <Button variant="default" onClick={onAccept} disabled={loading}>
                接受并生成剧本
              </Button>
            ) : (
              <Button variant="default" onClick={onAnalyze} disabled={loading}>
                开始AI解析
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StepAIAnalysis;
