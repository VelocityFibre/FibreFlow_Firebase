import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';

import { PageHeaderComponent, PageHeaderAction } from '../../../../shared/components/page-header/page-header.component';

import { RFQ, RFQStatus } from '../../models/rfq.model';
import { RFQService } from '../../services/rfq.service';
import { ProjectService } from '../../../../core/services/project.service';
import { Project } from '../../../../core/models/project.model';
import { RFQEmailDialogComponent } from '../../components/rfq-email-dialog/rfq-email-dialog.component';

@Component({
  selector: 'app-rfq-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDialogModule,
    PageHeaderComponent,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Page Header -->
      <app-page-header
        title="Request for Quotes (RFQs)"
        subtitle="Manage and track all your RFQs"
        [actions]="headerActions"
      ></app-page-header>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Project</mat-label>
              <mat-select [(value)]="selectedProjectId" (selectionChange)="filterRFQs()">
                <mat-option value="all">All Projects</mat-option>
                <mat-option *ngFor="let project of projects" [value]="project.id">
                  {{ project.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Status</mat-label>
              <mat-select [(value)]="selectedStatus" (selectionChange)="filterRFQs()">
                <mat-option value="all">All Statuses</mat-option>
                <mat-option value="draft">Draft</mat-option>
                <mat-option value="sent">Sent</mat-option>
                <mat-option value="closed">Closed</mat-option>
                <mat-option value="cancelled">Cancelled</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search RFQs...</mat-label>
              <input
                matInput
                [(ngModel)]="searchTerm"
                (ngModelChange)="filterRFQs()"
                placeholder="Search by RFQ number, title..."
              />
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- RFQs Table -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>description</mat-icon>
            RFQs ({{ filteredRFQs.length }})
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="table-container" *ngIf="!loading; else loadingTemplate">
            <table mat-table [dataSource]="filteredRFQs" class="rfq-table">
              <!-- RFQ Number Column -->
              <ng-container matColumnDef="rfqNumber">
                <th mat-header-cell *matHeaderCellDef>RFQ Number</th>
                <td mat-cell *matCellDef="let rfq">
                  <a class="rfq-link" [routerLink]="['/quotes/rfq', rfq.id]">
                    {{ rfq.rfqNumber }}
                  </a>
                </td>
              </ng-container>

              <!-- Title Column -->
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Title</th>
                <td mat-cell *matCellDef="let rfq">{{ rfq.title }}</td>
              </ng-container>

              <!-- Project Column -->
              <ng-container matColumnDef="project">
                <th mat-header-cell *matHeaderCellDef>Project</th>
                <td mat-cell *matCellDef="let rfq">
                  <div class="project-info">
                    <div class="project-name">{{ rfq.projectName }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Items Column -->
              <ng-container matColumnDef="items">
                <th mat-header-cell *matHeaderCellDef>Items</th>
                <td mat-cell *matCellDef="let rfq">
                  {{ rfq.boqItemIds.length }}
                </td>
              </ng-container>

              <!-- Suppliers Column -->
              <ng-container matColumnDef="suppliers">
                <th mat-header-cell *matHeaderCellDef>Suppliers</th>
                <td mat-cell *matCellDef="let rfq">
                  {{ rfq.supplierIds.length }}
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let rfq">
                  <mat-chip [class]="'status-' + rfq.status">
                    {{ rfq.status | titlecase }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Deadline Column -->
              <ng-container matColumnDef="deadline">
                <th mat-header-cell *matHeaderCellDef>Deadline</th>
                <td mat-cell *matCellDef="let rfq">
                  {{ getDeadlineDate(rfq.deadline) | date: 'mediumDate' }}
                  <span class="deadline-days" [class.overdue]="isOverdue(rfq.deadline)">
                    ({{ getDaysUntilDeadline(rfq.deadline) }})
                  </span>
                </td>
              </ng-container>

              <!-- Created Column -->
              <ng-container matColumnDef="created">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let rfq">
                  {{ getCreatedDate(rfq.createdAt) | date: 'mediumDate' }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let rfq">
                  <button mat-icon-button [matMenuTriggerFor]="menu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item [routerLink]="['/quotes/rfq', rfq.id]">
                      <mat-icon>visibility</mat-icon>
                      View Details
                    </button>
                    <button mat-menu-item *ngIf="rfq.status === 'draft'" (click)="sendRFQ(rfq)">
                      <mat-icon>send</mat-icon>
                      Send to Suppliers
                    </button>
                    <button mat-menu-item *ngIf="rfq.status === 'sent'" (click)="closeRFQ(rfq)">
                      <mat-icon>check_circle</mat-icon>
                      Close RFQ
                    </button>
                    <button mat-menu-item (click)="emailRFQ(rfq)">
                      <mat-icon>email</mat-icon>
                      Email RFQ
                    </button>
                    <button mat-menu-item (click)="exportRFQ(rfq)">
                      <mat-icon>download</mat-icon>
                      Export PDF
                    </button>
                    <button mat-menu-item *ngIf="rfq.status === 'draft'" (click)="deleteRFQ(rfq)">
                      <mat-icon>delete</mat-icon>
                      Delete
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>

            <div *ngIf="filteredRFQs.length === 0" class="no-data">
              <mat-icon>description</mat-icon>
              <p>No RFQs found</p>
              <button mat-raised-button color="primary" routerLink="/boq">
                Create RFQ from BOQ
              </button>
            </div>
          </div>

          <ng-template #loadingTemplate>
            <div class="loading-container">
              <mat-spinner></mat-spinner>
              <p>Loading RFQs...</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `

      .filters-card {
        margin-bottom: 24px;
      }

      .filters {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      .filter-field {
        width: 200px;
      }

      .search-field {
        flex: 1;
      }

      .table-card {
        margin-bottom: 24px;
      }

      .table-card mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .table-container {
        overflow-x: auto;
      }

      .rfq-table {
        width: 100%;
        min-width: 1000px;
      }

      .rfq-link {
        color: #1976d2;
        text-decoration: none;
        font-weight: 500;
      }

      .rfq-link:hover {
        text-decoration: underline;
      }

      .project-info {
        line-height: 1.4;
      }

      .project-name {
        font-weight: 500;
      }

      mat-chip {
        font-size: 12px;
        height: 24px;
        line-height: 24px;
      }

      .status-draft {
        background-color: #e2e8f0;
        color: #2d3748;
      }

      .status-sent {
        background-color: #dbeafe;
        color: #1e40af;
      }

      .status-closed {
        background-color: #d1fae5;
        color: #065f46;
      }

      .status-cancelled {
        background-color: #fee2e2;
        color: #991b1b;
      }

      .deadline-days {
        font-size: 12px;
        color: #666;
      }

      .deadline-days.overdue {
        color: #dc2626;
        font-weight: 500;
      }

      .no-data {
        text-align: center;
        padding: 48px;
        color: #718096;
      }

      .no-data mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }

      .no-data p {
        margin-bottom: 24px;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        color: #718096;
      }

      .loading-container p {
        margin-top: 16px;
      }

      @media (max-width: 768px) {
        .filters {
          flex-direction: column;
          width: 100%;
        }

        .filter-field,
        .search-field {
          width: 100%;
        }
      }
    `,
  ],
})
export class RFQPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private rfqService = inject(RFQService);
  private projectService = inject(ProjectService);
  private dialog = inject(MatDialog);

  rfqs: RFQ[] = [];
  filteredRFQs: RFQ[] = [];
  projects: Project[] = [];
  loading = true;

  selectedProjectId = 'all';
  selectedStatus: RFQStatus | 'all' = 'all';
  searchTerm = '';

  headerActions: PageHeaderAction[] = [
    {
      label: 'Create RFQ from BOQ',
      icon: 'add',
      color: 'primary',
      variant: 'raised',
      action: () => this.createRFQFromBOQ()
    }
  ];

  displayedColumns = [
    'rfqNumber',
    'title',
    'project',
    'items',
    'suppliers',
    'status',
    'deadline',
    'created',
    'actions',
  ];

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData() {
    combineLatest([this.rfqService.getRFQs(), this.projectService.getProjects()])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([rfqs, projects]) => {
          this.rfqs = rfqs;
          this.projects = projects;
          this.filterRFQs();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.loading = false;
        },
      });
  }

  filterRFQs() {
    let filtered = [...this.rfqs];

    // Filter by project
    if (this.selectedProjectId !== 'all') {
      filtered = filtered.filter((rfq) => rfq.projectId === this.selectedProjectId);
    }

    // Filter by status
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter((rfq) => rfq.status === this.selectedStatus);
    }

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (rfq) =>
          rfq.rfqNumber.toLowerCase().includes(term) ||
          rfq.title.toLowerCase().includes(term) ||
          rfq.description.toLowerCase().includes(term),
      );
    }

    this.filteredRFQs = filtered;
  }

  getDeadlineDate(deadline: any): Date {
    if (deadline instanceof Date) {
      return deadline;
    }
    if (typeof deadline === 'string') {
      return new Date(deadline);
    }
    if (deadline?.toDate) {
      return deadline.toDate();
    }
    return new Date();
  }

  getCreatedDate(createdAt: any): Date {
    if (createdAt instanceof Date) {
      return createdAt;
    }
    if (typeof createdAt === 'string') {
      return new Date(createdAt);
    }
    if (createdAt?.toDate) {
      return createdAt.toDate();
    }
    return new Date();
  }

  getDaysUntilDeadline(deadline: any): string {
    const deadlineDate = this.getDeadlineDate(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return '1 day';
    } else {
      return `${diffDays} days`;
    }
  }

  isOverdue(deadline: any): boolean {
    const deadlineDate = this.getDeadlineDate(deadline);
    return deadlineDate < new Date();
  }

  sendRFQ(rfq: RFQ) {
    if (confirm('Send this RFQ to all selected suppliers?')) {
      this.rfqService
        .updateRFQ(rfq.id!, {
          status: 'sent',
          sentAt: new Date(),
        })
        .subscribe({
          next: () => {
            this.loadData();
            alert('RFQ sent successfully!');
          },
          error: (error) => {
            console.error('Error sending RFQ:', error);
            alert('Failed to send RFQ. Please try again.');
          },
        });
    }
  }

  closeRFQ(rfq: RFQ) {
    if (confirm('Close this RFQ? No more quotes will be accepted.')) {
      this.rfqService
        .updateRFQ(rfq.id!, {
          status: 'closed',
          closedAt: new Date(),
        })
        .subscribe({
          next: () => {
            this.loadData();
            alert('RFQ closed successfully!');
          },
          error: (error) => {
            console.error('Error closing RFQ:', error);
            alert('Failed to close RFQ. Please try again.');
          },
        });
    }
  }

  emailRFQ(rfq: RFQ) {
    const dialogRef = this.dialog.open(RFQEmailDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { rfq },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Email was sent successfully, no need to reload data
        console.log('RFQ email sent successfully');
      }
    });
  }

  exportRFQ(rfq: RFQ) {
    // TODO: Implement PDF export
    alert('PDF export feature coming soon!');
  }

  deleteRFQ(rfq: RFQ) {
    if (confirm(`Are you sure you want to delete RFQ ${rfq.rfqNumber}?`)) {
      this.rfqService.deleteRFQ(rfq.id!).subscribe({
        next: () => {
          this.loadData();
          alert('RFQ deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting RFQ:', error);
          alert('Failed to delete RFQ. Please try again.');
        },
      });
    }
  }

  createRFQFromBOQ() {
    window.location.href = '/boq';
  }
}
