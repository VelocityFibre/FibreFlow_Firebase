import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DailyKpisService } from '../services/daily-kpis.service';
import { ProjectService } from '../../../core/services/project.service';

@Component({
  selector: 'app-test-kpis-display',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div style="padding: 24px;">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Test KPIs Display</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div>
            <h3>Projects:</h3>
            @if (loading) {
              <mat-spinner diameter="30"></mat-spinner>
            } @else {
              <pre>{{ projects | json }}</pre>
            }
          </div>

          <hr />

          <div>
            <h3>KPI Data for louistest:</h3>
            <button mat-raised-button color="primary" (click)="loadKpiData()">Load KPI Data</button>
            @if (kpiLoading) {
              <mat-spinner diameter="30"></mat-spinner>
            } @else if (kpiData) {
              <pre>{{ kpiData | json }}</pre>
            }
          </div>

          <hr />

          <div>
            <h3>Error Messages:</h3>
            <pre>{{ errorMessage }}</pre>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      pre {
        background: #f5f5f5;
        padding: 16px;
        border-radius: 4px;
        overflow: auto;
        max-height: 400px;
      }

      hr {
        margin: 24px 0;
      }
    `,
  ],
})
export class TestKpisDisplayComponent implements OnInit {
  private projectService = inject(ProjectService);
  private kpisService = inject(DailyKpisService);

  projects: any[] = [];
  kpiData: any[] = [];
  loading = true;
  kpiLoading = false;
  errorMessage = '';
  louistestProjectId = '';

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.loading = true;
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;

        // Find louistest project
        const louistest = projects.find((p) => p.name.toLowerCase() === 'louistest');
        if (louistest) {
          this.louistestProjectId = louistest.id || '';
          this.errorMessage += `Found louistest project with ID: ${this.louistestProjectId}\n`;
        } else {
          this.errorMessage += 'Could not find louistest project\n';
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage += `Error loading projects: ${error.message}\n`;
        console.error('Error loading projects:', error);
      },
    });
  }

  loadKpiData() {
    if (!this.louistestProjectId) {
      this.errorMessage += 'No project ID available\n';
      return;
    }

    this.kpiLoading = true;
    this.kpisService.getKPIsForProject(this.louistestProjectId, 5).subscribe({
      next: (kpis) => {
        this.kpiData = kpis;
        this.kpiLoading = false;
        this.errorMessage += `Loaded ${kpis.length} KPI entries\n`;
      },
      error: (error) => {
        this.kpiLoading = false;
        this.errorMessage += `Error loading KPIs: ${error.message}\n`;
        console.error('Error loading KPIs:', error);
      },
    });
  }
}
