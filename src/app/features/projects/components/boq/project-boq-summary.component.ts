import { Component, Input, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Observable } from 'rxjs';

import { BOQService } from '../../../boq/services/boq.service';
import { BOQSummary } from '../../../boq/models/boq.model';

@Component({
  selector: 'app-project-boq-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
  ],
  template: `
    <div class="boq-summary-container">
      <!-- Header with Action -->
      <div class="summary-header">
        <h3 class="section-title">Bill of Quantities Summary</h3>
        <button mat-raised-button color="primary" (click)="navigateToBOQ()">
          <mat-icon>receipt_long</mat-icon>
          Manage BOQ
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards" *ngIf="summary$ | async as summary; else loading">
        <mat-card class="summary-card ff-card-boq">
          <mat-card-content>
            <div class="card-icon primary">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ summary.totalItems }}</div>
              <div class="card-label">Total Items</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card ff-card-boq">
          <mat-card-content>
            <div class="card-icon value">
              <mat-icon>attach_money</mat-icon>
            </div>
            <div class="card-info">
              <div class="card-value">R{{ summary.totalValue | number: '1.0-0' }}</div>
              <div class="card-label">Total Value</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card ff-card-boq">
          <mat-card-content>
            <div class="card-icon info">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ summary.allocationPercentage }}%</div>
              <div class="card-label">Allocated</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card ff-card-boq">
          <mat-card-content>
            <div class="card-icon warning">
              <mat-icon>pending_actions</mat-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ summary.itemsNeedingQuotes }}</div>
              <div class="card-label">Need Quotes</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Allocation Progress -->
      <div class="allocation-progress" *ngIf="summary$ | async as summary">
        <h4>Allocation Progress</h4>
        <mat-progress-bar
          mode="determinate"
          [value]="summary.allocationPercentage"
          [color]="getProgressColor(summary.allocationPercentage)"
        >
        </mat-progress-bar>
        <div class="progress-info">
          <span>R{{ summary.allocatedValue | number: '1.0-0' }} allocated</span>
          <span
            >R{{ summary.totalValue - summary.allocatedValue | number: '1.0-0' }} remaining</span
          >
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats" *ngIf="summary$ | async as summary">
        <div class="stat-item" *ngIf="summary.statusCounts">
          <mat-chip-set>
            <mat-chip
              *ngFor="let status of getStatusChips(summary.statusCounts)"
              [class]="'status-' + status.class"
            >
              {{ status.count }} {{ status.label }}
            </mat-chip>
          </mat-chip-set>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="(summary$ | async)?.totalItems === 0">
        <mat-icon>receipt</mat-icon>
        <p>No BOQ items created for this project yet</p>
        <button mat-raised-button color="primary" (click)="navigateToBOQ()">
          <mat-icon>add</mat-icon>
          Create BOQ
        </button>
      </div>
    </div>

    <ng-template #loading>
      <div class="loading-state">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .boq-summary-container {
        padding: 0;
      }

      .summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .section-title {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .summary-card mat-card-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px !important;
      }

      .card-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .card-icon.primary {
        background-color: rgb(var(--ff-primary) / 0.1);
        color: rgb(var(--ff-primary));
      }

      .card-icon.value {
        background-color: rgb(var(--ff-success) / 0.1);
        color: rgb(var(--ff-success));
      }

      .card-icon.info {
        background-color: rgb(var(--ff-info) / 0.1);
        color: rgb(var(--ff-info));
      }

      .card-icon.warning {
        background-color: rgb(var(--ff-warning) / 0.1);
        color: rgb(var(--ff-warning));
      }

      .card-value {
        font-size: 20px;
        font-weight: 600;
        color: rgb(var(--ff-foreground));
      }

      .card-label {
        font-size: 12px;
        color: rgb(var(--ff-muted-foreground));
      }

      .allocation-progress {
        background: rgb(var(--ff-muted) / 0.1);
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 24px;

        h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 500;
        }
      }

      .progress-info {
        display: flex;
        justify-content: space-between;
        margin-top: 12px;
        font-size: 14px;
        color: rgb(var(--ff-muted-foreground));
      }

      .quick-stats {
        margin-bottom: 24px;
      }

      mat-chip {
        font-size: 12px;
        height: 24px;
        line-height: 24px;
      }

      .status-planned {
        background-color: rgb(var(--ff-muted) / 0.3);
        color: rgb(var(--ff-muted-foreground));
      }

      .status-partial {
        background-color: rgb(var(--ff-warning) / 0.15);
        color: rgb(var(--ff-warning));
      }

      .status-allocated {
        background-color: rgb(var(--ff-success) / 0.15);
        color: rgb(var(--ff-success));
      }

      .status-ordered {
        background-color: rgb(var(--ff-info) / 0.15);
        color: rgb(var(--ff-info));
      }

      .empty-state {
        text-align: center;
        padding: 48px;
        background: rgb(var(--ff-muted) / 0.1);
        border-radius: 8px;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: rgb(var(--ff-border));
          margin-bottom: 16px;
        }

        p {
          color: rgb(var(--ff-muted-foreground));
          margin-bottom: 24px;
        }
      }

      .loading-state {
        padding: 24px 0;
      }

      @media (max-width: 768px) {
        .summary-header {
          flex-direction: column;
          gap: 16px;
          align-items: flex-start;
        }

        .summary-cards {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class ProjectBOQSummaryComponent implements OnInit {
  @Input() projectId!: string;
  @Input() projectName?: string;

  private boqService = inject(BOQService);
  private router = inject(Router);

  summary$!: Observable<BOQSummary>;

  ngOnInit() {
    this.summary$ = this.boqService.getProjectSummary(this.projectId);
  }

  navigateToBOQ() {
    // Navigate to main BOQ module with project filter
    this.router.navigate(['/boq'], {
      queryParams: { projectId: this.projectId },
    });
  }

  getProgressColor(percentage: number): string {
    if (percentage < 30) return 'warn';
    if (percentage < 70) return 'accent';
    return 'primary';
  }

  getStatusChips(statusCounts: any): any[] {
    const chips = [];

    if (statusCounts.planned > 0) {
      chips.push({ count: statusCounts.planned, label: 'Planned', class: 'planned' });
    }
    if (statusCounts.partiallyAllocated > 0) {
      chips.push({ count: statusCounts.partiallyAllocated, label: 'Partial', class: 'partial' });
    }
    if (statusCounts.fullyAllocated > 0) {
      chips.push({ count: statusCounts.fullyAllocated, label: 'Allocated', class: 'allocated' });
    }
    if (statusCounts.ordered > 0) {
      chips.push({ count: statusCounts.ordered, label: 'Ordered', class: 'ordered' });
    }

    return chips;
  }
}
