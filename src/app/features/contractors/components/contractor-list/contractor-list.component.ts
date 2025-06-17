import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
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
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ContractorService } from '../../services/contractor.service';
import { Contractor, ContractorStatus, CONTRACTOR_SERVICES } from '../../models/contractor.model';
import { ContractorFormComponent } from '../contractor-form/contractor-form.component';

@Component({
  selector: 'app-contractor-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
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
    FormsModule,
  ],
  template: `
    <div class="contractor-list-container">
      <!-- Header -->
      <div class="header">
        <h1>Contractors</h1>
        <button mat-raised-button color="primary" (click)="openAddDialog()">
          <mat-icon>add</mat-icon>
          Add Contractor
        </button>
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
      </div>

      <!-- Table -->
      <div class="table-container" *ngIf="!loading(); else loadingTemplate">
        <table mat-table [dataSource]="filteredContractors()" class="contractor-table">
          <!-- Company Column -->
          <ng-container matColumnDef="company">
            <th mat-header-cell *matHeaderCellDef>Company</th>
            <td mat-cell *matCellDef="let contractor">
              <div class="company-info">
                <strong>{{ contractor.companyName }}</strong>
                <small>{{ contractor.registrationNumber }}</small>
              </div>
            </td>
          </ng-container>

          <!-- Contact Column -->
          <ng-container matColumnDef="contact">
            <th mat-header-cell *matHeaderCellDef>Primary Contact</th>
            <td mat-cell *matCellDef="let contractor">
              <div class="contact-info">
                <div>{{ contractor.primaryContact.name }}</div>
                <small>{{ contractor.primaryContact.phone }}</small>
              </div>
            </td>
          </ng-container>

          <!-- Services Column -->
          <ng-container matColumnDef="services">
            <th mat-header-cell *matHeaderCellDef>Services</th>
            <td mat-cell *matCellDef="let contractor">
              <mat-chip-set>
                <mat-chip *ngFor="let service of contractor.capabilities.services">
                  {{ getServiceLabel(service) }}
                </mat-chip>
              </mat-chip-set>
            </td>
          </ng-container>

          <!-- Teams Column -->
          <ng-container matColumnDef="teams">
            <th mat-header-cell *matHeaderCellDef>Teams</th>
            <td mat-cell *matCellDef="let contractor">
              <span class="teams-count">{{ contractor.capabilities.maxTeams || 0 }}</span>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let contractor">
              <mat-chip [ngClass]="'status-' + contractor.status">
                {{ formatStatus(contractor.status) }}
              </mat-chip>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let contractor">
              <button mat-icon-button [matMenuTriggerFor]="menu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="viewDetails(contractor.id)">
                  <mat-icon>visibility</mat-icon>
                  <span>View Details</span>
                </button>
                <button mat-menu-item (click)="openEditDialog(contractor)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button
                  mat-menu-item
                  *ngIf="contractor.status === 'pending_approval'"
                  (click)="approveContractor(contractor)"
                >
                  <mat-icon>check_circle</mat-icon>
                  <span>Approve</span>
                </button>
                <button
                  mat-menu-item
                  *ngIf="contractor.status === 'active'"
                  (click)="suspendContractor(contractor)"
                >
                  <mat-icon>pause_circle</mat-icon>
                  <span>Suspend</span>
                </button>
                <button
                  mat-menu-item
                  *ngIf="contractor.status === 'suspended'"
                  (click)="activateContractor(contractor)"
                >
                  <mat-icon>play_circle</mat-icon>
                  <span>Activate</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: displayedColumns"
            class="contractor-row"
            [class.pending]="row.status === 'pending_approval'"
          ></tr>

          <!-- No data row -->
          <tr class="mat-row no-data-row" *matNoDataRow>
            <td class="mat-cell" [attr.colspan]="displayedColumns.length">
              <p>No contractors found</p>
            </td>
          </tr>
        </table>
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
      .contractor-list-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 500;
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

      .table-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }

      .contractor-table {
        width: 100%;
      }

      .company-info {
        display: flex;
        flex-direction: column;
      }

      .company-info small {
        color: #666;
        margin-top: 2px;
      }

      .contact-info {
        display: flex;
        flex-direction: column;
      }

      .contact-info small {
        color: #666;
        margin-top: 2px;
      }

      .teams-count {
        font-weight: 500;
        color: #1976d2;
      }

      mat-chip {
        font-size: 12px;
      }

      .status-pending_approval {
        background-color: #fff3cd !important;
        color: #856404 !important;
      }

      .status-active {
        background-color: #d4edda !important;
        color: #155724 !important;
      }

      .status-suspended {
        background-color: #f8d7da !important;
        color: #721c24 !important;
      }

      .status-blacklisted {
        background-color: #d1d1d1 !important;
        color: #333 !important;
      }

      .contractor-row.pending {
        background-color: #fffbf0;
      }

      .no-data-row {
        height: 200px;
      }

      .no-data-row td {
        text-align: center;
        color: #666;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 400px;
      }
    `,
  ],
})
export class ContractorListComponent implements OnInit {
  private contractorService = inject(ContractorService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  contractors = signal<Contractor[]>([]);
  loading = signal(true);
  searchTerm = '';
  statusFilter = '';
  serviceFilter = '';
  services = CONTRACTOR_SERVICES;

  displayedColumns = ['company', 'contact', 'services', 'teams', 'status', 'actions'];

  filteredContractors = computed(() => {
    let filtered = this.contractors();

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.companyName.toLowerCase().includes(term) ||
          c.registrationNumber?.toLowerCase().includes(term) ||
          c.primaryContact.name.toLowerCase().includes(term),
      );
    }

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter((c) => c.status === this.statusFilter);
    }

    // Apply service filter
    if (this.serviceFilter) {
      filtered = filtered.filter((c) =>
        c.capabilities.services.includes(this.serviceFilter as any),
      );
    }

    return filtered;
  });

  ngOnInit() {
    this.loadContractors();
  }

  loadContractors() {
    this.loading.set(true);
    this.contractorService.getContractors().subscribe({
      next: (contractors) => {
        this.contractors.set(contractors);
        this.loading.set(false);
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

  viewDetails(id: string) {
    this.router.navigate(['/contractors', id]);
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
}
