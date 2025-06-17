import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-boq-analytics',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <mat-card class="placeholder-card">
      <mat-card-content>
        <div class="placeholder-content">
          <mat-icon>analytics</mat-icon>
          <h3>BOQ Analytics</h3>
          <p>Material usage analytics and reporting coming soon</p>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .placeholder-card {
        margin: 20px;
        text-align: center;
      }
      .placeholder-content {
        padding: 40px;
      }
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #9e9e9e;
        margin-bottom: 16px;
      }
    `,
  ],
})
export class BOQAnalyticsComponent {
  @Input() projectIdFilter?: string;
}
