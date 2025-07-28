import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ContractorService } from '../../../contractors/services/contractor.service';
import { PoleTrackerListItem, PoleTrackerFilter, PoleType } from '../../models/pole-tracker.model';
import { PlannedPole } from '../../models/mobile-pole-tracker.model';
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
    MatPaginatorModule,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <h1>Pole Tracker</h1>
        <div class="header-actions">
          <a
            mat-button
            routerLink="/pole-tracker/grid"
            [queryParams]="{ project: selectedProjectId }"
          >
            <mat-icon>grid_on</mat-icon>
            Grid View
          </a>
          <a mat-raised-button color="primary" routerLink="/pole-tracker/new">
            <mat-icon>add</mat-icon>
            Add New Pole
          </a>
        </div>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-grid">
            <!-- Search -->
            <mat-form-field appearance="outline">
              <mat-label>Search Pole ID or Location</mat-label>
              <input
                matInput
                [ngModel]="searchTerm"
                (ngModelChange)="searchSubject.next($event)"
                placeholder="e.g., LAW.P.A001"
              />
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>

            <!-- Project Filter -->
            <mat-form-field appearance="outline">
              <mat-label>Project</mat-label>
              <mat-select [(ngModel)]="selectedProjectId" (selectionChange)="onProjectChange()">
                <mat-option value="">All Projects</mat-option>
                <mat-option *ngFor="let project of projects()" [value]="project.id">
                  {{ project.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Contractor Filter -->
            <mat-form-field appearance="outline">
              <mat-label>Contractor</mat-label>
              <mat-select
                [(ngModel)]="selectedContractorId"
                (selectionChange)="onContractorChange()"
              >
                <mat-option value="">All Contractors</mat-option>
                <mat-option *ngFor="let contractor of contractors()" [value]="contractor.id">
                  {{ contractor.companyName }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Upload Status Filter -->
            <mat-form-field appearance="outline">
              <mat-label>Upload Status</mat-label>
              <mat-select
                [(ngModel)]="uploadStatusFilter"
                (selectionChange)="onUploadStatusChange()"
              >
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
            <div class="stat-value">{{ totalPolesCount }}</div>
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
            <table
              mat-table
              [dataSource]="paginatedPoles()"
              [trackBy]="trackByPoleId"
              class="full-width-table"
            >
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
                <td mat-cell *matCellDef="let pole" class="text-column" [matTooltip]="pole.projectName || pole.projectCode">
                  <span class="text-content">{{ pole.projectName || pole.projectCode }}</span>
                </td>
              </ng-container>

              <!-- Date Installed Column -->
              <ng-container matColumnDef="dateInstalled">
                <th mat-header-cell *matHeaderCellDef>Date Installed</th>
                <td mat-cell *matCellDef="let pole">
                  {{
                    pole.dateInstalled?.toDate
                      ? (pole.dateInstalled.toDate() | date: "d MMM ''yy")
                      : (pole.dateInstalled | date: "d MMM ''yy")
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
                <td mat-cell *matCellDef="let pole" class="text-column" [matTooltip]="pole.contractorName || pole.contractorId">
                  <span class="text-content">{{ pole.contractorName || pole.contractorId }}</span>
                </td>
              </ng-container>

              <!-- Upload Progress Column -->
              <ng-container matColumnDef="uploadProgress">
                <th mat-header-cell *matHeaderCellDef>Upload Status</th>
                <td mat-cell *matCellDef="let pole" class="upload-progress-column">
                  <div class="progress-container">
                    <mat-progress-bar
                      mode="determinate"
                      [value]="pole.uploadProgress"
                      [color]="pole.uploadProgress === 100 ? 'primary' : 'accent'"
                    >
                    </mat-progress-bar>
                    <span class="progress-text">{{ pole.uploadedCount || 0 }}/6</span>
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

          <!-- Paginator -->
          <mat-paginator
            [length]="searchTerm ? filteredPoles().length : totalPolesCount"
            [pageSize]="pageSize"
            [pageSizeOptions]="pageSizeOptions"
            [pageIndex]="pageIndex"
            (page)="onPageChange($event)"
            showFirstLastButtons
          >
          </mat-paginator>
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

      .header-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .filters-card {
        margin-bottom: 24px;
      }

      .filters-card mat-card-content {
        padding: 20px !important;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
      }

      .filters-grid mat-form-field {
        width: 100%;
      }

      .filters-grid mat-form-field .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }

      .filters-grid mat-form-field .mat-mdc-floating-label {
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
        max-width: none;
      }

      .filters-grid mat-form-field .mat-mdc-form-field-label-wrapper {
        overflow: visible;
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
        min-width: 1200px;
        table-layout: fixed;
      }

      .full-width-table th,
      .full-width-table td {
        padding: 8px 12px !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Column specific widths */
      .full-width-table .mat-column-vfPoleId {
        width: 120px;
      }

      .full-width-table .mat-column-poleNumber {
        width: 100px;
      }

      .full-width-table .mat-column-pon {
        width: 80px;
      }

      .full-width-table .mat-column-zone {
        width: 80px;
      }

      .full-width-table .mat-column-location {
        width: 140px;
      }

      .full-width-table .mat-column-project {
        width: 150px;
        max-width: 150px;
      }

      .full-width-table .mat-column-dateInstalled {
        width: 110px;
      }

      .full-width-table .mat-column-type {
        width: 100px;
      }

      .full-width-table .mat-column-contractor {
        width: 160px;
        max-width: 160px;
      }

      .full-width-table .mat-column-uploadProgress {
        width: 140px;
        max-width: 140px;
      }

      .full-width-table .mat-column-qualityCheck {
        width: 80px;
      }

      .full-width-table .mat-column-actions {
        width: 100px;
      }

      /* Text column styling */
      .text-column {
        max-width: 0;
      }

      .text-content {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pole-link {
        color: #3f51b5;
        text-decoration: none;
        font-weight: 500;
      }

      .pole-link:hover {
        text-decoration: underline;
      }

      .upload-progress-column {
        padding-left: 8px !important;
        padding-right: 8px !important;
      }

      .progress-container {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
      }

      .progress-container mat-progress-bar {
        flex: 1;
        min-width: 60px;
      }

      .progress-text {
        font-size: 11px;
        color: #666;
        min-width: 30px;
        flex-shrink: 0;
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
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
})
export class PoleTrackerListComponent implements OnInit, OnDestroy {
  private poleTrackerService = inject(PoleTrackerService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Debouncing for search
  searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

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

  // Pagination
  pageSize = 50;
  pageIndex = 0;
  totalPolesCount = 0;
  pageSizeOptions = [25, 50, 100];
  displayedTotal = computed(() => this.filteredPoles().length);

  // Performance optimization
  trackByPoleId = (index: number, pole: PoleTrackerListItem) => pole.id;

  displayedColumns = [
    'vfPoleId',
    'poleNumber',
    'pon',
    'zone',
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

    // Apply search filter only (upload status is handled server-side)
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (pole) =>
          (pole.vfPoleId && pole.vfPoleId.toLowerCase().includes(search)) ||
          (pole.poleNumber && pole.poleNumber.toLowerCase().includes(search)) ||
          (pole.location && typeof pole.location === 'string' && pole.location.toLowerCase().includes(search)) ||
          (pole.pon && pole.pon.toLowerCase().includes(search)) ||
          (pole.zone && pole.zone.toLowerCase().includes(search)) ||
          (pole.contractorName && pole.contractorName.toLowerCase().includes(search))
      );
    }

    return filtered;
  });

  // Paginated poles for display
  paginatedPoles = computed(() => {
    const filtered = this.filteredPoles();

    // If we're searching and have loaded all data, paginate client-side
    if (this.searchTerm && filtered.length > 0) {
      const startIndex = this.pageIndex * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      return filtered.slice(startIndex, endIndex);
    }

    // Otherwise, the data is already paginated from the server
    return filtered;
  });

  // Stats are calculated from the current page only (for performance)
  qualityCheckedCount = computed(
    () => this.paginatedPoles().filter((p) => p.qualityChecked).length,
  );
  completeUploadsCount = computed(
    () => this.paginatedPoles().filter((p) => p.allUploadsComplete).length,
  );
  installationProgress = computed(() => {
    const total = this.searchTerm ? this.filteredPoles().length : this.totalPolesCount;
    const installed = this.paginatedPoles().filter((p) => p.dateInstalled).length;
    return total > 0 ? Math.round((installed / total) * 100) : 0;
  });
  // Note: These stats are for the current page only.
  // For project-wide stats, we'd need a separate aggregation query

  ngOnInit() {
    // Set up search debouncing
    this.searchSubject
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300), // Wait 300ms after user stops typing
        distinctUntilChanged(),
      )
      .subscribe((searchTerm) => {
        this.searchTerm = searchTerm;
        this.pageIndex = 0;
        this.updateUrlParams();
        // Don't reload data on search - let the computed signal filter locally
      });

    // Restore filters from URL parameters
    this.route.queryParams.subscribe((params) => {
      this.selectedProjectId = params['project'] || '';
      this.selectedContractorId = params['contractor'] || '';
      this.searchTerm = params['search'] || '';
      this.uploadStatusFilter = params['uploadStatus'] || 'all';
      this.pageIndex = +params['page'] || 0;
      this.pageSize = +params['pageSize'] || 50;

      // Save current filters to session storage if they exist
      if (Object.keys(params).length > 0) {
        const queryParams: any = {};
        if (this.selectedProjectId) queryParams.project = this.selectedProjectId;
        if (this.selectedContractorId) queryParams.contractor = this.selectedContractorId;
        if (this.searchTerm) queryParams.search = this.searchTerm;
        if (this.uploadStatusFilter !== 'all') queryParams.uploadStatus = this.uploadStatusFilter;
        if (this.pageIndex > 0) queryParams.page = this.pageIndex;
        if (this.pageSize !== 50) queryParams.pageSize = this.pageSize;

        sessionStorage.setItem('poleTrackerFilters', JSON.stringify(queryParams));
      }

      this.loadData();
    });
  }

  loadData() {
    this.loading.set(true);

    // Load projects first, then apply filters
    this.projectService.getProjects().subscribe((projects) => {
      this.projects.set(projects);
      // After projects are loaded, apply filters if we have a selected project
      if (this.selectedProjectId) {
        this.applyFilters();
      } else {
        this.loading.set(false);
      }
    });

    // Load contractors
    this.contractorService.getContractors().subscribe((contractors) => {
      this.contractors.set(contractors);
    });
  }

  applyFilters() {
    // If no project is selected, don't load anything
    if (!this.selectedProjectId) {
      this.poles.set([]);
      this.loading.set(false);
      this.totalPolesCount = 0;
      return;
    }

    // If searching, load all data (no pagination) to search across all results
    if (this.searchTerm) {
      this.poleTrackerService.getPlannedPolesByProject(this.selectedProjectId).subscribe({
        next: (allPoles) => {
          this.totalPolesCount = allPoles.length;

          // Convert PlannedPole to PoleTrackerListItem format
          const poleTrackerItems: PoleTrackerListItem[] = allPoles.map((pole) => {
            const poleData = pole as any;

            // Calculate upload progress for planned poles (if they have uploads)
            const uploads = poleData.uploads || {
              before: { uploaded: false },
              front: { uploaded: false },
              side: { uploaded: false },
              depth: { uploaded: false },
              concrete: { uploaded: false },
              compaction: { uploaded: false },
            };

            const uploadedCount = Object.values(uploads).filter(
              (upload: any) => upload.uploaded,
            ).length;
            const uploadProgress = Math.round((uploadedCount / 6) * 100);

            // Convert location to string if it's an object
            let locationString = '';
            if (poleData.location) {
              if (typeof poleData.location === 'string') {
                locationString = poleData.location;
              } else if (poleData.location.latitude && poleData.location.longitude) {
                locationString = `${poleData.location.latitude}, ${poleData.location.longitude}`;
              } else if (poleData.location.lat && poleData.location.lng) {
                locationString = `${poleData.location.lat}, ${poleData.location.lng}`;
              }
            } else if (poleData.plannedLocation) {
              if (poleData.plannedLocation.lat && poleData.plannedLocation.lng) {
                locationString = `${poleData.plannedLocation.lat}, ${poleData.plannedLocation.lng}`;
              }
            }

            return {
              id: poleData.id,
              vfPoleId: poleData.vfPoleId || poleData.poleNumber,
              projectId: poleData.projectId,
              projectCode: poleData.projectCode || 'Law-001',
              poleNumber: poleData.poleNumber,
              pon: poleData.ponNumber || '-',
              zone: poleData.zoneNumber || '-',
              distributionFeeder: poleData.distributionFeeder || poleData.poleType || '-',
              poleType: poleData.poleType,
              location: locationString,
              contractorId: poleData.contractorId || null,
              contractorName: poleData.contractorName || null,
              workingTeam: poleData.workingTeam || 'Import Team',
              dateInstalled: poleData.dateInstalled || poleData.createdAt,
              maxCapacity: poleData.maxCapacity || 12,
              connectedDrops: poleData.connectedDrops || [],
              dropCount: poleData.dropCount || 0,
              uploads: uploads,
              qualityChecked: poleData.qualityChecked || false,
              qualityCheckedBy: poleData.qualityCheckedBy,
              qualityCheckedByName: poleData.qualityCheckedByName,
              qualityCheckDate: poleData.qualityCheckDate,
              qualityCheckNotes: poleData.qualityCheckNotes,
              createdAt: poleData.createdAt,
              updatedAt: poleData.updatedAt,
              createdBy: poleData.createdBy,
              createdByName: poleData.createdByName,
              updatedBy: poleData.updatedBy,
              updatedByName: poleData.updatedByName,
              uploadProgress: uploadProgress,
              uploadedCount: uploadedCount,
              allUploadsComplete: uploadedCount === 6,
            };
          });

          // Apply filters
          let filteredPoles = poleTrackerItems;

          if (this.selectedContractorId) {
            filteredPoles = filteredPoles.filter(
              (pole) => pole.contractorId === this.selectedContractorId,
            );
          }

          if (this.uploadStatusFilter !== 'all') {
            filteredPoles = filteredPoles.filter((pole) => {
              const isComplete = pole.allUploadsComplete;
              return this.uploadStatusFilter === 'complete' ? isComplete : !isComplete;
            });
          }

          this.poles.set(filteredPoles);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading all poles for search:', error);
          this.loading.set(false);
        },
      });
      return;
    }

    // Use paginated query for better performance when not searching
    this.poleTrackerService
      .getPlannedPolesByProjectPaginated(this.selectedProjectId, this.pageSize, this.pageIndex)
      .subscribe({
        next: (result) => {
          this.totalPolesCount = result.total;

          // Convert PlannedPole to PoleTrackerListItem format
          const poleTrackerItems: PoleTrackerListItem[] = result.poles.map((pole) => {
            const poleData = pole as any; // Type assertion to access all fields

            // Calculate upload progress for planned poles (if they have uploads)
            const uploads = poleData.uploads || {
              before: { uploaded: false },
              front: { uploaded: false },
              side: { uploaded: false },
              depth: { uploaded: false },
              concrete: { uploaded: false },
              compaction: { uploaded: false },
            };

            const uploadedCount = Object.values(uploads).filter(
              (upload: any) => upload.uploaded,
            ).length;
            const uploadProgress = Math.round((uploadedCount / 6) * 100);

            // Convert location to string if it's an object
            let locationString = '';
            if (poleData.location) {
              if (typeof poleData.location === 'string') {
                locationString = poleData.location;
              } else if (poleData.location.latitude && poleData.location.longitude) {
                locationString = `${poleData.location.latitude}, ${poleData.location.longitude}`;
              } else if (poleData.location.lat && poleData.location.lng) {
                locationString = `${poleData.location.lat}, ${poleData.location.lng}`;
              }
            } else if (poleData.plannedLocation) {
              if (poleData.plannedLocation.lat && poleData.plannedLocation.lng) {
                locationString = `${poleData.plannedLocation.lat}, ${poleData.plannedLocation.lng}`;
              }
            }

            return {
              id: poleData.id,
              vfPoleId: poleData.vfPoleId || poleData.poleNumber,
              projectId: poleData.projectId,
              projectCode: poleData.projectCode || 'Law-001',
              poleNumber: poleData.poleNumber,
              pon: poleData.ponNumber || '-',
              zone: poleData.zoneNumber || '-',
              distributionFeeder: poleData.distributionFeeder || poleData.poleType || '-',
              poleType: poleData.poleType,
              location: locationString,
              contractorId: poleData.contractorId || null,
              contractorName: poleData.contractorName || null,
              workingTeam: poleData.workingTeam || 'Import Team',
              dateInstalled: poleData.dateInstalled || poleData.createdAt,
              maxCapacity: poleData.maxCapacity || 12,
              connectedDrops: poleData.connectedDrops || [],
              dropCount: poleData.dropCount || 0,
              uploads: uploads,
              qualityChecked: poleData.qualityChecked || false,
              qualityCheckedBy: poleData.qualityCheckedBy,
              qualityCheckedByName: poleData.qualityCheckedByName,
              qualityCheckDate: poleData.qualityCheckDate,
              qualityCheckNotes: poleData.qualityCheckNotes,
              createdAt: poleData.createdAt,
              updatedAt: poleData.updatedAt,
              createdBy: poleData.createdBy,
              createdByName: poleData.createdByName,
              updatedBy: poleData.updatedBy,
              updatedByName: poleData.updatedByName,
              // Calculate upload progress
              uploadProgress: uploadProgress,
              uploadedCount: uploadedCount,
              allUploadsComplete: uploadedCount === 6,
            };
          });

          // Filter by contractor and upload status
          let filteredPoles = poleTrackerItems;

          if (this.selectedContractorId) {
            filteredPoles = filteredPoles.filter(
              (pole) => pole.contractorId === this.selectedContractorId,
            );
          }

          // Apply upload status filter
          if (this.uploadStatusFilter !== 'all') {
            filteredPoles = filteredPoles.filter((pole) => {
              const isComplete = pole.allUploadsComplete;
              return this.uploadStatusFilter === 'complete' ? isComplete : !isComplete;
            });
          }

          this.poles.set(filteredPoles);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading planned poles:', error);

          // Fallback to regular pole-trackers collection
          const filter: PoleTrackerFilter = {};
          if (this.selectedProjectId) {
            filter.projectId = this.selectedProjectId;
          }
          if (this.selectedContractorId) {
            filter.contractorId = this.selectedContractorId;
          }

          this.poleTrackerService.getPoleTrackers(filter).subscribe({
            next: (poles) => {
              // Add uploadedCount to regular pole tracker items
              const polesWithCount = poles.map((pole) => ({
                ...pole,
                uploadedCount: pole.uploads
                  ? Object.values(pole.uploads).filter((upload) => upload.uploaded).length
                  : 0,
              }));
              this.poles.set(polesWithCount);
              this.loading.set(false);
            },
            error: (fallbackError) => {
              console.error('Error loading pole trackers:', fallbackError);
              this.loading.set(false);
            },
          });
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

  // Handle pagination changes
  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateUrlParams();
    this.applyFilters();
  }

  // Handle upload status filter changes
  onUploadStatusChange() {
    this.pageIndex = 0; // Reset to first page
    this.updateUrlParams();
    this.applyFilters();
  }

  // Update URL parameters when filters change
  private updateUrlParams() {
    const queryParams: any = {};

    if (this.selectedProjectId) queryParams.project = this.selectedProjectId;
    if (this.selectedContractorId) queryParams.contractor = this.selectedContractorId;
    if (this.searchTerm) queryParams.search = this.searchTerm;
    if (this.uploadStatusFilter !== 'all') queryParams.uploadStatus = this.uploadStatusFilter;
    if (this.pageIndex > 0) queryParams.page = this.pageIndex;
    if (this.pageSize !== 50) queryParams.pageSize = this.pageSize;

    // Store current filters in session storage for back navigation
    sessionStorage.setItem('poleTrackerFilters', JSON.stringify(queryParams));

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  // Reset pagination when changing filters
  onProjectChange() {
    this.pageIndex = 0; // Reset to first page
    this.updateUrlParams();
    this.applyFilters();
  }

  onContractorChange() {
    this.pageIndex = 0; // Reset to first page
    this.updateUrlParams();
    this.applyFilters();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
