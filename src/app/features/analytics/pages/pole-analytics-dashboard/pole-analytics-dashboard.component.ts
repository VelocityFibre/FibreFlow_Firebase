import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { 
  PoleAnalyticsService, 
  PoleAnalytics, 
  ContractorStats, 
  ProjectStats,
  PoleFilter,
  PlannedPoleStatus 
} from '@app/core/services/pole-analytics.service';
import { ProjectService } from '@app/core/services/project.service';
import { ContractorService } from '@app/features/contractors/services/contractor.service';
import { Project } from '@app/core/models/project.model';
import { Contractor } from '@app/features/contractors/models/contractor.model';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns';

@Component({
  selector: 'app-pole-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTabsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  template: `
    <div class=\"analytics-container\">
      <!-- Header -->
      <div class=\"header\">
        <h1>Pole Analytics Dashboard</h1>
        <div class=\"header-actions\">
          <button mat-raised-button color=\"primary\" (click)=\"exportData()\">
            <mat-icon>download</mat-icon>
            Export Data
          </button>
          <button mat-raised-button (click)=\"refreshData()\">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <!-- Filters -->
      <mat-card class=\"filters-card\">
        <mat-card-header>
          <mat-card-title>Filters</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]=\"filterForm\" class=\"filter-form\">
            <!-- Project Filter -->
            <mat-form-field appearance=\"outline\">
              <mat-label>Projects</mat-label>
              <mat-select formControlName=\"projectIds\" multiple>
                @for (project of projects(); track project.id) {
                  <mat-option [value]=\"project.id\">{{ project.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <!-- Contractor Filter -->
            <mat-form-field appearance=\"outline\">
              <mat-label>Contractors</mat-label>
              <mat-select formControlName=\"contractorIds\" multiple>
                @for (contractor of contractors(); track contractor.id) {
                  <mat-option [value]=\"contractor.id\">{{ contractor.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <!-- Status Filter -->
            <mat-form-field appearance=\"outline\">
              <mat-label>Status</mat-label>
              <mat-select formControlName=\"statuses\" multiple>
                <mat-option value=\"planned\">Planned</mat-option>
                <mat-option value=\"assigned\">Assigned</mat-option>
                <mat-option value=\"in_progress\">In Progress</mat-option>
                <mat-option value=\"installed\">Installed</mat-option>
                <mat-option value=\"verified\">Verified</mat-option>
                <mat-option value=\"rejected\">Rejected</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Date Range -->
            <mat-form-field appearance=\"outline\">
              <mat-label>Date Range</mat-label>
              <mat-date-range-input [rangePicker]=\"picker\">
                <input matStartDate formControlName=\"startDate\" placeholder=\"Start date\">
                <input matEndDate formControlName=\"endDate\" placeholder=\"End date\">
              </mat-date-range-input>
              <mat-datepicker-toggle matIconSuffix [for]=\"picker\"></mat-datepicker-toggle>
              <mat-date-range-picker #picker></mat-date-range-picker>
            </mat-form-field>

            <!-- Quick Date Filters -->
            <div class=\"quick-filters\">
              <button mat-stroked-button (click)=\"setToday()\">Today</button>
              <button mat-stroked-button (click)=\"setThisWeek()\">This Week</button>
              <button mat-stroked-button (click)=\"setThisMonth()\">This Month</button>
              <button mat-stroked-button (click)=\"setLast30Days()\">Last 30 Days</button>
            </div>

            <button mat-raised-button color=\"primary\" (click)=\"applyFilters()\">
              Apply Filters
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <mat-card class=\"loading-card\">
          <mat-card-content>
            <mat-progress-bar mode=\"indeterminate\"></mat-progress-bar>
            <p>Loading analytics data...</p>
          </mat-card-content>
        </mat-card>
      } @else if (analytics()) {
        <!-- Summary Cards -->
        <div class=\"summary-cards\">
          <mat-card class=\"summary-card\">
            <mat-card-content>
              <div class=\"metric\">
                <span class=\"value\">{{ analytics()!.totalPoles }}</span>
                <span class=\"label\">Total Poles</span>
              </div>
              <mat-icon class=\"icon\">cell_tower</mat-icon>
            </mat-card-content>
          </mat-card>

          <mat-card class=\"summary-card\">
            <mat-card-content>
              <div class=\"metric\">
                <span class=\"value\">{{ analytics()!.installationProgress.completionPercentage.toFixed(1) }}%</span>
                <span class=\"label\">Completion</span>
              </div>
              <mat-progress-bar [value]=\"analytics()!.installationProgress.completionPercentage\"></mat-progress-bar>
            </mat-card-content>
          </mat-card>

          <mat-card class=\"summary-card\">
            <mat-card-content>
              <div class=\"metric\">
                <span class=\"value\">{{ analytics()!.dailyStats.polesInstalled }}</span>
                <span class=\"label\">Installed Today</span>
              </div>
              <mat-icon class=\"icon\" color=\"primary\">today</mat-icon>
            </mat-card-content>
          </mat-card>

          <mat-card class=\"summary-card\">
            <mat-card-content>
              <div class=\"metric\">
                <span class=\"value\">{{ analytics()!.productivityMetrics.averagePolesPerDay.toFixed(1) }}</span>
                <span class=\"label\">Avg Per Day</span>
              </div>
              <mat-icon class=\"icon\" color=\"accent\">trending_up</mat-icon>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Main Analytics Tabs -->
        <mat-card class=\"analytics-tabs-card\">
          <mat-card-content>
            <mat-tab-group>
              <!-- Status Overview Tab -->
              <mat-tab label=\"Status Overview\">
                <div class=\"tab-content\">
                  <h3>Pole Status Distribution</h3>
                  <table mat-table [dataSource]=\"statusDataSource()\" class=\"status-table\">
                    <ng-container matColumnDef=\"status\">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef=\"let row\">
                        <mat-chip [color]=\"getStatusColor(row.status)\">
                          {{ row.status | titlecase }}
                        </mat-chip>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef=\"count\">
                      <th mat-header-cell *matHeaderCellDef>Count</th>
                      <td mat-cell *matCellDef=\"let row\">{{ row.count }}</td>
                    </ng-container>

                    <ng-container matColumnDef=\"percentage\">
                      <th mat-header-cell *matHeaderCellDef>Percentage</th>
                      <td mat-cell *matCellDef=\"let row\">{{ row.percentage.toFixed(1) }}%</td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef=\"statusColumns\"></tr>
                    <tr mat-row *matRowDef=\"let row; columns: statusColumns\"></tr>
                  </table>

                  <h3>Installation Progress</h3>
                  <div class=\"progress-info\">
                    <div class=\"progress-item\">
                      <strong>Target:</strong> {{ analytics()!.installationProgress.totalTarget }} poles
                    </div>
                    <div class=\"progress-item\">
                      <strong>Completed:</strong> {{ analytics()!.installationProgress.completed }} poles
                    </div>
                    <div class=\"progress-item\">
                      <strong>Remaining:</strong> {{ analytics()!.installationProgress.remaining }} poles
                    </div>
                    @if (analytics()!.installationProgress.projectedCompletionDate) {
                      <div class=\"progress-item\">
                        <strong>Projected Completion:</strong> 
                        {{ analytics()!.installationProgress.projectedCompletionDate | date:'mediumDate' }}
                      </div>
                    }
                  </div>
                </div>
              </mat-tab>

              <!-- Contractor Performance Tab -->
              <mat-tab label=\"Contractor Performance\">
                <div class=\"tab-content\">
                  <h3>Contractor Statistics</h3>
                  <table mat-table [dataSource]=\"analytics()!.contractorStats\" class=\"contractor-table\">
                    <ng-container matColumnDef=\"contractorName\">
                      <th mat-header-cell *matHeaderCellDef>Contractor</th>
                      <td mat-cell *matCellDef=\"let contractor\">{{ contractor.contractorName }}</td>
                    </ng-container>

                    <ng-container matColumnDef=\"totalAssigned\">
                      <th mat-header-cell *matHeaderCellDef>Assigned</th>
                      <td mat-cell *matCellDef=\"let contractor\">{{ contractor.totalAssigned }}</td>
                    </ng-container>

                    <ng-container matColumnDef=\"totalCompleted\">
                      <th mat-header-cell *matHeaderCellDef>Completed</th>
                      <td mat-cell *matCellDef=\"let contractor\">{{ contractor.totalCompleted }}</td>
                    </ng-container>

                    <ng-container matColumnDef=\"completionRate\">
                      <th mat-header-cell *matHeaderCellDef>Completion %</th>
                      <td mat-cell *matCellDef=\"let contractor\">
                        <span [class.good]=\"contractor.completionRate >= 80\"
                              [class.warning]=\"contractor.completionRate >= 50 && contractor.completionRate < 80\"
                              [class.poor]=\"contractor.completionRate < 50\">
                          {{ contractor.completionRate.toFixed(1) }}%
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef=\"currentActiveAssignments\">
                      <th mat-header-cell *matHeaderCellDef>Active</th>
                      <td mat-cell *matCellDef=\"let contractor\">{{ contractor.currentActiveAssignments }}</td>
                    </ng-container>

                    <ng-container matColumnDef=\"lastActivityDate\">
                      <th mat-header-cell *matHeaderCellDef>Last Activity</th>
                      <td mat-cell *matCellDef=\"let contractor\">
                        {{ contractor.lastActivityDate | date:'short' }}
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef=\"contractorColumns\"></tr>
                    <tr mat-row *matRowDef=\"let row; columns: contractorColumns\"></tr>
                  </table>
                </div>
              </mat-tab>

              <!-- Project Progress Tab -->
              <mat-tab label=\"Project Progress\">
                <div class=\"tab-content\">
                  <h3>Project Statistics</h3>
                  <table mat-table [dataSource]=\"analytics()!.projectStats\" class=\"project-table\">
                    <ng-container matColumnDef=\"projectName\">
                      <th mat-header-cell *matHeaderCellDef>Project</th>
                      <td mat-cell *matCellDef=\"let project\">
                        {{ project.projectName }}
                        <br>
                        <small class=\"project-code\">{{ project.projectCode }}</small>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef=\"totalPoles\">
                      <th mat-header-cell *matHeaderCellDef>Total</th>
                      <td mat-cell *matCellDef=\"let project\">{{ project.totalPoles }}</td>
                    </ng-container>

                    <ng-container matColumnDef=\"installedPoles\">
                      <th mat-header-cell *matHeaderCellDef>Installed</th>
                      <td mat-cell *matCellDef=\"let project\">{{ project.installedPoles }}</td>
                    </ng-container>

                    <ng-container matColumnDef=\"progressPercentage\">
                      <th mat-header-cell *matHeaderCellDef>Progress</th>
                      <td mat-cell *matCellDef=\"let project\">
                        <div class=\"progress-cell\">
                          <mat-progress-bar [value]=\"project.progressPercentage\" mode=\"determinate\"></mat-progress-bar>
                          <span>{{ project.progressPercentage.toFixed(1) }}%</span>
                        </div>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef=\"projectColumns\"></tr>
                    <tr mat-row *matRowDef=\"let row; columns: projectColumns\"></tr>
                  </table>
                </div>
              </mat-tab>

              <!-- Quality Metrics Tab -->
              <mat-tab label=\"Quality Metrics\">
                <div class=\"tab-content\">
                  <h3>Quality Overview</h3>
                  <div class=\"quality-metrics\">
                    <mat-card class=\"metric-card\">
                      <mat-card-content>
                        <div class=\"quality-score\" [class.good]=\"analytics()!.qualityMetrics.overallQualityScore >= 80\"
                                                    [class.warning]=\"analytics()!.qualityMetrics.overallQualityScore >= 60 && analytics()!.qualityMetrics.overallQualityScore < 80\"
                                                    [class.poor]=\"analytics()!.qualityMetrics.overallQualityScore < 60\">
                          <span class=\"score-value\">{{ analytics()!.qualityMetrics.overallQualityScore.toFixed(0) }}</span>
                          <span class=\"score-label\">Overall Quality Score</span>
                        </div>
                      </mat-card-content>
                    </mat-card>

                    <div class=\"quality-details\">
                      <div class=\"quality-item\">
                        <mat-icon>photo_camera</mat-icon>
                        <div class=\"quality-info\">
                          <span class=\"label\">Photo Completion</span>
                          <span class=\"value\">{{ analytics()!.qualityMetrics.photoCompletionRate.toFixed(1) }}%</span>
                        </div>
                      </div>

                      <div class=\"quality-item\">
                        <mat-icon>location_on</mat-icon>
                        <div class=\"quality-info\">
                          <span class=\"label\">Location Accuracy</span>
                          <span class=\"value\">{{ analytics()!.qualityMetrics.locationAccuracyRate.toFixed(1) }}%</span>
                        </div>
                      </div>

                      <div class=\"quality-item\">
                        <mat-icon>check_circle</mat-icon>
                        <div class=\"quality-info\">
                          <span class=\"label\">First Time Approval</span>
                          <span class=\"value\">{{ analytics()!.qualityMetrics.firstTimeApprovalRate.toFixed(1) }}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  @if (analytics()!.qualityMetrics.averageRejectionReasons.length > 0) {
                    <h3>Common Rejection Reasons</h3>
                    <div class=\"rejection-reasons\">
                      @for (reason of analytics()!.qualityMetrics.averageRejectionReasons; track reason.reason) {
                        <mat-chip-set>
                          <mat-chip>{{ reason.reason }}: {{ reason.count }}</mat-chip>
                        </mat-chip-set>
                      }
                    </div>
                  }
                </div>
              </mat-tab>

              <!-- Time Analysis Tab -->
              <mat-tab label=\"Time Analysis\">
                <div class=\"tab-content\">
                  <h3>Daily Statistics</h3>
                  <div class=\"time-stats\">
                    <mat-card class=\"stat-card\">
                      <mat-card-content>
                        <h4>Today ({{ analytics()!.dailyStats.date | date:'mediumDate' }})</h4>
                        <div class=\"stat-grid\">
                          <div class=\"stat-item\">
                            <span class=\"label\">Installed</span>
                            <span class=\"value\">{{ analytics()!.dailyStats.polesInstalled }}</span>
                          </div>
                          <div class=\"stat-item\">
                            <span class=\"label\">Verified</span>
                            <span class=\"value\">{{ analytics()!.dailyStats.polesVerified }}</span>
                          </div>
                          <div class=\"stat-item\">
                            <span class=\"label\">Rejected</span>
                            <span class=\"value warn\">{{ analytics()!.dailyStats.polesRejected }}</span>
                          </div>
                          <div class=\"stat-item\">
                            <span class=\"label\">New Assignments</span>
                            <span class=\"value\">{{ analytics()!.dailyStats.newAssignments }}</span>
                          </div>
                        </div>
                      </mat-card-content>
                    </mat-card>

                    <mat-card class=\"stat-card\">
                      <mat-card-content>
                        <h4>This Week</h4>
                        <div class=\"stat-grid\">
                          <div class=\"stat-item\">
                            <span class=\"label\">Total Installed</span>
                            <span class=\"value\">{{ analytics()!.weeklyStats.totalInstalled }}</span>
                          </div>
                          <div class=\"stat-item\">
                            <span class=\"label\">Daily Average</span>
                            <span class=\"value\">{{ analytics()!.weeklyStats.dailyAverage.toFixed(1) }}</span>
                          </div>
                          <div class=\"stat-item\">
                            <span class=\"label\">Top Contractor</span>
                            <span class=\"value small\">{{ analytics()!.weeklyStats.topContractor }}</span>
                          </div>
                          <div class=\"stat-item\">
                            <span class=\"label\">Top Project</span>
                            <span class=\"value small\">{{ analytics()!.weeklyStats.topProject }}</span>
                          </div>
                        </div>
                      </mat-card-content>
                    </mat-card>

                    <mat-card class=\"stat-card\">
                      <mat-card-content>
                        <h4>{{ analytics()!.monthlyStats.month }} {{ analytics()!.monthlyStats.year }}</h4>
                        <div class=\"stat-grid\">
                          <div class=\"stat-item\">
                            <span class=\"label\">Installed</span>
                            <span class=\"value\">{{ analytics()!.monthlyStats.totalInstalled }}</span>
                          </div>
                          <div class=\"stat-item\">
                            <span class=\"label\">Verified</span>
                            <span class=\"value\">{{ analytics()!.monthlyStats.totalVerified }}</span>
                          </div>
                          <div class=\"stat-item\">
                            <span class=\"label\">Rejection Rate</span>
                            <span class=\"value\" [class.warn]=\"analytics()!.monthlyStats.rejectionRate > 10\">
                              {{ analytics()!.monthlyStats.rejectionRate.toFixed(1) }}%
                            </span>
                          </div>
                          <div class=\"stat-item\">
                            <span class=\"label\">Growth</span>
                            <span class=\"value\" [class.good]=\"analytics()!.monthlyStats.growthRate > 0\"
                                                [class.warn]=\"analytics()!.monthlyStats.growthRate < 0\">
                              {{ analytics()!.monthlyStats.growthRate > 0 ? '+' : '' }}{{ analytics()!.monthlyStats.growthRate.toFixed(1) }}%
                            </span>
                          </div>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  </div>

                  <h3>Productivity Trends</h3>
                  <div class=\"productivity-info\">
                    <div class=\"trend-item\">
                      <mat-icon [color]=\"getProductivityTrendColor()\">
                        {{ getProductivityTrendIcon() }}
                      </mat-icon>
                      <span>Productivity is {{ analytics()!.productivityMetrics.productivityTrend }}</span>
                    </div>
                    <div class=\"trend-item\">
                      <mat-icon>flag</mat-icon>
                      <span>Peak day: {{ analytics()!.productivityMetrics.peakProductivityDay.date | date:'mediumDate' }} 
                            ({{ analytics()!.productivityMetrics.peakProductivityDay.count }} poles)</span>
                    </div>
                    @if (analytics()!.productivityMetrics.estimatedDaysToCompletion > 0) {
                      <div class=\"trend-item\">
                        <mat-icon>schedule</mat-icon>
                        <span>Estimated {{ analytics()!.productivityMetrics.estimatedDaysToCompletion }} days to completion</span>
                      </div>
                    }
                  </div>
                </div>
              </mat-tab>

              <!-- API Export Tab -->
              <mat-tab label=\"API Data\">
                <div class=\"tab-content\">
                  <h3>API Endpoint Data</h3>
                  <p>This is the data structure that can be used by Lew's team via API:</p>
                  
                  <div class=\"api-controls\">
                    <button mat-raised-button (click)=\"copyApiUrl()\">
                      <mat-icon>content_copy</mat-icon>
                      Copy API URL
                    </button>
                    <button mat-raised-button (click)=\"copyJsonData()\">
                      <mat-icon>code</mat-icon>
                      Copy JSON Data
                    </button>
                    <button mat-raised-button color=\"primary\" (click)=\"downloadJson()\">
                      <mat-icon>download</mat-icon>
                      Download JSON
                    </button>
                  </div>

                  <mat-card class=\"json-preview\">
                    <mat-card-content>
                      <pre>{{ getJsonPreview() }}</pre>
                    </mat-card-content>
                  </mat-card>
                </div>
              </mat-tab>
            </mat-tab-group>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .analytics-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 500;
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }
    }

    .filters-card {
      margin-bottom: 24px;

      .filter-form {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        flex-wrap: wrap;

        mat-form-field {
          min-width: 200px;
        }
      }

      .quick-filters {
        display: flex;
        gap: 8px;
        align-items: center;
      }
    }

    .loading-card {
      text-align: center;
      padding: 48px;

      p {
        margin-top: 16px;
        color: var(--mat-sys-outline);
      }
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      mat-card-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
      }

      .metric {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .value {
          font-size: 32px;
          font-weight: 500;
          color: var(--mat-sys-primary);
        }

        .label {
          font-size: 14px;
          color: var(--mat-sys-outline);
        }
      }

      .icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.2;
      }

      mat-progress-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
      }
    }

    .analytics-tabs-card {
      .tab-content {
        padding: 24px;
        min-height: 400px;
      }

      h3 {
        margin-top: 32px;
        margin-bottom: 16px;
        color: var(--mat-sys-on-surface);
        font-weight: 500;

        &:first-child {
          margin-top: 0;
        }
      }
    }

    .status-table {
      width: 100%;
      max-width: 600px;
      margin-bottom: 32px;

      mat-chip {
        font-size: 12px;
      }
    }

    .progress-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-top: 16px;

      .progress-item {
        padding: 12px;
        background: var(--mat-sys-surface-variant);
        border-radius: 8px;
      }
    }

    .contractor-table,
    .project-table {
      width: 100%;

      .good { color: var(--mat-sys-primary); }
      .warning { color: var(--mat-sys-secondary); }
      .poor { color: var(--mat-sys-error); }
    }

    .project-code {
      color: var(--mat-sys-outline);
      font-size: 12px;
    }

    .progress-cell {
      display: flex;
      align-items: center;
      gap: 12px;

      mat-progress-bar {
        flex: 1;
        max-width: 100px;
      }

      span {
        font-size: 12px;
        min-width: 45px;
      }
    }

    .quality-metrics {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }

    .metric-card {
      text-align: center;

      .quality-score {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 24px;

        .score-value {
          font-size: 64px;
          font-weight: 700;
          line-height: 1;
        }

        .score-label {
          font-size: 16px;
          color: var(--mat-sys-outline);
        }

        &.good .score-value { color: var(--mat-sys-primary); }
        &.warning .score-value { color: var(--mat-sys-secondary); }
        &.poor .score-value { color: var(--mat-sys-error); }
      }
    }

    .quality-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
      justify-content: center;
    }

    .quality-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--mat-sys-surface-variant);
      border-radius: 8px;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--mat-sys-primary);
      }

      .quality-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;

        .label {
          font-size: 14px;
          color: var(--mat-sys-outline);
        }

        .value {
          font-size: 24px;
          font-weight: 500;
        }
      }
    }

    .rejection-reasons {
      mat-chip-set {
        margin-bottom: 8px;
      }
    }

    .time-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 500;
      }
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .label {
        font-size: 12px;
        color: var(--mat-sys-outline);
      }

      .value {
        font-size: 20px;
        font-weight: 500;
        color: var(--mat-sys-on-surface);

        &.warn {
          color: var(--mat-sys-error);
        }

        &.good {
          color: var(--mat-sys-primary);
        }

        &.small {
          font-size: 14px;
        }
      }
    }

    .productivity-info {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;
    }

    .trend-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--mat-sys-surface-variant);
      border-radius: 8px;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .api-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .json-preview {
      max-height: 500px;
      overflow: auto;

      pre {
        margin: 0;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    }

    @media (max-width: 768px) {
      .analytics-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;

        .header-actions {
          width: 100%;
          justify-content: space-between;
        }
      }

      .filter-form {
        flex-direction: column;

        mat-form-field {
          width: 100%;
        }
      }

      .summary-cards {
        grid-template-columns: 1fr;
      }

      .quality-metrics {
        grid-template-columns: 1fr;
      }

      .time-stats {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PoleAnalyticsDashboardComponent implements OnInit {
  private poleAnalyticsService = inject(PoleAnalyticsService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);
  private fb = inject(FormBuilder);

  // State
  loading = signal(false);
  analytics = signal<PoleAnalytics | null>(null);
  projects = signal<Project[]>([]);
  contractors = signal<Contractor[]>([]);
  
  // Form
  filterForm = this.fb.group({
    projectIds: [[] as string[]],
    contractorIds: [[] as string[]],
    statuses: [[] as PlannedPoleStatus[]],
    startDate: [null as Date | null],
    endDate: [null as Date | null],
  });

  // Table columns
  statusColumns = ['status', 'count', 'percentage'];
  contractorColumns = ['contractorName', 'totalAssigned', 'totalCompleted', 'completionRate', 'currentActiveAssignments', 'lastActivityDate'];
  projectColumns = ['projectName', 'totalPoles', 'installedPoles', 'progressPercentage'];

  // Computed values
  statusDataSource = computed(() => {
    const analytics = this.analytics();
    if (!analytics) return [];

    const total = analytics.totalPoles;
    const breakdown = analytics.statusBreakdown;

    return [
      { status: 'planned', count: breakdown.planned, percentage: (breakdown.planned / total) * 100 },
      { status: 'assigned', count: breakdown.assigned, percentage: (breakdown.assigned / total) * 100 },
      { status: 'in_progress', count: breakdown.inProgress, percentage: (breakdown.inProgress / total) * 100 },
      { status: 'installed', count: breakdown.installed, percentage: (breakdown.installed / total) * 100 },
      { status: 'verified', count: breakdown.verified, percentage: (breakdown.verified / total) * 100 },
      { status: 'rejected', count: breakdown.rejected, percentage: (breakdown.rejected / total) * 100 },
      { status: 'cancelled', count: breakdown.cancelled, percentage: (breakdown.cancelled / total) * 100 },
    ].filter(item => item.count > 0);
  });

  ngOnInit() {
    this.loadInitialData();
  }

  private async loadInitialData() {
    this.loading.set(true);
    
    try {
      // Load projects and contractors
      const [projects, contractors] = await Promise.all([
        this.projectService.getAll().pipe(take(1)).toPromise(),
        this.contractorService.getAll().pipe(take(1)).toPromise()
      ]);

      this.projects.set(projects || []);
      this.contractors.set(contractors || []);

      // Load analytics
      await this.loadAnalytics();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAnalytics() {
    const formValue = this.filterForm.value;
    const filter: PoleFilter = {};

    if (formValue.projectIds && formValue.projectIds.length > 0) {
      filter.projectIds = formValue.projectIds;
    }

    if (formValue.contractorIds && formValue.contractorIds.length > 0) {
      filter.contractorIds = formValue.contractorIds;
    }

    if (formValue.statuses && formValue.statuses.length > 0) {
      filter.statuses = formValue.statuses;
    }

    if (formValue.startDate && formValue.endDate) {
      filter.dateRange = {
        startDate: formValue.startDate,
        endDate: formValue.endDate
      };
    }

    const analytics = await this.poleAnalyticsService.getComprehensiveAnalytics(filter)
      .pipe(take(1))
      .toPromise();

    this.analytics.set(analytics || null);
  }

  async applyFilters() {
    this.loading.set(true);
    try {
      await this.loadAnalytics();
    } finally {
      this.loading.set(false);
    }
  }

  async refreshData() {
    await this.loadInitialData();
  }

  // Quick date filters
  setToday() {
    const today = new Date();
    this.filterForm.patchValue({
      startDate: today,
      endDate: today
    });
  }

  setThisWeek() {
    const today = new Date();
    this.filterForm.patchValue({
      startDate: startOfWeek(today),
      endDate: endOfWeek(today)
    });
  }

  setThisMonth() {
    const today = new Date();
    this.filterForm.patchValue({
      startDate: startOfMonth(today),
      endDate: endOfMonth(today)
    });
  }

  setLast30Days() {
    const today = new Date();
    this.filterForm.patchValue({
      startDate: subDays(today, 30),
      endDate: today
    });
  }

  // Export functions
  exportData() {
    const analytics = this.analytics();
    if (!analytics) return;

    const jsonData = this.poleAnalyticsService.exportAnalyticsAsJson(analytics);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pole-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  downloadJson() {
    this.exportData();
  }

  copyApiUrl() {
    const apiUrl = `${window.location.origin}/api/pole-analytics`;
    navigator.clipboard.writeText(apiUrl);
    // You could add a snackbar notification here
  }

  copyJsonData() {
    const analytics = this.analytics();
    if (!analytics) return;

    const jsonData = this.poleAnalyticsService.exportAnalyticsAsJson(analytics);
    navigator.clipboard.writeText(jsonData);
    // You could add a snackbar notification here
  }

  getJsonPreview(): string {
    const analytics = this.analytics();
    if (!analytics) return '{}';
    
    // Create a simplified version for Lew's team
    const apiData = {
      summary: {
        totalPoles: analytics.totalPoles,
        completionPercentage: analytics.installationProgress.completionPercentage,
        remainingPoles: analytics.installationProgress.remaining,
        projectedCompletionDate: analytics.installationProgress.projectedCompletionDate,
      },
      dailyMetrics: {
        polesInstalledToday: analytics.dailyStats.polesInstalled,
        averagePerDay: analytics.productivityMetrics.averagePolesPerDay,
        productivityTrend: analytics.productivityMetrics.productivityTrend,
      },
      statusBreakdown: analytics.statusBreakdown,
      contractorPerformance: analytics.contractorStats.map(c => ({
        name: c.contractorName,
        assigned: c.totalAssigned,
        completed: c.totalCompleted,
        completionRate: c.completionRate,
        active: c.currentActiveAssignments
      })),
      projectProgress: analytics.projectStats.map(p => ({
        name: p.projectName,
        code: p.projectCode,
        total: p.totalPoles,
        installed: p.installedPoles,
        progress: p.progressPercentage
      })),
      qualityMetrics: {
        overallScore: analytics.qualityMetrics.overallQualityScore,
        photoCompletionRate: analytics.qualityMetrics.photoCompletionRate,
        firstTimeApprovalRate: analytics.qualityMetrics.firstTimeApprovalRate
      },
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(apiData, null, 2);
  }

  // Helper methods
  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case 'verified':
      case 'installed':
        return 'primary';
      case 'in_progress':
      case 'assigned':
        return 'accent';
      case 'rejected':
      case 'cancelled':
        return 'warn';
      default:
        return undefined;
    }
  }

  getProductivityTrendIcon(): string {
    const trend = this.analytics()?.productivityMetrics.productivityTrend;
    switch (trend) {
      case 'increasing':
        return 'trending_up';
      case 'decreasing':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  }

  getProductivityTrendColor(): 'primary' | 'warn' | undefined {
    const trend = this.analytics()?.productivityMetrics.productivityTrend;
    switch (trend) {
      case 'increasing':
        return 'primary';
      case 'decreasing':
        return 'warn';
      default:
        return undefined;
    }
  }

  private take(count: number) {
    return (source: Observable<any>) => source.pipe(take(count));
  }
}