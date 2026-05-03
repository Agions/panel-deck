import {
  Video,
  Plus,
  Edit,
  Trash2,
  Play,
  ImageIcon
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/context/ThemeContext';
import type { ProjectData } from '@/shared/types';
import { cn } from '@/shared/utils/class-names';
import { getStatusConfig, formatDate } from '@/shared/utils/format-ui';

import styles from './ProjectGrid.module.less';

interface ProjectGridProps {
  projects: ProjectData[];
  loading: boolean;
  onRefresh?: () => void;
}

/**
 * 项目网格组件
 * 展示项目列表，支持创建、查看、编辑、删除操作
 */

const ProjectGrid: React.FC<ProjectGridProps> = ({ projects, loading, onRefresh }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const handleCreateProject = () => {
    navigate('/project/new');
  };

  const handleViewProject = (id: string) => {
    navigate(`/project/${id}`);
  };

  const handleEditProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/project/edit/${id}`);
  };

  const handleOpenEditor = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/editor/${id}`);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Simplified - just call onRefresh for now
    onRefresh?.();
  };

  return (
    <Card
      className={`${styles.sectionCard} ${isDarkMode ? styles.darkCard : ''}`}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5" />
          我的项目
        </CardTitle>
        <Button size="sm" onClick={handleCreateProject}>
          <Plus className="h-4 w-4 mr-1" />
          创建新项目
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">暂无项目，点击「创建新项目」开始使用</p>
            <Button onClick={handleCreateProject}>
              <Plus className="h-4 w-4 mr-1" />
              创建新项目
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className={cn(
                  "cursor-pointer hover:shadow-lg transition-shadow",
                  isDarkMode ? styles.darkProjectCard : ""
                )}
                onClick={() => handleViewProject(project.id)}
              >
                {project.thumbnail && (
                  <div className={styles.projectThumbnail}>
                    <img 
                      alt={project.name} 
                      src={project.thumbnail} 
                      className="w-full h-32 object-cover rounded-t-lg"
                    />
                  </div>
                )}
                {!project.thumbnail && (
                  <div className="h-32 bg-muted flex items-center justify-center rounded-t-lg">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium truncate">{project.name}</h4>
                    <Badge variant={getStatusConfig(project.status ?? 'draft').variant}>
                      {getStatusConfig(project.status ?? 'draft').text}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {project.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    更新于: {formatDate(project.updatedAt)}
                  </p>
                  <div className="flex justify-end gap-1 mt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleEditProject(project.id, e)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleOpenEditor(project.id, e)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectGrid;