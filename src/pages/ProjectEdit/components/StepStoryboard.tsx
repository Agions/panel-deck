/**
 * Step 3: 分镜设计
 */
import { Image } from 'lucide-react';
import React, { lazy } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StoryboardVersion, VersionDiffSummary } from '@/core/services';
import type { StoryAnalysis } from '@/core/types';
import type { StoryboardFrame } from '@/features/storyboard/components/StoryboardEditor';
import { toast } from '@/shared/components/ui/Toast';

import styles from '../ProjectEdit.module.less';

import CollaborationPanel from './CollaborationPanel';

const StoryboardEditor = lazy(() => import('@/features/storyboard/components/StoryboardEditor'));

export interface StepStoryboardProps {
  storyboardFrames: StoryboardFrame[];
  storyAnalysis: StoryAnalysis | null;
  selectedFrame: StoryboardFrame | null;
  focusFrameId: string | undefined;
  commentDraft: string;
  versionLabel: string;
  compareLeftVersionId: string | undefined;
  compareRightVersionId: string | undefined;
  versionDiff: VersionDiffSummary | null;
  storyboardVersions: StoryboardVersion[];
  projectId: string | undefined;
  onFramesChange: (frames: StoryboardFrame[]) => void;
  onFrameSelect: (frame: StoryboardFrame | null) => void;
  onBuildDraft: () => void;
  onAddComment: () => void;
  onSaveVersion: () => void;
  onCompareVersions: () => void;
  onRollback: () => void;
  onCommentDraftChange: (v: string) => void;
  onLeftVersionChange: (v: string | undefined) => void;
  onRightVersionChange: (v: string | undefined) => void;
  onVersionLabelChange: (v: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

function StepStoryboard({
  storyboardFrames,
  storyAnalysis,
  selectedFrame,
  focusFrameId,
  commentDraft,
  versionLabel,
  compareLeftVersionId,
  compareRightVersionId,
  versionDiff,
  storyboardVersions,
  projectId,
  onFramesChange,
  onFrameSelect,
  onBuildDraft,
  onAddComment,
  onSaveVersion,
  onCompareVersions,
  onRollback,
  onCommentDraftChange,
  onLeftVersionChange,
  onRightVersionChange,
  onVersionLabelChange,
  onPrev,
  onNext,
}: StepStoryboardProps) {
  return (
    <Card className={styles.stepCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          分镜设计
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">设计漫画分镜，确定每个场景的构图和镜头。</p>
        <div className={styles.storyboardContainer}>
          <div className={styles.storyboardActions}>
            <Button
              variant="outline"
              onClick={() => {
                if (!storyAnalysis) {
                  toast.warning('请先完成 AI 结构化解析');
                  return;
                }
                onBuildDraft();
                toast.success('已根据解析结果生成分镜草案');
              }}
            >
              生成分镜草案
            </Button>
          </div>
          <StoryboardEditor
            key={`${storyboardFrames.length}-${storyboardFrames[0]?.id || 'none'}`}
            initialFrames={storyboardFrames}
            focusFrameId={focusFrameId}
            onChange={onFramesChange}
            onFrameSelect={onFrameSelect}
          />
          <CollaborationPanel
            projectId={projectId}
            selectedFrame={selectedFrame}
            commentDraft={commentDraft}
            versionLabel={versionLabel}
            compareLeftVersionId={compareLeftVersionId}
            compareRightVersionId={compareRightVersionId}
            versionDiff={versionDiff}
            storyboardVersions={storyboardVersions}
            onCommentDraftChange={onCommentDraftChange}
            onAddComment={onAddComment}
            onSaveVersion={onSaveVersion}
            onCompareVersions={onCompareVersions}
            onRollback={onRollback}
            onLeftVersionChange={onLeftVersionChange}
            onRightVersionChange={onRightVersionChange}
            onVersionLabelChange={onVersionLabelChange}
          />
        </div>
        <div className={styles.stepActions}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onPrev}>
              上一步
            </Button>
            <Button variant="default" onClick={onNext}>
              下一步
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StepStoryboard;
