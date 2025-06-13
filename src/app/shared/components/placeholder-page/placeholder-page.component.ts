import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="placeholder-container">
      <mat-card class="placeholder-card">
        <mat-card-content>
          <div class="placeholder-content">
            <mat-icon class="placeholder-icon">construction</mat-icon>
            <h1 class="placeholder-title">{{ title }}</h1>
            <p class="placeholder-message">
              This page is under construction and will be available soon.
            </p>
            <button mat-raised-button color="primary" (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Go Back
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .placeholder-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: calc(100vh - 200px);
        padding: 24px;
      }

      .placeholder-card {
        max-width: 600px;
        width: 100%;
        text-align: center;
      }

      .placeholder-content {
        padding: 48px 24px;
      }

      .placeholder-icon {
        font-size: 72px;
        height: 72px;
        width: 72px;
        color: var(--mat-sys-primary);
        margin: 0 auto 24px;
      }

      .placeholder-title {
        font-size: 32px;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--mat-sys-on-surface);
      }

      .placeholder-message {
        font-size: 16px;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 32px;
      }

      button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
    `,
  ],
})
export class PlaceholderPageComponent implements OnInit {
  title: string = 'Page';

  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.data.subscribe((data) => {
      this.title = data['title'] || 'Page';
    });
  }

  goBack() {
    window.history.back();
  }
}
