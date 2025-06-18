import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { ContractorProject } from '../../../models/contractor-project.model';

interface PaymentRequest {
  id: string;
  requestNumber: string;
  requestDate: Date;
  amount: number;
  phase: string;
  milestone: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'partially-approved';
  approvedAmount?: number;
  approvalDate?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  attachments: string[];
  comments?: string;
}

@Component({
  selector: 'app-payment-requested-tab',
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
    MatExpansionModule,
  ],
  template: `
    <div class="payment-requested-container">
      <div class="header-section">
        <h3>Payment Requests</h3>
        <button mat-raised-button color="primary" (click)="createRequest()">
          <mat-icon>add</mat-icon>
          New Request
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <mat-card class="summary-card total">
          <mat-card-content>
            <div class="summary-icon">
              <mat-icon>request_quote</mat-icon>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{
                totalRequested | currency: 'ZAR' : 'symbol' : '1.0-0'
              }}</span>
              <span class="summary-label">Total Requested</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card pending">
          <mat-card-content>
            <div class="summary-icon">
              <mat-icon>pending</mat-icon>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{
                pendingAmount | currency: 'ZAR' : 'symbol' : '1.0-0'
              }}</span>
              <span class="summary-label">Pending Approval</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card approved">
          <mat-card-content>
            <div class="summary-icon">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{
                approvedAmount | currency: 'ZAR' : 'symbol' : '1.0-0'
              }}</span>
              <span class="summary-label">Approved</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card rejected">
          <mat-card-content>
            <div class="summary-icon">
              <mat-icon>cancel</mat-icon>
            </div>
            <div class="summary-content">
              <span class="summary-value">{{ rejectedCount }}</span>
              <span class="summary-label">Rejected</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Payment Requests List -->
      <mat-card class="requests-card">
        <mat-card-header>
          <mat-card-title>Payment Request History</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-accordion>
            <mat-expansion-panel
              *ngFor="let request of requests"
              [class.pending-panel]="request.status === 'pending'"
              [class.approved-panel]="request.status === 'approved'"
              [class.rejected-panel]="request.status === 'rejected'"
            >
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <div class="panel-title">
                    <strong>{{ request.requestNumber }}</strong>
                    <span class="phase">{{ request.phase }}</span>
                  </div>
                </mat-panel-title>
                <mat-panel-description>
                  <div class="panel-description">
                    <span class="amount">{{
                      request.amount | currency: 'ZAR' : 'symbol' : '1.2-2'
                    }}</span>
                    <mat-chip
                      [class.pending-chip]="request.status === 'pending'"
                      [class.approved-chip]="request.status === 'approved'"
                      [class.rejected-chip]="request.status === 'rejected'"
                      [class.partial-chip]="request.status === 'partially-approved'"
                    >
                      {{ request.status | titlecase }}
                    </mat-chip>
                  </div>
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="request-details">
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">Request Date:</span>
                    <span class="detail-value">{{ request.requestDate | date: 'MMM d, y' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Milestone:</span>
                    <span class="detail-value">{{ request.milestone }}</span>
                  </div>
                  <div class="detail-item" *ngIf="request.approvalDate">
                    <span class="detail-label">Approval Date:</span>
                    <span class="detail-value">{{ request.approvalDate | date: 'MMM d, y' }}</span>
                  </div>
                  <div class="detail-item" *ngIf="request.approvedBy">
                    <span class="detail-label">Approved By:</span>
                    <span class="detail-value">{{ request.approvedBy }}</span>
                  </div>
                  <div
                    class="detail-item"
                    *ngIf="request.approvedAmount && request.approvedAmount !== request.amount"
                  >
                    <span class="detail-label">Approved Amount:</span>
                    <span class="detail-value approved-amount">{{
                      request.approvedAmount | currency: 'ZAR' : 'symbol' : '1.2-2'
                    }}</span>
                  </div>
                </div>

                <div class="description-section">
                  <h4>Description</h4>
                  <p>{{ request.description }}</p>
                </div>

                <div class="rejection-section" *ngIf="request.rejectionReason">
                  <h4>Rejection Reason</h4>
                  <p class="rejection-reason">{{ request.rejectionReason }}</p>
                </div>

                <div class="attachments-section" *ngIf="request.attachments.length > 0">
                  <h4>Attachments</h4>
                  <div class="attachments-list">
                    <button
                      mat-stroked-button
                      *ngFor="let attachment of request.attachments"
                      (click)="viewAttachment(attachment)"
                    >
                      <mat-icon>attach_file</mat-icon>
                      {{ attachment }}
                    </button>
                  </div>
                </div>

                <div class="actions-section">
                  <button mat-button (click)="viewDetails(request)">
                    <mat-icon>visibility</mat-icon>
                    View Details
                  </button>
                  <button
                    mat-button
                    (click)="editRequest(request)"
                    *ngIf="request.status === 'pending'"
                  >
                    <mat-icon>edit</mat-icon>
                    Edit
                  </button>
                  <button
                    mat-button
                    (click)="withdrawRequest(request)"
                    *ngIf="request.status === 'pending'"
                    color="warn"
                  >
                    <mat-icon>cancel</mat-icon>
                    Withdraw
                  </button>
                  <button mat-button (click)="downloadInvoice(request)">
                    <mat-icon>download</mat-icon>
                    Download Invoice
                  </button>
                </div>
              </div>
            </mat-expansion-panel>
          </mat-accordion>

          <div *ngIf="requests.length === 0" class="no-data">
            <mat-icon>request_quote</mat-icon>
            <p>No payment requests yet</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .payment-requested-container {
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
      }

      .summary-card.total .summary-icon {
        background-color: #e3f2fd;
        color: #1976d2;
      }

      .summary-card.pending .summary-icon {
        background-color: #fff3e0;
        color: #f57c00;
      }

      .summary-card.approved .summary-icon {
        background-color: #e8f5e9;
        color: #388e3c;
      }

      .summary-card.rejected .summary-icon {
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

      mat-accordion {
        display: block;
      }

      mat-expansion-panel {
        margin-bottom: 8px;
        border-radius: 8px !important;
      }

      .pending-panel {
        border-left: 4px solid #ff9800;
      }

      .approved-panel {
        border-left: 4px solid #4caf50;
      }

      .rejected-panel {
        border-left: 4px solid #f44336;
      }

      .panel-title {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .panel-title .phase {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
        font-weight: normal;
      }

      .panel-description {
        display: flex;
        align-items: center;
        gap: 16px;
        justify-content: flex-end;
      }

      .panel-description .amount {
        font-weight: 500;
        font-size: 16px;
      }

      mat-chip {
        font-size: 12px;
      }

      .pending-chip {
        background-color: #ff9800 !important;
        color: white !important;
      }

      .approved-chip {
        background-color: #4caf50 !important;
        color: white !important;
      }

      .rejected-chip {
        background-color: #f44336 !important;
        color: white !important;
      }

      .partial-chip {
        background-color: #2196f3 !important;
        color: white !important;
      }

      .request-details {
        padding: 16px;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .detail-label {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
      }

      .detail-value {
        font-weight: 500;
      }

      .approved-amount {
        color: #388e3c;
      }

      .description-section,
      .rejection-section,
      .attachments-section {
        margin-bottom: 16px;
      }

      .description-section h4,
      .rejection-section h4,
      .attachments-section h4 {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .rejection-reason {
        color: #d32f2f;
        font-style: italic;
      }

      .attachments-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .attachments-list button {
        font-size: 12px;
      }

      .actions-section {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
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
export class PaymentRequestedTabComponent implements OnInit {
  @Input() contractorProject!: ContractorProject;

  requests: PaymentRequest[] = [];
  totalRequested = 0;
  pendingAmount = 0;
  approvedAmount = 0;
  rejectedCount = 0;

  ngOnInit(): void {
    this.loadPaymentRequests();
  }

  loadPaymentRequests(): void {
    // TODO: Load actual data from service
    // For now, using mock data
    this.requests = [
      {
        id: '1',
        requestNumber: 'PR-2024-001',
        requestDate: new Date('2024-01-15'),
        amount: 150000,
        phase: 'Phase 1 - Site Preparation',
        milestone: 'Site preparation completed',
        description:
          'Payment for completion of site preparation including clearing, grading, and initial infrastructure setup.',
        status: 'approved',
        approvedAmount: 150000,
        approvalDate: new Date('2024-01-20'),
        approvedBy: 'John Manager',
        attachments: ['invoice-001.pdf', 'completion-certificate.pdf'],
      },
      {
        id: '2',
        requestNumber: 'PR-2024-002',
        requestDate: new Date('2024-02-10'),
        amount: 250000,
        phase: 'Phase 2 - Foundation Work',
        milestone: '50% foundation work completed',
        description:
          'Payment request for 50% completion of foundation work including excavation and concrete work.',
        status: 'pending',
        attachments: ['invoice-002.pdf', 'progress-report.pdf'],
      },
      {
        id: '3',
        requestNumber: 'PR-2024-003',
        requestDate: new Date('2024-01-25'),
        amount: 100000,
        phase: 'Phase 1 - Site Preparation',
        milestone: 'Additional work request',
        description:
          'Payment for additional excavation work required due to unexpected rock formations.',
        status: 'rejected',
        rejectionReason:
          'Additional work was not approved in the original scope. Please submit a change order first.',
        attachments: ['invoice-003.pdf'],
      },
      {
        id: '4',
        requestNumber: 'PR-2024-004',
        requestDate: new Date('2024-02-15'),
        amount: 180000,
        phase: 'Phase 2 - Foundation Work',
        milestone: 'Material procurement',
        description:
          'Payment request for procurement of specialized materials for foundation work.',
        status: 'partially-approved',
        approvedAmount: 150000,
        approvalDate: new Date('2024-02-18'),
        approvedBy: 'Jane Approver',
        attachments: ['invoice-004.pdf', 'material-list.xlsx'],
        comments:
          'Approved R150,000 out of R180,000. Remaining amount pending additional documentation.',
      },
    ];

    this.calculateSummary();
  }

  calculateSummary(): void {
    this.totalRequested = this.requests.reduce((sum, r) => sum + r.amount, 0);
    this.pendingAmount = this.requests
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);
    this.approvedAmount = this.requests
      .filter((r) => r.status === 'approved' || r.status === 'partially-approved')
      .reduce((sum, r) => sum + (r.approvedAmount || r.amount), 0);
    this.rejectedCount = this.requests.filter((r) => r.status === 'rejected').length;
  }

  createRequest(): void {
    // TODO: Open dialog to create new payment request
    console.log('Create payment request');
  }

  viewDetails(request: PaymentRequest): void {
    // TODO: Navigate to detailed view or open dialog
    console.log('View details:', request);
  }

  editRequest(request: PaymentRequest): void {
    // TODO: Open dialog to edit request
    console.log('Edit request:', request);
  }

  withdrawRequest(request: PaymentRequest): void {
    // TODO: Confirm and withdraw request
    console.log('Withdraw request:', request);
  }

  downloadInvoice(request: PaymentRequest): void {
    // TODO: Download invoice PDF
    console.log('Download invoice:', request);
  }

  viewAttachment(attachment: string): void {
    // TODO: Open attachment in new tab or download
    console.log('View attachment:', attachment);
  }
}
