import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, Subject, debounceTime, distinctUntilChanged, startWith, switchMap, merge } from 'rxjs';

import { MasterMaterial, MaterialFilter, MaterialCategory } from '../../models/material.model';
import { MaterialService } from '../../services/material.service';
import { MaterialFormDialogComponent } from '../material-form-dialog/material-form-dialog.component';
import { MaterialImportDialogComponent } from '../material-import-dialog/material-import-dialog.component';
import { LoadingService } from '../../../../core/services/loading.service';

@Component({
  selector: 'app-material-list',
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
    MatSnackBarModule,
  ],
  template: `
    <div class="materials-container">
      <!-- Header -->
      <mat-card class="header-card ff-card-header">
        <div class="header-content">
          <div class="header-title">
            <h1>Master Materials</h1>
            <p class="subtitle">Manage material catalog and specifications</p>
          </div>
          <div class="header-actions">
            <button
              mat-button
              (click)="exportMaterials()"
              [disabled]="!(materials$ | async)?.length"
            >
              <mat-icon>download</mat-icon>
              Export
            </button>
            <button mat-button (click)="openImportDialog()">
              <mat-icon>upload</mat-icon>
              Import
            </button>
            <button mat-raised-button color="primary" (click)="openMaterialDialog()">
              <mat-icon>add</mat-icon>
              Add Material
            </button>
          </div>
        </div>
      </mat-card>

      <!-- Filters -->
      <mat-card class="filters-card ff-card">
        <div class="filters-content">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search materials</mat-label>
            <input
              matInput
              [formControl]="searchControl"
              placeholder="Search by code, description..."
            />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="category-field">
            <mat-label>Category</mat-label>
            <mat-select [(ngModel)]="selectedCategory" (ngModelChange)="applyFilter()">
              <mat-option value="">All Categories</mat-option>
              <mat-option *ngFor="let cat of categories" [value]="cat">{{ cat }}</mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-icon-button (click)="resetFilters()" matTooltip="Reset filters">
            <mat-icon>filter_alt_off</mat-icon>
          </button>
        </div>
      </mat-card>

      <!-- Materials Table -->
      <mat-card class="table-card ff-card">
        <div class="table-container">
          <table mat-table [dataSource]="(materials$ | async) || []" class="materials-table">
            <!-- Item Code Column -->
            <ng-container matColumnDef="itemCode">
              <th mat-header-cell *matHeaderCellDef>Item Code</th>
              <td mat-cell *matCellDef="let material" class="code-cell">
                <span class="item-code">{{ material.itemCode }}</span>
              </td>
            </ng-container>

            <!-- Description Column -->
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let material">
                <div class="description-cell">
                  <span class="description">{{ material.description }}</span>
                  <span class="specifications" *ngIf="material.specifications">
                    {{ material.specifications }}
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Category Column -->
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Category</th>
              <td mat-cell *matCellDef="let material">
                <mat-chip class="category-chip" [ngClass]="getCategoryClass(material.category)">
                  {{ material.category }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- UoM Column -->
            <ng-container matColumnDef="unitOfMeasure">
              <th mat-header-cell *matHeaderCellDef>UoM</th>
              <td mat-cell *matCellDef="let material" class="uom-cell">
                <span class="uom-badge">{{ material.unitOfMeasure }}</span>
              </td>
            </ng-container>

            <!-- Unit Cost Column -->
            <ng-container matColumnDef="unitCost">
              <th mat-header-cell *matHeaderCellDef class="number-header">Unit Cost</th>
              <td mat-cell *matCellDef="let material" class="number-cell">
                R{{ material.unitCost | number: '1.2-2' }}
              </td>
            </ng-container>

            <!-- Stock Levels Column -->
            <ng-container matColumnDef="stockLevels">
              <th mat-header-cell *matHeaderCellDef>Stock Levels</th>
              <td mat-cell *matCellDef="let material">
                <div class="stock-levels">
                  <span class="min-stock" *ngIf="material.minimumStockLevel">
                    Min: {{ material.minimumStockLevel }}
                  </span>
                  <span class="reorder-point" *ngIf="material.reorderPoint">
                    Reorder: {{ material.reorderPoint }}
                  </span>
                </div>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let material">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="editMaterial(material)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="viewStock(material)">
                    <mat-icon>inventory</mat-icon>
                    <span>View Stock</span>
                  </button>
                  <button mat-menu-item (click)="duplicateMaterial(material)">
                    <mat-icon>content_copy</mat-icon>
                    <span>Duplicate</span>
                  </button>
                  <button mat-menu-item (click)="deleteMaterial(material)" class="delete-option">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

            <!-- No data row -->
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
                <div class="empty-state">
                  <mat-icon>inventory_2</mat-icon>
                  <p>No materials found</p>
                  <button mat-raised-button color="primary" (click)="openMaterialDialog()">
                    <mat-icon>add</mat-icon>
                    Add First Material
                  </button>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .materials-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header-card {
        margin-bottom: 24px;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }

      .header-title {
        h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 500;
          color: rgb(var(--ff-foreground));
        }

        .subtitle {
          margin: 4px 0 0;
          color: rgb(var(--ff-muted-foreground));
        }
      }

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .filters-card {
        margin-bottom: 24px;
      }

      .filters-content {
        display: flex;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
      }

      .search-field {
        flex: 1;
        min-width: 300px;
      }

      .category-field {
        width: 250px;
      }

      .table-card {
        overflow: hidden;
      }

      .table-container {
        overflow-x: auto;
      }

      .materials-table {
        width: 100%;
        min-width: 800px;

        .code-cell {
          font-family: monospace;
          font-weight: 500;
        }

        .description-cell {
          .description {
            display: block;
            font-weight: 500;
            color: rgb(var(--ff-foreground));
          }

          .specifications {
            display: block;
            font-size: 12px;
            color: rgb(var(--ff-muted-foreground));
            margin-top: 2px;
          }
        }

        .category-chip {
          font-size: 12px !important;
          height: 24px !important;

          &.cable {
            background-color: rgb(var(--ff-info) / 0.15) !important;
            color: rgb(var(--ff-info)) !important;
          }

          &.pole {
            background-color: rgb(var(--ff-warning) / 0.15) !important;
            color: rgb(var(--ff-warning)) !important;
          }

          &.connector {
            background-color: rgb(var(--ff-success) / 0.15) !important;
            color: rgb(var(--ff-success)) !important;
          }

          &.accessories {
            background-color: rgb(var(--ff-muted)) !important;
            color: rgb(var(--ff-muted-foreground)) !important;
          }
        }

        .uom-cell {
          .uom-badge {
            background-color: rgb(var(--ff-secondary));
            color: rgb(var(--ff-secondary-foreground));
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }
        }

        .number-header {
          text-align: right;
        }

        .number-cell {
          text-align: right;
          font-weight: 500;
        }

        .stock-levels {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;

          .min-stock {
            color: rgb(var(--ff-muted-foreground));
          }

          .reorder-point {
            color: rgb(var(--ff-warning));
          }
        }
      }

      .empty-state {
        text-align: center;
        padding: 64px 24px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: rgb(var(--ff-muted-foreground));
          margin-bottom: 16px;
        }

        p {
          color: rgb(var(--ff-muted-foreground));
          margin: 0 0 24px;
        }
      }

      .delete-option {
        color: rgb(var(--ff-destructive));

        mat-icon {
          color: rgb(var(--ff-destructive));
        }
      }

      .no-data {
        height: 400px;
      }
    `,
  ],
})
export class MaterialListComponent implements OnInit {
  private materialService = inject(MaterialService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private loadingService = inject(LoadingService);

  materials$!: Observable<MasterMaterial[]>;
  displayedColumns = [
    'itemCode',
    'description',
    'category',
    'unitOfMeasure',
    'unitCost',
    'stockLevels',
    'actions',
  ];
  categories: MaterialCategory[] = this.materialService.getCategories();

  searchControl = new FormControl('');
  selectedCategory = '';
  private refreshSubject = new Subject<void>();

  ngOnInit() {
    this.setupSearch();
    this.loadMaterials();
  }

  private setupSearch() {
    // Merge search control changes with refresh trigger
    this.materials$ = merge(
      this.searchControl.valueChanges.pipe(startWith('')),
      this.refreshSubject
    ).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(() => {
        const filter: MaterialFilter = {
          searchTerm: this.searchControl.value || undefined,
          category: (this.selectedCategory as MaterialCategory) || undefined,
          isActive: true,
        };
        return this.materialService.getMaterials(filter);
      }),
    );
  }

  private loadMaterials() {
    // Trigger a refresh
    this.refreshSubject.next();
  }

  applyFilter() {
    this.loadMaterials();
  }

  resetFilters() {
    this.searchControl.setValue('');
    this.selectedCategory = '';
    this.loadMaterials();
  }

  getCategoryClass(category: string): string {
    if (category.includes('Cable')) return 'cable';
    if (category.includes('Pole')) return 'pole';
    if (category.includes('Connector')) return 'connector';
    return 'accessories';
  }

  openMaterialDialog(material?: MasterMaterial) {
    const dialogRef = this.dialog.open(MaterialFormDialogComponent, {
      width: '700px',
      maxWidth: '90vw',
      maxHeight: '85vh',
      data: { material },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadMaterials();
        this.snackBar.open(
          material ? 'Material updated successfully' : 'Material created successfully',
          'Close',
          { duration: 3000 },
        );
      }
    });
  }

  editMaterial(material: MasterMaterial) {
    this.openMaterialDialog(material);
  }

  duplicateMaterial(material: MasterMaterial) {
    const duplicate = { ...material };
    delete duplicate.id;
    duplicate.itemCode = `${material.itemCode}-COPY`;
    this.openMaterialDialog(duplicate);
  }

  async deleteMaterial(material: MasterMaterial) {
    if (confirm(`Are you sure you want to delete "${material.description}"?`)) {
      try {
        await this.materialService.deleteMaterial(material.id!).toPromise();
        this.snackBar.open('Material deleted successfully', 'Close', { duration: 3000 });
        this.loadMaterials();
      } catch (error) {
        this.snackBar.open('Error deleting material', 'Close', { duration: 3000 });
      }
    }
  }

  viewStock(material: MasterMaterial) {
    this.router.navigate(['/stock'], { queryParams: { itemCode: material.itemCode } });
  }

  openImportDialog() {
    const dialogRef = this.dialog.open(MaterialImportDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadMaterials();
        this.snackBar.open(`Successfully imported ${result} materials`, 'Close', {
          duration: 3000,
        });
      }
    });
  }

  async exportMaterials() {
    const materials = await this.materialService.getMaterials({ isActive: true }).toPromise();
    if (!materials || materials.length === 0) {
      this.snackBar.open('No materials to export', 'Close', { duration: 3000 });
      return;
    }

    const csv = this.materialService.exportMaterials(materials);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `materials-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.snackBar.open('Materials exported successfully', 'Close', { duration: 3000 });
  }
}
