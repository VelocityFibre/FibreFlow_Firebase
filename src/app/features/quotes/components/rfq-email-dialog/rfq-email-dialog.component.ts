import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

import { RFQ } from '../../models/rfq.model';
import { RFQFirebaseEmailService } from '../../services/rfq-firebase-email.service';
import { RFQService } from '../../services/rfq.service';
import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import { BOQService } from '../../../boq/services/boq.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  SupplierStatus,
  VerificationStatus,
} from '../../../../core/suppliers/models/supplier.model';

export interface RFQEmailDialogData {
  rfq: RFQ;
}

@Component({
  selector: 'app-rfq-email-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>email</mat-icon>
      Email RFQ: {{ data.rfq.rfqNumber }}
    </h2>

    <form [formGroup]="emailForm" (ngSubmit)="sendEmail()">
      <mat-dialog-content>
        <div class="email-form">
          <!-- Email Addresses -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email Address(es)</mat-label>
            <input
              matInput
              formControlName="emailAddresses"
              placeholder="Enter email addresses separated by commas"
              [class.error]="
                emailForm.get('emailAddresses')?.invalid && emailForm.get('emailAddresses')?.touched
              "
            />
            <mat-hint>Separate multiple email addresses with commas</mat-hint>
            <mat-error *ngIf="emailForm.get('emailAddresses')?.hasError('required')">
              At least one email address is required
            </mat-error>
            <mat-error *ngIf="emailForm.get('emailAddresses')?.hasError('invalidEmails')">
              One or more email addresses are invalid
            </mat-error>
          </mat-form-field>

          <!-- Email chips display -->
          <div class="email-chips" *ngIf="validEmails.length > 0">
            <mat-chip-listbox>
              <mat-chip *ngFor="let email of validEmails">
                {{ email }}
                <mat-icon matChipRemove (click)="removeEmail(email)">cancel</mat-icon>
              </mat-chip>
            </mat-chip-listbox>
          </div>

          <!-- Subject (read-only preview) -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Subject</mat-label>
            <input matInput [value]="emailSubject" readonly />
          </mat-form-field>

          <!-- Preview Section -->
          <div class="preview-section">
            <h4>
              <mat-icon>preview</mat-icon>
              Email Preview
            </h4>
            <div class="rfq-summary">
              <div class="summary-item">
                <span class="label">Project:</span>
                <span class="value">{{ data.rfq.projectName }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Title:</span>
                <span class="value">{{ data.rfq.title }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Items:</span>
                <span class="value">{{ itemCount }} items</span>
              </div>
              <div class="summary-item">
                <span class="label">Deadline:</span>
                <span class="value">{{ data.rfq.deadline | date: 'mediumDate' }}</span>
              </div>
            </div>
            <p class="email-note">
              <mat-icon>attach_file</mat-icon>
              A detailed PDF with all BOQ items will be attached to the email.
            </p>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="cancel()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          type="submit"
          [disabled]="emailForm.invalid || sending"
        >
          <mat-icon *ngIf="!sending">send</mat-icon>
          <mat-icon *ngIf="sending" class="spinning">refresh</mat-icon>
          {{ sending ? 'Sending...' : 'Send RFQ' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .email-form {
        min-width: 500px;
        padding: 16px 0;
      }

      .full-width {
        width: 100%;
        margin-bottom: 16px;
      }

      .email-chips {
        margin-bottom: 16px;
      }

      .email-chips mat-chip {
        margin: 4px;
      }

      .preview-section {
        background-color: #f5f5f5;
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
      }

      .preview-section h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px 0;
        color: #1976d2;
      }

      .rfq-summary {
        background: white;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #eee;
      }

      .summary-item:last-child {
        border-bottom: none;
      }

      .label {
        font-weight: 500;
        color: #666;
      }

      .value {
        color: #333;
      }

      .email-note {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 14px;
        color: #666;
      }

      .error {
        border-color: #f44336 !important;
      }

      .spinning {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      mat-dialog-content {
        max-height: 70vh;
        overflow-y: auto;
      }

      @media (max-width: 600px) {
        .email-form {
          min-width: 300px;
        }
      }
    `,
  ],
})
export class RFQEmailDialogComponent {
  private fb = inject(FormBuilder);
  private rfqFirebaseEmailService = inject(RFQFirebaseEmailService);
  private rfqService = inject(RFQService);
  private supplierService = inject(SupplierService);
  private boqService = inject(BOQService);
  private notificationService = inject(NotificationService);

  emailForm: FormGroup;
  validEmails: string[] = [];
  sending = false;
  itemCount = 0;

  constructor(
    public dialogRef: MatDialogRef<RFQEmailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RFQEmailDialogData,
  ) {
    this.emailForm = this.fb.group({
      emailAddresses: ['', [Validators.required, this.emailValidator]],
    });

    // Watch for email address changes
    this.emailForm.get('emailAddresses')?.valueChanges.subscribe((value) => {
      this.updateValidEmails(value);
    });

    // Load item count
    this.loadItemCount();
  }

  get emailSubject(): string {
    return `RFQ ${this.data.rfq.rfqNumber} - ${this.data.rfq.title}`;
  }

  private emailValidator = (control: any) => {
    if (!control.value) return null;

    const emails = control.value
      .split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => e);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const invalidEmails = emails.filter((email: string) => !emailRegex.test(email));

    return invalidEmails.length > 0 ? { invalidEmails: true } : null;
  };

  private updateValidEmails(value: string) {
    if (!value) {
      this.validEmails = [];
      return;
    }

    const emails = value
      .split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => e);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    this.validEmails = emails.filter((email: string) => emailRegex.test(email));
  }

  private loadItemCount() {
    if (this.data.rfq.boqItemIds && this.data.rfq.boqItemIds.length > 0) {
      this.itemCount = this.data.rfq.boqItemIds.length;
    }
  }

  removeEmail(email: string) {
    const currentValue = this.emailForm.get('emailAddresses')?.value || '';
    const emails = currentValue
      .split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => e);
    const updatedEmails = emails.filter((e: string) => e !== email);
    this.emailForm.get('emailAddresses')?.setValue(updatedEmails.join(', '));
  }

  sendEmail() {
    if (this.emailForm.invalid || this.validEmails.length === 0) {
      return;
    }

    this.sending = true;

    // Get BOQ items and send email
    this.boqService
      .getBOQItemsByIds(this.data.rfq.boqItemIds)
      .pipe(
        take(1),
        switchMap((items) => {
          // Create temporary suppliers from email addresses
          const tempSuppliers = this.validEmails.map((email, index) => ({
            id: `temp_${index}`,
            companyName: email.split('@')[0], // Use email prefix as company name
            primaryEmail: email,
            primaryPhone: '',
            address: {
              street: '',
              city: '',
              state: '',
              postalCode: '',
              country: 'South Africa',
            },
            categories: [],
            products: [],
            serviceAreas: [],
            paymentTerms: {
              termDays: 30,
              termType: 'NET' as const,
            },
            status: SupplierStatus.ACTIVE,
            verificationStatus: VerificationStatus.UNVERIFIED,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            portalEnabled: false,
          }));

          return this.rfqFirebaseEmailService.sendRFQToSuppliers(
            this.data.rfq,
            tempSuppliers,
            items,
            false, // Don't require confirmation for manual emails
          );
        }),
      )
      .subscribe({
        next: (success) => {
          this.sending = false;
          if (success) {
            this.notificationService.success(
              `RFQ emailed successfully to ${this.validEmails.length} recipient(s)`,
            );
            this.dialogRef.close(true);
          } else {
            this.notificationService.error('Failed to send RFQ email');
          }
        },
        error: (error) => {
          this.sending = false;
          console.error('Error sending RFQ email:', error);
          this.notificationService.error('Failed to send RFQ email');
        },
      });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
