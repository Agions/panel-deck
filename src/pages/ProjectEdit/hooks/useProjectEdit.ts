/**
 * useProjectEdit — ProjectEditPage Container Hook
 *
 * 职责：
 * - 所有 useState 状态管理
 * - 所有事件处理函数
 * - 所有 API 调用和业务逻辑
 *
 * 拆分后目标：ProjectEditPage.tsx 从 852行 → <250行
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';

import {
  aiService,
  tauriService,
  audioPipelineService,
  collaborationService,
  qualityGateService,
  storyAnalysisService,
} from '@/core/services';
import type {
  EvaluationScores,
  FrameComment,
  QualityGateIssue,
  StoryboardVersion,
  VersionDiffSummary,
} from '@/core/services';
import type { ExportSettings, StoryAnalysis, Character, CompositionProject } from '@/core/types';
import { runWhenIdle } from '@/core/utils/idle';
import { logger } from '@/core/utils/logger';
import type { AudioTrackConfig } from '@/features/audio/components/AudioEditor';
import type { NovelMetadata } from '@/features/script/components/NovelImporter';
import type { StoryboardFrame } from '@/features/storyboard/components/StoryboardEditor';
import { toast } from '@/shared/components/ui/Toast';

import {
  StepImport,
  StepAnalysis,
  StepScript,
  StepStoryboard,
  StepCharacter,
  StepRender,
  StepComposition,
  StepAudio,
  StepExport,
} from './components';

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  content: string;
  novelMetadata?: NovelMetadata;
  storyAnalysis?: StoryAnalysis;
  storyboardFrames?: StoryboardFrame[];
  storyboardComments?: FrameComment[];
  storyboardVersions?: StoryboardVersion[];
  characters?: Character[];
  composition?: CompositionProject;
  audioConfig?: AudioTrackConfig;
  exportPreset?: '9:16' | '16:9' | '1:1';
  exportSettings?: Partial<ExportSettings>;
  evaluationSummary?: EvaluationScores;
  evaluationReport?: { summary?: EvaluationScores };
  script?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseProjectEditOptions {
  onProjectChange?: (project: ProjectData) => void;
}

export function useProjectEdit({ onProjectChange }: UseProjectEditOptions = {}) {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ---- States ----
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [content, setContent] = useState<string>('');
  const [novelMetadata, setNovelMetadata] = useState<NovelMetadata | null>(null);
  const [scriptText, setScriptText] = useState<string>('');
  const [storyAnalysis, setStoryAnalysis] = useState<StoryAnalysis | null>(null);
  const [storyboardFrames, setStoryboardFrames] = useState<StoryboardFrame[]>([]);
  const [analysisDraft, setAnalysisDraft] = useState<string>('');
  const [analysisState, setAnalysisState] = useState<'idle' | 'generated' | 'accepted'>('idle');
  const [selectedFrame, setSelectedFrame] = useState<StoryboardFrame | null>(null);
  const [storyboardComments, setStoryboardComments] = useState<FrameComment[]>([]);
  const [storyboardVersions, setStoryboardVersions] = useState<StoryboardVersion[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [compareLeftVersionId, setCompareLeftVersionId] = useState<string | undefined>(undefined);
  const [compareRightVersionId, setCompareRightVersionId] = useState<string | undefined>(undefined);
  const [versionDiff, setVersionDiff] = useState<VersionDiffSummary | null>(null);
  const [focusFrameId, setFocusFrameId] = useState<string | undefined>(undefined);
  const [audioConfig, setAudioConfig] = useState<AudioTrackConfig>({
    voiceTracks: [],
    backgroundMusic: null,
    soundEffects: [],
    masterVolume: 80,
    voiceVolume: 80,
    musicVolume: 50,
    effectVolume: 70,
  });
  const [audioEditorKey, setAudioEditorKey] = useState('audio-init');
  const [audioGenerating, setAudioGenerating] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [composition, setComposition] = useState<CompositionProject | null>(null);
  const [exportPreset, setExportPreset] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [exportSettings, setExportSettings] = useState<any>({
    format: 'mp4',
    quality: 'high',
    resolution: '1080p',
    frameRate: 30,
  });
  const [isNewProject, setIsNewProject] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Computed ----
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

  // ---- 加载项目数据 ----
  const loadProject = useCallback(
    (id: string) => {
      setInitialLoading(true);
      setIsNewProject(false);

      tauriService
        .readText(id)
        .then((projectText) => {
          const projectData = JSON.parse(projectText) as ProjectData;
          setProject(projectData);
          if (projectData.content) setContent(projectData.content);
          if (projectData.novelMetadata) setNovelMetadata(projectData.novelMetadata);
          if (projectData.storyAnalysis) {
            setStoryAnalysis(projectData.storyAnalysis);
            setAnalysisDraft(JSON.stringify(projectData.storyAnalysis, null, 2));
            setAnalysisState('accepted');
          }
          if (Array.isArray(projectData.storyboardFrames))
            setStoryboardFrames(projectData.storyboardFrames);
          if (
            Array.isArray(projectData.storyboardComments) ||
            Array.isArray(projectData.storyboardVersions)
          ) {
            collaborationService.hydrate(
              projectData.id,
              projectData.storyboardComments ?? [],
              projectData.storyboardVersions ?? []
            );
            setStoryboardComments(collaborationService.listComments(projectData.id));
            setStoryboardVersions(collaborationService.listVersions(projectData.id));
          }
          if (projectData.audioConfig) {
            setAudioConfig(projectData.audioConfig);
            setAudioEditorKey(`audio-${Date.now()}`);
          }
          if (Array.isArray(projectData.characters)) setCharacters(projectData.characters);
          if (projectData.composition) setComposition(projectData.composition);
          if (projectData.exportPreset) setExportPreset(projectData.exportPreset);
          if (projectData.exportSettings) setExportSettings(projectData.exportSettings);
          if (projectData.script) {
            setScriptText(projectData.script);
            setCurrentStep(2);
          } else if (projectData.content) {
            setCurrentStep(1);
          }

          const search = new URLSearchParams(location.search);
          const frameId = search.get('frameId');
          const stepValue = search.get('step');
          if (frameId) {
            setCurrentStep(3);
            setFocusFrameId(frameId);
          } else if (stepValue) {
            const nextStep = Number(stepValue);
            if (Number.isInteger(nextStep) && nextStep >= 0 && nextStep <= 8) {
              setCurrentStep(nextStep);
            }
          }

          setError(null);
        })
        .catch((err) => {
          logger.error('加载项目失败:', err);
          setError('加载项目失败，请确认项目文件是否存在');
          toast.error('加载项目失败');
        })
        .finally(() => {
          setInitialLoading(false);
        });
    },
    [location.search]
  );

  // 初始化
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // ---- 事件处理 ----
  const handleContentLoad = useCallback(
    (newContent: string, metadata: NovelMetadata) => {
      setContent(newContent);
      setNovelMetadata(metadata);
      setStoryAnalysis(null);
      setStoryboardFrames([]);
      setAnalysisDraft('');
      setAnalysisState('idle');
      setSelectedFrame(null);
      setStoryboardComments([]);
      setStoryboardVersions([]);
      setCommentDraft('');
      setVersionLabel('');
      setCompareLeftVersionId(undefined);
      setCompareRightVersionId(undefined);
      setVersionDiff(null);
      if (currentStep === 0) setCurrentStep(1);
    },
    [currentStep]
  );

  const handleContentRemove = useCallback(() => {
    setContent('');
    setNovelMetadata(null);
    setScriptText('');
    setStoryAnalysis(null);
    setStoryboardFrames([]);
    setAnalysisDraft('');
    setAnalysisState('idle');
    setAudioConfig({
      voiceTracks: [],
      backgroundMusic: null,
      soundEffects: [],
      masterVolume: 80,
      voiceVolume: 80,
      musicVolume: 50,
      effectVolume: 70,
    });
  }, []);

  const buildStoryboardDraft = useCallback((analysis: StoryAnalysis): StoryboardFrame[] => {
    const draft = analysis.chapters.slice(0, 20).map((chapter, index) => ({
      id: `frame_${Date.now()}_${index}`,
      title: chapter.title ?? `分镜 ${index + 1}`,
      sceneDescription: chapter.summary ?? '',
      composition: index % 2 === 0 ? '三分法' : '中心构图',
      cameraType: index % 3 === 0 ? 'wide' : index % 3 === 1 ? 'medium' : 'closeup',
      dialogue: chapter.keyEvents?.[0] ?? '',
      duration: 5,
    }));
    return draft.length > 0
      ? draft
      : [
          {
            id: `frame_${Date.now()}_0`,
            title: '分镜 1',
            sceneDescription: analysis.summary ?? '',
            composition: '三分法',
            cameraType: 'medium',
            dialogue: '',
            duration: 5,
          },
        ];
  }, []);

  const handleApplyRenderedFrame = useCallback((frameId: string, imageUrl: string) => {
    setStoryboardFrames((prev) =>
      prev.map((frame) => (frame.id === frameId ? { ...frame, imageUrl } : frame))
    );
  }, []);

  const handleAddFrameComment = useCallback(() => {
    if (!project?.id || !selectedFrame || !commentDraft.trim()) return;
    collaborationService.addComment({
      projectId: project.id,
      frameId: selectedFrame.id,
      content: commentDraft.trim(),
      author: 'current-user',
    });
    setStoryboardComments(collaborationService.listComments(project.id));
    setCommentDraft('');
  }, [project?.id, selectedFrame, commentDraft]);

  const handleSaveStoryboardVersion = useCallback(() => {
    if (!project?.id) return;
    collaborationService.saveVersion({
      projectId: project.id,
      label: versionLabel.trim() ?? `版本-${new Date().toLocaleTimeString()}`,
      createdBy: 'current-user',
      payload: storyboardFrames,
    });
    const versions = collaborationService.listVersions(project.id);
    setStoryboardVersions(versions);
    setVersionLabel('');
    setCompareLeftVersionId(versions[versions.length - 1]?.id);
    toast.success('已保存分镜版本快照');
  }, [project?.id, versionLabel, storyboardFrames]);

  const handleCompareVersions = useCallback(() => {
    if (!compareLeftVersionId || !compareRightVersionId) {
      toast.warning('请选择两个版本进行对比');
      return;
    }
    const diff = collaborationService.diffVersions(compareLeftVersionId, compareRightVersionId);
    setVersionDiff(diff);
  }, [compareLeftVersionId, compareRightVersionId]);

  const handleRollbackVersion = useCallback(() => {
    if (!project?.id || !compareLeftVersionId) {
      toast.warning('请选择要回滚的版本');
      return;
    }
    const payload = collaborationService.rollback(project.id, compareLeftVersionId);
    if (Array.isArray(payload)) {
      setStoryboardFrames(payload as StoryboardFrame[]);
      toast.success('已回滚到所选版本');
      return;
    }
    toast.error('回滚失败，未找到对应版本');
  }, [project?.id, compareLeftVersionId]);

  const handleGenerateVoices = useCallback(async () => {
    if (!scriptText.trim()) {
      toast.warning('请先完成剧本生成');
      return;
    }
    try {
      setAudioGenerating(true);
      toast.info('正在生成配音轨道，请稍候...');
      const result = await audioPipelineService.generateVoiceTracks(scriptText, storyAnalysis, {
        maxLines: 20,
        projectId: project?.id,
      });
      setAudioConfig((prev) => ({
        ...prev,
        voiceTracks: result.voiceTracks as AudioTrackConfig['voiceTracks'],
      }));
      setAudioEditorKey(`audio-${Date.now()}`);
      if (result.failedLines.length > 0) {
        toast.warning(
          `已生成 ${result.voiceTracks.length} 条配音，${result.failedLines.length} 条失败`
        );
      } else {
        toast.success(`已生成 ${result.voiceTracks.length} 条配音`);
      }
    } catch (error) {
      logger.error('自动生成配音失败:', error);
      toast.error('自动生成配音失败');
    } finally {
      setAudioGenerating(false);
    }
  }, [scriptText, storyAnalysis, project?.id]);

  const handleAnalyzeContent = useCallback(async () => {
    if (!content) {
      toast.error('请先导入小说/剧本内容');
      return;
    }
    try {
      setLoading(true);
      toast.info('正在结构化分析内容，请稍候...');
      const analyzed = await storyAnalysisService.analyze(content, {
        provider: 'alibaba',
        model: 'qwen-3.5',
        maxRetries: 2,
        projectId: project?.id,
      });
      setStoryAnalysis(analyzed);
      setAnalysisDraft(JSON.stringify(analyzed, null, 2));
      setAnalysisState('generated');
      toast.success('结构化解析完成，请确认结果后继续');
    } catch (error) {
      logger.error('AI解析失败:', error);
      toast.error('AI解析失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }, [content, project?.id]);

  const handleAcceptAnalysis = useCallback(async () => {
    if (!analysisDraft.trim()) {
      toast.error('请先生成解析结果');
      return;
    }
    try {
      const parsed = JSON.parse(analysisDraft) as StoryAnalysis;
      setStoryAnalysis(parsed);
      setAnalysisState('accepted');
      if (storyboardFrames.length === 0) {
        setStoryboardFrames(buildStoryboardDraft(parsed));
      }
      setLoading(true);
      toast.info('正在根据解析结果生成剧本...');
      const generatedScript = await aiService.generate(
        `请基于以下故事结构生成适合视频脚本制作的剧本：\n\n${JSON.stringify(parsed, null, 2)}\n\n要求：按场景输出，包含旁白、对白、动作描述。`,
        { model: 'gpt-4', provider: 'openai' }
      );
      setScriptText(generatedScript);
      toast.success('剧本生成完成');
    } catch (error) {
      logger.error('剧本生成失败:', error);
      toast.error('剧本生成失败');
    } finally {
      setLoading(false);
    }
  }, [analysisDraft, storyboardFrames.length, buildStoryboardDraft]);

  const handleSaveProject = useCallback(async () => {
    if (!project) return;
    try {
      setSaving(true);
      const updated: ProjectData = {
        ...project,
        name: project.name,
        description: project.description,
        content,
        novelMetadata: novelMetadata ?? undefined,
        storyAnalysis: storyAnalysis ?? undefined,
        storyboardFrames: storyboardVersions?.[0]?.frames ?? undefined,
        storyboardComments: storyboardComments ?? undefined,
        storyboardVersions: storyboardVersions ?? undefined,
        characters: characters ?? undefined,
        composition: composition ?? undefined,
        audioConfig,
        exportPreset,
        exportSettings,
        script: scriptText,
        updatedAt: new Date().toISOString(),
      };
      await tauriService.writeText(project.id, JSON.stringify(updated));
      setProject(updated);
      onProjectChange?.(updated);
      toast.success('项目保存成功');
    } catch (error) {
      logger.error('保存项目失败:', error);
      toast.error('保存项目失败');
    } finally {
      setSaving(false);
    }
  }, [
    project,
    content,
    novelMetadata,
    storyAnalysis,
    storyboardFrames,
    storyboardComments,
    storyboardVersions,
    characters,
    composition,
    audioConfig,
    exportPreset,
    exportSettings,
    scriptText,
    onProjectChange,
  ]);

  const handleGoBack = useCallback(() => {
    navigate('/projects');
  }, [navigate]);

  return {
    // 状态
    currentStep,
    setCurrentStep,
    loading,
    saving,
    project,
    setProject,
    content,
    setContent,
    novelMetadata,
    setNovelMetadata,
    scriptText,
    setScriptText,
    storyAnalysis,
    setStoryAnalysis,
    storyboardFrames,
    setStoryboardFrames,
    analysisDraft,
    setAnalysisDraft,
    analysisState,
    setAnalysisState,
    selectedFrame,
    setSelectedFrame,
    storyboardComments,
    setStoryboardComments,
    storyboardVersions,
    setStoryboardVersions,
    commentDraft,
    setCommentDraft,
    versionLabel,
    setVersionLabel,
    compareLeftVersionId,
    setCompareLeftVersionId,
    compareRightVersionId,
    setCompareRightVersionId,
    versionDiff,
    setVersionDiff,
    focusFrameId,
    setFocusFrameId,
    audioConfig,
    setAudioConfig,
    audioEditorKey,
    setAudioEditorKey,
    audioGenerating,
    setAudioGenerating,
    characters,
    setCharacters,
    composition,
    setComposition,
    exportPreset,
    setExportPreset,
    exportSettings,
    setExportSettings,
    isNewProject,
    initialLoading,
    error,
    // Computed
    evaluationSummary,
    exportQualityGate,
    // 事件处理
    handleContentLoad,
    handleContentRemove,
    handleApplyRenderedFrame,
    handleAddFrameComment,
    handleSaveStoryboardVersion,
    handleCompareVersions,
    handleRollbackVersion,
    handleGenerateVoices,
    handleAnalyzeContent,
    handleAcceptAnalysis,
    handleSaveProject,
    handleGoBack,
    // 步骤组件映射
    stepComponents: {
      StepImport,
      StepAnalysis,
      StepScript,
      StepStoryboard,
      StepCharacter,
      StepRender,
      StepComposition,
      StepAudio,
      StepExport,
    },
  };
}
