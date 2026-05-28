/**
 * 帧编辑表单组件
 */

import React, { useCallback, useMemo } from 'react';

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
import type { FrameAnimation, CameraMotionConfig } from '@/shared/types/composition';

const CAMERA_MOTION_OPTIONS = [
  { value: 'static', label: '静止' },
  { value: 'pan-left', label: '左摇' },
  { value: 'pan-right', label: '右摇' },
  { value: 'tilt-up', label: '上仰' },
  { value: 'tilt-down', label: '下俯' },
  { value: 'dolly-in', label: '推进' },
  { value: 'dolly-out', label: '拉远' },
  { value: 'zoom-in', label: '放大' },
  { value: 'zoom-out', label: '缩小' },
  { value: 'shake', label: '抖动' },
];

interface FrameEditFormProps {
  frameId: string;
  initialValues?: FrameAnimation;
  onSave: (values: Partial<FrameAnimation>) => void;
  onReset: () => void;
}

const FrameEditForm = ({
  frameId: _frameId,
  initialValues,
  onSave,
  onReset: _onReset,
}: FrameEditFormProps) => {
  const handleFinish = useCallback(
    (values: {
      cameraMotion: string | null;
      cameraDuration?: number;
      cameraIntensity?: number;
      zoom?: number;
      panX?: number;
      panY?: number;
      rotation?: number;
      opacity?: number;
      blur?: number;
      brightness?: number;
      contrast?: number;
      saturation?: number;
    }) => {
      onSave({
        cameraMotion: values.cameraMotion
          ? {
              type: values.cameraMotion as CameraMotionConfig['type'],
              duration: values.cameraDuration ?? 1,
              intensity: values.cameraIntensity ?? 0.5,
            }
          : null,
        zoom: values.zoom,
        pan: { x: values.panX ?? 0, y: values.panY ?? 0 },
        rotation: values.rotation ?? 0,
        opacity: values.opacity ?? 1,
        filters: {
          blur: values.blur ?? 0,
          brightness: values.brightness ?? 100,
          contrast: values.contrast ?? 100,
          saturation: values.saturation ?? 100,
        },
      });
    },
    [onSave]
  );

  const formInitialValues = useMemo(
    () => ({
      cameraMotion: initialValues?.cameraMotion?.type ?? null,
      cameraDuration: initialValues?.cameraMotion?.duration ?? 1,
      cameraIntensity: initialValues?.cameraMotion?.intensity ?? 0.5,
      zoom: initialValues?.zoom ?? 1,
      panX: initialValues?.pan?.x ?? 0,
      panY: initialValues?.pan?.y ?? 0,
      rotation: initialValues?.rotation ?? 0,
      opacity: initialValues?.opacity ?? 1,
      blur: initialValues?.filters?.blur ?? 0,
      brightness: initialValues?.filters?.brightness ?? 100,
      contrast: initialValues?.filters?.contrast ?? 100,
      saturation: initialValues?.filters?.saturation ?? 100,
    }),
    [initialValues]
  );

  return (
    <Form layout="vertical" initialValues={formInitialValues} onFinish={handleFinish as (values: unknown) => void}>
      <Divider orientation="left">镜头运动</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <FormItem name="cameraMotion" label="运动类型">
            <Select placeholder="选择镜头运动">
              {CAMERA_MOTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="cameraDuration" label="持续时间 (秒)">
            <InputNumber min={0.1} max={10} style={{ width: '100%' }} />
          </FormItem>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <FormItem name="cameraIntensity" label="运动强度">
            <Slider min={0} max={1} step={0.1} />
          </FormItem>
        </Col>
        <Col span={12}>
          <FormItem name="zoom" label="缩放">
            <Slider min={0.1} max={3} step={0.1} />
          </FormItem>
        </Col>
      </Row>

      <Divider orientation="left">几何变换</Divider>
      <Row gutter={16}>
        <Col span={8}>
          <FormItem name="panX" label="平移 X">
            <InputNumber min={-100} max={100} style={{ width: '100%' }} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="panY" label="平移 Y">
            <InputNumber min={-100} max={100} style={{ width: '100%' }} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="rotation" label="旋转角度">
            <InputNumber min={-180} max={180} style={{ width: '100%' }} />
          </FormItem>
        </Col>
      </Row>
      <FormItem name="opacity" label="透明度">
        <Slider min={0} max={1} step={0.05} />
      </FormItem>

      <Divider orientation="left">滤镜</Divider>
      <Row gutter={16}>
        <Col span={8}>
          <FormItem name="blur" label="模糊">
            <Slider min={0} max={10} step={0.5} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="brightness" label="亮度">
            <Slider min={0} max={200} />
          </FormItem>
        </Col>
        <Col span={8}>
          <FormItem name="contrast" label="对比度">
            <Slider min={0} max={200} />
          </FormItem>
        </Col>
      </Row>
      <FormItem name="saturation" label="饱和度">
        <Slider min={0} max={200} />
      </FormItem>
    </Form>
  );
};

export default FrameEditForm;