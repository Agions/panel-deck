/**
 * 场景预览面板组件
 * 负责场景详情预览、画面调整和道具管理
 */

import React from 'react';

import { Cloud, Lightbulb, MapPin, Sun, Trash2 } from 'lucide-react';
import { Divider } from '@/components/ui/divider';
import { Popconfirm } from '@/components/ui/confirm-dialog';
import { Row, Col } from '@/components/ui/grid';
import { Slider } from '@/components/ui/slider';
import { Space } from '@/components/ui/space';
import { Tag } from '@/components/ui/tag';
import { Text, Title } from '@/components/ui/typography';

import styles from './SceneRenderer.module.less';

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

// 光照选项
const LIGHTING_OPTIONS = [
  { value: 'natural', label: '自然光' },
  { value: 'artificial', label: '灯光' },
  { value: 'moonlight', label: '月光' },
  { value: 'firelight', label: '火光' },
  { value: 'neon', label: '霓虹' },
  { value: 'candlelight', label: '烛光' },
  { value: 'flash', label: '闪光' },
  { value: 'shadow', label: '阴影' },
];

// 天气选项
const WEATHER_OPTIONS = [
  { value: 'sunny', label: '晴天' },
  { value: 'cloudy', label: '多云' },
  { value: 'rainy', label: '雨天' },
  { value: 'snowy', label: '雪天' },
  { value: 'foggy', label: '雾天' },
  { value: 'stormy', label: '暴风雨' },
  { value: 'night', label: '夜晚' },
  { value: 'dawn', label: '黎明' },
  { value: 'dusk', label: '黄昏' },
];

// 场景类型选项
const SCENE_TYPE_OPTIONS = [
  { value: 'indoor', label: '室内' },
  { value: 'outdoor', label: '室外' },
  { value: 'fantasy', label: '幻想' },
  { value: 'future', label: '未来' },
  { value: 'urban', label: '城市' },
  { value: 'nature', label: '自然' },
  { value: 'interior', label: '内景' },
];

interface SceneProp {
  id: string;
  name: string;
  category: string;
  position: { x: number; y: number; z: number };
  scale: number;
  rotation: number;
  color?: string;
}

interface Scene {
  id: string;
  name: string;
  type: string;
  atmosphere: string;
  lighting: string;
  weather: string;
  backgroundDescription: string;
  props: SceneProp[];
  timeOfDay: string;
  brightness: number;
  saturation: number;
  contrast: number;
  imageUrl?: string;
}

interface ScenePreviewPanelProps {
  scene: Scene;
  onSceneUpdate: (sceneId: string, field: string, value: unknown) => void;
  onPropRemove: (sceneId: string, propId: string) => void;
}

function ScenePreviewPanel({ scene, onSceneUpdate, onPropRemove }: ScenePreviewPanelProps) {
  const getAtmosphereColor = (atmosphere: string) => {
    const option = ATMOSPHERE_OPTIONS.find((opt) => opt.value === atmosphere);
    return option?.color ?? '#1890ff';
  };

  return (
    <div className={styles.preview}>
      <div className={styles.previewHeader}>
        <Title level={4} className={styles.previewName}>
          {scene.name}
        </Title>
        <Space>
          <Tag>
            {SCENE_TYPE_OPTIONS.find((t) => t.value === scene.type)?.label ?? scene.type}
          </Tag>
          <Tag color={getAtmosphereColor(scene.atmosphere)}>
            {ATMOSPHERE_OPTIONS.find((a) => a.value === scene.atmosphere)?.label ?? scene.atmosphere}
          </Tag>
        </Space>
      </div>

      <div className={styles.previewImage}>
        {scene.imageUrl ? (
          <img src={scene.imageUrl} alt={scene.name} />
        ) : (
          <div className={styles.previewPlaceholder}>
            <MapPin style={{ fontSize: 64, color: '#d9d9d9' }} />
            <Text type="secondary">场景预览区域</Text>
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <Text type="secondary">
                {scene.backgroundDescription || '请输入背景描述'}
              </Text>
            </div>
          </div>
        )}
      </div>

      <div className={styles.previewInfo}>
        <Row gutter={16}>
          <Col span={8}>
            <div className={styles.infoItem}>
              <Lightbulb />
              <Text>
                {LIGHTING_OPTIONS.find((l) => l.value === scene.lighting)?.label ?? scene.lighting}
              </Text>
            </div>
          </Col>
          <Col span={8}>
            <div className={styles.infoItem}>
              <Cloud />
              <Text>
                {WEATHER_OPTIONS.find((w) => w.value === scene.weather)?.label ?? scene.weather}
              </Text>
            </div>
          </Col>
          <Col span={8}>
            <div className={styles.infoItem}>
              <Sun />
              <Text>
                {scene.timeOfDay === 'day'
                  ? '白天'
                  : scene.timeOfDay === 'night'
                    ? '夜晚'
                    : scene.timeOfDay}
              </Text>
            </div>
          </Col>
        </Row>

        <Divider />

        <div className={styles.adjustmentPanel}>
          <Text strong>画面调整</Text>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={8}>
              <Text type="secondary">亮度</Text>
              <Slider
                value={scene.brightness}
                onChange={(value) => onSceneUpdate(scene.id, 'brightness', value)}
                min={0}
                max={100}
              />
            </Col>
            <Col span={8}>
              <Text type="secondary">饱和度</Text>
              <Slider
                value={scene.saturation}
                onChange={(value) => onSceneUpdate(scene.id, 'saturation', value)}
                min={0}
                max={100}
              />
            </Col>
            <Col span={8}>
              <Text type="secondary">对比度</Text>
              <Slider
                value={scene.contrast}
                onChange={(value) => onSceneUpdate(scene.id, 'contrast', value)}
                min={0}
                max={100}
              />
            </Col>
          </Row>
        </div>

        {scene.props.length > 0 && (
          <>
            <Divider />
            <div className={styles.propsPreview}>
              <Text strong>道具列表 ({scene.props.length})</Text>
              <div className={styles.propsList}>
                {scene.props.map((prop) => (
                  <Tag key={prop.id} className={styles.propTag}>
                    {prop.name}
                    <Popconfirm
                      title="确定删除此道具?"
                      onConfirm={() => onPropRemove(scene.id, prop.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Trash2
                        style={{ marginLeft: 4, cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </Tag>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ScenePreviewPanel;