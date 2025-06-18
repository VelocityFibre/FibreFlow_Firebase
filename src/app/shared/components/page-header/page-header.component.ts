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
  styles: [],
})
export class PageHeaderComponent {
  @Input() title!: string;
  @Input() subtitle?: string;
  @Input() actions?: PageHeaderAction[];
}
