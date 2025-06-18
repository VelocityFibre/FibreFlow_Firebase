import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ContractorProject } from '../../../models/contractor-project.model';

interface MaterialRequirement {
  id: string;
  materialName: string;
  category: string;
  quantityRequired: number;
  quantityAllocated: number;
  quantityPending: number;
  unit: string;
  phase: string;
  requiredDate: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'partial' | 'allocated' | 'delivered';
}

@Component({
  selector: 'app-materials-needed-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatProgressBarModule
  ],
  template: `
    <div class="materials-needed-container">
      <div class="header-section">
        <h3>Materials Required</h3>
        <div class="header-actions">
          <button mat-stroked-button (click)="generateReport()">
            <mat-icon>description</mat-icon>
            Generate Report
          </button>
          <button mat-raised-button color="primary" (click)="addRequirement()">
            <mat-icon>add</mat-icon>
            Add Requirement
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{ totalMaterials }}</span>
              <span class="summary-label">Total Materials</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon pending">
              <mat-icon>pending_actions</mat-icon>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{ pendingMaterials }}</span>
              <span class="summary-label">Pending Allocation</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon allocated">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{ allocatedMaterials }}</span>
              <span class="summary-label">Allocated</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon urgent">
              <mat-icon>priority_high</mat-icon>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{ urgentMaterials }}</span>
              <span class="summary-label">Urgent</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Materials Table -->
      <mat-card class="materials-table-card">
        <mat-card-header>
          <mat-card-title>Material Requirements</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="materials" class="materials-table">
            <!-- Material Column -->
            <ng-container matColumnDef="material">
              <th mat-header-cell *matHeaderCellDef>Material</th>
              <td mat-cell *matCellDef="let material">
                <div class="material-info">
                  <strong>{{ material.materialName }}</strong>
                  <span class="category">{{ material.category }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Phase Column -->
            <ng-container matColumnDef="phase">
              <th mat-header-cell *matHeaderCellDef>Phase</th>
              <td mat-cell *matCellDef="let material">{{ material.phase }}</td>
            </ng-container>

            <!-- Quantity Column -->
            <ng-container matColumnDef="quantity">
              <th mat-header-cell *matHeaderCellDef>Quantity</th>
              <td mat-cell *matCellDef="let material">
                <div class="quantity-info">
                  <span>{{ material.quantityRequired }} {{ material.unit }}</span>
                  <div class="allocation-progress">
                    <mat-progress-bar 
                      mode="determinate" 
                      [value]="(material.quantityAllocated / material.quantityRequired) * 100"
                      [color]="material.quantityAllocated >= material.quantityRequired ? 'primary' : 'warn'">
                    </mat-progress-bar>
                    <span class="allocation-text">{{ material.quantityAllocated }} allocated</span>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Required Date Column -->
            <ng-container matColumnDef="requiredDate">
              <th mat-header-cell *matHeaderCellDef>Required By</th>
              <td mat-cell *matCellDef="let material">
                {{ material.requiredDate | date:'MMM d, y' }}
              </td>
            </ng-container>

            <!-- Priority Column -->
            <ng-container matColumnDef="priority">
              <th mat-header-cell *matHeaderCellDef>Priority</th>
              <td mat-cell *matCellDef="let material">
                <mat-chip 
                  [class.high-priority]="material.priority === 'high'"
                  [class.medium-priority]="material.priority === 'medium'"
                  [class.low-priority]="material.priority === 'low'">
                  {{ material.priority | titlecase }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let material">
                <mat-chip 
                  [class.pending-chip]="material.status === 'pending'"
                  [class.partial-chip]="material.status === 'partial'"
                  [class.allocated-chip]="material.status === 'allocated'"
                  [class.delivered-chip]="material.status === 'delivered'">
                  {{ material.status | titlecase }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let material">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="allocateMaterial(material)">
                    <mat-icon>assignment</mat-icon>
                    <span>Allocate</span>
                  </button>
                  <button mat-menu-item (click)="editRequirement(material)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="viewDetails(material)">
                    <mat-icon>visibility</mat-icon>
                    <span>View Details</span>
                  </button>
                  <button mat-menu-item (click)="deleteRequirement(material)" class="delete-action">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="materials.length === 0" class="no-data">
            <mat-icon>inventory_2</mat-icon>
            <p>No material requirements added yet</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .materials-needed-container {
      padding: 16px;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-section h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      position: relative;
      overflow: hidden;
    }

    .summary-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .summary-icon.pending {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .summary-icon.allocated {
      background-color: #e8f5e9;
      color: #388e3c;
    }

    .summary-icon.urgent {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .summary-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .summary-content {
      flex: 1;
    }

    .summary-value {
      display: block;
      font-size: 28px;
      font-weight: 500;
      line-height: 1;
    }

    .summary-label {
      display: block;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-top: 4px;
    }

    .materials-table {
      width: 100%;
    }

    .material-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .material-info .category {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .quantity-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .allocation-progress {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .allocation-progress mat-progress-bar {
      width: 80px;
    }

    .allocation-text {
      font-size: 11px;
      color: rgba(0, 0, 0, 0.6);
    }

    mat-chip {
      font-size: 12px;
    }

    .high-priority {
      background-color: #d32f2f !important;
      color: white !important;
    }

    .medium-priority {
      background-color: #f57c00 !important;
      color: white !important;
    }

    .low-priority {
      background-color: #388e3c !important;
      color: white !important;
    }

    .pending-chip {
      background-color: #9e9e9e !important;
      color: white !important;
    }

    .partial-chip {
      background-color: #ff9800 !important;
      color: white !important;
    }

    .allocated-chip {
      background-color: #2196f3 !important;
      color: white !important;
    }

    .delivered-chip {
      background-color: #4caf50 !important;
      color: white !important;
    }

    .no-data {
      text-align: center;
      padding: 48px;
      color: rgba(0, 0, 0, 0.4);
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .delete-action {
      color: #f44336;
    }
  `]
})
export class MaterialsNeededTabComponent implements OnInit {
  @Input() contractorProject!: ContractorProject;

  displayedColumns: string[] = ['material', 'phase', 'quantity', 'requiredDate', 'priority', 'status', 'actions'];
  materials: MaterialRequirement[] = [];

  get totalMaterials(): number {
    return this.materials.length;
  }

  get pendingMaterials(): number {
    return this.materials.filter(m => m.status === 'pending').length;
  }

  get allocatedMaterials(): number {
    return this.materials.filter(m => m.status === 'allocated').length;
  }

  get urgentMaterials(): number {
    return this.materials.filter(m => m.priority === 'high').length;
  }

  ngOnInit(): void {
    this.loadMaterialRequirements();
  }

  loadMaterialRequirements(): void {
    // TODO: Load actual data from service
    // For now, using mock data
    this.materials = [
      {
        id: '1',
        materialName: 'Fiber Optic Cable - 12 Core',
        category: 'Cables',
        quantityRequired: 1000,
        quantityAllocated: 750,
        quantityPending: 250,
        unit: 'meters',
        phase: 'Phase 2 - Installation',
        requiredDate: new Date('2024-02-15'),
        priority: 'high',
        status: 'partial'
      },
      {
        id: '2',
        materialName: 'Splice Enclosure',
        category: 'Accessories',
        quantityRequired: 50,
        quantityAllocated: 50,
        quantityPending: 0,
        unit: 'pieces',
        phase: 'Phase 2 - Installation',
        requiredDate: new Date('2024-02-20'),
        priority: 'medium',
        status: 'allocated'
      },
      {
        id: '3',
        materialName: 'Conduit Pipes - 50mm',
        category: 'Infrastructure',
        quantityRequired: 200,
        quantityAllocated: 0,
        quantityPending: 200,
        unit: 'pieces',
        phase: 'Phase 1 - Preparation',
        requiredDate: new Date('2024-01-30'),
        priority: 'high',
        status: 'pending'
      },
      {
        id: '4',
        materialName: 'Cable Ties',
        category: 'Accessories',
        quantityRequired: 500,
        quantityAllocated: 500,
        quantityPending: 0,
        unit: 'pieces',
        phase: 'Phase 3 - Termination',
        requiredDate: new Date('2024-03-10'),
        priority: 'low',
        status: 'delivered'
      }
    ];
  }

  addRequirement(): void {
    // TODO: Open dialog to add new material requirement
    console.log('Add material requirement');
  }

  generateReport(): void {
    // TODO: Generate material requirement report
    console.log('Generate report');
  }

  allocateMaterial(material: MaterialRequirement): void {
    // TODO: Open dialog to allocate material
    console.log('Allocate material:', material);
  }

  editRequirement(material: MaterialRequirement): void {
    // TODO: Open dialog to edit requirement
    console.log('Edit requirement:', material);
  }

  viewDetails(material: MaterialRequirement): void {
    // TODO: View material details
    console.log('View details:', material);
  }

  deleteRequirement(material: MaterialRequirement): void {
    // TODO: Confirm and delete requirement
    console.log('Delete requirement:', material);
  }
}