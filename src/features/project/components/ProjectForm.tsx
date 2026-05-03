import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ProjectData } from '@/shared/types';

import styles from './ProjectForm.module.less';

interface ProjectFormProps {
  initialValues?: Partial<ProjectData>;
  onSubmit: (values: Partial<ProjectData>) => Promise<void>;
  loading?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialValues,
  onSubmit,
  loading = false,
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<Partial<ProjectData>>({
    defaultValues: initialValues,
  });

  const handleFormSubmit = async (values: Partial<ProjectData>) => {
    try {
      await onSubmit(values);
      toast.success('保存成功');
    } catch (_error) {
      toast.error('保存失败');
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className={styles.form}
    >
      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>项目名称</label>
        <input
          id="name"
          type="text"
          placeholder="请输入项目名称"
          className={styles.input}
          {...register('name', { required: '请输入项目名称' })}
        />
        {errors.name && <span className={styles.error}>{errors.name.message}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="description" className={styles.label}>项目描述</label>
        <textarea
          id="description"
          placeholder="请输入项目描述"
          rows={4}
          className={styles.textarea}
          {...register('description')}
        />
        {errors.description && <span className={styles.error}>{errors.description.message}</span>}
      </div>

      <button type="submit" disabled={loading} className={styles.submitBtn}>
        {loading ? '保存中...' : '保存'}
      </button>
    </form>
  );
};

export default ProjectForm;
