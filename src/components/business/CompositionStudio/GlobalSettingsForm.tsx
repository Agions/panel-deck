/**
 * 合成全局设置表单组件
 */

import React from 'react';

import {
  Divider,
  Form,
  FormItem,
  InputNumber,
  Row,
  Col,
  Select,
} from '@/components/ui/ui-components';
import { SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { TransitionConfig } from '@/core/types';

interface GlobalSettingsFormProps {
  initialValues: {
    frameDuration: number;
    defaultTransition: TransitionConfig;
    transitions?: TransitionConfig[];
  };
  onSave: (values: {
    frameDuration: number;
    defaultTransition: { effect: string; duration: number; easing: string };
    transitions?: TransitionConfig[];
  }) => void;
}

const TRANSITION_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'fade', label: '淡入淡出' },
  { value: 'crossfade', label: '交叉淡化' },
  { value: 'dissolve', label: '溶解' },
  { value: 'wipe-left', label: '左擦除' },
  { value: 'wipe-right', label: '右擦除' },
  { value: 'wipe-up', label: '上擦除' },
  { value: 'wipe-down', label: '下擦除' },
  { value: 'slide-left', label: '左滑入' },
  { value: 'slide-right', label: '右滑入' },
  { value: 'zoom', label: '缩放过渡' },
  { value: 'blur', label: '模糊过渡' },
];

function GlobalSettingsForm({ initialValues, onSave }: GlobalSettingsFormProps) {
  return (
    <Form layout="vertical" initialValues={initialValues} onFinish={onSave as (values: unknown) => void}>
      <FormItem name="frameDuration" label="默认帧时长 (秒)">
        <Slider min={1} max={10} step={0.5} />
      </FormItem>

      <Divider orientation="left">默认转场</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <FormItem name="defaultTransition.effect" label="转场效果">
            <Select>
              {TRANSITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="defaultTransition.duration" label="转场时长 (秒)">
            <InputNumber min={0.1} max={5} step={0.1} style={{ width: '100%' }} />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <FormItem name="defaultTransition.easing" label="缓动函数">
            <Select>
              <SelectItem value="linear">线性</SelectItem>
              <SelectItem value="ease-in">渐快</SelectItem>
              <SelectItem value="ease-out">渐慢</SelectItem>
              <SelectItem value="ease-in-out">先慢后快再慢</SelectItem>
            </Select>
          </FormItem>
        </Col>
      </Row>

      <Divider orientation="left">逐段转场配置（可选）</Divider>
      <FormItem name="transitions" label="分镜间转场">
        <div />
      </FormItem>
    </Form>
  );
}

export default GlobalSettingsForm;