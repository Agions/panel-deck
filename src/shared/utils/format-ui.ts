/**
 * 状态和格式化工具函数
 * 提供项目状态、徽章样式、日期格式化等公共函数
 */

export type ProjectStatus = 'draft' | 'processing' | 'completed' | 'archived' | 'failed';

export interface StatusConfig {
  color: string;
  bgColor: string;
  text: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  draft: { 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30', 
    text: '草稿',
    variant: 'secondary' 
  },
  processing: { 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30', 
    text: '处理中',
    variant: 'secondary' 
  },
  completed: { 
    color: 'text-green-600', 
    bgColor: 'bg-green-100 dark:bg-green-900/30', 
    text: '已完成',
    variant: 'default' 
  },
  archived: { 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-100 dark:bg-gray-900/30', 
    text: '已归档',
    variant: 'outline' 
  },
  failed: { 
    color: 'text-red-600', 
    bgColor: 'bg-red-100 dark:bg-red-900/30', 
    text: '失败',
    variant: 'destructive' 
  }
};

export const getStatusConfig = (status: ProjectStatus): StatusConfig => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
};

/**
 * 格式化日期为中文友好显示
 */
export const formatDate = (
  dateString: string | Date, 
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return '未知日期';
  }
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  });
};

/**
 * 格式化日期为短格式
 */
export const formatDateShort = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return '-';
  }
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * 格式化相对时间（如：刚刚、5分钟前、3天前）
 */
export const formatRelativeTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return formatDateShort(date);
};
