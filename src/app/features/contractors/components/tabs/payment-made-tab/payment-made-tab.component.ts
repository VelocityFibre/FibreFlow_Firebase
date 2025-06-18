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

interface Payment {
  id: string;
  paymentNumber: string;
  paymentDate: Date;
  amount: number;
  paymentMethod: 'bank_transfer' | 'cheque' | 'cash' | 'online';
  reference: string;
  requestNumber: string;
  phase: string;
  description: string;
  processedBy: string;
  receipt?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bank: string;
  };
}

interface PaymentSummary {
  totalPaid: number;
  contractValue: number;
  percentagePaid: number;
  lastPaymentDate: Date | null;
  paymentsByMethod: { method: string; amount: number; count: number }[];
}

@Component({
  selector: 'app-payment-made-tab',
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
    MatProgressBarModule,
  ],
  template: `
    <div class="payment-made-container">
      <div class="header-section">
        <h3>Payment History</h3>
        <div class="header-actions">
          <button mat-stroked-button (click)="generateStatement()">
            <mat-icon>description</mat-icon>
            Generate Statement
          </button>
          <button mat-raised-button color="primary" (click)="recordPayment()">
            <mat-icon>add</mat-icon>
            Record Payment
          </button>
        </div>
      </div>

      <!-- Payment Summary Card -->
      <mat-card class="summary-card">
        <mat-card-header>
          <mat-card-title>Payment Summary</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="payment-progress">
            <div class="progress-header">
              <div>
                <span class="progress-label">Total Paid</span>
                <span class="progress-amount">{{
                  summary.totalPaid | currency: 'ZAR' : 'symbol' : '1.0-0'
                }}</span>
              </div>
              <div class="text-right">
                <span class="progress-label">Contract Value</span>
                <span class="progress-amount">{{
                  summary.contractValue | currency: 'ZAR' : 'symbol' : '1.0-0'
                }}</span>
              </div>
            </div>
            <mat-progress-bar
              mode="determinate"
              [value]="summary.percentagePaid"
              [color]="summary.percentagePaid >= 90 ? 'warn' : 'primary'"
            >
            </mat-progress-bar>
            <div class="progress-footer">
              <span>{{ summary.percentagePaid }}% Paid</span>
              <span
                >{{
                  summary.contractValue - summary.totalPaid | currency: 'ZAR' : 'symbol' : '1.0-0'
                }}
                Remaining</span
              >
            </div>
          </div>

          <div class="payment-stats">
            <div class="stat-item" *ngIf="summary.lastPaymentDate">
              <mat-icon>event</mat-icon>
              <div>
                <span class="stat-label">Last Payment</span>
                <span class="stat-value">{{ summary.lastPaymentDate | date: 'MMM d, y' }}</span>
              </div>
            </div>
            <div class="stat-item">
              <mat-icon>payments</mat-icon>
              <div>
                <span class="stat-label">Total Payments</span>
                <span class="stat-value">{{ payments.length }}</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Payment Methods Breakdown -->
      <mat-card class="methods-card">
        <mat-card-header>
          <mat-card-title>Payment Methods</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="methods-grid">
            <div class="method-item" *ngFor="let method of summary.paymentsByMethod">
              <div class="method-icon">
                <mat-icon>{{ getMethodIcon(method.method) }}</mat-icon>
              </div>
              <div class="method-details">
                <span class="method-name">{{ method.method | titlecase }}</span>
                <span class="method-amount">{{
                  method.amount | currency: 'ZAR' : 'symbol' : '1.0-0'
                }}</span>
                <span class="method-count"
                  >{{ method.count }} payment{{ method.count > 1 ? 's' : '' }}</span
                >
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Payments Table -->
      <mat-card class="payments-table-card">
        <mat-card-header>
          <mat-card-title>Payment Transactions</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="payments" class="payments-table">
            <!-- Date Column -->
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let payment">
                {{ payment.paymentDate | date: 'MMM d, y' }}
              </td>
            </ng-container>

            <!-- Payment Number Column -->
            <ng-container matColumnDef="paymentNumber">
              <th mat-header-cell *matHeaderCellDef>Payment #</th>
              <td mat-cell *matCellDef="let payment">
                <strong>{{ payment.paymentNumber }}</strong>
              </td>
            </ng-container>

            <!-- Amount Column -->
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Amount</th>
              <td mat-cell *matCellDef="let payment">
                <span class="amount">{{
                  payment.amount | currency: 'ZAR' : 'symbol' : '1.2-2'
                }}</span>
              </td>
            </ng-container>

            <!-- Method Column -->
            <ng-container matColumnDef="method">
              <th mat-header-cell *matHeaderCellDef>Method</th>
              <td mat-cell *matCellDef="let payment">
                <mat-chip>
                  <mat-icon class="chip-icon">{{ getMethodIcon(payment.paymentMethod) }}</mat-icon>
                  {{ payment.paymentMethod | titlecase }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Reference Column -->
            <ng-container matColumnDef="reference">
              <th mat-header-cell *matHeaderCellDef>Reference</th>
              <td mat-cell *matCellDef="let payment">
                <code>{{ payment.reference }}</code>
              </td>
            </ng-container>

            <!-- Phase Column -->
            <ng-container matColumnDef="phase">
              <th mat-header-cell *matHeaderCellDef>Phase</th>
              <td mat-cell *matCellDef="let payment">{{ payment.phase }}</td>
            </ng-container>

            <!-- Processed By Column -->
            <ng-container matColumnDef="processedBy">
              <th mat-header-cell *matHeaderCellDef>Processed By</th>
              <td mat-cell *matCellDef="let payment">{{ payment.processedBy }}</td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let payment">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="viewDetails(payment)">
                    <mat-icon>visibility</mat-icon>
                    <span>View Details</span>
                  </button>
                  <button mat-menu-item (click)="downloadReceipt(payment)">
                    <mat-icon>receipt</mat-icon>
                    <span>Download Receipt</span>
                  </button>
                  <button mat-menu-item (click)="sendReceipt(payment)">
                    <mat-icon>email</mat-icon>
                    <span>Send Receipt</span>
                  </button>
                  <button mat-menu-item (click)="editPayment(payment)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>

          <div *ngIf="payments.length === 0" class="no-data">
            <mat-icon>payment</mat-icon>
            <p>No payments recorded yet</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .payment-made-container {
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

      mat-card {
        margin-bottom: 24px;
      }

      .payment-progress {
        margin-bottom: 32px;
      }

      .progress-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
      }

      .progress-label {
        display: block;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
        margin-bottom: 4px;
      }

      .progress-amount {
        display: block;
        font-size: 24px;
        font-weight: 500;
      }

      .text-right {
        text-align: right;
      }

      mat-progress-bar {
        height: 12px;
        border-radius: 6px;
      }

      .progress-footer {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.6);
      }

      .payment-stats {
        display: flex;
        gap: 32px;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .stat-item mat-icon {
        color: #1976d2;
      }

      .stat-label {
        display: block;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
      }

      .stat-value {
        display: block;
        font-weight: 500;
      }

      .methods-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .method-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }

      .method-icon {
        width: 48px;
        height: 48px;
        background-color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .method-icon mat-icon {
        color: #1976d2;
      }

      .method-details {
        flex: 1;
      }

      .method-name {
        display: block;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 4px;
      }

      .method-amount {
        display: block;
        font-size: 18px;
        font-weight: 500;
        color: #1976d2;
        margin-bottom: 2px;
      }

      .method-count {
        display: block;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
      }

      .payments-table {
        width: 100%;
      }

      .amount {
        font-weight: 500;
        color: #388e3c;
      }

      mat-chip {
        font-size: 12px;
      }

      .chip-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }

      code {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        background-color: #f5f5f5;
        padding: 2px 6px;
        border-radius: 4px;
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
    `,
  ],
})
export class PaymentMadeTabComponent implements OnInit {
  @Input() contractorProject!: ContractorProject;

  displayedColumns: string[] = [
    'date',
    'paymentNumber',
    'amount',
    'method',
    'reference',
    'phase',
    'processedBy',
    'actions',
  ];
  payments: Payment[] = [];

  summary: PaymentSummary = {
    totalPaid: 0,
    contractValue: 1500000, // Mock contract value
    percentagePaid: 0,
    lastPaymentDate: null,
    paymentsByMethod: [],
  };

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    // TODO: Load actual data from service
    // For now, using mock data
    this.payments = [
      {
        id: '1',
        paymentNumber: 'PAY-2024-001',
        paymentDate: new Date('2024-01-20'),
        amount: 150000,
        paymentMethod: 'bank_transfer',
        reference: 'FT2024012001234',
        requestNumber: 'PR-2024-001',
        phase: 'Phase 1 - Site Preparation',
        description: 'Payment for site preparation completion',
        processedBy: 'Admin User',
        receipt: 'receipt-001.pdf',
        bankDetails: {
          accountName: 'ABC Contractors Ltd',
          accountNumber: '1234567890',
          bank: 'Standard Bank',
        },
      },
      {
        id: '2',
        paymentNumber: 'PAY-2024-002',
        paymentDate: new Date('2024-02-18'),
        amount: 150000,
        paymentMethod: 'bank_transfer',
        reference: 'FT2024021801234',
        requestNumber: 'PR-2024-004',
        phase: 'Phase 2 - Foundation Work',
        description: 'Partial payment for material procurement',
        processedBy: 'Finance Manager',
        receipt: 'receipt-002.pdf',
      },
      {
        id: '3',
        paymentNumber: 'PAY-2024-003',
        paymentDate: new Date('2024-02-25'),
        amount: 50000,
        paymentMethod: 'cheque',
        reference: 'CHQ-00123',
        requestNumber: 'PR-2024-005',
        phase: 'Phase 2 - Foundation Work',
        description: 'Payment for additional materials',
        processedBy: 'Admin User',
        receipt: 'receipt-003.pdf',
      },
    ];

    this.calculateSummary();
  }

  calculateSummary(): void {
    this.summary.totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
    this.summary.percentagePaid = Math.round(
      (this.summary.totalPaid / this.summary.contractValue) * 100,
    );

    if (this.payments.length > 0) {
      this.summary.lastPaymentDate = this.payments.sort(
        (a, b) => b.paymentDate.getTime() - a.paymentDate.getTime(),
      )[0].paymentDate;
    }

    // Calculate payments by method
    const methodMap = new Map<string, { amount: number; count: number }>();
    this.payments.forEach((payment) => {
      const existing = methodMap.get(payment.paymentMethod) || { amount: 0, count: 0 };
      methodMap.set(payment.paymentMethod, {
        amount: existing.amount + payment.amount,
        count: existing.count + 1,
      });
    });

    this.summary.paymentsByMethod = Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
    }));
  }

  getMethodIcon(method: string): string {
    switch (method) {
      case 'bank_transfer':
        return 'account_balance';
      case 'cheque':
        return 'receipt_long';
      case 'cash':
        return 'payments';
      case 'online':
        return 'credit_card';
      default:
        return 'payment';
    }
  }

  generateStatement(): void {
    // TODO: Generate payment statement
    console.log('Generate statement');
  }

  recordPayment(): void {
    // TODO: Open dialog to record new payment
    console.log('Record payment');
  }

  viewDetails(payment: Payment): void {
    // TODO: View payment details
    console.log('View details:', payment);
  }

  downloadReceipt(payment: Payment): void {
    // TODO: Download receipt PDF
    console.log('Download receipt:', payment);
  }

  sendReceipt(payment: Payment): void {
    // TODO: Send receipt via email
    console.log('Send receipt:', payment);
  }

  editPayment(payment: Payment): void {
    // TODO: Open dialog to edit payment
    console.log('Edit payment:', payment);
  }
}
