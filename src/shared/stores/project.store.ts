/**
 * 项目状态管理
 * 内部使用 slice 模式，外部保持原有 API 完全兼容
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { ExportRecord } from '@/shared/types/legacy';
import type { ProjectData } from '@/shared/types/project';
import type { Script } from '@/shared/types/script';
import type { VideoInfo } from '@/shared/types/video';

import { createDebouncedStorage } from './middlewares/persistWithDebounce';
import { createCurrentProjectSlice } from './slices/currentProject.slice';
import { createExportSlice } from './slices/export.slice';
import { createProjectSlice } from './slices/project.slice';
import { createScriptSlice } from './slices/script.slice';
import { createVideoSlice } from './slices/video.slice';

export interface ProjectState {
  // 项目列表
  projects: ProjectData[];

  // 当前项目
  currentProject: ProjectData | null;

  // 过滤和搜索
  searchQuery: string;
  filterStatus: 'all' | 'draft' | 'completed' | 'archived';
  sortBy: 'updatedAt' | 'createdAt' | 'name';
  sortOrder: 'asc' | 'desc';

  // 导出历史
  exportHistory: ExportRecord[];

  // Computed
  filteredProjects: () => ProjectData[];
  recentProjects: () => ProjectData[];

  // Actions
  createProject: (project: Partial<ProjectData>) => ProjectData;
  updateProject: (id: string, updates: Partial<ProjectData>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (project: ProjectData | null) => void;
  loadProject: (id: string) => ProjectData | null;

  // 脚本操作
  addScript: (projectId: string, script: ScriptData) => void;
  updateScript: (projectId: string, scriptId: string, updates: Partial<ScriptData>) => void;
  deleteScript: (projectId: string, scriptId: string) => void;

  // 视频操作
  addVideo: (projectId: string, video: VideoInfo) => void;
  removeVideo: (projectId: string, videoId: string) => void;

  // 过滤和排序
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: ProjectState['filterStatus']) => void;
  setSortBy: (sortBy: ProjectState['sortBy']) => void;
  setSortOrder: (order: ProjectState['sortOrder']) => void;

  // 导出
  addExportRecord: (record: ExportRecord) => void;
  clearExportHistory: () => void;

  // 导入导出
  exportProject: (id: string) => string;
  importProject: (json: string) => ProjectData | null;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => {
      // Initialize slices with shared state access
      const projectSlice = createProjectSlice(set, get);
      const currentProjectSlice = createCurrentProjectSlice(set);
      const scriptSlice = createScriptSlice(set, get);
      const videoSlice = createVideoSlice(set, get);
      const exportSlice = createExportSlice(set);

      // Wrapped loadProject - accesses projects from state
      const loadProject = (id: string): ProjectData | null => {
        const project = get().projects.find((p) => p.id === id);
        if (project) {
          set({ currentProject: project });
        }
        return project ?? null;
      };

      return {
        // Initial state
        projects: [],
        currentProject: null,
        searchQuery: '',
        filterStatus: 'all',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        exportHistory: [],

        // Computed
        filteredProjects: projectSlice.filteredProjects,
        recentProjects: projectSlice.recentProjects,

        // Project actions
        createProject: projectSlice.createProject,
        updateProject: projectSlice.updateProject,
        deleteProject: projectSlice.deleteProject,

        // Current project
        setCurrentProject: currentProjectSlice.setCurrentProject,
        loadProject,

        // Script actions
        addScript: scriptSlice.addScript,
        updateScript: scriptSlice.updateScript,
        deleteScript: scriptSlice.deleteScript,

        // Video actions
        addVideo: videoSlice.addVideo,
        removeVideo: videoSlice.removeVideo,

        // Filter and sort
        setSearchQuery: projectSlice.setSearchQuery,
        setFilterStatus: projectSlice.setFilterStatus,
        setSortBy: projectSlice.setSortBy,
        setSortOrder: projectSlice.setSortOrder,

        // Export
        addExportRecord: exportSlice.addExportRecord,
        clearExportHistory: exportSlice.clearExportHistory,

        // Import/Export
        exportProject: projectSlice.exportProject,
        importProject: projectSlice.importProject,
      };
    },
    {
      name: 'mangaai-project-storage',
      storage: createJSONStorage(() => createDebouncedStorage(localStorage, 1500)),
      partialize: (state) => ({
        projects: state.projects,
        exportHistory: state.exportHistory,
      }),
    }
  )
);
