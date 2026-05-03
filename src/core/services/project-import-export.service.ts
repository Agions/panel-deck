/**
 * 项目导入导出服务
 * 提供项目的序列化、导入、导出功能
 */

import { v4 as uuidv4 } from 'uuid';

import type { ProjectData } from '@/core/types';

// 导出格式
export type ExportFormat = 'json' | 'zip';

// 项目导出数据
export interface ProjectExportData {
  version: string;
  exportedAt: string;
  project: ProjectData;
  metadata: {
    appVersion: string;
    format: ExportFormat;
    includesMedia: boolean;
  };
}

// 导入选项
export interface ImportOptions {
  merge?: boolean;        // 是否合并到现有项目
  overwrite?: boolean;     // 是否覆盖同名项目
  validate?: boolean;     // 是否验证数据
}

// 导出选项
export interface ExportOptions {
  format: ExportFormat;
  includeMedia?: boolean; // 是否包含媒体文件
  compress?: boolean;     // 是否压缩
  includeHistory?: boolean; // 是否包含历史记录
}

class ProjectImportExportService {
  private readonly CURRENT_VERSION = '2.0.0';
  private readonly MIN_SUPPORTED_VERSION = '1.0.0';

  /**
   * 导出项目为 JSON
   */
  exportToJSON(project: ProjectData, options: Partial<ExportOptions> = {}): string {
    const exportData: ProjectExportData = {
      version: this.CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      project: this.prepareProjectForExport(project),
      metadata: {
        appVersion: this.CURRENT_VERSION,
        format: 'json',
        includesMedia: options.includeMedia || false,
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 导出项目
   */
  async exportProject(
    project: ProjectData,
    options: Partial<ExportOptions> = {}
  ): Promise<{ filename: string; content: string | Blob }> {
    const defaultOptions: ExportOptions = {
      format: 'json',
      includeMedia: false,
      compress: false,
      includeHistory: false,
      ...options,
    };

    const filename = this.generateFilename(project.name, defaultOptions.format);

    if (defaultOptions.format === 'json') {
      return {
        filename,
        content: this.exportToJSON(project, defaultOptions),
      };
    }

    // ZIP 格式需要额外处理
    return {
      filename,
      content: this.exportToJSON(project, defaultOptions),
    };
  }

  /**
   * 导入项目
   */
  async importProject(
    data: string | File,
    options: ImportOptions = {}
  ): Promise<ProjectData> {
    const defaultOptions: ImportOptions = {
      merge: false,
      overwrite: false,
      validate: true,
      ...options,
    };

    // 解析导入数据
    let exportData: ProjectExportData;

    if (typeof data === 'string') {
      try {
        exportData = JSON.parse(data);
      } catch {
        throw new Error('无效的项目文件格式');
      }
    } else {
      // 处理 File 对象
      const text = await data.text();
      try {
        exportData = JSON.parse(text);
      } catch {
        throw new Error('无效的项目文件格式');
      }
    }

    // 验证版本
    if (defaultOptions.validate) {
      this.validateVersion(exportData.version);
    }

    // 验证项目数据
    if (defaultOptions.validate) {
      this.validateProjectData(exportData.project);
    }

    // 处理导入的项目
    return this.processImportedProject(exportData.project, defaultOptions);
  }

  /**
   * 验证项目数据
   */
  validateProjectData(project: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const p = project as Record<string, unknown>;

    // 检查必需字段
    if (!p.id || typeof p.id !== 'string') {
      errors.push('缺少项目 ID');
    }

    if (!p.name || typeof p.name !== 'string') {
      errors.push('缺少项目名称');
    }

    if (!p.status) {
      errors.push('缺少项目状态');
    }

    // 检查数组字段
    const arrayFields = ['videos', 'scripts'];
    for (const field of arrayFields) {
      if (!Array.isArray(p[field])) {
        errors.push(`字段 ${field} 应该是数组`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 备份项目
   */
  async backupProject(project: ProjectData): Promise<string> {
    const backupData: ProjectExportData = {
      version: this.CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      project,
      metadata: {
        appVersion: this.CURRENT_VERSION,
        format: 'json',
        includesMedia: false,
      },
    };

    const backup = JSON.stringify(backupData, null, 2);

    // 生成带时间戳的备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup_${project.name}_${timestamp}.json`;

    // 存储到 localStorage
    const backups = this.getBackupList();
    const backupId = uuidv4();

    backups.push({
      id: backupId,
      filename,
      projectId: project.id,
      projectName: project.name,
      createdAt: new Date().toISOString(),
      size: backup.length,
    });

    // 限制备份数量
    if (backups.length > 10) {
      backups.shift();
    }

    localStorage.setItem('mangaai_backups', JSON.stringify(backups));
    localStorage.setItem(`mangaai_backup_${backupId}`, backup);

    return backupId;
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupId: string): Promise<ProjectData | null> {
    const backup = localStorage.getItem(`mangaai_backup_${backupId}`);

    if (!backup) {
      return null;
    }

    try {
      const exportData: ProjectExportData = JSON.parse(backup);
      return exportData.project;
    } catch {
      return null;
    }
  }

  /**
   * 获取备份列表
   */
  getBackupList(): Array<{
    id: string;
    filename: string;
    projectId: string;
    projectName: string;
    createdAt: string;
    size: number;
  }> {
    const backups = localStorage.getItem('mangaai_backups');
    return backups ? JSON.parse(backups) : [];
  }

  /**
   * 删除备份
   */
  deleteBackup(backupId: string): void {
    localStorage.removeItem(`mangaai_backup_${backupId}`);

    const backups = this.getBackupList().filter(b => b.id !== backupId);
    localStorage.setItem('mangaai_backups', JSON.stringify(backups));
  }

  /**
   * 复制项目
   */
  duplicateProject(project: ProjectData, newName?: string): ProjectData {
    const now = new Date().toISOString();

    return {
      ...project,
      id: uuidv4(),
      name: newName || `${project.name} (副本)`,
      createdAt: now,
      updatedAt: now,
      // 深拷贝子对象
      videos: project.videos!.map(v => ({ ...v })),
      scripts: project.scripts!.map(s => ({
        ...s,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      })),
    };
  }

  /**
   * 比较两个项目
   */
  compareProjects(project1: ProjectData, project2: ProjectData): {
    identical: boolean;
    differences: string[];
  } {
    const differences: string[] = [];

    if (project1.name !== project2.name) {
      differences.push(`名称: "${project1.name}" -> "${project2.name}"`);
    }

    if (project1.status !== project2.status) {
      differences.push(`状态: "${project1.status}" -> "${project2.status}"`);
    }

    if (project1.description !== project2.description) {
      differences.push('描述已修改');
    }

    if (project1.videos!.length !== project2.videos!.length) {
      differences.push(`视频数量: ${project1.videos!.length} -> ${project2.videos!.length}`);
    }

    if (project1.scripts!.length !== project2.scripts!.length) {
      differences.push(`脚本数量: ${project1.scripts!.length} -> ${project2.scripts!.length}`);
    }

    return {
      identical: differences.length === 0,
      differences,
    };
  }

  /**
   * 准备项目数据用于导出
   */
  private prepareProjectForExport(project: ProjectData): ProjectData {
    return {
      ...project,
      // 移除不必要的字段
      videos: project.videos!.map(v => ({
        ...v,
        // 不导出本地路径
        path: v.path ? '[导出时移除]' : v.path,
      })),
    };
  }

  /**
   * 处理导入的项目数据
   */
  private processImportedProject(
    project: ProjectData,
    options: ImportOptions
  ): ProjectData {
    const now = new Date().toISOString();

    // 生成新的 ID 或保留原有 ID
    const newProject: ProjectData = {
      ...project,
      id: options.merge ? project.id : uuidv4(),
      createdAt: project.createdAt || now,
      updatedAt: now,
      // 处理视频
      videos: project.videos!.map(v => ({
        ...v,
        // 重置视频路径
        path: '',
      })),
    };

    return newProject;
  }

  /**
   * 验证版本兼容性
   */
  private validateVersion(version: string): void {
    // 解析版本号
    const [major, minor] = version.split('.').map(Number);
    const [minMajor, minMinor] = this.MIN_SUPPORTED_VERSION.split('.').map(Number);

    if (major < minMajor || (major === minMajor && minor < minMinor)) {
      throw new Error(
        `项目文件版本 ${version} 不被支持。最低支持版本为 ${this.MIN_SUPPORTED_VERSION}`
      );
    }
  }

  /**
   * 生成导出文件名
   */
  private generateFilename(projectName: string, format: ExportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    return `mangaai_${sanitizedName}_${timestamp}.${format}`;
  }
}

export const projectImportExportService = new ProjectImportExportService();
export default projectImportExportService;
