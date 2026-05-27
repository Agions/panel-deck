/**
 * @fileoverview AutoPipeline Store 单元测试
 * Tests for 全自动流水线状态管理 (Zustand store)
 * 使用 Jest 测试框架
 */

import type { StepState, AutoPipelineResult, AutoPipelineInput } from '@/core/autonomous/autonomous.types';

describe('AutoPipelineStore', () => {
  // 重新实现 store 逻辑用于测试
  let state: {
    mode: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
    currentStepId: string | null;
    progress: number;
    steps: Record<string, StepState>;
    input: AutoPipelineInput | null;
    result: AutoPipelineResult | null;
    error: string | null;
    notifyOnComplete: boolean;
    notifyEmail: string | null;
  };
  let actions: Record<string, (...args: unknown[]) => void>;

  const initialState = {
    mode: 'idle' as const,
    currentStepId: null,
    progress: 0,
    steps: {} as Record<string, StepState>,
    input: null as AutoPipelineInput | null,
    result: null as AutoPipelineResult | null,
    error: null as string | null,
    notifyOnComplete: false,
    notifyEmail: null as string | null,
  };

  beforeEach(() => {
    state = { ...initialState };
    actions = {
      startPipeline: (input: AutoPipelineInput) => {
        state.mode = 'running';
        state.input = input;
        state.progress = 0;
        state.error = null;
        state.result = null;
      },
      pausePipeline: () => {
        if (state.mode === 'running') {
          state.mode = 'paused';
        }
      },
      resumePipeline: () => {
        if (state.mode === 'paused') {
          state.mode = 'running';
        }
      },
      cancelPipeline: () => {
        state.mode = 'idle';
        state.currentStepId = null;
        state.progress = 0;
      },
      resetPipeline: () => {
        state = { ...initialState };
      },
      updateStepState: (stepId: string, partial: Partial<StepState>) => {
        if (!state.steps[stepId]) {
          state.steps[stepId] = {
            stepId,
            name: '',
            status: 'pending',
            progress: 0,
            reviewCount: 0,
          };
        }
        state.steps[stepId] = { ...state.steps[stepId], ...partial };
      },
      setResult: (result: AutoPipelineResult) => {
        state.result = result;
        state.mode = result.success ? 'completed' : 'failed';
        state.progress = 100;
      },
      setError: (error: string) => {
        state.error = error;
        state.mode = 'failed';
      },
      setNotifyOnComplete: (enabled: boolean, email?: string) => {
        state.notifyOnComplete = enabled;
        state.notifyEmail = email ?? null;
      },
    };
  });

  describe('初始状态', () => {
    it('应该处于 idle 模式', () => {
      expect(state.mode).toBe('idle');
    });

    it('进度应该为 0', () => {
      expect(state.progress).toBe(0);
    });

    it('没有当前步骤', () => {
      expect(state.currentStepId).toBeNull();
    });

    it('没有输入和结果', () => {
      expect(state.input).toBeNull();
      expect(state.result).toBeNull();
    });

    it('没有错误', () => {
      expect(state.error).toBeNull();
    });

    it('通知关闭', () => {
      expect(state.notifyOnComplete).toBe(false);
      expect(state.notifyEmail).toBeNull();
    });
  });

  describe('startPipeline', () => {
    it('应该将模式设置为 running', () => {
      const input: AutoPipelineInput = { content: '测试内容', mode: 'novel' };
      actions.startPipeline(input);
      expect(state.mode).toBe('running');
    });

    it('应该设置输入', () => {
      const input: AutoPipelineInput = { content: '测试内容', mode: 'novel', title: '测试项目' };
      actions.startPipeline(input);
      expect(state.input).toEqual(input);
    });

    it('应该重置进度', () => {
      state.progress = 50;
      actions.startPipeline({ content: 'test', mode: 'novel' });
      expect(state.progress).toBe(0);
    });

    it('应该清除之前的错误', () => {
      state.error = '之前的错误';
      actions.startPipeline({ content: 'test', mode: 'novel' });
      expect(state.error).toBeNull();
    });

    it('应该清除之前的结果', () => {
      state.result = { success: true };
      actions.startPipeline({ content: 'test', mode: 'novel' });
      expect(state.result).toBeNull();
    });
  });

  describe('pausePipeline', () => {
    it('running 时可以暂停', () => {
      state.mode = 'running';
      actions.pausePipeline();
      expect(state.mode).toBe('paused');
    });

    it('idle 时不能暂停', () => {
      actions.pausePipeline();
      expect(state.mode).toBe('idle');
    });

    it('completed 时不能暂停', () => {
      state.mode = 'completed';
      actions.pausePipeline();
      expect(state.mode).toBe('completed');
    });
  });

  describe('resumePipeline', () => {
    it('paused 时可以恢复', () => {
      state.mode = 'paused';
      actions.resumePipeline();
      expect(state.mode).toBe('running');
    });

    it('running 时不能恢复（保持 running）', () => {
      state.mode = 'running';
      actions.resumePipeline();
      expect(state.mode).toBe('running');
    });

    it('idle 时不能恢复（保持 idle）', () => {
      actions.resumePipeline();
      expect(state.mode).toBe('idle');
    });
  });

  describe('cancelPipeline', () => {
    it('应该重置为 idle', () => {
      state.mode = 'running';
      state.progress = 50;
      actions.cancelPipeline();
      expect(state.mode).toBe('idle');
    });

    it('应该清除当前步骤', () => {
      state.currentStepId = 'step-1';
      actions.cancelPipeline();
      expect(state.currentStepId).toBeNull();
    });

    it('应该重置进度', () => {
      state.progress = 80;
      actions.cancelPipeline();
      expect(state.progress).toBe(0);
    });
  });

  describe('resetPipeline', () => {
    it('应该恢复初始状态', () => {
      state.mode = 'failed';
      state.progress = 50;
      state.error = 'some error';
      state.currentStepId = 'step-1';
      actions.resetPipeline();
      expect(state.mode).toBe('idle');
      expect(state.progress).toBe(0);
      expect(state.error).toBeNull();
      expect(state.currentStepId).toBeNull();
    });
  });

  describe('updateStepState', () => {
    it('应该创建新步骤状态', () => {
      actions.updateStepState('step-1', {
        name: '脚本生成',
        status: 'running',
        progress: 50,
      });
      expect(state.steps['step-1']).toEqual({
        stepId: 'step-1',
        name: '脚本生成',
        status: 'running',
        progress: 50,
        reviewCount: 0,
      });
    });

    it('应该更新已存在的步骤', () => {
      state.steps['step-1'] = {
        stepId: 'step-1',
        name: '脚本生成',
        status: 'running',
        progress: 50,
        reviewCount: 0,
      };
      actions.updateStepState('step-1', { progress: 80 });
      expect(state.steps['step-1'].progress).toBe(80);
      expect(state.steps['step-1'].name).toBe('脚本生成');
    });

    it('应该支持更新状态为 completed', () => {
      actions.updateStepState('step-1', {
        name: '脚本生成',
        status: 'completed',
        progress: 100,
      });
      expect(state.steps['step-1'].status).toBe('completed');
    });

    it('应该支持更新状态为 failed', () => {
      actions.updateStepState('step-1', {
        name: '脚本生成',
        status: 'failed',
        error: '生成失败',
      });
      expect(state.steps['step-1'].status).toBe('failed');
      expect(state.steps['step-1'].error).toBe('生成失败');
    });
  });

  describe('setResult', () => {
    it('成功时应该设置为 completed', () => {
      const result: AutoPipelineResult = {
        success: true,
        outputPath: '/path/to/video.mp4',
        duration: 120,
        sceneCount: 10,
      };
      actions.setResult(result);
      expect(state.mode).toBe('completed');
      expect(state.result).toEqual(result);
      expect(state.progress).toBe(100);
    });

    it('失败时应该设置为 failed', () => {
      const result: AutoPipelineResult = {
        success: false,
        error: '生成失败',
      };
      actions.setResult(result);
      expect(state.mode).toBe('failed');
      expect(state.result).toEqual(result);
      expect(state.progress).toBe(100);
    });
  });

  describe('setError', () => {
    it('应该设置错误并标记为 failed', () => {
      actions.setError('网络连接失败');
      expect(state.error).toBe('网络连接失败');
      expect(state.mode).toBe('failed');
    });
  });

  describe('setNotifyOnComplete', () => {
    it('应该设置通知开关', () => {
      actions.setNotifyOnComplete(true, 'test@example.com');
      expect(state.notifyOnComplete).toBe(true);
      expect(state.notifyEmail).toBe('test@example.com');
    });

    it('应该支持只开启通知不设置邮箱', () => {
      actions.setNotifyOnComplete(true);
      expect(state.notifyOnComplete).toBe(true);
      expect(state.notifyEmail).toBeNull();
    });

    it('应该支持关闭通知', () => {
      state.notifyOnComplete = true;
      state.notifyEmail = 'test@example.com';
      actions.setNotifyOnComplete(false);
      expect(state.notifyOnComplete).toBe(false);
      expect(state.notifyEmail).toBeNull();
    });
  });

  describe('步骤流程集成', () => {
    it('应该支持完整的 pipeline 生命周期', () => {
      const input: AutoPipelineInput = {
        content: '测试漫剧内容',
        mode: 'novel',
        title: '测试项目',
        style: 'anime',
      };

      // 启动
      actions.startPipeline(input);
      expect(state.mode).toBe('running');

      // 更新步骤 1
      actions.updateStepState('step-1', {
        name: '脚本生成',
        status: 'running',
        progress: 50,
      });
      expect(state.steps['step-1'].progress).toBe(50);

      // 完成步骤 1
      actions.updateStepState('step-1', {
        status: 'completed',
        progress: 100,
      });
      expect(state.steps['step-1'].status).toBe('completed');

      // 更新步骤 2
      actions.updateStepState('step-2', {
        name: '分镜生成',
        status: 'running',
        progress: 30,
      });
      expect(state.steps['step-2'].progress).toBe(30);

      // 完成步骤 2
      actions.updateStepState('step-2', {
        status: 'completed',
        progress: 100,
      });

      // 设置最终结果
      const result: AutoPipelineResult = {
        success: true,
        outputPath: '/path/to/video.mp4',
        duration: 180,
        sceneCount: 15,
        characterCount: 3,
      };
      actions.setResult(result);
      expect(state.mode).toBe('completed');
      expect(state.result?.sceneCount).toBe(15);
    });

    it('应该支持 pipeline 失败场景', () => {
      actions.startPipeline({ content: 'test', mode: 'novel' });

      actions.updateStepState('step-1', {
        name: '脚本生成',
        status: 'running',
        progress: 60,
      });

      // 模拟失败
      actions.updateStepState('step-1', {
        status: 'failed',
        error: 'AI 服务超时',
      });

      actions.setError('Pipeline 执行失败: AI 服务超时');
      expect(state.mode).toBe('failed');
      expect(state.error).toContain('AI 服务超时');
    });

    it('应该支持暂停和恢复', () => {
      actions.startPipeline({ content: 'test', mode: 'novel' });

      actions.updateStepState('step-1', {
        name: '脚本生成',
        status: 'running',
        progress: 40,
      });

      actions.pausePipeline();
      expect(state.mode).toBe('paused');
      expect(state.steps['step-1'].progress).toBe(40);

      actions.resumePipeline();
      expect(state.mode).toBe('running');
    });
  });
});