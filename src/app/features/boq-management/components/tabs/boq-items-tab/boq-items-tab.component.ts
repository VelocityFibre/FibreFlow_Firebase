import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import { Project } from '../../../../../core/models/project.model';
import { BOQService } from '../../../../boq/services/boq.service';
import { BOQItem } from '../../../../boq/models/boq.model';
import { BOQFormDialogComponent } from '../../../../boq/components/boq-form-dialog/boq-form-dialog.component';

@Component({
  selector: 'app-boq-items-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatMenuModule,
  ],
  template: `
    <div class="boq-items-container">
      <!-- Actions Bar -->
      <div class="actions-bar">
        <h3>BOQ Items</h3>
        <div class="actions">
          <button mat-button (click)="addItem()">
            <mat-icon>add</mat-icon>
            Add Item
          </button>
        </div>
      </div>

      <!-- Items Table -->
      <div class="table-container" *ngIf="boqItems$ | async as items; else emptyState">
        <table
          mat-table
          [dataSource]="items"
          class="boq-table"
          *ngIf="items.length > 0; else emptyState"
        >
          <!-- Item Code Column -->
          <ng-container matColumnDef="itemCode">
            <th mat-header-cell *matHeaderCellDef>Item Code</th>
            <td mat-cell *matCellDef="let item">{{ item.itemCode }}</td>
          </ng-container>

          <!-- Description Column -->
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>Description</th>
            <td mat-cell *matCellDef="let item">
              <div class="description-cell">
                <div class="item-description">{{ item.description }}</div>
                <div class="item-specification" *ngIf="item.specification">
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

          <!-- Required Quantity Column -->
          <ng-container matColumnDef="requiredQuantity">
            <th mat-header-cell *matHeaderCellDef class="number-header">Required</th>
            <td mat-cell *matCellDef="let item" class="number-cell">
              {{ item.requiredQuantity | number }}
            </td>
          </ng-container>

          <!-- Allocated Column -->
          <ng-container matColumnDef="allocatedQuantity">
            <th mat-header-cell *matHeaderCellDef class="number-header">Allocated</th>
            <td mat-cell *matCellDef="let item" class="number-cell">
              {{ item.allocatedQuantity | number }}
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
            <th mat-header-cell *matHeaderCellDef class="number-header">Total</th>
            <td mat-cell *matCellDef="let item" class="number-cell">
              R{{ item.totalPrice | number: '1.2-2' }}
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

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let item">
              <button mat-icon-button [matMenuTriggerFor]="menu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="editItem(item)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit</span>
                </button>
                <button mat-menu-item (click)="allocateStock(item)">
                  <mat-icon>assignment</mat-icon>
                  <span>Allocate Stock</span>
                </button>
                <button mat-menu-item (click)="deleteItem(item)" class="delete-option">
                  <mat-icon>delete</mat-icon>
                  <span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>

      <!-- Empty State -->
      <ng-template #emptyState>
        <div class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <h3>No BOQ Items</h3>
          <p>Start by importing a BOQ or adding items manually.</p>
          <button mat-raised-button color="primary" (click)="addItem()">
            <mat-icon>add</mat-icon>
            Add First Item
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .boq-items-container {
        padding: 0;
      }

      .actions-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;

        h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
          color: rgb(var(--ff-foreground));
        }

        .actions {
          display: flex;
          gap: 8px;
        }
      }

      .table-container {
        background: rgb(var(--ff-card));
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgb(var(--ff-border));
      }

      .boq-table {
        width: 100%;

        th {
          font-weight: 600;
          color: rgb(var(--ff-foreground));
          background-color: rgb(var(--ff-muted) / 0.5);
        }

        .number-header {
          text-align: right;
        }

        .number-cell {
          text-align: right;
          font-weight: 500;
        }

        .description-cell {
          .item-description {
            font-weight: 500;
            color: rgb(var(--ff-foreground));
          }

          .item-specification {
            font-size: 12px;
            color: rgb(var(--ff-muted-foreground));
            margin-top: 2px;
          }
        }
      }

      .status-planned {
        background-color: rgb(var(--ff-muted)) !important;
        color: rgb(var(--ff-muted-foreground)) !important;
      }

      .status-partially-allocated {
        background-color: rgb(var(--ff-warning) / 0.15) !important;
        color: rgb(var(--ff-warning)) !important;
      }

      .status-fully-allocated {
        background-color: rgb(var(--ff-success) / 0.15) !important;
        color: rgb(var(--ff-success)) !important;
      }

      .status-ordered {
        background-color: rgb(var(--ff-info) / 0.15) !important;
        color: rgb(var(--ff-info)) !important;
      }

      .status-delivered {
        background-color: rgb(var(--ff-success) / 0.2) !important;
        color: rgb(var(--ff-success)) !important;
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

        h3 {
          font-size: 20px;
          font-weight: 500;
          margin: 0 0 8px;
          color: rgb(var(--ff-foreground));
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
    `,
  ],
})
export class BOQItemsTabComponent implements OnInit {
  @Input() projectId!: string;
  @Input() project!: Project;
  @Output() refreshRequired = new EventEmitter<void>();

  private boqService = inject(BOQService);
  private dialog = inject(MatDialog);

  boqItems$!: Observable<BOQItem[]>;
  displayedColumns = [
    'itemCode',
    'description',
    'unit',
    'requiredQuantity',
    'allocatedQuantity',
    'unitPrice',
    'totalPrice',
    'status',
    'actions',
  ];

  ngOnInit() {
    this.loadItems();
  }

  private loadItems(): void {
    this.boqItems$ = this.boqService.getBOQItemsByProject(this.projectId);
  }

  addItem(): void {
    const dialogRef = this.dialog.open(BOQFormDialogComponent, {
      width: '600px',
      data: {
        projects: [this.project],
        selectedProjectId: this.projectId,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadItems();
        this.refreshRequired.emit();
      }
    });
  }

  editItem(item: BOQItem): void {
    const dialogRef = this.dialog.open(BOQFormDialogComponent, {
      width: '600px',
      data: {
        item,
        projects: [this.project],
        selectedProjectId: this.projectId,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadItems();
        this.refreshRequired.emit();
      }
    });
  }

  allocateStock(item: BOQItem): void {
    // TODO: Implement stock allocation dialog
    console.log('Allocate stock for:', item);
  }

  async deleteItem(item: BOQItem): Promise<void> {
    if (confirm(`Are you sure you want to delete "${item.description}"?`)) {
      try {
        await this.boqService.deleteBOQItem(item.id!);
        this.loadItems();
        this.refreshRequired.emit();
      } catch (error) {
        console.error('Error deleting BOQ item:', error);
      }
    }
  }
}
