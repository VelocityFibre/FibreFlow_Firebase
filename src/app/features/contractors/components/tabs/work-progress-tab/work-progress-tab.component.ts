import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContractorProject } from '../../../models/contractor-project.model';

interface PhaseProgress {
  id: string;
  phaseName: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed' | 'delayed';
  tasksCompleted: number;
  totalTasks: number;
}

@Component({
  selector: 'app-work-progress-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="work-progress-container">
      <div class="header-section">
        <h3>Work Progress</h3>
        <button mat-raised-button color="primary" (click)="updateProgress()">
          <mat-icon>update</mat-icon>
          Update Progress
        </button>
      </div>

      <!-- Overall Progress Card -->
      <mat-card class="overall-progress-card">
        <mat-card-header>
          <mat-card-title>Overall Project Progress</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="progress-section">
            <div class="progress-header">
              <span>Total Progress</span>
              <span class="progress-percentage">{{ overallProgress }}%</span>
            </div>
            <mat-progress-bar 
              mode="determinate" 
              [value]="overallProgress"
              [color]="overallProgress >= 80 ? 'primary' : overallProgress >= 50 ? 'accent' : 'warn'">
            </mat-progress-bar>
          </div>

          <div class="progress-stats">
            <div class="stat-item">
              <mat-icon>check_circle</mat-icon>
              <div>
                <span class="stat-value">{{ completedPhases }}</span>
                <span class="stat-label">Completed Phases</span>
              </div>
            </div>
            <div class="stat-item">
              <mat-icon>pending</mat-icon>
              <div>
                <span class="stat-value">{{ inProgressPhases }}</span>
                <span class="stat-label">In Progress</span>
              </div>
            </div>
            <div class="stat-item">
              <mat-icon>schedule</mat-icon>
              <div>
                <span class="stat-value">{{ pendingPhases }}</span>
                <span class="stat-label">Pending</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Phase Progress Table -->
      <mat-card class="phase-progress-card">
        <mat-card-header>
          <mat-card-title>Phase-wise Progress</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="phases" class="phases-table">
            <!-- Phase Name Column -->
            <ng-container matColumnDef="phaseName">
              <th mat-header-cell *matHeaderCellDef>Phase</th>
              <td mat-cell *matCellDef="let phase">
                <strong>{{ phase.phaseName }}</strong>
              </td>
            </ng-container>

            <!-- Duration Column -->
            <ng-container matColumnDef="duration">
              <th mat-header-cell *matHeaderCellDef>Duration</th>
              <td mat-cell *matCellDef="let phase">
                {{ phase.startDate | date:'MMM d' }} - {{ phase.endDate | date:'MMM d, y' }}
              </td>
            </ng-container>

            <!-- Progress Column -->
            <ng-container matColumnDef="progress">
              <th mat-header-cell *matHeaderCellDef>Progress</th>
              <td mat-cell *matCellDef="let phase">
                <div class="progress-cell">
                  <mat-progress-bar 
                    mode="determinate" 
                    [value]="phase.progress"
                    [color]="phase.progress >= 80 ? 'primary' : phase.progress >= 50 ? 'accent' : 'warn'">
                  </mat-progress-bar>
                  <span class="progress-text">{{ phase.progress }}%</span>
                </div>
              </td>
            </ng-container>

            <!-- Tasks Column -->
            <ng-container matColumnDef="tasks">
              <th mat-header-cell *matHeaderCellDef>Tasks</th>
              <td mat-cell *matCellDef="let phase">
                {{ phase.tasksCompleted }} / {{ phase.totalTasks }}
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let phase">
                <mat-chip 
                  [class.not-started-chip]="phase.status === 'not-started'"
                  [class.in-progress-chip]="phase.status === 'in-progress'"
                  [class.completed-chip]="phase.status === 'completed'"
                  [class.delayed-chip]="phase.status === 'delayed'">
                  {{ phase.status | titlecase }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let phase">
                <button mat-icon-button (click)="viewPhaseDetails(phase)" matTooltip="View Details">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button mat-icon-button (click)="editPhaseProgress(phase)" matTooltip="Edit Progress">
                  <mat-icon>edit</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <!-- Task Completion Metrics -->
      <mat-card class="metrics-card">
        <mat-card-header>
          <mat-card-title>Task Completion Metrics</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="metrics-grid">
            <div class="metric-item">
              <mat-icon color="primary">task_alt</mat-icon>
              <div class="metric-content">
                <span class="metric-value">{{ totalTasksCompleted }}</span>
                <span class="metric-label">Tasks Completed</span>
              </div>
            </div>
            <div class="metric-item">
              <mat-icon color="accent">pending_actions</mat-icon>
              <div class="metric-content">
                <span class="metric-value">{{ totalTasksPending }}</span>
                <span class="metric-label">Tasks Pending</span>
              </div>
            </div>
            <div class="metric-item">
              <mat-icon color="warn">warning</mat-icon>
              <div class="metric-content">
                <span class="metric-value">{{ tasksDelayed }}</span>
                <span class="metric-label">Tasks Delayed</span>
              </div>
            </div>
            <div class="metric-item">
              <mat-icon>speed</mat-icon>
              <div class="metric-content">
                <span class="metric-value">{{ avgCompletionRate }}%</span>
                <span class="metric-label">Avg Completion Rate</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .work-progress-container {
      padding: 16px;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-section h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    mat-card {
      margin-bottom: 24px;
    }

    .progress-section {
      margin-bottom: 24px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .progress-percentage {
      font-size: 24px;
      font-weight: 500;
      color: #1976d2;
    }

    .progress-stats {
      display: flex;
      justify-content: space-around;
      margin-top: 24px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat-item mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #1976d2;
    }

    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: 500;
    }

    .stat-label {
      display: block;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .phases-table {
      width: 100%;
    }

    .progress-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .progress-cell mat-progress-bar {
      flex: 1;
    }

    .progress-text {
      min-width: 40px;
      text-align: right;
      font-weight: 500;
    }

    mat-chip {
      font-size: 12px;
    }

    .not-started-chip {
      background-color: #9e9e9e !important;
      color: white !important;
    }

    .in-progress-chip {
      background-color: #2196f3 !important;
      color: white !important;
    }

    .completed-chip {
      background-color: #4caf50 !important;
      color: white !important;
    }

    .delayed-chip {
      background-color: #f44336 !important;
      color: white !important;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
    }

    .metric-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 8px;
    }

    .metric-item mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .metric-content {
      flex: 1;
    }

    .metric-value {
      display: block;
      font-size: 28px;
      font-weight: 500;
      line-height: 1;
    }

    .metric-label {
      display: block;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-top: 4px;
    }
  `]
})
export class WorkProgressTabComponent implements OnInit {
  @Input() contractorProject!: ContractorProject;

  displayedColumns: string[] = ['phaseName', 'duration', 'progress', 'tasks', 'status', 'actions'];
  phases: PhaseProgress[] = [];

  overallProgress = 0;
  completedPhases = 0;
  inProgressPhases = 0;
  pendingPhases = 0;
  totalTasksCompleted = 0;
  totalTasksPending = 0;
  tasksDelayed = 0;
  avgCompletionRate = 0;

  ngOnInit(): void {
    this.loadProgressData();
  }

  loadProgressData(): void {
    // TODO: Load actual progress data from service
    // For now, using mock data
    this.phases = [
      {
        id: '1',
        phaseName: 'Phase 1 - Site Preparation',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        progress: 100,
        status: 'completed',
        tasksCompleted: 15,
        totalTasks: 15
      },
      {
        id: '2',
        phaseName: 'Phase 2 - Foundation Work',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-29'),
        progress: 75,
        status: 'in-progress',
        tasksCompleted: 12,
        totalTasks: 16
      },
      {
        id: '3',
        phaseName: 'Phase 3 - Cable Installation',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-31'),
        progress: 30,
        status: 'in-progress',
        tasksCompleted: 6,
        totalTasks: 20
      },
      {
        id: '4',
        phaseName: 'Phase 4 - Testing & Commissioning',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-15'),
        progress: 0,
        status: 'not-started',
        tasksCompleted: 0,
        totalTasks: 10
      }
    ];

    this.calculateMetrics();
  }

  calculateMetrics(): void {
    this.completedPhases = this.phases.filter(p => p.status === 'completed').length;
    this.inProgressPhases = this.phases.filter(p => p.status === 'in-progress').length;
    this.pendingPhases = this.phases.filter(p => p.status === 'not-started').length;

    const totalProgress = this.phases.reduce((sum, phase) => sum + phase.progress, 0);
    this.overallProgress = Math.round(totalProgress / this.phases.length);

    this.totalTasksCompleted = this.phases.reduce((sum, phase) => sum + phase.tasksCompleted, 0);
    const totalTasks = this.phases.reduce((sum, phase) => sum + phase.totalTasks, 0);
    this.totalTasksPending = totalTasks - this.totalTasksCompleted;

    this.tasksDelayed = 3; // Mock value
    this.avgCompletionRate = Math.round((this.totalTasksCompleted / totalTasks) * 100);
  }

  updateProgress(): void {
    // TODO: Open dialog to update progress
    console.log('Update progress');
  }

  viewPhaseDetails(phase: PhaseProgress): void {
    // TODO: Navigate to phase details or open dialog
    console.log('View phase details:', phase);
  }

  editPhaseProgress(phase: PhaseProgress): void {
    // TODO: Open dialog to edit phase progress
    console.log('Edit phase progress:', phase);
  }
}