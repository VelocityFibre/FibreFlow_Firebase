import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { DailyProgressListComponent } from '../../../daily-progress/components/daily-progress-list/daily-progress-list.component';
import { DailyKpisEnhancedFormComponent } from '../../../daily-progress/components/daily-kpis-enhanced-form/daily-kpis-enhanced-form.component';
import { DailyKpisSummaryComponent } from '../../../daily-progress/components/daily-kpis-summary/daily-kpis-summary.component';

@Component({
  selector: 'app-contractor-daily-progress',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatDividerModule,
    DailyProgressListComponent,
    DailyKpisEnhancedFormComponent,
    DailyKpisSummaryComponent,
  ],
  template: `
    <div class="contractor-daily-progress-container">
      <!-- Header Section -->
      <mat-card class="header-card">
        <mat-card-content>
          <div class="header-content">
            <div class="title-section">
              <h1 class="page-title">Contractor Daily Progress Reports</h1>
              <p class="subtitle">
                Submit and manage daily progress reports for your assigned projects. Track work
                completed, materials used, and any issues encountered on site.
              </p>
            </div>
            <div class="action-section">
              <button
                mat-raised-button
                color="primary"
                (click)="navigateToNewProgress()"
                class="new-report-button"
              >
                <mat-icon>add</mat-icon>
                New Progress Report
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Information Card -->
      <mat-card class="info-card">
        <mat-card-content>
          <div class="info-grid">
            <div class="info-item">
              <mat-icon color="primary">assignment</mat-icon>
              <div class="info-text">
                <h3>Daily Reporting</h3>
                <p>Submit progress reports daily to keep project managers updated on work status</p>
              </div>
            </div>
            <div class="info-item">
              <mat-icon color="primary">photo_camera</mat-icon>
              <div class="info-text">
                <h3>Photo Documentation</h3>
                <p>Include photos of completed work for verification and quality assurance</p>
              </div>
            </div>
            <div class="info-item">
              <mat-icon color="primary">inventory_2</mat-icon>
              <div class="info-text">
                <h3>Material Tracking</h3>
                <p>Record materials used to maintain accurate inventory and cost tracking</p>
              </div>
            </div>
            <div class="info-item">
              <mat-icon color="primary">analytics</mat-icon>
              <div class="info-text">
                <h3>KPI Monitoring</h3>
                <p>Track key performance indicators to measure productivity and efficiency</p>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabs Section -->
      <mat-card class="content-card">
        <mat-card-content>
          <mat-tab-group animationDuration="0ms" class="progress-tabs">
            <mat-tab label="Progress Reports">
              <div class="tab-content">
                <app-daily-progress-list></app-daily-progress-list>
              </div>
            </mat-tab>
            <mat-tab label="Daily KPIs">
              <div class="tab-content">
                <app-daily-kpis-enhanced-form></app-daily-kpis-enhanced-form>
              </div>
            </mat-tab>
            <mat-tab label="KPI Dashboard">
              <div class="tab-content">
                <app-daily-kpis-summary></app-daily-kpis-summary>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .contractor-daily-progress-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header-card,
      .info-card,
      .content-card {
        margin-bottom: 24px;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 24px;
      }

      .title-section {
        flex: 1;
      }

      .page-title {
        margin: 0;
        font-size: 28px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.87);
      }

      .subtitle {
        margin: 8px 0 0 0;
        font-size: 16px;
        color: rgba(0, 0, 0, 0.6);
        line-height: 1.5;
      }

      .new-report-button {
        height: 48px;
        padding: 0 24px;
        font-size: 16px;
      }

      .new-report-button mat-icon {
        margin-right: 8px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 24px;
        padding: 8px 0;
      }

      .info-item {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }

      .info-item mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        margin-top: 4px;
      }

      .info-text h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.87);
      }

      .info-text p {
        margin: 0;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.6);
        line-height: 1.4;
      }

      .progress-tabs {
        margin: -16px;
      }

      .tab-content {
        padding: 24px 0;
        min-height: 600px;
      }

      ::ng-deep .progress-tabs .mat-mdc-tab-labels {
        padding: 0 16px;
      }

      ::ng-deep .progress-tabs .mat-mdc-tab-label {
        font-size: 16px;
        font-weight: 500;
      }

      @media (max-width: 768px) {
        .contractor-daily-progress-container {
          padding: 16px;
        }

        .header-content {
          flex-direction: column;
          align-items: flex-start;
        }

        .action-section {
          width: 100%;
        }

        .new-report-button {
          width: 100%;
        }

        .info-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }
      }
    `,
  ],
})
export class ContractorDailyProgressComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Any initialization logic can go here
  }

  navigateToNewProgress(): void {
    this.router.navigate(['/daily-progress/new']);
  }
}
