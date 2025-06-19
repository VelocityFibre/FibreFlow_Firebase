import {
  Component,
  Input,
  OnInit,
  inject,
  ViewChild,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
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
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StockService } from '../../../stock/services/stock.service';
import { StockItem, StockCategory } from '../../../stock/models/stock-item.model';
import { StockMovementFormDialogComponent } from '../../../stock/components/stock-movement-form-dialog/stock-movement-form-dialog.component';
import { ProjectService } from '../../../../core/services/project.service';
import { Project } from '../../../../core/models/project.model';

@Component({
  selector: 'app-project-stock',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  ],
  template: `
    <div class="project-stock-container">
      <mat-card class="ff-card-stock">
        <mat-card-header>
          <mat-card-title>Project Stock Items</mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="addStockItem()">
              <mat-icon>add</mat-icon>
              Add Stock Item
            </button>
          </div>
        </mat-card-header>

        <mat-card-content>
          <!-- Summary Stats -->
          <div class="stock-summary" *ngIf="!loading">
            <div class="stat-card">
              <mat-icon>inventory</mat-icon>
              <div class="stat-content">
                <span class="stat-value">{{ totalItems }}</span>
                <span class="stat-label">Total Items</span>
              </div>
            </div>
            <div class="stat-card">
              <mat-icon>attach_money</mat-icon>
              <div class="stat-content">
                <span class="stat-value">{{ formatCurrency(totalValue) }}</span>
                <span class="stat-label">Total Value</span>
              </div>
            </div>
            <div class="stat-card low-stock" *ngIf="lowStockItems > 0">
              <mat-icon>warning</mat-icon>
              <div class="stat-content">
                <span class="stat-value">{{ lowStockItems }}</span>
                <span class="stat-label">Low Stock</span>
              </div>
            </div>
            <div class="stat-card out-of-stock" *ngIf="outOfStockItems > 0">
              <mat-icon>error</mat-icon>
              <div class="stat-content">
                <span class="stat-value">{{ outOfStockItems }}</span>
                <span class="stat-label">Out of Stock</span>
              </div>
            </div>
          </div>

          <!-- Filters -->
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

            <button mat-button (click)="clearFilters()" *ngIf="hasActiveFilters()">
              <mat-icon>clear</mat-icon>
              Clear Filters
            </button>
          </div>

          <!-- Table -->
          <div class="table-container" *ngIf="!loading; else loadingTemplate">
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

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let item">
                  <button mat-icon-button [matMenuTriggerFor]="menu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="issueStock(item)">
                      <mat-icon>arrow_forward</mat-icon>
                      <span>Issue Stock</span>
                    </button>
                    <button mat-menu-item (click)="returnStock(item)">
                      <mat-icon>arrow_back</mat-icon>
                      <span>Return Stock</span>
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

              <!-- No data row -->
              <tr class="mat-row no-data-row" *matNoDataRow>
                <td class="mat-cell" [attr.colspan]="displayedColumns.length">
                  <div class="no-data">
                    <mat-icon>inventory_2</mat-icon>
                    <p>No stock items in this project yet.</p>
                    <button mat-raised-button color="primary" (click)="addStockItem()">
                      <mat-icon>add</mat-icon>
                      Add Stock Item
                    </button>
                  </div>
                </td>
              </tr>
            </table>

            <mat-paginator
              [pageSizeOptions]="[10, 25, 50]"
              showFirstLastButtons
              aria-label="Select page of stock items"
            >
            </mat-paginator>
          </div>

          <ng-template #loadingTemplate>
            <div class="loading">
              <mat-spinner></mat-spinner>
              <p>Loading project stock items...</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .project-stock-container {
        padding: 24px 0;
      }

      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }

      .stock-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: var(--mat-sys-surface-variant);
        border-radius: 8px;
        border: 1px solid var(--mat-sys-outline-variant);
      }

      .stat-card mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--mat-sys-primary);
      }

      .stat-card.low-stock mat-icon {
        color: #f57c00;
      }

      .stat-card.out-of-stock mat-icon {
        color: #d32f2f;
      }

      .stat-content {
        display: flex;
        flex-direction: column;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }

      .stat-label {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        text-transform: uppercase;
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
        overflow-x: auto;
      }

      table {
        width: 100%;
      }

      .item-name {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .item-name small {
        color: var(--mat-sys-on-surface-variant);
        font-size: 12px;
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
        color: var(--mat-sys-on-surface-variant);
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

      .low-stock-row {
        background-color: #fff8e1;
      }

      .out-of-stock-row {
        background-color: #ffebee;
      }

      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 48px;
      }

      .loading p {
        color: var(--mat-sys-on-surface-variant);
        margin: 0;
      }

      .no-data-row {
        height: 200px;
      }

      .no-data {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 48px;
        text-align: center;
      }

      .no-data mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--mat-sys-outline);
      }

      .no-data p {
        color: var(--mat-sys-on-surface-variant);
        margin: 0;
      }
    `,
  ],
})
export class ProjectStockComponent implements OnInit {
  @Input() projectId!: string;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private stockService = inject(StockService);
  private projectService = inject(ProjectService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  stockItems$!: Observable<StockItem[]>;
  project$!: Observable<Project | undefined>;
  dataSource!: MatTableDataSource<StockItem>;
  displayedColumns: string[] = ['itemCode', 'name', 'category', 'stockLevels', 'cost', 'actions'];

  loading = true;
  searchTerm = '';
  selectedCategory = '';

  totalItems = 0;
  lowStockItems = 0;
  outOfStockItems = 0;
  totalValue = 0;

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
    this.project$ = this.projectService.getProjectById(this.projectId);
    this.loadStockItems();
  }

  loadStockItems() {
    this.loading = true;
    this.stockItems$ = this.stockService.getStockItemsByProject(this.projectId);

    this.stockItems$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.dataSource = new MatTableDataSource(items);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      // Set custom filter predicate
      this.dataSource.filterPredicate = (data: StockItem, _filter: string) => {
        const searchStr = (
          data.itemCode +
          data.name +
          (data.description || '') +
          data.category
        ).toLowerCase();

        const matchesSearch = searchStr.includes(this.searchTerm.toLowerCase());
        const matchesCategory = !this.selectedCategory || data.category === this.selectedCategory;

        return matchesSearch && matchesCategory;
      };

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
  }

  hasActiveFilters(): boolean {
    return !!this.searchTerm || !!this.selectedCategory;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.applyFilter();
  }

  getCategoryLabel(category: string): string {
    const cat = this.categories.find((c) => c.value === category);
    return cat ? cat.label : category;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(value);
  }

  addStockItem() {
    // TODO: Open stock form dialog to add new item
    this.snackBar.open('Stock form dialog coming soon', 'Close', {
      duration: 3000,
    });
  }

  issueStock(item: StockItem) {
    const dialogRef = this.dialog.open(StockMovementFormDialogComponent, {
      width: '600px',
      data: {
        stockItem: item,
        movementType: 'issue',
        projectId: this.projectId,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadStockItems();
        this.snackBar.open('Stock issued successfully', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  returnStock(item: StockItem) {
    const dialogRef = this.dialog.open(StockMovementFormDialogComponent, {
      width: '600px',
      data: {
        stockItem: item,
        movementType: 'return',
        projectId: this.projectId,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadStockItems();
        this.snackBar.open('Stock returned successfully', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  adjustStock(item: StockItem) {
    const dialogRef = this.dialog.open(StockMovementFormDialogComponent, {
      width: '600px',
      data: {
        stockItem: item,
        movementType: 'adjustment',
        projectId: this.projectId,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadStockItems();
        this.snackBar.open('Stock adjusted successfully', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  viewMovements(_item: StockItem) {
    // TODO: Open movements dialog
    this.snackBar.open('Movement history coming soon', 'Close', {
      duration: 3000,
    });
  }
}
