import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, takeUntil } from 'rxjs';
import { RFQFirebaseEmailImprovedService } from '../../../quotes/services/rfq-firebase-email-improved.service';

@Component({
  selector: 'app-email-delivery-status',
  standalone: true,
  imports: [CommonModule, MatProgressBarModule, MatIconModule, MatChipsModule],
  template: `
    <div class="delivery-status" *ngIf="status">
      <div class="status-header">
        <mat-icon [class.spin]="status.status === 'sending'">
          {{ getStatusIcon() }}
        </mat-icon>
        <span class="status-text">{{ getStatusText() }}</span>
      </div>

      <mat-progress-bar
        *ngIf="status.status === 'sending'"
        mode="determinate"
        [value]="getProgress()"
        [color]="getProgressColor()"
      >
      </mat-progress-bar>

      <div class="status-details" *ngIf="status.totalEmails > 0">
        <mat-chip class="status-chip success" *ngIf="status.sent > 0">
          <mat-icon>check_circle</mat-icon>
          {{ status.sent }} sent
        </mat-chip>
        <mat-chip class="status-chip warning" *ngIf="status.pending > 0">
          <mat-icon>schedule</mat-icon>
          {{ status.pending }} pending
        </mat-chip>
        <mat-chip class="status-chip error" *ngIf="status.failed > 0">
          <mat-icon>error</mat-icon>
          {{ status.failed }} failed
        </mat-chip>
      </div>
    </div>
  `,
  styles: [
    `
      .delivery-status {
        padding: 16px;
        background: var(--mat-sys-surface-variant);
        border-radius: 8px;
        margin: 8px 0;
      }

      .status-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .status-text {
        font-weight: 500;
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      mat-progress-bar {
        margin: 12px 0;
      }

      .status-details {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }

      .status-chip {
        font-size: 12px;
        height: 24px;
      }

      .status-chip mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }

      .status-chip.success {
        background: #d4edda;
        color: #155724;
      }

      .status-chip.warning {
        background: #fff3cd;
        color: #856404;
      }

      .status-chip.error {
        background: #f8d7da;
        color: #721c24;
      }
    `,
  ],
})
export class EmailDeliveryStatusComponent implements OnInit, OnDestroy {
  @Input() rfqId!: string;

  private emailService = inject(RFQFirebaseEmailImprovedService);
  private destroy$ = new Subject<void>();

  status: any = null;

  ngOnInit() {
    if (this.rfqId) {
      this.emailService
        .getDeliveryStatus(this.rfqId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((status) => {
          this.status = status;
        });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatusIcon(): string {
    switch (this.status?.status) {
      case 'idle':
        return 'mail_outline';
      case 'sending':
        return 'sync';
      case 'completed':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'help_outline';
    }
  }

  getStatusText(): string {
    switch (this.status?.status) {
      case 'idle':
        return 'Ready to send';
      case 'sending':
        return `Sending emails... (${this.status.sent}/${this.status.totalEmails})`;
      case 'completed':
        return `Completed - ${this.status.sent} sent, ${this.status.failed} failed`;
      case 'error':
        return 'Send failed';
      default:
        return 'Unknown status';
    }
  }

  getProgress(): number {
    if (!this.status || this.status.totalEmails === 0) return 0;
    return ((this.status.sent + this.status.failed) / this.status.totalEmails) * 100;
  }

  getProgressColor(): string {
    if (this.status?.failed > 0) return 'warn';
    return 'primary';
  }
}
