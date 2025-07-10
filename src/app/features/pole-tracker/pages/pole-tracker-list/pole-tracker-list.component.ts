import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ContractorService } from '../../../contractors/services/contractor.service';
import { PoleTrackerListItem, PoleTrackerFilter, PoleType } from '../../models/pole-tracker.model';
import { Project } from '../../../../core/models/project.model';
import { Contractor } from '../../../contractors/models/contractor.model';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-pole-tracker-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <h1>Pole Tracker</h1>
        <a mat-raised-button color="primary" routerLink="/pole-tracker/new">
          <mat-icon>add</mat-icon>
          Add New Pole
        </a>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-grid">
            <!-- Search -->
            <mat-form-field appearance="outline">
              <mat-label>Search Pole ID</mat-label>
              <input matInput [(ngModel)]="searchTerm" placeholder="e.g., LAW.P.A001" />
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>

            <!-- Project Filter -->
            <mat-form-field appearance="outline">
              <mat-label>Project</mat-label>
              <mat-select [(ngModel)]="selectedProjectId" (selectionChange)="applyFilters()">
                <mat-option value="">All Projects</mat-option>
                <mat-option *ngFor="let project of projects()" [value]="project.id">
                  {{ project.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Contractor Filter -->
            <mat-form-field appearance="outline">
              <mat-label>Contractor</mat-label>
              <mat-select [(ngModel)]="selectedContractorId" (selectionChange)="applyFilters()">
                <mat-option value="">All Contractors</mat-option>
                <mat-option *ngFor="let contractor of contractors()" [value]="contractor.id">
                  {{ contractor.companyName }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Upload Status Filter -->
            <mat-form-field appearance="outline">
              <mat-label>Upload Status</mat-label>
              <mat-select [(ngModel)]="uploadStatusFilter" (selectionChange)="applyFilters()">
                <mat-option value="all">All</mat-option>
                <mat-option value="complete">Complete</mat-option>
                <mat-option value="incomplete">Incomplete</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Stats Summary -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ totalPoles() }}</div>
            <div class="stat-label">Total Poles</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ qualityCheckedCount() }}</div>
            <div class="stat-label">Quality Checked</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ completeUploadsCount() }}</div>
            <div class="stat-label">All Images Uploaded</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ installationProgress() }}%</div>
            <div class="stat-label">Installation Progress</div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Table -->
      <mat-card class="table-card">
        <mat-card-content>
          <div class="table-container">
            <table mat-table [dataSource]="filteredPoles()" class="full-width-table">
              <!-- VF Pole ID Column -->
              <ng-container matColumnDef="vfPoleId">
                <th mat-header-cell *matHeaderCellDef>VF Pole ID</th>
                <td mat-cell *matCellDef="let pole">
                  <a [routerLink]="['/pole-tracker', pole.id]" class="pole-link">
                    {{ pole.vfPoleId }}
                  </a>
                </td>
              </ng-container>

              <!-- Pole Number Column -->
              <ng-container matColumnDef="poleNumber">
                <th mat-header-cell *matHeaderCellDef>Pole #</th>
                <td mat-cell *matCellDef="let pole">{{ pole.poleNumber || '-' }}</td>
              </ng-container>

              <!-- PON Column -->
              <ng-container matColumnDef="pon">
                <th mat-header-cell *matHeaderCellDef>PON</th>
                <td mat-cell *matCellDef="let pole">{{ pole.pon || '-' }}</td>
              </ng-container>

              <!-- Zone Column -->
              <ng-container matColumnDef="zone">
                <th mat-header-cell *matHeaderCellDef>Zone</th>
                <td mat-cell *matCellDef="let pole">{{ pole.zone || '-' }}</td>
              </ng-container>

              <!-- Distribution/Feeder Column -->
              <ng-container matColumnDef="distributionFeeder">
                <th mat-header-cell *matHeaderCellDef>Dist/Feeder</th>
                <td mat-cell *matCellDef="let pole">{{ pole.distributionFeeder || '-' }}</td>
              </ng-container>

              <!-- Project Column -->
              <ng-container matColumnDef="project">
                <th mat-header-cell *matHeaderCellDef>Project</th>
                <td mat-cell *matCellDef="let pole">{{ pole.projectName || pole.projectCode }}</td>
              </ng-container>

              <!-- Date Installed Column -->
              <ng-container matColumnDef="dateInstalled">
                <th mat-header-cell *matHeaderCellDef>Date Installed</th>
                <td mat-cell *matCellDef="let pole">
                  {{
                    pole.dateInstalled?.toDate
                      ? (pole.dateInstalled.toDate() | date:"d MMM ''yy")
                      : (pole.dateInstalled | date:"d MMM ''yy")
                  }}
                </td>
              </ng-container>

              <!-- GPS Location Column -->
              <ng-container matColumnDef="location">
                <th mat-header-cell *matHeaderCellDef>GPS</th>
                <td mat-cell *matCellDef="let pole">
                  <span class="gps-location">{{ pole.location }}</span>
                </td>
              </ng-container>

              <!-- Type Column -->
              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let pole">
                  <mat-chip [class]="'type-' + pole.poleType">
                    {{ pole.poleType | titlecase }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Contractor Column -->
              <ng-container matColumnDef="contractor">
                <th mat-header-cell *matHeaderCellDef>Contractor</th>
                <td mat-cell *matCellDef="let pole">
                  {{ pole.contractorName || pole.contractorId }}
                </td>
              </ng-container>

              <!-- Upload Progress Column -->
              <ng-container matColumnDef="uploadProgress">
                <th mat-header-cell *matHeaderCellDef>Upload Progress</th>
                <td mat-cell *matCellDef="let pole">
                  <div class="progress-container">
                    <mat-progress-bar
                      mode="determinate"
                      [value]="pole.uploadProgress"
                      [color]="pole.uploadProgress === 100 ? 'primary' : 'accent'"
                    >
                    </mat-progress-bar>
                    <span class="progress-text">{{ pole.uploadProgress }}%</span>
                  </div>
                </td>
              </ng-container>

              <!-- Quality Check Column -->
              <ng-container matColumnDef="qualityCheck">
                <th mat-header-cell *matHeaderCellDef>QA Status</th>
                <td mat-cell *matCellDef="let pole">
                  <mat-icon
                    [color]="pole.qualityChecked ? 'primary' : ''"
                    [matTooltip]="pole.qualityChecked ? 'Quality Checked' : 'Pending QA'"
                  >
                    {{ pole.qualityChecked ? 'check_circle' : 'pending' }}
                  </mat-icon>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let pole">
                  <a
                    mat-icon-button
                    [routerLink]="['/pole-tracker', pole.id, 'edit']"
                    matTooltip="Edit"
                  >
                    <mat-icon>edit</mat-icon>
                  </a>
                  <button
                    mat-icon-button
                    (click)="deletePole(pole)"
                    matTooltip="Delete"
                    color="warn"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .page-header h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 500;
      }

      .filters-card {
        margin-bottom: 24px;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .stat-card {
        text-align: center;
      }

      .stat-value {
        font-size: 36px;
        font-weight: 500;
        color: #3f51b5;
      }

      .stat-label {
        font-size: 14px;
        color: #666;
        margin-top: 8px;
      }

      .table-container {
        overflow-x: auto;
      }

      .full-width-table {
        width: 100%;
        min-width: 1000px;
      }

      .pole-link {
        color: #3f51b5;
        text-decoration: none;
        font-weight: 500;
      }

      .pole-link:hover {
        text-decoration: underline;
      }

      .progress-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .progress-container mat-progress-bar {
        flex: 1;
      }

      .progress-text {
        font-size: 12px;
        color: #666;
        min-width: 35px;
      }

      mat-chip {
        font-size: 12px;
      }

      mat-chip.type-wooden {
        background-color: #8d6e63;
        color: white;
      }

      mat-chip.type-concrete {
        background-color: #616161;
        color: white;
      }

      mat-chip.type-steel {
        background-color: #455a64;
        color: white;
      }

      mat-chip.type-composite {
        background-color: #5d4037;
        color: white;
      }

      .gps-location {
        font-family: monospace;
        font-size: 12px;
        color: #1976d2;
      }

      .table-container {
        overflow-x: auto;
      }

      table {
        min-width: 1200px;
      }
    `,
  ],
})
export class PoleTrackerListComponent implements OnInit {
  private poleTrackerService = inject(PoleTrackerService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // State
  poles = signal<PoleTrackerListItem[]>([]);
  projects = signal<Project[]>([]);
  contractors = signal<Contractor[]>([]);
  loading = signal(true);

  // Filters
  searchTerm = '';
  selectedProjectId = '';
  selectedContractorId = '';
  uploadStatusFilter: 'all' | 'complete' | 'incomplete' = 'all';

  displayedColumns = [
    'vfPoleId',
    'poleNumber',
    'pon',
    'zone',
    'distributionFeeder',
    'location',
    'project',
    'dateInstalled',
    'type',
    'contractor',
    'uploadProgress',
    'qualityCheck',
    'actions',
  ];

  // Computed values
  filteredPoles = computed(() => {
    let filtered = this.poles();

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (pole) =>
          pole.vfPoleId.toLowerCase().includes(search) ||
          pole.location?.toLowerCase().includes(search),
      );
    }

    // Apply upload status filter
    if (this.uploadStatusFilter !== 'all') {
      filtered = filtered.filter((pole) => {
        const isComplete = pole.allUploadsComplete;
        return this.uploadStatusFilter === 'complete' ? isComplete : !isComplete;
      });
    }

    return filtered;
  });

  totalPoles = computed(() => this.filteredPoles().length);
  qualityCheckedCount = computed(() => this.filteredPoles().filter((p) => p.qualityChecked).length);
  completeUploadsCount = computed(
    () => this.filteredPoles().filter((p) => p.allUploadsComplete).length,
  );
  installationProgress = computed(() => {
    const total = this.totalPoles();
    return total > 0 ? Math.round((this.completeUploadsCount() / total) * 100) : 0;
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    // Load projects
    this.projectService.getProjects().subscribe((projects) => {
      this.projects.set(projects);
    });

    // Load contractors
    this.contractorService.getContractors().subscribe((contractors) => {
      this.contractors.set(contractors);
    });

    // Load initial poles
    this.applyFilters();
  }

  applyFilters() {
    const filter: PoleTrackerFilter = {};

    if (this.selectedProjectId) {
      filter.projectId = this.selectedProjectId;
    }
    if (this.selectedContractorId) {
      filter.contractorId = this.selectedContractorId;
    }

    this.poleTrackerService.getPoleTrackers(filter).subscribe({
      next: (poles) => {
        this.poles.set(poles);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading poles:', error);
        this.loading.set(false);
      },
    });
  }

  deletePole(pole: PoleTrackerListItem) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Pole Entry',
        message: `Are you sure you want to delete pole ${pole.vfPoleId}?`,
        confirmText: 'Delete',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.poleTrackerService.deletePoleTracker(pole.id!).subscribe({
          next: () => {
            this.snackBar.open('Pole entry deleted successfully', 'Close', {
              duration: 3000,
            });
            this.applyFilters();
          },
          error: (error) => {
            console.error('Error deleting pole:', error);
            this.snackBar.open('Error deleting pole entry', 'Close', {
              duration: 3000,
            });
          },
        });
      }
    });
  }
}
