import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { Subject, takeUntil, combineLatest, debounceTime } from 'rxjs';
import { FormControl } from '@angular/forms';

import { BOQService } from '../../services/boq.service';
import { ProjectService } from '../../../../core/services/project.service';
import { BOQItem, BOQStatus, BOQSummary } from '../../models/boq.model';
import { Project } from '../../../../core/models/project.model';
import { BOQFormDialogComponent } from '../boq-form-dialog/boq-form-dialog.component';
import { BOQImportDialogComponent } from '../boq-import-dialog/boq-import-dialog.component';

@Component({
  selector: 'app-boq-list',
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
    MatProgressSpinnerModule
  ],
  template: `
    <div class="boq-container">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <h1>BOQ Management</h1>
          <p class="subtitle">Manage Bill of Quantities and stock allocations for projects</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="exportToCSV()">
            <mat-icon>download</mat-icon>
            Export CSV
          </button>
          <button mat-stroked-button (click)="openImportDialog()">
            <mat-icon>upload</mat-icon>
            Import BOQ
          </button>
          <button mat-raised-button color="primary" (click)="openAddDialog()">
            <mat-icon>add</mat-icon>
            Add BOQ Item
          </button>
        </div>
      </div>

      <!-- Project Summary (when project is selected) -->
      <mat-card *ngIf="selectedProjectId && selectedProjectId !== 'all' && projectSummary" class="summary-card ff-card-boq">
        <mat-card-header>
          <mat-card-title>
            Project Summary: {{ getProjectName(selectedProjectId) }}
          </mat-card-title>
          <button mat-icon-button [matMenuTriggerFor]="summaryMenu" class="summary-menu">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #summaryMenu="matMenu">
            <button mat-menu-item (click)="generateRFQ()">
              <mat-icon>send</mat-icon>
              Generate RFQ
            </button>
          </mat-menu>
        </mat-card-header>
        <mat-card-content>
          <div class="summary-stats">
            <div class="stat-item">
              <div class="stat-value">{{ projectSummary.totalItems }}</div>
              <div class="stat-label">Total Items</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">R{{ projectSummary.totalValue | number:'1.2-2' }}</div>
              <div class="stat-label">Total Value</div>
            </div>
            <div class="stat-item">
              <div class="stat-value success">R{{ projectSummary.allocatedValue | number:'1.2-2' }}</div>
              <div class="stat-label">Allocated Value</div>
            </div>
            <div class="stat-item">
              <div class="stat-value warning">R{{ projectSummary.remainingValue | number:'1.2-2' }}</div>
              <div class="stat-label">Remaining Value</div>
            </div>
            <div class="stat-item">
              <div class="stat-value info">{{ projectSummary.itemsNeedingQuotes }}</div>
              <div class="stat-label">Need Quotes</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Filters -->
      <mat-card class="filters-card ff-card-boq">
        <mat-card-content>
          <div class="filters">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Project</mat-label>
              <mat-select [(value)]="selectedProjectId" (selectionChange)="onProjectChange()">
                <mat-option value="all">All Projects</mat-option>
                <mat-option *ngFor="let project of projects" [value]="project.id">
                  {{ project.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search BOQ items...</mat-label>
              <input matInput [formControl]="searchControl" placeholder="Search by code, description...">
              <mat-icon matPrefix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Status</mat-label>
              <mat-select [(value)]="selectedStatus">
                <mat-option value="all">All Statuses</mat-option>
                <mat-option *ngFor="let status of statuses" [value]="status">
                  {{ status }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- BOQ Items Table -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>receipt_long</mat-icon>
            BOQ Items ({{ filteredItems.length }})
          </mat-card-title>
          <mat-card-subtitle>Bill of Quantities items and their allocation status</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="table-container" *ngIf="!loading; else loadingTemplate">
            <table mat-table [dataSource]="filteredItems" class="boq-table">
              <!-- Project Column -->
              <ng-container matColumnDef="project">
                <th mat-header-cell *matHeaderCellDef>Project</th>
                <td mat-cell *matCellDef="let item">
                  <div class="project-info">
                    <div class="project-name">{{ getProjectName(item.projectId) }}</div>
                    <div class="project-location">{{ getProjectLocation(item.projectId) }}</div>
                  </div>
                </td>
              </ng-container>

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
                  {{ item.remainingQuantity | number }}
                </td>
              </ng-container>

              <!-- Unit Price Column -->
              <ng-container matColumnDef="unitPrice">
                <th mat-header-cell *matHeaderCellDef class="number-header">Unit Price</th>
                <td mat-cell *matCellDef="let item" class="number-cell">
                  R{{ item.unitPrice | number:'1.2-2' }}
                </td>
              </ng-container>

              <!-- Total Price Column -->
              <ng-container matColumnDef="totalPrice">
                <th mat-header-cell *matHeaderCellDef class="number-header">Total Price</th>
                <td mat-cell *matCellDef="let item" class="number-cell">
                  R{{ item.totalPrice | number:'1.2-2' }}
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let item">
                  <mat-chip [class]="'status-' + item.status.toLowerCase().replace(' ', '-')">
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
                    <button mat-icon-button 
                            *ngIf="item.remainingQuantity > 0"
                            matTooltip="Allocate Stock"
                            (click)="allocateStock(item)">
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                    <button mat-icon-button 
                            matTooltip="Edit"
                            (click)="editItem(item)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button 
                            matTooltip="Delete"
                            (click)="deleteItem(item)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <div *ngIf="filteredItems.length === 0" class="no-data">
              <mat-icon>receipt_long</mat-icon>
              <p>No BOQ items found</p>
            </div>
          </div>

          <ng-template #loadingTemplate>
            <div class="loading-container">
              <mat-spinner></mat-spinner>
              <p>Loading BOQ items...</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .boq-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-content h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 500;
      color: #1a202c;
    }

    .subtitle {
      margin: 4px 0 0;
      color: #718096;
      font-size: 16px;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .summary-card {
      margin-bottom: 24px;
      position: relative;
    }

    .summary-menu {
      position: absolute;
      right: 16px;
      top: 16px;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 24px;
      margin-top: 16px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #1a202c;
    }

    .stat-value.success {
      color: #48bb78;
    }

    .stat-value.warning {
      color: #ed8936;
    }

    .stat-value.info {
      color: #4299e1;
    }

    .stat-label {
      font-size: 14px;
      color: #718096;
      margin-top: 4px;
    }

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

    .boq-table {
      width: 100%;
      min-width: 1200px;
    }

    .project-info {
      line-height: 1.4;
    }

    .project-name {
      font-weight: 500;
    }

    .project-location {
      font-size: 12px;
      color: #718096;
    }

    .code-cell {
      font-family: monospace;
      font-size: 14px;
    }

    .description-cell {
      max-width: 300px;
    }

    .description-text {
      font-weight: 500;
    }

    .specification-text {
      font-size: 12px;
      color: #718096;
      margin-top: 2px;
    }

    .number-header {
      text-align: right;
    }

    .number-cell {
      text-align: right;
      font-family: monospace;
    }

    mat-chip {
      font-size: 12px;
      height: 24px;
      line-height: 24px;
    }

    .status-planned {
      background-color: #e2e8f0;
      color: #2d3748;
    }

    .status-partially-allocated {
      background-color: #fef3c7;
      color: #92400e;
    }

    .status-fully-allocated {
      background-color: #d1fae5;
      color: #065f46;
    }

    .status-ordered {
      background-color: #dbeafe;
      color: #1e40af;
    }

    .status-delivered {
      background-color: #e9d5ff;
      color: #6b21a8;
    }

    .quote-chip {
      background-color: #dbeafe;
      color: #1e40af;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .quote-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .no-quote {
      color: #cbd5e0;
    }

    .action-buttons {
      display: flex;
      gap: 4px;
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
      .header {
        flex-direction: column;
        gap: 16px;
      }

      .header-actions {
        width: 100%;
        flex-wrap: wrap;
      }

      .filters {
        flex-direction: column;
        width: 100%;
      }

      .filter-field,
      .search-field {
        width: 100%;
      }

      .summary-stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class BOQListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  boqItems: BOQItem[] = [];
  filteredItems: BOQItem[] = [];
  projects: Project[] = [];
  projectSummary: BOQSummary | null = null;
  loading = true;

  selectedProjectId = 'all';
  selectedStatus: BOQStatus | 'all' = 'all';
  searchControl = new FormControl('');

  statuses: BOQStatus[] = ['Planned', 'Partially Allocated', 'Fully Allocated', 'Ordered', 'Delivered'];

  displayedColumns = [
    'project',
    'itemCode', 
    'description',
    'required',
    'allocated',
    'remaining',
    'unitPrice',
    'totalPrice',
    'status',
    'quote',
    'actions'
  ];

  constructor(
    private boqService: BOQService,
    private projectService: ProjectService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadData();
    this.setupSearch();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData() {
    combineLatest([
      this.boqService.getBOQItems(),
      this.projectService.getProjects()
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([items, projects]) => {
        this.boqItems = items;
        this.projects = projects;
        this.filterItems();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.loading = false;
      }
    });
  }

  private setupSearch() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.filterItems());
  }

  private filterItems() {
    let filtered = [...this.boqItems];

    // Filter by project
    if (this.selectedProjectId !== 'all') {
      filtered = filtered.filter(item => item.projectId === this.selectedProjectId);
    }

    // Filter by status
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === this.selectedStatus);
    }

    // Filter by search term
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.itemCode.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.specification?.toLowerCase().includes(searchTerm)
      );
    }

    this.filteredItems = filtered;
  }

  onProjectChange() {
    this.filterItems();
    if (this.selectedProjectId !== 'all') {
      this.loadProjectSummary();
    } else {
      this.projectSummary = null;
    }
  }

  private loadProjectSummary() {
    this.boqService.getProjectSummary(this.selectedProjectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(summary => {
        this.projectSummary = summary;
      });
  }

  getProjectName(projectId: string): string {
    return this.projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  }

  getProjectLocation(projectId: string): string {
    return this.projects.find(p => p.id === projectId)?.location || '';
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(BOQFormDialogComponent, {
      width: '600px',
      data: { projects: this.projects }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  openImportDialog() {
    const dialogRef = this.dialog.open(BOQImportDialogComponent, {
      width: '800px',
      data: { projects: this.projects }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  editItem(item: BOQItem) {
    const dialogRef = this.dialog.open(BOQFormDialogComponent, {
      width: '600px',
      data: { 
        item: item,
        projects: this.projects 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  deleteItem(item: BOQItem) {
    if (confirm(`Are you sure you want to delete BOQ item "${item.description}"?`)) {
      this.boqService.deleteBOQItem(item.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadData();
          },
          error: (error) => {
            console.error('Error deleting item:', error);
            alert('Failed to delete item. Please try again.');
          }
        });
    }
  }

  allocateStock(item: BOQItem) {
    // TODO: Implement stock allocation dialog
    alert('Stock allocation feature coming soon!');
  }

  generateRFQ() {
    const itemsNeedingQuotes = this.filteredItems.filter(item => 
      item.needsQuote && item.remainingQuantity > 0
    );

    if (itemsNeedingQuotes.length === 0) {
      alert('No items requiring quotes found for this project.');
      return;
    }

    // TODO: Navigate to RFQ creation with pre-filled data
    alert(`Generated RFQ for ${itemsNeedingQuotes.length} items requiring quotes.`);
  }

  exportToCSV() {
    const csvContent = this.boqService.exportToCSV(this.filteredItems);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boq-items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}