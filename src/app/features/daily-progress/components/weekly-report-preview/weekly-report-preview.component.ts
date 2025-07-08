import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { WeeklyReportData } from '../../models/weekly-report.model';
import { DailyKPIs } from '../../models/daily-kpis.model';
import { WeeklyReportGeneratorService } from '../../services/weekly-report-generator.service';
import { WeeklyReportDocxService } from '../../services/weekly-report-docx.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-weekly-report-preview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTableModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="report-preview-container">
      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading data...</p>
        </div>
      } @else if (rawKpis.length > 0) {
        <!-- Simple Data View -->
        <mat-card class="report-header">
          <mat-card-content>
            <h1>{{ project?.name || 'Weekly Report' }} - Data Preview</h1>
            <h2>{{ formatSimpleDateRange() }}</h2>
            <p>Found {{ rawKpis.length }} daily entries</p>
          </mat-card-content>
        </mat-card>

        <!-- Raw Data Table -->
        <mat-card class="data-table-card">
          <mat-card-header>
            <mat-card-title>Daily KPI Data</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="rawKpis" class="data-preview-table">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let kpi">{{ kpi.date | date:'shortDate' }}</td>
              </ng-container>
              
              <ng-container matColumnDef="poles">
                <th mat-header-cell *matHeaderCellDef>Poles</th>
                <td mat-cell *matCellDef="let kpi">{{ kpi.polesPlantedToday || 0 }}</td>
              </ng-container>
              
              <ng-container matColumnDef="permissions">
                <th mat-header-cell *matHeaderCellDef>Permissions</th>
                <td mat-cell *matCellDef="let kpi">{{ kpi.permissionsToday || 0 }}</td>
              </ng-container>
              
              <ng-container matColumnDef="trenching">
                <th mat-header-cell *matHeaderCellDef>Trenching (m)</th>
                <td mat-cell *matCellDef="let kpi">{{ kpi.trenchingToday || 0 }}</td>
              </ng-container>
              
              <ng-container matColumnDef="stringing">
                <th mat-header-cell *matHeaderCellDef>Total Stringing (m)</th>
                <td mat-cell *matCellDef="let kpi">{{ getTotalStringing(kpi) }}</td>
              </ng-container>
              
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Site Status</th>
                <td mat-cell *matCellDef="let kpi">
                  <mat-chip [color]="getSiteStatusColorFromKpi(kpi)">
                    {{ kpi.siteLiveStatus || 'Not Live' }}
                  </mat-chip>
                </td>
              </ng-container>
              
              <tr mat-header-row *matHeaderRowDef="['date', 'poles', 'permissions', 'trenching', 'stringing', 'status']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['date', 'poles', 'permissions', 'trenching', 'stringing', 'status']"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <!-- Summary Stats -->
        <mat-card class="summary-stats-card">
          <mat-card-header>
            <mat-card-title>Week Summary</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="label">Total Poles Planted</span>
                <span class="value">{{ getTotalPoles() }}</span>
              </div>
              <div class="stat-item">
                <span class="label">Total Permissions</span>
                <span class="value">{{ getTotalPermissions() }}</span>
              </div>
              <div class="stat-item">
                <span class="label">Total Trenching</span>
                <span class="value">{{ getTotalTrenching() }}m</span>
              </div>
              <div class="stat-item">
                <span class="label">Total Stringing</span>
                <span class="value">{{ getTotalStringingAll() }}m</span>
              </div>
              <div class="stat-item">
                <span class="label">Days with Activity</span>
                <span class="value">{{ getDaysWithActivity() }}</span>
              </div>
              <div class="stat-item">
                <span class="label">Latest Site Status</span>
                <mat-chip [color]="getLatestSiteStatusColor()">
                  {{ getLatestSiteStatus() }}
                </mat-chip>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button mat-raised-button color="primary" (click)="generateFullReport()" [disabled]="generatingReport">
            @if (generatingReport) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <mat-icon>description</mat-icon>
            }
            Generate Full Report
          </button>
          <button mat-button (click)="close.emit()">Close</button>
        </div>
      } @else if (reportData) {
        <!-- Header Section -->
        <mat-card class="report-header">
          <mat-card-content>
            <h1>{{ reportData.projectInfo.projectName }} Weekly Report</h1>
            <h2>{{ formatDateRange() }}</h2>
            <div class="header-info">
              <p><strong>Customer:</strong> {{ reportData.projectInfo.customer }}</p>
              <p><strong>Location:</strong> {{ reportData.projectInfo.location }}</p>
              @if (reportData.projectInfo.contractorName) {
                <p><strong>Contractor:</strong> {{ reportData.projectInfo.contractorName }}</p>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Executive Summary -->
        <mat-card class="report-section">
          <mat-card-header>
            <mat-card-title>Executive Summary</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p class="overview">{{ reportData.executiveSummary.overview }}</p>
            
            @if (reportData.executiveSummary.keyAchievements.length > 0) {
              <h3>Key Achievements</h3>
              <ul>
                @for (achievement of reportData.executiveSummary.keyAchievements; track achievement.metric) {
                  <li>
                    <strong>{{ achievement.metric }}:</strong> {{ achievement.value }} - {{ achievement.context }}
                  </li>
                }
              </ul>
            }

            @if (reportData.executiveSummary.criticalFocusAreas.length > 0) {
              <h3>Critical Focus Areas</h3>
              <ul>
                @for (area of reportData.executiveSummary.criticalFocusAreas; track area) {
                  <li>{{ area }}</li>
                }
              </ul>
            }
          </mat-card-content>
        </mat-card>

        <!-- Performance Metrics -->
        <mat-card class="report-section">
          <mat-card-header>
            <mat-card-title>Performance Metrics</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <!-- Infrastructure Development -->
            <div class="metric-section">
              <h3>Infrastructure Development</h3>
              <div class="metric-grid">
                <div class="metric-item">
                  <span class="label">Total Poles Planted</span>
                  <span class="value">{{ reportData.performanceMetrics.infrastructureDevelopment.totalPolesPlanted }}</span>
                </div>
                <div class="metric-item">
                  <span class="label">Average Per Day</span>
                  <span class="value">{{ reportData.performanceMetrics.infrastructureDevelopment.averagePerDay }}</span>
                </div>
                @if (reportData.performanceMetrics.infrastructureDevelopment.peakDay) {
                  <div class="metric-item">
                    <span class="label">Peak Day</span>
                    <span class="value">{{ reportData.performanceMetrics.infrastructureDevelopment.peakDay.count }} poles on {{ reportData.performanceMetrics.infrastructureDevelopment.peakDay.date | date:'shortDate' }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Permissions Processing -->
            @if (reportData.performanceMetrics.permissionsProcessing) {
              <div class="metric-section">
                <h3>Permissions Processing</h3>
                <div class="metric-grid">
                  <div class="metric-item">
                    <span class="label">Total Permissions Secured</span>
                    <span class="value">{{ reportData.performanceMetrics.permissionsProcessing.totalPermissionsSecured }}</span>
                  </div>
                </div>
              </div>
            }

            <!-- Stringing Operations -->
            @if (reportData.performanceMetrics.stringingOperations) {
              <div class="metric-section">
                <h3>Stringing Operations</h3>
                <div class="metric-grid">
                  <div class="metric-item">
                    <span class="label">Total Cable Strung</span>
                    <span class="value">{{ reportData.performanceMetrics.stringingOperations.totalOperations }}m</span>
                  </div>
                </div>
                <table mat-table [dataSource]="getStringingDataSource()" class="stringing-table">
                  <ng-container matColumnDef="cableType">
                    <th mat-header-cell *matHeaderCellDef>Cable Type</th>
                    <td mat-cell *matCellDef="let element">{{ element.type }}</td>
                  </ng-container>
                  <ng-container matColumnDef="length">
                    <th mat-header-cell *matHeaderCellDef>Length (m)</th>
                    <td mat-cell *matCellDef="let element">{{ element.length }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="['cableType', 'length']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['cableType', 'length']"></tr>
                </table>
              </div>
            }

            <!-- Customer Engagement -->
            @if (reportData.performanceMetrics.customerEngagement) {
              <div class="metric-section">
                <h3>Customer Engagement</h3>
                <div class="metric-grid">
                  <div class="metric-item">
                    <span class="label">Home Sign-ups</span>
                    <span class="value">{{ reportData.performanceMetrics.customerEngagement.homeSignUps }}</span>
                  </div>
                  <div class="metric-item">
                    <span class="label">Home Drops Completed</span>
                    <span class="value">{{ reportData.performanceMetrics.customerEngagement.homeDropsCompleted }}</span>
                  </div>
                  <div class="metric-item">
                    <span class="label">Home Connections</span>
                    <span class="value">{{ reportData.performanceMetrics.customerEngagement.homeConnections }}</span>
                  </div>
                  <div class="metric-item">
                    <span class="label">Site Status</span>
                    <mat-chip [color]="getSiteStatusColor()">
                      {{ reportData.performanceMetrics.customerEngagement.siteLiveStatus }}
                    </mat-chip>
                  </div>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Operational Challenges -->
        @if (reportData.operationalChallenges.length > 0) {
          <mat-card class="report-section">
            <mat-card-header>
              <mat-card-title>Operational Challenges</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (challenge of reportData.operationalChallenges; track challenge.type) {
                <div class="challenge-item">
                  <h4>{{ formatChallengeType(challenge.type) }}</h4>
                  <p>{{ challenge.description }}</p>
                  <div class="challenge-meta">
                    <mat-chip [color]="getImpactColor(challenge.impact)">
                      Impact: {{ challenge.impact }}
                    </mat-chip>
                    <span>Days Affected: {{ challenge.daysAffected }}</span>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Risk Assessment -->
        <mat-card class="report-section">
          <mat-card-header>
            <mat-card-title>Risk Assessment</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="risk-overview">
              <mat-chip [color]="getRiskLevelColor()">
                Overall Risk Level: {{ reportData.riskAssessment.overallRiskLevel }}
              </mat-chip>
            </div>

            @if (reportData.riskAssessment.immediateRisks.length > 0) {
              <h3>Immediate Risks</h3>
              @for (risk of reportData.riskAssessment.immediateRisks; track risk.description) {
                <div class="risk-item">
                  <div class="risk-header">
                    <strong>{{ risk.category }}</strong>
                    <mat-chip [color]="getSeverityColor(risk.severity)" class="severity-chip">
                      {{ risk.severity }}
                    </mat-chip>
                  </div>
                  <p>{{ risk.description }}</p>
                  @if (risk.mitigation) {
                    <p class="mitigation"><strong>Mitigation:</strong> {{ risk.mitigation }}</p>
                  }
                </div>
              }
            }

            @if (reportData.riskAssessment.mediumTermRisks.length > 0) {
              <h3>Medium-Term Risks</h3>
              @for (risk of reportData.riskAssessment.mediumTermRisks; track risk.description) {
                <div class="risk-item">
                  <div class="risk-header">
                    <strong>{{ risk.category }}</strong>
                    <mat-chip [color]="getSeverityColor(risk.severity)" class="severity-chip">
                      {{ risk.severity }}
                    </mat-chip>
                  </div>
                  <p>{{ risk.description }}</p>
                  @if (risk.mitigation) {
                    <p class="mitigation"><strong>Mitigation:</strong> {{ risk.mitigation }}</p>
                  }
                </div>
              }
            }
          </mat-card-content>
        </mat-card>

        <!-- Recommendations -->
        @if (reportData.recommendations.length > 0) {
          <mat-card class="report-section">
            <mat-card-header>
              <mat-card-title>Recommendations</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (rec of reportData.recommendations; track rec.title; let i = $index) {
                <div class="recommendation-item">
                  <h4>{{ i + 1 }}. {{ rec.title }}</h4>
                  <mat-chip [color]="getPriorityColor(rec.priority)">
                    {{ rec.priority }}
                  </mat-chip>
                  <p>{{ rec.description }}</p>
                  <p class="expected-impact"><strong>Expected Impact:</strong> {{ rec.expectedImpact }}</p>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button mat-raised-button color="primary" (click)="downloadDocx()">
            <mat-icon>download</mat-icon>
            Download as DOCX
          </button>
          <button mat-button (click)="close.emit()">Close</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .report-preview-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      gap: 16px;
    }

    .report-header {
      margin-bottom: 24px;
      text-align: center;

      h1 {
        margin: 0 0 8px 0;
        font-size: 28px;
      }

      h2 {
        margin: 0 0 16px 0;
        font-size: 20px;
        color: var(--mat-sys-on-surface-variant);
      }

      .header-info {
        display: flex;
        gap: 24px;
        justify-content: center;
        flex-wrap: wrap;
        
        p {
          margin: 0;
        }
      }
    }

    .report-section {
      margin-bottom: 24px;

      mat-card-header {
        margin-bottom: 16px;
      }
    }

    .overview {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    h3 {
      margin: 24px 0 12px 0;
      color: var(--mat-sys-primary);
    }

    h4 {
      margin: 16px 0 8px 0;
    }

    .metric-section {
      margin-bottom: 32px;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      padding: 16px;
      background: var(--mat-sys-surface-variant);
      border-radius: 8px;

      .label {
        font-size: 14px;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 4px;
      }

      .value {
        font-size: 20px;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }
    }

    .stringing-table {
      width: 100%;
      margin-top: 16px;
    }

    .challenge-item, .risk-item, .recommendation-item {
      margin-bottom: 24px;
      padding: 16px;
      background: var(--mat-sys-surface-variant);
      border-radius: 8px;
    }

    .challenge-meta {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-top: 8px;
    }

    .risk-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .risk-overview {
      margin-bottom: 24px;
    }

    .mitigation {
      margin-top: 8px;
      font-style: italic;
    }

    .expected-impact {
      margin-top: 8px;
      color: var(--mat-sys-on-surface-variant);
    }

    .action-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 32px;
      position: sticky;
      bottom: 24px;
      background: var(--mat-sys-surface);
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
    }

    .data-table-card, .summary-stats-card {
      margin-bottom: 24px;
    }

    .data-preview-table {
      width: 100%;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      padding: 16px;
      background: var(--mat-sys-surface-variant);
      border-radius: 8px;

      .label {
        font-size: 14px;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 4px;
      }

      .value {
        font-size: 24px;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }
    }

    mat-chip {
      font-size: 12px;
    }

    ul {
      margin: 8px 0;
      padding-left: 24px;

      li {
        margin: 4px 0;
      }
    }

    @media print {
      .action-buttons {
        display: none;
      }
    }
  `]
})
export class WeeklyReportPreviewComponent {
  @Input() reportData: WeeklyReportData | null = null;
  @Input() rawKpis: DailyKPIs[] = [];
  @Input() project: any = null;
  @Input() dateRange: { start: Date; end: Date } | null = null;
  @Input() loading = false;
  @Output() close = new EventEmitter<void>();

  private weeklyReportGenerator = inject(WeeklyReportGeneratorService);
  private weeklyReportDocx = inject(WeeklyReportDocxService);
  private snackBar = inject(MatSnackBar);

  generatingReport = false;

  formatSimpleDateRange(): string {
    if (!this.dateRange) return '';
    return `${this.dateRange.start.toLocaleDateString()} - ${this.dateRange.end.toLocaleDateString()}`;
  }

  getTotalStringing(kpi: DailyKPIs): number {
    return (kpi.stringing24Today || 0) +
           (kpi.stringing48Today || 0) +
           (kpi.stringing96Today || 0) +
           (kpi.stringing144Today || 0) +
           (kpi.stringing288Today || 0);
  }

  getTotalPoles(): number {
    return this.rawKpis.reduce((sum, kpi) => sum + (kpi.polesPlantedToday || 0), 0);
  }

  getTotalPermissions(): number {
    return this.rawKpis.reduce((sum, kpi) => sum + (kpi.permissionsToday || 0), 0);
  }

  getTotalTrenching(): number {
    return this.rawKpis.reduce((sum, kpi) => sum + (kpi.trenchingToday || 0), 0);
  }

  getTotalStringingAll(): number {
    return this.rawKpis.reduce((sum, kpi) => sum + this.getTotalStringing(kpi), 0);
  }

  getDaysWithActivity(): number {
    return this.rawKpis.filter(kpi => 
      (kpi.polesPlantedToday || 0) > 0 ||
      (kpi.permissionsToday || 0) > 0 ||
      (kpi.trenchingToday || 0) > 0 ||
      this.getTotalStringing(kpi) > 0
    ).length;
  }

  getLatestSiteStatus(): string {
    const latestKpi = this.rawKpis[this.rawKpis.length - 1];
    return latestKpi?.siteLiveStatus || 'Not Live';
  }

  getLatestSiteStatusColor(): 'primary' | 'accent' | 'warn' {
    const status = this.getLatestSiteStatus();
    switch (status) {
      case 'Fully Live': return 'primary';
      case 'Partially Live': return 'accent';
      default: return 'warn';
    }
  }

  getSiteStatusColorFromKpi(kpi: DailyKPIs): 'primary' | 'accent' | 'warn' {
    switch (kpi.siteLiveStatus) {
      case 'Fully Live': return 'primary';
      case 'Partially Live': return 'accent';
      default: return 'warn';
    }
  }

  async generateFullReport() {
    if (!this.project || !this.dateRange) return;

    try {
      this.generatingReport = true;
      this.snackBar.open('Generating full report...', '', { duration: 0 });

      // Generate the full report data
      const reportData = await firstValueFrom(
        this.weeklyReportGenerator.generateWeeklyReport(
          this.project.id,
          this.dateRange.start,
          this.dateRange.end
        )
      );

      if (reportData) {
        this.reportData = reportData;
        this.snackBar.open('Report generated! You can now download it.', 'Close', { duration: 3000 });
      } else {
        throw new Error('Failed to generate report data');
      }
    } catch (error) {
      console.error('Error generating full report:', error);
      this.snackBar.open('Error generating report. Please try again.', 'Close', { duration: 5000 });
    } finally {
      this.generatingReport = false;
    }
  }

  formatDateRange(): string {
    if (!this.reportData) return '';
    const start = this.reportData.reportPeriod.startDate;
    const end = this.reportData.reportPeriod.endDate;
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }

  getStringingDataSource() {
    if (!this.reportData?.performanceMetrics.stringingOperations) return [];
    
    const stringing = this.reportData.performanceMetrics.stringingOperations.totalByType;
    return [
      { type: '24 Core', length: stringing.cable24Core },
      { type: '48 Core', length: stringing.cable48Core },
      { type: '96 Core', length: stringing.cable96Core },
      { type: '144 Core', length: stringing.cable144Core },
      { type: '288 Core', length: stringing.cable288Core }
    ].filter(item => item.length > 0);
  }

  formatChallengeType(type: string): string {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  getSiteStatusColor(): 'primary' | 'accent' | 'warn' {
    if (!this.reportData) return 'warn';
    const status = this.reportData.performanceMetrics.customerEngagement?.siteLiveStatus;
    
    switch (status) {
      case 'Fully Live': return 'primary';
      case 'Partially Live': return 'accent';
      default: return 'warn';
    }
  }

  getImpactColor(impact: string): 'primary' | 'accent' | 'warn' {
    switch (impact) {
      case 'low': return 'primary';
      case 'medium': return 'accent';
      case 'high': return 'warn';
      default: return 'accent';
    }
  }

  getRiskLevelColor(): 'primary' | 'accent' | 'warn' {
    if (!this.reportData) return 'warn';
    
    switch (this.reportData.riskAssessment.overallRiskLevel) {
      case 'low': return 'primary';
      case 'medium': return 'accent';
      case 'high': return 'warn';
      default: return 'accent';
    }
  }

  getSeverityColor(severity: string): 'primary' | 'accent' | 'warn' {
    switch (severity) {
      case 'low': return 'primary';
      case 'medium': return 'accent';
      case 'high': return 'warn';
      default: return 'accent';
    }
  }

  getPriorityColor(priority: string): 'primary' | 'accent' | 'warn' {
    switch (priority) {
      case 'long-term': return 'primary';
      case 'medium-term': return 'accent';
      case 'immediate': return 'warn';
      default: return 'accent';
    }
  }

  async downloadDocx() {
    if (!this.reportData) return;
    
    try {
      this.snackBar.open('Generating DOCX file...', '', { duration: 0 });
      await this.weeklyReportDocx.generateReport(this.reportData);
      this.snackBar.open('Weekly report downloaded successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error generating DOCX:', error);
      this.snackBar.open('Error generating report', 'Close', { duration: 3000 });
    }
  }
}