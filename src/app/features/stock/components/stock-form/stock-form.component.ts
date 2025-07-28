import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, of, startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { StockService } from '../../services/stock.service';
import {
  StockItem,
  StockCategory,
  StockItemStatus,
  UnitOfMeasure,
} from '../../models/stock-item.model';
import { MaterialService } from '../../../materials/services/material.service';
import { MasterMaterial } from '../../../materials/models/material.model';
import { ProjectService } from '../../../../core/services/project.service';
import { Project } from '../../../../core/models/project.model';

@Component({
  selector: 'app-stock-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'add' ? 'Add New Stock Item' : 'Edit Stock Item' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="stockForm" class="stock-form">
        <!-- Basic Information -->
        <div class="form-section">
          <h3>Basic Information</h3>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Item Code / Search Material</mat-label>
              <input
                matInput
                formControlName="itemCode"
                placeholder="Type to search materials or enter custom code"
                [matAutocomplete]="auto"
              />
              <mat-icon matSuffix *ngIf="selectedMaterial" class="material-linked">link</mat-icon>
              <mat-autocomplete
                #auto="matAutocomplete"
                [displayWith]="displayMaterial"
                (optionSelected)="onMaterialSelected($event)"
              >
                <mat-option *ngFor="let material of filteredMaterials$ | async" [value]="material">
                  <div class="material-option">
                    <span class="material-code">{{ material.itemCode }}</span>
                    <span class="material-name">{{ material.description }}</span>
                  </div>
                </mat-option>
              </mat-autocomplete>
              <button
                mat-icon-button
                matSuffix
                (click)="generateItemCode()"
                *ngIf="data.mode === 'add'"
                matTooltip="Generate Code"
              >
                <mat-icon>auto_awesome</mat-icon>
              </button>
              <mat-error *ngIf="stockForm.get('itemCode')?.hasError('required')">
                Item code is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" placeholder="e.g., Single Mode Fiber Cable" />
              <mat-error *ngIf="stockForm.get('name')?.hasError('required')">
                Name is required
              </mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea
              matInput
              formControlName="description"
              rows="3"
              placeholder="Detailed description of the item"
            ></textarea>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select formControlName="category">
                <mat-option [value]="StockCategory.FIBRE_CABLE">Fibre Cable</mat-option>
                <mat-option [value]="StockCategory.POLES">Poles</mat-option>
                <mat-option [value]="StockCategory.EQUIPMENT">Equipment</mat-option>
                <mat-option [value]="StockCategory.TOOLS">Tools</mat-option>
                <mat-option [value]="StockCategory.CONSUMABLES">Consumables</mat-option>
                <mat-option [value]="StockCategory.HOME_CONNECTIONS">Home Connections</mat-option>
                <mat-option [value]="StockCategory.NETWORK_EQUIPMENT">Network Equipment</mat-option>
                <mat-option [value]="StockCategory.SAFETY_EQUIPMENT">Safety Equipment</mat-option>
                <mat-option [value]="StockCategory.OTHER">Other</mat-option>
              </mat-select>
              <mat-error *ngIf="stockForm.get('category')?.hasError('required')">
                Category is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Subcategory</mat-label>
              <input matInput formControlName="subcategory" placeholder="Optional subcategory" />
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Unit of Measure</mat-label>
              <mat-select formControlName="unitOfMeasure">
                <mat-option [value]="UnitOfMeasure.METERS">Meters</mat-option>
                <mat-option [value]="UnitOfMeasure.UNITS">Units</mat-option>
                <mat-option [value]="UnitOfMeasure.PIECES">Pieces</mat-option>
                <mat-option [value]="UnitOfMeasure.BOXES">Boxes</mat-option>
                <mat-option [value]="UnitOfMeasure.ROLLS">Rolls</mat-option>
                <mat-option [value]="UnitOfMeasure.SETS">Sets</mat-option>
                <mat-option [value]="UnitOfMeasure.LITERS">Liters</mat-option>
                <mat-option [value]="UnitOfMeasure.KILOGRAMS">Kilograms</mat-option>
                <mat-option [value]="UnitOfMeasure.HOURS">Hours</mat-option>
              </mat-select>
              <mat-error *ngIf="stockForm.get('unitOfMeasure')?.hasError('required')">
                Unit of measure is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option [value]="StockItemStatus.ACTIVE">Active</mat-option>
                <mat-option [value]="StockItemStatus.INACTIVE">Inactive</mat-option>
                <mat-option [value]="StockItemStatus.DISCONTINUED">Discontinued</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Project Information (if applicable) -->
          <div class="form-row" *ngIf="data.projectId">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Project</mat-label>
              <mat-select formControlName="projectId" [disabled]="true">
                <mat-option *ngFor="let project of projects$ | async" [value]="project.id">
                  {{ project.name }}
                </mat-option>
              </mat-select>
              <mat-hint>This stock item will be associated with the selected project</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Stock Levels -->
        <div class="form-section">
          <h3>Stock Levels</h3>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Current Stock</mat-label>
              <input matInput type="number" formControlName="currentStock" min="0" />
              <mat-error *ngIf="stockForm.get('currentStock')?.hasError('required')">
                Current stock is required
              </mat-error>
              <mat-error *ngIf="stockForm.get('currentStock')?.hasError('min')">
                Current stock cannot be negative
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Minimum Stock</mat-label>
              <input matInput type="number" formControlName="minimumStock" min="0" />
              <mat-error *ngIf="stockForm.get('minimumStock')?.hasError('required')">
                Minimum stock is required
              </mat-error>
              <mat-error *ngIf="stockForm.get('minimumStock')?.hasError('min')">
                Minimum stock cannot be negative
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Reorder Level</mat-label>
              <input matInput type="number" formControlName="reorderLevel" min="0" />
              <mat-error *ngIf="stockForm.get('reorderLevel')?.hasError('required')">
                Reorder level is required
              </mat-error>
              <mat-error *ngIf="stockForm.get('reorderLevel')?.hasError('min')">
                Reorder level cannot be negative
              </mat-error>
            </mat-form-field>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Cost Information -->
        <div class="form-section">
          <h3>Cost Information</h3>

          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Standard Cost</mat-label>
              <span matPrefix>R </span>
              <input matInput type="number" formControlName="standardCost" min="0" step="0.01" />
              <mat-error *ngIf="stockForm.get('standardCost')?.hasError('required')">
                Standard cost is required
              </mat-error>
              <mat-error *ngIf="stockForm.get('standardCost')?.hasError('min')">
                Standard cost cannot be negative
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Last Purchase Price</mat-label>
              <span matPrefix>R </span>
              <input
                matInput
                type="number"
                formControlName="lastPurchasePrice"
                min="0"
                step="0.01"
              />
              <mat-error *ngIf="stockForm.get('lastPurchasePrice')?.hasError('min')">
                Last purchase price cannot be negative
              </mat-error>
            </mat-form-field>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Storage Information -->
        <div class="form-section">
          <h3>Storage Information</h3>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Warehouse Location</mat-label>
            <input matInput formControlName="warehouseLocation" placeholder="e.g., A-12-3" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Storage Requirements</mat-label>
            <textarea
              matInput
              formControlName="storageRequirements"
              rows="2"
              placeholder="Special storage requirements (temperature, humidity, etc.)"
            ></textarea>
          </mat-form-field>
        </div>

        <mat-divider></mat-divider>

        <!-- Quality Tracking -->
        <div class="form-section">
          <h3>Quality Tracking</h3>

          <div class="toggle-row">
            <mat-slide-toggle formControlName="batchTracking">
              Enable Batch Tracking
            </mat-slide-toggle>
            <span class="toggle-hint">Track items by batch numbers</span>
          </div>

          <div class="toggle-row">
            <mat-slide-toggle formControlName="expiryTracking">
              Enable Expiry Tracking
            </mat-slide-toggle>
            <span class="toggle-hint">Track expiration dates for items</span>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSubmit()"
        [disabled]="!stockForm.valid || loading"
      >
        <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
        <span *ngIf="!loading">{{ data.mode === 'add' ? 'Add Item' : 'Update Item' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .stock-form {
        width: 100%;
        min-width: 500px;
      }

      .form-section {
        margin-bottom: 24px;
      }

      .form-section h3 {
        margin: 0 0 16px 0;
        color: #333;
        font-size: 16px;
        font-weight: 500;
      }

      .form-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }

      .form-row mat-form-field {
        flex: 1;
      }

      .full-width {
        width: 100%;
      }

      mat-divider {
        margin: 24px 0;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }

      .toggle-hint {
        color: #666;
        font-size: 14px;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        gap: 8px;
      }

      mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }

      /* Material autocomplete styles */
      .material-linked {
        color: #4caf50;
        font-size: 18px;
      }

      .material-option {
        display: flex;
        flex-direction: column;
        padding: 4px 0;
        line-height: 1.4;
      }

      .material-code {
        font-weight: 500;
        color: var(--mat-sys-primary);
        font-family: monospace;
        font-size: 13px;
      }

      .material-name {
        color: var(--mat-sys-on-surface-variant);
        font-size: 12px;
        margin-top: 2px;
      }

      ::ng-deep .mat-mdc-autocomplete-panel {
        max-height: 400px;
      }

      ::ng-deep .mat-mdc-option {
        min-height: 48px;
        line-height: normal;
      }
    `,
  ],
})
export class StockFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private materialService = inject(MaterialService);
  private projectService = inject(ProjectService);
  public dialogRef = inject(MatDialogRef<StockFormComponent>);
  public data = inject<{ mode: 'add' | 'edit'; item?: StockItem; projectId?: string }>(
    MAT_DIALOG_DATA,
  );

  stockForm!: FormGroup;
  loading = false;
  selectedMaterial: MasterMaterial | null = null;
  filteredMaterials$!: Observable<MasterMaterial[]>;
  projects$!: Observable<Project[]>;

  // Expose enums to template
  StockCategory = StockCategory;
  StockItemStatus = StockItemStatus;
  UnitOfMeasure = UnitOfMeasure;

  ngOnInit() {
    this.initializeForm();
    this.setupMaterialAutocomplete();

    if (this.data.projectId) {
      this.projects$ = this.projectService.getProjects();
    }

    if (this.data.mode === 'edit' && this.data.item) {
      this.stockForm.patchValue(this.data.item);
    }
  }

  setupMaterialAutocomplete() {
    this.filteredMaterials$ = this.stockForm.get('itemCode')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        const searchTerm = typeof value === 'string' ? value : value?.itemCode || '';
        // TODO: Implement material search/filter when MaterialService is updated
        return of(this.materialService.getMaterials());
      }),
    );
  }

  displayMaterial(material: MasterMaterial): string {
    return material ? material.itemCode : '';
  }

  onMaterialSelected(event: MatAutocompleteSelectedEvent) {
    const material = event.option.value as MasterMaterial;
    this.selectedMaterial = material;

    // Auto-populate form fields from material
    this.stockForm.patchValue({
      itemCode: material.itemCode,
      name: material.description,
      description: material.specifications || '',
      unitOfMeasure: this.mapMaterialUoMToStockUoM(material.unitOfMeasure),
      standardCost: material.unitCost || 0,
      minimumStock: material.minimumStock || 0,
      reorderLevel: 0, // TODO: Add reorderLevel to material model
    });

    // Try to map category
    const mappedCategory = this.mapMaterialCategoryToStockCategory(material.category);
    if (mappedCategory) {
      this.stockForm.patchValue({ category: mappedCategory });
    }
  }

  mapMaterialUoMToStockUoM(materialUoM: string): UnitOfMeasure {
    // Map material UoM to stock UoM
    const mapping: Record<string, UnitOfMeasure> = {
      each: UnitOfMeasure.UNITS,
      meters: UnitOfMeasure.METERS,
      feet: UnitOfMeasure.METERS, // Convert feet to meters
      units: UnitOfMeasure.UNITS,
      rolls: UnitOfMeasure.ROLLS,
      boxes: UnitOfMeasure.BOXES,
    };
    return mapping[materialUoM] || UnitOfMeasure.UNITS;
  }

  mapMaterialCategoryToStockCategory(materialCategory: string): StockCategory | null {
    // Map material categories to stock categories
    if (materialCategory.includes('Cable')) return StockCategory.FIBRE_CABLE;
    if (materialCategory.includes('Pole')) return StockCategory.POLES;
    if (materialCategory.includes('Connector')) return StockCategory.EQUIPMENT;
    if (materialCategory.includes('Duct')) return StockCategory.EQUIPMENT;
    if (materialCategory.includes('Closure')) return StockCategory.EQUIPMENT;
    return StockCategory.OTHER;
  }

  initializeForm() {
    this.stockForm = this.fb.group({
      itemCode: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      category: ['', Validators.required],
      subcategory: [''],
      unitOfMeasure: ['', Validators.required],
      status: [StockItemStatus.ACTIVE],

      // Stock levels
      currentStock: [0, [Validators.required, Validators.min(0)]],
      minimumStock: [0, [Validators.required, Validators.min(0)]],
      reorderLevel: [0, [Validators.required, Validators.min(0)]],

      // Cost
      standardCost: [0, [Validators.required, Validators.min(0)]],
      lastPurchasePrice: [null, Validators.min(0)],

      // Storage
      warehouseLocation: [''],
      storageRequirements: [''],

      // Quality tracking
      batchTracking: [false],
      expiryTracking: [false],

      // Project fields
      projectId: [this.data.projectId || null],
      isProjectSpecific: [!!this.data.projectId],
    });
  }

  generateItemCode() {
    const category = this.stockForm.get('category')?.value || StockCategory.OTHER;
    const generatedCode = this.stockService.generateItemCode(category);
    this.stockForm.patchValue({ itemCode: generatedCode });
  }

  async onSubmit() {
    if (this.stockForm.valid) {
      this.loading = true;

      try {
        const formValue = this.stockForm.value;

        if (this.data.mode === 'add') {
          await this.stockService.createStockItem(formValue);
        } else if (this.data.item?.id) {
          await this.stockService.updateStockItem(this.data.item.id, formValue);
        }

        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error saving stock item:', error);
        // Handle error (show snackbar, etc.)
      } finally {
        this.loading = false;
      }
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
