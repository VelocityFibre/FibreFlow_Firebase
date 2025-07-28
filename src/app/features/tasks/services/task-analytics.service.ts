import { Injectable } from '@angular/core';
import { Task, TaskStatus, TaskPriority } from '../../../core/models/task.model';

export interface TaskAnalytics {
  summary: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    blocked: number;
    overdue: number;
    completionRate: number;
    averageProgress: number;
  };
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  byProject: Record<
    string,
    {
      name: string;
      count: number;
      completed: number;
      completionRate: number;
    }
  >;
  byAssignee: Record<
    string,
    {
      name: string;
      count: number;
      completed: number;
      completionRate: number;
      averageProgress: number;
    }
  >;
  timeTracking: {
    totalEstimated: number;
    totalActual: number;
    variance: number;
    onTimeCompletions: number;
    overdueCompletions: number;
  };
  trends: {
    dailyCompletions: Array<{
      date: string;
      completed: number;
      created: number;
    }>;
    weeklyProgress: Array<{
      week: string;
      progress: number;
    }>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class TaskAnalyticsService {
  generateAnalytics(tasks: Task[]): TaskAnalytics {
    const now = new Date();

    // Summary calculations
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const inProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
    const pending = tasks.filter((t) => t.status === TaskStatus.PENDING).length;
    const blocked = tasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
    const overdue = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : t.dueDate;
      return dueDate < now && t.status !== TaskStatus.COMPLETED;
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const averageProgress =
      total > 0
        ? Math.round(tasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) / total)
        : 0;

    // Status distribution
    const byStatus: Record<TaskStatus, number> = {
      [TaskStatus.PENDING]: pending,
      [TaskStatus.IN_PROGRESS]: inProgress,
      [TaskStatus.COMPLETED]: completed,
      [TaskStatus.BLOCKED]: blocked,
    };

    // Priority distribution
    const byPriority: Record<TaskPriority, number> = {
      [TaskPriority.LOW]: tasks.filter((t) => t.priority === TaskPriority.LOW).length,
      [TaskPriority.MEDIUM]: tasks.filter((t) => t.priority === TaskPriority.MEDIUM).length,
      [TaskPriority.HIGH]: tasks.filter((t) => t.priority === TaskPriority.HIGH).length,
      [TaskPriority.CRITICAL]: tasks.filter((t) => t.priority === TaskPriority.CRITICAL).length,
    };

    // Project breakdown
    const byProject: Record<string, any> = {};
    tasks.forEach((task) => {
      const projectKey = task.projectId || 'no-project';
      const projectName = task.projectName || 'No Project';

      if (!byProject[projectKey]) {
        byProject[projectKey] = {
          name: projectName,
          count: 0,
          completed: 0,
          completionRate: 0,
        };
      }

      byProject[projectKey].count++;
      if (task.status === TaskStatus.COMPLETED) {
        byProject[projectKey].completed++;
      }
    });

    // Calculate completion rates for projects
    Object.keys(byProject).forEach((key) => {
      const project = byProject[key];
      project.completionRate =
        project.count > 0 ? Math.round((project.completed / project.count) * 100) : 0;
    });

    // Assignee breakdown
    const byAssignee: Record<string, any> = {};
    tasks.forEach((task) => {
      const assigneeKey = task.assignedTo || 'unassigned';
      const assigneeName = task.assignedToName || 'Unassigned';

      if (!byAssignee[assigneeKey]) {
        byAssignee[assigneeKey] = {
          name: assigneeName,
          count: 0,
          completed: 0,
          completionRate: 0,
          averageProgress: 0,
          totalProgress: 0,
        };
      }

      byAssignee[assigneeKey].count++;
      byAssignee[assigneeKey].totalProgress += task.completionPercentage || 0;

      if (task.status === TaskStatus.COMPLETED) {
        byAssignee[assigneeKey].completed++;
      }
    });

    // Calculate rates for assignees
    Object.keys(byAssignee).forEach((key) => {
      const assignee = byAssignee[key];
      assignee.completionRate =
        assignee.count > 0 ? Math.round((assignee.completed / assignee.count) * 100) : 0;
      assignee.averageProgress =
        assignee.count > 0 ? Math.round(assignee.totalProgress / assignee.count) : 0;
      delete assignee.totalProgress;
    });

    // Time tracking
    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActual = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    const variance = totalActual - totalEstimated;

    const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED);
    const onTimeCompletions = completedTasks.filter((t) => {
      if (!t.dueDate || !t.completedDate) return false;
      const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : t.dueDate;
      const completedDate = t.completedDate.toDate ? t.completedDate.toDate() : t.completedDate;
      return completedDate <= dueDate;
    }).length;

    const overdueCompletions = completedTasks.length - onTimeCompletions;

    // Trends (simplified for now)
    const dailyCompletions = this.generateDailyTrends(tasks);
    const weeklyProgress = this.generateWeeklyTrends(tasks);

    return {
      summary: {
        total,
        completed,
        inProgress,
        pending,
        blocked,
        overdue,
        completionRate,
        averageProgress,
      },
      byStatus,
      byPriority,
      byProject,
      byAssignee,
      timeTracking: {
        totalEstimated,
        totalActual,
        variance,
        onTimeCompletions,
        overdueCompletions,
      },
      trends: {
        dailyCompletions,
        weeklyProgress,
      },
    };
  }

  private generateDailyTrends(
    tasks: Task[],
  ): Array<{ date: string; completed: number; created: number }> {
    const trends: Array<{ date: string; completed: number; created: number }> = [];
    const now = new Date();

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const completed = tasks.filter((t) => {
        if (!t.completedDate) return false;
        const completedDate = t.completedDate.toDate
          ? t.completedDate.toDate()
          : (t.completedDate as any as Date);
        return completedDate.toISOString().split('T')[0] === dateStr;
      }).length;

      const created = tasks.filter((t) => {
        if (!t.createdAt) return false;
        const createdDate = t.createdAt.toDate
          ? t.createdAt.toDate()
          : (t.createdAt as any as Date);
        return createdDate.toISOString().split('T')[0] === dateStr;
      }).length;

      trends.push({ date: dateStr, completed, created });
    }

    return trends;
  }

  private generateWeeklyTrends(tasks: Task[]): Array<{ week: string; progress: number }> {
    const trends: Array<{ week: string; progress: number }> = [];
    const now = new Date();

    // Generate last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

      const weekTasks = tasks.filter((t) => {
        if (!t.createdAt) return false;
        const createdDate = t.createdAt.toDate ? t.createdAt.toDate() : t.createdAt;
        return createdDate >= weekStart && createdDate <= weekEnd;
      });

      const progress =
        weekTasks.length > 0
          ? Math.round(
              weekTasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) /
                weekTasks.length,
            )
          : 0;

      trends.push({ week: weekStr, progress });
    }

    return trends;
  }

  prepareChartData(analytics: TaskAnalytics): any {
    return {
      statusDistribution: {
        labels: ['Pending', 'In Progress', 'Completed', 'Blocked'],
        datasets: [
          {
            data: [
              analytics.byStatus[TaskStatus.PENDING],
              analytics.byStatus[TaskStatus.IN_PROGRESS],
              analytics.byStatus[TaskStatus.COMPLETED],
              analytics.byStatus[TaskStatus.BLOCKED],
            ],
            backgroundColor: ['#9e9e9e', '#2196f3', '#4caf50', '#f44336'],
          },
        ],
      },
      priorityDistribution: {
        labels: ['Low', 'Medium', 'High', 'Critical'],
        datasets: [
          {
            data: [
              analytics.byPriority[TaskPriority.LOW],
              analytics.byPriority[TaskPriority.MEDIUM],
              analytics.byPriority[TaskPriority.HIGH],
              analytics.byPriority[TaskPriority.CRITICAL],
            ],
            backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#9c27b0'],
          },
        ],
      },
      projectBreakdown: {
        labels: Object.values(analytics.byProject).map((p) => p.name),
        datasets: [
          {
            data: Object.values(analytics.byProject).map((p) => p.count),
            backgroundColor: '#3f51b5',
          },
        ],
      },
      timeTracking: {
        labels: ['Estimated', 'Actual'],
        datasets: [
          {
            data: [analytics.timeTracking.totalEstimated, analytics.timeTracking.totalActual],
            backgroundColor: ['#2196f3', '#ff9800'],
          },
        ],
      },
      completionRate: {
        labels: analytics.trends.dailyCompletions.map((d) => d.date),
        datasets: [
          {
            label: 'Completed',
            data: analytics.trends.dailyCompletions.map((d) => d.completed),
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Created',
            data: analytics.trends.dailyCompletions.map((d) => d.created),
            borderColor: '#2196f3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
          },
        ],
      },
    };
  }

  generateTaskPivotTable(
    tasks: Task[],
    rowField: string,
    columnField: string,
    valueField: string,
  ): any {
    const pivot: any = {
      rows: [],
      columns: [],
      values: [],
      rowTotals: [],
      columnTotals: [],
      grandTotal: 0,
    };

    // Get unique row and column values
    const rowValues = [...new Set(tasks.map((t) => this.getFieldValue(t, rowField)))].sort();
    const columnValues = [...new Set(tasks.map((t) => this.getFieldValue(t, columnField)))].sort();

    pivot.rows = rowValues;
    pivot.columns = columnValues;

    // Initialize values matrix
    pivot.values = rowValues.map(() => columnValues.map(() => 0));

    // Fill the matrix
    tasks.forEach((task) => {
      const rowIndex = rowValues.indexOf(this.getFieldValue(task, rowField));
      const columnIndex = columnValues.indexOf(this.getFieldValue(task, columnField));

      if (rowIndex >= 0 && columnIndex >= 0) {
        if (valueField === 'count') {
          pivot.values[rowIndex][columnIndex]++;
        } else {
          pivot.values[rowIndex][columnIndex] += this.getFieldValue(task, valueField) || 0;
        }
      }
    });

    // Calculate totals
    pivot.rowTotals = pivot.values.map((row: number[]) => row.reduce((sum, val) => sum + val, 0));
    pivot.columnTotals = columnValues.map((_, colIndex) =>
      pivot.values.reduce((sum: number, row: number[]) => sum + row[colIndex], 0),
    );
    pivot.grandTotal = pivot.rowTotals.reduce((sum: number, total: number) => sum + total, 0);

    return pivot;
  }

  private getFieldValue(task: Task, field: string): any {
    switch (field) {
      case 'projectName':
        return task.projectName || 'No Project';
      case 'assignedToName':
        return task.assignedToName || 'Unassigned';
      case 'status':
        return task.status;
      case 'priority':
        return task.priority;
      case 'completionPercentage':
        return task.completionPercentage || 0;
      case 'estimatedHours':
        return task.estimatedHours || 0;
      case 'actualHours':
        return task.actualHours || 0;
      case 'month':
        if (task.createdAt) {
          const date = task.createdAt.toDate
            ? task.createdAt.toDate()
            : (task.createdAt as any as Date);
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        return 'Unknown';
      case 'count':
        return 1;
      default:
        return task[field as keyof Task] || 'Unknown';
    }
  }
}
