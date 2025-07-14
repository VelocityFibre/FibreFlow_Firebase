import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { KPITarget } from '../../../core/models/project.model';

@Component({
  selector: 'app-kpi-progress-indicator',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="kpi-progress-container" *ngIf="target">
      <div class="kpi-header">
        <span class="kpi-label">{{ label }}</span>
        <span class="kpi-status" [class.on-track]="isOnTrack" [class.behind]="!isOnTrack">
          <mat-icon>{{ isOnTrack ? 'check_circle' : 'warning' }}</mat-icon>
          {{ statusText }}
        </span>
      </div>
      
      <div class="progress-info">
        <div class="progress-numbers">
          <span class="current">{{ currentValue }} / {{ target.totalTarget }} {{ target.unit }}</span>
          <span class="percentage">{{ percentage }}%</span>
        </div>
        
        <mat-progress-bar 
          mode="determinate" 
          [value]="percentage"
          [color]="progressColor">
        </mat-progress-bar>
        
        <div class="daily-info">
          <span class="daily-rate">
            <mat-icon>speed</mat-icon>
            Target: {{ target.dailyTarget }} {{ target.unit }}/day
          </span>
          <span class="actual-rate" *ngIf="actualDailyRate">
            Actual: {{ actualDailyRate | number:'1.1-1' }} {{ target.unit }}/day
          </span>
        </div>
        
        <div class="timeline-info" *ngIf="daysInfo">
          <span class="days-status" [class.ahead]="daysInfo.daysAhead > 0" [class.behind]="daysInfo.daysAhead < 0">
            <mat-icon>{{ daysInfo.daysAhead >= 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
            {{ Math.abs(daysInfo.daysAhead) }} days {{ daysInfo.daysAhead >= 0 ? 'ahead' : 'behind' }}
          </span>
          <span class="projected-end" [matTooltip]="'Projected completion: ' + (daysInfo.projectedEndDate | date)">
            <mat-icon>event</mat-icon>
            {{ getDaysUntilCompletion() }} days to go
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-progress-container {
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f9fafb;
      margin-bottom: 16px;
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .kpi-label {
      font-size: 16px;
      font-weight: 500;
      color: #111827;
    }

    .kpi-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #6b7280;
    }

    .kpi-status.on-track {
      color: #10b981;
    }

    .kpi-status.behind {
      color: #ef4444;
    }

    .kpi-status mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .progress-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .progress-numbers {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
    }

    .current {
      color: #374151;
    }

    .percentage {
      font-weight: 600;
      color: #111827;
    }

    mat-progress-bar {
      height: 8px;
      border-radius: 4px;
    }

    .daily-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #6b7280;
      margin-top: 4px;
    }

    .daily-rate, .actual-rate {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .daily-rate mat-icon, .actual-rate mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .timeline-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
    }

    .days-status {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #6b7280;
    }

    .days-status.ahead {
      color: #10b981;
    }

    .days-status.behind {
      color: #ef4444;
    }

    .days-status mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .projected-end {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #6b7280;
      cursor: help;
    }

    .projected-end mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .daily-info, .timeline-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class KpiProgressIndicatorComponent implements OnInit {
  @Input() label!: string;
  @Input() currentValue!: number;
  @Input() target!: KPITarget;
  @Input() actualStartDate?: Date;

  percentage = 0;
  isOnTrack = true;
  statusText = 'On Track';
  progressColor: 'primary' | 'accent' | 'warn' = 'primary';
  actualDailyRate?: number;
  daysInfo?: {
    daysAhead: number;
    projectedEndDate: Date;
  };

  Math = Math; // Make Math available in template

  ngOnInit() {
    this.calculateProgress();
  }

  private calculateProgress() {
    if (!this.target || !this.target.totalTarget) return;

    // Calculate percentage
    this.percentage = Math.round((this.currentValue / this.target.totalTarget) * 100);
    this.percentage = Math.min(100, this.percentage);

    // If we have actual start date, calculate detailed progress
    if (this.actualStartDate || this.target.actualStartDate) {
      const startDate = this.actualStartDate || this.target.actualStartDate;
      const today = new Date();
      const daysElapsed = Math.ceil(
        (today.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysElapsed > 0) {
        // Calculate actual daily rate
        this.actualDailyRate = this.currentValue / daysElapsed;

        // Calculate expected vs actual
        const expectedProgress = daysElapsed * this.target.dailyTarget;
        const progressDiff = this.currentValue - expectedProgress;
        const daysAhead = Math.round(progressDiff / this.target.dailyTarget);

        // Calculate projected end date
        const remainingWork = this.target.totalTarget - this.currentValue;
        const remainingDays = Math.ceil(remainingWork / this.actualDailyRate);
        const projectedEndDate = new Date();
        projectedEndDate.setDate(projectedEndDate.getDate() + remainingDays);

        this.daysInfo = {
          daysAhead,
          projectedEndDate
        };

        // Update status
        this.isOnTrack = daysAhead >= -2; // Allow 2 days behind
        if (daysAhead >= 2) {
          this.statusText = 'Ahead of Schedule';
          this.progressColor = 'accent';
        } else if (daysAhead <= -3) {
          this.statusText = 'Behind Schedule';
          this.progressColor = 'warn';
        } else {
          this.statusText = 'On Track';
          this.progressColor = 'primary';
        }
      }
    } else {
      // Simple progress check without timeline
      const expectedPercentage = this.getExpectedPercentage();
      this.isOnTrack = this.percentage >= (expectedPercentage - 5); // 5% tolerance
      this.statusText = this.isOnTrack ? 'On Track' : 'Behind Target';
      this.progressColor = this.isOnTrack ? 'primary' : 'warn';
    }
  }

  private getExpectedPercentage(): number {
    // Simple linear expectation if no actual dates
    // This is a fallback - actual implementation would use project timeline
    return 50; // Default expectation
  }

  getDaysUntilCompletion(): number {
    if (!this.daysInfo) return 0;
    
    const today = new Date();
    const daysRemaining = Math.ceil(
      (this.daysInfo.projectedEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return Math.max(0, daysRemaining);
  }
}