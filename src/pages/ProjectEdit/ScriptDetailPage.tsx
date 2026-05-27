import { ArrowLeft, Save, Trash2, Download, Bot } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { tauriService } from '@/core/services';
import { logger } from '@/core/utils/logger';
import ScriptEditor from '@/features/script/components/ScriptEditor';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { toast } from '@/shared/components/ui/Toast';
import { useProjectStore } from '@/shared/stores';
import type { ProjectData } from '@/shared/types';
import type { Script, ScriptSegment } from '@/shared/types/script';

import styles from './ScriptDetail.module.less';

// VideoSegment type used by ScriptEditor (local alias)
interface VideoSegment {
  id: string;
  start: number;
  end: number;
  type: string;
  content?: string;
}

const ScriptDetail = () => {
  const { projectId, scriptId } = useParams<{ projectId: string; scriptId: string }>();
  const navigate = useNavigate();
  const { projects, updateProject } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  // Use VideoSegment for ScriptEditor compatibility
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!projectId || !scriptId) {
      toast.error('参数错误');
      navigate('/projects');
      return;
    }

    const currentProject = projects.find((p) => p.id === projectId);
    if (!currentProject) {
      toast.error('找不到项目');
      navigate('/projects');
      return;
    }

    const currentScript = currentProject.scripts?.find((s: Script) => s.id === scriptId);
    if (!currentScript) {
      toast.error('找不到脚本');
      navigate(`/projects/${projectId}`);
      return;
    }

    setProject(currentProject);
    setScript(currentScript);
    // Convert ScriptSegment[] (startTime/endTime) to VideoSegment[] (start/end)
    const videoSegments: VideoSegment[] = Array.isArray(currentScript.segments)
      ? currentScript.segments.map((seg) => ({
          id: seg.id,
          start: seg.startTime,
          end: seg.endTime,
          type: seg.type,
          content: seg.content,
        }))
      : [];
    setSegments(videoSegments);
    setLoading(false);
  }, [projectId, scriptId, projects, navigate]);

  const handleSegmentsChange = (newSegments: VideoSegment[]) => {
    setSegments(newSegments);
  };

  const handleSave = async () => {
    if (!project || !script) return;

    try {
      setLoading(true);

      // Convert VideoSegment[] back to ScriptSegment[] for storage
      const scriptSegments: ScriptSegment[] = segments.map((seg) => ({
        id: seg.id,
        startTime: seg.start,
        endTime: seg.end,
        content: seg.content ?? '',
        type: seg.type as ScriptSegment['type'],
      }));

      const updatedScript: Script = {
        ...script,
        segments: scriptSegments,
        updatedAt: new Date().toISOString(),
      };

      const updatedScripts = (project.scripts ?? []).map((s: Script) =>
        s.id === script.id ? updatedScript : s
      );

      const updatedProject = {
        ...project,
        scripts: updatedScripts,
        updatedAt: new Date().toISOString(),
      };

      setProject(updatedProject);
      setScript(updatedScript);
      updateProject(updatedProject.id, updatedProject);
      await tauriService.writeText(updatedProject.id, JSON.stringify(updatedProject));

      toast.success('保存成功');
    } catch (error) {
      logger.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!project || !script) return;

    try {
      const scriptContent =
        segments
          ?.map((segment: VideoSegment, index: number) => {
            return `【第${index + 1}幕】\n${segment.content || ''}\n`;
          })
          .join('\n') || '';

      await tauriService.writeText(
        `${project.name}_脚本_${new Date().toISOString().slice(0, 10)}.txt`,
        scriptContent
      );
      toast.success('导出成功');
    } catch (error) {
      logger.error('导出脚本失败:', error);
      toast.error('导出失败');
    }
  };

  const handleDelete = async () => {
    if (!project || !script) return;

    try {
      const updatedScripts = (project.scripts ?? []).filter((s: Script) => s.id !== script.id);

      const updatedProject = {
        ...project,
        scripts: updatedScripts,
        updatedAt: new Date().toISOString(),
      };

      updateProject(updatedProject.id, updatedProject);
      await tauriService.writeText(updatedProject.id, JSON.stringify(updatedProject));

      toast.success('删除成功');
      navigate(`/projects/${project.id}`);
    } catch (error) {
      logger.error('删除脚本失败:', error);
      toast.error('删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!project || !script) {
    return <div className="p-8 text-center">资源不存在</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${project.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回项目
          </Button>

          <Button variant="default" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            保存
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={segments.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>

          <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            删除
          </Button>
        </div>
      </div>

      <Card className={styles.infoCard}>
        <h2 className="text-xl font-semibold mb-2">{project.name} - 脚本编辑</h2>
        <div className={styles.scriptInfo}>
          <p className="text-sm text-muted-foreground">
            创建于 {new Date(script.createdAt).toLocaleString()}
          </p>
          {script.modelUsed && (
            <Badge variant="secondary" className="mt-2">
              <Bot className="h-3 w-3 mr-1" />由 {script.modelUsed} 生成
            </Badge>
          )}
        </div>
        <Separator className="my-4" />
        <div className={styles.stats}>
          <p className="text-sm">片段数量: {segments.length}</p>
          <p className="text-sm">
            总时长:{' '}
            {segments.reduce(
              (total, seg) => total + ((seg.end || 0) - (seg.start || 0)),
              0
            )}{' '}
            秒
          </p>
        </div>
      </Card>

      <div className={styles.editorContainer}>
        <ScriptEditor segments={segments} onSegmentsChange={handleSegmentsChange} />
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onOk={handleDelete}
        title="确认删除"
        content="确定要删除这个脚本吗？此操作不可撤销。"
        okText="删除"
      />
    </div>
  );
};

export default ScriptDetail;
