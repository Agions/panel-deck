/**
 * Step 7: 配音配乐
 */
import { Volume2 } from 'lucide-react';
import React, { lazy } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AudioTrackConfig } from '@/features/audio/components/AudioEditor';
import type { StoryboardFrame } from '@/features/storyboard/components/StoryboardEditor';

import styles from '../ProjectEdit.module.less';

const AudioEditor = lazy(() => import('@/features/audio/components/AudioEditor'));

export interface StepAudioProps {
  audioConfig: AudioTrackConfig;
  audioEditorKey: string;
  audioGenerating: boolean;
  scriptText: string;
  storyboardFrames: StoryboardFrame[];
  onConfigChange: (config: AudioTrackConfig) => void;
  onGenerateVoices: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function StepAudio({
  audioConfig,
  audioEditorKey,
  audioGenerating,
  scriptText,
  storyboardFrames,
  onConfigChange,
  onGenerateVoices,
  onPrev,
  onNext,
}: StepAudioProps) {
  return (
    <Card className={styles.stepCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          配音配乐
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">添加配音和背景音乐。</p>
        <div className={styles.audioActions}>
          <Button
            variant="default"
            onClick={onGenerateVoices}
            disabled={!scriptText || audioGenerating}
          >
            {audioGenerating ? '生成中...' : '一键生成配音'}
          </Button>
        </div>
        <div className={styles.audioContainer}>
          <AudioEditor
            key={audioEditorKey}
            initialConfig={audioConfig}
            onConfigChange={onConfigChange}
            videoDuration={Math.max(storyboardFrames.length * 5, 60)}
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

export default StepAudio;
