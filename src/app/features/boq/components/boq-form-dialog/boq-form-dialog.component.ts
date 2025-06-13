import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { BOQService } from '../../services/boq.service';
import { BOQItem, BOQStatus } from '../../models/boq.model';
import { Project } from '../../../../core/models/project.model';

interface DialogData {
  item?: BOQItem;
  projects: Project[];
}

@Component({
  selector: 'app-boq-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Edit' : 'Add' }} BOQ Item</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="boq-form">
        <mat-form-field appearance="outline">
          <mat-label>Project</mat-label>
          <mat-select formControlName="projectId">
            <mat-option *ngFor="let project of projects" [value]="project.id">
              {{ project.name }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('projectId')?.hasError('required')">
            Project is required
          </mat-error>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Item Code</mat-label>
            <input matInput formControlName="itemCode" placeholder="e.g., FOC-SM-1K" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Unit</mat-label>
            <mat-select formControlName="unit">
              <mat-option value="m">Meters (m)</mat-option>
              <mat-option value="km">Kilometers (km)</mat-option>
              <mat-option value="pcs">Pieces (pcs)</mat-option>
              <mat-option value="box">Box</mat-option>
              <mat-option value="roll">Roll</mat-option>
              <mat-option value="set">Set</mat-option>
              <mat-option value="each">Each</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('unit')?.hasError('required')"> Unit is required </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" placeholder="Enter item description" />
          <mat-error *ngIf="form.get('description')?.hasError('required')">
            Description is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Specification</mat-label>
          <textarea
            matInput
            formControlName="specification"
            rows="3"
            placeholder="Enter detailed specifications (optional)"
          ></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Required Quantity</mat-label>
            <input matInput type="number" formControlName="requiredQuantity" min="0" />
            <mat-error *ngIf="form.get('requiredQuantity')?.hasError('required')">
              Quantity is required
            </mat-error>
            <mat-error *ngIf="form.get('requiredQuantity')?.hasError('min')">
              Quantity must be greater than 0
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Unit Price (R)</mat-label>
            <input matInput type="number" formControlName="unitPrice" min="0" step="0.01" />
            <span matTextPrefix>R&nbsp;</span>
            <mat-error *ngIf="form.get('unitPrice')?.hasError('required')">
              Unit price is required
            </mat-error>
            <mat-error *ngIf="form.get('unitPrice')?.hasError('min')">
              Price must be 0 or greater
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row" *ngIf="isEditMode">
          <mat-form-field appearance="outline">
            <mat-label>Allocated Quantity</mat-label>
            <input matInput type="number" formControlName="allocatedQuantity" min="0" readonly />
            <mat-hint>Allocated through stock management</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option *ngFor="let status of statuses" [value]="status">
                {{ status }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="checkbox-section">
          <mat-checkbox formControlName="needsQuote"> Requires Quote (RFQ) </mat-checkbox>
        </div>

        <div
          class="calculated-section"
          *ngIf="form.get('requiredQuantity')?.value && form.get('unitPrice')?.value"
        >
          <div class="calculated-item">
            <span class="label">Total Price:</span>
            <span class="value">R{{ calculateTotalPrice() | number: '1.2-2' }}</span>
          </div>
          <div class="calculated-item" *ngIf="isEditMode">
            <span class="label">Remaining Quantity:</span>
            <span class="value">{{ calculateRemainingQuantity() | number }}</span>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="!form.valid || saving"
        (click)="onSubmit()"
      >
        {{ saving ? 'Saving...' : isEditMode ? 'Update' : 'Add' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .boq-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 500px;
        padding: 16px 0;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      mat-form-field {
        width: 100%;
      }

      .checkbox-section {
        margin: 8px 0;
      }

      .calculated-section {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 16px;
        margin-top: 16px;
      }

      .calculated-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .calculated-item:last-child {
        margin-bottom: 0;
      }

      .calculated-item .label {
        font-weight: 500;
        color: #666;
      }

      .calculated-item .value {
        font-size: 18px;
        font-weight: 600;
        color: #1976d2;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        margin: 0 -24px -24px;
        border-top: 1px solid #e0e0e0;
      }
    `,
  ],
})
export class BOQFormDialogComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  saving = false;
  projects: Project[] = [];
  statuses: BOQStatus[] = [
    'Planned',
    'Partially Allocated',
    'Fully Allocated',
    'Ordered',
    'Delivered',
  ];

  private fb = inject(FormBuilder);
  private boqService = inject(BOQService);
  private dialogRef = inject(MatDialogRef<BOQFormDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as DialogData;

  constructor() {
    this.projects = this.data.projects || [];
    this.isEditMode = !!this.data.item;

    this.form = this.fb.group({
      projectId: [this.data.item?.projectId || '', Validators.required],
      itemCode: [this.data.item?.itemCode || ''],
      description: [this.data.item?.description || '', Validators.required],
      specification: [this.data.item?.specification || ''],
      unit: [this.data.item?.unit || 'each', Validators.required],
      requiredQuantity: [
        this.data.item?.requiredQuantity || null,
        [Validators.required, Validators.min(1)],
      ],
      allocatedQuantity: [this.data.item?.allocatedQuantity || 0],
      unitPrice: [this.data.item?.unitPrice || null, [Validators.required, Validators.min(0)]],
      status: [this.data.item?.status || 'Planned'],
      needsQuote: [this.data.item?.needsQuote || false],
    });
  }

  ngOnInit() {
    // Lock allocated quantity in edit mode
    if (this.isEditMode) {
      this.form.get('allocatedQuantity')?.disable();
    }
  }

  calculateTotalPrice(): number {
    const quantity = this.form.get('requiredQuantity')?.value || 0;
    const price = this.form.get('unitPrice')?.value || 0;
    return quantity * price;
  }

  calculateRemainingQuantity(): number {
    const required = this.form.get('requiredQuantity')?.value || 0;
    const allocated = this.form.get('allocatedQuantity')?.value || 0;
    return required - allocated;
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.form.valid && !this.saving) {
      this.saving = true;
      const formValue = this.form.getRawValue();

      const boqItem: Omit<BOQItem, 'id'> = {
        ...formValue,
        remainingQuantity: formValue.requiredQuantity - formValue.allocatedQuantity,
        totalPrice: formValue.requiredQuantity * formValue.unitPrice,
      };

      if (this.isEditMode) {
        this.boqService.updateBOQItem(this.data.item!.id!, boqItem).subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: (error: unknown) => {
            console.error('Error updating BOQ item:', error);
            alert('Failed to update BOQ item. Please try again.');
            this.saving = false;
          },
        });
      } else {
        this.boqService.addBOQItem(boqItem).subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: (error: unknown) => {
            console.error('Error adding BOQ item:', error);
            alert('Failed to add BOQ item. Please try again.');
            this.saving = false;
          },
        });
      }
    }
  }
}
