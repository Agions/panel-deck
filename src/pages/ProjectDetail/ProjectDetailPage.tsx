import {
  Edit,
  ArrowLeft,
  Trash2,
  Download,
  Plus,
  FileText,
  Image,
  User,
  PlayCircle,
  Volume2,
  Zap,
  DollarSign,
} from 'lucide-react';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import { Tabs, TabPane } from '@/components/ui/tabs';
import { Title, Text, Paragraph } from '@/components/ui/typography';
import { Modal, Spin, Space, Empty, Alert, Button, Card } from '@/components/ui/ui-components';
import type { EvaluationScores, FrameComment, StoryboardVersion } from '@/core/services';
import type { VideoSegment } from '@/shared/types/script';
import {
  collaborationService,
  costService,
  qualityGateService,
  reviewExportService,
  tauriService,
} from '@/core/services';
import { runWhenIdle } from '@/core/utils/idle';
import { logger } from '@/core/utils/logger';
import { AudioEditorPanel } from '@/features/audio/components/AudioEditorPanel';
import { CostPanel } from '@/features/cost/components/CostPanel';
import { ExportPanel } from '@/features/export/components/ExportPanel';
import type { NovelMetadata } from '@/features/script/components/NovelImporter';
import { StoryboardCollaborationPanel } from '@/features/storyboard';
import type { StoryboardFrame } from '@/features/storyboard/components/StoryboardEditor';
import { toast } from '@/shared/components/ui/Toast';
import { useProjectStore } from '@/shared/stores';
import type { ProjectData } from '@/shared/types';
import type { Script, ScriptSegment } from '@/shared/types/script';

import styles from './ProjectDetail.module.less';

const importScriptEditor = () => import('@/features/script/components/ScriptEditor');
const importRenderCenter = () => import('@/components/business/RenderCenter');
const importCharacterDesigner = () => import('@/features/character/components/CharacterDesigner');
const importCompositionStudio = () => import('@/components/business/CompositionStudio');
const importAudioEditor = () => import('@/features/audio/components/AudioEditor');
const importCostDashboard = () => import('@/components/business/CostDashboard');

const ScriptEditor = lazy(importScriptEditor);
const RenderCenter = lazy(importRenderCenter);
const CharacterDesigner = lazy(importCharacterDesigner);
const CompositionStudio = lazy(importCompositionStudio);
const AudioEditor = lazy(importAudioEditor);
const CostDashboard = lazy(importCostDashboard);

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, updateProject, deleteProject } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [activeTab, setActiveTab] = useState<string>('novel');
  const [novelMetadata, setNovelMetadata] = useState<NovelMetadata | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string | undefined>(undefined);
  const preloadByTab = useMemo<Record<string, Array<() => Promise<unknown>>>>(
    () => ({
      novel: [importScriptEditor],
      'script-edit': [importCharacterDesigner, importRenderCenter],
      storyboard: [importRenderCenter, importCompositionStudio],
      character: [importRenderCenter, importCompositionStudio],
      render: [importCompositionStudio, importAudioEditor],
      composition: [importAudioEditor, importCostDashboard],
      audio: [importCostDashboard],
      cost: [],
      export: [],
    }),
    []
  );

  const preloadTabModules = useCallback(
    (tabKey: string) => {
      const tasks = preloadByTab[tabKey] || [];
      tasks.forEach((task) => {
        void task();
      });
    },
    [preloadByTab]
  );

  const renderTabLabel = (tabKey: string, icon: React.ReactNode, label: string) => (
    <span onMouseEnter={() => preloadTabModules(tabKey)} onFocus={() => preloadTabModules(tabKey)}>
      {icon}
      {label}
    </span>
  );

  useEffect(() => {
    const tasks = preloadByTab[activeTab] || [];
    if (tasks.length === 0) return;

    const warmup = () => preloadTabModules(activeTab);
    return runWhenIdle(warmup, { timeoutMs: 120 });
  }, [activeTab, preloadByTab, preloadTabModules]);

  const storyboardFrames = useMemo<StoryboardFrame[]>(
    () => (Array.isArray(project?.storyboardFrames) ? project.storyboardFrames : []),
    [project?.storyboardFrames]
  );
  const evaluationSummary: EvaluationScores | undefined =
    project?.evaluationReport?.summary ?? project?.evaluationSummary;
  const exportQualityGate = useMemo(
    () =>
      qualityGateService.evaluate({
        storyboardFrames,
        evaluationSummary,
      }),
    [storyboardFrames, evaluationSummary]
  );
  const selectedFrame = storyboardFrames.find((frame) => frame.id === selectedFrameId) ?? null;

  const persistProjectPatch = (patch: Record<string, unknown>) => {
    if (!project) return;
    const updatedProject = {
      ...project,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setProject(updatedProject);
    updateProject(updatedProject.id, updatedProject);
    tauriService
      .writeText(updatedProject.id, JSON.stringify(updatedProject))
      .catch(() => undefined);
  };

  const handleApplyRenderedFrame = (frameId: string, imageUrl: string) => {
    if (!project) return;
    const frames: StoryboardFrame[] = Array.isArray(project.storyboardFrames)
      ? project.storyboardFrames
      : [];
    const updatedFrames = frames.map((frame) =>
      frame.id === frameId ? { ...frame, imageUrl } : frame
    );
    persistProjectPatch({ storyboardFrames: updatedFrames });
  };

  useEffect(() => {
    if (!id) return;

    const currentProject = projects.find((p) => p.id === id) as ProjectData | undefined;
    if (currentProject) {
      setProject(currentProject);
      if (currentProject.scripts?.length) {
        setActiveScript(currentProject.scripts[0]);
      }
      if (currentProject.novelMetadata) {
        setNovelMetadata(currentProject.novelMetadata as NovelMetadata);
      }
      if (
        Array.isArray(currentProject.storyboardComments) ||
        Array.isArray(currentProject.storyboardVersions)
      ) {
        collaborationService.hydrate(
          currentProject.id,
          (currentProject.storyboardComments ?? []) as FrameComment[],
          (currentProject.storyboardVersions ?? []) as StoryboardVersion[]
        );
      }
    } else {
      toast.error('找不到项目信息');
      navigate('/projects');
    }

    setLoading(false);
  }, [id, projects, navigate]);

  useEffect(() => {
    if (storyboardFrames.length === 0) {
      setSelectedFrameId(undefined);
      return;
    }
    if (!selectedFrameId || !storyboardFrames.some((frame) => frame.id === selectedFrameId)) {
      setSelectedFrameId(storyboardFrames[0].id);
    }
  }, [storyboardFrames, selectedFrameId, setSelectedFrameId]);

  const handleExportReviewNotes = async () => {
    if (!project?.id) return;
    try {
      const projectComments = collaborationService.listComments(project.id);
      const projectVersions = collaborationService.listVersions(project.id);
      const projectCostStats = costService.getProjectStats(project.id);
      const projectCostRecords = costService.getRecords(project.id).slice(0, 30);
      const content = reviewExportService.toMarkdown({
        project: {
          id: project.id,
          name: project.name,
          storyboardFrameCount: storyboardFrames.length,
        },
        comments: projectComments,
        versions: projectVersions,
        costStats: projectCostStats,
        costRecords: projectCostRecords,
        evaluationSummary,
      });
      const saved = await reviewExportService.saveMarkdownToFile(
        `${project.name}_评审记录.md`,
        content,
        {
          projectId: project.id,
          projectName: project.name,
          source: 'project_detail',
        }
      );
      if (saved) {
        toast.success('评审记录导出成功');
      }
    } catch (error) {
      logger.error('导出评审记录失败:', error);
      toast.error('导出评审记录失败');
    }
  };

  const handleCreateScript = () => {
    if (!project) return;

    try {
      const newScript: Script = {
        id: uuidv4(),
        title: '新剧本',
        content: '',
        segments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProject = {
        ...project,
        scripts: [...(project.scripts ?? []), newScript],
        updatedAt: new Date().toISOString(),
      };

      // 先更新UI
      setProject(updatedProject);
      setActiveScript(newScript);

      // 保存到文件，显示loading
      toast.loading('正在保存剧本...');
      tauriService
        .writeText(updatedProject.id, JSON.stringify(updatedProject))
        .then(() => {
          updateProject(updatedProject.id, updatedProject);
          toast.success('剧本创建成功');
        })
        .catch((error) => {
          logger.error('保存项目文件失败:', error);
          toast.error('保存项目文件失败: ' + (error instanceof Error ? error.message : '未知错误'));
          // 回滚UI状态
          setProject(project);
          setActiveScript(project.scripts?.[0] ?? null);
        });
    } catch (error) {
      logger.error('创建剧本失败:', error);
      toast.error('创建剧本失败');
    }
  };

  // 跳转到项目编辑页面生成剧本
  const handleGenerateScript = () => {
    navigate(`/projects/${id}/edit`);
  };

  const handleScriptChange = (segments: VideoSegment[]) => {
    if (!project || !activeScript) return;

    try {
      // 更新脚本内容
      const updatedScript = {
        ...activeScript,
        segments: segments.map(seg => ({
          id: seg.id,
          startTime: seg.start,
          endTime: seg.end,
          content: seg.content ?? '',
          type: seg.type as 'narration' | 'dialogue' | 'action' | 'transition',
        })),
        updatedAt: new Date().toISOString(),
      };

      // 更新脚本列表
      const updatedScripts = (project.scripts ?? []).map((script: Script) =>
        script.id === activeScript.id ? updatedScript : script
      );

      // 更新项目
      const updatedProject = {
        ...project,
        scripts: updatedScripts,
        updatedAt: new Date().toISOString(),
      };

      // 先更新UI
      setProject(updatedProject);
      setActiveScript(updatedScript);

      // 保存到文件
      tauriService
        .writeText(updatedProject.id, JSON.stringify(updatedProject))
        .then(() => {
          updateProject(updatedProject.id, updatedProject);
          toast.success('脚本内容已保存');
        })
        .catch((error) => {
          logger.error('保存项目文件失败:', error);
          toast.error('保存项目文件失败: ' + (error instanceof Error ? error.message : '未知错误'));
          // 回滚UI状态
          setProject(project);
          setActiveScript(activeScript);
        });
    } catch (error) {
      logger.error('更新脚本内容失败:', error);
      toast.error('更新脚本内容失败');
    }
  };

  const handleExportScript = async () => {
    if (!project || !activeScript) {
      toast.warning('没有可导出的剧本');
      return;
    }

    try {
      // 创建剧本文本内容
      const scriptContent =
        activeScript.segments
          ?.map((segment: ScriptSegment, index: number) => {
            return `【第${index + 1}幕】\n${segment.content ?? ''}\n`;
          })
          .join('\n') ?? '';

      // 使用 Tauri 命令保存文件
      const { invoke } = await import('@tauri-apps/api/core');
      const filePath = await invoke<string>('save_file_dialog', {
        defaultPath: `${project.name}_剧本.txt`,
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
      });

      if (filePath) {
        await invoke('write_text_file', {
          path: filePath,
          content: scriptContent,
        });
        toast.success('剧本导出成功');
      }
    } catch (error) {
      logger.error('导出剧本失败:', error);
      toast.error('导出剧本失败');
    }
  };

  const handleDeleteProject = () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此项目吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (!id) return;

        try {
          deleteProject(id);
          toast.success('项目已删除');
          navigate('/projects');
        } catch (error) {
          logger.error('删除项目失败:', error);
          toast.error('删除项目失败');
        }
      },
    });
  };

  if (loading) {
    return <Spin size="large" tip="加载中..." />;
  }

  if (!project) {
    return <div>项目不存在</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Space>
          <Button icon={<ArrowLeft />} onClick={() => navigate('/projects')}>
            返回项目列表
          </Button>

          <Button icon={<Edit />} onClick={() => navigate(`/projects/${id}/edit`)}>
            编辑项目
          </Button>

          <Button
            icon={<Download />}
            onClick={handleExportScript}
            disabled={!activeScript?.content || activeScript.content.length === 0}
          >
            导出剧本
          </Button>

          <Button icon={<FileText />} onClick={handleExportReviewNotes} disabled={!project}>
            导出评审记录
          </Button>

          <Button danger icon={<Trash2 />} onClick={handleDeleteProject}>
            删除项目
          </Button>
        </Space>

        <Title level={2}>{project.name}</Title>
      </div>

      {project.description && (
        <Card className={styles.descriptionCard}>
          <Text>{project.description}</Text>
        </Card>
      )}

      <Card className={styles.functionCard}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
          <TabPane tab={renderTabLabel('novel', <FileText />, '小说')} key="novel">
            <div className={styles.novelSection}>
              {project.content ? (
                <>
                  <Title level={5}>已导入的小说/剧本</Title>
                  {novelMetadata && (
                    <div className={styles.metadata}>
                      <p>
                        <strong>文件名:</strong> {novelMetadata.filename}
                      </p>
                      <p>
                        <strong>字符数:</strong> {novelMetadata.charCount.toLocaleString()}
                      </p>
                      <p>
                        <strong>预估章节数:</strong> {novelMetadata.estimatedChapters}
                      </p>
                    </div>
                  )}
                  <Paragraph>
                    <Text type="secondary">内容预览（前1000字符）:</Text>
                  </Paragraph>
                  <Card size="small" style={{ maxHeight: 200, overflow: 'auto' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {project.content.substring(0, 1000)}
                      {project.content.length > 1000 ? '...' : ''}
                    </pre>
                  </Card>
                  <Button
                    type="link"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    icon={<Edit />}
                    style={{ marginTop: 16 }}
                  >
                    编辑项目内容
                  </Button>
                </>
              ) : (
                <Empty description="尚未导入小说/剧本内容" image={undefined}>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    icon={<Plus />}
                  >
                    导入小说/剧本
                  </Button>
                </Empty>
              )}
            </div>
          </TabPane>

          <TabPane tab={renderTabLabel('script-edit', <Edit />, '剧本')} key="script-edit">
            <div className={styles.scriptSection}>
              <div className={styles.scriptHeader}>
                <Title level={4}>剧本编辑</Title>
                <Space>
                  <Button type="primary" icon={<Edit />} onClick={handleGenerateScript}>
                    编辑剧本
                  </Button>

                  <Button icon={<Plus />} onClick={handleCreateScript}>
                    创建空白剧本
                  </Button>
                </Space>
              </div>

              {project.scripts && project.scripts.length > 0 ? (
                <>
                  <Tabs
                    activeKey={activeScript?.id}
                    onChange={(key) => {
                      const script = (project.scripts ?? []).find((s: Script) => s.id === key);
                      if (script) setActiveScript(script);
                    }}
                  >
                    {project.scripts.map((script: Script) => (
                      <TabPane
                        key={script.id}
                        tab={`剧本 ${new Date(script.createdAt).toLocaleDateString()}`}
                      >
                        <Suspense fallback={<Spin />}>
                          <ScriptEditor
                            segments={script.segments ? script.segments.map(seg => ({
                              id: seg.id,
                              start: seg.startTime,
                              end: seg.endTime,
                              type: seg.type,
                              content: seg.content,
                            })) : []}
                            onSegmentsChange={handleScriptChange}
                          />
                        </Suspense>
                      </TabPane>
                    ))}
                  </Tabs>
                </>
              ) : (
                <Card>
                  <div className={styles.emptyScript}>
                    <Text type="secondary">
                      暂无剧本，点击&quot;编辑剧本&quot;或&quot;创建空白剧本&quot;按钮添加
                    </Text>
                  </div>
                </Card>
              )}
            </div>
          </TabPane>

          <TabPane tab={renderTabLabel('storyboard', <Image />, '分镜')} key="storyboard">
            <div className={styles.workflowSection}>
              {activeScript?.content && activeScript.content.length > 0 ? (
                <div className={styles.storyboardDetail}>
                  {storyboardFrames.length > 0 ? (
                    <StoryboardCollaborationPanel
                      projectId={project?.id ?? ''}
                      storyboardFrames={storyboardFrames}
                      selectedFrameId={selectedFrameId}
                      onSelectFrame={setSelectedFrameId}
                      onPersistPatch={persistProjectPatch}
                      onFrameUpdate={(frames) => persistProjectPatch({ storyboardFrames: frames })}
                    />
                  ) : (
                    <Empty description="暂无分镜，请先在编辑页生成分镜" image={undefined}>
                      <Button
                        type="primary"
                        onClick={() => navigate(`/projects/${id}/edit`)}
                        icon={<Edit />}
                      >
                        去生成分镜
                      </Button>
                    </Empty>
                  )}
                </div>
              ) : (
                <Empty description="请先生成或编辑剧本" image={undefined}>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    icon={<Edit />}
                  >
                    去编辑剧本
                  </Button>
                </Empty>
              )}
            </div>
          </TabPane>

          <TabPane tab={renderTabLabel('character', <User />, '角色')} key="character">
            <div className={styles.workflowSection}>
              {activeScript?.content && activeScript.content.length > 0 ? (
                <Suspense fallback={<Spin />}>
                  <CharacterDesigner
                    characters={project.characters ?? []}
                    onChange={(chars) => {
                      persistProjectPatch({ characters: chars });
                    }}
                    projectId={project?.id}
                  />
                </Suspense>
              ) : (
                <Empty description="请先生成或编辑剧本" image={undefined}>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    icon={<Edit />}
                  >
                    去编辑剧本
                  </Button>
                </Empty>
              )}
            </div>
          </TabPane>

          <TabPane tab={renderTabLabel('render', <Zap />, '渲染')} key="render">
            <div className={styles.workflowSection}>
              {activeScript?.content && activeScript.content.length > 0 ? (
                <Suspense fallback={<Spin />}>
                  <RenderCenter
                    frames={Array.isArray(project.storyboardFrames) ? project.storyboardFrames : []}
                    projectId={project?.id}
                    onApplyRenderedFrame={handleApplyRenderedFrame}
                  />
                </Suspense>
              ) : (
                <Empty description="请先生成或编辑剧本" image={undefined}>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    icon={<Edit />}
                  >
                    去编辑剧本
                  </Button>
                </Empty>
              )}
            </div>
          </TabPane>

          <TabPane tab={renderTabLabel('composition', <PlayCircle />, '合成')} key="composition">
            <div className={styles.workflowSection}>
              {activeScript?.segments &&
              activeScript.segments.length > 0 &&
              (project.storyboardFrames?.length ?? 0) > 0 ? (
                <Suspense fallback={<Spin />}>
                  <CompositionStudio
                    frames={project.storyboardFrames as StoryboardFrame[]}
                    projectId={project?.id}
                    onCompositionChange={(comp) => {
                      persistProjectPatch({ composition: comp });
                    }}
                  />
                </Suspense>
              ) : (
                <Empty description="请先生成或编辑剧本并完成场景渲染" image={undefined}>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    icon={<Edit />}
                  >
                    去编辑
                  </Button>
                </Empty>
              )}
            </div>
          </TabPane>

          <TabPane tab={renderTabLabel('audio', <Volume2 />, '配音')} key="audio">
            <div className={styles.workflowSection}>
              {activeScript?.content && activeScript.content.length > 0 ? (
                <AudioEditorPanel project={project} onPersistPatch={persistProjectPatch} />
              ) : (
                <Empty description="请先生成或编辑剧本" image={undefined}>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    icon={<Edit />}
                  >
                    去编辑剧本
                  </Button>
                </Empty>
              )}
            </div>
          </TabPane>

          <TabPane tab={renderTabLabel('cost', <DollarSign />, '成本')} key="cost">
            <div className={styles.workflowSection}>
              <CostPanel projectId={project?.id} onExportReviewNotes={handleExportReviewNotes} />
            </div>
          </TabPane>

          <TabPane tab={renderTabLabel('export', <Download />, '导出')} key="export">
            <div className={styles.workflowSection}>
              {activeScript?.content && activeScript.content.length > 0 ? (
                <ExportPanel
                  projectId={project?.id ?? ''}
                  qualityGate={exportQualityGate}
                  onNavigateToEdit={() => navigate(`/projects/${id}/edit`)}
                />
              ) : (
                <Empty description="请先生成或编辑剧本" image={undefined}>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/projects/${id}/edit`)}
                    icon={<Edit />}
                  >
                    去编辑剧本
                  </Button>
                </Empty>
              )}
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ProjectDetail;
