import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmailLog } from '../../models/email.model';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface EmailPreviewData {
  email: EmailLog;
  canEdit: boolean;
}

@Component({
  selector: 'app-email-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>email</mat-icon>
      Email Preview & Confirmation
    </h2>

    <mat-dialog-content>
      <form [formGroup]="emailForm">
        <!-- From Field -->
        <div class="form-section">
          <h3>From</h3>
          <div class="from-fields">
            <mat-form-field appearance="outline">
              <mat-label>From Name</mat-label>
              <input matInput formControlName="fromName" [readonly]="!data.canEdit" />
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>From Email</mat-label>
              <input matInput formControlName="from" type="email" [readonly]="!data.canEdit" />
              <mat-icon matSuffix>alternate_email</mat-icon>
            </mat-form-field>
          </div>
        </div>

        <!-- Recipients -->
        <div class="form-section">
          <h3>Recipients</h3>
          <div class="recipients">
            <div class="recipient-group">
              <label>To:</label>
              <mat-chip-set>
                @for (email of email.to; track email) {
                  <mat-chip>{{ email }}</mat-chip>
                }
              </mat-chip-set>
            </div>

            @if (email.cc && email.cc.length > 0) {
              <div class="recipient-group">
                <label>CC:</label>
                <mat-chip-set>
                  @for (email of email.cc; track email) {
                    <mat-chip>{{ email }}</mat-chip>
                  }
                </mat-chip-set>
              </div>
            }
          </div>
        </div>

        <!-- Subject -->
        <div class="form-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Subject</mat-label>
            <input matInput formControlName="subject" [readonly]="!data.canEdit" />
            <mat-icon matSuffix>subject</mat-icon>
          </mat-form-field>
        </div>

        <!-- Email Preview -->
        <div class="form-section">
          <h3>Email Content</h3>
          <div class="email-preview-tabs">
            <button
              mat-button
              [class.active]="previewMode === 'html'"
              (click)="previewMode = 'html'"
              type="button"
            >
              <mat-icon>code</mat-icon> HTML Preview
            </button>
            <button
              mat-button
              [class.active]="previewMode === 'text'"
              (click)="previewMode = 'text'"
              type="button"
            >
              <mat-icon>text_fields</mat-icon> Plain Text
            </button>
          </div>

          <div class="email-content-preview">
            @if (previewMode === 'html') {
              <div class="html-preview" [innerHTML]="sanitizedHtml"></div>
            } @else {
              <pre class="text-preview">{{ email.text }}</pre>
            }
          </div>
        </div>

        <!-- Attachments -->
        @if (email.attachments && email.attachments.length > 0) {
          <div class="form-section">
            <h3>Attachments</h3>
            <div class="attachments">
              @for (attachment of email.attachments; track attachment.filename) {
                <div class="attachment">
                  <mat-icon>attach_file</mat-icon>
                  <span>{{ attachment.filename }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Metadata -->
        <div class="form-section metadata">
          <h3>Details</h3>
          <div class="metadata-grid">
            <div>
              <label>Type:</label>
              <span>{{ email.type | titlecase }}</span>
            </div>
            <div>
              <label>Project:</label>
              <span>{{ email.projectName || 'N/A' }}</span>
            </div>
            <div>
              <label>Created by:</label>
              <span>{{ email.createdByName }}</span>
            </div>
            <div>
              <label>Created at:</label>
              <span>{{ email.createdAt | date: 'medium' }}</span>
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-button (click)="saveDraft()" [disabled]="!emailForm.dirty || !data.canEdit">
        Save Changes
      </button>
      <button mat-raised-button color="primary" (click)="confirmAndSend()" [disabled]="sending">
        @if (sending) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          <ng-container>
            <mat-icon>send</mat-icon>
            Confirm & Send
          </ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        max-width: 800px;
        min-width: 600px;
      }

      .form-section {
        margin-bottom: 24px;
      }

      .form-section h3 {
        margin-bottom: 12px;
        color: var(--mat-sys-primary);
        font-size: 16px;
      }

      .from-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .recipients {
        background: var(--mat-sys-surface-variant);
        padding: 12px;
        border-radius: 8px;
      }

      .recipient-group {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .recipient-group label {
        font-weight: 500;
        min-width: 40px;
      }

      .email-preview-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .email-preview-tabs button {
        opacity: 0.7;
      }

      .email-preview-tabs button.active {
        opacity: 1;
        background: var(--mat-sys-primary-container);
      }

      .email-content-preview {
        border: 1px solid var(--mat-sys-outline);
        border-radius: 8px;
        padding: 16px;
        max-height: 400px;
        overflow-y: auto;
        background: white;
      }

      .html-preview {
        font-family: Arial, sans-serif;
      }

      .text-preview {
        white-space: pre-wrap;
        font-family: monospace;
        margin: 0;
      }

      .attachments {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .attachment {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--mat-sys-surface-variant);
        border-radius: 4px;
      }

      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .metadata-grid label {
        font-weight: 500;
        margin-right: 8px;
      }

      .full-width {
        width: 100%;
      }

      mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }

      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `,
  ],
})
export class EmailPreviewDialogComponent {
  emailForm: FormGroup;
  email: EmailLog;
  previewMode: 'html' | 'text' = 'html';
  sending = false;
  sanitizedHtml: SafeHtml;

  constructor(
    private dialogRef: MatDialogRef<EmailPreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmailPreviewData,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
  ) {
    this.email = data.email;
    this.sanitizedHtml = this.sanitizer.sanitize(1, this.email.html) || '';

    this.emailForm = this.fb.group({
      from: [this.email.from, [Validators.required, Validators.email]],
      fromName: [this.email.fromName, Validators.required],
      subject: [this.email.subject, Validators.required],
    });
  }

  cancel() {
    this.dialogRef.close({ action: 'cancel' });
  }

  saveDraft() {
    const updates = this.emailForm.value;
    this.dialogRef.close({ action: 'save', updates });
  }

  confirmAndSend() {
    if (this.emailForm.valid) {
      this.sending = true;
      const updates = this.emailForm.value;
      this.dialogRef.close({ action: 'send', updates });
    }
  }
}
