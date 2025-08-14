import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ContractorService } from '../../services/contractor.service';
import { ContractorProjectService } from '../../services/contractor-project.service';
import {
  Contractor,
  ContractorStatus,
  ContractorService as ContractorServiceType,
  CONTRACTOR_SERVICES,
} from '../../models/contractor.model';
import { ContractorProjectSummary } from '../../models/contractor-project.model';
import { ContractorFormComponent } from '../contractor-form/contractor-form.component';
import { ContractorImportComponent } from '../contractor-import/contractor-import.component';

@Component({
  selector: 'app-contractor-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    FormsModule,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Header -->
      <div class="ff-page-header">
        <div class="header-content">
          <h1 class="page-title">Contractors</h1>
          <p class="page-subtitle">Manage contractor relationships and project assignments</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="accent" (click)="openImportDialog()">
            <mat-icon>upload</mat-icon>
            Import Contractors
          </button>
          <button mat-raised-button color="primary" (click)="openAddDialog()">
            <mat-icon>add</mat-icon>
            Add Contractor
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Search</mat-label>
          <input
            matInput
            [(ngModel)]="searchTerm"
            (ngModelChange)="applyFilter()"
            placeholder="Search by name, registration number..."
          />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
            <mat-option value="">All</mat-option>
            <mat-option value="pending_approval">Pending Approval</mat-option>
            <mat-option value="active">Active</mat-option>
            <mat-option value="suspended">Suspended</mat-option>
            <mat-option value="blacklisted">Blacklisted</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Service</mat-label>
          <mat-select [(ngModel)]="serviceFilter" (ngModelChange)="applyFilter()">
            <mat-option value="">All Services</mat-option>
            <mat-option *ngFor="let service of services" [value]="service.value">
              {{ service.label }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Projects</mat-label>
          <mat-select [(ngModel)]="projectFilter" (ngModelChange)="applyFilter()">
            <mat-option value="">All</mat-option>
            <mat-option value="with-projects">With Projects</mat-option>
            <mat-option value="without-projects">Without Projects</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Cards Grid -->
      <div class="cards-container" *ngIf="!loading(); else loadingTemplate">
        <mat-card
          *ngFor="let summary of filteredContractorSummaries()"
          class="contractor-card"
          [ngClass]="'status-' + getContractorStatus(summary)"
          (click)="viewContractorProjects(summary.contractorId)"
        >
          <!-- Card Header -->
          <mat-card-header>
            <mat-card-title>
              {{ summary.contractorName }}
              <mat-chip class="status-chip" [ngClass]="'status-' + getContractorStatus(summary)">
                {{ formatStatus(getContractorStatus(summary)) }}
              </mat-chip>
            </mat-card-title>
            <mat-card-subtitle>
              <div class="contractor-metrics">
                <span class="metric">
                  <mat-icon inline>star</mat-icon>
                  {{ summary.overallPerformanceRating.toFixed(1) }}/5
                </span>
                <span class="metric">
                  <mat-icon inline>folder</mat-icon>
                  {{ summary.activeProjects.length + summary.completedProjects.length }} Projects
                </span>
                <span class="metric">
                  <mat-icon inline>attach_money</mat-icon>
                  R{{ (summary.totalContractValue / 1000000).toFixed(1) }}M
                </span>
              </div>
            </mat-card-subtitle>
          </mat-card-header>

          <!-- Card Content -->
          <mat-card-content>
            <!-- Active Projects Section -->
            <div class="projects-section" *ngIf="summary.activeProjects.length > 0">
              <h3
                class="section-title"
                [matBadge]="summary.activeProjects.length"
                matBadgeColor="accent"
              >
                Active Projects
              </h3>
              <div class="projects-list">
                <div
                  *ngFor="let project of summary.activeProjects.slice(0, 3)"
                  class="project-item"
                  (click)="navigateToProject($event, project.projectId)"
                >
                  <div class="project-info">
                    <span class="project-code">{{ project.projectCode }}</span>
                    <span class="project-name">{{ project.projectName }}</span>
                  </div>
                  <div class="project-metrics">
                    <mat-progress-spinner
                      [diameter]="40"
                      [value]="project.progress"
                      mode="determinate"
                    ></mat-progress-spinner>
                    <span class="progress-text">{{ project.progress }}%</span>
                  </div>
                </div>
                <div *ngIf="summary.activeProjects.length > 3" class="more-projects">
                  +{{ summary.activeProjects.length - 3 }} more projects
                </div>
              </div>
            </div>

            <!-- Completed Projects Section -->
            <div class="projects-section" *ngIf="summary.completedProjects.length > 0">
              <h3
                class="section-title"
                [matBadge]="summary.completedProjects.length"
                matBadgeColor="primary"
              >
                Completed Projects
              </h3>
              <div class="completed-projects-summary">
                <mat-chip-set>
                  <mat-chip *ngFor="let project of summary.completedProjects.slice(0, 2)">
                    {{ project.projectCode }}
                  </mat-chip>
                  <mat-chip *ngIf="summary.completedProjects.length > 2">
                    +{{ summary.completedProjects.length - 2 }} more
                  </mat-chip>
                </mat-chip-set>
              </div>
            </div>

            <!-- No Projects Message -->
            <div
              class="no-projects"
              *ngIf="summary.activeProjects.length === 0 && summary.completedProjects.length === 0"
            >
              <mat-icon>info_outline</mat-icon>
              <span>No projects assigned yet</span>
            </div>

            <!-- Financial Summary -->
            <mat-divider></mat-divider>
            <div class="financial-summary">
              <div class="financial-item">
                <span class="label">Contract Value</span>
                <span class="value">R{{ (summary.totalContractValue / 1000).toFixed(0) }}K</span>
              </div>
              <div class="financial-item">
                <span class="label">Paid</span>
                <span class="value">R{{ (summary.totalPaymentsMade / 1000).toFixed(0) }}K</span>
              </div>
              <div class="financial-item">
                <span class="label">Payment %</span>
                <span class="value">
                  {{
                    summary.totalContractValue > 0
                      ? ((summary.totalPaymentsMade / summary.totalContractValue) * 100).toFixed(0)
                      : 0
                  }}%
                </span>
              </div>
            </div>
          </mat-card-content>

          <!-- Card Actions -->
          <mat-card-actions>
            <button
              mat-button
              color="primary"
              (click)="viewContractorProjects($event, summary.contractorId)"
            >
              <mat-icon>visibility</mat-icon>
              View Details
            </button>
            <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="handleEdit(summary.contractorId)">
                <mat-icon>edit</mat-icon>
                <span>Edit Contractor</span>
              </button>
              <button mat-menu-item (click)="assignToProject(summary.contractorId)">
                <mat-icon>add_task</mat-icon>
                <span>Assign to Project</span>
              </button>
              <button mat-menu-item (click)="manageTeams(summary.contractorId)">
                <mat-icon>groups</mat-icon>
                <span>Manage Teams</span>
              </button>
            </mat-menu>
          </mat-card-actions>
        </mat-card>

        <!-- No contractors message -->
        <div class="no-contractors" *ngIf="filteredContractorSummaries().length === 0">
          <mat-icon>business</mat-icon>
          <h3>No contractors found</h3>
          <p>Try adjusting your filters or add a new contractor</p>
        </div>
      </div>

      <ng-template #loadingTemplate>
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      @use '../../../../../styles/component-theming' as theme;

      // Page container following theme standards
      .ff-page-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 40px 24px;

        @media (max-width: 768px) {
          padding: 24px 16px;
        }
      }

      // Page header pattern matching dashboard exactly
      .ff-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 48px;

        .header-content {
          flex: 1;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
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

      .filters {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .filters mat-form-field {
        min-width: 200px;
      }

      .cards-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 24px;
      }

      .contractor-card {
        cursor: pointer;
        transition: all 0.3s ease;
        height: 100%;
        display: flex;
        flex-direction: column;
        background-color: white !important;
        border: 1px solid #e5e7eb !important; /* Override any global border colors */
      }

      .contractor-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }

      .contractor-card mat-card-header {
        padding-bottom: 8px;
      }

      .contractor-card mat-card-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 20px;
        margin-bottom: 8px;
        color: #333 !important; /* Ensure title text is dark */
      }

      .status-chip {
        font-size: 12px;
        height: 24px;
        line-height: 24px;
        padding: 0 12px;
      }

      .contractor-metrics {
        display: flex;
        gap: 16px;
        font-size: 14px;
        color: #666 !important; /* Ensure metrics text is visible */
      }

      .contractor-metrics .metric {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .contractor-metrics mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #999;
      }

      .projects-section {
        margin: 16px 0;
      }

      .section-title {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #666;
      }

      .projects-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .project-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #f5f5f5;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .project-item:hover {
        background: #e8e8e8;
      }

      .project-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }

      .project-code {
        font-weight: 500;
        font-size: 12px;
        color: #1976d2;
      }

      .project-name {
        font-size: 12px;
        color: #666;
      }

      .project-metrics {
        display: flex;
        align-items: center;
        gap: 8px;
        position: relative;
      }

      .progress-text {
        position: absolute;
        font-size: 10px;
        font-weight: 500;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }

      .more-projects {
        text-align: center;
        padding: 8px;
        font-size: 12px;
        color: #999;
        font-style: italic;
      }

      .completed-projects-summary {
        padding: 8px 0;
      }

      .no-projects {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 24px;
        color: #999;
        font-size: 14px;
      }

      .financial-summary {
        display: flex;
        justify-content: space-between;
        margin-top: 16px;
        padding-top: 16px;
      }

      .financial-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .financial-item .label {
        font-size: 12px;
        color: #666;
      }

      .financial-item .value {
        font-size: 16px;
        font-weight: 500;
        color: #333;
      }

      mat-card-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        margin-top: auto;
      }

      .no-contractors {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 40px;
        text-align: center;
        color: #666;
      }

      .no-contractors mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #ddd;
        margin-bottom: 16px;
      }

      .no-contractors h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 400;
      }

      .no-contractors p {
        margin: 0;
        font-size: 14px;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 400px;
      }

      /* Status colors - More specific selectors to override global styles */
      .contractor-card .status-chip.status-pending_approval {
        background-color: #fff3cd !important;
        color: #856404 !important;
      }

      .contractor-card .status-chip.status-active {
        background-color: #e3f2fd !important;
        color: #1976d2 !important;
      }

      .contractor-card .status-chip.status-suspended {
        background-color: #f8d7da !important;
        color: #721c24 !important;
      }

      .contractor-card .status-chip.status-blacklisted {
        background-color: #d1d1d1 !important;
        color: #333 !important;
      }

      /* Card status borders */
      .contractor-card.status-pending_approval {
        border-left: 4px solid #ffc107;
      }

      .contractor-card.status-active {
        border-left: 4px solid #1976d2;
      }

      .contractor-card.status-suspended {
        border-left: 4px solid #dc3545;
      }

      .contractor-card.status-blacklisted {
        border-left: 4px solid #6c757d;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .cards-container {
          grid-template-columns: 1fr;
        }

        .filters {
          flex-direction: column;
        }

        .filters mat-form-field {
          width: 100%;
        }
      }
    `,
  ],
})
export class ContractorListComponent implements OnInit {
  private contractorService = inject(ContractorService);
  private contractorProjectService = inject(ContractorProjectService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  contractors = signal<Contractor[]>([]);
  contractorSummaries = signal<ContractorProjectSummary[]>([]);
  loading = signal(true);
  searchTerm = '';
  statusFilter = '';
  serviceFilter = '';
  projectFilter = '';
  services = CONTRACTOR_SERVICES;

  displayedColumns = ['company', 'contact', 'services', 'teams', 'status', 'actions'];

  filteredContractorSummaries = computed(() => {
    let filtered = this.contractorSummaries();

    console.log('Contractor summaries:', filtered); // Debug log

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter((cs) => cs.contractorName.toLowerCase().includes(term));
    }

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter((cs) => {
        const c = this.contractors().find((contractor) => contractor.id === cs.contractorId);
        return c?.status === this.statusFilter;
      });
    }

    // Apply service filter
    if (this.serviceFilter) {
      filtered = filtered.filter((cs) => {
        const contractor = this.contractors().find((c) => c.id === cs.contractorId);
        return contractor?.capabilities.services.includes(
          this.serviceFilter as ContractorServiceType,
        );
      });
    }

    // Apply project filter
    if (this.projectFilter === 'with-projects') {
      filtered = filtered.filter(
        (cs) => cs.activeProjects.length > 0 || cs.completedProjects.length > 0,
      );
    } else if (this.projectFilter === 'without-projects') {
      filtered = filtered.filter(
        (cs) => cs.activeProjects.length === 0 && cs.completedProjects.length === 0,
      );
    }

    console.log('Filtered contractor summaries:', filtered); // Debug log
    return filtered;
  });

  ngOnInit() {
    this.loadContractors();
  }

  loadContractors() {
    this.loading.set(true);

    // Load contractors first
    this.contractorService.getContractors().subscribe({
      next: (contractors) => {
        this.contractors.set(contractors);

        // Always create summaries for all contractors (with or without projects)
        const emptySummaries = contractors.map((c) => ({
          contractorId: c.id!,
          contractorName: c.companyName,
          activeProjects: [],
          completedProjects: [],
          totalContractValue: 0,
          totalPaymentsMade: 0,
          overallPerformanceRating: 0,
        }));
        console.log('Created contractor summaries:', emptySummaries);
        this.contractorSummaries.set(emptySummaries);
        this.loading.set(false);

        // Try to load project summaries in the background (optional)
        this.contractorProjectService.getAllContractorSummaries().subscribe({
          next: (summaries) => {
            if (summaries.length > 0) {
              this.contractorSummaries.set(summaries);
            }
          },
          error: (_error) => {
            console.log(
              'No contractor projects found yet - showing contractors without project data',
            );
          },
        });
      },
      error: (error) => {
        console.error('Error loading contractors:', error);
        this.loading.set(false);
      },
    });
  }

  applyFilter() {
    // Filtering is handled by the computed signal
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(ContractorFormComponent, {
      width: '800px',
      data: { mode: 'add' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadContractors();
      }
    });
  }

  openEditDialog(contractor: Contractor) {
    const dialogRef = this.dialog.open(ContractorFormComponent, {
      width: '800px',
      data: { mode: 'edit', contractor },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadContractors();
      }
    });
  }

  handleEdit(contractorId: string) {
    const contractor = this.getContractor(contractorId);
    if (contractor) {
      this.openEditDialog(contractor);
    }
  }

  viewDetails(id: string) {
    this.router.navigate(['/contractors', id]);
  }

  viewContractorProjects(event: Event | string, contractorId?: string) {
    // Handle both event and direct ID calls
    if (typeof event === 'string') {
      contractorId = event;
    } else {
      event.stopPropagation();
    }

    if (contractorId) {
      this.router.navigate(['/contractors', contractorId]);
    }
  }

  navigateToProject(event: Event, projectId: string) {
    event.stopPropagation();
    this.router.navigate(['/projects', projectId]);
  }

  getContractor(contractorId: string): Contractor | undefined {
    return this.contractors().find((c) => c.id === contractorId);
  }

  getContractorStatus(summary: ContractorProjectSummary): ContractorStatus {
    const contractor = this.getContractor(summary.contractorId);
    return contractor?.status || ('active' as ContractorStatus);
  }

  assignToProject(contractorId: string) {
    // TODO: Implement project assignment dialog
    console.log('Assign contractor to project:', contractorId);
  }

  manageTeams(contractorId: string) {
    // TODO: Implement team management dialog
    console.log('Manage teams for contractor:', contractorId);
  }

  async approveContractor(contractor: Contractor) {
    // TODO: Get current user ID from auth service
    const currentUserId = 'current-user-id';

    try {
      await this.contractorService.approveContractor(contractor.id!, currentUserId);
      this.loadContractors();
    } catch (error) {
      console.error('Error approving contractor:', error);
    }
  }

  async suspendContractor(contractor: Contractor) {
    // TODO: Show dialog to get suspension reason
    const reason = 'Suspended by admin';

    try {
      await this.contractorService.updateContractorStatus(contractor.id!, 'suspended', reason);
      this.loadContractors();
    } catch (error) {
      console.error('Error suspending contractor:', error);
    }
  }

  async activateContractor(contractor: Contractor) {
    try {
      await this.contractorService.updateContractorStatus(contractor.id!, 'active');
      this.loadContractors();
    } catch (error) {
      console.error('Error activating contractor:', error);
    }
  }

  getServiceLabel(service: string): string {
    const found = this.services.find((s) => s.value === service);
    return found ? found.label : service;
  }

  formatStatus(status: ContractorStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  openImportDialog() {
    const dialogRef = this.dialog.open(ContractorImportComponent, {
      width: '600px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadContractors();
      }
    });
  }
}
