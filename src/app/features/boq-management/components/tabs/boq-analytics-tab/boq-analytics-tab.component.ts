import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Project } from '../../../../../core/models/project.model';

@Component({
  selector: 'app-boq-analytics-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="analytics-container">
      <mat-card class="coming-soon-card">
        <mat-card-content>
          <mat-icon>analytics</mat-icon>
          <h3>BOQ Analytics</h3>
          <p>Analyze BOQ data, costs, and trends</p>
          <p class="coming-soon">Coming Soon</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .analytics-container {
        padding: 24px 0;
      }

      .coming-soon-card {
        text-align: center;
        padding: 64px 24px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: rgb(var(--ff-muted-foreground));
          margin-bottom: 16px;
        }

        h3 {
          font-size: 24px;
          font-weight: 500;
          margin: 0 0 8px;
          color: rgb(var(--ff-foreground));
        }

        p {
          color: rgb(var(--ff-muted-foreground));
          margin: 0;
        }

        .coming-soon {
          margin-top: 16px;
          font-size: 18px;
          color: rgb(var(--ff-primary));
          font-weight: 500;
        }
      }
    `,
  ],
})
export class BOQAnalyticsTabComponent {
  @Input() projectId!: string;
  @Input() project!: Project;
}
