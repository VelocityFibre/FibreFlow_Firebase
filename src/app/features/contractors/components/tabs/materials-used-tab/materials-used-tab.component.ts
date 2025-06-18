import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContractorProject } from '../../../models/contractor-project.model';

interface MaterialUsage {
  id: string;
  materialName: string;
  category: string;
  quantityUsed: number;
  quantityWasted: number;
  unit: string;
  usedDate: Date;
  phase: string;
  usedBy: string;
  costPerUnit: number;
  totalCost: number;
  wastagePercentage: number;
  notes?: string;
}

interface UsageSummary {
  totalMaterialsUsed: number;
  totalCost: number;
  averageWastage: number;
  mostUsedCategory: string;
}

@Component({
  selector: 'app-materials-used-tab',
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
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="materials-used-container">
      <div class="header-section">
        <h3>Materials Used</h3>
        <div class="header-actions">
          <button mat-stroked-button (click)="exportData()">
            <mat-icon>download</mat-icon>
            Export Data
          </button>
          <button mat-raised-button color="primary" (click)="recordUsage()">
            <mat-icon>add</mat-icon>
            Record Usage
          </button>
        </div>
      </div>

      <!-- Usage Summary -->
      <mat-card class="summary-card">
        <mat-card-header>
          <mat-card-title>Usage Summary</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="summary-grid">
            <div class="summary-item">
              <mat-icon color="primary">inventory</mat-icon>
              <div class="summary-details">
                <span class="summary-value">{{ summary.totalMaterialsUsed }}</span>
                <span class="summary-label">Materials Used</span>
              </div>
            </div>
            <div class="summary-item">
              <mat-icon color="accent">attach_money</mat-icon>
              <div class="summary-details">
                <span class="summary-value">{{
                  summary.totalCost | currency: 'ZAR' : 'symbol' : '1.0-0'
                }}</span>
                <span class="summary-label">Total Cost</span>
              </div>
            </div>
            <div class="summary-item">
              <mat-icon color="warn">delete_sweep</mat-icon>
              <div class="summary-details">
                <span class="summary-value">{{ summary.averageWastage }}%</span>
                <span class="summary-label">Average Wastage</span>
              </div>
            </div>
            <div class="summary-item">
              <mat-icon>category</mat-icon>
              <div class="summary-details">
                <span class="summary-value">{{ summary.mostUsedCategory }}</span>
                <span class="summary-label">Most Used Category</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Wastage Analysis -->
      <div class="analysis-cards">
        <mat-card class="wastage-card">
          <mat-card-header>
            <mat-card-title>Wastage Analysis</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="wastage-stats">
              <div class="wastage-item" *ngFor="let category of wastageByCategory">
                <div class="category-header">
                  <span class="category-name">{{ category.name }}</span>
                  <span
                    class="wastage-percent"
                    [class.low]="category.percentage < 5"
                    [class.medium]="category.percentage >= 5 && category.percentage < 10"
                    [class.high]="category.percentage >= 10"
                  >
                    {{ category.percentage }}%
                  </span>
                </div>
                <div class="wastage-bar">
                  <div class="wastage-fill" [style.width.%]="category.percentage * 10"></div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="phase-usage-card">
          <mat-card-header>
            <mat-card-title>Phase-wise Usage</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="phase-stats">
              <div class="phase-item" *ngFor="let phase of phaseUsage">
                <span class="phase-name">{{ phase.name }}</span>
                <div class="phase-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="phase.percentage"></div>
                  </div>
                  <span class="phase-value">{{
                    phase.cost | currency: 'ZAR' : 'symbol' : '1.0-0'
                  }}</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Materials Usage Table -->
      <mat-card class="usage-table-card">
        <mat-card-header>
          <mat-card-title>Material Usage Details</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="materials" class="usage-table">
            <!-- Date Column -->
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let material">
                {{ material.usedDate | date: 'MMM d, y' }}
              </td>
            </ng-container>

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
              <th mat-header-cell *matHeaderCellDef>Quantity Used</th>
              <td mat-cell *matCellDef="let material">
                {{ material.quantityUsed }} {{ material.unit }}
              </td>
            </ng-container>

            <!-- Wastage Column -->
            <ng-container matColumnDef="wastage">
              <th mat-header-cell *matHeaderCellDef>Wastage</th>
              <td mat-cell *matCellDef="let material">
                <div class="wastage-info">
                  <span>{{ material.quantityWasted }} {{ material.unit }}</span>
                  <mat-chip
                    [class.low-wastage]="material.wastagePercentage < 5"
                    [class.medium-wastage]="
                      material.wastagePercentage >= 5 && material.wastagePercentage < 10
                    "
                    [class.high-wastage]="material.wastagePercentage >= 10"
                  >
                    {{ material.wastagePercentage }}%
                  </mat-chip>
                </div>
              </td>
            </ng-container>

            <!-- Cost Column -->
            <ng-container matColumnDef="cost">
              <th mat-header-cell *matHeaderCellDef>Total Cost</th>
              <td mat-cell *matCellDef="let material">
                {{ material.totalCost | currency: 'ZAR' : 'symbol' : '1.2-2' }}
              </td>
            </ng-container>

            <!-- Used By Column -->
            <ng-container matColumnDef="usedBy">
              <th mat-header-cell *matHeaderCellDef>Used By</th>
              <td mat-cell *matCellDef="let material">{{ material.usedBy }}</td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let material">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="viewDetails(material)">
                    <mat-icon>visibility</mat-icon>
                    <span>View Details</span>
                  </button>
                  <button mat-menu-item (click)="editUsage(material)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="deleteUsage(material)" class="delete-action">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>

          <div *ngIf="materials.length === 0" class="no-data">
            <mat-icon>inventory_2</mat-icon>
            <p>No material usage recorded yet</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .materials-used-container {
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

      .summary-card {
        margin-bottom: 24px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 24px;
      }

      .summary-item {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .summary-item mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }

      .summary-details {
        flex: 1;
      }

      .summary-value {
        display: block;
        font-size: 24px;
        font-weight: 500;
        line-height: 1;
      }

      .summary-label {
        display: block;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
        margin-top: 4px;
      }

      .analysis-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 24px;
      }

      @media (max-width: 768px) {
        .analysis-cards {
          grid-template-columns: 1fr;
        }
      }

      .wastage-stats {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .wastage-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .category-name {
        font-weight: 500;
      }

      .wastage-percent {
        font-weight: bold;
      }

      .wastage-percent.low {
        color: #4caf50;
      }

      .wastage-percent.medium {
        color: #ff9800;
      }

      .wastage-percent.high {
        color: #f44336;
      }

      .wastage-bar {
        height: 8px;
        background-color: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }

      .wastage-fill {
        height: 100%;
        background-color: #ff9800;
        transition: width 0.3s ease;
      }

      .phase-stats {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .phase-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .phase-name {
        font-weight: 500;
      }

      .phase-progress {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .progress-bar {
        flex: 1;
        height: 8px;
        background-color: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background-color: #2196f3;
        transition: width 0.3s ease;
      }

      .phase-value {
        font-size: 12px;
        font-weight: 500;
        min-width: 80px;
        text-align: right;
      }

      .usage-table {
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

      .wastage-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      mat-chip {
        font-size: 11px;
        height: 20px;
        padding: 0 8px;
      }

      .low-wastage {
        background-color: #4caf50 !important;
        color: white !important;
      }

      .medium-wastage {
        background-color: #ff9800 !important;
        color: white !important;
      }

      .high-wastage {
        background-color: #f44336 !important;
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
    `,
  ],
})
export class MaterialsUsedTabComponent implements OnInit {
  @Input() contractorProject!: ContractorProject;

  displayedColumns: string[] = [
    'date',
    'material',
    'phase',
    'quantity',
    'wastage',
    'cost',
    'usedBy',
    'actions',
  ];
  materials: MaterialUsage[] = [];

  summary: UsageSummary = {
    totalMaterialsUsed: 0,
    totalCost: 0,
    averageWastage: 0,
    mostUsedCategory: 'Cables',
  };

  wastageByCategory = [
    { name: 'Cables', percentage: 3.5 },
    { name: 'Accessories', percentage: 8.2 },
    { name: 'Infrastructure', percentage: 12.5 },
    { name: 'Tools', percentage: 2.1 },
  ];

  phaseUsage = [
    { name: 'Phase 1 - Preparation', cost: 25000, percentage: 20 },
    { name: 'Phase 2 - Installation', cost: 75000, percentage: 60 },
    { name: 'Phase 3 - Termination', cost: 25000, percentage: 20 },
  ];

  ngOnInit(): void {
    this.loadMaterialUsage();
  }

  loadMaterialUsage(): void {
    // TODO: Load actual data from service
    // For now, using mock data
    this.materials = [
      {
        id: '1',
        materialName: 'Fiber Optic Cable - 12 Core',
        category: 'Cables',
        quantityUsed: 850,
        quantityWasted: 30,
        unit: 'meters',
        usedDate: new Date('2024-02-10'),
        phase: 'Phase 2 - Installation',
        usedBy: 'Team A - John Smith',
        costPerUnit: 150,
        totalCost: 127500,
        wastagePercentage: 3.5,
        notes: 'Used for main trunk installation',
      },
      {
        id: '2',
        materialName: 'Splice Enclosure',
        category: 'Accessories',
        quantityUsed: 45,
        quantityWasted: 5,
        unit: 'pieces',
        usedDate: new Date('2024-02-12'),
        phase: 'Phase 2 - Installation',
        usedBy: 'Team B - Jane Doe',
        costPerUnit: 850,
        totalCost: 38250,
        wastagePercentage: 11.1,
      },
      {
        id: '3',
        materialName: 'Cable Ties',
        category: 'Accessories',
        quantityUsed: 450,
        quantityWasted: 20,
        unit: 'pieces',
        usedDate: new Date('2024-02-15'),
        phase: 'Phase 3 - Termination',
        usedBy: 'Team A - John Smith',
        costPerUnit: 5,
        totalCost: 2250,
        wastagePercentage: 4.4,
      },
    ];

    this.calculateSummary();
  }

  calculateSummary(): void {
    this.summary.totalMaterialsUsed = this.materials.length;
    this.summary.totalCost = this.materials.reduce((sum, m) => sum + m.totalCost, 0);

    const totalWastage = this.materials.reduce((sum, m) => sum + m.wastagePercentage, 0);
    this.summary.averageWastage = Math.round((totalWastage / this.materials.length) * 10) / 10;
  }

  recordUsage(): void {
    // TODO: Open dialog to record material usage
    console.log('Record material usage');
  }

  exportData(): void {
    // TODO: Export usage data to CSV/Excel
    console.log('Export data');
  }

  viewDetails(material: MaterialUsage): void {
    // TODO: View detailed usage information
    console.log('View details:', material);
  }

  editUsage(material: MaterialUsage): void {
    // TODO: Open dialog to edit usage record
    console.log('Edit usage:', material);
  }

  deleteUsage(material: MaterialUsage): void {
    // TODO: Confirm and delete usage record
    console.log('Delete usage:', material);
  }
}
