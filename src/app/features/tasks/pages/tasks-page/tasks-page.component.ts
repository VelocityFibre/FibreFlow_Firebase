import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TaskFormDialogComponent } from '../../components/task-form-dialog/task-form-dialog.component';
import { Task, TaskStatus } from '../../../../core/models/task.model';
import { TaskService } from '../../../../core/services/task.service';
import { ProjectService } from '../../../../core/services/project.service';
import { StaffService } from '../../../staff/services/staff.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="tasks-page">
      <div class="page-header">
        <div>
          <h1>Task Management</h1>
          <p class="subtitle">Manage all tasks across projects</p>
        </div>
        <button mat-raised-button color="primary" (click)="addTask()">
          <mat-icon>add</mat-icon>
          Add Task
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          @if (loading) {
            <div class="loading-container">
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              <p>Loading tasks...</p>
            </div>
          } @else {
            <table mat-table [dataSource]="tasks" class="tasks-table">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Task Name</th>
                <td mat-cell *matCellDef="let task">{{ task.name }}</td>
              </ng-container>

              <!-- Project Column -->
              <ng-container matColumnDef="project">
                <th mat-header-cell *matHeaderCellDef>Project</th>
                <td mat-cell *matCellDef="let task">{{ getProjectName(task.projectId) }}</td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let task">
                  <mat-chip [ngClass]="'status-' + task.status">
                    {{ formatStatus(task.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Priority Column -->
              <ng-container matColumnDef="priority">
                <th mat-header-cell *matHeaderCellDef>Priority</th>
                <td mat-cell *matCellDef="let task">
                  <mat-chip [ngClass]="'priority-' + task.priority">
                    {{ task.priority }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Assignee Column -->
              <ng-container matColumnDef="assignee">
                <th mat-header-cell *matHeaderCellDef>Assignee</th>
                <td mat-cell *matCellDef="let task">
                  {{ task.assignedTo ? getAssigneeName(task.assignedTo) : '-' }}
                </td>
              </ng-container>

              <!-- Due Date Column -->
              <ng-container matColumnDef="dueDate">
                <th mat-header-cell *matHeaderCellDef>Due Date</th>
                <td mat-cell *matCellDef="let task">
                  @if (task.dueDate) {
                    <span [ngClass]="{ overdue: isOverdue(task) }">{{
                      formatDate(task.dueDate)
                    }}</span>
                  } @else {
                    <span>-</span>
                  }
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let task">
                  <button mat-icon-button (click)="editTask(task)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button (click)="deleteTask(task)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .tasks-page {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
      }

      .page-header h1 {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
      }

      .subtitle {
        color: #666;
        margin: 4px 0 0 0;
      }

      .loading-container {
        padding: 48px;
        text-align: center;
      }

      .tasks-table {
        width: 100%;
      }

      mat-chip {
        font-size: 12px;
      }

      .status-pending {
        background-color: #e3f2fd !important;
        color: #1976d2 !important;
      }

      .status-in_progress {
        background-color: #fff3e0 !important;
        color: #f57c00 !important;
      }

      .status-completed {
        background-color: #e8f5e9 !important;
        color: #388e3c !important;
      }

      .status-blocked {
        background-color: #ffebee !important;
        color: #d32f2f !important;
      }

      .priority-low {
        background-color: #e8f5e9 !important;
        color: #388e3c !important;
      }

      .priority-medium {
        background-color: #fff3e0 !important;
        color: #f57c00 !important;
      }

      .priority-high {
        background-color: #ffebee !important;
        color: #d32f2f !important;
      }

      .overdue {
        color: #d32f2f;
        font-weight: 500;
      }
    `,
  ],
})
export class TasksPageComponent implements OnInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private staffService = inject(StaffService);
  private destroyRef = inject(DestroyRef);

  displayedColumns = ['name', 'project', 'status', 'priority', 'assignee', 'dueDate', 'actions'];
  tasks: Task[] = [];
  projects$ = this.projectService.getProjects();
  staff$ = this.staffService.getStaff();
  projectsMap = new Map<string, string>();
  staffMap = new Map<string, string>();
  loading = true;

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    // Load all data in parallel
    combineLatest([this.taskService.getAllTasks(), this.projects$, this.staff$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([tasks, projects, staff]) => {
        this.tasks = tasks;

        // Build maps for quick lookups
        this.projectsMap.clear();
        projects.forEach((p: { id: string; name: string }) => this.projectsMap.set(p.id, p.name));

        this.staffMap.clear();
        staff.forEach((s: { id: string; name: string }) => this.staffMap.set(s.id, s.name));

        this.loading = false;
      });
  }

  getProjectName(projectId: string): string {
    return this.projectsMap.get(projectId) || 'Unknown Project';
  }

  getAssigneeName(assigneeId: string): string {
    return this.staffMap.get(assigneeId) || 'Unknown';
  }

  getStatusIcon(status: TaskStatus): string {
    const icons: Record<string, string> = {
      pending: 'radio_button_unchecked',
      in_progress: 'pending',
      completed: 'check_circle',
      blocked: 'block',
    };
    return icons[status] || 'help';
  }

  formatStatus(status: TaskStatus): string {
    const statusNames: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      blocked: 'Blocked',
    };
    return statusNames[status] || status;
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
    const dueDate =
      task.dueDate instanceof Date
        ? task.dueDate
        : (task.dueDate as any).toDate
          ? (task.dueDate as any).toDate()
          : new Date(task.dueDate as any);
    return dueDate < new Date();
  }

  addTask() {
    const dialogRef = this.dialog.open(TaskFormDialogComponent, {
      width: '600px',
      data: { task: null, isTemplate: false },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.taskService
          .createTask(result)
          .then(() => {
            this.snackBar.open('Task added successfully', 'Close', { duration: 3000 });
          })
          .catch((error) => {
            console.error('Error adding task:', error);
            this.snackBar.open('Error adding task', 'Close', { duration: 3000 });
          });
      }
    });
  }

  editTask(task: Task) {
    const dialogRef = this.dialog.open(TaskFormDialogComponent, {
      width: '600px',
      data: { task: { ...task }, isTemplate: false },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.taskService
          .updateTask(task.id!, result)
          .then(() => {
            this.snackBar.open('Task updated successfully', 'Close', { duration: 3000 });
          })
          .catch((error) => {
            console.error('Error updating task:', error);
            this.snackBar.open('Error updating task', 'Close', { duration: 3000 });
          });
      }
    });
  }

  updateTaskStatus(task: Task) {
    const statuses: TaskStatus[] = [
      TaskStatus.PENDING,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
      TaskStatus.BLOCKED,
    ];
    const currentIndex = statuses.indexOf(task.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    this.taskService
      .updateTask(task.id!, { status: nextStatus })
      .then(() => {
        this.snackBar.open(`Task status updated to ${this.formatStatus(nextStatus)}`, 'Close', {
          duration: 3000,
        });
      })
      .catch((error) => {
        console.error('Error updating task status:', error);
        this.snackBar.open('Error updating task status', 'Close', { duration: 3000 });
      });
  }

  assignTask(task: Task) {
    // For now, just cycle through available staff
    const staffIds = Array.from(this.staffMap.keys());
    const currentIndex = task.assignedTo ? staffIds.indexOf(task.assignedTo) : -1;
    const nextAssignee =
      currentIndex === -1
        ? staffIds[0]
        : currentIndex + 1 >= staffIds.length
          ? undefined
          : staffIds[currentIndex + 1];

    this.taskService
      .updateTask(task.id!, { assignedTo: nextAssignee })
      .then(() => {
        const assigneeName = nextAssignee ? this.getAssigneeName(nextAssignee) : 'Unassigned';
        this.snackBar.open(`Task assigned to ${assigneeName}`, 'Close', { duration: 3000 });
      })
      .catch((error) => {
        console.error('Error assigning task:', error);
        this.snackBar.open('Error assigning task', 'Close', { duration: 3000 });
      });
  }

  deleteTask(task: Task) {
    if (confirm(`Are you sure you want to delete the task "${task.name}"?`)) {
      this.taskService
        .deleteTask(task.id!)
        .then(() => {
          this.snackBar.open('Task deleted successfully', 'Close', { duration: 3000 });
        })
        .catch((error) => {
          console.error('Error deleting task:', error);
          this.snackBar.open('Error deleting task', 'Close', { duration: 3000 });
        });
    }
  }
}
