import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  costService,
  reviewExportService,
  type CostBudget,
  type CostRecord,
  type CostStats,
  type BudgetStatus,
  type CostAlert,
  type ReviewExportActivity,
  type ReviewExportStatus,
} from '@/core/services';

import styles from './index.module.less';

// Table column definition type
type TableColumn<T = Record<string, unknown>> = {
  title: string;
  dataIndex: keyof T;
  key: string;
  width?: number;
  ellipsis?: boolean;
  render?: (value: T[keyof T], record: T) => React.ReactNode;
};

interface CostDashboardProps {
  projectId?: string;
}

const fmt = (n: number) => `$${n.toFixed(3)}`;
const statusLabelMap: Record<ReviewExportStatus, string> = {
  success: '成功',
  cancelled: '已取消',
  failed: '失败',
};
const statusColorMap: Record<ReviewExportStatus, string> = {
  success: 'success',
  cancelled: 'secondary',
  failed: 'destructive',
};

const Statistic = ({ title, value, prefix }: { title: string; value: number; prefix?: string }) => (
  <div className={styles.statistic}>
    <div className={styles.statisticLabel}>{title}</div>
    <div className={styles.statisticValue}>
      {prefix}
      {value.toFixed(3)}
    </div>
  </div>
);

const InputNumber = ({
  min = 1,
  value,
  onChange,
}: {
  min?: number;
  value?: number | null;
  onChange?: (value: number | null) => void;
}) => (
  <input
    type="number"
    min={min}
    value={value ?? ''}
    onChange={(e) => onChange?.(e.target.value ? Number(e.target.value) : null)}
    className={styles.inputNumber}
  />
);

function CostDashboard({ projectId }: CostDashboardProps) {
  const [stats, setStats] = useState<CostStats>(
    projectId ? costService.getProjectStats(projectId) : costService.getStats()
  );
  const [budget, setBudget] = useState<CostBudget>(costService.getBudget());
  const [lastAlert, setLastAlert] = useState<CostAlert | null>(null);
  const [exportActivities, setExportActivities] = useState<ReviewExportActivity[]>(
    reviewExportService.getActivities(projectId).slice(0, 8)
  );

  useEffect(() => {
    const unsubStats = costService.subscribe((next) => {
      setStats(projectId ? costService.getProjectStats(projectId) : next);
      setBudget(costService.getBudget());
    });

    const unsubAlert = costService.subscribeAlert((alert) => {
      setLastAlert(alert);
      toast.warning(`${alert.period} 预算已使用 ${alert.percent.toFixed(1)}%`);
    });

    return () => {
      unsubStats();
      unsubAlert();
    };
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExportActivities(reviewExportService.getActivities(projectId).slice(0, 8));
    const unsub = reviewExportService.subscribe(() => {
      setExportActivities(reviewExportService.getActivities(projectId).slice(0, 8));
    });
    return unsub;
  }, [projectId]);

  const budgetStatus: BudgetStatus = useMemo(() => {
    if (projectId) {
      return costService.getBudgetStatus(costService.getProjectStats(projectId));
    }
    return costService.getBudgetStatus(stats);
  }, [projectId, stats]);

  const records: CostRecord[] = costService.getRecords(projectId);
  const exportColumns: TableColumn<ReviewExportActivity>[] = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v) => {
        const date = v as string | number | undefined;
        return date !== undefined ? new Date(date).toLocaleString() : '';
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (v) => {
        const source = v as ReviewExportActivity['source'] | undefined;
        return (
          <Badge variant="outline">
            {source === 'project_edit' ? '编辑页' : source === 'project_detail' ? '详情页' : '未知'}
          </Badge>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string | undefined) => {
        const status = (v ?? 'failed') as ReviewExportStatus;
        return (
          <Badge
            variant={
              statusColorMap[status] === 'success'
                ? 'default'
                : statusColorMap[status] === 'destructive'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {statusLabelMap[status]}
          </Badge>
        );
      },
    },
    {
      title: '文件',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      render: (v?: string) => v ?? '-',
    },
  ];

  const columns: TableColumn<CostRecord>[] = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (v) => {
        const ts = v as string | number | undefined;
        return ts !== undefined ? new Date(ts).toLocaleDateString() : '';
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (v) => {
        const type = v as CostRecord['type'] | undefined;
        return <Badge variant="outline">{type ?? ''}</Badge>;
      },
    },
    { title: 'Provider', dataIndex: 'provider', key: 'provider', width: 100 },
    { title: '模型', dataIndex: 'model', key: 'model', width: 120, render: (v) => (v as string | undefined) ?? '-' },
    { title: '成本', dataIndex: 'cost', key: 'cost', width: 100, render: (v) => fmt(v as number) },
  ];

  const updateBudget = (key: 'daily' | 'weekly' | 'monthly', value?: number | null) => {
    if (!value || value <= 0) return;
    const next = { ...budget, [key]: value };
    setBudget(next);
    costService.setBudget(next);
  };

  return (
    <div className={styles.container}>
      {lastAlert && <Alert variant="warning" className={styles.alert} />}

      <Card>
        <CardHeader>
          <CardTitle>{projectId ? '项目成本看板' : '全局成本看板'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.statsRow}>
            <Statistic title="总成本" value={stats.total} prefix="$" />
            <Statistic title="今日" value={stats.today} prefix="$" />
            <Statistic title="本周" value={stats.thisWeek} prefix="$" />
            <Statistic title="本月" value={stats.thisMonth} prefix="$" />
          </div>

          <div className={styles.budgetRows}>
            <div>
              <span>
                日预算 {fmt(budgetStatus.daily.used)} / {fmt(budgetStatus.daily.limit)}
              </span>
              <Progress value={Math.min(100, Number(budgetStatus.daily.percent.toFixed(1)))} />
            </div>
            <div>
              <span>
                周预算 {fmt(budgetStatus.weekly.used)} / {fmt(budgetStatus.weekly.limit)}
              </span>
              <Progress value={Math.min(100, Number(budgetStatus.weekly.percent.toFixed(1)))} />
            </div>
            <div>
              <span>
                月预算 {fmt(budgetStatus.monthly.used)} / {fmt(budgetStatus.monthly.limit)}
              </span>
              <Progress value={Math.min(100, Number(budgetStatus.monthly.percent.toFixed(1)))} />
            </div>
          </div>

          {!projectId && (
            <div className={styles.budgetEdit}>
              <span>预算设置:</span>
              <span>日</span>
              <InputNumber
                min={1}
                value={budget.daily}
                onChange={(v) => updateBudget('daily', v)}
              />
              <span>周</span>
              <InputNumber
                min={1}
                value={budget.weekly}
                onChange={(v) => updateBudget('weekly', v)}
              />
              <span>月</span>
              <InputNumber
                min={1}
                value={budget.monthly}
                onChange={(v) => updateBudget('monthly', v)}
              />
              <Button onClick={() => costService.saveToStorage()} variant="outline" size="sm">
                保存预算
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>成本明细（最近）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} style={{ width: col.width }}>
                    {col.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.slice(0, 20).map((record) => (
                <TableRow key={record.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render
                        ? col.render(record[col.dataIndex], record)
                        : String(record[col.dataIndex] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>评审导出活动（最近）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {exportColumns.map((col) => (
                  <TableHead key={col.key} style={{ width: col.width }}>
                    {col.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {exportActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={exportColumns.length} style={{ textAlign: 'center' }}>
                    暂无导出活动
                  </TableCell>
                </TableRow>
              ) : (
                exportActivities.map((record) => (
                  <TableRow key={record.id}>
                    {exportColumns.map((col) => (
                      <TableCell key={col.key}>
                        {col.render
                          ? col.render(record[col.dataIndex], record)
                          : String(record[col.dataIndex] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default CostDashboard;
