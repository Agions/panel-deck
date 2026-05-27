/**
 * 协作面板：镜头评论 + 版本管理
 * 用于 Step 3 分镜设计
 */
import React from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FrameComment, StoryboardVersion, VersionDiffSummary } from '@/core/services';
import { collaborationService } from '@/core/services';
import type { StoryboardFrame } from '@/features/storyboard/components/StoryboardEditor';

import styles from '../ProjectEdit.module.less';

export interface CollaborationPanelProps {
  projectId: string | undefined;
  selectedFrame: StoryboardFrame | null;
  commentDraft: string;
  versionLabel: string;
  compareLeftVersionId: string | undefined;
  compareRightVersionId: string | undefined;
  versionDiff: VersionDiffSummary | null;
  storyboardVersions: StoryboardVersion[];
  onCommentDraftChange: (v: string) => void;
  onAddComment: () => void;
  onSaveVersion: () => void;
  onCompareVersions: () => void;
  onRollback: () => void;
  onLeftVersionChange: (v: string | undefined) => void;
  onRightVersionChange: (v: string | undefined) => void;
  onVersionLabelChange: (v: string) => void;
}

function CollaborationPanel({
  projectId,
  selectedFrame,
  commentDraft,
  versionLabel,
  compareLeftVersionId,
  compareRightVersionId,
  versionDiff,
  storyboardVersions,
  onCommentDraftChange,
  onAddComment,
  onSaveVersion,
  onCompareVersions,
  onRollback,
  onLeftVersionChange,
  onRightVersionChange,
  onVersionLabelChange,
}: CollaborationPanelProps) {
  const comments = projectId ? collaborationService.listComments(projectId, selectedFrame?.id) : [];

  return (
    <div className={styles.collaborationPanel}>
      {/* 镜头评论 */}
      <div className={styles.collabSection}>
        <h5 className="font-semibold mb-3">镜头评论</h5>
        <div className="flex gap-2 mb-3">
          <Input
            value={commentDraft}
            onChange={(e) => onCommentDraftChange(e.target.value)}
            placeholder={selectedFrame ? `对 ${selectedFrame.title} 添加评论` : '先选中一个分镜'}
            disabled={!selectedFrame}
          />
          <Button
            variant="default"
            onClick={onAddComment}
            disabled={!selectedFrame || !commentDraft.trim()}
          >
            添加
          </Button>
        </div>
        <div className="space-y-2">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无评论</p>
          ) : (
            comments.map((item: FrameComment) => (
              <div key={item.id} className="p-2 border rounded-md">
                <div className="text-sm">{item.content}</div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 版本管理 */}
      <div className={styles.collabSection}>
        <h5 className="font-semibold mb-3">版本管理</h5>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Input
            value={versionLabel}
            onChange={(e) => onVersionLabelChange(e.target.value)}
            placeholder="版本标签（可选）"
            className="w-[220px]"
            onKeyDown={(e) => e.key === 'Enter' && onSaveVersion()}
          />
          <Button variant="outline" onClick={onSaveVersion}>
            保存快照
          </Button>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Select value={compareLeftVersionId} onValueChange={(v) => onLeftVersionChange(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择版本A" />
            </SelectTrigger>
            <SelectContent>
              {storyboardVersions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={compareRightVersionId} onValueChange={(v) => onRightVersionChange(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择版本B" />
            </SelectTrigger>
            <SelectContent>
              {storyboardVersions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onCompareVersions}>
            版本差异
          </Button>
          <Button variant="destructive" onClick={onRollback}>
            回滚到版本A
          </Button>
        </div>
        {versionDiff && (
          <Alert
            variant={versionDiff.changeCount > 0 ? 'default' : 'default'}
            className={
              versionDiff.changeCount > 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-green-50 border-green-200'
            }
          >
            <p className="font-medium">差异字段数: {versionDiff.changeCount}</p>
            <p className="text-sm">{versionDiff.changedKeys.slice(0, 6).join(', ') || '无差异'}</p>
          </Alert>
        )}
      </div>
    </div>
  );
}

export default CollaborationPanel;
