import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PageHeaderAction {
  label: string;
  icon?: string;
  color?: 'primary' | 'accent' | 'warn';
  variant?: 'raised' | 'stroked' | 'flat' | 'icon';
  disabled?: boolean;
  action: () => void;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ff-page-header">
      <div class="header-content">
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="header-actions" *ngIf="actions && actions.length > 0">
        <button
          *ngFor="let action of actions"
          mat-raised-button
          [color]="action.color || 'primary'"
          [disabled]="action.disabled"
          (click)="action.action()"
        >
          <mat-icon *ngIf="action.icon">{{ action.icon }}</mat-icon>
          {{ action.label }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/component-theming' as theme;

    .ff-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 48px;

      .header-content {
        flex: 1;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;

        button {
          color: theme.ff-rgb(muted-foreground);

          &:hover {
            color: theme.ff-rgb(foreground);
          }
        }
      }

      .page-title {
        font-size: 32px;
        font-weight: 300;
        color: theme.ff-rgb(foreground);
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
      }

      .page-subtitle {
        font-size: 18px;
        color: theme.ff-rgb(muted-foreground);
        font-weight: 400;
        margin: 0;
      }
    }

    // Responsive adjustments
    @media (max-width: 768px) {
      .ff-page-header {
        flex-direction: column;
        align-items: flex-start;

        .page-title {
          font-size: 28px;
        }

        .page-subtitle {
          font-size: 16px;
        }
      }
    }
  `],
})
export class PageHeaderComponent {
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() actions?: PageHeaderAction[];
}
