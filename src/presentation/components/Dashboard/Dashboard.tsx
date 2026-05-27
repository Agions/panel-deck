/**
 * Dashboard — 仪表盘式工作台
 * 首页设计：项目列表，显示进度百分比、最后编辑时间，支持一键续作/新建
 */

import React, { type ReactNode, useCallback } from 'react';
import { Plus, MoreHorizontal, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ProjectData as Project } from '@/shared/types/project';
import { formatRelativeTime } from '@/shared/utils';
import styles from './Dashboard.module.css';

// ============================================
// Types
// ============================================

export interface DashboardProps {
  projects: Project[];
  onCreateProject: () => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject?: (id: string) => void;
  isLoading?: boolean;
}

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

// ============================================
// Dashboard
// ============================================

export function Dashboard({
  projects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  onDuplicateProject,
  isLoading = false,
}: DashboardProps): React.ReactElement {
  const navigate = useNavigate();

  const handleCreate = useCallback(() => {
    onCreateProject();
    navigate('/projects/new');
  }, [onCreateProject, navigate]);

  return (
    <div className={styles.dashboard} role="main" aria-label="项目仪表盘">
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>我的项目</h1>
            <Badge variant="secondary" className={styles.countBadge}>
              {projects.length} 个项目
            </Badge>
          </div>
          <Button
            variant="default"
            size="lg"
            icon={<Plus />}
            onClick={handleCreate}
            aria-label="创建新项目"
          >
            新建项目
          </Button>
        </div>
      </header>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <StatCard
          icon={<TrendingUp />}
          label="项目总数"
          value={projects.length}
          color="primary"
        />
        <StatCard
          icon={<Clock />}
          label="最近编辑"
          value={formatRelativeTime(projects[0]?.updatedAt)}
          color="secondary"
        />
      </div>

      {/* Project Grid */}
      <section
        className={styles.projectGrid}
        aria-label="项目列表"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <div className={styles.loadingState}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} aria-hidden="true" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <ul className={styles.gridList}>
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard
                  project={project}
                  onOpen={onOpenProject}
                  onDelete={onDeleteProject}
                  onDuplicate={onDuplicateProject}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ============================================
// Project Card
// ============================================

function ProjectCard({ project, onOpen, onDelete, onDuplicate }: ProjectCardProps): React.ReactElement {
  const progress = calculateProgress(project);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen(project.id);
      }
    },
    [project.id, onOpen]
  );

  return (
    <div
      className={styles.projectCard}
      onClick={() => onOpen(project.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`打开项目: ${project.name}`}
    >
      {/* Thumbnail */}
      <div className={styles.thumbnail} aria-hidden="true">
        {project.thumbnail ? (
          <img src={project.thumbnail} alt="" loading="lazy" />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
        )}
        {/* Status overlay */}
        <div className={`${styles.statusOverlay} ${styles[project.status || 'draft']}`} aria-hidden="true">
          {project.status === 'processing' && (
            <span className={styles.statusDot} aria-label="进行中" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <h3 className={styles.projectName}>{project.name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="更多操作"
                className={styles.menuTrigger}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onOpen(project.id)}>
                打开
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onSelect={() => onDuplicate(project.id)}>
                  复制
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => onDelete(project.id)} className="text-red-500 focus:text-red-500">
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>{progress}%</span>
        </div>

        {/* Meta */}
        <div className={styles.metaRow}>
          <time className={styles.time} dateTime={project.updatedAt}>
            <Clock size={12} aria-hidden="true" />
            {formatRelativeTime(project.updatedAt)}
          </time>
          <span className={styles.stepCount}>
            {project.currentStep?.replace(/_/g, ' ') ?? '未开始'}
          </span>
        </div>
      </div>

      <ChevronRight className={styles.chevron} aria-hidden="true" />
    </div>
  );
}

// ============================================
// Stat Card
// ============================================

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  color?: 'primary' | 'secondary' | 'success';
}

function StatCard({ icon, label, value, color = 'primary' }: StatCardProps): React.ReactElement {
  return (
    <div className={`${styles.statCard} ${styles[`stat-${color}`]}`} role="status">
      <span className={styles.statIcon} aria-hidden="true">{icon}</span>
      <div className={styles.statContent}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  );
}

// ============================================
// Empty State
// ============================================

function EmptyState({ onCreate }: { onCreate: () => void }): React.ReactElement {
  return (
    <div className={styles.emptyState} role="status">
      <div className={styles.emptyIcon} aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <h2 className={styles.emptyTitle}>还没有项目</h2>
      <p className={styles.emptyDescription}>创建一个新项目，开始你的漫剧创作之旅</p>
      <Button variant="default" icon={<Plus />} onClick={onCreate}>
        创建第一个项目
      </Button>
    </div>
  );
}

// ============================================
// Helpers
// ============================================

function calculateProgress(project: Project): number {
  const steps = ['import', 'analysis', 'script', 'character', 'storyboard', 'render', 'video_editing', 'export'];
  if (!project.currentStep) return 0;
  const currentIdx = steps.indexOf(project.currentStep);
  if (currentIdx === -1) return 0;
  return Math.round((currentIdx / (steps.length - 1)) * 100);
}