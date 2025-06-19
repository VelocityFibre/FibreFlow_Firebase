import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Observable, combineLatest, map, switchMap, startWith } from 'rxjs';
import { Router } from '@angular/router';

import { Task, TaskStatus, TaskPriority } from '../../../core/models/task.model';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { DateFormatService } from '../../../core/services/date-format.service';
import { StaffService } from '../../staff/services/staff.service';
import { TaskDetailDialogComponent } from '../../projects/components/tasks/task-detail-dialog/task-detail-dialog.component';
import { Project } from '../../../core/models/project.model';
import { StaffMember } from '../../staff/models/staff.model';
import { ProjectService } from '../../../core/services/project.service';

interface _TaskFilter {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  project: string | 'all';
}

interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  todayDue: number;
}

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatTableModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatTooltipModule,
    MatBadgeModule,
    ScrollingModule,
  ],
  template: `
    <div class="my-tasks-container">
      <!-- Header -->
      <div class="header">
        <h1>My Tasks</h1>
        <div class="header-actions">
          <button mat-button (click)="refreshTasks()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <!-- Task Statistics -->
      <div class="stats-grid" *ngIf="taskStats$ | async as stats">
        <mat-card class="stat-card ff-card-my-tasks">
          <mat-card-content>
            <div class="stat-icon total">
              <mat-icon>assignment</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.total }}</h3>
              <p>Total Tasks</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card ff-card-my-tasks">
          <mat-card-content>
            <div class="stat-icon pending">
              <mat-icon>schedule</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.pending }}</h3>
              <p>Pending</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card ff-card-my-tasks">
          <mat-card-content>
            <div class="stat-icon in-progress">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.inProgress }}</h3>
              <p>In Progress</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card ff-card-my-tasks">
          <mat-card-content>
            <div class="stat-icon completed">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.completed }}</h3>
              <p>Completed</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card" [class.has-overdue]="stats.overdue > 0">
          <mat-card-content>
            <div class="stat-icon overdue">
              <mat-icon>warning</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.overdue }}</h3>
              <p>Overdue</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card" [class.has-today]="stats.todayDue > 0">
          <mat-card-content>
            <div class="stat-icon today">
              <mat-icon>today</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ stats.todayDue }}</h3>
              <p>Due Today</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card ff-card-my-tasks">
        <mat-card-content>
          <div class="filters">
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [formControl]="statusFilter">
                <mat-option value="all">All Statuses</mat-option>
                <mat-option [value]="TaskStatus.PENDING">Pending</mat-option>
                <mat-option [value]="TaskStatus.IN_PROGRESS">In Progress</mat-option>
                <mat-option [value]="TaskStatus.COMPLETED">Completed</mat-option>
                <mat-option [value]="TaskStatus.BLOCKED">Blocked</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Priority</mat-label>
              <mat-select [formControl]="priorityFilter">
                <mat-option value="all">All Priorities</mat-option>
                <mat-option [value]="TaskPriority.LOW">Low</mat-option>
                <mat-option [value]="TaskPriority.MEDIUM">Medium</mat-option>
                <mat-option [value]="TaskPriority.HIGH">High</mat-option>
                <mat-option [value]="TaskPriority.CRITICAL">Critical</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Project</mat-label>
              <mat-select [formControl]="projectFilter">
                <mat-option value="all">All Projects</mat-option>
                <mat-option *ngFor="let project of projects$ | async" [value]="project.id">
                  {{ project.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Assignee</mat-label>
              <mat-select [formControl]="assigneeFilter">
                <mat-option value="all">All Assignees</mat-option>
                <mat-option value="me">My Tasks</mat-option>
                <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
                  {{ staff.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search tasks</mat-label>
              <input
                matInput
                [formControl]="searchControl"
                placeholder="Search by name or description"
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Task Tabs -->
      <mat-tab-group class="task-tabs">
        <!-- Active Tasks -->
        <mat-tab>
          <ng-template mat-tab-label>
            <span
              [matBadge]="(activeTasks$ | async)?.length || 0"
              [matBadgeHidden]="(activeTasks$ | async)?.length === 0"
              matBadgeColor="primary"
              matBadgeSize="small"
              >Active Tasks</span
            >
          </ng-template>

          <div class="tab-content">
            <div class="task-list" *ngIf="activeTasks$ | async as tasks">
              <div *ngIf="tasks.length === 0" class="empty-state">
                <mat-icon>inbox</mat-icon>
                <p>No active tasks</p>
              </div>

              <cdk-virtual-scroll-viewport
                itemSize="180"
                class="active-tasks-viewport"
                *ngIf="tasks.length > 0"
              >
                <div
                  *cdkVirtualFor="let task of tasks; trackBy: trackByTaskFn"
                  class="task-card"
                  (click)="viewTask(task)"
                >
                  <div class="task-header">
                    <div class="task-info">
                      <h3>{{ task.name }}</h3>
                      <p class="task-project">{{ task.projectCode }} - {{ task.projectName }}</p>
                    </div>
                    <mat-chip [class]="'priority-' + task.priority">
                      {{ task.priority }}
                    </mat-chip>
                  </div>

                  <div class="task-details">
                    <div class="task-meta">
                      <span
                        *ngIf="task.dueDate"
                        class="meta-item"
                        [class.overdue]="isOverdue(task)"
                      >
                        <mat-icon>event</mat-icon>
                        Due {{ formatDate(task.dueDate) }}
                      </span>
                      <span class="meta-item">
                        <mat-icon>donut_small</mat-icon>
                        {{ task.completionPercentage }}% Complete
                      </span>
                      <span *ngIf="task.estimatedHours" class="meta-item">
                        <mat-icon>schedule</mat-icon>
                        {{ task.estimatedHours }}h estimated
                      </span>
                    </div>

                    <mat-progress-bar
                      mode="determinate"
                      [value]="task.completionPercentage"
                      [color]="task.status === 'blocked' ? 'warn' : 'primary'"
                    >
                    </mat-progress-bar>
                  </div>

                  <div class="task-actions" (click)="$event.stopPropagation()">
                    <button
                      mat-icon-button
                      [matMenuTriggerFor]="statusMenu"
                      [matTooltip]="'Status: ' + getStatusLabel(task.status)"
                    >
                      <mat-icon>{{ getStatusIcon(task.status) }}</mat-icon>
                    </button>
                    <mat-menu #statusMenu="matMenu">
                      <button mat-menu-item (click)="updateTaskStatus(task, TaskStatus.PENDING)">
                        <mat-icon>schedule</mat-icon>
                        <span>Mark as Pending</span>
                      </button>
                      <button
                        mat-menu-item
                        (click)="updateTaskStatus(task, TaskStatus.IN_PROGRESS)"
                      >
                        <mat-icon>trending_up</mat-icon>
                        <span>Mark as In Progress</span>
                      </button>
                      <button mat-menu-item (click)="updateTaskStatus(task, TaskStatus.COMPLETED)">
                        <mat-icon>check_circle</mat-icon>
                        <span>Mark as Complete</span>
                      </button>
                      <button mat-menu-item (click)="updateTaskStatus(task, TaskStatus.BLOCKED)">
                        <mat-icon>block</mat-icon>
                        <span>Mark as Blocked</span>
                      </button>
                    </mat-menu>

                    <button mat-icon-button [matMenuTriggerFor]="menu" matTooltip="More actions">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu">
                      <button mat-menu-item (click)="editTask(task)">
                        <mat-icon>edit</mat-icon>
                        <span>Edit Task</span>
                      </button>
                      <button mat-menu-item (click)="reassignTask(task)">
                        <mat-icon>person_add</mat-icon>
                        <span>Reassign</span>
                      </button>
                      <button mat-menu-item (click)="addNote(task)">
                        <mat-icon>note_add</mat-icon>
                        <span>Add Note</span>
                      </button>
                      <button mat-menu-item (click)="goToProject(task)">
                        <mat-icon>folder_open</mat-icon>
                        <span>Go to Project</span>
                      </button>
                    </mat-menu>
                  </div>
                </div>
              </cdk-virtual-scroll-viewport>
            </div>
          </div>
        </mat-tab>

        <!-- Completed Tasks -->
        <mat-tab>
          <ng-template mat-tab-label>
            <span
              [matBadge]="(completedTasks$ | async)?.length || 0"
              [matBadgeHidden]="(completedTasks$ | async)?.length === 0"
              matBadgeColor="accent"
              matBadgeSize="small"
              >Completed</span
            >
          </ng-template>

          <div class="tab-content">
            <div class="task-list" *ngIf="completedTasks$ | async as tasks">
              <div *ngIf="tasks.length === 0" class="empty-state">
                <mat-icon>check_circle_outline</mat-icon>
                <p>No completed tasks</p>
              </div>

              <cdk-virtual-scroll-viewport
                itemSize="140"
                class="completed-tasks-viewport"
                *ngIf="tasks.length > 0"
              >
                <div
                  *cdkVirtualFor="let task of tasks; trackBy: trackByTaskFn"
                  class="task-card completed"
                  (click)="viewTask(task)"
                >
                  <div class="task-header">
                    <div class="task-info">
                      <h3>{{ task.name }}</h3>
                      <p class="task-project">{{ task.projectCode }} - {{ task.projectName }}</p>
                    </div>
                    <mat-icon class="completed-icon">check_circle</mat-icon>
                  </div>

                  <div class="task-details">
                    <div class="task-meta">
                      <span *ngIf="task.completedDate" class="meta-item">
                        <mat-icon>done_all</mat-icon>
                        Completed {{ formatDate(task.completedDate) }}
                      </span>
                      <span *ngIf="task.actualHours" class="meta-item">
                        <mat-icon>timer</mat-icon>
                        {{ task.actualHours }}h actual
                      </span>
                    </div>
                  </div>
                </div>
              </cdk-virtual-scroll-viewport>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .my-tasks-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
      }

      .header h1 {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }

      .stat-card {
        border-radius: 12px;
        transition: transform 0.2s;

        &:hover {
          transform: translateY(-2px);
        }

        &.has-overdue {
          border: 2px solid #ef4444;
        }

        &.has-today {
          border: 2px solid #f59e0b;
        }
      }

      .stat-card mat-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px !important;
      }

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        &.total {
          background-color: #eff6ff;
          color: #2563eb;
        }

        &.pending {
          background-color: #f3f4f6;
          color: #6b7280;
        }

        &.in-progress {
          background-color: #dbeafe;
          color: #3b82f6;
        }

        &.completed {
          background-color: #d1fae5;
          color: #10b981;
        }

        &.overdue {
          background-color: #fee2e2;
          color: #ef4444;
        }

        &.today {
          background-color: #fef3c7;
          color: #f59e0b;
        }
      }

      .stat-info {
        flex: 1;

        h3 {
          font-size: 28px;
          font-weight: 600;
          margin: 0;
          color: #111827;
        }

        p {
          font-size: 14px;
          color: #6b7280;
          margin: 4px 0 0 0;
        }
      }

      .filters-card {
        margin-bottom: 32px;
        border-radius: 12px;
      }

      .filters {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;

        mat-form-field {
          width: 100%;
        }

        .search-field {
          grid-column: span 2;
        }

        @media (max-width: 768px) {
          grid-template-columns: 1fr;

          .search-field {
            grid-column: span 1;
          }
        }
      }

      .task-tabs {
        ::ng-deep .mat-mdc-tab-label {
          font-size: 15px;
          font-weight: 500;
        }
      }

      .tab-content {
        padding: 24px 0;
      }

      .task-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .active-tasks-viewport {
        height: 400px;
      }

      .completed-tasks-viewport {
        height: 300px;
      }

      .task-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        &.completed {
          background-color: #f9fafb;
          opacity: 0.8;
        }
      }

      .task-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .task-info {
        flex: 1;

        h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 500;
          color: #1f2937;
        }

        .task-project {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }
      }

      .completed-icon {
        color: #10b981;
        font-size: 24px;
      }

      .task-details {
        margin-bottom: 12px;
      }

      .task-meta {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        margin-bottom: 12px;

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #6b7280;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }

          &.overdue {
            color: #ef4444;
          }
        }
      }

      .task-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .empty-state {
        text-align: center;
        padding: 64px 32px;
        color: #6b7280;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          margin-bottom: 16px;
          opacity: 0.3;
        }

        p {
          font-size: 16px;
          margin: 0;
        }
      }

      mat-chip {
        font-size: 11px !important;
        min-height: 22px !important;

        &.priority-low {
          background-color: #e5e7eb !important;
          color: #374151 !important;
        }

        &.priority-medium {
          background-color: #dbeafe !important;
          color: #1e40af !important;
        }

        &.priority-high {
          background-color: #fed7aa !important;
          color: #c2410c !important;
        }

        &.priority-critical {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
        }
      }

      @media (max-width: 768px) {
        .my-tasks-container {
          padding: 16px;
        }

        .header h1 {
          font-size: 24px;
        }

        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .filters {
          flex-direction: column;

          mat-form-field {
            width: 100%;
          }
        }
      }
    `,
  ],
})
export class MyTasksComponent implements OnInit {
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private dateFormat = inject(DateFormatService);
  private staffService = inject(StaffService);
  private projectService = inject(ProjectService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  currentUserId: string | null = null;
  tasks$!: Observable<Task[]>;
  taskStats$!: Observable<TaskStats>;
  projects$!: Observable<Project[]>;
  staff$!: Observable<StaffMember[]>;
  activeTasks$!: Observable<Task[]>;
  completedTasks$!: Observable<Task[]>;

  // Expose enums to template
  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;

  // Filter controls
  statusFilter = new FormControl<TaskStatus | 'all'>('all', { nonNullable: true });
  priorityFilter = new FormControl<TaskPriority | 'all'>('all', { nonNullable: true });
  projectFilter = new FormControl<string>('all', { nonNullable: true });
  assigneeFilter = new FormControl<string>('me', { nonNullable: true });
  searchControl = new FormControl('', { nonNullable: true });

  async ngOnInit() {
    const user = await this.authService.getCurrentUser();
    if (user) {
      this.currentUserId = user.uid;
      this.loadStaff();
      this.loadTasks();
    }
  }

  loadStaff() {
    this.staff$ = this.staffService.getStaff();
  }

  loadTasks() {
    if (!this.currentUserId) return;

    // Load tasks based on assignee filter
    const tasksSource$ = this.assigneeFilter.valueChanges.pipe(
      startWith(this.assigneeFilter.value),
      map((assignee) => {
        if (assignee === 'all') {
          return this.taskService.getAllTasks();
        } else if (assignee === 'me') {
          return this.taskService.getTasksByAssignee(this.currentUserId!);
        } else {
          return this.taskService.getTasksByAssignee(assignee);
        }
      }),
    );

    // Load all tasks for filtering
    this.tasks$ = combineLatest([
      tasksSource$,
      this.statusFilter.valueChanges.pipe(startWith(this.statusFilter.value)),
      this.priorityFilter.valueChanges.pipe(startWith(this.priorityFilter.value)),
      this.projectFilter.valueChanges.pipe(startWith(this.projectFilter.value)),
      this.assigneeFilter.valueChanges.pipe(startWith(this.assigneeFilter.value)),
      this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
    ]).pipe(
      map(([tasksObs, _status, _priority, _project, _assignee, _search]) => tasksObs),
      switchMap((tasksObs) => tasksObs),
      map((tasks) => {
        let filtered = tasks;

        // Apply status filter
        if (status && status !== 'all') {
          filtered = filtered.filter((t) => t.status === status);
        }

        // Apply priority filter
        const priorityValue = this.priorityFilter.value;
        if (priorityValue && priorityValue !== 'all') {
          filtered = filtered.filter((t) => t.priority === priorityValue);
        }

        // Apply project filter
        const projectValue = this.projectFilter.value;
        if (projectValue && projectValue !== 'all') {
          filtered = filtered.filter((t) => t.projectId === projectValue);
        }

        // Apply search filter
        const searchValue = this.searchControl.value;
        if (searchValue) {
          const searchLower = searchValue.toLowerCase();
          filtered = filtered.filter(
            (t) =>
              t.name.toLowerCase().includes(searchLower) ||
              t.description?.toLowerCase().includes(searchLower) ||
              t.projectName?.toLowerCase().includes(searchLower),
          );
        }

        return filtered;
      }),
    );

    // Get task statistics based on assignee filter
    this.taskStats$ = this.assigneeFilter.valueChanges.pipe(
      startWith(this.assigneeFilter.value),
      switchMap((assignee) => {
        if (assignee === 'all') {
          return this.taskService
            .getAllTasks()
            .pipe(map((tasks) => this.calculateTaskStats(tasks)));
        } else if (assignee === 'me') {
          return this.taskService.getTaskStatsByUser(this.currentUserId!);
        } else {
          return this.taskService.getTaskStatsByUser(assignee);
        }
      }),
    );

    // Get unique projects for filter
    this.projects$ = this.projectService.getProjects();

    // Active tasks (pending, in progress, blocked)
    this.activeTasks$ = this.tasks$.pipe(
      map((tasks) => tasks.filter((t) => t.status !== TaskStatus.COMPLETED)),
    );

    // Completed tasks
    this.completedTasks$ = this.tasks$.pipe(
      map((tasks) => tasks.filter((t) => t.status === TaskStatus.COMPLETED)),
    );
  }

  refreshTasks() {
    this.loadTasks();
  }

  formatDate(date: Date | string | number | { toDate: () => Date }): string {
    // Convert number to Date if needed
    const dateValue = typeof date === 'number' ? new Date(date) : date;
    return this.dateFormat.formatDate(dateValue);
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
    const dueDate =
      task.dueDate instanceof Date
        ? task.dueDate
        : (task.dueDate as { toDate: () => Date }).toDate();
    return dueDate < new Date();
  }

  getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING:
        return 'schedule';
      case TaskStatus.IN_PROGRESS:
        return 'trending_up';
      case TaskStatus.COMPLETED:
        return 'check_circle';
      case TaskStatus.BLOCKED:
        return 'block';
      default:
        return 'help_outline';
    }
  }

  getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING:
        return 'Pending';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.COMPLETED:
        return 'Completed';
      case TaskStatus.BLOCKED:
        return 'Blocked';
      default:
        return status;
    }
  }

  viewTask(task: Task) {
    // Opening dialog in view-only mode - no need to handle result
    this.dialog.open(TaskDetailDialogComponent, {
      width: '600px',
      data: {
        task,
        mode: 'view',
      },
    });
  }

  editTask(task: Task) {
    const dialogRef = this.dialog.open(TaskDetailDialogComponent, {
      width: '600px',
      data: {
        task,
        mode: 'edit',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.refreshTasks();
      }
    });
  }

  async updateTaskStatus(task: Task, newStatus: TaskStatus) {
    try {
      await this.taskService.updateTask(task.id!, { status: newStatus });
      this.refreshTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }

  reassignTask(task: Task) {
    // TODO: Implement reassignment dialog
    console.log('Reassign task:', task);
  }

  addNote(task: Task) {
    const note = prompt('Add a note to this task:');
    if (note) {
      this.taskService.addTaskNote(task.id!, note);
    }
  }

  goToProject(task: Task) {
    this.router.navigate(['/projects', task.projectId]);
  }

  trackByTaskFn(index: number, task: Task): string {
    return task.id || index.toString();
  }

  private calculateTaskStats(tasks: Task[]): {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    todayDue: number;
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === TaskStatus.PENDING).length,
      inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
      overdue: tasks.filter((t) => {
        if (!t.dueDate || t.status === TaskStatus.COMPLETED) return false;
        const dueDate =
          t.dueDate instanceof Date ? t.dueDate : (t.dueDate as { toDate: () => Date }).toDate();
        return dueDate < now;
      }).length,
      todayDue: tasks.filter((t) => {
        if (!t.dueDate || t.status === TaskStatus.COMPLETED) return false;
        const dueDate =
          t.dueDate instanceof Date ? t.dueDate : (t.dueDate as { toDate: () => Date }).toDate();
        return dueDate >= today && dueDate < tomorrow;
      }).length,
    };
  }
}
