import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="client-detail-container">
      <div class="detail-header">
        <h1 class="detail-title">Client Details</h1>
        <p class="detail-subtitle">View and manage client information</p>
      </div>

      <mat-card>
        <mat-card-content>
          <p>Client detail component - Coming soon!</p>
          <p>This will show detailed client information and project history.</p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-stroked-button routerLink="/clients">
            <mat-icon>arrow_back</mat-icon>
            Back to Clients
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .client-detail-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .detail-header {
      margin-bottom: 32px;
    }

    .detail-title {
      font-size: 32px;
      font-weight: 500;
      margin: 0;
      color: var(--mat-sys-on-surface);
    }

    .detail-subtitle {
      color: var(--mat-sys-on-surface-variant);
      margin-top: 4px;
    }
  `]
})
export class ClientDetailComponent {}