import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Project, KPITarget } from '../../../../core/models/project.model';
import { KpiCalculatorService } from '../../../../core/services/kpi-calculator.service';
import { DailyKpisService } from '../../../daily-progress/services/daily-kpis.service';
import { DailyKPIs } from '../../../daily-progress/models/daily-kpis.model';
import { Observable, map } from 'rxjs';
import { KpiProgressIndicatorComponent } from '../../../../shared/components/kpi-progress-indicator/kpi-progress-indicator.component';

interface KPIStatus {
  name: string;
  currentValue: number;
  target: KPITarget;
  percentage: number;
  isOnTrack: boolean;
  daysAhead: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-project-kpi-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTooltipModule,
    KpiProgressIndicatorComponent,
  ],
  template: `
    <mat-card *ngIf="project?.metadata?.kpiTargets">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>trending_up</mat-icon>
          KPI Progress Dashboard
        </mat-card-title>
        <mat-card-subtitle>Track project performance against targets</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <!-- Summary Cards -->
        <div class="kpi-summary-grid">
          <div class="summary-card" *ngFor="let kpi of kpiStatuses$ | async">
            <div class="summary-header">
              <mat-icon [style.color]="kpi.color">{{ kpi.icon }}</mat-icon>
              <span class="summary-title">{{ kpi.name }}</span>
            </div>

            <div class="summary-progress">
              <div class="progress-text">
                <span class="current">{{ kpi.currentValue }}</span>
                <span class="separator">/</span>
                <span class="target">{{ kpi.target.totalTarget }}</span>
                <span class="unit">{{ kpi.target.unit }}</span>
              </div>

              <mat-progress-bar
                mode="determinate"
                [value]="kpi.percentage"
                [color]="kpi.isOnTrack ? 'primary' : 'warn'"
              >
              </mat-progress-bar>

              <div class="progress-status">
                <span class="percentage">{{ kpi.percentage }}%</span>
                <span
                  class="status"
                  [class.on-track]="kpi.isOnTrack"
                  [class.behind]="!kpi.isOnTrack"
                >
                  {{ kpi.daysAhead >= 0 ? '+' : '' }}{{ kpi.daysAhead }} days
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Progress Indicators -->
        <div class="detailed-progress" *ngIf="latestKPIs$ | async as latestKPIs">
          <h3>Detailed Progress Analysis</h3>

          <app-kpi-progress-indicator
            label="Pole Permissions"
            [currentValue]="latestKPIs.permissionsTotal"
            [target]="project!.metadata!.kpiTargets!.polePermissions"
            [actualStartDate]="getActualStartDate('polePermissions')"
          >
          </app-kpi-progress-indicator>

          <app-kpi-progress-indicator
            label="Home Signups"
            [currentValue]="latestKPIs.homeSignupsTotal"
            [target]="project!.metadata!.kpiTargets!.homeSignups"
            [actualStartDate]="getActualStartDate('homeSignups')"
          >
          </app-kpi-progress-indicator>

          <app-kpi-progress-indicator
            label="Poles Planted"
            [currentValue]="latestKPIs.polesPlantedTotal"
            [target]="project!.metadata!.kpiTargets!.polesPlanted"
            [actualStartDate]="getActualStartDate('polesPlanted')"
          >
          </app-kpi-progress-indicator>

          <app-kpi-progress-indicator
            label="Fibre Stringing"
            [currentValue]="getTotalStringing(latestKPIs)"
            [target]="project!.metadata!.kpiTargets!.fibreStringing"
            [actualStartDate]="getActualStartDate('fibreStringing')"
          >
          </app-kpi-progress-indicator>

          <app-kpi-progress-indicator
            label="Trenching"
            [currentValue]="latestKPIs.trenchingTotal"
            [target]="project!.metadata!.kpiTargets!.trenchingMeters"
            [actualStartDate]="getActualStartDate('trenchingMeters')"
          >
          </app-kpi-progress-indicator>
        </div>

        <!-- Timeline Overview -->
        <div class="timeline-section">
          <h3>Project Timeline</h3>
          <div class="timeline-info">
            <div class="timeline-item">
              <mat-icon>event</mat-icon>
              <span>Start Date: {{ project.startDate | date }}</span>
            </div>
            <div class="timeline-item">
              <mat-icon>event_available</mat-icon>
              <span>Target End: {{ project.metadata.kpiTargets.estimatedEndDate | date }}</span>
            </div>
            <div class="timeline-item">
              <mat-icon>timer</mat-icon>
              <span>Duration: {{ project.metadata.kpiTargets.calculatedDuration }} days</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="actions">
          <button mat-raised-button color="primary" (click)="navigateToDailyProgress()">
            <mat-icon>add</mat-icon>
            Enter Today's Progress
          </button>
          <button mat-button (click)="viewDetailedReport()">
            <mat-icon>assessment</mat-icon>
            View Detailed Report
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      mat-card-header {
        margin-bottom: 24px;
      }

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 24px;
      }

      .kpi-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }

      .summary-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
      }

      .summary-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .summary-header mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .summary-title {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }

      .progress-text {
        display: flex;
        align-items: baseline;
        gap: 4px;
        margin-bottom: 8px;
        font-size: 20px;
      }

      .current {
        font-weight: 600;
        color: #111827;
      }

      .separator {
        color: #9ca3af;
      }

      .target {
        color: #6b7280;
      }

      .unit {
        font-size: 14px;
        color: #9ca3af;
        margin-left: 4px;
      }

      mat-progress-bar {
        height: 6px;
        border-radius: 3px;
        margin-bottom: 8px;
      }

      .progress-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }

      .percentage {
        font-weight: 500;
        color: #374151;
      }

      .status {
        color: #6b7280;
      }

      .status.on-track {
        color: #10b981;
      }

      .status.behind {
        color: #ef4444;
      }

      .detailed-progress {
        margin-top: 32px;
      }

      .detailed-progress h3 {
        font-size: 18px;
        font-weight: 500;
        color: #111827;
        margin-bottom: 16px;
      }

      .timeline-section {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
      }

      .timeline-section h3 {
        font-size: 18px;
        font-weight: 500;
        color: #111827;
        margin-bottom: 16px;
      }

      .timeline-info {
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
      }

      .timeline-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #6b7280;
      }

      .timeline-item mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #9ca3af;
      }

      .actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
      }

      /* Responsive */
      @media (max-width: 640px) {
        .kpi-summary-grid {
          grid-template-columns: 1fr;
        }

        .timeline-info {
          flex-direction: column;
          gap: 12px;
        }

        .actions {
          flex-direction: column;
        }

        .actions button {
          width: 100%;
        }
      }
    `,
  ],
})
export class ProjectKpiDashboardComponent implements OnInit {
  @Input() project!: Project;

  private router = inject(Router);
  private kpiCalculator = inject(KpiCalculatorService);
  private dailyKpisService = inject(DailyKpisService);

  latestKPIs$!: Observable<DailyKPIs>;
  kpiStatuses$!: Observable<KPIStatus[]>;
  actualStartDates: { [key: string]: Date } = {};

  ngOnInit() {
    if (this.project?.id) {
      // Get latest KPI data
      this.latestKPIs$ = this.dailyKpisService.getLatestByProject(this.project.id);

      // Calculate KPI statuses
      this.kpiStatuses$ = this.latestKPIs$.pipe(
        map((latestKPIs) => this.calculateKPIStatuses(latestKPIs)),
      );

      // Get actual start dates from first entries
      this.loadActualStartDates();
    }
  }

  private calculateKPIStatuses(latestKPIs: DailyKPIs): KPIStatus[] {
    const targets = this.project.metadata?.kpiTargets;
    if (!targets) return [];

    return [
      {
        name: 'Pole Permissions',
        currentValue: latestKPIs.permissionsTotal,
        target: targets.polePermissions,
        percentage: this.calculatePercentage(
          latestKPIs.permissionsTotal,
          targets.polePermissions.totalTarget,
        ),
        isOnTrack: true, // Will be calculated
        daysAhead: 0, // Will be calculated
        icon: 'assignment',
        color: '#3B82F6',
      },
      {
        name: 'Home Signups',
        currentValue: latestKPIs.homeSignupsTotal,
        target: targets.homeSignups,
        percentage: this.calculatePercentage(
          latestKPIs.homeSignupsTotal,
          targets.homeSignups.totalTarget,
        ),
        isOnTrack: true,
        daysAhead: 0,
        icon: 'home',
        color: '#10B981',
      },
      {
        name: 'Poles Planted',
        currentValue: latestKPIs.polesPlantedTotal,
        target: targets.polesPlanted,
        percentage: this.calculatePercentage(
          latestKPIs.polesPlantedTotal,
          targets.polesPlanted.totalTarget,
        ),
        isOnTrack: true,
        daysAhead: 0,
        icon: 'vertical_split',
        color: '#F59E0B',
      },
      {
        name: 'Fibre Stringing',
        currentValue: this.getTotalStringing(latestKPIs),
        target: targets.fibreStringing,
        percentage: this.calculatePercentage(
          this.getTotalStringing(latestKPIs),
          targets.fibreStringing.totalTarget,
        ),
        isOnTrack: true,
        daysAhead: 0,
        icon: 'cable',
        color: '#8B5CF6',
      },
      {
        name: 'Trenching',
        currentValue: latestKPIs.trenchingTotal,
        target: targets.trenchingMeters,
        percentage: this.calculatePercentage(
          latestKPIs.trenchingTotal,
          targets.trenchingMeters.totalTarget,
        ),
        isOnTrack: true,
        daysAhead: 0,
        icon: 'construction',
        color: '#EF4444',
      },
    ];
  }

  private calculatePercentage(current: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  getTotalStringing(kpis: DailyKPIs): number {
    return (
      (kpis.stringing24Total || 0) +
      (kpis.stringing48Total || 0) +
      (kpis.stringing96Total || 0) +
      (kpis.stringing144Total || 0) +
      (kpis.stringing288Total || 0)
    );
  }

  getActualStartDate(kpiType: string): Date | undefined {
    return this.actualStartDates[kpiType];
  }

  private loadActualStartDates() {
    // This would load the first date when each KPI had non-zero values
    // For now, returning undefined will use estimated dates
  }

  navigateToDailyProgress() {
    this.router.navigate(['/daily-progress/new'], {
      queryParams: { projectId: this.project.id },
    });
  }

  viewDetailedReport() {
    // Navigate to detailed KPI report
    this.router.navigate(['/projects', this.project.id, 'kpi-report']);
  }
}
