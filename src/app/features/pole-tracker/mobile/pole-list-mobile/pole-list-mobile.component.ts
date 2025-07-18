import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ContractorService } from '../../../contractors/services/contractor.service';
import { PoleTrackerListItem, PoleTrackerFilter } from '../../models/pole-tracker.model';
import { Project } from '../../../../core/models/project.model';
import { Contractor } from '../../../contractors/models/contractor.model';
import { Timestamp } from 'firebase/firestore';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-pole-list-mobile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatBottomSheetModule,
  ],
  template: `
    <div class="mobile-container">
      <!-- Header -->
      <div class="mobile-header">
        <h1>Pole Tracker</h1>
        <button mat-icon-button (click)="showFilters.set(!showFilters())">
          <mat-icon>filter_list</mat-icon>
        </button>
      </div>

      <!-- Stats Summary -->
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value">{{ totalPoles() }}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ qualityCheckedCount() }}</div>
          <div class="stat-label">QA ✓</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ completeUploadsCount() }}</div>
          <div class="stat-label">Complete</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ installationProgress() }}%</div>
          <div class="stat-label">Progress</div>
        </div>
      </div>

      <!-- Filters (Collapsible) -->
      <mat-card class="filters-card" [class.hidden]="!showFilters()">
        <mat-card-content>
          <!-- Search -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Search Pole ID</mat-label>
            <input matInput [(ngModel)]="searchTerm" placeholder="e.g., LAW.P.A001" />
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>

          <!-- Project Filter -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Project</mat-label>
            <mat-select [(ngModel)]="selectedProjectId" (selectionChange)="applyFilters()">
              <mat-option value="">All Projects</mat-option>
              <mat-option *ngFor="let project of projects()" [value]="project.id">
                {{ project.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Upload Status Filter -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Upload Status</mat-label>
            <mat-select [(ngModel)]="uploadStatusFilter" (selectionChange)="applyFilters()">
              <mat-option value="all">All</mat-option>
              <mat-option value="complete">Complete</mat-option>
              <mat-option value="incomplete">Incomplete</mat-option>
            </mat-select>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <!-- Pole Cards -->
      <div class="poles-list">
        <mat-card
          *ngFor="let pole of filteredPoles(); trackBy: trackByPoleId"
          class="pole-card"
          [routerLink]="['/pole-tracker', pole.id]"
        >
          <mat-card-header>
            <div class="pole-header">
              <div class="pole-id">{{ pole.vfPoleId }}</div>
              <div class="pole-status">
                <mat-icon
                  [color]="pole.qualityChecked ? 'primary' : ''"
                  [matTooltip]="pole.qualityChecked ? 'Quality Checked' : 'Pending QA'"
                  class="qa-icon"
                >
                  {{ pole.qualityChecked ? 'check_circle' : 'pending' }}
                </mat-icon>
              </div>
            </div>
          </mat-card-header>

          <mat-card-content>
            <!-- Main Info -->
            <div class="pole-info">
              <div class="info-row" *ngIf="pole.projectName">
                <mat-icon class="info-icon">business</mat-icon>
                <span>{{ pole.projectName }}</span>
              </div>

              <div class="info-row" *ngIf="pole.location">
                <mat-icon class="info-icon">location_on</mat-icon>
                <span class="gps-text">{{ pole.location }}</span>
              </div>

              <div class="info-row" *ngIf="pole.poleNumber">
                <mat-icon class="info-icon">confirmation_number</mat-icon>
                <span>Pole #{{ pole.poleNumber }}</span>
              </div>

              <div class="info-row" *ngIf="pole.contractorName">
                <mat-icon class="info-icon">engineering</mat-icon>
                <span>{{ pole.contractorName }}</span>
              </div>

              <div class="info-row" *ngIf="pole.dateInstalled">
                <mat-icon class="info-icon">event</mat-icon>
                <span>
                  {{ formatDate(pole.dateInstalled) }}
                </span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-section">
              <div class="progress-label">
                <span>Upload Progress</span>
                <span class="progress-text">{{ pole.uploadProgress }}%</span>
              </div>
              <mat-progress-bar
                mode="determinate"
                [value]="pole.uploadProgress"
                [color]="pole.uploadProgress === 100 ? 'primary' : 'accent'"
              >
              </mat-progress-bar>
            </div>

            <!-- Type Chip -->
            <div class="chip-section" *ngIf="pole.poleType">
              <mat-chip [class]="'type-' + pole.poleType">
                {{ pole.poleType | titlecase }}
              </mat-chip>
            </div>
          </mat-card-content>

          <!-- Quick Actions -->
          <mat-card-actions class="card-actions">
            <button
              mat-button
              [routerLink]="['/pole-tracker/mobile/capture', pole.id]"
              (click)="$event.stopPropagation()"
            >
              <mat-icon>camera_alt</mat-icon>
              Capture
            </button>

            <button
              mat-button
              [routerLink]="['/pole-tracker', pole.id, 'edit']"
              (click)="$event.stopPropagation()"
            >
              <mat-icon>edit</mat-icon>
              Edit
            </button>

            <button
              mat-icon-button
              [routerLink]="['/pole-tracker/mobile/map']"
              [queryParams]="{ poleId: pole.id }"
              (click)="$event.stopPropagation()"
              matTooltip="View on Map"
            >
              <mat-icon>map</mat-icon>
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Floating Action Button -->
      <button mat-fab color="primary" class="add-fab" routerLink="/pole-tracker/new">
        <mat-icon>add</mat-icon>
      </button>

      <!-- Empty State -->
      <div *ngIf="filteredPoles().length === 0 && !loading()" class="empty-state">
        <mat-icon class="empty-icon">location_off</mat-icon>
        <h3>No poles found</h3>
        <p>Try adjusting your filters or add a new pole.</p>
        <button mat-raised-button color="primary" routerLink="/pole-tracker/new">
          Add First Pole
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-state">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>Loading poles...</p>
      </div>
    </div>
  `,
  styles: [
    `
      .mobile-container {
        padding: 16px;
        padding-bottom: 80px; /* Space for FAB */
      }

      .mobile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding: 0 8px;
      }

      .mobile-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
      }

      /* Stats Row */
      .stats-row {
        display: flex;
        justify-content: space-around;
        background: white;
        border-radius: 12px;
        padding: 16px 8px;
        margin-bottom: 16px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .stat-item {
        text-align: center;
        flex: 1;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 600;
        color: #3f51b5;
        line-height: 1;
      }

      .stat-label {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }

      /* Filters */
      .filters-card {
        margin-bottom: 16px;
        transition: all 0.3s ease;
      }

      .filters-card.hidden {
        display: none;
      }

      .full-width {
        width: 100%;
        margin-bottom: 8px;
      }

      /* Pole Cards */
      .poles-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .pole-card {
        cursor: pointer;
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
        border-radius: 12px;
        overflow: hidden;
      }

      .pole-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .pole-card:active {
        transform: translateY(0);
      }

      /* Card Header */
      .pole-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .pole-id {
        font-size: 18px;
        font-weight: 600;
        color: #3f51b5;
      }

      .pole-status {
        display: flex;
        align-items: center;
      }

      .qa-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      /* Card Content */
      .pole-info {
        margin-bottom: 16px;
      }

      .info-row {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        font-size: 14px;
      }

      .info-row:last-child {
        margin-bottom: 0;
      }

      .info-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 8px;
        color: #666;
      }

      .gps-text {
        font-family: monospace;
        font-size: 12px;
        color: #1976d2;
      }

      /* Progress Section */
      .progress-section {
        margin-bottom: 16px;
      }

      .progress-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .progress-text {
        font-size: 12px;
        color: #666;
        font-weight: 500;
      }

      /* Chip Section */
      .chip-section {
        margin-bottom: 8px;
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

      /* Card Actions */
      .card-actions {
        padding: 8px 16px;
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .card-actions button {
        font-size: 12px;
        padding: 0 8px;
        min-width: auto;
      }

      .card-actions mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }

      /* FAB */
      .add-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10;
      }

      /* Empty State */
      .empty-state {
        text-align: center;
        padding: 48px 24px;
        color: #666;
      }

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        color: #ccc;
      }

      .empty-state h3 {
        margin-bottom: 8px;
        color: #333;
      }

      .empty-state p {
        margin-bottom: 24px;
      }

      /* Loading State */
      .loading-state {
        text-align: center;
        padding: 48px 24px;
      }

      .loading-state p {
        margin-top: 16px;
        color: #666;
      }

      /* Responsive adjustments */
      @media (max-width: 480px) {
        .mobile-container {
          padding: 12px;
        }

        .stat-value {
          font-size: 20px;
        }

        .pole-id {
          font-size: 16px;
        }

        .info-row {
          font-size: 13px;
        }
      }
    `,
  ],
})
export class PoleListMobileComponent implements OnInit {
  private poleTrackerService = inject(PoleTrackerService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // State
  poles = signal<PoleTrackerListItem[]>([]);
  projects = signal<Project[]>([]);
  contractors = signal<Contractor[]>([]);
  loading = signal(true);
  showFilters = signal(false);

  // Filters
  searchTerm = '';
  selectedProjectId = '';
  selectedContractorId = '';
  uploadStatusFilter: 'all' | 'complete' | 'incomplete' = 'all';

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
        this.snackBar.open('Error loading poles', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  trackByPoleId(index: number, pole: PoleTrackerListItem): string {
    return pole.id || index.toString();
  }

  formatDate(dateValue: Date | Timestamp | undefined): string {
    if (!dateValue) return '';

    const date = dateValue instanceof Date ? dateValue : (dateValue as Timestamp).toDate();
    return new DatePipe('en-US').transform(date, "d MMM 'yy") || '';
  }
}
