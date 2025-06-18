import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface SummaryCard {
  value: string | number;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  progress?: number; // Optional progress bar (0-100)
  subtitle?: string; // Optional subtitle text
}

@Component({
  selector: 'app-summary-cards',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="summary-cards">
      <mat-card *ngFor="let card of cards" class="summary-card">
        <mat-card-content>
          <div class="card-icon" [ngClass]="card.color">
            <mat-icon>{{ card.icon }}</mat-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ card.value }}</div>
            <div class="card-label">{{ card.label }}</div>
            <div class="card-subtitle" *ngIf="card.subtitle">{{ card.subtitle }}</div>
            <mat-progress-bar
              *ngIf="card.progress !== undefined"
              mode="determinate"
              [value]="card.progress"
              [color]="getProgressColor(card.color)"
            ></mat-progress-bar>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .card-subtitle {
        font-size: 12px;
        color: rgb(var(--ff-muted-foreground));
        margin-top: 4px;
      }

      mat-progress-bar {
        margin-top: 8px;
        height: 4px;
        border-radius: 2px;
      }
    `,
  ],
})
export class SummaryCardsComponent {
  @Input() cards: SummaryCard[] = [];

  getProgressColor(cardColor: string): 'primary' | 'accent' | 'warn' {
    switch (cardColor) {
      case 'warning':
      case 'danger':
        return 'warn';
      case 'success':
        return 'accent';
      default:
        return 'primary';
    }
  }
}
