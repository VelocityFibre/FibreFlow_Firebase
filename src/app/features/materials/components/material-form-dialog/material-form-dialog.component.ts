import { Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { firstValueFrom } from 'rxjs';

import { MasterMaterial, MaterialCategory, UnitOfMeasure } from '../../models/material.model';
import { MaterialService } from '../../services/material.service';
import { RemoteLoggerService } from '../../../../core/services/remote-logger.service';

@Component({
  selector: 'app-material-form-dialog',
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
    MatCheckboxModule,
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>{{ isEditMode ? 'Edit Material' : 'Add New Material' }}</h2>

      <mat-dialog-content>
        <form [formGroup]="materialForm" class="material-form">
          <!-- Row 1: Item Code and Category -->
          <div class="form-section">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Item Code</mat-label>
                <input
                  matInput
                  formControlName="itemCode"
                  [readonly]="isEditMode"
                  placeholder="e.g., DP-001"
                />
                <mat-error *ngIf="materialForm.get('itemCode')?.hasError('required')">
                  Item code is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Category</mat-label>
                <mat-select formControlName="category">
                  <mat-option *ngFor="let cat of categories" [value]="cat">{{ cat }}</mat-option>
                </mat-select>
                <mat-error *ngIf="materialForm.get('category')?.hasError('required')">
                  Category is required
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Row 2: Description -->
          <div class="form-section">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <input matInput formControlName="description" placeholder="Material description" />
              <mat-error *ngIf="materialForm.get('description')?.hasError('required')">
                Description is required
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Row 3: Specifications -->
          <div class="form-section">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Specifications (Optional)</mat-label>
              <textarea
                matInput
                formControlName="specifications"
                rows="2"
                placeholder="Technical specifications"
              ></textarea>
            </mat-form-field>
          </div>

          <!-- Row 4: UoM and Cost -->
          <div class="form-section">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Unit of Measure</mat-label>
                <mat-select formControlName="unitOfMeasure">
                  <mat-option *ngFor="let uom of unitsOfMeasure" [value]="uom">{{
                    uom
                  }}</mat-option>
                </mat-select>
                <mat-error *ngIf="materialForm.get('unitOfMeasure')?.hasError('required')">
                  Required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Unit Cost</mat-label>
                <span matPrefix>R&nbsp;</span>
                <input
                  matInput
                  type="number"
                  formControlName="unitCost"
                  step="0.01"
                  placeholder="0.00"
                />
                <mat-error *ngIf="materialForm.get('unitCost')?.hasError('required')">
                  Required
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Row 5: Stock Levels -->
          <div class="form-section">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Minimum Stock Level</mat-label>
                <input matInput type="number" formControlName="minimumStockLevel" placeholder="0" />
                <mat-hint>Alert when stock falls below this</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Reorder Point</mat-label>
                <input matInput type="number" formControlName="reorderPoint" placeholder="0" />
                <mat-hint>Trigger reorder at this level</mat-hint>
              </mat-form-field>
            </div>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          [disabled]="!materialForm.valid || saving"
          (click)="onSave()"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        position: relative;
      }

      mat-dialog-content {
        width: 600px;
        max-width: calc(90vw - 48px);
        overflow-y: auto;
        max-height: calc(80vh - 140px);
        padding: 0 24px;
      }

      .material-form {
        padding: 20px 0;
      }

      .form-section {
        margin-bottom: 8px;
      }

      .form-row {
        display: flex;
        gap: 16px;
        width: 100%;
      }

      .form-field {
        flex: 1;
        min-width: 0;
      }

      .full-width {
        width: 100%;
      }

      mat-form-field {
        width: 100%;
      }

      textarea {
        min-height: 60px;
        resize: vertical;
      }

      mat-hint {
        font-size: 11px;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        margin: 0 -24px -24px;
        border-top: 1px solid rgba(0, 0, 0, 0.12);
      }

      @media (max-width: 640px) {
        mat-dialog-content {
          width: 100%;
          padding: 0 16px;
        }

        .form-row {
          flex-direction: column;
          gap: 0;
        }
      }
    `,
  ],
})
export class MaterialFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private materialService = inject(MaterialService);
  private dialogRef = inject(MatDialogRef<MaterialFormDialogComponent>);
  private logger = inject(RemoteLoggerService);

  materialForm!: FormGroup;
  isEditMode = false;
  saving = false;

  categories = this.materialService.getCategories();
  unitsOfMeasure = this.materialService.getUnitsOfMeasure();

  constructor(@Inject(MAT_DIALOG_DATA) public data: { material?: MasterMaterial }) {
    this.isEditMode = !!data?.material;
  }

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    const material = this.data?.material;

    this.materialForm = this.fb.group({
      itemCode: [material?.itemCode || '', Validators.required],
      description: [material?.description || '', Validators.required],
      category: [material?.category || '', Validators.required],
      specifications: [material?.specifications || ''],
      unitOfMeasure: [material?.unitOfMeasure || 'each', Validators.required],
      unitCost: [material?.unitCost || 0, [Validators.required, Validators.min(0)]],
      minimumStockLevel: [material?.minimumStockLevel || 0],
      reorderPoint: [material?.reorderPoint || 0],
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  async onSave() {
    await this.logger.debug('Material save initiated', 'MaterialFormDialog', {
      isValid: this.materialForm.valid,
      isEditMode: this.isEditMode,
      formValue: this.materialForm.value,
    });

    if (this.materialForm.valid) {
      this.saving = true;
      const formValue = this.materialForm.value;

      try {
        if (this.isEditMode && this.data.material?.id) {
          await this.logger.info('Updating material', 'MaterialFormDialog', {
            id: this.data.material.id,
            formValue,
          });
          await firstValueFrom(this.materialService.updateMaterial(this.data.material.id, formValue));
        } else {
          await this.logger.info('Creating new material', 'MaterialFormDialog', formValue);
          const result = await this.materialService.addMaterial(formValue);
          await this.logger.info('Material created successfully', 'MaterialFormDialog', {
            id: result,
          });
        }
        this.dialogRef.close(true);
      } catch (error: any) {
        await this.logger.logError(error, 'MaterialFormDialog', 'Failed to save material');
        alert(error.message || 'Error saving material');
      } finally {
        this.saving = false;
      }
    } else {
      await this.logger.warn('Form validation failed', 'MaterialFormDialog', {
        errors: this.materialForm.errors,
        controlErrors: Object.keys(this.materialForm.controls).reduce((acc, key) => {
          const control = this.materialForm.get(key);
          if (control?.errors) {
            acc[key] = control.errors;
          }
          return acc;
        }, {} as any),
      });
    }
  }
}
