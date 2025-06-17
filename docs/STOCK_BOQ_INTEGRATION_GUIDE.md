# Stock-BOQ Integration Implementation Guide

## Overview
This guide outlines the implementation of stock allocation functionality for BOQ items, enabling project managers to allocate available stock to BOQ requirements.

## Component Structure

### 1. Stock Allocation Dialog Component
Create a new dialog component for handling stock allocations:

```typescript
// src/app/features/boq/components/stock-allocation-dialog/stock-allocation-dialog.component.ts

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BOQItem } from '../../models/boq.model';
import { StockItem } from '../../../stock/models/stock-item.model';
import { StockService } from '../../../stock/services/stock.service';
import { BOQService } from '../../services/boq.service';

interface DialogData {
  boqItem: BOQItem;
  projectId: string;
}

@Component({
  selector: 'app-stock-allocation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <h2 mat-dialog-title>Allocate Stock to BOQ Item</h2>
    
    <mat-dialog-content>
      <div class="boq-item-info">
        <h3>BOQ Item Details</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Item Code:</span>
            <span class="value">{{ data.boqItem.itemCode }}</span>
          </div>
          <div class="info-item">
            <span class="label">Description:</span>
            <span class="value">{{ data.boqItem.description }}</span>
          </div>
          <div class="info-item">
            <span class="label">Required Quantity:</span>
            <span class="value">{{ data.boqItem.requiredQuantity }} {{ data.boqItem.unit }}</span>
          </div>
          <div class="info-item">
            <span class="label">Already Allocated:</span>
            <span class="value">{{ data.boqItem.allocatedQuantity }} {{ data.boqItem.unit }}</span>
          </div>
          <div class="info-item">
            <span class="label">Remaining:</span>
            <span class="value highlight">{{ data.boqItem.remainingQuantity }} {{ data.boqItem.unit }}</span>
          </div>
        </div>
      </div>

      <form [formGroup]="allocationForm" class="allocation-form">
        <mat-form-field appearance="outline">
          <mat-label>Select Stock Item</mat-label>
          <mat-select formControlName="stockItemId" (selectionChange)="onStockItemChange($event.value)">
            <mat-option *ngFor="let stock of availableStock" [value]="stock.id">
              {{ stock.name }} - {{ stock.itemCode }}
              <span class="stock-info">(Available: {{ stock.availableQuantity }} {{ stock.unit }})</span>
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div *ngIf="selectedStock" class="stock-details">
          <mat-progress-bar 
            mode="determinate" 
            [value]="getStockUsagePercentage()"
            [color]="getStockUsagePercentage() > 80 ? 'warn' : 'primary'">
          </mat-progress-bar>
          <div class="stock-stats">
            <span>Total: {{ selectedStock.quantity }} {{ selectedStock.unit }}</span>
            <span>Allocated: {{ selectedStock.allocatedQuantity }} {{ selectedStock.unit }}</span>
            <span>Available: {{ selectedStock.availableQuantity }} {{ selectedStock.unit }}</span>
          </div>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Quantity to Allocate</mat-label>
          <input matInput type="number" formControlName="quantity" 
                 [max]="maxAllocationQuantity"
                 placeholder="Enter quantity">
          <span matSuffix>{{ data.boqItem.unit }}</span>
          <mat-hint>Max: {{ maxAllocationQuantity }} {{ data.boqItem.unit }}</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Notes (Optional)</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              [disabled]="!allocationForm.valid || isProcessing"
              (click)="onAllocate()">
        <mat-icon *ngIf="!isProcessing">check</mat-icon>
        <mat-spinner *ngIf="isProcessing" diameter="20"></mat-spinner>
        Allocate Stock
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .boq-item-info {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .value {
      font-size: 14px;
      font-weight: 500;
    }

    .value.highlight {
      color: #1976d2;
    }

    .allocation-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .stock-info {
      font-size: 12px;
      color: #666;
      margin-left: 8px;
    }

    .stock-details {
      background: #e3f2fd;
      padding: 16px;
      border-radius: 8px;
      margin: -8px 0 8px 0;
    }

    .stock-stats {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 13px;
    }
  `]
})
export class StockAllocationDialogComponent implements OnInit {
  allocationForm: FormGroup;
  availableStock: StockItem[] = [];
  selectedStock: StockItem | null = null;
  maxAllocationQuantity = 0;
  isProcessing = false;

  constructor(
    private fb: FormBuilder,
    private stockService: StockService,
    private boqService: BOQService,
    public dialogRef: MatDialogRef<StockAllocationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.allocationForm = this.fb.group({
      stockItemId: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0.01)]],
      notes: ['']
    });
  }

  ngOnInit() {
    this.loadAvailableStock();
  }

  loadAvailableStock() {
    // Load stock items that match the BOQ item criteria
    this.stockService.getStockItemsByProject(this.data.projectId).subscribe(items => {
      // Filter items that could match this BOQ item
      this.availableStock = items.filter(stock => 
        stock.availableQuantity > 0 && 
        stock.unit === this.data.boqItem.unit
      );
    });
  }

  onStockItemChange(stockItemId: string) {
    this.selectedStock = this.availableStock.find(s => s.id === stockItemId) || null;
    if (this.selectedStock) {
      this.maxAllocationQuantity = Math.min(
        this.selectedStock.availableQuantity,
        this.data.boqItem.remainingQuantity
      );
      this.allocationForm.patchValue({ 
        quantity: this.maxAllocationQuantity 
      });
    }
  }

  getStockUsagePercentage(): number {
    if (!this.selectedStock) return 0;
    return (this.selectedStock.allocatedQuantity / this.selectedStock.quantity) * 100;
  }

  onCancel() {
    this.dialogRef.close();
  }

  async onAllocate() {
    if (!this.allocationForm.valid) return;

    this.isProcessing = true;
    const { stockItemId, quantity, notes } = this.allocationForm.value;

    try {
      // Create allocation record
      await this.boqService.allocateStock(
        this.data.boqItem.id!,
        stockItemId,
        quantity,
        notes
      );

      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error allocating stock:', error);
      // Handle error
    } finally {
      this.isProcessing = false;
    }
  }
}
```

### 2. Update BOQ Service
Add allocation methods to the BOQ service:

```typescript
// Add to src/app/features/boq/services/boq.service.ts

async allocateStock(
  boqItemId: string,
  stockItemId: string,
  quantity: number,
  notes?: string
): Promise<void> {
  const batch = this.firestore.batch();
  
  // Update BOQ item allocated quantity
  const boqRef = doc(this.firestore, 'boqItems', boqItemId);
  const boqSnap = await getDoc(boqRef);
  const boqData = boqSnap.data() as BOQItem;
  
  batch.update(boqRef, {
    allocatedQuantity: boqData.allocatedQuantity + quantity,
    remainingQuantity: boqData.remainingQuantity - quantity,
    status: this.calculateBOQStatus(
      boqData.requiredQuantity,
      boqData.allocatedQuantity + quantity
    ),
    stockItemId: stockItemId,
    lastModified: serverTimestamp()
  });
  
  // Update stock item allocated quantity
  const stockRef = doc(this.firestore, 'stockItems', stockItemId);
  const stockSnap = await getDoc(stockRef);
  const stockData = stockSnap.data() as StockItem;
  
  batch.update(stockRef, {
    allocatedQuantity: stockData.allocatedQuantity + quantity,
    availableQuantity: stockData.quantity - (stockData.allocatedQuantity + quantity),
    lastModified: serverTimestamp()
  });
  
  // Create allocation record
  const allocationRef = doc(collection(this.firestore, 'stockAllocations'));
  batch.set(allocationRef, {
    id: allocationRef.id,
    boqItemId,
    stockItemId,
    projectId: boqData.projectId,
    quantity,
    notes,
    allocatedBy: this.authService.currentUser?.uid,
    allocatedAt: serverTimestamp(),
    status: 'active'
  });
  
  await batch.commit();
}

private calculateBOQStatus(required: number, allocated: number): BOQStatus {
  const percentage = (allocated / required) * 100;
  
  if (percentage === 0) return 'Planned';
  if (percentage < 100) return 'Partially Allocated';
  if (percentage === 100) return 'Fully Allocated';
  return 'Fully Allocated';
}
```

### 3. Create Stock Allocation Model

```typescript
// src/app/core/models/stock-allocation.model.ts

export interface StockAllocation {
  id?: string;
  boqItemId: string;
  stockItemId: string;
  projectId: string;
  quantity: number;
  notes?: string;
  allocatedBy: string;
  allocatedAt: any;
  status: 'active' | 'cancelled';
}
```

### 4. Visual Indicators in BOQ List

Update the BOQ list component to show stock availability:

```typescript
// Add to project-boq.component.ts template

<!-- In the allocated column -->
<ng-container matColumnDef="allocated">
  <th mat-header-cell *matHeaderCellDef class="number-header">Allocated</th>
  <td mat-cell *matCellDef="let item" class="number-cell">
    <div class="allocation-info">
      <span>{{ item.allocatedQuantity | number }}</span>
      <mat-icon *ngIf="item.stockItemId" 
                class="stock-linked-icon"
                matTooltip="Linked to stock">
        link
      </mat-icon>
    </div>
  </td>
</ng-container>

<!-- Add styles -->
.allocation-info {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.stock-linked-icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
  color: #4caf50;
}
```

## Implementation Steps

1. **Create Dialog Component**: Implement the stock allocation dialog
2. **Update Services**: Add allocation methods to BOQ and Stock services
3. **Add Visual Indicators**: Show stock linkage in BOQ list
4. **Create Allocation History**: Track all allocations for audit
5. **Add Undo Functionality**: Allow reversing allocations if needed
6. **Update Dashboard**: Show allocation metrics in project overview

## Benefits

- **Real-time Stock Tracking**: Know exactly what's available
- **Prevent Over-allocation**: System enforces quantity limits
- **Audit Trail**: Complete history of all allocations
- **Project Cost Control**: Accurate material usage tracking
- **Improved Planning**: Visual indicators for stock availability

This integration creates a seamless workflow between BOQ planning and stock management, ensuring materials are properly allocated and tracked throughout the project lifecycle.