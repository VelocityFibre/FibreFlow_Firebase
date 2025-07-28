import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { DevNoteService } from '../../../../core/services/dev-note.service';
import { DevNote, DevTask } from '../../../../core/models/dev-note.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DateFormatService } from '../../../../core/services/date-format.service';

interface TaskWithContext extends DevTask {
  route: string;
  pageTitle: string;
  noteId?: string;
}

@Component({
  selector: 'app-dev-task-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCardModule,
    MatBadgeModule,
    FormsModule,
  ],
  template: `
    <div class="dev-task-management-container">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <h1 class="title">Development Task Management</h1>
          <p class="subtitle">Manage development tasks across all pages</p>
        </div>
        <div class="header-stats">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ stats()?.pendingTasks || 0 }}</div>
              <div class="stat-label">Pending Tasks</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ stats()?.totalTasks || 0 }}</div>
              <div class="stat-label">Total Tasks</div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ stats()?.pagesWithNotes || 0 }}</div>
              <div class="stat-label">Pages</div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <mat-form-field>
          <mat-label>Status</mat-label>
          <mat-select [(value)]="statusFilter">
            <mat-option value="all">All Status</mat-option>
            <mat-option value="todo">Todo</mat-option>
            <mat-option value="in-progress">In Progress</mat-option>
            <mat-option value="done">Done</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Priority</mat-label>
          <mat-select [(value)]="priorityFilter">
            <mat-option value="all">All Priorities</mat-option>
            <mat-option value="high">High</mat-option>
            <mat-option value="medium">Medium</mat-option>
            <mat-option value="low">Low</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="searchTerm" placeholder="Search tasks..." />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div class="bulk-actions">
          <button
            mat-raised-button
            color="primary"
            (click)="markAllTodoAsDone()"
            [disabled]="getPendingTasksCount() === 0"
          >
            <mat-icon>done_all</mat-icon>
            Mark All Todo as Done
          </button>

          <button
            mat-raised-button
            color="warn"
            (click)="deleteAllCompleted()"
            [disabled]="getCompletedTasksCount() === 0"
          >
            <mat-icon>delete_sweep</mat-icon>
            Delete All Completed
          </button>
        </div>
      </div>

      <!-- Tasks Table -->
      <div class="tasks-table">
        @if (loading()) {
          <div class="loading">
            <mat-spinner diameter="40"></mat-spinner>
            <span>Loading tasks...</span>
          </div>
        } @else {
          <table mat-table [dataSource]="filteredTasks()" class="tasks-table">
            <!-- Task Column -->
            <ng-container matColumnDef="task">
              <th mat-header-cell *matHeaderCellDef>Task</th>
              <td mat-cell *matCellDef="let task">
                <div class="task-content">
                  <div class="task-text">{{ task.text }}</div>
                  <div class="task-meta">
                    <span class="page-title">{{ task.pageTitle }}</span>
                    <span class="route">{{ task.route }}</span>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let task">
                <mat-chip-set>
                  <mat-chip [color]="getStatusColor(task.status)" selected>
                    <mat-icon>{{ getStatusIcon(task.status) }}</mat-icon>
                    {{ task.status | titlecase }}
                  </mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <!-- Priority Column -->
            <ng-container matColumnDef="priority">
              <th mat-header-cell *matHeaderCellDef>Priority</th>
              <td mat-cell *matCellDef="let task">
                <mat-chip [color]="getPriorityColor(task.priority)" selected>
                  {{ task.priority | titlecase }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Assignee Column -->
            <ng-container matColumnDef="assignee">
              <th mat-header-cell *matHeaderCellDef>Assignee</th>
              <td mat-cell *matCellDef="let task">
                {{ task.assignee || 'Unassigned' }}
              </td>
            </ng-container>

            <!-- Created Column -->
            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let task">
                {{ formatDate(task.createdAt) }}
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let task">
                <div class="actions">
                  @if (task.status !== 'done') {
                    <button
                      mat-stroked-button
                      color="primary"
                      class="action-button"
                      matTooltip="Mark as Done"
                      (click)="markAsDone(task)"
                    >
                      <mat-icon>check_circle</mat-icon>
                      Done
                    </button>
                  }
                  @if (task.status === 'done') {
                    <button
                      mat-stroked-button
                      color="accent"
                      class="action-button"
                      matTooltip="Reopen Task"
                      (click)="reopenTask(task)"
                    >
                      <mat-icon>refresh</mat-icon>
                      Reopen
                    </button>
                  }
                  <button
                    mat-stroked-button
                    color="primary"
                    class="action-button"
                    matTooltip="Go to Page"
                    (click)="goToPage(task.route)"
                  >
                    <mat-icon>open_in_new</mat-icon>
                    Go to Page
                  </button>
                  <button
                    mat-stroked-button
                    color="warn"
                    class="action-button"
                    matTooltip="Delete Task"
                    (click)="deleteTask(task)"
                  >
                    <mat-icon>delete</mat-icon>
                    Delete
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        }
      </div>

      @if (filteredTasks().length === 0 && !loading()) {
        <div class="no-tasks">
          <mat-icon>task_alt</mat-icon>
          <h3>No tasks found</h3>
          <p>No development tasks match your current filters.</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dev-task-management-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;
      }

      .header-content {
        .title {
          font-size: 28px;
          font-weight: 500;
          margin: 0 0 8px 0;
          color: var(--mat-primary-color);
        }

        .subtitle {
          font-size: 16px;
          color: var(--mat-text-secondary);
          margin: 0;
        }
      }

      .header-stats {
        display: flex;
        gap: 16px;
      }

      .stat-card {
        min-width: 100px;
        text-align: center;

        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: var(--mat-primary-color);
        }

        .stat-label {
          font-size: 12px;
          color: var(--mat-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .filters {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        align-items: center;
        flex-wrap: wrap;

        mat-form-field {
          min-width: 150px;
        }

        .bulk-actions {
          display: flex;
          gap: 12px;
          margin-left: auto;

          button {
            mat-icon {
              margin-right: 8px;
            }
          }
        }
      }

      .tasks-table {
        width: 100%;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .task-content {
        .task-text {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .task-meta {
          display: flex;
          gap: 8px;
          font-size: 12px;
          color: var(--mat-text-secondary);

          .page-title {
            font-weight: 500;
          }

          .route {
            opacity: 0.8;
          }
        }
      }

      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        .action-button {
          min-width: 100px;
          font-size: 12px;
          padding: 8px 12px;

          mat-icon {
            margin-right: 4px;
            font-size: 16px;
          }

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
        }
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 48px;
        gap: 16px;
        color: var(--mat-text-secondary);
      }

      .no-tasks {
        text-align: center;
        padding: 48px;
        color: var(--mat-text-secondary);

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
        }

        h3 {
          margin: 0 0 8px 0;
        }

        p {
          margin: 0;
        }
      }

      .mat-mdc-table {
        .mat-mdc-header-cell {
          font-weight: 600;
        }

        .mat-mdc-row:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }

        .mat-mdc-cell {
          padding: 16px 8px;
          vertical-align: top;
        }
      }

      @media (max-width: 768px) {
        .filters {
          flex-direction: column;
          align-items: stretch;

          .bulk-actions {
            margin-left: 0;
            margin-top: 16px;
          }
        }

        .actions .action-button {
          min-width: 80px;
          font-size: 11px;
          padding: 6px 8px;
        }
      }
    `,
  ],
})
export class DevTaskManagementComponent {
  private devNoteService = inject(DevNoteService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private dateFormat = inject(DateFormatService);

  loading = signal(false);
  statusFilter = 'all';
  priorityFilter = 'all';
  searchTerm = '';

  displayedColumns = ['task', 'status', 'priority', 'assignee', 'created', 'actions'];

  // Get all dev notes with tasks
  devNotes = toSignal(this.devNoteService.getAll());

  // Get dev stats
  stats = toSignal(this.devNoteService.getDevStats());

  // Flatten all tasks from all dev notes
  allTasks = computed(() => {
    const notes = this.devNotes();
    if (!notes) return [];

    const tasks: TaskWithContext[] = [];

    notes.forEach((note) => {
      note.tasks.forEach((task) => {
        tasks.push({
          ...task,
          route: note.route,
          pageTitle: note.pageTitle,
          noteId: note.id,
        });
      });
    });

    return tasks;
  });

  // Apply filters
  filteredTasks = computed(() => {
    let tasks = this.allTasks();

    // Status filter
    if (this.statusFilter !== 'all') {
      tasks = tasks.filter((task) => task.status === this.statusFilter);
    }

    // Priority filter
    if (this.priorityFilter !== 'all') {
      tasks = tasks.filter((task) => task.priority === this.priorityFilter);
    }

    // Search filter
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.text.toLowerCase().includes(search) ||
          task.pageTitle.toLowerCase().includes(search) ||
          task.route.toLowerCase().includes(search),
      );
    }

    // Sort by created date (newest first)
    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  async markAsDone(task: TaskWithContext) {
    try {
      await this.devNoteService.updateTaskStatus(task.route, task.id, 'done');
      this.notification.success('Task marked as done');
    } catch (error) {
      console.error('Error marking task as done:', error);
      this.notification.error('Failed to update task');
    }
  }

  async reopenTask(task: TaskWithContext) {
    try {
      await this.devNoteService.updateTaskStatus(task.route, task.id, 'todo');
      this.notification.success('Task reopened');
    } catch (error) {
      console.error('Error reopening task:', error);
      this.notification.error('Failed to update task');
    }
  }

  async deleteTask(task: TaskWithContext) {
    if (!confirm(`Are you sure you want to delete this task: "${task.text}"?`)) {
      return;
    }

    try {
      await this.devNoteService.deleteTask(task.route, task.id);
      this.notification.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      this.notification.error('Failed to delete task');
    }
  }

  async markAllTodoAsDone() {
    const todoTasks = this.filteredTasks().filter((t) => t.status !== 'done');

    if (todoTasks.length === 0) {
      this.notification.info('No pending tasks to mark as done');
      return;
    }

    if (!confirm(`Are you sure you want to mark ${todoTasks.length} tasks as done?`)) {
      return;
    }

    try {
      const promises = todoTasks.map((task) =>
        this.devNoteService.updateTaskStatus(task.route, task.id, 'done'),
      );

      await Promise.all(promises);
      this.notification.success(`Marked ${todoTasks.length} tasks as done`);
    } catch (error) {
      console.error('Error marking tasks as done:', error);
      this.notification.error('Failed to mark tasks as done');
    }
  }

  async deleteAllCompleted() {
    const completedTasks = this.filteredTasks().filter((t) => t.status === 'done');

    if (completedTasks.length === 0) {
      this.notification.info('No completed tasks to delete');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${completedTasks.length} completed tasks? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const promises = completedTasks.map((task) =>
        this.devNoteService.deleteTask(task.route, task.id),
      );

      await Promise.all(promises);
      this.notification.success(`Deleted ${completedTasks.length} completed tasks`);
    } catch (error) {
      console.error('Error deleting completed tasks:', error);
      this.notification.error('Failed to delete completed tasks');
    }
  }

  goToPage(route: string) {
    this.router.navigate([route]);
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'todo':
        return 'radio_button_unchecked';
      case 'in-progress':
        return 'pending';
      case 'done':
        return 'check_circle';
      default:
        return 'help';
    }
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    switch (status) {
      case 'todo':
        return 'primary';
      case 'in-progress':
        return 'accent';
      case 'done':
        return 'primary';
      default:
        return 'primary';
    }
  }

  getPriorityColor(priority: string): 'primary' | 'accent' | 'warn' {
    switch (priority) {
      case 'high':
        return 'warn';
      case 'medium':
        return 'accent';
      case 'low':
        return 'primary';
      default:
        return 'primary';
    }
  }

  formatDate(date: Date): string {
    return this.dateFormat.formatDate(date);
  }

  getPendingTasksCount(): number {
    return this.filteredTasks().filter((t) => t.status !== 'done').length;
  }

  getCompletedTasksCount(): number {
    return this.filteredTasks().filter((t) => t.status === 'done').length;
  }
}
