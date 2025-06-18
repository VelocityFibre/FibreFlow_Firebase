import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ProjectService } from '../../../../core/services/project.service';
import { map, startWith, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-simple-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p>Welcome to FibreFlow</p>

      <div class="stats-grid">
        <mat-card>
          <mat-card-content>
            <mat-icon color="primary">folder</mat-icon>
            <h3>Total Projects</h3>
            <p class="stat-value">{{ projectCount$ | async }}</p>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="quick-links">
        <h2>Quick Access</h2>
        <div class="links-grid">
          <a routerLink="/projects" mat-card>
            <mat-card>
              <mat-card-content>
                <mat-icon>folder</mat-icon>
                <span>Projects</span>
              </mat-card-content>
            </mat-card>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      h1 {
        margin: 0 0 8px 0;
        font-size: 32px;
        font-weight: 300;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin: 24px 0;
      }

      mat-card {
        cursor: pointer;
        transition: box-shadow 0.3s ease;
      }

      mat-card:hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }

      mat-card-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 24px;
      }

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 400;
        color: rgba(0, 0, 0, 0.6);
      }

      .stat-value {
        margin: 0;
        font-size: 36px;
        font-weight: 300;
      }

      .quick-links {
        margin-top: 48px;
      }

      .links-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }

      .links-grid a {
        text-decoration: none;
        color: inherit;
      }

      .links-grid mat-card-content {
        flex-direction: row;
        justify-content: flex-start;
        padding: 16px;
      }

      .links-grid mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        margin: 0 12px 0 0;
      }
    `,
  ],
})
export class SimpleDashboardComponent {
  private projectService = inject(ProjectService);

  projectCount$ = this.projectService.getProjects().pipe(
    map((projects) => projects.length),
    startWith(0),
    catchError(() => of(0)),
  );
}
