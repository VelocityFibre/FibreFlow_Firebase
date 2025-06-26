import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import {
  ReportGeneratorService,
  ReportOptions,
  ReportData,
} from '../../services/report-generator.service';
import { ProjectService } from '../../../../core/services/project.service';
import { Project } from '../../../../core/models/project.model';
import { Observable, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-report-generator',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatChipsModule,
  ],
  template: `
    <div class="ff-page-container">
      <div class="ff-page-header">
        <div class="header-content">
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">Generate and manage comprehensive reports</p>
        </div>
      </div>

      <mat-card class="reports-card">
        <mat-tab-group class="reports-tabs">
          <mat-tab label="Generate">
            <div class="tab-content">
              <div class="generate-section">
                <div class="section-header">
                  <mat-icon>assessment</mat-icon>
                  <h3>Report Generation</h3>
                </div>
                <p class="section-description">
                  Generate comprehensive daily, weekly, and monthly reports from your project data.
                </p>

                <div class="form-section">
                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Select Project</mat-label>
                    <mat-select
                      [(ngModel)]="selectedProjectId"
                      (selectionChange)="onProjectChange()"
                    >
                      <mat-option *ngFor="let project of projects$ | async" [value]="project.id">
                        {{ project.name }} ({{ project.projectCode }})
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="form-field">
                    <mat-label>Report Date</mat-label>
                    <input
                      matInput
                      [matDatepicker]="picker"
                      [(ngModel)]="selectedDate"
                      [max]="maxDate"
                    />
                    <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                    <mat-datepicker #picker></mat-datepicker>
                  </mat-form-field>
                </div>

                <div class="report-options">
                  <div
                    class="option-card"
                    [class.selected]="selectedReportType === 'daily'"
                    (click)="selectReportType('daily')"
                  >
                    <mat-icon>today</mat-icon>
                    <h4>Daily Report</h4>
                    <p>Daily progress and KPIs</p>
                  </div>
                  <div
                    class="option-card"
                    [class.selected]="selectedReportType === 'weekly'"
                    (click)="selectReportType('weekly')"
                  >
                    <mat-icon>view_week</mat-icon>
                    <h4>Weekly Report</h4>
                    <p>Weekly summary and trends</p>
                  </div>
                  <div
                    class="option-card"
                    [class.selected]="selectedReportType === 'monthly'"
                    (click)="selectReportType('monthly')"
                  >
                    <mat-icon>calendar_month</mat-icon>
                    <h4>Monthly Report</h4>
                    <p>Monthly overview and analytics</p>
                  </div>
                </div>

                <div class="generate-actions">
                  <button
                    mat-raised-button
                    color="primary"
                    [disabled]="!canGenerateReport() || isGenerating"
                    (click)="generateReport()"
                  >
                    <mat-icon *ngIf="!isGenerating">file_download</mat-icon>
                    <mat-progress-spinner
                      *ngIf="isGenerating"
                      diameter="20"
                      mode="indeterminate"
                    ></mat-progress-spinner>
                    {{ isGenerating ? 'Generating...' : 'Generate Report' }}
                  </button>
                </div>

                <!-- Report Preview Section -->
                <div class="report-preview" *ngIf="currentReport">
                  <div class="preview-header">
                    <h3>Report Preview</h3>
                    <div class="preview-actions">
                      <button mat-button (click)="exportToPDF()">
                        <mat-icon>picture_as_pdf</mat-icon>
                        Export PDF
                      </button>
                      <button mat-button (click)="exportToCSV()">
                        <mat-icon>table_chart</mat-icon>
                        Export CSV
                      </button>
                    </div>
                  </div>

                  <div class="report-content">
                    <div class="report-metadata">
                      <h4>{{ currentReport.metadata.reportType }}</h4>
                      <p>
                        <strong>Project:</strong> {{ currentReport.metadata.projectName }} ({{
                          currentReport.metadata.projectCode
                        }})
                      </p>
                      <p>
                        <strong>Report Date:</strong>
                        {{ currentReport.metadata.reportDate | date: 'mediumDate' }}
                      </p>
                      <p>
                        <strong>Generated:</strong>
                        {{ currentReport.metadata.generatedDate | date: 'medium' }}
                      </p>
                    </div>

                    <div class="report-summary">
                      <h5>Summary</h5>
                      <div class="summary-cards">
                        <div class="summary-card">
                          <mat-icon>task</mat-icon>
                          <div class="summary-data">
                            <span class="value">{{ currentReport.summary.totalTasks }}</span>
                            <span class="label">Total Tasks</span>
                          </div>
                        </div>
                        <div class="summary-card success">
                          <mat-icon>check_circle</mat-icon>
                          <div class="summary-data">
                            <span class="value">{{ currentReport.summary.completedTasks }}</span>
                            <span class="label">Completed</span>
                          </div>
                        </div>
                        <div class="summary-card warning">
                          <mat-icon>schedule</mat-icon>
                          <div class="summary-data">
                            <span class="value">{{ currentReport.summary.inProgressTasks }}</span>
                            <span class="label">In Progress</span>
                          </div>
                        </div>
                        <div class="summary-card">
                          <mat-icon>pending</mat-icon>
                          <div class="summary-data">
                            <span class="value">{{ currentReport.summary.pendingTasks }}</span>
                            <span class="label">Pending</span>
                          </div>
                        </div>
                        <div class="summary-card">
                          <mat-icon>trending_up</mat-icon>
                          <div class="summary-data">
                            <span class="value">{{ currentReport.summary.completionRate }}%</span>
                            <span class="label">Completion Rate</span>
                          </div>
                        </div>
                        <div
                          class="summary-card danger"
                          *ngIf="currentReport.summary.flaggedTasks > 0"
                        >
                          <mat-icon>flag</mat-icon>
                          <div class="summary-data">
                            <span class="value">{{ currentReport.summary.flaggedTasks }}</span>
                            <span class="label">Flagged</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="report-details">
                      <h5>Tasks by Assignee</h5>
                      <table
                        mat-table
                        [dataSource]="currentReport.tasksByAssignee"
                        class="assignee-table"
                      >
                        <ng-container matColumnDef="assigneeName">
                          <th mat-header-cell *matHeaderCellDef>Assignee</th>
                          <td mat-cell *matCellDef="let element">{{ element.assigneeName }}</td>
                        </ng-container>
                        <ng-container matColumnDef="totalTasks">
                          <th mat-header-cell *matHeaderCellDef>Total</th>
                          <td mat-cell *matCellDef="let element">{{ element.totalTasks }}</td>
                        </ng-container>
                        <ng-container matColumnDef="completedTasks">
                          <th mat-header-cell *matHeaderCellDef>Completed</th>
                          <td mat-cell *matCellDef="let element">{{ element.completedTasks }}</td>
                        </ng-container>
                        <ng-container matColumnDef="inProgressTasks">
                          <th mat-header-cell *matHeaderCellDef>In Progress</th>
                          <td mat-cell *matCellDef="let element">{{ element.inProgressTasks }}</td>
                        </ng-container>
                        <ng-container matColumnDef="pendingTasks">
                          <th mat-header-cell *matHeaderCellDef>Pending</th>
                          <td mat-cell *matCellDef="let element">{{ element.pendingTasks }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="assigneeColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: assigneeColumns"></tr>
                      </table>

                      <h5 style="margin-top: 32px;">Tasks by Priority</h5>
                      <div class="priority-breakdown">
                        <div class="priority-card" *ngFor="let item of currentReport.tasksByPriority">
                          <h6>{{ item.priority | titlecase }}</h6>
                          <div class="priority-stats">
                            <span class="count">{{ item.count }}</span>
                            <span class="label">Total</span>
                          </div>
                          <div class="priority-progress">
                            <div class="progress-bar" [style.width.%]="(item.completed / item.count) * 100"></div>
                          </div>
                          <span class="completed">{{ item.completed }} completed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Report History">
            <div class="tab-content">
              <div class="list-section">
                <div class="section-header">
                  <mat-icon>history</mat-icon>
                  <h3>Report History</h3>
                </div>
                <p class="section-description">View previously generated reports.</p>
                <div class="history-content" *ngIf="reportHistory.length > 0">
                  <div class="history-item" *ngFor="let report of reportHistory">
                    <div class="history-info">
                      <h4>{{ report.metadata.reportType }} - {{ report.metadata.projectName }}</h4>
                      <p>Generated on {{ report.metadata.generatedDate | date: 'medium' }}</p>
                    </div>
                    <div class="history-actions">
                      <button mat-button (click)="viewReport(report)">View</button>
                      <button mat-icon-button (click)="deleteReport(report)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="empty-state" *ngIf="reportHistory.length === 0">
                  <mat-icon>description</mat-icon>
                  <h4>No Reports Yet</h4>
                  <p>Generated reports will appear here.</p>
                  <button mat-button (click)="switchToGenerateTab()">
                    Generate Your First Report
                  </button>
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    </div>
  `,
  styles: [
    `
      @use '../../../../../styles/component-theming' as theme;

      .ff-page-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 40px 24px;

        @media (max-width: 768px) {
          padding: 24px 16px;
        }
      }

      .ff-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 48px;

        .header-content {
          flex: 1;
        }

        .page-title {
          font-size: 32px;
          font-weight: 300;
          color: theme.ff-rgb(foreground);
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          font-size: 18px;
          color: theme.ff-rgb(muted-foreground);
          font-weight: 400;
          margin: 0;
        }
      }

      .reports-card {
        @include theme.card-theme();
        overflow: hidden;
      }

      .reports-tabs {
        :host ::ng-deep .mat-mdc-tab-group {
          .mat-mdc-tab-header {
            border-bottom: 1px solid theme.ff-rgb(border);
          }

          .mat-mdc-tab {
            min-width: 160px;
            height: 56px;
          }
        }
      }

      .tab-content {
        padding: 32px;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;

        mat-icon {
          color: theme.ff-rgb(primary);
          font-size: 24px;
        }

        h3 {
          @include theme.heading-3();
          margin: 0;
        }
      }

      .section-description {
        color: theme.ff-rgb(muted-foreground);
        margin-bottom: 32px;
        line-height: 1.6;
      }

      .form-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 32px;

        .form-field {
          width: 100%;
        }
      }

      .report-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 32px;

        .option-card {
          @include theme.card-theme();
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          }

          &.selected {
            border-color: theme.ff-rgb(primary);
            background-color: theme.ff-rgba(primary, 0.05);
          }

          mat-icon {
            font-size: 48px;
            width: 48px;
            height: 48px;
            color: theme.ff-rgb(primary);
            margin-bottom: 16px;
          }

          h4 {
            @include theme.heading-4();
            margin: 0 0 8px 0;
          }

          p {
            color: theme.ff-rgb(muted-foreground);
            margin: 0;
            font-size: 14px;
          }
        }
      }

      .generate-actions {
        text-align: center;

        button {
          margin-bottom: 16px;
          min-width: 200px;

          mat-icon {
            margin-right: 8px;
          }

          mat-progress-spinner {
            display: inline-block;
            margin-right: 8px;
          }
        }
      }

      .report-preview {
        margin-top: 48px;

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;

          h3 {
            @include theme.heading-3();
            margin: 0;
          }

          .preview-actions {
            display: flex;
            gap: 12px;
          }
        }
      }

      .report-content {
        @include theme.card-theme();
        padding: 24px;

        .report-metadata {
          margin-bottom: 32px;

          h4 {
            @include theme.heading-4();
            margin: 0 0 16px 0;
          }

          p {
            margin: 8px 0;
            color: theme.ff-rgb(muted-foreground);
          }
        }

        .report-summary {
          margin-bottom: 32px;

          h5 {
            @include theme.heading-5();
            margin: 0 0 16px 0;
          }

          .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;

            .summary-card {
              @include theme.card-theme();
              padding: 16px;
              display: flex;
              align-items: center;
              gap: 12px;

              mat-icon {
                font-size: 32px;
                width: 32px;
                height: 32px;
                color: theme.ff-rgb(muted-foreground);
              }

              &.success mat-icon {
                color: theme.ff-rgb(success);
              }

              &.warning mat-icon {
                color: theme.ff-rgb(warning);
              }

              &.danger mat-icon {
                color: theme.ff-rgb(danger);
              }

              .summary-data {
                display: flex;
                flex-direction: column;

                .value {
                  font-size: 24px;
                  font-weight: 600;
                  color: theme.ff-rgb(foreground);
                }

                .label {
                  font-size: 12px;
                  color: theme.ff-rgb(muted-foreground);
                  text-transform: uppercase;
                }
              }
            }
          }
        }

        .report-details {
          h5 {
            @include theme.heading-5();
            margin: 0 0 16px 0;
          }

          .assignee-table {
            width: 100%;
            background: transparent;

            th {
              font-weight: 600;
              color: theme.ff-rgb(muted-foreground);
            }
          }
        }

        .priority-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 16px;

          .priority-card {
            @include theme.card-theme();
            padding: 16px;

            h6 {
              margin: 0 0 12px 0;
              font-size: 14px;
              font-weight: 600;
              color: theme.ff-rgb(foreground);
            }

            .priority-stats {
              display: flex;
              align-items: baseline;
              gap: 8px;
              margin-bottom: 8px;

              .count {
                font-size: 24px;
                font-weight: 600;
                color: theme.ff-rgb(primary);
              }

              .label {
                font-size: 12px;
                color: theme.ff-rgb(muted-foreground);
              }
            }

            .priority-progress {
              height: 4px;
              background: theme.ff-rgba(muted-foreground, 0.2);
              border-radius: 2px;
              margin-bottom: 8px;
              overflow: hidden;

              .progress-bar {
                height: 100%;
                background: theme.ff-rgb(primary);
                transition: width 0.3s ease;
              }
            }

            .completed {
              font-size: 12px;
              color: theme.ff-rgb(muted-foreground);
            }
          }
        }
      }

      .history-content {
        .history-item {
          @include theme.card-theme();
          padding: 16px 24px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;

          .history-info {
            h4 {
              @include theme.heading-5();
              margin: 0 0 4px 0;
            }

            p {
              color: theme.ff-rgb(muted-foreground);
              margin: 0;
              font-size: 14px;
            }
          }

          .history-actions {
            display: flex;
            gap: 8px;
          }
        }
      }

      .empty-state {
        text-align: center;
        padding: 48px 24px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: theme.ff-rgb(muted-foreground);
          margin-bottom: 24px;
        }

        h4 {
          @include theme.heading-4();
          margin: 0 0 16px 0;
        }

        p {
          color: theme.ff-rgb(muted-foreground);
          margin-bottom: 24px;
          line-height: 1.6;
        }
      }

      // Material overrides
      :host ::ng-deep {
        .mat-mdc-card {
          border-radius: var(--ff-radius) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
          border: 1px solid rgb(var(--ff-border)) !important;
          background-color: rgb(var(--ff-card)) !important;
        }

        .mat-mdc-tab-group {
          .mat-mdc-tab-header {
            .mat-mdc-tab-label-container {
              .mat-mdc-tab-label {
                &.mdc-tab--active {
                  .mdc-tab__text-label {
                    color: theme.ff-rgb(primary);
                  }
                }
              }
            }
          }
        }

        .mat-mdc-form-field {
          width: 100%;
        }

        .mat-mdc-table {
          background: transparent !important;
        }
      }
    `,
  ],
})
export class ReportGeneratorComponent implements OnInit {
  private reportService = inject(ReportGeneratorService);
  private projectService = inject(ProjectService);
  private snackBar = inject(MatSnackBar);

  projects$: Observable<Project[]> = this.projectService.getProjects();
  selectedProjectId: string = '';
  selectedDate: Date = new Date();
  selectedReportType: 'daily' | 'weekly' | 'monthly' = 'daily';
  maxDate: Date = new Date();

  isGenerating = false;
  currentReport: ReportData | null = null;
  reportHistory: ReportData[] = [];

  assigneeColumns: string[] = [
    'assigneeName',
    'totalTasks',
    'completedTasks',
    'inProgressTasks',
    'pendingTasks',
  ];

  ngOnInit() {
    // Load report history from localStorage
    this.loadReportHistory();
  }

  onProjectChange() {
    this.currentReport = null;
  }

  selectReportType(type: 'daily' | 'weekly' | 'monthly') {
    this.selectedReportType = type;
  }

  canGenerateReport(): boolean {
    return !!this.selectedProjectId && !!this.selectedDate && !!this.selectedReportType;
  }

  generateReport() {
    if (!this.canGenerateReport()) {
      this.snackBar.open('Please select a project and date', 'Close', { duration: 3000 });
      return;
    }

    this.isGenerating = true;
    const options: ReportOptions = {
      type: this.selectedReportType,
      projectId: this.selectedProjectId,
      date: this.selectedDate,
    };

    this.reportService.generateReport(options).subscribe({
      next: (report) => {
        this.currentReport = report;
        this.addToHistory(report);
        this.isGenerating = false;
        this.snackBar.open('Report generated successfully!', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error generating report:', error);
        this.isGenerating = false;
        this.snackBar.open('Error generating report. Please try again.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  exportToPDF() {
    if (this.currentReport) {
      const filename = this.reportService.exportReportToPDF(this.currentReport);
      this.snackBar.open(`PDF export started: ${filename}`, 'Close', { duration: 3000 });
    }
  }

  exportToCSV() {
    if (this.currentReport) {
      const csvContent = this.reportService.exportReportToCSV(this.currentReport);
      // In a real implementation, trigger download
      this.snackBar.open('CSV export started', 'Close', { duration: 3000 });
    }
  }

  private loadReportHistory() {
    const stored = localStorage.getItem('reportHistory');
    if (stored) {
      try {
        this.reportHistory = JSON.parse(stored);
      } catch (e) {
        console.error('Error loading report history:', e);
      }
    }
  }

  private addToHistory(report: ReportData) {
    this.reportHistory.unshift(report);
    // Keep only last 20 reports
    if (this.reportHistory.length > 20) {
      this.reportHistory = this.reportHistory.slice(0, 20);
    }
    localStorage.setItem('reportHistory', JSON.stringify(this.reportHistory));
  }

  viewReport(report: ReportData) {
    this.currentReport = report;
    // Switch to generate tab
    // In a real implementation, you'd programmatically switch tabs
  }

  deleteReport(report: ReportData) {
    const index = this.reportHistory.indexOf(report);
    if (index > -1) {
      this.reportHistory.splice(index, 1);
      localStorage.setItem('reportHistory', JSON.stringify(this.reportHistory));
      this.snackBar.open('Report deleted', 'Close', { duration: 2000 });
    }
  }

  switchToGenerateTab() {
    // In a real implementation, programmatically switch to generate tab
  }
}
