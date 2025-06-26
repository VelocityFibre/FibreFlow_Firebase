import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, switchMap, of, catchError } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  Timestamp,
  Query,
  DocumentData,
} from '@angular/fire/firestore';
import { ProjectService } from '../../../core/services/project.service';
import { TaskService } from '../../../core/services/task.service';
import { StaffService } from '../../staff/services/staff.service';
import { Task } from '../../../core/models/task.model';
import { StaffMember } from '../../staff/models/staff.model';

export interface ReportOptions {
  type: 'daily' | 'weekly' | 'monthly';
  projectId: string;
  date: Date;
}

export interface ReportData {
  metadata: {
    reportType: string;
    projectName: string;
    projectCode: string;
    generatedDate: Date;
    reportDate: Date;
    generatedBy: string;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    completionRate: number;
    flaggedTasks: number;
    overdueTasks: number;
  };
  tasksByAssignee: Array<{
    assigneeName: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
  }>;
  tasksByPriority: Array<{
    priority: string;
    count: number;
    completed: number;
  }>;
  detailedTasks: Array<{
    id: string;
    name: string;
    description: string;
    assigneeName: string;
    status: string;
    priority: string;
    category: string;
    dueDate: Date | null;
    completedDate: Date | null;
    isFlagged: boolean;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class ReportGeneratorService {
  private firestore = inject(Firestore);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private staffService = inject(StaffService);

  generateReport(options: ReportOptions): Observable<ReportData> {
    return this.projectService.getProjectById(options.projectId).pipe(
      catchError((error) => {
        console.error('Error fetching project:', error);
        // Return a default project if offline
        return of({
          id: options.projectId,
          name: 'Unknown Project',
          projectCode: 'OFFLINE',
          description: '',
          location: '',
          status: 'active',
          startDate: new Date(),
          endDate: null,
          budget: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
      }),
      switchMap((project) => {
        if (!project) {
          throw new Error('Project not found');
        }

        const dateRange = this.getDateRange(options.type, options.date);

        return combineLatest([
          of(project),
          this.taskService.getTasksByProject(options.projectId).pipe(
            catchError((error) => {
              console.error('Error fetching tasks:', error);
              return of([]); // Return empty array if offline
            }),
          ),
          this.staffService.getStaff().pipe(
            catchError((error) => {
              console.error('Error fetching staff:', error);
              return of([]); // Return empty array if offline
            }),
          ),
        ]).pipe(
          map(([project, tasks, staff]) => {
            // Type assertions to resolve TypeScript issues
            const typedTasks = tasks as Task[];
            const typedStaff = staff as StaffMember[];
            // Filter tasks by date range
            const filteredTasks = typedTasks.filter((task: Task) => {
              if (!task.createdAt) return false;
              const taskDate =
                task.createdAt instanceof Timestamp
                  ? task.createdAt.toDate()
                  : new Date(task.createdAt);
              return taskDate >= dateRange.start && taskDate <= dateRange.end;
            });

            // Create staff lookup map
            const staffMap = new Map(typedStaff.map((s: StaffMember) => [s.id, s]));

            // Calculate summary statistics
            const summary = {
              totalTasks: filteredTasks.length,
              completedTasks: filteredTasks.filter((t: Task) => t.status === 'completed').length,
              inProgressTasks: filteredTasks.filter((t: Task) => t.status === 'in_progress').length,
              pendingTasks: filteredTasks.filter((t: Task) => t.status === 'pending').length,
              completionRate:
                filteredTasks.length > 0
                  ? Math.round(
                      (filteredTasks.filter((t: Task) => t.status === 'completed').length /
                        filteredTasks.length) *
                        100,
                    )
                  : 0,
              flaggedTasks: filteredTasks.filter((t: Task) => t.isFlagged).length,
              overdueTasks: filteredTasks.filter((t: Task) => {
                if (!t.dueDate || t.status === 'completed') return false;
                const dueDate =
                  t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate);
                return dueDate < new Date();
              }).length,
            };

            // Group tasks by assignee
            const tasksByAssigneeMap = new Map<string, any>();
            filteredTasks.forEach((task: Task) => {
              const assigneeId = task.assignedTo || 'unassigned';
              if (!tasksByAssigneeMap.has(assigneeId)) {
                tasksByAssigneeMap.set(assigneeId, {
                  assigneeName:
                    assigneeId === 'unassigned'
                      ? 'Unassigned'
                      : staffMap.get(assigneeId)?.name || 'Unknown',
                  totalTasks: 0,
                  completedTasks: 0,
                  inProgressTasks: 0,
                  pendingTasks: 0,
                });
              }
              const assigneeStats = tasksByAssigneeMap.get(assigneeId)!;
              assigneeStats.totalTasks++;
              if (task.status === 'completed') assigneeStats.completedTasks++;
              else if (task.status === 'in_progress') assigneeStats.inProgressTasks++;
              else if (task.status === 'pending') assigneeStats.pendingTasks++;
            });

            // Group tasks by priority instead of category
            const tasksByCategoryMap = new Map<string, any>();
            filteredTasks.forEach((task: Task) => {
              const priority = task.priority || 'medium';
              if (!tasksByCategoryMap.has(priority)) {
                tasksByCategoryMap.set(priority, {
                  priority: priority,
                  count: 0,
                  completed: 0,
                });
              }
              const categoryStats = tasksByCategoryMap.get(priority)!;
              categoryStats.count++;
              if (task.status === 'completed') categoryStats.completed++;
            });

            // Prepare detailed task list
            const detailedTasks = filteredTasks.map((task: Task) => ({
              id: task.id || '',
              name: task.name,
              description: task.description || '',
              assigneeName: task.assignedTo
                ? staffMap.get(task.assignedTo)?.name || 'Unknown'
                : 'Unassigned',
              status: task.status,
              priority: task.priority || 'normal',
              category: task.priority || 'medium', // Using priority as category
              dueDate:
                task.dueDate instanceof Timestamp
                  ? task.dueDate.toDate()
                  : task.dueDate
                    ? new Date(task.dueDate)
                    : null,
              completedDate:
                task.completedDate instanceof Timestamp
                  ? task.completedDate.toDate()
                  : task.completedDate
                    ? new Date(task.completedDate)
                    : null,
              isFlagged: task.isFlagged || false,
            }));

            const reportData: ReportData = {
              metadata: {
                reportType:
                  options.type.charAt(0).toUpperCase() + options.type.slice(1) + ' Report',
                projectName: project.name,
                projectCode: project.projectCode || 'N/A',
                generatedDate: new Date(),
                reportDate: options.date,
                generatedBy: 'System', // In a real app, this would be the current user
              },
              summary,
              tasksByAssignee: Array.from(tasksByAssigneeMap.values()),
              tasksByPriority: Array.from(tasksByCategoryMap.values()),
              detailedTasks,
            };

            return reportData;
          }),
          catchError((error) => {
            console.error('Error generating report:', error);
            throw error;
          }),
        );
      }),
    );
  }

  private getDateRange(
    type: 'daily' | 'weekly' | 'monthly',
    date: Date,
  ): { start: Date; end: Date } {
    const start = new Date(date);
    const end = new Date(date);

    switch (type) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        const dayOfWeek = start.getDay();
        const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  }

  exportReportToPDF(reportData: ReportData): string {
    // This is a placeholder - in a real implementation, you would use a library like jsPDF
    console.log('Exporting report to PDF:', reportData);
    return 'report-' + reportData.metadata.projectCode + '-' + new Date().getTime() + '.pdf';
  }

  exportReportToCSV(reportData: ReportData): string {
    const headers = [
      'Task Name',
      'Assignee',
      'Status',
      'Priority',
      'Category',
      'Due Date',
      'Completed Date',
      'Flagged',
    ];
    const rows = reportData.detailedTasks.map((task) => [
      task.name,
      task.assigneeName,
      task.status,
      task.priority,
      task.category,
      task.dueDate ? task.dueDate.toLocaleDateString() : '',
      task.completedDate ? task.completedDate.toLocaleDateString() : '',
      task.isFlagged ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // In a real implementation, you would trigger a download
    console.log('CSV Content:', csvContent);
    return csvContent;
  }
}
