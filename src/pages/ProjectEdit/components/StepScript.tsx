/**
 * Step 2: 编辑剧本
 */
import { Edit } from 'lucide-react';
import React, { lazy } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import styles from '../ProjectEdit.module.less';

const ScriptEditor = lazy(() => import('@/features/script/components/ScriptEditor'));

export interface StepScriptProps {
  onExport: (format: string) => void;
  onSave: (segments: unknown) => void;
  onPrev: () => void;
  onNext: () => void;
}

function StepScript({ onExport, onPrev, onNext, onSave }: StepScriptProps) {
  return (
    <Card className={styles.stepCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          编辑剧本
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          编辑和优化AI生成的剧本内容，可以添加、删除或修改片段。
        </p>

        <ScriptEditor videoPath="" initialSegments={[]} onSave={onSave} onExport={onExport} />

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

export default StepScript;
