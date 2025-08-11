import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { PageHeaderComponent, PageHeaderAction } from '../../../../shared/components/page-header/page-header.component';
import { MatDialog } from '@angular/material/dialog';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { DailyKPIs, KPI_DEFINITIONS } from '../../models/daily-kpis.model';
import { DailyKpisService } from '../../services/daily-kpis.service';
import { ProjectService } from '../../../../core/services/project.service';
import { WeeklyReportGeneratorService } from '../../services/weekly-report-generator.service';
import { WeeklyReportDocxService } from '../../services/weekly-report-docx.service';
import { WeeklyReportPreviewComponent } from '../weekly-report-preview/weekly-report-preview.component';
import { Project } from '../../../../core/models/project.model';
import { combineLatest, map, switchMap, of, catchError, firstValueFrom } from 'rxjs';

interface KPISummaryRow {
  metric: string;
  today: number;
  total: number;
  unit: string;
  category: string;
}

@Component({
  selector: 'app-daily-kpis-summary',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    MatMenuModule,
    MatSnackBarModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Page Header -->
      <app-page-header
        title="Daily KPIs Dashboard"
        subtitle="Comprehensive view of all daily KPI data"
        [actions]="headerActions"
      ></app-page-header>

      <!-- Filters Section -->
      <mat-card class="filter-card">
        <mat-card-content>
          <div class="filters-row">
            @if (!dateRangeMode()) {
              <mat-form-field appearance="outline">
                <mat-label>Select Date</mat-label>
                <input matInput [matDatepicker]="picker" [formControl]="dateControl" />
                <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>
            } @else {
              <mat-form-field appearance="outline">
                <mat-label>Start Date</mat-label>
                <input matInput [matDatepicker]="startPicker" [formControl]="startDateControl" />
                <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>End Date</mat-label>
                <input matInput [matDatepicker]="endPicker" [formControl]="endDateControl" />
                <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
              </mat-form-field>
            }

            <mat-form-field appearance="outline">
              <mat-label>Select Project</mat-label>
              <mat-select [formControl]="projectControl">
                <mat-option value="">All Projects</mat-option>
                @for (project of projects(); track project.id) {
                  <mat-option [value]="project.id">{{ project.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <button
              mat-button
              (click)="toggleDateRangeMode()"
              [color]="dateRangeMode() ? 'primary' : 'basic'"
            >
              <mat-icon>{{ dateRangeMode() ? 'date_range' : 'today' }}</mat-icon>
              {{ dateRangeMode() ? 'Date Range' : 'Single Date' }}
            </button>

            <button mat-raised-button color="primary" (click)="loadDailySummary()">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>

            <button mat-raised-button (click)="navigateToForm()">
              <mat-icon>add</mat-icon>
              New Entry
            </button>

            @if (currentKpis().length > 0) {
              <button mat-raised-button [matMenuTriggerFor]="exportMenu">
                <mat-icon>download</mat-icon>
                Export
              </button>
              <mat-menu #exportMenu="matMenu">
                <button mat-menu-item (click)="exportPDF()">
                  <mat-icon>picture_as_pdf</mat-icon>
                  <span>Export as PDF</span>
                </button>
                <button mat-menu-item (click)="exportExcel()">
                  <mat-icon>table_chart</mat-icon>
                  <span>Export as Excel</span>
                </button>
                <button mat-menu-item (click)="exportCSV()">
                  <mat-icon>csv</mat-icon>
                  <span>Export as CSV</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="generateWeeklyReport()">
                  <mat-icon>description</mat-icon>
                  <span>Generate Weekly Report</span>
                </button>
              </mat-menu>
            }
          </div>
        </mat-card-content>
      </mat-card>

      @if (loadingDaily()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading daily KPIs...</p>
        </div>
      } @else if (currentKpis().length > 0) {
        <!-- Date and Project Info -->
        <mat-card class="info-card">
          <mat-card-header>
            <mat-card-title>
              @if (!dateRangeMode()) {
                {{ dateControl.value | date: 'fullDate' }}
              } @else {
                {{ startDateControl.value | date: 'shortDate' }} -
                {{ endDateControl.value | date: 'shortDate' }}
              }
              - {{ selectedProjectName() }}
              @if (selectedContractorName()) {
                <span class="contractor-info"> | {{ selectedContractorName() }}</span>
              }
            </mat-card-title>
          </mat-card-header>
        </mat-card>

        <!-- Core KPIs Section -->
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>Core Activities</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="dailySummary()" class="kpi-table">
              <ng-container matColumnDef="metric">
                <th mat-header-cell *matHeaderCellDef>Metric</th>
                <td mat-cell *matCellDef="let row">{{ row.metric }}</td>
              </ng-container>

              <ng-container matColumnDef="today">
                <th mat-header-cell *matHeaderCellDef class="number-header">Today</th>
                <td mat-cell *matCellDef="let row" class="number-cell">{{ row.today }}</td>
              </ng-container>

              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef class="number-header">Total</th>
                <td mat-cell *matCellDef="let row" class="number-cell total-cell">
                  {{ row.total }}
                </td>
              </ng-container>

              <ng-container matColumnDef="unit">
                <th mat-header-cell *matHeaderCellDef>Unit</th>
                <td mat-cell *matCellDef="let row">{{ row.unit }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <!-- Weather & Environmental Section -->
        @if (hasWeatherData()) {
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>Weather & Environmental Conditions</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="data-grid">
                @for (kpi of currentKpis(); track kpi.id) {
                  @if (
                    kpi.weatherConditions || kpi.weatherImpact !== undefined || kpi.temperatureRange
                  ) {
                    <div class="data-item">
                      <span class="label">Weather</span>
                      <span class="value">{{ kpi.weatherConditions || 'Not recorded' }}</span>
                    </div>
                    <div class="data-item">
                      <span class="label">Weather Impact</span>
                      <span class="value">{{
                        kpi.weatherImpact !== undefined ? kpi.weatherImpact + '/10' : 'N/A'
                      }}</span>
                    </div>
                    @if (kpi.temperatureRange) {
                      <div class="data-item">
                        <span class="label">Temperature Range</span>
                        <span class="value"
                          >{{ kpi.temperatureRange.min }}°C - {{ kpi.temperatureRange.max }}°C</span
                        >
                      </div>
                    }
                  }
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Safety & Compliance Section -->
        @if (hasSafetyData()) {
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>Safety & Compliance</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="data-grid">
                @for (kpi of currentKpis(); track kpi.id) {
                  @if (kpi.safetyIncidents !== undefined) {
                    <div class="data-item">
                      <span class="label">Safety Incidents</span>
                      <span class="value" [class.warning]="kpi.safetyIncidents > 0">{{
                        kpi.safetyIncidents
                      }}</span>
                    </div>
                  }
                  @if (kpi.nearMisses !== undefined) {
                    <div class="data-item">
                      <span class="label">Near Misses</span>
                      <span class="value" [class.warning]="kpi.nearMisses > 0">{{
                        kpi.nearMisses
                      }}</span>
                    </div>
                  }
                  @if (kpi.toolboxTalks !== undefined) {
                    <div class="data-item">
                      <span class="label">Toolbox Talks</span>
                      <span class="value">{{ kpi.toolboxTalks }}</span>
                    </div>
                  }
                  @if (kpi.safetyObservations !== undefined) {
                    <div class="data-item">
                      <span class="label">Safety Observations</span>
                      <span class="value">{{ kpi.safetyObservations }}</span>
                    </div>
                  }
                  @if (kpi.complianceScore !== undefined) {
                    <div class="data-item">
                      <span class="label">Compliance Score</span>
                      <span
                        class="value"
                        [class.success]="kpi.complianceScore >= 90"
                        [class.warning]="kpi.complianceScore < 80"
                      >
                        {{ kpi.complianceScore }}%
                      </span>
                    </div>
                  }
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Quality Metrics Section -->
        @if (hasQualityData()) {
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>Quality Metrics</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="data-grid">
                @for (kpi of currentKpis(); track kpi.id) {
                  @if (kpi.qualityIssues !== undefined) {
                    <div class="data-item">
                      <span class="label">Quality Issues</span>
                      <span class="value" [class.warning]="kpi.qualityIssues > 0">{{
                        kpi.qualityIssues
                      }}</span>
                    </div>
                  }
                  @if (kpi.reworkRequired !== undefined) {
                    <div class="data-item">
                      <span class="label">Rework Required</span>
                      <span class="value" [class.warning]="kpi.reworkRequired > 0">{{
                        kpi.reworkRequired
                      }}</span>
                    </div>
                  }
                  @if (kpi.inspectionsPassed !== undefined) {
                    <div class="data-item">
                      <span class="label">Inspections Passed</span>
                      <span class="value success">{{ kpi.inspectionsPassed }}</span>
                    </div>
                  }
                  @if (kpi.inspectionsFailed !== undefined) {
                    <div class="data-item">
                      <span class="label">Inspections Failed</span>
                      <span class="value" [class.error]="kpi.inspectionsFailed > 0">{{
                        kpi.inspectionsFailed
                      }}</span>
                    </div>
                  }
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Resources Section -->
        @if (hasResourceData()) {
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>Resources & Team</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="data-grid">
                @for (kpi of currentKpis(); track kpi.id) {
                  @if (kpi.teamSize !== undefined) {
                    <div class="data-item">
                      <span class="label">Team Size</span>
                      <span class="value">{{ kpi.teamSize }}</span>
                    </div>
                  }
                  @if (kpi.regularHours !== undefined) {
                    <div class="data-item">
                      <span class="label">Regular Hours</span>
                      <span class="value">{{ kpi.regularHours }}</span>
                    </div>
                  }
                  @if (kpi.overtimeHours !== undefined) {
                    <div class="data-item">
                      <span class="label">Overtime Hours</span>
                      <span class="value" [class.warning]="kpi.overtimeHours > 8">{{
                        kpi.overtimeHours
                      }}</span>
                    </div>
                  }
                  @if (kpi.equipmentUtilization !== undefined) {
                    <div class="data-item">
                      <span class="label">Equipment Utilization</span>
                      <span class="value">{{ kpi.equipmentUtilization }}%</span>
                    </div>
                  }
                  @if (kpi.vehiclesUsed !== undefined) {
                    <div class="data-item">
                      <span class="label">Vehicles Used</span>
                      <span class="value">{{ kpi.vehiclesUsed }}</span>
                    </div>
                  }
                }
              </div>

              <!-- Team Members List -->
              @for (kpi of currentKpis(); track kpi.id) {
                @if (kpi.teamMembers && kpi.teamMembers.length > 0) {
                  <mat-divider class="section-divider"></mat-divider>
                  <h3>Team Members</h3>
                  <div class="team-members-grid">
                    @for (member of kpi.teamMembers; track member.id) {
                      <div class="team-member-card">
                        <strong>{{ member.name }}</strong>
                        <span class="role">{{ member.role }}</span>
                        <span class="hours">{{ member.hoursWorked }} hours</span>
                      </div>
                    }
                  </div>
                }
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Financial Section -->
        @if (hasFinancialData()) {
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>Financial Tracking</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="data-grid">
                @for (kpi of currentKpis(); track kpi.id) {
                  @if (kpi.laborCostToday !== undefined) {
                    <div class="data-item">
                      <span class="label">Labor Cost</span>
                      <span class="value">R{{ kpi.laborCostToday | number: '1.2-2' }}</span>
                    </div>
                  }
                  @if (kpi.materialCostToday !== undefined) {
                    <div class="data-item">
                      <span class="label">Material Cost</span>
                      <span class="value">R{{ kpi.materialCostToday | number: '1.2-2' }}</span>
                    </div>
                  }
                  @if (kpi.equipmentCostToday !== undefined) {
                    <div class="data-item">
                      <span class="label">Equipment Cost</span>
                      <span class="value">R{{ kpi.equipmentCostToday | number: '1.2-2' }}</span>
                    </div>
                  }
                  @if (kpi.totalCostToday !== undefined) {
                    <div class="data-item">
                      <span class="label">Total Cost</span>
                      <span class="value total">R{{ kpi.totalCostToday | number: '1.2-2' }}</span>
                    </div>
                  }
                  @if (kpi.productivityScore !== undefined) {
                    <div class="data-item">
                      <span class="label">Productivity Score</span>
                      <span
                        class="value"
                        [class.success]="kpi.productivityScore >= 80"
                        [class.warning]="kpi.productivityScore < 60"
                      >
                        {{ kpi.productivityScore }}%
                      </span>
                    </div>
                  }
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Comments & Risk Section -->
        @if (hasCommentsOrRisk()) {
          <mat-card class="section-card">
            <mat-card-header>
              <mat-card-title>Comments & Risk Assessment</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (kpi of currentKpis(); track kpi.id) {
                @if (kpi.riskFlag) {
                  <mat-chip color="warn" class="risk-chip">
                    <mat-icon>warning</mat-icon>
                    Risk Flag Active
                  </mat-chip>
                }
                @if (kpi.comments) {
                  <div class="comments-section">
                    <h4>Comments</h4>
                    <p>{{ kpi.comments }}</p>
                  </div>
                }
                @if (kpi.keyIssuesSummary) {
                  <div class="comments-section">
                    <h4>Key Issues Summary</h4>
                    <p>{{ kpi.keyIssuesSummary }}</p>
                  </div>
                }
                @if (kpi.weeklyReportDetails) {
                  <div class="comments-section">
                    <h4>Weekly Report Details</h4>
                    <p>{{ kpi.weeklyReportDetails }}</p>
                  </div>
                }
                @if (kpi.weeklyReportInsights) {
                  <div class="comments-section">
                    <h4>Weekly Report Insights</h4>
                    <p>{{ kpi.weeklyReportInsights }}</p>
                  </div>
                }
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Submission Info -->
        <mat-card class="section-card submission-info">
          <mat-card-content>
            @for (kpi of currentKpis(); track kpi.id) {
              <div class="info-row">
                <span
                  >Submitted by: <strong>{{ kpi.submittedByName || kpi.submittedBy }}</strong></span
                >
                <span>Date: {{ kpi.submittedAt | date: 'short' }}</span>
              </div>
            }
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card class="empty-state">
          <mat-card-content>
            <mat-icon class="empty-icon">assessment</mat-icon>
            <h3>No KPI data found</h3>
            <p>No submissions found for the selected date and project.</p>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .kpis-summary-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header-card,
      .filter-card,
      .info-card,
      .section-card {
        margin-bottom: 24px;
      }

      .filters-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        flex-wrap: wrap;
      }

      .filters-row mat-form-field {
        flex: 1;
        min-width: 200px;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px;
        gap: 16px;

        p {
          color: var(--mat-sys-on-surface-variant);
          margin: 0;
        }
      }

      .kpi-table {
        width: 100%;

        th,
        td {
          padding: 12px 16px !important;
        }

        .mat-column-metric {
          flex: 2;
          min-width: 200px;
        }

        .mat-column-today,
        .mat-column-total {
          flex: 1;
          min-width: 80px;
          text-align: right;
        }

        .mat-column-unit {
          flex: 0.5;
          min-width: 60px;
          text-align: center;
        }
      }

      .number-header {
        text-align: right !important;
      }

      .number-cell {
        text-align: right !important;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      .total-cell {
        color: var(--mat-sys-primary);
        font-weight: 600;
      }

      .data-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }

      .data-item {
        display: flex;
        flex-direction: column;
        padding: 12px;
        background: var(--mat-sys-surface-variant);
        border-radius: 8px;

        .label {
          font-size: 12px;
          color: var(--mat-sys-on-surface-variant);
          margin-bottom: 4px;
        }

        .value {
          font-size: 18px;
          font-weight: 600;
          color: var(--mat-sys-on-surface);

          &.success {
            color: var(--mat-sys-success);
          }

          &.warning {
            color: var(--mat-sys-warning);
          }

          &.error {
            color: var(--mat-sys-error);
          }

          &.total {
            color: var(--mat-sys-primary);
            font-size: 20px;
          }
        }
      }

      .team-members-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .team-member-card {
        display: flex;
        flex-direction: column;
        padding: 12px;
        background: var(--mat-sys-surface-variant);
        border-radius: 8px;

        strong {
          margin-bottom: 4px;
        }

        .role {
          font-size: 14px;
          color: var(--mat-sys-on-surface-variant);
        }

        .hours {
          font-size: 12px;
          color: var(--mat-sys-on-surface-variant);
          margin-top: 4px;
        }
      }

      .section-divider {
        margin: 24px 0;
      }

      h3 {
        margin: 16px 0 8px 0;
        color: var(--mat-sys-on-surface);
      }

      .risk-chip {
        margin-bottom: 16px;
      }

      .comments-section {
        margin-bottom: 16px;

        h4 {
          margin: 8px 0;
          color: var(--mat-sys-on-surface-variant);
          font-weight: 500;
        }

        p {
          margin: 0;
          white-space: pre-wrap;
        }
      }

      .submission-info {
        .info-row {
          display: flex;
          justify-content: space-between;
          color: var(--mat-sys-on-surface-variant);
        }
      }

      .empty-state {
        text-align: center;
        padding: 60px;

        .empty-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: var(--mat-sys-on-surface-variant);
          margin-bottom: 16px;
        }

        h3 {
          margin: 0 0 8px 0;
          color: var(--mat-sys-on-surface);
        }

        p {
          margin: 0;
          color: var(--mat-sys-on-surface-variant);
        }
      }

      .contractor-info {
        color: var(--mat-sys-secondary);
        font-weight: 500;
      }

      @media (max-width: 768px) {
        .filters-row {
          flex-direction: column;

          mat-form-field,
          button {
            width: 100%;
          }
        }

        .data-grid {
          grid-template-columns: 1fr;
        }

        .team-members-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DailyKpisSummaryComponent implements OnInit {
  private kpisService = inject(DailyKpisService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private weeklyReportGenerator = inject(WeeklyReportGeneratorService);
  private weeklyReportDocx = inject(WeeklyReportDocxService);

  // Form controls
  dateControl = new FormControl<Date>(new Date());
  startDateControl = new FormControl<Date>(new Date());
  endDateControl = new FormControl<Date>(new Date());
  projectControl = new FormControl<string>('');
  dateRangeMode = signal(false);

  // Signals
  projects = signal<Project[]>([]);
  dailySummary = signal<KPISummaryRow[]>([]);
  loadingDaily = signal(false);
  selectedContractorName = signal<string>('');
  currentKpis = signal<DailyKPIs[]>([]);

  // Table columns
  displayedColumns = ['metric', 'today', 'total', 'unit'];

  ngOnInit() {
    // Set initial date to today
    this.dateControl.setValue(new Date());
    this.startDateControl.setValue(new Date());
    this.endDateControl.setValue(new Date());

    // Watch for project selection changes and auto-load data
    this.projectControl.valueChanges.subscribe((projectId) => {
      if (projectId !== null && projectId !== undefined) {
        // Auto-load daily summary when project is selected
        this.loadDailySummary();
      }
    });

    // Load projects after setting up the subscription
    this.loadProjects();
  }

  private loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);

        // Auto-select louistest project if available
        const louistest = projects.find((p) => p.name.toLowerCase() === 'louistest');
        if (louistest && louistest.id) {
          this.projectControl.setValue(louistest.id);
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      },
    });
  }

  loadDailySummary() {
    this.loadingDaily.set(true);
    const projectId = this.projectControl.value;

    if (this.dateRangeMode()) {
      // Load for date range
      const startDate =
        this.startDateControl.value instanceof Date
          ? this.startDateControl.value
          : new Date(this.startDateControl.value || new Date());
      const endDate =
        this.endDateControl.value instanceof Date
          ? this.endDateControl.value
          : new Date(this.endDateControl.value || new Date());

      if (projectId) {
        // Load for specific project in date range
        this.kpisService.getKPIsByProjectAndDateRange(projectId, startDate, endDate).subscribe({
          next: (kpis) => {
            this.processDailyData(kpis);
            this.loadingDaily.set(false);
          },
          error: (error) => {
            console.error('Error loading daily KPIs:', error);
            this.loadingDaily.set(false);
            this.dailySummary.set([]);
          },
        });
      } else {
        // Load for all projects in date range
        const projects$ = this.projects().map((project) =>
          this.kpisService.getKPIsByProjectAndDateRange(project.id!, startDate, endDate),
        );

        combineLatest(projects$).subscribe({
          next: (allKpis) => {
            const mergedKpis = allKpis.flat();
            this.processDailyData(mergedKpis);
            this.loadingDaily.set(false);
          },
          error: (error) => {
            console.error('Error loading daily KPIs:', error);
            this.loadingDaily.set(false);
          },
        });
      }
    } else {
      // Load for single date
      const dateValue = this.dateControl.value;
      const selectedDate =
        dateValue instanceof Date ? dateValue : new Date(dateValue || new Date());

      if (projectId) {
        // Load for specific project
        this.kpisService.getKPIsByProjectAndDate(projectId, selectedDate).subscribe({
          next: (kpis) => {
            this.processDailyData(kpis);
            this.loadingDaily.set(false);
          },
          error: (error) => {
            console.error('Error loading daily KPIs:', error);
            this.loadingDaily.set(false);
            this.dailySummary.set([]);
          },
        });
      } else {
        // Load for all projects
        const projects$ = this.projects().map((project) =>
          this.kpisService.getKPIsByProjectAndDate(project.id!, selectedDate),
        );

        combineLatest(projects$).subscribe({
          next: (allKpis) => {
            const mergedKpis = allKpis.flat();
            this.processDailyData(mergedKpis);
            this.loadingDaily.set(false);
          },
          error: (error) => {
            console.error('Error loading daily KPIs:', error);
            this.loadingDaily.set(false);
          },
        });
      }
    }
  }

  private processDailyData(kpis: DailyKPIs[]) {
    const summaryRows: KPISummaryRow[] = [];

    if (!kpis || kpis.length === 0) {
      this.dailySummary.set([]);
      this.selectedContractorName.set('');
      this.currentKpis.set([]);
      return;
    }

    // Store the current KPIs
    this.currentKpis.set(kpis);

    // Extract contractor name if available
    const contractorNames = kpis
      .map((kpi) => kpi.contractorName)
      .filter((name) => name && name.trim() !== '');

    if (contractorNames.length > 0) {
      // If multiple contractors, join them
      const uniqueContractors = [...new Set(contractorNames)];
      this.selectedContractorName.set(uniqueContractors.join(', '));
    } else {
      this.selectedContractorName.set('');
    }

    // Aggregate data if multiple entries
    const aggregated = this.aggregateKPIs(kpis);

    // Create rows for each KPI
    KPI_DEFINITIONS.forEach((kpiDef) => {
      summaryRows.push({
        metric: kpiDef.label,
        today: aggregated[kpiDef.todayField] || 0,
        total: aggregated[kpiDef.totalField] || 0,
        unit: kpiDef.unit,
        category: kpiDef.category,
      });
    });

    // Add home-related KPIs if present
    if (aggregated['homeSignupsToday'] !== undefined) {
      summaryRows.push({
        metric: 'Home Signups',
        today: aggregated['homeSignupsToday'] || 0,
        total: aggregated['homeSignupsTotal'] || 0,
        unit: 'count',
        category: 'homes',
      });
    }
    if (aggregated['homeDropsToday'] !== undefined) {
      summaryRows.push({
        metric: 'Home Drops',
        today: aggregated['homeDropsToday'] || 0,
        total: aggregated['homeDropsTotal'] || 0,
        unit: 'count',
        category: 'homes',
      });
    }
    if (aggregated['homesConnectedToday'] !== undefined) {
      summaryRows.push({
        metric: 'Homes Connected',
        today: aggregated['homesConnectedToday'] || 0,
        total: aggregated['homesConnectedTotal'] || 0,
        unit: 'count',
        category: 'homes',
      });
    }

    this.dailySummary.set(summaryRows);
  }

  private aggregateKPIs(kpis: DailyKPIs[]): Record<string, number> {
    const result: Record<string, number> = {};

    if (this.dateRangeMode()) {
      // For date range, sum all daily values
      KPI_DEFINITIONS.forEach((kpiDef) => {
        result[kpiDef.todayField] = kpis.reduce(
          (sum, kpi) => sum + ((kpi[kpiDef.todayField as keyof DailyKPIs] as number) || 0),
          0,
        );
        // For totals in date range, calculate cumulative total
        result[kpiDef.totalField] = result[kpiDef.todayField];
      });

      // Add home-related fields
      result['homeSignupsToday'] = kpis.reduce(
        (sum, kpi) => sum + ((kpi.homeSignupsToday as number) || 0),
        0,
      );
      result['homeSignupsTotal'] = result['homeSignupsToday'];

      result['homeDropsToday'] = kpis.reduce(
        (sum, kpi) => sum + ((kpi.homeDropsToday as number) || 0),
        0,
      );
      result['homeDropsTotal'] = result['homeDropsToday'];

      result['homesConnectedToday'] = kpis.reduce(
        (sum, kpi) => sum + ((kpi.homesConnectedToday as number) || 0),
        0,
      );
      result['homesConnectedTotal'] = result['homesConnectedToday'];
    } else {
      // For single date, show today's values and max total
      KPI_DEFINITIONS.forEach((kpiDef) => {
        result[kpiDef.todayField] = kpis.reduce(
          (sum, kpi) => sum + ((kpi[kpiDef.todayField as keyof DailyKPIs] as number) || 0),
          0,
        );
        result[kpiDef.totalField] = Math.max(
          ...kpis.map((kpi) => (kpi[kpiDef.totalField as keyof DailyKPIs] as number) || 0),
          0,
        );
      });
    }

    return result;
  }

  selectedProjectName(): string {
    const projectId = this.projectControl.value;
    if (!projectId) return 'All Projects';

    const project = this.projects().find((p) => p.id === projectId);
    return project?.name || 'Unknown Project';
  }

  navigateToForm() {
    this.router.navigate(['/daily-progress/kpis']);
  }

  toggleDateRangeMode() {
    this.dateRangeMode.set(!this.dateRangeMode());
    // Reset dates when switching modes
    if (this.dateRangeMode()) {
      // Set start date to 7 days ago and end date to today
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      this.startDateControl.setValue(sevenDaysAgo);
      this.endDateControl.setValue(today);
    } else {
      // Set single date to today
      this.dateControl.setValue(new Date());
    }
  }

  // Helper methods to check if sections have data
  hasWeatherData(): boolean {
    return this.currentKpis().some(
      (kpi) => kpi.weatherConditions || kpi.weatherImpact !== undefined || kpi.temperatureRange,
    );
  }

  hasSafetyData(): boolean {
    return this.currentKpis().some(
      (kpi) =>
        kpi.safetyIncidents !== undefined ||
        kpi.nearMisses !== undefined ||
        kpi.toolboxTalks !== undefined ||
        kpi.safetyObservations !== undefined ||
        kpi.complianceScore !== undefined,
    );
  }

  hasQualityData(): boolean {
    return this.currentKpis().some(
      (kpi) =>
        kpi.qualityIssues !== undefined ||
        kpi.reworkRequired !== undefined ||
        kpi.inspectionsPassed !== undefined ||
        kpi.inspectionsFailed !== undefined,
    );
  }

  hasResourceData(): boolean {
    return this.currentKpis().some(
      (kpi) =>
        kpi.teamSize !== undefined ||
        kpi.regularHours !== undefined ||
        kpi.overtimeHours !== undefined ||
        kpi.equipmentUtilization !== undefined ||
        kpi.vehiclesUsed !== undefined ||
        (kpi.teamMembers && kpi.teamMembers.length > 0),
    );
  }

  hasFinancialData(): boolean {
    return this.currentKpis().some(
      (kpi) =>
        kpi.laborCostToday !== undefined ||
        kpi.materialCostToday !== undefined ||
        kpi.equipmentCostToday !== undefined ||
        kpi.totalCostToday !== undefined ||
        kpi.productivityScore !== undefined,
    );
  }

  hasCommentsOrRisk(): boolean {
    return this.currentKpis().some(
      (kpi) =>
        kpi.riskFlag ||
        kpi.comments ||
        kpi.keyIssuesSummary ||
        kpi.weeklyReportDetails ||
        kpi.weeklyReportInsights,
    );
  }

  // Export methods
  exportPDF() {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('KPI SUMMARY REPORT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Project and Date Info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const dateText = this.dateRangeMode()
        ? `${this.startDateControl.value?.toLocaleDateString()} - ${this.endDateControl.value?.toLocaleDateString()}`
        : this.dateControl.value?.toLocaleDateString() || '';
      doc.text(`Project: ${this.selectedProjectName()}`, 20, yPosition);
      doc.text(`Date: ${dateText}`, pageWidth / 2, yPosition);
      yPosition += 10;

      if (this.selectedContractorName()) {
        doc.text(`Contractor: ${this.selectedContractorName()}`, 20, yPosition);
        yPosition += 10;
      }

      // Core KPIs Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Core Activities', 20, yPosition);
      yPosition += 5;

      const kpiData = this.dailySummary().map((row) => [
        row.metric,
        row.today.toString(),
        row.total.toString(),
        row.unit,
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Today', 'Total', 'Unit']],
        body: kpiData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Add enhanced data sections if available
      const kpis = this.currentKpis();
      if (kpis.length > 0) {
        const firstKpi = kpis[0];

        // Weather Section
        if (this.hasWeatherData()) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Weather & Environmental', 20, yPosition);
          yPosition += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);

          if (firstKpi.weatherConditions) {
            doc.text(`Weather: ${firstKpi.weatherConditions}`, 25, yPosition);
            yPosition += 5;
          }
          if (firstKpi.weatherImpact !== undefined) {
            doc.text(`Weather Impact: ${firstKpi.weatherImpact}/10`, 25, yPosition);
            yPosition += 5;
          }
          if (firstKpi.temperatureRange) {
            doc.text(
              `Temperature: ${firstKpi.temperatureRange.min}°C - ${firstKpi.temperatureRange.max}°C`,
              25,
              yPosition,
            );
            yPosition += 5;
          }
          yPosition += 5;
        }

        // Safety Section
        if (this.hasSafetyData()) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Safety & Compliance', 20, yPosition);
          yPosition += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);

          const safetyData = [];
          if (firstKpi.safetyIncidents !== undefined) {
            safetyData.push(['Safety Incidents', firstKpi.safetyIncidents.toString()]);
          }
          if (firstKpi.nearMisses !== undefined) {
            safetyData.push(['Near Misses', firstKpi.nearMisses.toString()]);
          }
          if (firstKpi.toolboxTalks !== undefined) {
            safetyData.push(['Toolbox Talks', firstKpi.toolboxTalks.toString()]);
          }
          if (firstKpi.complianceScore !== undefined) {
            safetyData.push(['Compliance Score', `${firstKpi.complianceScore}%`]);
          }

          if (safetyData.length > 0) {
            autoTable(doc, {
              startY: yPosition,
              body: safetyData,
              theme: 'plain',
              styles: { fontSize: 9 },
              columnStyles: { 0: { cellWidth: 60 } },
            });
            yPosition = (doc as any).lastAutoTable.finalY + 10;
          }
        }

        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Financial Section
        if (this.hasFinancialData()) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Financial Tracking', 20, yPosition);
          yPosition += 5;

          const financialData = [];
          if (firstKpi.laborCostToday !== undefined) {
            financialData.push(['Labor Cost', `R${firstKpi.laborCostToday.toFixed(2)}`]);
          }
          if (firstKpi.materialCostToday !== undefined) {
            financialData.push(['Material Cost', `R${firstKpi.materialCostToday.toFixed(2)}`]);
          }
          if (firstKpi.equipmentCostToday !== undefined) {
            financialData.push(['Equipment Cost', `R${firstKpi.equipmentCostToday.toFixed(2)}`]);
          }
          if (firstKpi.totalCostToday !== undefined) {
            financialData.push(['Total Cost', `R${firstKpi.totalCostToday.toFixed(2)}`]);
          }

          if (financialData.length > 0) {
            autoTable(doc, {
              startY: yPosition,
              body: financialData,
              theme: 'plain',
              styles: { fontSize: 9 },
              columnStyles: { 0: { cellWidth: 60 } },
            });
            yPosition = (doc as any).lastAutoTable.finalY + 10;
          }
        }

        // Comments Section
        if (firstKpi.comments || firstKpi.keyIssuesSummary) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Comments & Notes', 20, yPosition);
          yPosition += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);

          if (firstKpi.comments) {
            const lines = doc.splitTextToSize(firstKpi.comments, pageWidth - 40);
            doc.text(lines, 25, yPosition);
            yPosition += lines.length * 5 + 5;
          }
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        20,
        doc.internal.pageSize.getHeight() - 10,
      );

      // Save the PDF
      const filename = `KPI_Summary_${this.selectedProjectName()}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      this.snackBar.open('PDF exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.snackBar.open('Error generating PDF', 'Close', { duration: 3000 });
    }
  }

  exportExcel() {
    try {
      const workbook = XLSX.utils.book_new();

      // Core KPIs Sheet
      const coreData = [
        ['KPI Summary Report'],
        [`Project: ${this.selectedProjectName()}`],
        [`Date: ${this.getDateRangeText()}`],
        [`Contractor: ${this.selectedContractorName() || 'N/A'}`],
        [],
        ['Metric', 'Today', 'Total', 'Unit'],
        ...this.dailySummary().map((row) => [row.metric, row.today, row.total, row.unit]),
      ];

      const coreSheet = XLSX.utils.aoa_to_sheet(coreData);
      XLSX.utils.book_append_sheet(workbook, coreSheet, 'Core KPIs');

      // Enhanced Data Sheet
      const kpis = this.currentKpis();
      if (kpis.length > 0) {
        const enhancedData: any[][] = [['Enhanced KPI Data'], []];

        kpis.forEach((kpi, index) => {
          if (index > 0) enhancedData.push([]);

          enhancedData.push([`Entry ${index + 1} - ${new Date(kpi.date).toLocaleDateString()}`]);

          // Weather Data
          if (this.hasWeatherData()) {
            enhancedData.push(['Weather & Environmental']);
            if (kpi.weatherConditions) enhancedData.push(['Weather', kpi.weatherConditions]);
            if (kpi.weatherImpact !== undefined)
              enhancedData.push(['Weather Impact', kpi.weatherImpact]);
            if (kpi.temperatureRange) {
              enhancedData.push(['Temperature Min', kpi.temperatureRange.min]);
              enhancedData.push(['Temperature Max', kpi.temperatureRange.max]);
            }
          }

          // Safety Data
          if (this.hasSafetyData()) {
            enhancedData.push([], ['Safety & Compliance']);
            if (kpi.safetyIncidents !== undefined)
              enhancedData.push(['Safety Incidents', kpi.safetyIncidents]);
            if (kpi.nearMisses !== undefined) enhancedData.push(['Near Misses', kpi.nearMisses]);
            if (kpi.toolboxTalks !== undefined)
              enhancedData.push(['Toolbox Talks', kpi.toolboxTalks]);
            if (kpi.safetyObservations !== undefined)
              enhancedData.push(['Safety Observations', kpi.safetyObservations]);
            if (kpi.complianceScore !== undefined)
              enhancedData.push(['Compliance Score (%)', kpi.complianceScore]);
          }

          // Quality Data
          if (this.hasQualityData()) {
            enhancedData.push([], ['Quality Metrics']);
            if (kpi.qualityIssues !== undefined)
              enhancedData.push(['Quality Issues', kpi.qualityIssues]);
            if (kpi.reworkRequired !== undefined)
              enhancedData.push(['Rework Required', kpi.reworkRequired]);
            if (kpi.inspectionsPassed !== undefined)
              enhancedData.push(['Inspections Passed', kpi.inspectionsPassed]);
            if (kpi.inspectionsFailed !== undefined)
              enhancedData.push(['Inspections Failed', kpi.inspectionsFailed]);
          }

          // Resources Data
          if (this.hasResourceData()) {
            enhancedData.push([], ['Resources & Team']);
            if (kpi.teamSize !== undefined) enhancedData.push(['Team Size', kpi.teamSize]);
            if (kpi.regularHours !== undefined)
              enhancedData.push(['Regular Hours', kpi.regularHours]);
            if (kpi.overtimeHours !== undefined)
              enhancedData.push(['Overtime Hours', kpi.overtimeHours]);
            if (kpi.equipmentUtilization !== undefined)
              enhancedData.push(['Equipment Utilization (%)', kpi.equipmentUtilization]);
            if (kpi.vehiclesUsed !== undefined)
              enhancedData.push(['Vehicles Used', kpi.vehiclesUsed]);
          }

          // Financial Data
          if (this.hasFinancialData()) {
            enhancedData.push([], ['Financial Tracking']);
            if (kpi.laborCostToday !== undefined)
              enhancedData.push(['Labor Cost', kpi.laborCostToday]);
            if (kpi.materialCostToday !== undefined)
              enhancedData.push(['Material Cost', kpi.materialCostToday]);
            if (kpi.equipmentCostToday !== undefined)
              enhancedData.push(['Equipment Cost', kpi.equipmentCostToday]);
            if (kpi.totalCostToday !== undefined)
              enhancedData.push(['Total Cost', kpi.totalCostToday]);
            if (kpi.productivityScore !== undefined)
              enhancedData.push(['Productivity Score (%)', kpi.productivityScore]);
          }

          // Comments
          if (kpi.comments) {
            enhancedData.push([], ['Comments'], [kpi.comments]);
          }
        });

        const enhancedSheet = XLSX.utils.aoa_to_sheet(enhancedData);
        XLSX.utils.book_append_sheet(workbook, enhancedSheet, 'Enhanced Data');

        // Team Members Sheet
        const teamData: any[][] = [['Team Members'], ['Date', 'Name', 'Role', 'Hours Worked']];
        kpis.forEach((kpi) => {
          if (kpi.teamMembers && kpi.teamMembers.length > 0) {
            kpi.teamMembers.forEach((member) => {
              teamData.push([
                new Date(kpi.date).toLocaleDateString(),
                member.name,
                member.role,
                member.hoursWorked,
              ]);
            });
          }
        });

        if (teamData.length > 2) {
          const teamSheet = XLSX.utils.aoa_to_sheet(teamData);
          XLSX.utils.book_append_sheet(workbook, teamSheet, 'Team Members');
        }
      }

      // Generate filename and save
      const filename = `KPI_Summary_${this.selectedProjectName()}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      this.snackBar.open('Excel exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error generating Excel:', error);
      this.snackBar.open('Error generating Excel', 'Close', { duration: 3000 });
    }
  }

  exportCSV() {
    try {
      const csvData: string[] = [];

      // Header
      csvData.push(`KPI Summary Report`);
      csvData.push(`Project: ${this.selectedProjectName()}`);
      csvData.push(`Date: ${this.getDateRangeText()}`);
      csvData.push(`Contractor: ${this.selectedContractorName() || 'N/A'}`);
      csvData.push('');

      // Core KPIs
      csvData.push('Metric,Today,Total,Unit');
      this.dailySummary().forEach((row) => {
        csvData.push(`${row.metric},${row.today},${row.total},${row.unit}`);
      });

      // Enhanced data
      const kpis = this.currentKpis();
      if (
        kpis.length > 0 &&
        (this.hasWeatherData() || this.hasSafetyData() || this.hasFinancialData())
      ) {
        csvData.push('');
        csvData.push('Enhanced Data');

        kpis.forEach((kpi, index) => {
          csvData.push('');
          csvData.push(`Entry ${index + 1} - ${new Date(kpi.date).toLocaleDateString()}`);

          if (kpi.weatherConditions) csvData.push(`Weather,${kpi.weatherConditions}`);
          if (kpi.weatherImpact !== undefined)
            csvData.push(`Weather Impact,${kpi.weatherImpact}/10`);
          if (kpi.safetyIncidents !== undefined)
            csvData.push(`Safety Incidents,${kpi.safetyIncidents}`);
          if (kpi.complianceScore !== undefined)
            csvData.push(`Compliance Score,${kpi.complianceScore}%`);
          if (kpi.totalCostToday !== undefined)
            csvData.push(`Total Cost Today,R${kpi.totalCostToday}`);
          if (kpi.productivityScore !== undefined)
            csvData.push(`Productivity Score,${kpi.productivityScore}%`);
        });
      }

      // Create and download CSV
      const csvContent = csvData.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `KPI_Summary_${this.selectedProjectName()}_${new Date().toISOString().split('T')[0]}.csv`,
      );
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.snackBar.open('CSV exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error generating CSV:', error);
      this.snackBar.open('Error generating CSV', 'Close', { duration: 3000 });
    }
  }

  async generateWeeklyReport() {
    try {
      console.log('Starting weekly report generation...');

      // Get the selected project
      const projectId = this.projectControl.value;
      console.log('Selected project ID:', projectId);

      if (!projectId) {
        this.snackBar.open('Please select a project', 'Close', { duration: 3000 });
        return;
      }

      // Get the selected project details
      const project = this.projects().find((p) => p.id === projectId);
      console.log('Found project:', project);

      if (!project) {
        this.snackBar.open('Project not found', 'Close', { duration: 3000 });
        return;
      }

      // Calculate the week range (last 7 days from selected date)
      let endDate: Date;
      if (this.dateRangeMode()) {
        endDate = this.endDateControl.value || new Date();
      } else {
        endDate = this.dateControl.value || new Date();
      }

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6); // 7 days including end date

      console.log('Date range:', startDate, 'to', endDate);

      // Open the preview dialog with loading state
      const dialogRef = this.dialog.open(WeeklyReportPreviewComponent, {
        width: '90%',
        maxWidth: '1200px',
        height: '90%',
        data: {},
      });

      // Set loading state
      dialogRef.componentInstance.loading = true;

      try {
        // Just fetch the raw KPI data
        console.log('Fetching KPI data...');
        const kpis = await firstValueFrom(
          this.kpisService.getKPIsForDateRange(projectId, startDate, endDate),
        );

        console.log('KPIs fetched:', kpis.length, 'records');

        if (kpis && kpis.length > 0) {
          // Update dialog with raw data
          dialogRef.componentInstance.loading = false;
          dialogRef.componentInstance.rawKpis = kpis;
          dialogRef.componentInstance.project = project;
          dialogRef.componentInstance.dateRange = { start: startDate, end: endDate };
        } else {
          throw new Error('No data found for the selected date range');
        }
      } catch (error) {
        console.error('Error fetching KPI data:', error);
        dialogRef.close();
        this.snackBar.open(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'Close',
          { duration: 5000 },
        );
      }

      // Handle dialog close
      dialogRef.componentInstance.close.subscribe(() => {
        dialogRef.close();
      });
    } catch (error) {
      console.error('Error in weekly report generation:', error);
      this.snackBar.open(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'Close',
        { duration: 5000 },
      );
    }
  }

  private getDateRangeText(): string {
    if (this.dateRangeMode()) {
      return `${this.startDateControl.value?.toLocaleDateString()} - ${this.endDateControl.value?.toLocaleDateString()}`;
    }
    return this.dateControl.value?.toLocaleDateString() || '';
  }
}
