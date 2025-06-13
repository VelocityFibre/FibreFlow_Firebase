import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
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

// import { PhaseService } from '../../../../core/services/phase.service';
import { PhaseStatus, PhaseTemplate } from '../../../../core/models/phase.model';

@Component({
  selector: 'app-phase-list',
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
    <div class="phase-list-container">
      <!-- Header -->
      <div class="header">
        <h1>Phase Templates</h1>
        <button mat-raised-button color="primary" (click)="openAddDialog()">
          <mat-icon>add</mat-icon>
          Add Phase Template
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
            placeholder="Search by name, description..."
          />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
            <mat-option value="">All</mat-option>
            <mat-option value="pending">Pending</mat-option>
            <mat-option value="active">Active</mat-option>
            <mat-option value="completed">Completed</mat-option>
            <mat-option value="blocked">Blocked</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Table -->
      <div class="table-container" *ngIf="!loading(); else loadingTemplate">
        <table mat-table [dataSource]="filteredPhases()" class="phase-table">
          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Phase Name</th>
            <td mat-cell *matCellDef="let phase">
              <div class="phase-info">
                <strong>{{ phase.name }}</strong>
                <small>{{ phase.description }}</small>
              </div>
            </td>
          </ng-container>

          <!-- Order Column -->
          <ng-container matColumnDef="order">
            <th mat-header-cell *matHeaderCellDef>Order</th>
            <td mat-cell *matCellDef="let phase">
              <span class="order-badge">{{ phase.orderNo }}</span>
            </td>
          </ng-container>

          <!-- Dependencies Column -->
          <ng-container matColumnDef="dependencies">
            <th mat-header-cell *matHeaderCellDef>Dependencies</th>
            <td mat-cell *matCellDef="let phase">
              <span
                class="dependency-count"
                *ngIf="phase.dependencies && phase.dependencies.length > 0"
              >
                <mat-icon class="dependency-icon">link</mat-icon>
                {{ phase.dependencies.length }} dependencies
              </span>
              <span
                class="no-dependencies"
                *ngIf="!phase.dependencies || phase.dependencies.length === 0"
              >
                None
              </span>
            </td>
          </ng-container>

          <!-- Default Status Column -->
          <ng-container matColumnDef="defaultStatus">
            <th mat-header-cell *matHeaderCellDef>Default Phase</th>
            <td mat-cell *matCellDef="let phase">
              <mat-chip [ngClass]="phase.isDefault ? 'default-phase' : 'custom-phase'">
                {{ phase.isDefault ? 'Default' : 'Custom' }}
              </mat-chip>
            </td>
          </ng-container>

          <!-- Projects Using Column -->
          <ng-container matColumnDef="projectsUsing">
            <th mat-header-cell *matHeaderCellDef>Projects Using</th>
            <td mat-cell *matCellDef="let phase">
              <span class="projects-count">{{ 0 }}</span>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let phase">
              <button mat-icon-button [matMenuTriggerFor]="menu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="openEditDialog(phase)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="duplicatePhase(phase)">
                  <mat-icon>content_copy</mat-icon>
                  <span>Duplicate</span>
                </button>
                <button
                  mat-menu-item
                  (click)="deletePhase(phase)"
                  [disabled]="false"
                  class="delete-option"
                >
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns" class="phase-row"></tr>

          <!-- No data row -->
          <tr class="mat-row no-data-row" *matNoDataRow>
            <td class="mat-cell" [attr.colspan]="displayedColumns.length">
              <p>No phase templates found</p>
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
      .phase-list-container {
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

      .phase-table {
        width: 100%;
      }

      .phase-info {
        display: flex;
        flex-direction: column;
      }

      .phase-info small {
        color: #666;
        margin-top: 4px;
        font-size: 13px;
      }

      .order-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: #e3f2fd;
        color: #1976d2;
        font-weight: 600;
      }

      .dependency-count {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #f57c00;
        font-size: 14px;
      }

      .dependency-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .no-dependencies {
        color: #999;
        font-size: 14px;
      }

      .projects-count {
        font-weight: 500;
        color: #1976d2;
      }

      mat-chip {
        font-size: 12px;
      }

      .default-phase {
        background-color: #e3f2fd !important;
        color: #1976d2 !important;
      }

      .custom-phase {
        background-color: #f3e5f5 !important;
        color: #7b1fa2 !important;
      }

      .phase-row:hover {
        background-color: #f5f5f5;
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

      .delete-option {
        color: #ef4444;

        mat-icon {
          color: #ef4444;
        }
      }

      .delete-option:disabled {
        opacity: 0.5;
      }
    `,
  ],
})
export class PhaseListComponent implements OnInit {
  @Input() phases: PhaseTemplate[] | null = [];
  @Output() edit = new EventEmitter<PhaseTemplate>();
  @Output() delete = new EventEmitter<PhaseTemplate>();

  private dialog = inject(MatDialog);
  private router = inject(Router);

  loading = signal(false);
  searchTerm = '';
  statusFilter = '';

  displayedColumns = ['name', 'order', 'dependencies', 'defaultStatus', 'projectsUsing', 'actions'];

  filteredPhases = computed(() => {
    let filtered = this.phases || [];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p: PhaseTemplate) =>
          p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term),
      );
    }

    // Apply status filter
    if (this.statusFilter) {
      // PhaseTemplate doesn't have status, skip this filter
    }

    return filtered.sort((a, b) => a.orderNo - b.orderNo);
  });

  ngOnInit() {
    // Phases are now passed as input from parent component
  }

  applyFilter() {
    // Filtering is handled by the computed signal
  }

  openAddDialog() {
    // Handled by parent component
  }

  openEditDialog(phase: PhaseTemplate) {
    this.edit.emit(phase);
  }

  duplicatePhase(phase: PhaseTemplate) {
    const duplicatedPhase = {
      ...phase,
      name: `${phase.name} (Copy)`,
      orderNo: (this.phases?.length || 0) + 1,
    };

    // Emit edit with duplicated phase
    this.edit.emit(duplicatedPhase);
  }

  deletePhase(phase: PhaseTemplate) {
    this.delete.emit(phase);
  }

  formatStatus(status: PhaseStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
