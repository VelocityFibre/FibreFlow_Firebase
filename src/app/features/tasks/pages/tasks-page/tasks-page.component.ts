import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { TaskFormDialogComponent } from '../../components/task-form-dialog/task-form-dialog.component';
import { TaskService } from '../../../../core/services/task.service';
import { Task, TaskStatus } from '../../../../core/models/task.model';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatBadgeModule,
    MatButtonToggleModule,
    TaskListComponent
  ],
  template: `
    <div class="tasks-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Tasks</h1>
          <p class="subtitle">Manage your project tasks and assignments</p>
        </div>
        <div class="header-actions">
          <mat-button-toggle-group [(value)]="viewMode" class="view-toggle">
            <mat-button-toggle value="card">
              <mat-icon>dashboard</mat-icon>
              Card View
            </mat-button-toggle>
            <mat-button-toggle value="list">
              <mat-icon>list</mat-icon>
              List View
            </mat-button-toggle>
          </mat-button-toggle-group>
          <button mat-raised-button color="primary" (click)="openCreateTaskDialog()">
            <mat-icon>add</mat-icon>
            New Task
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group>
        <!-- All Tasks Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            All Tasks
            <span class="badge" *ngIf="activeTasksCount$ | async as count">
              {{ count }}
            </span>
          </ng-template>
          <div class="tab-content">
            <app-task-list 
              [tasks]="activeTasks$ | async"
              [viewMode]="viewMode"
              (taskClick)="onTaskClick($event)"
              (statusChange)="onStatusChange($event)">
            </app-task-list>
          </div>
        </mat-tab>

        <!-- Due Today Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            Due Today
            <span class="badge warning" *ngIf="dueTodayCount$ | async as count">
              {{ count }}
            </span>
          </ng-template>
          <div class="tab-content">
            <app-task-list 
              [tasks]="dueTodayTasks$ | async"
              [viewMode]="viewMode"
              [highlightDueToday]="true"
              (taskClick)="onTaskClick($event)"
              (statusChange)="onStatusChange($event)">
            </app-task-list>
          </div>
        </mat-tab>

        <!-- Completed Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            Completed
            <span class="badge success" *ngIf="completedCount$ | async as count">
              {{ count }}
            </span>
          </ng-template>
          <div class="tab-content">
            <app-task-list 
              [tasks]="completedTasks$ | async"
              [viewMode]="viewMode"
              [showCompleted]="true"
              (taskClick)="onTaskClick($event)"
              (statusChange)="onStatusChange($event)">
            </app-task-list>
          </div>
        </mat-tab>

        <!-- Project Phase Tasks Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            Project Phase Tasks
            <span class="badge info" *ngIf="projectTasksCount$ | async as count">
              {{ count }}
            </span>
          </ng-template>
          <div class="tab-content">
            <app-task-list 
              [tasks]="projectPhaseTasks$ | async"
              [viewMode]="viewMode"
              [showProjectPhase]="true"
              (taskClick)="onTaskClick($event)"
              (statusChange)="onStatusChange($event)">
            </app-task-list>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .tasks-page {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .view-toggle {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    h1 {
      font-size: 32px;
      font-weight: 500;
      margin: 0;
    }

    .subtitle {
      color: #666;
      margin: 4px 0 0 0;
    }

    .tab-content {
      padding: 24px 0;
    }

    .badge {
      margin-left: 8px;
      background-color: #e0e0e0;
      color: #333;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .badge.warning {
      background-color: #ff9800;
      color: white;
    }

    .badge.success {
      background-color: #4caf50;
      color: white;
    }

    .badge.info {
      background-color: #2196f3;
      color: white;
    }

    ::ng-deep .mat-mdc-tab-label {
      display: flex !important;
      align-items: center !important;
    }
  `]
})
export class TasksPageComponent implements OnInit {
  // View mode toggle
  viewMode: 'card' | 'list' = 'card';

  // Mock data for now - will be replaced with real data from service
  private allTasks = signal<Task[]>([
    {
      id: '1',
      name: 'Complete pole permissions',
      description: 'Obtain all necessary permits for pole installations',
      phaseId: '1',
      projectId: '1',
      orderNo: 1,
      status: TaskStatus.IN_PROGRESS,
      priority: 'high' as any,
      assignedTo: 'john-doe',
      assignedToName: 'John Doe',
      dueDate: new Date(),
      estimatedHours: 8,
      actualHours: 4,
      completionPercentage: 50
    },
    {
      id: '2',
      name: 'Submit design documents',
      description: 'Finalize and submit technical design documentation',
      phaseId: '1',
      projectId: '2',
      orderNo: 2,
      status: TaskStatus.PENDING,
      priority: 'medium' as any,
      assignedTo: 'sarah-johnson',
      assignedToName: 'Sarah Johnson',
      dueDate: new Date(Date.now() + 86400000), // Tomorrow
      estimatedHours: 16,
      completionPercentage: 0
    },
    {
      id: '3',
      name: 'Finalize contractor agreements',
      description: 'Complete contract negotiations with installation contractors',
      phaseId: '2',
      projectId: '3',
      orderNo: 3,
      status: TaskStatus.IN_PROGRESS,
      priority: 'high' as any,
      assignedTo: 'mike-wilson',
      assignedToName: 'Mike Wilson',
      dueDate: new Date(Date.now() + 172800000), // 2 days from now
      estimatedHours: 12,
      actualHours: 6,
      completionPercentage: 40
    },
    {
      id: '4',
      name: 'Equipment procurement approval',
      description: 'Get approval for fiber optic equipment purchase orders',
      phaseId: '2',
      projectId: '4',
      orderNo: 4,
      status: TaskStatus.PENDING,
      priority: 'medium' as any,
      assignedTo: 'emily-chen',
      assignedToName: 'Emily Chen',
      dueDate: new Date(Date.now() + 259200000), // 3 days from now
      estimatedHours: 8,
      completionPercentage: 0
    },
    {
      id: '5',
      name: 'Site survey validation',
      description: 'Validate site survey results for accuracy',
      phaseId: '1',
      projectId: '1',
      orderNo: 5,
      status: TaskStatus.COMPLETED,
      priority: 'medium' as any,
      assignedTo: 'john-doe',
      assignedToName: 'John Doe',
      dueDate: new Date(Date.now() - 86400000), // Yesterday
      completedDate: new Date(Date.now() - 86400000),
      estimatedHours: 6,
      actualHours: 5,
      completionPercentage: 100
    },
    {
      id: '6',
      name: 'Initial design review',
      description: 'Review initial network design specifications',
      phaseId: '1',
      projectId: '2',
      orderNo: 6,
      status: TaskStatus.COMPLETED,
      priority: 'high' as any,
      assignedTo: 'sarah-johnson',
      assignedToName: 'Sarah Johnson',
      dueDate: new Date(Date.now() - 172800000), // 2 days ago
      completedDate: new Date(Date.now() - 172800000),
      estimatedHours: 10,
      actualHours: 11,
      completionPercentage: 100
    }
  ]);

  // Observable streams
  activeTasks$ = new Observable<Task[]>(subscriber => {
    subscriber.next(this.allTasks().filter(task => task.status !== TaskStatus.COMPLETED));
  });

  completedTasks$ = new Observable<Task[]>(subscriber => {
    subscriber.next(this.allTasks().filter(task => task.status === TaskStatus.COMPLETED));
  });

  dueTodayTasks$ = new Observable<Task[]>(subscriber => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    subscriber.next(
      this.allTasks().filter(task => {
        if (task.status === TaskStatus.COMPLETED) return false;
        const dueDate = new Date(task.dueDate!);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      })
    );
  });

  projectPhaseTasks$ = new Observable<Task[]>(subscriber => {
    // For now, we'll mark some tasks as project phase tasks
    subscriber.next(
      this.allTasks().filter(task => task.orderNo % 2 === 0)
    );
  });

  // Count observables
  activeTasksCount$ = this.activeTasks$.pipe(map(tasks => tasks?.length || 0));
  completedCount$ = this.completedTasks$.pipe(map(tasks => tasks?.length || 0));
  dueTodayCount$ = this.dueTodayTasks$.pipe(map(tasks => tasks?.length || 0));
  projectTasksCount$ = this.projectPhaseTasks$.pipe(map(tasks => tasks?.length || 0));

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private taskService: TaskService
  ) {}

  ngOnInit() {
    // Load real tasks when service is ready
    // this.loadTasks();
  }

  openCreateTaskDialog() {
    const dialogRef = this.dialog.open(TaskFormDialogComponent, {
      width: '600px',
      data: { task: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Create task
        this.createTask(result);
      }
    });
  }

  onTaskClick(task: Task) {
    // Navigate to project detail page with tasks tab
    // For now, just open edit dialog
    const dialogRef = this.dialog.open(TaskFormDialogComponent, {
      width: '600px',
      data: { task }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update task
        this.updateTask(task.id!, result);
      }
    });
  }

  onStatusChange(event: { task: Task; newStatus: TaskStatus }) {
    this.updateTaskStatus(event.task.id!, event.newStatus);
  }

  private createTask(taskData: Partial<Task>) {
    // Mock implementation
    const newTask: Task = {
      ...taskData as Task,
      id: String(this.allTasks().length + 1),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.allTasks.update(tasks => [...tasks, newTask]);
    
    this.snackBar.open('Task created successfully', 'Close', { 
      duration: 3000 
    });
  }

  private updateTask(taskId: string, updates: Partial<Task>) {
    this.allTasks.update(tasks =>
      tasks.map(task =>
        task.id === taskId
          ? { ...task, ...updates, updatedAt: new Date() }
          : task
      )
    );
    
    this.snackBar.open('Task updated successfully', 'Close', { 
      duration: 3000 
    });
  }

  private updateTaskStatus(taskId: string, newStatus: TaskStatus) {
    const updates: Partial<Task> = {
      status: newStatus,
      completionPercentage: newStatus === TaskStatus.COMPLETED ? 100 : undefined,
      completedDate: newStatus === TaskStatus.COMPLETED ? new Date() : undefined
    };
    
    this.updateTask(taskId, updates);
    
    this.snackBar.open(
      `Task status updated to ${newStatus.toLowerCase().replace('_', ' ')}`,
      'Close',
      { duration: 3000 }
    );
  }
}