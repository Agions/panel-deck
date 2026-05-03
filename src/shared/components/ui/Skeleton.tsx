/**
 * 骨架屏组件
 * 用于加载过程中的占位显示，提升用户体验
 */

import React from 'react';

import { Skeleton as BaseSkeleton } from '@/components/ui/skeleton';

// Local Skeleton wrapper with antd-style variant support
function Skeleton({ variant, width, height, className, style, ...props }: {
  variant?: 'text' | 'circular' | 'default';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  const variantClass = variant === 'circular' ? 'rounded-full' : variant === 'text' ? '' : '';
  const defaultHeight = variant === 'text' ? '1em' : undefined;
  return (
    <BaseSkeleton
      className={[variantClass, className].filter(Boolean).join(' ') || undefined}
      style={{ width, height: height ?? defaultHeight, ...style }}
      {...props}
    />
  );
}

import styles from './Skeleton.module.less';

// ============================================
// 基础骨架屏
// ============================================

export interface BasicSkeletonProps {
  active?: boolean;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const BasicSkeleton: React.FC<BasicSkeletonProps> = ({
  width,
  height,
  className,
}) => {
  return (
    <Skeleton 
      className={className}
      style={{ width, height }}
    />
  );
};

// ============================================
// 卡片骨架屏
// ============================================

export interface CardSkeletonProps {
  title?: boolean;
  avatar?: boolean;
  cover?: boolean;
  actions?: boolean;
  active?: boolean;
  className?: string;
  [key: string]: unknown;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  title = true,
  avatar = true,
  _cover = false,
  _active = true,
  className,
}) => {
  return (
    <div className={`${styles.cardSkeleton} ${className || ''}`}>
      <div className="space-y-4">
        {avatar && <Skeleton variant="circular" width={40} height={40} />}
        {title && <Skeleton variant="text" width="60%" />}
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="80%" />
      </div>
    </div>
  );
};

// ============================================
// 列表骨架屏
// ============================================

export interface ListSkeletonProps {
  count?: number;
  avatar?: boolean;
  cover?: boolean;
  actions?: boolean;
  active?: boolean;
  className?: string;
  [key: string]: unknown;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 3,
  avatar = true,
  _active = true,
  className,
}) => {
  return (
    <div className={`${styles.listSkeleton} ${className || ''}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.listItem}>
          {avatar && <Skeleton variant="circular" width={40} height={40} />}
          <div className={styles.content}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// 表单骨架屏
// ============================================

export interface FormSkeletonProps {
  count?: number;
  labels?: boolean;
  button?: boolean;
  active?: boolean;
  className?: string;
  [key: string]: unknown;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  count = 4,
  labels = true,
  button = true,
  _active = true,
  className,
}) => {
  return (
    <div className={`${styles.formSkeleton} ${className || ''}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.formItem}>
          {labels && <Skeleton variant="text" width={80} />}
          <Skeleton variant="text" width="100%" height={40} />
        </div>
      ))}
      {button && (
        <div className={styles.formButton}>
          <Skeleton variant="text" width={80} height={40} />
        </div>
      )}
    </div>
  );
};

// ============================================
// 统计卡片骨架屏
// ============================================

export interface StatisticSkeletonProps {
  count?: number;
  icon?: boolean;
  title?: boolean;
  value?: boolean;
  active?: boolean;
  className?: string;
  [key: string]: unknown;
}

export const StatisticSkeleton: React.FC<StatisticSkeletonProps> = ({
  count = 4,
  icon = true,
  title = true,
  value = true,
  _active = true,
  className,
}) => {
  return (
    <div className={`${styles.statisticSkeleton} ${className || ''}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.statisticCard}>
          <div className="flex items-center gap-3">
            {icon && <Skeleton variant="circular" width={32} height={32} />}
            <div className="flex-1">
              {title && <Skeleton variant="text" width={60} height={16} />}
              {value && <Skeleton variant="text" width={100} height={28} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// 统一骨架屏
// ============================================

export type SkeletonType = 'basic' | 'card' | 'list' | 'form' | 'statistic';

export interface UnifiedSkeletonProps {
  type?: SkeletonType;
  active?: boolean;
  className?: string;
  title?: boolean;
  avatar?: boolean;
  cover?: boolean;
  actions?: boolean;
  count?: number;
  labels?: boolean;
  button?: boolean;
  icon?: boolean;
  value?: boolean;
}

export const SkeletonComponent: React.FC<UnifiedSkeletonProps> = ({
  type = 'basic',
  active = true,
  className,
  ...props
}) => {
  switch (type) {
    case 'card':
      return <CardSkeleton {...props} active={active} className={className} />;
    case 'list':
      return <ListSkeleton {...props} active={active} className={className} />;
    case 'form':
      return <FormSkeleton {...props} active={active} className={className} />;
    case 'statistic':
      return <StatisticSkeleton {...props} active={active} className={className} />;
    default:
      return <BasicSkeleton active={active} className={className} />;
  }
};

export default SkeletonComponent;