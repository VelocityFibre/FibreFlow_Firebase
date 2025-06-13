import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, startWith, map } from 'rxjs';

import {
  MovementType,
  ReferenceType,
  getMovementTypeLabel,
  isIncomingMovement,
  isOutgoingMovement,
} from '../../models/stock-movement.model';
import { StockItem } from '../../models/stock-item.model';
import { Project } from '../../../../core/models/project.model';

interface DialogData {
  stockItems: StockItem[];
  projects: Project[];
  preselectedItem?: StockItem;
  preselectedProject?: Project;
}

@Component({
  selector: 'app-stock-movement-form-dialog',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
  ],
  template: `
    <h2 mat-dialog-title>Create Stock Movement</h2>

    <mat-dialog-content>
      <form [formGroup]="movementForm" class="movement-form">
        <!-- Stock Item Selection -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Stock Item</mat-label>
          <mat-select
            formControlName="itemId"
            (selectionChange)="onItemChange($event.value)"
            required
          >
            <mat-option *ngFor="let item of filteredItems$ | async" [value]="item.id">
              {{ item.itemCode }} - {{ item.name }}
              <span class="stock-info"
                >(Available: {{ item.currentStock - item.allocatedStock }})</span
              >
            </mat-option>
          </mat-select>
          <mat-error *ngIf="movementForm.get('itemId')?.hasError('required')">
            Stock item is required
          </mat-error>
        </mat-form-field>

        <!-- Movement Type -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Movement Type</mat-label>
          <mat-select
            formControlName="movementType"
            (selectionChange)="onMovementTypeChange($event.value)"
            required
          >
            <mat-option *ngFor="let type of movementTypes" [value]="type">
              {{ getMovementTypeLabel(type) }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="movementForm.get('movementType')?.hasError('required')">
            Movement type is required
          </mat-error>
        </mat-form-field>

        <!-- Quantity -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Quantity</mat-label>
          <input
            matInput
            type="number"
            formControlName="quantity"
            required
            min="0.01"
            step="0.01"
          />
          <span matSuffix *ngIf="selectedItem">{{ selectedItem.unitOfMeasure }}</span>
          <mat-hint *ngIf="selectedItem && isOutgoing">
            Available: {{ selectedItem.currentStock - selectedItem.allocatedStock }}
            {{ selectedItem.unitOfMeasure }}
          </mat-hint>
          <mat-error *ngIf="movementForm.get('quantity')?.hasError('required')">
            Quantity is required
          </mat-error>
          <mat-error *ngIf="movementForm.get('quantity')?.hasError('min')">
            Quantity must be greater than 0
          </mat-error>
          <mat-error *ngIf="movementForm.get('quantity')?.hasError('max')">
            Insufficient stock available
          </mat-error>
        </mat-form-field>

        <!-- Reference Type (conditional) -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="showReferenceType">
          <mat-label>Reference Type</mat-label>
          <mat-select formControlName="referenceType">
            <mat-option *ngFor="let type of referenceTypes" [value]="type">
              {{ type }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Reference Number (conditional) -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="showReferenceNumber">
          <mat-label>Reference Number</mat-label>
          <input matInput formControlName="referenceNumber" />
          <mat-hint>e.g., PO number, invoice number</mat-hint>
        </mat-form-field>

        <!-- Project Selection (conditional) -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="showProjectSelection">
          <mat-label>{{ isIncoming ? 'From Project' : 'To Project' }}</mat-label>
          <mat-select formControlName="projectId">
            <mat-option *ngFor="let project of projects" [value]="project.id">
              {{ project.projectCode }} - {{ project.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Location Fields -->
        <div class="location-fields" *ngIf="showLocationFields">
          <mat-form-field appearance="outline" class="half-width" *ngIf="showFromLocation">
            <mat-label>From Location</mat-label>
            <input matInput formControlName="fromLocation" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width" *ngIf="showToLocation">
            <mat-label>To Location</mat-label>
            <input matInput formControlName="toLocation" />
          </mat-form-field>
        </div>

        <!-- Reason (for specific movement types) -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="showReason">
          <mat-label>Reason</mat-label>
          <input matInput formControlName="reason" required />
          <mat-error *ngIf="movementForm.get('reason')?.hasError('required')">
            Reason is required
          </mat-error>
        </mat-form-field>

        <!-- Cost Information -->
        <div class="cost-section" *ngIf="selectedItem">
          <div class="cost-item">
            <span class="cost-label">Unit Cost:</span>
            <span class="cost-value">{{ formatCurrency(selectedItem.standardCost) }}</span>
          </div>
          <div class="cost-item">
            <span class="cost-label">Total Cost:</span>
            <span class="cost-value">{{ formatCurrency(totalCost) }}</span>
          </div>
        </div>

        <!-- Notes -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSubmit()"
        [disabled]="!movementForm.valid || isSubmitting"
      >
        {{ isSubmitting ? 'Creating...' : 'Create Movement' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .movement-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 500px;
        max-width: 600px;
      }

      .full-width {
        width: 100%;
      }

      .half-width {
        width: calc(50% - 8px);
      }

      .location-fields {
        display: flex;
        gap: 16px;
      }

      .stock-info {
        font-size: 12px;
        color: #666;
        margin-left: 8px;
      }

      .cost-section {
        background-color: #f5f5f5;
        border-radius: 4px;
        padding: 16px;
        margin: 8px 0;
      }

      .cost-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;

        &:last-child {
          margin-bottom: 0;
          padding-top: 8px;
          border-top: 1px solid #ddd;
          font-weight: 600;
        }
      }

      .cost-label {
        color: #666;
      }

      .cost-value {
        color: #333;
      }

      mat-dialog-content {
        max-height: 70vh;
        overflow-y: auto;
      }

      mat-dialog-actions {
        padding: 16px 24px !important;
        border-top: 1px solid #e0e0e0;
      }
    `,
  ],
})
export class StockMovementFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<StockMovementFormDialogComponent>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);

  movementForm!: FormGroup;
  filteredItems$!: Observable<StockItem[]>;
  isSubmitting = false;

  stockItems = this.data.stockItems;
  projects = this.data.projects;
  selectedItem: StockItem | null = null;

  movementTypes = Object.values(MovementType);
  referenceTypes = Object.values(ReferenceType);

  // Computed properties based on movement type
  get selectedMovementType(): MovementType | null {
    return this.movementForm.get('movementType')?.value;
  }

  get isIncoming(): boolean {
    return this.selectedMovementType ? isIncomingMovement(this.selectedMovementType) : false;
  }

  get isOutgoing(): boolean {
    return this.selectedMovementType ? isOutgoingMovement(this.selectedMovementType) : false;
  }

  get showReferenceType(): boolean {
    return [
      MovementType.PURCHASE,
      MovementType.ALLOCATION,
      MovementType.ADJUSTMENT_INCREASE,
      MovementType.ADJUSTMENT_DECREASE,
    ].includes(this.selectedMovementType as MovementType);
  }

  get showReferenceNumber(): boolean {
    return [MovementType.PURCHASE, MovementType.ALLOCATION].includes(
      this.selectedMovementType as MovementType,
    );
  }

  get showProjectSelection(): boolean {
    return [
      MovementType.ALLOCATION,
      MovementType.RETURN_FROM_PROJECT,
      MovementType.TRANSFER_IN,
      MovementType.TRANSFER_OUT,
    ].includes(this.selectedMovementType as MovementType);
  }

  get showLocationFields(): boolean {
    return [MovementType.TRANSFER_IN, MovementType.TRANSFER_OUT].includes(
      this.selectedMovementType as MovementType,
    );
  }

  get showFromLocation(): boolean {
    return this.selectedMovementType === MovementType.TRANSFER_OUT;
  }

  get showToLocation(): boolean {
    return this.selectedMovementType === MovementType.TRANSFER_IN;
  }

  get showReason(): boolean {
    return [
      MovementType.ADJUSTMENT_INCREASE,
      MovementType.ADJUSTMENT_DECREASE,
      MovementType.DAMAGE,
      MovementType.LOSS,
      MovementType.RETURN_FROM_PROJECT,
    ].includes(this.selectedMovementType as MovementType);
  }

  get totalCost(): number {
    const quantity = this.movementForm.get('quantity')?.value || 0;
    return this.selectedItem ? quantity * this.selectedItem.standardCost : 0;
  }

  ngOnInit() {
    this.initializeForm();
    this.setupFilters();

    // Pre-select item if provided
    if (this.data.preselectedItem) {
      this.movementForm.patchValue({ itemId: this.data.preselectedItem.id });
      this.selectedItem = this.data.preselectedItem;
    }

    // Pre-select project if provided
    if (this.data.preselectedProject) {
      this.movementForm.patchValue({ projectId: this.data.preselectedProject.id });
    }
  }

  private initializeForm() {
    this.movementForm = this.fb.group({
      itemId: ['', Validators.required],
      movementType: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.01)]],
      referenceType: [''],
      referenceNumber: [''],
      projectId: [''],
      fromLocation: [''],
      toLocation: [''],
      reason: [''],
      notes: [''],
    });
  }

  private setupFilters() {
    // Filter stock items by search
    this.filteredItems$ = this.movementForm.get('itemId')!.valueChanges.pipe(
      startWith(''),
      map(() => this.stockItems),
    );
  }

  onItemChange(itemId: string) {
    this.selectedItem = this.stockItems.find((item) => item.id === itemId) || null;

    // Update quantity validation based on available stock
    if (this.selectedItem && this.isOutgoing) {
      const available = this.selectedItem.currentStock - this.selectedItem.allocatedStock;
      this.movementForm
        .get('quantity')
        ?.setValidators([Validators.required, Validators.min(0.01), Validators.max(available)]);
      this.movementForm.get('quantity')?.updateValueAndValidity();
    }
  }

  onMovementTypeChange(_type: MovementType) {
    // Reset conditional fields
    this.movementForm.patchValue({
      referenceType: '',
      referenceNumber: '',
      projectId: '',
      fromLocation: '',
      toLocation: '',
      reason: '',
    });

    // Update validators
    if (this.showReason) {
      this.movementForm.get('reason')?.setValidators(Validators.required);
    } else {
      this.movementForm.get('reason')?.clearValidators();
    }

    this.movementForm.get('reason')?.updateValueAndValidity();

    // Re-validate quantity based on movement type
    if (this.selectedItem) {
      this.onItemChange(this.selectedItem.id!);
    }
  }

  getMovementTypeLabel(type: MovementType): string {
    return getMovementTypeLabel(type);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(value);
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.movementForm.valid && this.selectedItem) {
      this.isSubmitting = true;

      const formValue = this.movementForm.value;
      const movement: any = {
        itemId: formValue.itemId,
        itemCode: this.selectedItem.itemCode,
        itemName: this.selectedItem.name,
        movementType: formValue.movementType,
        quantity: formValue.quantity,
        unitOfMeasure: this.selectedItem.unitOfMeasure,
        unitCost: this.selectedItem.standardCost,
        totalCost: this.totalCost,
        referenceType: formValue.referenceType || undefined,
        referenceNumber: formValue.referenceNumber || undefined,
        reason: formValue.reason || undefined,
        notes: formValue.notes || undefined,
      };

      // Add project-specific fields
      if (this.showProjectSelection && formValue.projectId) {
        const project = this.projects.find((p) => p.id === formValue.projectId);
        if (project) {
          if (this.isIncoming) {
            movement.fromProjectId = project.id;
            movement.fromProjectName = project.name;
          } else {
            movement.toProjectId = project.id;
            movement.toProjectName = project.name;
          }
        }
      }

      // Add location fields
      if (formValue.fromLocation) {
        movement.fromLocation = formValue.fromLocation;
      }
      if (formValue.toLocation) {
        movement.toLocation = formValue.toLocation;
      }

      this.dialogRef.close(movement);
    }
  }
}
