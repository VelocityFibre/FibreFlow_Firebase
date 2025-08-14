import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent, PageHeaderAction } from '../../../../shared/components/page-header/page-header.component';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Page Header -->
      <app-page-header
        title="Reports Dashboard"
        subtitle="Generate and view project reports"
        [actions]="headerActions"
      ></app-page-header>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <mat-card class="action-card" (click)="generateQuickReport('daily')">
          <mat-card-content>
            <mat-icon class="action-icon daily">today</mat-icon>
            <h3>Today's Report</h3>
            <p>Generate daily report for today</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="action-card" (click)="generateQuickReport('weekly')">
          <mat-card-content>
            <mat-icon class="action-icon weekly">date_range</mat-icon>
            <h3>This Week's Report</h3>
            <p>Generate report for current week</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="action-card" (click)="generateQuickReport('monthly')">
          <mat-card-content>
            <mat-icon class="action-icon monthly">calendar_month</mat-icon>
            <h3>This Month's Report</h3>
            <p>Generate report for current month</p>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Report History -->
      <mat-card class="history-card">
        <mat-card-header>
          <mat-card-title>Report History</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="All Reports">
              <div class="tab-content">
                @if (loading()) {
                  <div class="loading-container">
                    <mat-spinner diameter="40"></mat-spinner>
                    <p>Loading reports...</p>
                  </div>
                } @else if (reports().length === 0) {
                  <div class="empty-state">
                    <mat-icon>description</mat-icon>
                    <h3>No Reports Yet</h3>
                    <p>Generate your first report to get started</p>
                    <button mat-raised-button color="primary" (click)="navigateToGenerator()">
                      Generate Report
                    </button>
                  </div>
                } @else {
                  <table mat-table [dataSource]="reports()" class="reports-table">
                    <ng-container matColumnDef="type">
                      <th mat-header-cell *matHeaderCellDef>Type</th>
                      <td mat-cell *matCellDef="let report">
                        <mat-icon [class]="'type-icon ' + report.reportType">
                          @switch (report.reportType) {
                            @case ('daily') {
                              today
                            }
                            @case ('weekly') {
                              date_range
                            }
                            @case ('monthly') {
                              calendar_month
                            }
                          }
                        </mat-icon>
                        {{ getReportTypeLabel(report.reportType) }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="project">
                      <th mat-header-cell *matHeaderCellDef>Project</th>
                      <td mat-cell *matCellDef="let report">{{ report.projectName }}</td>
                    </ng-container>

                    <ng-container matColumnDef="period">
                      <th mat-header-cell *matHeaderCellDef>Period</th>
                      <td mat-cell *matCellDef="let report">{{ formatReportPeriod(report) }}</td>
                    </ng-container>

                    <ng-container matColumnDef="generated">
                      <th mat-header-cell *matHeaderCellDef>Generated</th>
                      <td mat-cell *matCellDef="let report">
                        {{ report.generatedAt | date: 'short' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef>Actions</th>
                      <td mat-cell *matCellDef="let report">
                        <button mat-icon-button (click)="viewReport(report)">
                          <mat-icon>visibility</mat-icon>
                        </button>
                        <button mat-icon-button (click)="downloadReport(report)">
                          <mat-icon>download</mat-icon>
                        </button>
                        <button mat-icon-button (click)="shareReport(report)">
                          <mat-icon>share</mat-icon>
                        </button>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr
                      mat-row
                      *matRowDef="let row; columns: displayedColumns"
                      class="report-row"
                    ></tr>
                  </table>
                }
              </div>
            </mat-tab>

            <mat-tab label="Daily Reports">
              <div class="tab-content">
                <p>Daily reports content here</p>
              </div>
            </mat-tab>

            <mat-tab label="Weekly Reports">
              <div class="tab-content">
                <p>Weekly reports content here</p>
              </div>
            </mat-tab>

            <mat-tab label="Monthly Reports">
              <div class="tab-content">
                <p>Monthly reports content here</p>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `

      .quick-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .action-card {
        cursor: pointer;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }

      .action-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }

      .action-card mat-card-content {
        text-align: center;
        padding: 24px;
      }

      .action-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin: 0 auto 16px;
      }

      .action-icon.daily {
        color: var(--mat-sys-primary);
      }

      .action-icon.weekly {
        color: var(--mat-sys-secondary);
      }

      .action-icon.monthly {
        color: var(--mat-sys-tertiary);
      }

      .action-card h3 {
        margin: 0 0 8px 0;
        color: var(--mat-sys-on-surface);
      }

      .action-card p {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 14px;
      }

      .history-card {
        margin-top: 24px;
      }

      .tab-content {
        padding: 24px 0;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px;
        gap: 16px;
      }

      .loading-container p {
        color: var(--mat-sys-on-surface-variant);
        margin: 0;
      }

      .empty-state {
        text-align: center;
        padding: 60px;
      }

      .empty-state mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 16px;
      }

      .empty-state h3 {
        margin: 0 0 8px 0;
        color: var(--mat-sys-on-surface);
      }

      .empty-state p {
        margin: 0 0 24px 0;
        color: var(--mat-sys-on-surface-variant);
      }

      .reports-table {
        width: 100%;
      }

      .type-icon {
        vertical-align: middle;
        margin-right: 8px;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .type-icon.daily {
        color: var(--mat-sys-primary);
      }

      .type-icon.weekly {
        color: var(--mat-sys-secondary);
      }

      .type-icon.monthly {
        color: var(--mat-sys-tertiary);
      }

      .report-row {
        cursor: pointer;
      }

      .report-row:hover {
        background-color: var(--mat-sys-surface-variant);
      }

      @media (max-width: 768px) {
        .quick-actions {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ReportsDashboardComponent implements OnInit {
  private router = inject(Router);
  private reportService = inject(ReportService);

  // Signals
  loading = signal(false);
  reports = signal<any[]>([]);

  // Table columns
  displayedColumns = ['type', 'project', 'period', 'generated', 'actions'];

  // Header actions
  headerActions: PageHeaderAction[] = [
    {
      label: 'Generate New Report',
      icon: 'add',
      color: 'primary',
      variant: 'raised',
      action: () => this.navigateToGenerator()
    }
  ];

  ngOnInit() {
    this.loadReports();
  }

  private async loadReports() {
    this.loading.set(true);
    try {
      const reports = await this.reportService.getReports();
      // Format the reports for display
      const formattedReports = reports.map((report) => ({
        ...report,
        type: report.reportType || 'Unknown',
        project: report.projectName || 'N/A',
        period: this.formatPeriod(report),
        generatedAt: report.createdAt?.toDate
          ? report.createdAt.toDate()
          : report.createdAt
            ? new Date(report.createdAt)
            : new Date(),
      }));
      this.reports.set(formattedReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      this.reports.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private formatPeriod(report: any): string {
    try {
      if (report.reportType === 'daily' && report.date) {
        // Handle Firestore Timestamp or Date
        const date = report.date.toDate ? report.date.toDate() : new Date(report.date);
        return date.toLocaleDateString();
      } else if (report.reportType === 'weekly' && report.weekStartDate && report.weekEndDate) {
        // Handle Firestore Timestamp or Date
        const start = report.weekStartDate.toDate
          ? report.weekStartDate.toDate()
          : new Date(report.weekStartDate);
        const end = report.weekEndDate.toDate
          ? report.weekEndDate.toDate()
          : new Date(report.weekEndDate);
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      } else if (report.reportType === 'monthly' && report.month && report.year) {
        return `${report.month}/${report.year}`;
      }
    } catch (error) {
      console.error('Error formatting period:', error);
    }
    return 'N/A';
  }

  navigateToGenerator() {
    this.router.navigate(['/reports/generate']);
  }

  generateQuickReport(type: 'daily' | 'weekly' | 'monthly') {
    this.router.navigate(['/reports/generate'], {
      queryParams: { type, quick: true },
    });
  }

  viewReport(report: any) {
    this.router.navigate(['/reports', report.reportType, report.id]);
  }

  downloadReport(report: any) {
    // TODO: Implement PDF download
    console.log('Download report:', report);
  }

  shareReport(report: any) {
    // TODO: Implement sharing functionality
    console.log('Share report:', report);
  }

  getReportTypeLabel(type: string): string {
    switch (type) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return 'Unknown';
    }
  }

  formatReportPeriod(report: any): string {
    return this.formatPeriod(report);
  }
}
