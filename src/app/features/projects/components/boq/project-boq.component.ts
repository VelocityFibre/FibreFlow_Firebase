import { Component, Input, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil, debounceTime } from 'rxjs';

import { BOQService } from '../../../boq/services/boq.service';
import { BOQItem, BOQStatus, BOQSummary } from '../../../boq/models/boq.model';
import { BOQFormDialogComponent } from '../../../boq/components/boq-form-dialog/boq-form-dialog.component';
import { BOQImportDialogComponent } from '../../../boq/components/boq-import-dialog/boq-import-dialog.component';

@Component({
  selector: 'app-project-boq',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="project-boq-container">
      <!-- BOQ Header with Actions -->
      <div class="boq-header">
        <h3 class="section-title">Bill of Quantities</h3>
        <div class="header-actions">
          <button
            mat-stroked-button
            (click)="exportToCSV()"
            [disabled]="loading || boqItems.length === 0"
          >
            <mat-icon>download</mat-icon>
            Export CSV
          </button>
          <button mat-stroked-button (click)="openImportDialog()">
            <mat-icon>upload</mat-icon>
            Import BOQ
          </button>
          <button mat-raised-button color="primary" (click)="openAddDialog()">
            <mat-icon>add</mat-icon>
            Add Item
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="boq-summary-cards" *ngIf="summary">
        <mat-card class="summary-card compact">
          <mat-card-content>
            <div class="card-icon primary">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ summary.totalItems }}</div>
              <div class="card-label">Total Items</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card compact">
          <mat-card-content>
            <div class="card-icon value">
              <mat-icon>attach_money</mat-icon>
            </div>
            <div class="card-info">
              <div class="card-value">R{{ summary.totalValue | number: '1.0-0' }}</div>
              <div class="card-label">Total Value</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card compact">
          <mat-card-content>
            <div class="card-icon success">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="card-info">
              <div class="card-value">R{{ summary.allocatedValue | number: '1.0-0' }}</div>
              <div class="card-label">Allocated</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card compact">
          <mat-card-content>
            <div class="card-icon warning">
              <mat-icon>pending</mat-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ summary.itemsNeedingQuotes }}</div>
              <div class="card-label">Need Quotes</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Filters -->
      <div class="boq-filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search items...</mat-label>
          <input
            matInput
            [formControl]="searchControl"
            placeholder="Search by code, description..."
          />
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(value)]="selectedStatus" (selectionChange)="filterItems()">
            <mat-option value="all">All Statuses</mat-option>
            <mat-option *ngFor="let status of statuses" [value]="status">
              {{ status }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Show</mat-label>
          <mat-select [(value)]="showQuotesOnly" (selectionChange)="filterItems()">
            <mat-option [value]="false">All Items</mat-option>
            <mat-option [value]="true">Items Needing Quotes</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Loading State -->
      <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>

      <!-- BOQ Table -->
      <div class="table-container" *ngIf="!loading">
        <table mat-table [dataSource]="filteredItems" class="boq-table">
          <!-- Item Code Column -->
          <ng-container matColumnDef="itemCode">
            <th mat-header-cell *matHeaderCellDef>Item Code</th>
            <td mat-cell *matCellDef="let item" class="code-cell">
              {{ item.itemCode || '-' }}
            </td>
          </ng-container>

          <!-- Description Column -->
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let item">
              <div class="description-cell">
                <div class="description-text">{{ item.description }}</div>
                <div class="specification-text" *ngIf="item.specification">
                  {{ item.specification }}
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Unit Column -->
          <ng-container matColumnDef="unit">
            <th mat-header-cell *matHeaderCellDef>Unit</th>
            <td mat-cell *matCellDef="let item">{{ item.unit }}</td>
          </ng-container>

          <!-- Required Column -->
          <ng-container matColumnDef="required">
            <th mat-header-cell *matHeaderCellDef class="number-header">Required</th>
            <td mat-cell *matCellDef="let item" class="number-cell">
              {{ item.requiredQuantity | number }}
            </td>
          </ng-container>

          <!-- Allocated Column -->
          <ng-container matColumnDef="allocated">
            <th mat-header-cell *matHeaderCellDef class="number-header">Allocated</th>
            <td mat-cell *matCellDef="let item" class="number-cell">
              {{ item.allocatedQuantity | number }}
            </td>
          </ng-container>

          <!-- Remaining Column -->
          <ng-container matColumnDef="remaining">
            <th mat-header-cell *matHeaderCellDef class="number-header">Remaining</th>
            <td mat-cell *matCellDef="let item" class="number-cell">
              <span [class.text-warning]="item.remainingQuantity > 0">
                {{ item.remainingQuantity | number }}
              </span>
            </td>
          </ng-container>

          <!-- Unit Price Column -->
          <ng-container matColumnDef="unitPrice">
            <th mat-header-cell *matHeaderCellDef class="number-header">Unit Price</th>
            <td mat-cell *matCellDef="let item" class="number-cell">
              R{{ item.unitPrice | number: '1.2-2' }}
            </td>
          </ng-container>

          <!-- Total Price Column -->
          <ng-container matColumnDef="totalPrice">
            <th mat-header-cell *matHeaderCellDef class="number-header">Total Price</th>
            <td mat-cell *matCellDef="let item" class="number-cell">
              R{{ item.totalPrice | number: '1.2-2' }}
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let item">
              <mat-chip
                class="status-chip"
                [class]="'status-' + item.status.toLowerCase().replace(' ', '-')"
              >
                {{ item.status }}
              </mat-chip>
            </td>
          </ng-container>

          <!-- Quote Column -->
          <ng-container matColumnDef="quote">
            <th mat-header-cell *matHeaderCellDef>Quote</th>
            <td mat-cell *matCellDef="let item">
              <mat-chip *ngIf="item.needsQuote" class="quote-chip">
                <mat-icon>description</mat-icon>
                RFQ
              </mat-chip>
              <span *ngIf="!item.needsQuote" class="no-quote">-</span>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let item">
              <div class="action-buttons">
                <button
                  mat-icon-button
                  *ngIf="item.remainingQuantity > 0"
                  matTooltip="Allocate Stock"
                  (click)="allocateStock(item)"
                >
                  <mat-icon>arrow_forward</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Edit" (click)="editItem(item)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button matTooltip="Delete" (click)="deleteItem(item)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <!-- No Data Row -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              <div class="empty-state">
                <mat-icon>receipt_long</mat-icon>
                <p>No BOQ items found</p>
                <button mat-raised-button color="primary" (click)="openAddDialog()">
                  <mat-icon>add</mat-icon>
                  Add First Item
                </button>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .project-boq-container {
        padding: 0;
      }

      .boq-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .section-title {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }

      .boq-summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .summary-card.compact {
        mat-card-content {
          padding: 16px !important;
        }

        .card-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
          }
        }

        .card-value {
          font-size: 20px;
          font-weight: 600;
        }

        .card-label {
          font-size: 12px;
          color: rgb(var(--ff-muted-foreground));
        }
      }

      .summary-card mat-card-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .card-icon.primary {
        background-color: rgb(var(--ff-primary) / 0.1);
        color: rgb(var(--ff-primary));
      }

      .card-icon.value {
        background-color: rgb(var(--ff-success) / 0.1);
        color: rgb(var(--ff-success));
      }

      .card-icon.success {
        background-color: rgb(var(--ff-info) / 0.1);
        color: rgb(var(--ff-info));
      }

      .card-icon.warning {
        background-color: rgb(var(--ff-warning) / 0.1);
        color: rgb(var(--ff-warning));
      }

      .boq-filters {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .search-field {
        flex: 1;
        min-width: 300px;
      }

      .table-container {
        overflow-x: auto;
        border: 1px solid rgb(var(--ff-border));
        border-radius: 8px;
      }

      .boq-table {
        width: 100%;
        min-width: 900px;
      }

      .code-cell {
        font-family: monospace;
        font-size: 13px;
      }

      .description-cell {
        max-width: 250px;
      }

      .description-text {
        font-weight: 500;
        color: rgb(var(--ff-foreground));
      }

      .specification-text {
        font-size: 12px;
        color: rgb(var(--ff-muted-foreground));
        margin-top: 2px;
      }

      .number-header {
        text-align: right;
      }

      .number-cell {
        text-align: right;
        font-family: monospace;
        font-size: 13px;
      }

      .text-warning {
        color: rgb(var(--ff-warning));
      }

      mat-chip {
        font-size: 11px;
        height: 22px;
        line-height: 22px;
      }

      .status-chip.status-planned {
        background-color: rgb(var(--ff-muted) / 0.3);
        color: rgb(var(--ff-muted-foreground));
      }

      .status-chip.status-partially-allocated {
        background-color: rgb(var(--ff-warning) / 0.15);
        color: rgb(var(--ff-warning));
      }

      .status-chip.status-fully-allocated {
        background-color: rgb(var(--ff-success) / 0.15);
        color: rgb(var(--ff-success));
      }

      .status-chip.status-ordered {
        background-color: rgb(var(--ff-info) / 0.15);
        color: rgb(var(--ff-info));
      }

      .status-chip.status-delivered {
        background-color: rgb(var(--ff-primary) / 0.15);
        color: rgb(var(--ff-primary));
      }

      .quote-chip {
        background-color: rgb(var(--ff-info) / 0.15);
        color: rgb(var(--ff-info));
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .quote-chip mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      .no-quote {
        color: rgb(var(--ff-muted-foreground));
      }

      .action-buttons {
        display: flex;
        gap: 4px;
      }

      .no-data {
        padding: 48px !important;
        text-align: center;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .empty-state mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: rgb(var(--ff-border));
        margin-bottom: 16px;
      }

      .empty-state p {
        margin: 0 0 16px 0;
        color: rgb(var(--ff-muted-foreground));
        font-size: 14px;
      }

      @media (max-width: 768px) {
        .boq-header {
          flex-direction: column;
          gap: 16px;
          align-items: flex-start;
        }

        .header-actions {
          width: 100%;
          flex-wrap: wrap;
        }

        .boq-summary-cards {
          grid-template-columns: 1fr 1fr;
        }

        .boq-filters {
          flex-direction: column;
        }

        .search-field {
          min-width: 100%;
        }
      }
    `,
  ],
})
export class ProjectBOQComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;
  @Input() projectName?: string;

  private destroy$ = new Subject<void>();
  private boqService = inject(BOQService);
  private dialog = inject(MatDialog);

  boqItems: BOQItem[] = [];
  filteredItems: BOQItem[] = [];
  summary: BOQSummary | null = null;
  loading = true;

  selectedStatus: BOQStatus | 'all' = 'all';
  showQuotesOnly = false;
  searchControl = new FormControl('');

  statuses: BOQStatus[] = [
    'Planned',
    'Partially Allocated',
    'Fully Allocated',
    'Ordered',
    'Delivered',
  ];

  displayedColumns = [
    'itemCode',
    'description',
    'unit',
    'required',
    'allocated',
    'remaining',
    'unitPrice',
    'totalPrice',
    'status',
    'quote',
    'actions',
  ];

  ngOnInit() {
    this.loadBOQItems();
    this.setupSearch();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBOQItems() {
    this.loading = true;
    this.boqService
      .getBOQItemsByProject(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.boqItems = items;
          this.filterItems();
          this.loadSummary();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading BOQ items:', error);
          this.loading = false;
        },
      });
  }

  private loadSummary() {
    this.boqService
      .getProjectSummary(this.projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
        },
        error: (error) => {
          console.error('Error loading BOQ summary:', error);
        },
      });
  }

  private setupSearch() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.filterItems());
  }

  filterItems() {
    let filtered = [...this.boqItems];

    // Filter by status
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter((item) => item.status === this.selectedStatus);
    }

    // Filter by quotes
    if (this.showQuotesOnly) {
      filtered = filtered.filter((item) => item.needsQuote);
    }

    // Filter by search term
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.itemCode.toLowerCase().includes(searchTerm) ||
          item.description.toLowerCase().includes(searchTerm) ||
          item.specification?.toLowerCase().includes(searchTerm),
      );
    }

    this.filteredItems = filtered;
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(BOQFormDialogComponent, {
      width: '600px',
      data: {
        projectId: this.projectId,
        projectName: this.projectName,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadBOQItems();
      }
    });
  }

  openImportDialog() {
    const dialogRef = this.dialog.open(BOQImportDialogComponent, {
      width: '800px',
      data: {
        projectId: this.projectId,
        projectName: this.projectName,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadBOQItems();
      }
    });
  }

  editItem(item: BOQItem) {
    const dialogRef = this.dialog.open(BOQFormDialogComponent, {
      width: '600px',
      data: {
        item: item,
        projectId: this.projectId,
        projectName: this.projectName,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadBOQItems();
      }
    });
  }

  deleteItem(item: BOQItem) {
    if (confirm(`Are you sure you want to delete BOQ item "${item.description}"?`)) {
      this.boqService
        .deleteBOQItem(item.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadBOQItems();
          },
          error: (error) => {
            console.error('Error deleting item:', error);
            alert('Failed to delete item. Please try again.');
          },
        });
    }
  }

  allocateStock(_item: BOQItem) {
    // TODO: Implement stock allocation dialog
    alert('Stock allocation feature coming soon!');
  }

  exportToCSV() {
    const csvContent = this.boqService.exportToCSV(this.filteredItems);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boq-${this.projectId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
