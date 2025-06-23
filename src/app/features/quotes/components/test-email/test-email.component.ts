import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TestEmailService } from '../../services/test-email.service';

@Component({
  selector: 'app-test-email',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Test Firebase Email Extension</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>
          Click the button below to send a test email to: <strong>louisrdup&#64;gmail.com</strong>
        </p>
        <p class="text-muted">
          This will verify that the Firebase Email Extension is working correctly.
        </p>
      </mat-card-content>
      <mat-card-actions>
        <button mat-raised-button color="primary" (click)="sendTestEmail()" [disabled]="sending">
          @if (sending) {
            <mat-spinner
              diameter="20"
              style="display: inline-block; margin-right: 8px;"
            ></mat-spinner>
          }
          {{ sending ? 'Sending...' : 'Send Test Email' }}
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      mat-card {
        max-width: 600px;
        margin: 20px;
      }
      .text-muted {
        color: #666;
        font-size: 14px;
      }
    `,
  ],
})
export class TestEmailComponent {
  sending = false;

  constructor(private testEmailService: TestEmailService) {}

  async sendTestEmail() {
    this.sending = true;
    try {
      await this.testEmailService.sendTestEmail();
    } catch (error) {
      console.error('Error sending test email:', error);
    } finally {
      this.sending = false;
    }
  }
}
