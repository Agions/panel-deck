/**
 * 场景列表面板组件
 * 负责场景列表展示、选择、增删改操作
 */

import {
  Plus,
  Trash2,
  Edit,
  Copy,
  MapPin,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { List } from '@/components/ui/list';
import { Popconfirm } from '@/components/ui/confirm-dialog';
import { Tag } from '@/components/ui/tag';
import { Tooltip } from '@/components/ui/tooltip';
import { Text, Title } from '@/components/ui/typography';
import { generatePrefixedId } from '@/shared/utils';

import styles from './SceneRenderer.module.less';

export interface Scene {
  id: string;
  name: string;
  type: string;
  atmosphere: string;
  props: SceneProp[];
}

// 氛围选项
const ATMOSPHERE_OPTIONS = [
  { value: 'warm', label: '温馨', color: '#fa8c16' },
  { value: 'horror', label: '恐怖', color: '#000000' },
  { value: 'romantic', label: '浪漫', color: '#eb2f96' },
  { value: 'battle', label: '战斗', color: '#f5222d' },
  { value: 'mysterious', label: '神秘', color: '#722ed1' },
  { value: 'peaceful', label: '平静', color: '#52c41a' },
  { value: 'sad', label: '悲伤', color: '#595959' },
  { value: 'joyful', label: '欢乐', color: '#faad14' },
];

// 场景类型选项
const SCENE_TYPE_OPTIONS = [
  { value: 'indoor', label: '室内', icon: <MapPin /> },
  { value: 'outdoor', label: '室外', icon: <MapPin /> },
  { value: 'fantasy', label: '幻想', icon: <MapPin /> },
  { value: 'future', label: '未来', icon: <MapPin /> },
  { value: 'urban', label: '城市', icon: <MapPin /> },
  { value: 'nature', label: '自然', icon: <MapPin /> },
  { value: 'interior', label: '内景', icon: <MapPin /> },
];

export interface SceneProp {
  id: string;
  name: string;
  category: string;
  position: { x: number; y: number; z: number };
  scale: number;
  rotation: number;
  color?: string;
}

interface SceneListPanelProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSceneSelect: (scene: Scene) => void;
  onSceneAdd: () => void;
  onSceneRemove: (sceneId: string) => void;
  onSceneDuplicate: (scene: Scene) => void;
}

function SceneListPanel({
  scenes,
  selectedSceneId,
  onSceneSelect,
  onSceneAdd,
  onSceneRemove,
  onSceneDuplicate,
}: SceneListPanelProps) {
  const getSceneTypeIcon = (type: string) => {
    const option = SCENE_TYPE_OPTIONS.find((opt) => opt.value === type);
    return option?.icon || <MapPin />;
  };

  const getAtmosphereColor = (atmosphere: string) => {
    const option = ATMOSPHERE_OPTIONS.find((opt) => opt.value === atmosphere);
    return option?.color ?? '#1890ff';
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <Title level={5} className={styles.sidebarTitle}>
          场景列表
        </Title>
        <Button type="primary" icon={<Plus />} size="small" onClick={onSceneAdd}>
          新建场景
        </Button>
      </div>

      <div className={styles.sceneList}>
        {scenes.length === 0 ? (
          <Empty image={undefined} description="暂无场景" className={styles.emptyState} />
        ) : (
          <List
            dataSource={scenes}
            renderItem={(scene) => (
              <List.Item
                className={`${styles.sceneItem} ${selectedSceneId === scene.id ? styles.selected : ''}`}
                onClick={() => onSceneSelect(scene)}
              >
                <div className={styles.sceneItemContent}>
                  <div className={styles.sceneIcon}>{getSceneTypeIcon(scene.type)}</div>
                  <div className={styles.sceneInfo}>
                    <Text className={styles.sceneName} ellipsis>
                      {scene.name}
                    </Text>
                    <Tag
                      color={getAtmosphereColor(scene.atmosphere)}
                      className={styles.atmosphereTag}
                    >
                      {ATMOSPHERE_OPTIONS.find((a) => a.value === scene.atmosphere)?.label ??
                        scene.atmosphere}
                    </Tag>
                  </div>
                  <div className={styles.sceneActions}>
                    <Tooltip title="编辑">
                      <Button
                        type="text"
                        size="small"
                        icon={<Edit />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSceneSelect(scene);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="复制">
                      <Button
                        type="text"
                        size="small"
                        icon={<Copy />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSceneDuplicate(scene);
                        }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="确定删除此场景?"
                      onConfirm={() => onSceneRemove(scene.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<Trash2 />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>

      <div className={styles.sidebarFooter}>
        <Text type="secondary">共 {scenes.length} 个场景</Text>
      </div>
    </div>
  );
}

export default SceneListPanel;