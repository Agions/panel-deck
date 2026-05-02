import React, { useState, useCallback } from 'react';

import { GenerationResult } from '@/shared/components/pipeline/GenerationResult';
import { PipelineControls } from '@/shared/components/pipeline/PipelineControls';
import { PipelineProgress } from '@/shared/components/pipeline/PipelineProgress';

import {
  MangaPipelineController,
  type MangaPipelineResult,
  type MangaPipelineProgress,
} from '../controller/MangaPipelineController';

interface Props {
  onPipelineComplete?: (result: MangaPipelineResult) => void;
}

export const ScriptGenerationView: React.FC<Props> = ({ onPipelineComplete }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('anime');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [subStepName, setSubStepName] = useState('');
  const [result, setResult] = useState<MangaPipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pipelineRef = React.useRef<MangaPipelineController | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) {
      setError('请输入小说文本');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setResult(null);
    setIsPaused(false);

    try {
      const pipeline = new MangaPipelineController();
      pipelineRef.current = pipeline;

      // Subscribe to progress events
      pipeline.subscribe((event: MangaPipelineProgress) => {
        setProgress(event.overallProgress);
        setSubStepName(event.subStepName);
      });

      pipeline.onProgress((event) => {
        setProgress(event.progress);
        setSubStepName(event.message);
      });

      const output = await pipeline.process({ text, title: title || '未命名剧本', style });
      const mangaResult = (output as any).mangaPipeline as MangaPipelineResult;
      setResult(mangaResult);
      setProgress(100);
      setSubStepName('生成完成');
      onPipelineComplete?.(mangaResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
      pipelineRef.current = null;
    }
  }, [text, title, style, onPipelineComplete]);

  const handlePause = useCallback(async () => {
    if (pipelineRef.current) {
      await pipelineRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const handleResume = useCallback(() => {
    if (pipelineRef.current) {
      pipelineRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const handleSkip = useCallback(() => {
    pipelineRef.current?.skipCurrentStep();
  }, []);

  const handleCancel = useCallback(() => {
    if (pipelineRef.current) {
      pipelineRef.current.cancel();
      setIsGenerating(false);
      setIsPaused(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    pipelineRef.current?.reset();
    handleGenerate();
  }, [handleGenerate]);

  // Compute stats from result
  const stats = result?.scriptResult?.metadata ? {
    chaptersCount: result.scriptResult.metadata.chaptersCount,
    eventsCount: result.scriptResult.metadata.eventsCount,
    charactersCount: result.scriptResult.metadata.charactersCount,
    scenesCount: result.scriptResult.metadata.scenesCount,
  } : {};

  const script = result?.scriptResult?.script;
  const characters = script?.characters.map((c) => ({
    id: c.id,
    name: c.name,
    personality: c.personality,
    speakingStyle: c.speakingStyle,
  })) ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">🎬 AI 漫剧生成流水线</h2>

      {/* Input Section */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="script-title" className="block text-sm font-medium mb-2">
              剧本标题（可选）
            </label>
            <input
              id="script-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="输入剧本标题"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label htmlFor="style-select" className="block text-sm font-medium mb-2">
              视觉风格
            </label>
            <select
              id="style-select"
              value={style}
              onChange={e => setStyle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              disabled={isGenerating}
            >
              <option value="anime">动漫风格</option>
              <option value="comic">漫画风格</option>
              <option value="sketch">素描风格</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="script-text" className="block text-sm font-medium mb-2">
            小说原文
          </label>
          <textarea
            id="script-text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="粘贴小说文本，支持第X章、Chapter X 等章节标记..."
            rows={10}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
            disabled={isGenerating}
          />
          <p className="text-xs text-gray-500 mt-1">
            {text.length} 字符 | {text.split(/第\S*章|Chapter \d+/i).length - 1} 章节
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? '生成中...' : '🎬 一键生成漫剧'}
          </button>
          {isGenerating && (
            <span className="py-3 text-sm text-gray-500">
              流水线：脚本 → 分镜 → 素材 → 配音 → 关键帧
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex justify-between items-start">
            <span>❌ {error}</span>
            <button
              onClick={handleRetry}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              重试
            </button>
          </div>
        </div>
      )}

      {/* Progress Section */}
      {isGenerating && (
        <div className="mb-6 bg-white border rounded-lg p-4 space-y-4">
          <PipelineProgress
            progress={progress}
            stepName={subStepName}
            isIndeterminate={false}
          />
          <PipelineControls
            isRunning={isGenerating}
            isPaused={isPaused}
            canSkip={true}
            canRetry={false}
            onAction={(action) => {
              switch (action) {
                case 'pause': handlePause(); break;
                case 'resume': handleResume(); break;
                case 'skip': handleSkip(); break;
                case 'cancel': handleCancel(); break;
              }
            }}
          />
        </div>
      )}

      {/* Result Section */}
      {result && !isGenerating && (
        <div className="space-y-6">
          {/* Pipeline Summary */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">✅ 漫剧生成完成</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <span className={result.scriptResult ? 'text-green-600' : 'text-gray-400'}>
                {result.scriptResult ? '✓' : '✗'} 剧本
              </span>
              <span className={result.storyboard ? 'text-green-600' : 'text-gray-400'}>
                {result.storyboard ? '✓' : '✗'} 分镜
              </span>
              <span className={result.materialResult ? 'text-green-600' : 'text-gray-400'}>
                {result.materialResult ? '✓' : '✗'} 素材
              </span>
              <span className={result.voiceResult ? 'text-green-600' : 'text-gray-400'}>
                {result.voiceResult ? '✓' : '✗'} 配音
              </span>
              <span className={result.keyframeResult ? 'text-green-600' : 'text-gray-400'}>
                {result.keyframeResult ? '✓' : '✗'} 关键帧
              </span>
            </div>
            {result.keyframeResult?.videoFragments && (
              <p className="mt-2 text-sm text-gray-600">
                共生成 {result.keyframeResult.videoFragments.length} 个视频片段
              </p>
            )}
          </div>

          {/* Script Result */}
          {script && (
            <GenerationResult
              title={script.title}
              grade={result.scriptResult?.metadata?.grade ?? 'N/A'}
              evaluationScore={result.scriptResult?.metadata?.evaluationScore}
              metadata={stats}
              scenes={script.scenes.map(s => ({
                id: s.id,
                sceneNumber: s.sceneNumber,
                location: s.location,
                timeOfDay: s.timeOfDay,
                emotion: s.emotion,
                content: s.content,
                cameraHint: s.cameraHint,
                type: s.type,
                transition: s.transition,
              }))}
              characters={characters}
              maxScenesToShow={5}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ScriptGenerationView;
