import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { Task, TaskStatus, TaskPriority } from '../../../../core/models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatTableModule
  ],
  template: `
    <div class="task-list">
      <ng-container *ngIf="tasks && tasks.length > 0; else noTasks">
        
        <!-- Card View -->
        <div class="grid" *ngIf="viewMode === 'card'">
          <mat-card 
            *ngFor="let task of tasks" 
            class="task-card"
            [class.completed]="showCompleted"
            [class.due-today]="highlightDueToday && isDueToday(task)"
            [class.project-phase]="showProjectPhase"
            (click)="taskClick.emit(task)">
            
            <mat-card-header>
              <mat-card-title class="task-title">
                <mat-icon *ngIf="showProjectPhase" class="phase-icon">timeline</mat-icon>
                {{ task.name }}
              </mat-card-title>
              <mat-card-subtitle>{{ task.projectId }}</mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <p class="task-description" *ngIf="task.description">
                {{ task.description }}
              </p>

              <!-- Task Details -->
              <div class="task-details">
                <div class="detail-item" *ngIf="task.assignedToName">
                  <mat-icon>person</mat-icon>
                  <span>{{ task.assignedToName }}</span>
                </div>
                
                <div class="detail-item" *ngIf="task.dueDate" [class.overdue]="isOverdue(task)">
                  <mat-icon>calendar_today</mat-icon>
                  <span>{{ formatDueDate(task.dueDate) }}</span>
                </div>

                <div class="detail-item" *ngIf="task.estimatedHours">
                  <mat-icon>schedule</mat-icon>
                  <span>{{ task.estimatedHours }}h estimated</span>
                </div>

                <div class="detail-item" *ngIf="task.completionPercentage > 0">
                  <mat-icon>donut_large</mat-icon>
                  <span>{{ task.completionPercentage }}% complete</span>
                </div>
              </div>

              <!-- Tags -->
              <div class="task-tags">
                <mat-chip-set>
                  <mat-chip [ngClass]="'priority-' + task.priority">
                    {{ formatPriority(task.priority) }}
                  </mat-chip>
                  <mat-chip [ngClass]="'status-' + task.status">
                    <mat-icon class="status-icon">{{ getStatusIcon(task.status) }}</mat-icon>
                    {{ formatStatus(task.status) }}
                  </mat-chip>
                </mat-chip-set>
              </div>
            </mat-card-content>

            <!-- Actions -->
            <mat-card-actions align="end">
              <button 
                mat-icon-button 
                [matMenuTriggerFor]="menu"
                (click)="$event.stopPropagation()">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button 
                  mat-menu-item 
                  (click)="changeStatus(task, TaskStatus.PENDING)"
                  [disabled]="task.status === TaskStatus.PENDING">
                  <mat-icon>schedule</mat-icon>
                  <span>Mark as Pending</span>
                </button>
                <button 
                  mat-menu-item 
                  (click)="changeStatus(task, TaskStatus.IN_PROGRESS)"
                  [disabled]="task.status === TaskStatus.IN_PROGRESS">
                  <mat-icon>play_circle</mat-icon>
                  <span>Mark as In Progress</span>
                </button>
                <button 
                  mat-menu-item 
                  (click)="changeStatus(task, TaskStatus.COMPLETED)"
                  [disabled]="task.status === TaskStatus.COMPLETED">
                  <mat-icon>check_circle</mat-icon>
                  <span>Mark as Completed</span>
                </button>
                <button 
                  mat-menu-item 
                  (click)="changeStatus(task, TaskStatus.BLOCKED)">
                  <mat-icon>block</mat-icon>
                  <span>Mark as Blocked</span>
                </button>
              </mat-menu>
            </mat-card-actions>
          </mat-card>
        </div>

        <!-- List View -->
        <div class="list-view" *ngIf="viewMode === 'list'">
          <table mat-table [dataSource]="tasks" class="task-table">
            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Task</th>
              <td mat-cell *matCellDef="let task" (click)="taskClick.emit(task)" class="clickable">
                <div class="task-name-cell">
                  <mat-icon *ngIf="showProjectPhase" class="phase-icon">timeline</mat-icon>
                  <span [class.completed]="task.status === TaskStatus.COMPLETED">{{ task.name }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let task">
                <mat-chip [ngClass]="'status-' + task.status">
                  <mat-icon class="status-icon">{{ getStatusIcon(task.status) }}</mat-icon>
                  {{ formatStatus(task.status) }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Priority Column -->
            <ng-container matColumnDef="priority">
              <th mat-header-cell *matHeaderCellDef>Priority</th>
              <td mat-cell *matCellDef="let task">
                <mat-chip [ngClass]="'priority-' + task.priority">
                  {{ formatPriority(task.priority) }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Assignee Column -->
            <ng-container matColumnDef="assignee">
              <th mat-header-cell *matHeaderCellDef>Assignee</th>
              <td mat-cell *matCellDef="let task">
                <div class="assignee-cell" *ngIf="task.assignedToName">
                  <mat-icon>person</mat-icon>
                  {{ task.assignedToName }}
                </div>
              </td>
            </ng-container>

            <!-- Due Date Column -->
            <ng-container matColumnDef="dueDate">
              <th mat-header-cell *matHeaderCellDef>Due Date</th>
              <td mat-cell *matCellDef="let task">
                <span [class.overdue]="isOverdue(task)">
                  {{ formatDueDate(task.dueDate) }}
                </span>
              </td>
            </ng-container>

            <!-- Progress Column -->
            <ng-container matColumnDef="progress">
              <th mat-header-cell *matHeaderCellDef>Progress</th>
              <td mat-cell *matCellDef="let task">
                <div class="progress-cell">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="task.completionPercentage"></div>
                  </div>
                  <span class="progress-text">{{ task.completionPercentage }}%</span>
                </div>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let task">
                <button 
                  mat-icon-button 
                  [matMenuTriggerFor]="menu"
                  (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button 
                    mat-menu-item 
                    (click)="changeStatus(task, TaskStatus.PENDING)"
                    [disabled]="task.status === TaskStatus.PENDING">
                    <mat-icon>schedule</mat-icon>
                    <span>Mark as Pending</span>
                  </button>
                  <button 
                    mat-menu-item 
                    (click)="changeStatus(task, TaskStatus.IN_PROGRESS)"
                    [disabled]="task.status === TaskStatus.IN_PROGRESS">
                    <mat-icon>play_circle</mat-icon>
                    <span>Mark as In Progress</span>
                  </button>
                  <button 
                    mat-menu-item 
                    (click)="changeStatus(task, TaskStatus.COMPLETED)"
                    [disabled]="task.status === TaskStatus.COMPLETED">
                    <mat-icon>check_circle</mat-icon>
                    <span>Mark as Completed</span>
                  </button>
                  <button 
                    mat-menu-item 
                    (click)="changeStatus(task, TaskStatus.BLOCKED)">
                    <mat-icon>block</mat-icon>
                    <span>Mark as Blocked</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                [class.completed-row]="row.status === TaskStatus.COMPLETED"
                [class.due-today-row]="highlightDueToday && isDueToday(row)"></tr>
          </table>
        </div>
      </ng-container>

      <ng-template #noTasks>
        <mat-card class="no-tasks-card ff-card-tasks">
          <mat-card-content>
            <div class="no-tasks-content">
              <mat-icon class="no-tasks-icon">task_alt</mat-icon>
              <p>No tasks found</p>
            </div>
          </mat-card-content>
        </mat-card>
      </ng-template>
    </div>
  `,
  styles: [`
    .task-list {
      width: 100%;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .task-card {
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .task-card.completed {
      opacity: 0.7;
    }

    .task-card.completed .task-title {
      text-decoration: line-through;
    }

    .task-card.due-today {
      border: 2px solid #ff9800;
    }

    .task-card.project-phase {
      border: 2px solid #60a5fa;
    }

    .phase-icon {
      color: #2196f3;
      margin-right: 8px;
    }

    .task-title {
      font-size: 18px;
      font-weight: 500;
      display: flex;
      align-items: center;
    }

    .task-description {
      color: #666;
      margin: 12px 0;
      line-height: 1.5;
    }

    .task-details {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 16px 0;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #666;
    }

    .detail-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .detail-item.overdue {
      color: #f44336;
    }

    .task-tags {
      margin-top: 16px;
    }

    mat-chip {
      font-size: 12px;
    }

    .priority-low {
      background-color: #4caf50 !important;
      color: white !important;
    }

    .priority-medium {
      background-color: #ff9800 !important;
      color: white !important;
    }

    .priority-high {
      background-color: #f44336 !important;
      color: white !important;
    }

    .priority-critical {
      background-color: #9c27b0 !important;
      color: white !important;
    }

    .status-pending {
      background-color: #e0e0e0 !important;
      color: #666 !important;
    }

    .status-in_progress {
      background-color: #2196f3 !important;
      color: white !important;
    }

    .status-completed {
      background-color: #4caf50 !important;
      color: white !important;
    }

    .status-blocked {
      background-color: #f44336 !important;
      color: white !important;
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .no-tasks-card {
      max-width: 500px;
      margin: 0 auto;
    }

    .no-tasks-content {
      text-align: center;
      padding: 40px;
    }

    .no-tasks-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin: 0 auto 16px;
    }

    mat-card-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      margin: 0;
      padding: 0;
    }

    /* List View Styles */
    .list-view {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .task-table {
      width: 100%;
    }

    .task-table th {
      font-weight: 600;
      color: #374151;
      background-color: #f9fafb;
    }

    .task-table td {
      padding: 16px;
    }

    .clickable {
      cursor: pointer;
    }

    .clickable:hover {
      background-color: #f9fafb;
    }

    .task-name-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .task-name-cell span.completed {
      text-decoration: line-through;
      opacity: 0.7;
    }

    .assignee-cell {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .assignee-cell mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .progress-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background-color: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      max-width: 100px;
    }

    .progress-fill {
      height: 100%;
      background-color: #3b82f6;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 12px;
      color: #6b7280;
      min-width: 35px;
    }

    .completed-row {
      opacity: 0.7;
    }

    .due-today-row {
      background-color: #fff7ed;
    }

    .overdue {
      color: #f44336;
      font-weight: 500;
    }
  `]
})
export class TaskListComponent {
  @Input() tasks: Task[] | null = [];
  @Input() viewMode: 'card' | 'list' = 'card';
  @Input() showCompleted = false;
  @Input() showProjectPhase = false;
  @Input() highlightDueToday = false;
  
  @Output() taskClick = new EventEmitter<Task>();
  @Output() statusChange = new EventEmitter<{ task: Task; newStatus: TaskStatus }>();

  TaskStatus = TaskStatus;
  
  // Table columns for list view
  displayedColumns = ['name', 'status', 'priority', 'assignee', 'dueDate', 'progress', 'actions'];

  changeStatus(task: Task, newStatus: TaskStatus) {
    this.statusChange.emit({ task, newStatus });
  }

  formatStatus(status: TaskStatus): string {
    return status.replace('_', ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatPriority(priority: any): string {
    return String(priority).charAt(0).toUpperCase() + String(priority).slice(1);
  }

  getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING:
        return 'schedule';
      case TaskStatus.IN_PROGRESS:
        return 'play_circle';
      case TaskStatus.COMPLETED:
        return 'check_circle';
      case TaskStatus.BLOCKED:
        return 'block';
      default:
        return 'help';
    }
  }

  formatDueDate(date: Date | undefined): string {
    if (!date) return '';
    
    const dueDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate.getTime() === today.getTime()) {
      return 'Due Today';
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      return 'Due Tomorrow';
    } else if (dueDate.getTime() === yesterday.getTime()) {
      return 'Due Yesterday';
    } else if (dueDate < today) {
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return `${daysOverdue} days overdue`;
    } else {
      return `Due ${dueDate.toLocaleDateString()}`;
    }
  }

  isDueToday(task: Task): boolean {
    if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
    
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    
    return dueDate.toDateString() === today.toDateString();
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
    
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }
}