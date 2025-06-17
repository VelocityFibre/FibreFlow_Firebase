import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Observable } from 'rxjs';

import { StockService } from '../../services/stock.service';
import { StockItem, StockCategory, StockItemExport } from '../../models/stock-item.model';
import { StockFormComponent } from '../stock-form/stock-form.component';
import { StockImportDialogComponent } from '../stock-import-dialog/stock-import-dialog.component';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDividerModule,
    MatButtonToggleModule,
    ScrollingModule,
  ],
  template: `
    <div class="stock-list-container">
      <div class="header">
        <h1>Stock Management</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openAddDialog()">
            <mat-icon>add</mat-icon>
            Add Item
          </button>
          <button mat-raised-button (click)="openImportDialog()">
            <mat-icon>upload</mat-icon>
            Import
          </button>
          <button mat-raised-button (click)="exportItems()">
            <mat-icon>download</mat-icon>
            Export
          </button>
        </div>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Search</mat-label>
          <input
            matInput
            [(ngModel)]="searchTerm"
            (keyup)="applyFilter()"
            placeholder="Search by name, code, or description"
          />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select [(ngModel)]="selectedCategory" (selectionChange)="applyFilter()">
            <mat-option value="">All Categories</mat-option>
            <mat-option *ngFor="let category of categories" [value]="category.value">
              {{ category.label }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="selectedStatus" (selectionChange)="applyFilter()">
            <mat-option value="">All Status</mat-option>
            <mat-option value="active">Active</mat-option>
            <mat-option value="inactive">Inactive</mat-option>
            <mat-option value="out_of_stock">Out of Stock</mat-option>
            <mat-option value="discontinued">Discontinued</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-button (click)="clearFilters()" *ngIf="hasActiveFilters()">
          <mat-icon>clear</mat-icon>
          Clear Filters
        </button>
      </div>

      <div class="table-container" *ngIf="!loading; else loadingTemplate">
        <!-- Toggle for virtual scrolling when there are many items -->
        <div class="view-controls" *ngIf="totalItems > virtualScrollThreshold">
          <mat-button-toggle-group [(value)]="useVirtualScrolling" (change)="toggleView()">
            <mat-button-toggle [value]="false">
              <mat-icon>table_view</mat-icon>
              Table View
            </mat-button-toggle>
            <mat-button-toggle [value]="true">
              <mat-icon>view_list</mat-icon>
              Virtual List
            </mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <!-- Traditional table view -->
        <div class="table-view" *ngIf="!useVirtualScrolling">
          <table mat-table [dataSource]="dataSource" matSort>
            <!-- Item Code Column -->
            <ng-container matColumnDef="itemCode">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Item Code</th>
              <td mat-cell *matCellDef="let item">{{ item.itemCode }}</td>
            </ng-container>

            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
              <td mat-cell *matCellDef="let item">
                <div class="item-name">
                  <strong>{{ item.materialDetails?.name || item.name }}</strong>
                  <small *ngIf="item.materialDetails?.description || item.description">
                    {{ item.materialDetails?.description || item.description }}
                  </small>
                  <mat-icon 
                    *ngIf="item.materialDetails" 
                    class="material-linked-icon" 
                    matTooltip="Linked to Master Material: {{item.itemCode}}"
                    inline="true">
                    link
                  </mat-icon>
                </div>
              </td>
            </ng-container>

            <!-- Category Column -->
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Category</th>
              <td mat-cell *matCellDef="let item">
                <mat-chip [ngClass]="'category-' + item.category">
                  {{ getCategoryLabel(item.category) }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Stock Levels Column -->
            <ng-container matColumnDef="stockLevels">
              <th mat-header-cell *matHeaderCellDef>Stock Levels</th>
              <td mat-cell *matCellDef="let item">
                <div class="stock-levels">
                  <div class="stock-row">
                    <span class="stock-label">Current:</span>
                    <span
                      [class.low-stock]="item.currentStock <= item.reorderLevel"
                      [class.out-of-stock]="item.currentStock === 0"
                    >
                      {{ item.currentStock }} {{ item.unitOfMeasure }}
                    </span>
                  </div>
                  <div class="stock-row">
                    <span class="stock-label">Available:</span>
                    <span>{{ item.availableStock }} {{ item.unitOfMeasure }}</span>
                  </div>
                  <div class="stock-row" *ngIf="item.allocatedStock > 0">
                    <span class="stock-label">Allocated:</span>
                    <span class="allocated"
                      >{{ item.allocatedStock }} {{ item.unitOfMeasure }}</span
                    >
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Unit Cost Column -->
            <ng-container matColumnDef="cost">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Unit Cost</th>
              <td mat-cell *matCellDef="let item">{{ formatCurrency(item.standardCost) }}</td>
            </ng-container>

            <!-- Location Column -->
            <ng-container matColumnDef="location">
              <th mat-header-cell *matHeaderCellDef>Location</th>
              <td mat-cell *matCellDef="let item">
                <span *ngIf="item.warehouseLocation">{{ item.warehouseLocation }}</span>
                <span *ngIf="!item.warehouseLocation" class="no-location">-</span>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let item">
                <mat-chip [ngClass]="'status-' + item.status">
                  {{ getStatusLabel(item.status) }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let item">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="viewItem(item)">
                    <mat-icon>visibility</mat-icon>
                    <span>View Details</span>
                  </button>
                  <button mat-menu-item (click)="editItem(item)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="viewMovements(item)">
                    <mat-icon>history</mat-icon>
                    <span>View Movements</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="adjustStock(item)">
                    <mat-icon>tune</mat-icon>
                    <span>Adjust Stock</span>
                  </button>
                  <button mat-menu-item (click)="allocateStock(item)">
                    <mat-icon>assignment</mat-icon>
                    <span>Allocate to Project</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="deleteItem(item)" class="delete-action">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns"
              [class.low-stock-row]="row.currentStock <= row.reorderLevel"
              [class.out-of-stock-row]="row.currentStock === 0"
            ></tr>
          </table>

          <mat-paginator
            [pageSizeOptions]="[10, 25, 50, 100]"
            showFirstLastButtons
            aria-label="Select page of stock items"
          >
          </mat-paginator>
        </div>

        <!-- Virtual scroll view -->
        <div class="virtual-scroll-view" *ngIf="useVirtualScrolling">
          <cdk-virtual-scroll-viewport itemSize="72" class="stock-viewport">
            <div
              *cdkVirtualFor="let item of filteredItems; trackBy: trackByFn"
              class="virtual-stock-item"
            >
              <div class="stock-item-row">
                <span class="item-code">{{ item.itemCode }}</span>
                <span class="item-name">{{ item.name }}</span>
                <span class="item-category">{{ getCategoryLabel(item.category) }}</span>
                <span class="item-stock">{{ item.currentStock }} {{ item.unitOfMeasure }}</span>
                <span class="item-cost">{{ formatCurrency(item.standardCost) }}</span>
                <div class="item-actions">
                  <button mat-icon-button (click)="editItem(item)">
                    <mat-icon>edit</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </cdk-virtual-scroll-viewport>
        </div>
      </div>

      <ng-template #loadingTemplate>
        <div class="loading">
          <mat-spinner></mat-spinner>
          <p>Loading stock items...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .stock-list-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        background-color: var(--mat-sys-background);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }

      .header-actions {
        display: flex;
        gap: 12px;
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

      .loading {
        display: flex;
        justify-content: center;
        padding: 48px;
      }

      .table-container {
        background: var(--mat-sys-surface);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: var(--mat-sys-elevation-1);
        border: 1px solid var(--mat-sys-outline-variant);
      }

      table {
        width: 100%;
      }

      .item-name {
        display: flex;
        flex-direction: column;
        gap: 2px;
        position: relative;
      }

      .item-name small {
        color: #666;
        font-size: 12px;
      }

      .material-linked-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #4caf50;
        vertical-align: middle;
        margin-left: 8px;
      }

      .stock-levels {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 13px;
      }

      .stock-row {
        display: flex;
        gap: 8px;
      }

      .stock-label {
        color: #666;
        min-width: 65px;
      }

      .low-stock {
        color: #f57c00;
        font-weight: 500;
      }

      .out-of-stock {
        color: #d32f2f;
        font-weight: 500;
      }

      .allocated {
        color: #1976d2;
      }

      .no-location {
        color: #999;
      }

      mat-chip {
        font-size: 12px !important;
        height: 24px !important;
        line-height: 24px !important;
      }

      .category-fibre_cable {
        background-color: #e3f2fd !important;
        color: #1565c0 !important;
      }
      .category-poles {
        background-color: #f3e5f5 !important;
        color: #6a1b9a !important;
      }
      .category-equipment {
        background-color: #e8f5e9 !important;
        color: #2e7d32 !important;
      }
      .category-tools {
        background-color: #fff3e0 !important;
        color: #e65100 !important;
      }
      .category-consumables {
        background-color: #fce4ec !important;
        color: #c2185b !important;
      }
      .category-network_equipment {
        background-color: #e0f2f1 !important;
        color: #00695c !important;
      }
      .category-safety_equipment {
        background-color: #ffebee !important;
        color: #c62828 !important;
      }
      .category-other {
        background-color: #f5f5f5 !important;
        color: #616161 !important;
      }

      .status-active {
        background-color: #c8e6c9 !important;
        color: #1b5e20 !important;
      }
      .status-inactive {
        background-color: #ffecb3 !important;
        color: #e65100 !important;
      }
      .status-out_of_stock {
        background-color: #ffcdd2 !important;
        color: #b71c1c !important;
      }
      .status-discontinued {
        background-color: #e0e0e0 !important;
        color: #616161 !important;
      }

      .low-stock-row {
        background-color: #fff8e1;
      }

      .out-of-stock-row {
        background-color: #ffebee;
      }

      .delete-action {
        color: #d32f2f;
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }

      .loading p {
        color: var(--mat-sys-on-surface-variant);
        margin: 0;
      }

      // Virtual scrolling styles
      .view-controls {
        padding: 16px;
        border-bottom: 1px solid var(--mat-sys-outline-variant);
        background: var(--mat-sys-surface-variant);
      }

      .stock-viewport {
        height: 600px;
        width: 100%;
      }

      .virtual-stock-item {
        padding: 8px 16px;
        border-bottom: 1px solid var(--mat-sys-outline-variant);
      }

      .stock-item-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 8px 0;
      }

      .item-code {
        min-width: 100px;
        font-weight: 500;
        color: var(--mat-sys-primary);
      }

      .item-name {
        flex: 1;
        min-width: 200px;
      }

      .item-category {
        min-width: 120px;
        font-size: 12px;
      }

      .item-stock {
        min-width: 100px;
        text-align: right;
      }

      .item-cost {
        min-width: 100px;
        text-align: right;
        font-weight: 500;
      }

      .item-actions {
        min-width: 60px;
      }
    `,
  ],
})
export class StockListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private stockService = inject(StockService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  stockItems$!: Observable<StockItem[]>;
  dataSource!: MatTableDataSource<StockItem>;
  displayedColumns: string[] = [
    'itemCode',
    'name',
    'category',
    'stockLevels',
    'cost',
    'location',
    'status',
    'actions',
  ];

  loading = true;
  searchTerm = '';
  selectedCategory = '';
  selectedStatus = '';

  totalItems = 0;
  lowStockItems = 0;
  outOfStockItems = 0;
  totalValue = 0;

  // Virtual scrolling properties
  useVirtualScrolling = false;
  virtualScrollThreshold = 50;
  filteredItems: StockItem[] = [];

  categories = [
    { value: StockCategory.FIBRE_CABLE, label: 'Fibre Cable' },
    { value: StockCategory.POLES, label: 'Poles' },
    { value: StockCategory.EQUIPMENT, label: 'Equipment' },
    { value: StockCategory.TOOLS, label: 'Tools' },
    { value: StockCategory.CONSUMABLES, label: 'Consumables' },
    { value: StockCategory.HOME_CONNECTIONS, label: 'Home Connections' },
    { value: StockCategory.NETWORK_EQUIPMENT, label: 'Network Equipment' },
    { value: StockCategory.SAFETY_EQUIPMENT, label: 'Safety Equipment' },
    { value: StockCategory.OTHER, label: 'Other' },
  ];

  ngOnInit() {
    this.loadStockItems();
  }

  loadStockItems() {
    this.loading = true;
    this.stockItems$ = this.stockService.getStockItems();

    this.stockItems$.subscribe((items) => {
      this.dataSource = new MatTableDataSource(items);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      // Set custom filter predicate
      this.dataSource.filterPredicate = (data: StockItem, _filter: string) => {
        const searchStr = (
          data.itemCode +
          data.name +
          (data.description || '') +
          data.category +
          (data.warehouseLocation || '')
        ).toLowerCase();

        const matchesSearch = searchStr.includes(this.searchTerm.toLowerCase());
        const matchesCategory = !this.selectedCategory || data.category === this.selectedCategory;
        const matchesStatus = !this.selectedStatus || data.status === this.selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
      };

      // Initialize filtered items for virtual scrolling
      this.filteredItems = items;

      // Determine if virtual scrolling should be enabled automatically
      if (items.length > this.virtualScrollThreshold && !this.useVirtualScrolling) {
        // Auto-enable virtual scrolling for large datasets
        this.useVirtualScrolling = items.length > 100;
      }

      this.calculateStats(items);
      this.loading = false;
      this.applyFilter();
    });
  }

  calculateStats(items: StockItem[]) {
    this.totalItems = items.length;
    this.lowStockItems = items.filter(
      (item) => item.currentStock > 0 && item.currentStock <= item.reorderLevel,
    ).length;
    this.outOfStockItems = items.filter((item) => item.currentStock === 0).length;
    this.totalValue = items.reduce((sum, item) => sum + item.currentStock * item.standardCost, 0);
  }

  applyFilter() {
    this.dataSource.filter = 'filter';

    // Also filter items for virtual scrolling
    if (this.dataSource.filteredData) {
      this.filteredItems = this.dataSource.filteredData;
    }
  }

  hasActiveFilters(): boolean {
    return !!this.searchTerm || !!this.selectedCategory || !!this.selectedStatus;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedStatus = '';
    this.applyFilter();
  }

  // TrackBy function for virtual scrolling performance
  trackByFn(index: number, item: StockItem): string {
    return item.id || index.toString();
  }

  // Toggle between table and virtual scroll view
  toggleView() {
    // View toggle is handled by the template binding
    // This method can be used for additional logic if needed
  }

  getCategoryLabel(category: string): string {
    const cat = this.categories.find((c) => c.value === category);
    return cat ? cat.label : category;
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(value);
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(StockFormComponent, {
      width: '600px',
      data: { mode: 'add' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadStockItems();
        this.snackBar.open('Stock item added successfully', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  editItem(item: StockItem) {
    const dialogRef = this.dialog.open(StockFormComponent, {
      width: '600px',
      data: { mode: 'edit', item },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadStockItems();
        this.snackBar.open('Stock item updated successfully', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  viewItem(item: StockItem) {
    // TODO: Navigate to item detail page or open detail dialog
    console.log('View item:', item);
  }

  viewMovements(item: StockItem) {
    // TODO: Open movements dialog
    console.log('View movements for:', item);
  }

  adjustStock(item: StockItem) {
    // TODO: Open stock adjustment dialog
    console.log('Adjust stock for:', item);
  }

  allocateStock(item: StockItem) {
    // TODO: Open allocation dialog
    console.log('Allocate stock for:', item);
  }

  async deleteItem(item: StockItem) {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      try {
        await this.stockService.deleteStockItem(item.id!);
        this.snackBar.open('Stock item deleted successfully', 'Close', {
          duration: 3000,
        });
        this.loadStockItems();
      } catch (error) {
        this.snackBar.open('Error deleting stock item', 'Close', {
          duration: 3000,
        });
      }
    }
  }

  openImportDialog() {
    const dialogRef = this.dialog.open(StockImportDialogComponent, {
      width: '800px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadStockItems();
        this.snackBar.open(`Imported ${result.success} items successfully`, 'Close', {
          duration: 3000,
        });
      }
    });
  }

  exportItems() {
    this.stockService.exportStockItems().subscribe((items) => {
      const exportData: StockItemExport[] = items.map((item) => ({
        id: item.id!,
        itemCode: item.itemCode,
        name: item.name,
        description: item.description || '',
        category: item.category,
        subcategory: item.subcategory || '',
        unitOfMeasure: item.unitOfMeasure,
        currentStock: item.currentStock,
        availableStock: item.currentStock - item.allocatedStock,
        allocatedStock: item.allocatedStock,
        minimumStock: item.minimumStock,
        reorderLevel: item.reorderLevel,
        standardCost: item.standardCost,
        warehouseLocation: item.warehouseLocation || '',
        status: item.status,
        lastUpdated: item.updatedAt.toDate().toISOString(),
      }));

      this.downloadCSV(exportData);
    });
  }

  private downloadCSV(data: StockItemExport[]) {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof StockItemExport];
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          })
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_items_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
