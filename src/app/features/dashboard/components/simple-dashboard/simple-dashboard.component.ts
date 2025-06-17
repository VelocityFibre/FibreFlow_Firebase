import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ProjectService } from '../../../../core/services/project.service';

@Component({
  selector: 'app-simple-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p>Welcome to FibreFlow</p>

      <div class="stats-grid">
        <mat-card>
          <mat-card-content>
            <mat-icon color="primary">folder</mat-icon>
            <h3>Total Projects</h3>
            <p class="stat-value">{{ projectCount }}</p>
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
        font-weight: 400;
      }

      h2 {
        margin: 32px 0 16px 0;
        font-size: 24px;
        font-weight: 400;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: minmax(250px, 400px);
        gap: 16px;
        margin: 24px 0;
        justify-content: center;
      }

      mat-card {
        cursor: pointer;
        transition: transform 0.2s;
      }

      mat-card:hover {
        transform: translateY(-2px);
      }

      mat-card-content {
        text-align: center;
        padding: 24px !important;
      }

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }

      h3 {
        margin: 8px 0;
        font-size: 16px;
        font-weight: 500;
      }

      .stat-value {
        margin: 0;
        font-size: 32px;
        font-weight: 300;
      }

      .links-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .links-grid a {
        text-decoration: none;
        color: inherit;
      }

      .links-grid mat-card-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px !important;
      }

      .links-grid mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        margin: 0;
      }
    `,
  ],
})
export class SimpleDashboardComponent implements OnInit {
  private projectService = inject(ProjectService);
  projectCount = 0;

  ngOnInit() {
    // Load project count
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projectCount = projects.length;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.projectCount = 0;
      },
    });
  }
}
