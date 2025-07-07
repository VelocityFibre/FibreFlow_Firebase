import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { Observable, switchMap, map, catchError, of } from 'rxjs';
import { ReportService } from '../../services/report.service';
import { WeeklyReport, DailyReport, MonthlyReport } from '../../models/report.model';

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTableModule,
    MatChipsModule,
    MatExpansionModule,
  ],
  template: `
    <div class="report-viewer-container">
      <ng-container *ngIf="report$ | async as report; else loading">
        <!-- Report Header -->
        <div class="report-header no-print">
          <button mat-icon-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>{{ report.projectName }} - {{ getReportTitle(report) }}</h1>
          <div class="header-actions">
            <button mat-stroked-button (click)="print()">
              <mat-icon>print</mat-icon>
              Print
            </button>
            <button mat-stroked-button [disabled]="true">
              <mat-icon>email</mat-icon>
              Email
            </button>
            <button mat-stroked-button [disabled]="true">
              <mat-icon>download</mat-icon>
              Export PDF
            </button>
          </div>
        </div>

        <!-- Report Content -->
        <div class="report-content" [ngSwitch]="report.reportType">
          <!-- Weekly Report Template -->
          <div *ngSwitchCase="'weekly'" class="weekly-report">
            <div class="report-page">
              <!-- Title Page -->
              <section class="title-section">
                <div class="report-logo">
                  <mat-icon>assessment</mat-icon>
                </div>
                <h1 class="report-title">Weekly Progress Report</h1>
                <h2 class="project-name">{{ report.projectName }}</h2>
                <div class="report-period">
                  Week {{ $any(report).summary?.weekNumber }} |
                  {{ formatDate(report.period.start) }} - {{ formatDate(report.period.end) }}
                </div>
                <div class="generated-info">
                  Generated on {{ formatDateTime(report.generatedAt) }}
                </div>
              </section>

              <!-- Executive Summary -->
              <section class="summary-section">
                <h2>Executive Summary</h2>
                <mat-card>
                  <mat-card-content>
                    <div class="summary-grid">
                      <div class="summary-item">
                        <h3>Overall Progress</h3>
                        <div class="progress-value">
                          {{ $any(report).summary?.overallProgress || 0 }}%
                        </div>
                      </div>
                    </div>

                    <div
                      class="summary-highlights"
                      *ngIf="$any(report).summary?.weeklyHighlights?.length"
                    >
                      <h3>Weekly Highlights</h3>
                      <ul>
                        <li *ngFor="let highlight of $any(report).summary.weeklyHighlights">
                          {{ highlight }}
                        </li>
                      </ul>
                    </div>

                    <div
                      class="summary-challenges"
                      *ngIf="$any(report).summary?.majorChallenges?.length"
                    >
                      <h3>Major Challenges</h3>
                      <ul>
                        <li *ngFor="let challenge of $any(report).summary.majorChallenges">
                          {{ challenge }}
                        </li>
                      </ul>
                    </div>

                    <div
                      class="summary-priorities"
                      *ngIf="$any(report).summary?.nextWeekPriorities?.length"
                    >
                      <h3>Next Week Priorities</h3>
                      <ul>
                        <li *ngFor="let priority of $any(report).summary.nextWeekPriorities">
                          {{ priority }}
                        </li>
                      </ul>
                    </div>
                  </mat-card-content>
                </mat-card>
              </section>
            </div>

            <!-- KPI Summary Page -->
            <div class="report-page">
              <section class="kpi-section">
                <h2>Key Performance Indicators</h2>

                <div class="kpi-grid" *ngIf="$any(report).kpiSummary?.weeklyTotals">
                  <mat-card class="kpi-card">
                    <mat-card-header>
                      <mat-icon>domain</mat-icon>
                      <mat-card-title>Infrastructure</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="kpi-item">
                        <span class="kpi-label">Poles Planted</span>
                        <span class="kpi-value">{{
                          $any(report).kpiSummary.weeklyTotals.polesPlanted || 0
                        }}</span>
                      </div>
                      <div class="kpi-item">
                        <span class="kpi-label">Trenching (m)</span>
                        <span class="kpi-value">{{
                          $any(report).kpiSummary.weeklyTotals.trenchingMeters || 0
                        }}</span>
                      </div>
                      <div class="kpi-item">
                        <span class="kpi-label">Cable Strung (m)</span>
                        <span class="kpi-value">{{
                          $any(report).kpiSummary.weeklyTotals.cableStrung || 0
                        }}</span>
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <mat-card class="kpi-card">
                    <mat-card-header>
                      <mat-icon>home</mat-icon>
                      <mat-card-title>Customer Connections</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="kpi-item">
                        <span class="kpi-label">Home Signups</span>
                        <span class="kpi-value">{{
                          $any(report).kpiSummary.weeklyTotals.homeSignups || 0
                        }}</span>
                      </div>
                      <div class="kpi-item">
                        <span class="kpi-label">Drops Installed</span>
                        <span class="kpi-value">{{
                          $any(report).kpiSummary.weeklyTotals.dropsInstalled || 0
                        }}</span>
                      </div>
                      <div class="kpi-item">
                        <span class="kpi-label">Homes Connected</span>
                        <span class="kpi-value">{{
                          $any(report).kpiSummary.weeklyTotals.homesConnected || 0
                        }}</span>
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <mat-card class="kpi-card">
                    <mat-card-header>
                      <mat-icon>security</mat-icon>
                      <mat-card-title>Safety & Quality</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="kpi-item">
                        <span class="kpi-label">Safety Incidents</span>
                        <span class="kpi-value">{{
                          $any(report).kpiSummary.weeklyTotals.safetyIncidents || 0
                        }}</span>
                      </div>
                      <div class="kpi-item">
                        <span class="kpi-label">Quality Score</span>
                        <span class="kpi-value"
                          >{{ $any(report).qualitySummary?.averageScore || 'N/A' }}%</span
                        >
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <!-- Progress Analysis -->
                <div class="progress-analysis" *ngIf="$any(report).progressAnalysis">
                  <h3>Progress vs Plan</h3>
                  <table
                    mat-table
                    [dataSource]="getProgressDataSource(report)"
                    class="progress-table"
                  >
                    <ng-container matColumnDef="metric">
                      <th mat-header-cell *matHeaderCellDef>Metric</th>
                      <td mat-cell *matCellDef="let row">{{ row.metric }}</td>
                    </ng-container>
                    <ng-container matColumnDef="planned">
                      <th mat-header-cell *matHeaderCellDef>Planned</th>
                      <td mat-cell *matCellDef="let row">{{ row.planned }}</td>
                    </ng-container>
                    <ng-container matColumnDef="actual">
                      <th mat-header-cell *matHeaderCellDef>Actual</th>
                      <td mat-cell *matCellDef="let row">{{ row.actual }}</td>
                    </ng-container>
                    <ng-container matColumnDef="variance">
                      <th mat-header-cell *matHeaderCellDef>Variance</th>
                      <td mat-cell *matCellDef="let row" [class.negative]="row.variance < 0">
                        {{ row.variance }}%
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="progressColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: progressColumns"></tr>
                  </table>
                </div>
              </section>
            </div>

            <!-- Contractor Performance Page -->
            <div class="report-page" *ngIf="$any(report).contractorPerformance?.length">
              <section class="contractor-section">
                <h2>Contractor Performance</h2>
                <div class="contractor-cards">
                  <mat-card
                    *ngFor="let contractor of $any(report).contractorPerformance"
                    class="contractor-card"
                  >
                    <mat-card-header>
                      <mat-card-title>{{ contractor.name }}</mat-card-title>
                      <mat-card-subtitle>Team Size: {{ contractor.teamSize }}</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="performance-grid">
                        <div class="performance-item">
                          <span class="label">Poles</span>
                          <span class="value">{{ contractor.weeklyMetrics.polesPlanted }}</span>
                        </div>
                        <div class="performance-item">
                          <span class="label">Trenching</span>
                          <span class="value">{{ contractor.weeklyMetrics.trenchingMeters }}m</span>
                        </div>
                        <div class="performance-item">
                          <span class="label">Cable</span>
                          <span class="value">{{ contractor.weeklyMetrics.cableStrung }}m</span>
                        </div>
                        <div class="performance-item">
                          <span class="label">Connections</span>
                          <span class="value">{{ contractor.weeklyMetrics.homesConnected }}</span>
                        </div>
                      </div>
                      <div class="performance-score">
                        <mat-chip [color]="getPerformanceColor(contractor.performanceScore)">
                          Performance: {{ contractor.performanceScore }}%
                        </mat-chip>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>
              </section>
            </div>
          </div>

          <!-- Daily Report Template -->
          <div *ngSwitchCase="'daily'" class="daily-report">
            <!-- Implementation for daily reports -->
            <p>Daily report view coming soon...</p>
          </div>

          <!-- Monthly Report Template -->
          <div *ngSwitchCase="'monthly'" class="monthly-report">
            <!-- Implementation for monthly reports -->
            <p>Monthly report view coming soon...</p>
          </div>
        </div>
      </ng-container>

      <ng-template #loading>
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading report...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      /* Base Styles */
      .report-viewer-container {
        background: var(--mat-sys-surface);
        min-height: 100vh;
      }

      .report-header {
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--mat-sys-surface);
        border-bottom: 1px solid var(--mat-sys-outline-variant);
        padding: 16px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .report-header h1 {
        flex: 1;
        margin: 0;
        font-size: 1.5rem;
        color: var(--mat-sys-on-surface);
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }

      /* Report Content */
      .report-content {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .report-page {
        background: white;
        padding: 48px;
        margin-bottom: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
      }

      /* Title Section */
      .title-section {
        text-align: center;
        padding: 80px 40px;
      }

      .report-logo mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        color: var(--mat-sys-primary);
        margin-bottom: 24px;
      }

      .report-title {
        font-size: 2.5rem;
        margin: 0 0 16px 0;
        color: var(--mat-sys-on-surface);
      }

      .project-name {
        font-size: 1.8rem;
        margin: 0 0 24px 0;
        color: var(--mat-sys-primary);
      }

      .report-period {
        font-size: 1.2rem;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 8px;
      }

      .generated-info {
        font-size: 0.9rem;
        color: var(--mat-sys-on-surface-variant);
      }

      /* Summary Section */
      .summary-section h2 {
        font-size: 1.8rem;
        margin-bottom: 24px;
        color: var(--mat-sys-on-surface);
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 24px;
        margin-bottom: 32px;
      }

      .summary-item h3 {
        font-size: 1rem;
        margin: 0 0 8px 0;
        color: var(--mat-sys-on-surface-variant);
      }

      .progress-value {
        font-size: 3rem;
        font-weight: 700;
        color: var(--mat-sys-primary);
      }

      .summary-highlights,
      .summary-challenges,
      .summary-priorities {
        margin-bottom: 24px;
      }

      .summary-highlights h3,
      .summary-challenges h3,
      .summary-priorities h3 {
        font-size: 1.2rem;
        margin: 0 0 12px 0;
        color: var(--mat-sys-on-surface);
      }

      .summary-highlights ul,
      .summary-challenges ul,
      .summary-priorities ul {
        margin: 0;
        padding-left: 24px;
      }

      .summary-highlights li,
      .summary-challenges li,
      .summary-priorities li {
        margin-bottom: 8px;
        color: var(--mat-sys-on-surface-variant);
      }

      /* KPI Section */
      .kpi-section h2 {
        font-size: 1.8rem;
        margin-bottom: 24px;
        color: var(--mat-sys-on-surface);
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        margin-bottom: 48px;
      }

      .kpi-card {
        border: 1px solid var(--mat-sys-outline-variant);
      }

      .kpi-card mat-card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .kpi-card mat-icon {
        color: var(--mat-sys-primary);
      }

      .kpi-card mat-card-title {
        font-size: 1.2rem;
      }

      .kpi-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--mat-sys-outline-variant);
      }

      .kpi-item:last-child {
        border-bottom: none;
      }

      .kpi-label {
        color: var(--mat-sys-on-surface-variant);
      }

      .kpi-value {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }

      /* Progress Analysis */
      .progress-analysis h3 {
        font-size: 1.4rem;
        margin-bottom: 16px;
        color: var(--mat-sys-on-surface);
      }

      .progress-table {
        width: 100%;
        background: transparent;
      }

      .progress-table th {
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }

      .progress-table td.negative {
        color: var(--mat-sys-error);
      }

      /* Contractor Section */
      .contractor-section h2 {
        font-size: 1.8rem;
        margin-bottom: 24px;
        color: var(--mat-sys-on-surface);
      }

      .contractor-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 24px;
      }

      .contractor-card {
        border: 1px solid var(--mat-sys-outline-variant);
      }

      .performance-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-bottom: 16px;
      }

      .performance-item {
        display: flex;
        flex-direction: column;
      }

      .performance-item .label {
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 4px;
      }

      .performance-item .value {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }

      .performance-score {
        text-align: center;
        margin-top: 16px;
      }

      /* Loading */
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 400px;
        gap: 16px;
      }

      /* Print Styles */
      @media print {
        .no-print {
          display: none !important;
        }

        .report-viewer-container {
          background: white;
        }

        .report-content {
          padding: 0;
          max-width: none;
        }

        .report-page {
          page-break-after: always;
          box-shadow: none;
          border-radius: 0;
          margin-bottom: 0;
          padding: 40px;
        }

        .report-page:last-child {
          page-break-after: auto;
        }

        mat-card {
          box-shadow: none !important;
          border: 1px solid #ccc !important;
        }

        .title-section {
          padding: 120px 40px;
        }

        .report-title {
          font-size: 36pt;
        }

        .project-name {
          font-size: 24pt;
        }

        table {
          border-collapse: collapse;
        }

        th,
        td {
          border: 1px solid #ccc;
          padding: 8px;
        }
      }
    `,
  ],
})
export class ReportViewerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private reportService = inject(ReportService);

  report$!: Observable<WeeklyReport | DailyReport | MonthlyReport | null>;
  progressColumns = ['metric', 'planned', 'actual', 'variance'];

  ngOnInit() {
    const reportType = this.route.snapshot.data['reportType'];
    const reportId = this.route.snapshot.params['id'];

    this.report$ = this.route.params.pipe(
      switchMap((params) => {
        const projectId = params['id'];

        // For now, generate a sample weekly report
        // In production, this would fetch from Firestore or generate on-demand
        if (reportType === 'weekly') {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 7);

          return this.reportService
            .generateWeeklyReport(projectId, startDate)
            .then((report) => report)
            .catch((error) => {
              console.error('Error generating report:', error);
              return null;
            });
        }

        return of(null);
      }),
    );
  }

  goBack() {
    this.router.navigate(['/reports']);
  }

  print() {
    window.print();
  }

  getReportTitle(report: any): string {
    switch (report.reportType) {
      case 'daily':
        return `Daily Report - ${this.formatDate(report.period.start)}`;
      case 'weekly':
        return `Weekly Report - Week ${report.summary?.weekNumber || ''}`;
      case 'monthly':
        return `Monthly Report - ${this.formatMonth(report.period.start)}`;
      default:
        return 'Report';
    }
  }

  formatDate(date: Date | any): string {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date: Date | any): string {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatMonth(date: Date | any): string {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  }

  getProgressDataSource(report: any): any[] {
    if (!report.progressAnalysis) return [];

    const analysis = report.progressAnalysis;
    return [
      {
        metric: 'Poles Planted',
        planned: analysis.planned.poles,
        actual: analysis.actual.poles,
        variance: analysis.variance.poles,
      },
      {
        metric: 'Trenching (m)',
        planned: analysis.planned.trenching,
        actual: analysis.actual.trenching,
        variance: analysis.variance.trenching,
      },
      {
        metric: 'Cable Strung (m)',
        planned: analysis.planned.cableStringing,
        actual: analysis.actual.cableStringing,
        variance: analysis.variance.cableStringing,
      },
      {
        metric: 'Homes Connected',
        planned: analysis.planned.connections,
        actual: analysis.actual.connections,
        variance: analysis.variance.connections,
      },
    ];
  }

  getPerformanceColor(score: number): 'primary' | 'accent' | 'warn' {
    if (score >= 90) return 'primary';
    if (score >= 70) return 'accent';
    return 'warn';
  }
}
