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
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { DailyKPIs, KPI_DEFINITIONS } from '../../models/daily-kpis.model';
import { DailyKpisService } from '../../services/daily-kpis.service';
import { ProjectService } from '../../../../core/services/project.service';
import { Project } from '../../../../core/models/project.model';
import { combineLatest, map, switchMap, of, catchError } from 'rxjs';

interface KPISummaryRow {
  metric: string;
  today: number;
  total: number;
  unit: string;
  category: string;
}

interface ProjectTotals {
  project: Project;
  totals: { [key: string]: number };
  latestUpdate: Date | null;
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
    MatTabsModule,
    MatDividerModule,
  ],
  template: `
    <div class="kpis-summary-container">
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>Daily KPIs Dashboard</mat-card-title>
          <mat-card-subtitle>View and analyze daily KPI submissions</mat-card-subtitle>
        </mat-card-header>
      </mat-card>

      <mat-tab-group (selectedTabChange)="onTabChange($event)">
        <!-- Daily Summary Tab -->
        <mat-tab label="Daily Summary">
          <div class="tab-content">
            <!-- Filters -->
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

                  <button mat-button (click)="toggleDateRangeMode()" [color]="dateRangeMode() ? 'primary' : 'basic'">
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
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Daily Data Table -->
            @if (loadingDaily()) {
              <div class="loading-container">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Loading daily KPIs...</p>
              </div>
            } @else if (dailySummary().length > 0) {
              <mat-card class="data-card">
                <mat-card-header>
                  <mat-card-title>
                    @if (!dateRangeMode()) {
                      {{ dateControl.value | date: 'fullDate' }}
                    } @else {
                      {{ startDateControl.value | date: 'shortDate' }} - {{ endDateControl.value | date: 'shortDate' }}
                    }
                    - {{ selectedProjectName() }}
                  </mat-card-title>
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
                    <tr
                      mat-row
                      *matRowDef="let row; columns: displayedColumns"
                      [class.category-header]="row.category === 'header'"
                    ></tr>
                  </table>
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
        </mat-tab>

        <!-- Project Totals Tab -->
        <mat-tab label="Project Totals">
          <div class="tab-content">
            <!-- Load Data Button -->
            <mat-card class="filter-card">
              <mat-card-content>
                <div class="filters-row">
                  <button mat-raised-button color="primary" (click)="loadProjectTotals()">
                    <mat-icon>refresh</mat-icon>
                    Refresh Totals
                  </button>
                  <span class="info-text">Showing the latest totals for all projects</span>
                </div>
              </mat-card-content>
            </mat-card>

            @if (loadingProjects()) {
              <div class="loading-container">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Loading project totals...</p>
              </div>
            } @else if (projectTotals().length === 0) {
              <mat-card class="empty-state">
                <mat-card-content>
                  <mat-icon class="empty-icon">assessment</mat-icon>
                  <h3>No Project Data Found</h3>
                  <p>Either no projects exist or no KPI data has been submitted yet.</p>
                  <p>
                    Make sure to submit daily KPIs using the "New Entry" button in the Daily Summary
                    tab.
                  </p>
                </mat-card-content>
              </mat-card>
            } @else {
              <div class="projects-grid">
                @for (projectTotal of projectTotals(); track projectTotal.project.id) {
                  <mat-card class="project-card">
                    <mat-card-header>
                      <mat-card-title>{{ projectTotal.project.name }}</mat-card-title>
                      <mat-card-subtitle>
                        @if (projectTotal.latestUpdate) {
                          Last Update: {{ projectTotal.latestUpdate | date: 'short' }}
                        } @else {
                          No KPI data submitted yet
                        }
                      </mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      @if (hasAnyData(projectTotal)) {
                        <div class="totals-grid">
                          <div class="total-item" *ngFor="let kpi of getProjectKPIs(projectTotal)">
                            <span class="label">{{ kpi.label }}</span>
                            <span class="value">{{ kpi.value }}</span>
                            <span class="unit">{{ kpi.unit }}</span>
                          </div>
                        </div>
                      } @else {
                        <div class="no-data-message">
                          <p>No KPI data has been submitted for this project yet.</p>
                          <p>Submit daily KPIs to see totals here.</p>
                          <!-- Debug info -->
                          <details style="margin-top: 20px; text-align: left;">
                            <summary>Debug Info (click to expand)</summary>
                            <pre style="font-size: 10px; overflow-x: auto;">{{
                              projectTotal.totals | json
                            }}</pre>
                          </details>
                        </div>
                      }
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .kpis-summary-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header-card {
        margin-bottom: 24px;
      }

      .tab-content {
        padding: 24px 0;
      }

      .filter-card {
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

      .info-text {
        color: var(--mat-sys-on-surface-variant);
        font-size: 14px;
        margin-left: 16px;
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

      .data-card {
        margin-bottom: 24px;
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

      .category-header {
        background-color: var(--mat-sys-surface-variant);
        font-weight: 600;
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

      .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 24px;
      }

      .project-card {
        mat-card-subtitle {
          margin-top: 4px;
        }
      }

      .totals-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-top: 16px;
      }

      .total-item {
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
          font-size: 24px;
          font-weight: 600;
          color: var(--mat-sys-primary);
        }

        .unit {
          font-size: 11px;
          color: var(--mat-sys-on-surface-variant);
          text-transform: uppercase;
        }
      }

      @media (max-width: 768px) {
        .filters-row {
          flex-direction: column;

          mat-form-field,
          button {
            width: 100%;
          }
        }

        .projects-grid {
          grid-template-columns: 1fr;
        }

        .totals-grid {
          grid-template-columns: 1fr;
        }
      }

      .no-data-message {
        text-align: center;
        padding: 40px 20px;
        color: var(--mat-sys-on-surface-variant);

        p {
          margin: 8px 0;
        }
      }
    `,
  ],
})
export class DailyKpisSummaryComponent implements OnInit {
  private kpisService = inject(DailyKpisService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Form controls
  dateControl = new FormControl<Date>(new Date());
  startDateControl = new FormControl<Date>(new Date());
  endDateControl = new FormControl<Date>(new Date());
  projectControl = new FormControl<string>('');
  dateRangeMode = signal(false);

  // Signals
  projects = signal<Project[]>([]);
  dailySummary = signal<KPISummaryRow[]>([]);
  projectTotals = signal<ProjectTotals[]>([]);
  loadingDaily = signal(false);
  loadingProjects = signal(false);

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
      const startDate = this.startDateControl.value instanceof Date ? this.startDateControl.value : new Date(this.startDateControl.value || new Date());
      const endDate = this.endDateControl.value instanceof Date ? this.endDateControl.value : new Date(this.endDateControl.value || new Date());
      
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
      const selectedDate = dateValue instanceof Date ? dateValue : new Date(dateValue || new Date());

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
      return;
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

  loadProjectTotals() {
    const currentProjects = this.projects();

    if (currentProjects.length === 0) {
      // Try loading projects first
      this.projectService.getProjects().subscribe({
        next: (projects) => {
          this.projects.set(projects);
          if (projects.length > 0) {
            this.loadProjectTotals(); // Retry after loading projects
          }
        },
      });
      return;
    }

    this.loadingProjects.set(true);

    const projectTotals$ = currentProjects.map((project) =>
      this.kpisService.getKPIsByProject(project.id!).pipe(
        map((kpis) => ({
          project,
          kpis,
        })),
        catchError((error) => {
          console.error(`Error loading KPIs for project ${project.name}:`, error);
          return of({ project, kpis: [] });
        }),
      ),
    );

    combineLatest(projectTotals$).subscribe({
      next: (results) => {
        const totals: ProjectTotals[] = results.map(({ project, kpis }) => {
          const latestKpi = kpis[0]; // Already sorted by date desc

          const totals: { [key: string]: number } = {};

          if (latestKpi) {
            KPI_DEFINITIONS.forEach((kpiDef) => {
              // Store the total field value with the correct key
              const value = (latestKpi[kpiDef.totalField as keyof DailyKPIs] as number) || 0;
              totals[kpiDef.totalField] = value;
            });
          }

          return {
            project,
            totals,
            latestUpdate: latestKpi?.updatedAt || null,
          };
        });

        this.projectTotals.set(totals);
        this.loadingProjects.set(false);
      },
      error: (error) => {
        console.error('Error loading project totals:', error);
        this.loadingProjects.set(false);
        this.projectTotals.set([]);
      },
    });
  }

  getProjectKPIs(projectTotal: ProjectTotals) {
    return [
      { label: 'Permissions', value: projectTotal.totals['permissionsTotal'] || 0, unit: 'count' },
      {
        label: 'Poles Planted',
        value: projectTotal.totals['polesPlantedTotal'] || 0,
        unit: 'count',
      },
      { label: 'Home Signups', value: projectTotal.totals['homeSignupsTotal'] || 0, unit: 'count' },
      { label: 'Home Drops', value: projectTotal.totals['homeDropsTotal'] || 0, unit: 'count' },
      {
        label: 'Homes Connected',
        value: projectTotal.totals['homesConnectedTotal'] || 0,
        unit: 'count',
      },
      { label: 'Trenching', value: projectTotal.totals['trenchingTotal'] || 0, unit: 'meters' },
      {
        label: 'Cable Stringing',
        value: this.getTotalStringing(projectTotal.totals),
        unit: 'meters',
      },
    ];
  }

  private getTotalStringing(totals: { [key: string]: number }): number {
    return (
      (totals['stringing24Total'] || 0) +
      (totals['stringing48Total'] || 0) +
      (totals['stringing96Total'] || 0) +
      (totals['stringing144Total'] || 0) +
      (totals['stringing288Total'] || 0)
    );
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

  onTabChange(event: MatTabChangeEvent) {
    // console.log('Tab changed to index:', event.index);
    // When switching to Project Totals tab (index 1), auto-load the data
    if (event.index === 1) {
      // console.log('Loading project totals, current length:', this.projectTotals().length);
      this.loadProjectTotals();
    }
  }

  hasAnyData(projectTotal: ProjectTotals): boolean {
    return Object.values(projectTotal.totals).some((value) => value > 0);
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
}
