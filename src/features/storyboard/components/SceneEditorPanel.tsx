/**
 * 场景编辑面板组件
 * 负责场景属性编辑表单
 */

import React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Col, Row } from '@/components/ui/grid';
import { Input } from '@/components/ui/input';
import { AntDSelect } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Space } from '@/components/ui/space';
import { TextArea } from '@/components/ui/textarea';
import { Text } from '@/components/ui/typography';

import styles from './SceneRenderer.module.less';

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
  description: string;
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

// 道具类型
const PROP_CATEGORIES = [
  { value: 'furniture', label: '家具' },
  { value: 'electronics', label: '电子产品' },
  { value: 'decoration', label: '装饰品' },
  { value: 'clothing', label: '服装' },
  { value: 'vehicle', label: '交通工具' },
  { value: 'weapon', label: '武器' },
  { value: 'tool', label: '工具' },
  { value: 'food', label: '食物' },
  { value: 'plant', label: '植物' },
  { value: 'animal', label: '动物' },
  { value: 'other', label: '其他' },
];

const SCENE_TYPE_OPTIONS = [
  { value: 'indoor', label: '室内' },
  { value: 'outdoor', label: '室外' },
  { value: 'fantasy', label: '幻想' },
  { value: 'future', label: '未来' },
  { value: 'urban', label: '城市' },
  { value: 'nature', label: '自然' },
  { value: 'interior', label: '内景' },
];

const ATMOSPHERE_OPTIONS = [
  { value: 'warm', label: '温馨' },
  { value: 'horror', label: '恐怖' },
  { value: 'romantic', label: '浪漫' },
  { value: 'battle', label: '战斗' },
  { value: 'mysterious', label: '神秘' },
  { value: 'peaceful', label: '平静' },
  { value: 'sad', label: '悲伤' },
  { value: 'joyful', label: '欢乐' },
];

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

const TIME_OF_DAY_OPTIONS = [
  { value: 'day', label: '白天' },
  { value: 'night', label: '夜晚' },
  { value: 'dawn', label: '黎明' },
  { value: 'dusk', label: '黄昏' },
  { value: 'midnight', label: '午夜' },
];

interface SceneEditorPanelProps {
  scene: Scene;
  onSceneUpdate: (sceneId: string, field: string, value: unknown) => void;
  onPropAdd: (sceneId: string) => void;
  onPropUpdate: (sceneId: string, propId: string, field: keyof SceneProp, value: unknown) => void;
  onPropRemove: (sceneId: string, propId: string) => void;
}

function SceneEditorPanel({
  scene,
  onSceneUpdate,
  onPropAdd,
  onPropUpdate,
  onPropRemove,
}: SceneEditorPanelProps) {
  const handleFieldChange = (field: string, value: unknown) => {
    onSceneUpdate(scene.id, field, value);
  };

  return (
    <div className={styles.editPanel}>
      <Text strong className={styles.sectionTitle}>
        场景属性
      </Text>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text type="secondary">名称</Text>
          <Input
            value={scene.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="输入场景名称"
          />
        </div>

        <Row gutter={8}>
          <Col span={12}>
            <Text type="secondary">类型</Text>
            <AntDSelect
              value={scene.type || 'indoor'}
              onChange={(v) => handleFieldChange('type', v)}
              options={SCENE_TYPE_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={12}>
            <Text type="secondary">氛围</Text>
            <AntDSelect
              value={scene.atmosphere || 'peaceful'}
              onChange={(v) => handleFieldChange('atmosphere', v)}
              options={ATMOSPHERE_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={12}>
            <Text type="secondary">光照</Text>
            <AntDSelect
              value={scene.lighting || 'natural'}
              onChange={(v) => handleFieldChange('lighting', v)}
              options={LIGHTING_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={12}>
            <Text type="secondary">天气</Text>
            <AntDSelect
              value={scene.weather || 'sunny'}
              onChange={(v) => handleFieldChange('weather', v)}
              options={WEATHER_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        <Row gutter={8}>
          <Col span={12}>
            <Text type="secondary">时间段</Text>
            <AntDSelect
              value={scene.timeOfDay || 'day'}
              onChange={(v) => handleFieldChange('timeOfDay', v)}
              options={TIME_OF_DAY_OPTIONS}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        <div>
          <Text type="secondary">背景描述</Text>
          <TextArea
            value={scene.backgroundDescription || ''}
            onChange={(e) => handleFieldChange('backgroundDescription', e.target.value)}
            placeholder="描述场景背景..."
            rows={3}
          />
        </div>

        <div>
          <Text type="secondary">详细描述</Text>
          <TextArea
            value={scene.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="详细描述场景..."
            rows={4}
          />
        </div>
      </Space>

      <Divider />

      <Text strong className={styles.sectionTitle}>
        道具管理
      </Text>

      <div className={styles.propEditor}>
        {scene.props.map((prop) => (
          <Card key={prop.id} size="small" className={styles.propCard}>
            <Row gutter={8}>
              <Col span={8}>
                <Input
                  value={prop.name}
                  onChange={(e) => onPropUpdate(scene.id, prop.id, 'name', e.target.value)}
                  placeholder="道具名"
                />
              </Col>
              <Col span={8}>
                <AntDSelect
                  value={prop.category || 'other'}
                  onChange={(v) => onPropUpdate(scene.id, prop.id, 'category', v)}
                  options={PROP_CATEGORIES}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <Slider
                  value={prop.scale}
                  onChange={(v) => onPropUpdate(scene.id, prop.id, 'scale', v)}
                  min={0.1}
                  max={3}
                  step={0.1}
                />
              </Col>
              <Col span={4}>
                <Button
                  type="text"
                  danger
                  onClick={() => onPropRemove(scene.id, prop.id)}
                >
                  删除
                </Button>
              </Col>
            </Row>
          </Card>
        ))}

        <Button type="dashed" onClick={() => onPropAdd(scene.id)} style={{ width: '100%' }}>
          + 添加道具
        </Button>
      </div>
    </div>
  );
}

export default SceneEditorPanel;