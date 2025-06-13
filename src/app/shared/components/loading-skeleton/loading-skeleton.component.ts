import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-container">
      @switch (type) {
        @case ('card') {
          <div class="skeleton-card">
            <div class="skeleton-header">
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-subtitle"></div>
            </div>
            <div class="skeleton-content">
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line skeleton-short"></div>
            </div>
          </div>
        }
        @case ('table') {
          <div class="skeleton-table">
            @for (row of rows; track $index) {
              <div class="skeleton-row">
                @for (col of columns; track $index) {
                  <div class="skeleton-cell">
                    <div class="skeleton-line"></div>
                  </div>
                }
              </div>
            }
          </div>
        }
        @case ('list') {
          <div class="skeleton-list">
            @for (item of items; track $index) {
              <div class="skeleton-list-item">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-list-content">
                  <div class="skeleton-line skeleton-title"></div>
                  <div class="skeleton-line skeleton-subtitle"></div>
                </div>
              </div>
            }
          </div>
        }
        @default {
          <div class="skeleton-line"></div>
        }
      }
    </div>
  `,
  styles: [
    `
      .skeleton-container {
        width: 100%;
      }

      .skeleton-line {
        height: 16px;
        background: linear-gradient(
          90deg,
          var(--mat-sys-surface-variant) 25%,
          var(--mat-sys-surface) 50%,
          var(--mat-sys-surface-variant) 75%
        );
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
        margin-bottom: 12px;

        &.skeleton-title {
          height: 24px;
          width: 60%;
        }

        &.skeleton-subtitle {
          height: 16px;
          width: 40%;
          opacity: 0.7;
        }

        &.skeleton-short {
          width: 30%;
        }
      }

      .skeleton-card {
        background: var(--mat-sys-surface);
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: 8px;
        padding: 24px;
        margin-bottom: 16px;
      }

      .skeleton-header {
        margin-bottom: 20px;
      }

      .skeleton-table {
        background: var(--mat-sys-surface);
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: 8px;
        overflow: hidden;
      }

      .skeleton-row {
        display: flex;
        padding: 16px;
        border-bottom: 1px solid var(--mat-sys-outline-variant);

        &:last-child {
          border-bottom: none;
        }
      }

      .skeleton-cell {
        flex: 1;
        padding: 0 8px;
      }

      .skeleton-list-item {
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 16px;
        border-bottom: 1px solid var(--mat-sys-outline-variant);

        &:last-child {
          border-bottom: none;
        }
      }

      .skeleton-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--mat-sys-surface-variant);
        flex-shrink: 0;
      }

      .skeleton-list-content {
        flex: 1;
      }

      @keyframes loading {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `,
  ],
})
export class LoadingSkeletonComponent {
  @Input() type: 'card' | 'table' | 'list' | 'line' = 'line';
  @Input() count = 1;

  get rows() {
    return Array(5).fill(0);
  }

  get columns() {
    return Array(4).fill(0);
  }

  get items() {
    return Array(this.count).fill(0);
  }
}
