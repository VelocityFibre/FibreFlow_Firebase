import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Observable } from 'rxjs';
import { Task, TaskStatus } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
import { DateFormatService } from '../../../../core/services/date-format.service';
import { TaskDetailDialogComponent } from './task-detail-dialog/task-detail-dialog.component';

@Component({
  selector: 'app-project-tasks',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDialogModule,
    ScrollingModule,
  ],
  template: `
    <div class="tasks-container">
      <div class="tasks-header">
        <h2>Project Tasks</h2>
        <button mat-raised-button color="primary" (click)="addTask()">
          <mat-icon>add</mat-icon>
          Add Task
        </button>
      </div>

      <mat-card class="tasks-card">
        <mat-card-content>
          <div class="tasks-list" *ngIf="tasks$ | async as tasks">
            <div *ngIf="tasks.length === 0" class="empty-state">
              <mat-icon>assignment</mat-icon>
              <p>No tasks found for this project</p>
              <button mat-button color="primary" (click)="addTask()">Create First Task</button>
            </div>

            <div *ngIf="tasks.length > 0" class="task-items">
              <cdk-virtual-scroll-viewport itemSize="120" class="project-tasks-viewport">
                <div
                  *cdkVirtualFor="let task of tasks; trackBy: trackByTaskFn"
                  class="task-item"
                  (click)="viewTask(task)"
                >
                  <div class="task-status-indicator" [class]="'status-' + task.status"></div>

                  <div class="task-main">
                    <div class="task-header-row">
                      <h3 class="task-name">{{ task.name }}</h3>
                      <mat-chip [class]="'priority-' + task.priority">
                        {{ task.priority }}
                      </mat-chip>
                    </div>

                    <p class="task-description" *ngIf="task.description">
                      {{ task.description }}
                    </p>

                    <div class="task-meta">
                      <div class="meta-item" *ngIf="task.assignedToName">
                        <mat-icon>person</mat-icon>
                        <span>{{ task.assignedToName }}</span>
                      </div>
                      <div class="meta-item" *ngIf="task.dueDate">
                        <mat-icon>event</mat-icon>
                        <span>Due {{ formatDate(task.dueDate) }}</span>
                      </div>
                      <div class="meta-item" *ngIf="task.estimatedHours">
                        <mat-icon>schedule</mat-icon>
                        <span>{{ task.estimatedHours }}h estimated</span>
                      </div>
                    </div>
                  </div>

                  <div class="task-progress">
                    <div class="progress-info">
                      <span class="progress-label">Progress</span>
                      <span class="progress-value">{{ task.completionPercentage }}%</span>
                    </div>
                    <mat-progress-bar
                      mode="determinate"
                      [value]="task.completionPercentage"
                      [color]="task.completionPercentage === 100 ? 'accent' : 'primary'"
                    >
                    </mat-progress-bar>
                  </div>

                  <div class="task-actions" (click)="$event.stopPropagation()">
                    <button
                      mat-icon-button
                      *ngIf="task.status !== 'completed'"
                      (click)="markTaskComplete(task)"
                      matTooltip="Mark as Complete"
                      class="complete-button"
                    >
                      <mat-icon>check_circle</mat-icon>
                    </button>
                    <button mat-icon-button [matMenuTriggerFor]="taskMenu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #taskMenu="matMenu">
                      <button mat-menu-item (click)="editTask(task)">
                        <mat-icon>edit</mat-icon>
                        <span>Edit Task</span>
                      </button>
                      <button mat-menu-item (click)="updateTaskStatus(task)">
                        <mat-icon>update</mat-icon>
                        <span>Update Status</span>
                      </button>
                      <button mat-menu-item (click)="assignTask(task)">
                        <mat-icon>person_add</mat-icon>
                        <span>Assign Task</span>
                      </button>
                      <button mat-menu-item (click)="deleteTask(task)" class="delete-option">
                        <mat-icon>delete</mat-icon>
                        <span>Delete Task</span>
                      </button>
                    </mat-menu>
                  </div>
                </div>
              </cdk-virtual-scroll-viewport>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .tasks-container {
        padding: 0;
      }

      .tasks-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .tasks-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .tasks-card {
        border-radius: 12px !important;
      }

      .empty-state {
        text-align: center;
        padding: 48px 24px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: #e5e7eb;
          margin-bottom: 16px;
        }

        p {
          color: #6b7280;
          margin-bottom: 24px;
        }
      }

      .task-items {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .project-tasks-viewport {
        height: 400px;
      }

      .task-item {
        display: flex;
        align-items: stretch;
        padding: 20px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: white;

        &:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
      }

      .task-status-indicator {
        width: 4px;
        border-radius: 4px;
        margin-right: 16px;

        &.status-pending {
          background-color: #6b7280;
        }

        &.status-in_progress {
          background-color: #3b82f6;
        }

        &.status-completed {
          background-color: #10b981;
        }

        &.status-blocked {
          background-color: #ef4444;
        }
      }

      .task-main {
        flex: 1;
        min-width: 0;
      }

      .task-header-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .task-name {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #1f2937;
        flex: 1;
      }

      .task-description {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
      }

      .task-meta {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }

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
      }

      .task-progress {
        width: 180px;
        margin: 0 24px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .progress-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 13px;
      }

      .progress-label {
        color: #6b7280;
      }

      .progress-value {
        font-weight: 500;
        color: #1f2937;
      }

      .task-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .complete-button {
        color: #10b981;

        &:hover {
          background-color: #d1fae5;
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

      .delete-option {
        color: #ef4444;

        mat-icon {
          color: #ef4444;
        }
      }

      @media (max-width: 768px) {
        .task-item {
          flex-direction: column;
          gap: 16px;
        }

        .task-status-indicator {
          width: 100%;
          height: 4px;
          margin: -20px -20px 16px -20px;
        }

        .task-progress {
          width: 100%;
          margin: 0;
        }
      }
    `,
  ],
})
export class ProjectTasksComponent implements OnInit {
  @Input() projectId!: string;

  private taskService = inject(TaskService);
  private dateFormat = inject(DateFormatService);
  private dialog = inject(MatDialog);

  tasks$!: Observable<Task[]>;

  ngOnInit() {
    if (this.projectId) {
      this.tasks$ = this.taskService.getTasksByProject(this.projectId);
    }
  }

  formatDate(date: unknown): string {
    return this.dateFormat.formatDate(date);
  }

  addTask(): void {
    const _dialogRef = this.dialog.open(TaskDetailDialogComponent, {
      width: '600px',
      data: {
        projectId: this.projectId,
        mode: 'create',
      },
    });
  }

  viewTask(task: Task): void {
    const _dialogRef = this.dialog.open(TaskDetailDialogComponent, {
      width: '600px',
      data: {
        task,
        mode: 'view',
      },
    });
  }

  editTask(task: Task): void {
    const _dialogRef = this.dialog.open(TaskDetailDialogComponent, {
      width: '600px',
      data: {
        task,
        mode: 'edit',
      },
    });
  }

  updateTaskStatus(task: Task): void {
    // Quick status update - implement a simple dialog or use the detail dialog
    this.editTask(task);
  }

  assignTask(task: Task): void {
    // Assignment dialog - implement later
    this.editTask(task);
  }

  async deleteTask(task: Task): Promise<void> {
    if (confirm(`Are you sure you want to delete "${task.name}"?`)) {
      try {
        await this.taskService.deleteTask(task.id!);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  }

  trackByTaskFn(index: number, task: Task): string {
    return task.id || index.toString();
  }

  async markTaskComplete(task: Task): Promise<void> {
    try {
      await this.taskService.updateTask(task.id!, {
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
      });
    } catch (error) {
      console.error('Error marking task as complete:', error);
    }
  }
}
