import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmailTemplateService } from '../../services/email-template.service';
import {
  EmailTemplate,
  EmailTemplateType,
  RFQ_TEMPLATE_VARIABLES,
} from '../../models/email-template.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-email-templates',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    MatTabsModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="email-templates-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Email Templates</mat-card-title>
          <mat-card-subtitle
            >Customize email templates for RFQs and other communications</mat-card-subtitle
          >
        </mat-card-header>

        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="RFQ Template">
              <div class="tab-content">
                <form [formGroup]="rfqTemplateForm" (ngSubmit)="onSubmit()">
                  <!-- Template Name -->
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Template Name</mat-label>
                    <input matInput formControlName="name" required />
                  </mat-form-field>

                  <!-- Subject Line -->
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Email Subject</mat-label>
                    <input matInput formControlName="subject" required />
                    <mat-hint
                      >You can use variables like {{'{{rfqNumber}}'}},
                      {{'{{projectName}}'}}</mat-hint
                    >
                  </mat-form-field>

                  <!-- Email Body -->
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Email Body</mat-label>
                    <textarea
                      matInput
                      formControlName="body"
                      rows="20"
                      required
                      placeholder="Enter your email template here..."
                    ></textarea>
                  </mat-form-field>

                  <!-- Available Variables -->
                  <div class="variables-section">
                    <h4>Available Variables</h4>
                    <p class="hint-text">
                      Click on any variable to copy it. These will be replaced with actual values
                      when sending emails.
                    </p>
                    <div class="variables-grid">
                      <mat-chip-listbox>
                        <mat-chip-option
                          *ngFor="let variable of templateVariables"
                          (click)="copyVariable(variable.key)"
                          [matTooltip]="variable.description + ' - Example: ' + variable.example"
                        >
                          <mat-icon matChipAvatar>code</mat-icon>
                          {{ variable.key }}
                        </mat-chip-option>
                      </mat-chip-listbox>
                    </div>
                  </div>

                  <mat-divider></mat-divider>

                  <!-- Preview Section -->
                  <div class="preview-section">
                    <h4>
                      Preview
                      <button
                        mat-icon-button
                        type="button"
                        (click)="togglePreview()"
                        matTooltip="Toggle preview"
                      >
                        <mat-icon>{{ showPreview ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                    </h4>
                    <div *ngIf="showPreview" class="preview-content">
                      <div class="preview-subject">
                        <strong>Subject:</strong> {{ getPreviewSubject() }}
                      </div>
                      <div class="preview-body" [innerHTML]="getPreviewBody()"></div>
                    </div>
                  </div>

                  <!-- Form Actions -->
                  <div class="form-actions">
                    <button mat-button type="button" (click)="resetForm()" [disabled]="isLoading">
                      Reset
                    </button>
                    <button
                      mat-raised-button
                      color="primary"
                      type="submit"
                      [disabled]="!rfqTemplateForm.valid || isLoading"
                    >
                      <mat-icon *ngIf="!isLoading">save</mat-icon>
                      <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
                      {{ isLoading ? 'Saving...' : 'Save Template' }}
                    </button>
                  </div>
                </form>
              </div>
            </mat-tab>

            <mat-tab label="Other Templates" disabled>
              <div class="tab-content">
                <p>Additional email templates will be available here in the future.</p>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .email-templates-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .tab-content {
        padding: 24px 0;
      }

      .full-width {
        width: 100%;
      }

      mat-form-field {
        margin-bottom: 16px;
      }

      textarea {
        font-family: 'Courier New', monospace;
        line-height: 1.5;
      }

      .variables-section {
        margin: 24px 0;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }

      .variables-section h4 {
        margin-top: 0;
        color: rgba(0, 0, 0, 0.87);
      }

      .hint-text {
        color: rgba(0, 0, 0, 0.6);
        font-size: 14px;
        margin-bottom: 16px;
      }

      .variables-grid {
        margin-top: 8px;
      }

      mat-chip-option {
        cursor: pointer;
        margin: 4px;
      }

      mat-chip-option:hover {
        background-color: #e0e0e0;
      }

      .preview-section {
        margin: 24px 0;
        padding: 16px;
        background-color: #fafafa;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }

      .preview-section h4 {
        margin-top: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .preview-content {
        margin-top: 16px;
        padding: 16px;
        background-color: white;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
      }

      .preview-subject {
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e0e0e0;
      }

      .preview-body {
        white-space: pre-wrap;
        line-height: 1.6;
      }

      mat-divider {
        margin: 24px 0;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        margin-top: 24px;
      }

      mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }
    `,
  ],
})
export class EmailTemplatesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private emailTemplateService = inject(EmailTemplateService);
  private notificationService = inject(NotificationService);

  rfqTemplateForm!: FormGroup;
  isLoading = false;
  showPreview = true;
  templateVariables = RFQ_TEMPLATE_VARIABLES;
  currentTemplate?: EmailTemplate;

  ngOnInit() {
    this.initializeForm();
    this.loadRfqTemplate();
  }

  initializeForm() {
    this.rfqTemplateForm = this.fb.group({
      name: ['', Validators.required],
      subject: ['', Validators.required],
      body: ['', Validators.required],
    });
  }

  loadRfqTemplate() {
    this.isLoading = true;
    this.emailTemplateService.getTemplateByType(EmailTemplateType.RFQ).subscribe({
      next: (template) => {
        if (template) {
          this.currentTemplate = template;
          this.rfqTemplateForm.patchValue({
            name: template.name,
            subject: template.subject,
            body: template.body,
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading RFQ template:', error);
        this.notificationService.error('Failed to load email template');
        this.isLoading = false;
      },
    });
  }

  async onSubmit() {
    if (this.rfqTemplateForm.valid) {
      this.isLoading = true;
      try {
        const templateData: Partial<EmailTemplate> = {
          ...this.rfqTemplateForm.value,
          id: this.currentTemplate?.id,
          type: EmailTemplateType.RFQ,
          variables: this.templateVariables,
          isActive: true,
        };

        await this.emailTemplateService.saveTemplate(templateData);
        this.notificationService.success('Email template saved successfully');
      } catch (error) {
        console.error('Error saving email template:', error);
        this.notificationService.error('Failed to save email template');
      } finally {
        this.isLoading = false;
      }
    }
  }

  resetForm() {
    this.loadRfqTemplate();
  }

  copyVariable(variable: string) {
    navigator.clipboard
      .writeText(variable)
      .then(() => {
        this.notificationService.success(`Copied ${variable} to clipboard`);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
      });
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
  }

  getPreviewSubject(): string {
    const subject = this.rfqTemplateForm.get('subject')?.value || '';
    return this.replaceVariables(subject);
  }

  getPreviewBody(): string {
    const body = this.rfqTemplateForm.get('body')?.value || '';
    const htmlBody = body.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return this.replaceVariables(htmlBody);
  }

  private replaceVariables(text: string): string {
    let result = text;
    this.templateVariables.forEach((variable) => {
      result = result.replace(
        new RegExp(variable.key.replace(/[{}]/g, '\\$&'), 'g'),
        `<span style="background-color: #e3f2fd; padding: 2px 4px; border-radius: 3px;">${variable.example}</span>`,
      );
    });
    return result;
  }
}
