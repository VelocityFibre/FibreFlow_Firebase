import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { ProjectService } from '../../../../core/services/project.service';
import { Project } from '../../../../core/models/project.model';
import { PlannedPole, PoleInstallation } from '../../models/mobile-pole-tracker.model';

@Component({
  selector: 'app-pole-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  styleUrls: ['./pole-reports.component.scss'],
  template: `
    <div class="reports-container">
      <!-- Header -->
      <div class="header">
        <h1>Pole Tracker Reports</h1>
        <div class="header-actions">
          <button mat-raised-button (click)="refreshData()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          <button mat-raised-button color="primary" [matMenuTriggerFor]="exportMenu">
            <mat-icon>download</mat-icon>
            Export
          </button>
          <mat-menu #exportMenu="matMenu">
            <button mat-menu-item (click)="exportCSV()">
              <mat-icon>table_chart</mat-icon>
              Export as CSV
            </button>
            <button mat-menu-item (click)="exportPDF()" disabled>
              <mat-icon>picture_as_pdf</mat-icon>
              Export as PDF (Coming Soon)
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Project Selector -->
      <mat-card class="project-selector-card">
        <mat-card-content>
          <mat-form-field>
            <mat-label>Select Project</mat-label>
            <mat-select [(ngModel)]="selectedProjectId" (selectionChange)="onProjectChange()">
              <mat-option value="all">All Projects</mat-option>
              @for (project of projects(); track project.id) {
                <mat-option [value]="project.id">
                  {{ project.name }} ({{ project.projectCode }})
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          @if (selectedProjectId() !== 'all' && selectedProject()) {
            <div class="project-info">
              <span><strong>Client:</strong> {{ selectedProject()?.clientName }}</span>
              <span><strong>Status:</strong> {{ selectedProject()?.status }}</span>
            </div>
          }
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading report data...</p>
        </div>
      } @else if (!selectedProjectId()) {
        <div class="empty-state">
          <mat-icon>assessment</mat-icon>
          <h3>Select a Project</h3>
          <p>Choose a project above to view its pole tracking reports</p>
        </div>
      } @else {
        <!-- Statistics Overview -->
        <div class="stats-overview">
          <mat-card class="stat-card primary">
            <mat-card-content>
              <div class="stat-value">{{ totalPoles() }}</div>
              <div class="stat-label">Total Poles</div>
              <div class="stat-percentage positive">
                <mat-icon>trending_up</mat-icon>
                100%
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ installedPoles() }}</div>
              <div class="stat-label">Installed</div>
              <div class="stat-percentage" [class.positive]="installationRate() >= 80">
                {{ installationRate() }}%
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ verifiedPoles() }}</div>
              <div class="stat-label">Verified</div>
              <div class="stat-percentage" [class.positive]="verificationRate() >= 80">
                {{ verificationRate() }}%
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ pendingPoles() }}</div>
              <div class="stat-label">Pending</div>
              <div class="stat-percentage" [class.negative]="pendingRate() > 20">
                {{ pendingRate() }}%
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ avgDeviationMeters() }}m</div>
              <div class="stat-label">Avg. Deviation</div>
              <div
                class="stat-percentage"
                [class.positive]="avgDeviationMeters() <= 10"
                [class.negative]="avgDeviationMeters() > 20"
              >
                @if (avgDeviationMeters() <= 10) {
                  <mat-icon>check_circle</mat-icon>
                  Good
                } @else if (avgDeviationMeters() <= 20) {
                  <mat-icon>warning</mat-icon>
                  Fair
                } @else {
                  <mat-icon>error</mat-icon>
                  Poor
                }
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-value">{{ avgCompletionTime() }}</div>
              <div class="stat-label">Avg. Time/Pole</div>
              <div class="stat-percentage positive">
                <mat-icon>timer</mat-icon>
                Target: 30min
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Charts Section -->
        <div class="charts-section">
          <!-- Installation Progress Chart -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Installation Progress</mat-card-title>
              <mat-card-subtitle>Daily installation trend</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-container">
                <div class="chart-placeholder">
                  <mat-icon>show_chart</mat-icon>
                  <p>Chart visualization coming soon</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Status Distribution Chart -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Status Distribution</mat-card-title>
              <mat-card-subtitle>Current pole statuses</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-container">
                <div class="chart-placeholder">
                  <mat-icon>pie_chart</mat-icon>
                  <p>Chart visualization coming soon</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Contractor Performance -->
        <mat-card class="performance-section">
          <mat-card-header>
            <mat-card-title>Contractor Performance</mat-card-title>
            <mat-card-subtitle>Performance metrics by contractor</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="table-container">
              <table mat-table [dataSource]="contractorMetrics()" class="performance-table">
                <!-- Contractor Column -->
                <ng-container matColumnDef="contractor">
                  <th mat-header-cell *matHeaderCellDef>Contractor</th>
                  <td mat-cell *matCellDef="let metric">
                    <span class="contractor-name">{{ metric.name }}</span>
                  </td>
                </ng-container>

                <!-- Assigned Column -->
                <ng-container matColumnDef="assigned">
                  <th mat-header-cell *matHeaderCellDef>Assigned</th>
                  <td mat-cell *matCellDef="let metric">{{ metric.assigned }}</td>
                </ng-container>

                <!-- Installed Column -->
                <ng-container matColumnDef="installed">
                  <th mat-header-cell *matHeaderCellDef>Installed</th>
                  <td mat-cell *matCellDef="let metric">{{ metric.installed }}</td>
                </ng-container>

                <!-- Completion Rate Column -->
                <ng-container matColumnDef="completionRate">
                  <th mat-header-cell *matHeaderCellDef>Completion</th>
                  <td mat-cell *matCellDef="let metric">
                    <span
                      class="metric-value"
                      [class.high]="metric.completionRate >= 80"
                      [class.medium]="metric.completionRate >= 50 && metric.completionRate < 80"
                      [class.low]="metric.completionRate < 50"
                    >
                      {{ metric.completionRate }}%
                    </span>
                  </td>
                </ng-container>

                <!-- Quality Score Column -->
                <ng-container matColumnDef="qualityScore">
                  <th mat-header-cell *matHeaderCellDef>Quality</th>
                  <td mat-cell *matCellDef="let metric">
                    <span
                      class="metric-value"
                      [class.high]="metric.qualityScore >= 90"
                      [class.medium]="metric.qualityScore >= 70 && metric.qualityScore < 90"
                      [class.low]="metric.qualityScore < 70"
                    >
                      {{ metric.qualityScore }}%
                    </span>
                  </td>
                </ng-container>

                <!-- Avg Deviation Column -->
                <ng-container matColumnDef="avgDeviation">
                  <th mat-header-cell *matHeaderCellDef>Avg. Deviation</th>
                  <td mat-cell *matCellDef="let metric">
                    <span
                      class="metric-value"
                      [class.high]="metric.avgDeviation <= 10"
                      [class.medium]="metric.avgDeviation > 10 && metric.avgDeviation <= 20"
                      [class.low]="metric.avgDeviation > 20"
                    >
                      {{ metric.avgDeviation.toFixed(1) }}m
                    </span>
                  </td>
                </ng-container>

                <!-- Performance Column -->
                <ng-container matColumnDef="performance">
                  <th mat-header-cell *matHeaderCellDef>Performance</th>
                  <td mat-cell *matCellDef="let metric">
                    <span class="performance-badge" [class]="metric.performance">
                      {{ metric.performance | titlecase }}
                    </span>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="performanceColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: performanceColumns"></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Export Section -->
        <div class="export-section">
          <button mat-raised-button (click)="printReport()">
            <mat-icon>print</mat-icon>
            Print Report
          </button>
          <button mat-raised-button (click)="shareReport()">
            <mat-icon>share</mat-icon>
            Share Report
          </button>
        </div>
      }
    </div>
  `,
})
export class PoleReportsComponent implements OnInit {
  private poleService = inject(PoleTrackerService);
  private projectService = inject(ProjectService);
  private snackBar = inject(MatSnackBar);

  // Data signals
  projects = signal<Project[]>([]);
  plannedPoles = signal<PlannedPole[]>([]);
  installations = signal<PoleInstallation[]>([]);
  loading = signal(false);
  selectedProjectId = signal<string>('all');

  // Computed values
  selectedProject = computed(() => {
    const id = this.selectedProjectId();
    return this.projects().find((p) => p.id === id);
  });

  filteredPlannedPoles = computed(() => {
    const projectId = this.selectedProjectId();
    if (projectId === 'all') return this.plannedPoles();
    return this.plannedPoles().filter((p) => p.projectId === projectId);
  });

  filteredInstallations = computed(() => {
    const projectId = this.selectedProjectId();
    if (projectId === 'all') return this.installations();
    return this.installations().filter((i) => i.projectId === projectId);
  });

  // Statistics
  totalPoles = computed(() => this.filteredPlannedPoles().length);

  installedPoles = computed(
    () =>
      this.filteredPlannedPoles().filter((p) => p.status === 'installed' || p.status === 'verified')
        .length,
  );

  verifiedPoles = computed(
    () => this.filteredPlannedPoles().filter((p) => p.status === 'verified').length,
  );

  pendingPoles = computed(
    () =>
      this.filteredPlannedPoles().filter((p) => p.status === 'planned' || p.status === 'assigned')
        .length,
  );

  installationRate = computed(() => {
    const total = this.totalPoles();
    if (total === 0) return 0;
    return Math.round((this.installedPoles() / total) * 100);
  });

  verificationRate = computed(() => {
    const installed = this.installedPoles();
    if (installed === 0) return 0;
    return Math.round((this.verifiedPoles() / installed) * 100);
  });

  pendingRate = computed(() => {
    const total = this.totalPoles();
    if (total === 0) return 0;
    return Math.round((this.pendingPoles() / total) * 100);
  });

  avgDeviationMeters = computed(() => {
    const installations = this.filteredInstallations();
    if (installations.length === 0) return 0;
    const sum = installations.reduce((acc, i) => acc + (i.locationDeviation || 0), 0);
    return Math.round(sum / installations.length);
  });

  avgCompletionTime = computed(() => {
    const installations = this.filteredInstallations();
    const withTime = installations.filter((i) => i.completionTime);
    if (withTime.length === 0) return 'N/A';
    const avgMinutes =
      withTime.reduce((acc, i) => acc + (i.completionTime || 0), 0) / withTime.length;
    return `${Math.round(avgMinutes)}min`;
  });

  // Contractor metrics
  contractorMetrics = computed(() => {
    const contractors = new Map<string, any>();

    // Group by contractor
    this.filteredPlannedPoles().forEach((pole) => {
      if (pole.assignedContractorName) {
        if (!contractors.has(pole.assignedContractorName)) {
          contractors.set(pole.assignedContractorName, {
            name: pole.assignedContractorName,
            assigned: 0,
            installed: 0,
            deviations: [],
            qualityScores: [],
          });
        }
        const metric = contractors.get(pole.assignedContractorName);
        metric.assigned++;
        if (pole.status === 'installed' || pole.status === 'verified') {
          metric.installed++;
        }
      }
    });

    // Add installation metrics
    this.filteredInstallations().forEach((installation) => {
      const metric = contractors.get(installation.contractorName || '');
      if (metric) {
        metric.deviations.push(installation.locationDeviation || 0);
        if (installation.qualityScore) {
          metric.qualityScores.push(installation.qualityScore);
        }
      }
    });

    // Calculate final metrics
    return Array.from(contractors.values()).map((metric) => {
      const completionRate =
        metric.assigned > 0 ? Math.round((metric.installed / metric.assigned) * 100) : 0;
      const avgDeviation =
        metric.deviations.length > 0
          ? metric.deviations.reduce((a: number, b: number) => a + b, 0) / metric.deviations.length
          : 0;
      const qualityScore =
        metric.qualityScores.length > 0
          ? Math.round(
              metric.qualityScores.reduce((a: number, b: number) => a + b, 0) /
                metric.qualityScores.length,
            )
          : 0;

      // Calculate performance rating
      let performance = 'average';
      if (completionRate >= 90 && qualityScore >= 90 && avgDeviation <= 10) {
        performance = 'excellent';
      } else if (completionRate >= 70 && qualityScore >= 70 && avgDeviation <= 20) {
        performance = 'good';
      } else if (completionRate < 50 || qualityScore < 50 || avgDeviation > 30) {
        performance = 'poor';
      }

      return {
        ...metric,
        completionRate,
        avgDeviation,
        qualityScore: qualityScore || 85, // Default for demo
        performance,
      };
    });
  });

  performanceColumns = [
    'contractor',
    'assigned',
    'installed',
    'completionRate',
    'qualityScore',
    'avgDeviation',
    'performance',
  ];

  ngOnInit() {
    this.loadProjects();
  }

  async loadProjects() {
    this.loading.set(true);
    try {
      // Convert Observable to Promise
      const projects$ = this.projectService.getProjects();
      projects$.subscribe({
        next: (projects) => {
          this.projects.set(projects);
          // Load all pole data after projects are loaded
          this.loadAllPoleData();
        },
        error: (error) => {
          console.error('Error loading projects:', error);
          this.snackBar.open('Error loading projects', 'Close', { duration: 3000 });
          this.loading.set(false);
        },
      });
    } catch (error) {
      console.error('Error loading projects:', error);
      this.snackBar.open('Error loading projects', 'Close', { duration: 3000 });
      this.loading.set(false);
    }
  }

  async loadAllPoleData() {
    try {
      // Load planned poles and installations for all projects
      const [plannedPoles, installations] = await Promise.all([
        this.poleService.getAllPlannedPolesAsync(),
        this.poleService.getAllInstalledPoles(),
      ]);

      this.plannedPoles.set(plannedPoles);
      this.installations.set(installations);
    } catch (error) {
      console.error('Error loading pole data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async onProjectChange() {
    // Data is already loaded, just triggers computed values to update
  }

  async refreshData() {
    await this.loadProjects();
    this.snackBar.open('Data refreshed', 'Close', { duration: 2000 });
  }

  private convertToDate(date: any): Date {
    if (date instanceof Date) return date;
    if (date?.toDate) return date.toDate();
    return new Date(date);
  }

  exportCSV() {
    const data = this.prepareExportData();
    const csv = this.convertToCSV(data);
    this.downloadCSV(csv, `pole-report-${new Date().toISOString().split('T')[0]}.csv`);
  }

  private prepareExportData(): any[] {
    const poles = this.filteredPlannedPoles();
    const installationMap = new Map(this.filteredInstallations().map((i) => [i.plannedPoleId, i]));

    return poles.map((pole) => {
      const installation = installationMap.get(pole.id);
      return {
        'Pole ID': pole.clientPoleNumber,
        'VF ID': installation?.vfPoleId || 'N/A',
        Project: pole.projectName || pole.projectCode,
        Status: pole.status,
        Contractor: pole.assignedContractorName || 'Unassigned',
        'Planned Lat': pole.plannedLocation.lat,
        'Planned Lng': pole.plannedLocation.lng,
        'Actual Lat': installation?.actualLocation.lat || 'N/A',
        'Actual Lng': installation?.actualLocation.lng || 'N/A',
        'Deviation (m)': installation?.locationDeviation?.toFixed(1) || 'N/A',
        'Installed Date': installation?.installationDate
          ? this.convertToDate(installation.installationDate).toLocaleDateString('en-ZA')
          : 'N/A',
        Verified: installation?.verificationStatus || 'pending',
        'Quality Score': installation?.qualityScore || 'N/A',
      };
    });
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') ? `"${escaped}"` : escaped;
        })
        .join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  private downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open('Report exported successfully', 'Close', { duration: 3000 });
  }

  exportPDF() {
    this.snackBar.open('PDF export coming soon', 'Close', { duration: 3000 });
  }

  printReport() {
    window.print();
  }

  shareReport() {
    // Get current URL with project filter
    const url = window.location.href;

    if (navigator.share) {
      navigator
        .share({
          title: 'Pole Tracker Report',
          text: `Pole tracking report for ${this.selectedProject()?.name || 'All Projects'}`,
          url: url,
        })
        .catch((err) => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        this.snackBar.open('Report link copied to clipboard', 'Close', { duration: 3000 });
      });
    }
  }
}
