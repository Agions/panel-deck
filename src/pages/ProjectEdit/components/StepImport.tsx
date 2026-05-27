/**
 * Step 0: 导入小说/剧本
 */
import { FileText } from 'lucide-react';
import React, { lazy } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import styles from '../ProjectEdit.module.less';

const NovelImporter = lazy(() => import('@/features/script/components/NovelImporter'));

export interface StepImportProps {
  content: string;
  loading: boolean;
  onContentLoad: (
    newContent: string,
    metadata: import('@/features/script/components/NovelImporter').NovelMetadata
  ) => void;
  onRemove: () => void;
  onNext: () => void;
}

function StepImport({ content, loading, onContentLoad, onRemove, onNext }: StepImportProps) {
  return (
    <Card className={styles.stepCard}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          导入小说/剧本
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          请导入小说或剧本文件，支持 TXT、MD、DOCX 格式。您也可以直接粘贴内容。
        </p>
        <NovelImporter
          initialContent={content}
          onContentLoad={onContentLoad}
          onRemove={onRemove}
          loading={loading}
        />
        <div className={styles.stepActions}>
          <Button variant="default" onClick={onNext} disabled={!content}>
            下一步
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default StepImport;
