import { Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { debounceTime } from 'rxjs/operators';

import { EmailLog } from '../../models/email.model';
import { EmailLogService } from '../../services/email-log.service';
import { EmailPreviewDialogComponent } from '../email-preview-dialog/email-preview-dialog.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-email-history',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>
          <mat-icon>history</mat-icon>
          Email History & Audit Trail
        </mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <!-- Filters -->
        <div class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Search</mat-label>
            <input
              matInput
              [formControl]="searchControl"
              placeholder="Search by subject, recipient..."
            />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Type</mat-label>
            <mat-select [formControl]="typeControl">
              <mat-option value="">All Types</mat-option>
              <mat-option value="rfq">RFQ</mat-option>
              <mat-option value="quote">Quote</mat-option>
              <mat-option value="invoice">Invoice</mat-option>
              <mat-option value="general">General</mat-option>
              <mat-option value="test">Test</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select [formControl]="statusControl">
              <mat-option value="">All Statuses</mat-option>
              <mat-option value="draft">Draft</mat-option>
              <mat-option value="pending_confirmation">Pending Confirmation</mat-option>
              <mat-option value="queued">Queued</mat-option>
              <mat-option value="sending">Sending</mat-option>
              <mat-option value="sent">Sent</mat-option>
              <mat-option value="failed">Failed</mat-option>
              <mat-option value="cancelled">Cancelled</mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-button (click)="clearFilters()">
            <mat-icon>clear</mat-icon>
            Clear Filters
          </button>
        </div>

        <!-- Email Table -->
        <div class="table-container">
          <table mat-table [dataSource]="dataSource" matSort>
            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let email">
                <mat-chip [class]="'status-' + email.status">
                  <mat-icon>{{ getStatusIcon(email.status) }}</mat-icon>
                  {{ email.status ? (email.status | titlecase) : 'Unknown' }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Type Column -->
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
              <td mat-cell *matCellDef="let email">
                <span class="email-type">{{ email.type ? (email.type | uppercase) : 'N/A' }}</span>
              </td>
            </ng-container>

            <!-- Subject Column -->
            <ng-container matColumnDef="subject">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Subject</th>
              <td mat-cell *matCellDef="let email">
                <div class="subject-cell">
                  <span class="subject">{{ email.subject || 'No subject' }}</span>
                  @if (email.attachments && email.attachments.length > 0) {
                    <mat-icon
                      class="attachment-icon"
                      matTooltip="{{ email.attachments.length }} attachments"
                    >
                      attach_file
                    </mat-icon>
                  }
                </div>
              </td>
            </ng-container>

            <!-- Recipients Column -->
            <ng-container matColumnDef="recipients">
              <th mat-header-cell *matHeaderCellDef>Recipients</th>
              <td mat-cell *matCellDef="let email">
                <div class="recipients-cell">
                  <span>{{ email.to && email.to.length > 0 ? email.to[0] : 'No recipients' }}</span>
                  @if (email.to && email.to.length > 1) {
                    <span class="more-recipients">+{{ email.to.length - 1 }} more</span>
                  }
                </div>
              </td>
            </ng-container>

            <!-- From Column -->
            <ng-container matColumnDef="from">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>From</th>
              <td mat-cell *matCellDef="let email">
                <div class="from-cell">
                  <span>{{ email.fromName || 'Unknown' }}</span>
                  <span class="email-address">{{ email.from || 'No email' }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Date Column -->
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
              <td mat-cell *matCellDef="let email">
                <div class="date-cell">
                  <span>{{ getRelevantDate(email) ? (getRelevantDate(email) | date: 'short') : 'No date' }}</span>
                  @if (email.resendCount) {
                    <mat-chip class="resend-chip">
                      <mat-icon>replay</mat-icon>
                      Resent {{ email.resendCount }}x
                    </mat-chip>
                  }
                </div>
              </td>
            </ng-container>

            <!-- Created By Column -->
            <ng-container matColumnDef="createdBy">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Created By</th>
              <td mat-cell *matCellDef="let email">
                {{ email.createdByName || 'Unknown' }}
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let email">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="viewEmail(email)">
                    <mat-icon>visibility</mat-icon>
                    <span>View Details</span>
                  </button>

                  @if (email.status === 'draft' || email.status === 'pending_confirmation') {
                    <button mat-menu-item (click)="editAndSend(email)">
                      <mat-icon>edit</mat-icon>
                      <span>Edit & Send</span>
                    </button>
                  }

                  @if (email.status === 'sent' || email.status === 'failed') {
                    <button mat-menu-item (click)="resendEmail(email)">
                      <mat-icon>send</mat-icon>
                      <span>Resend</span>
                    </button>
                  }

                  @if (email.status === 'draft' || email.status === 'pending_confirmation') {
                    <button mat-menu-item (click)="cancelEmail(email)">
                      <mat-icon>cancel</mat-icon>
                      <span>Cancel</span>
                    </button>
                  }

                  @if (email.relatedId) {
                    <button mat-menu-item (click)="viewRelatedDocument(email)">
                      <mat-icon>link</mat-icon>
                      <span>View {{ email.relatedType || 'Related' }}</span>
                    </button>
                  }
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns"
              [class.failed-row]="row.status === 'failed'"
              (click)="viewEmail(row)"
            ></tr>
          </table>

          <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" showFirstLastButtons></mat-paginator>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .filters {
        display: flex;
        gap: 16px;
        align-items: center;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .filters mat-form-field {
        flex: 1;
        min-width: 200px;
      }

      .table-container {
        overflow-x: auto;
      }

      table {
        width: 100%;
      }

      .status-draft {
        background: var(--mat-sys-surface-variant);
      }
      .status-pending_confirmation {
        background: #fff3cd;
        color: #856404;
      }
      .status-queued {
        background: #d1ecf1;
        color: #0c5460;
      }
      .status-sending {
        background: #d4edda;
        color: #155724;
      }
      .status-sent {
        background: #d4edda;
        color: #155724;
      }
      .status-failed {
        background: #f8d7da;
        color: #721c24;
      }
      .status-cancelled {
        background: var(--mat-sys-surface-variant);
      }

      .email-type {
        font-weight: 500;
        font-size: 12px;
        color: var(--mat-sys-primary);
      }

      .subject-cell {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .subject {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 300px;
      }

      .attachment-icon {
        font-size: 18px;
        opacity: 0.6;
      }

      .recipients-cell {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .more-recipients {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        background: var(--mat-sys-surface-variant);
        padding: 2px 8px;
        border-radius: 12px;
      }

      .from-cell {
        display: flex;
        flex-direction: column;
      }

      .email-address {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }

      .date-cell {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .resend-chip {
        min-height: 24px;
        font-size: 11px;
      }

      mat-row {
        cursor: pointer;
      }

      mat-row:hover {
        background: var(--mat-sys-surface-variant);
      }

      .failed-row {
        background: #fff5f5;
      }

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `,
  ],
})
export class EmailHistoryComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private emailLogService = inject(EmailLogService);
  private notificationService = inject(NotificationService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);

  displayedColumns: string[] = [
    'status',
    'type',
    'subject',
    'recipients',
    'from',
    'date',
    'createdBy',
    'actions',
  ];
  dataSource = new MatTableDataSource<EmailLog>([]);

  searchControl = new FormControl('');
  typeControl = new FormControl('');
  statusControl = new FormControl('');

  ngOnInit() {
    this.loadEmails();
    this.setupFilters();
    
    // Handle query parameters
    this.route.queryParams.subscribe(params => {
      if (params['filter']) {
        this.statusControl.setValue(params['filter']);
      }
      if (params['rfqId']) {
        // Add RFQ ID to search filter
        this.searchControl.setValue(params['rfqId']);
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private setupFilters() {
    // Search filter
    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.dataSource.filter = value?.trim().toLowerCase() || '';
    });

    // Custom filter predicate
    this.dataSource.filterPredicate = (data: EmailLog, filter: string) => {
      const searchStr = filter.toLowerCase();
      return (
        data.subject.toLowerCase().includes(searchStr) ||
        data.to.some((email) => email.toLowerCase().includes(searchStr)) ||
        data.from.toLowerCase().includes(searchStr) ||
        data.fromName.toLowerCase().includes(searchStr)
      );
    };

    // Type and status filters
    this.typeControl.valueChanges.subscribe(() => this.applyFilters());
    this.statusControl.valueChanges.subscribe(() => this.applyFilters());
  }

  private loadEmails() {
    this.emailLogService.getEmailLogs().subscribe((emails) => {
      this.dataSource.data = emails;
      this.applyFilters();
    });
  }

  private applyFilters() {
    let filteredData = [...this.dataSource.data];

    const typeFilter = this.typeControl.value;
    if (typeFilter) {
      filteredData = filteredData.filter((email) => email.type === typeFilter);
    }

    const statusFilter = this.statusControl.value;
    if (statusFilter) {
      filteredData = filteredData.filter((email) => email.status === statusFilter);
    }

    this.dataSource.data = filteredData;
  }

  clearFilters() {
    this.searchControl.setValue('');
    this.typeControl.setValue('');
    this.statusControl.setValue('');
    this.loadEmails();
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      draft: 'drafts',
      pending_confirmation: 'hourglass_empty',
      queued: 'schedule',
      sending: 'send',
      sent: 'check_circle',
      failed: 'error',
      cancelled: 'cancel',
    };
    return icons[status] || 'email';
  }

  getRelevantDate(email: EmailLog): Date | null {
    if (email.deliveredAt) return email.deliveredAt;
    if (email.sentAt) return email.sentAt;
    if (email.failedAt) return email.failedAt;
    if (email.createdAt) return email.createdAt;
    return null;
  }

  viewEmail(email: EmailLog) {
    this.dialog.open(EmailPreviewDialogComponent, {
      width: '800px',
      data: { email, canEdit: false },
    });
  }

  editAndSend(email: EmailLog) {
    const dialogRef = this.dialog.open(EmailPreviewDialogComponent, {
      width: '800px',
      data: { email, canEdit: true },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.action === 'send') {
        // Update email with changes
        await this.emailLogService.updateEmailStatus(email.id!, {
          ...result.updates,
          status: 'queued',
        });

        // Send email
        await this.emailLogService.sendEmail({ ...email, ...result.updates });
        this.notificationService.success('Email sent successfully');
        this.loadEmails();
      } else if (result?.action === 'save') {
        // Save changes
        await this.emailLogService.updateEmailStatus(email.id!, result.updates);
        this.notificationService.success('Changes saved');
        this.loadEmails();
      }
    });
  }

  async resendEmail(email: EmailLog) {
    try {
      const newEmailId = await this.emailLogService.resendEmail(email.id!);
      this.notificationService.success('Email prepared for resending');

      // Open preview for the new email
      const newEmail = await this.emailLogService.getEmailLog(newEmailId).toPromise();
      if (newEmail) {
        this.editAndSend(newEmail);
      }
    } catch (error) {
      this.notificationService.error('Failed to resend email');
    }
  }

  async cancelEmail(email: EmailLog) {
    if (confirm('Are you sure you want to cancel this email?')) {
      await this.emailLogService.cancelEmail(email.id!);
      this.notificationService.success('Email cancelled');
      this.loadEmails();
    }
  }

  viewRelatedDocument(email: EmailLog) {
    // Navigate to related document based on type
    console.log('View related:', email.relatedType, email.relatedId);
  }
}
