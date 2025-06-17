import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, switchMap, tap } from 'rxjs';

import { Project } from '../../../../core/models/project.model';
import { ProjectService } from '../../../../core/services/project.service';
import { BOQService } from '../../../boq/services/boq.service';
import { BOQItem, BOQSummary } from '../../../boq/models/boq.model';
import { BOQImportDialogComponent } from '../../../boq/components/boq-import-dialog/boq-import-dialog.component';
import { SummaryCardsComponent } from '../../../../shared/components/summary-cards/summary-cards.component';

// Import child components
import { BOQItemsTabComponent } from '../../components/tabs/boq-items-tab/boq-items-tab.component';
import { BOQAllocationsTabComponent } from '../../components/tabs/boq-allocations-tab/boq-allocations-tab.component';
import { BOQQuotesOrdersTabComponent } from '../../components/tabs/boq-quotes-orders-tab/boq-quotes-orders-tab.component';
import { BOQAnalyticsTabComponent } from '../../components/tabs/boq-analytics-tab/boq-analytics-tab.component';
import { BOQTemplatesTabComponent } from '../../components/tabs/boq-templates-tab/boq-templates-tab.component';

@Component({
  selector: 'app-project-boq-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule,
    SummaryCardsComponent,
    BOQItemsTabComponent,
    BOQAllocationsTabComponent,
    BOQQuotesOrdersTabComponent,
    BOQAnalyticsTabComponent,
    BOQTemplatesTabComponent,
  ],
  template: `
    <div class="boq-management-container" *ngIf="project$ | async as project">
      <!-- Header -->
      <div class="boq-header">
        <div class="header-content">
          <button mat-icon-button (click)="navigateBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="header-info">
            <h1>BOQ Management</h1>
            <p class="project-name">{{ project.name }}</p>
            <p class="project-code">{{ project.projectCode }}</p>
          </div>
          <div class="header-actions">
            <button mat-button (click)="exportBOQ()">
              <mat-icon>download</mat-icon>
              Export
            </button>
            <button mat-raised-button color="primary" (click)="openImportDialog()">
              <mat-icon>upload</mat-icon>
              Import BOQ
            </button>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-section" *ngIf="boqSummary$ | async as summary">
        <app-summary-cards
          [cards]="[
            {
              label: 'Total Items',
              value: summary?.totalItems || 0,
              icon: 'inventory_2',
              color: 'primary',
            },
            {
              label: 'Total Value',
              value: 'R' + (summary?.totalValue || 0 | number: '1.0-0'),
              icon: 'attach_money',
              color: 'success',
            },
            {
              label: 'Allocated Value',
              value: 'R' + (summary?.allocatedValue || 0 | number: '1.0-0'),
              icon: 'check_circle',
              color: 'info',
            },
            {
              label: 'Items Needing Quotes',
              value: summary?.itemsNeedingQuotes || 0,
              icon: 'request_quote',
              color: 'warning',
            },
          ]"
        ></app-summary-cards>
      </div>

      <!-- Tabs -->
      <mat-tab-group class="boq-tabs" [(selectedIndex)]="selectedTabIndex">
        <!-- BOQ Items Tab -->
        <mat-tab label="BOQ Items">
          <ng-template matTabContent>
            <app-boq-items-tab
              [projectId]="projectId"
              [project]="project"
              (refreshRequired)="refreshData()"
            >
            </app-boq-items-tab>
          </ng-template>
        </mat-tab>

        <!-- Allocations Tab -->
        <mat-tab label="Stock Allocations">
          <ng-template matTabContent>
            <app-boq-allocations-tab [projectId]="projectId" [project]="project">
            </app-boq-allocations-tab>
          </ng-template>
        </mat-tab>

        <!-- Quotes & Orders Tab -->
        <mat-tab label="Quotes & Orders">
          <ng-template matTabContent>
            <app-boq-quotes-orders-tab [projectId]="projectId" [project]="project">
            </app-boq-quotes-orders-tab>
          </ng-template>
        </mat-tab>

        <!-- Analytics Tab -->
        <mat-tab label="Analytics">
          <ng-template matTabContent>
            <app-boq-analytics-tab [projectId]="projectId" [project]="project">
            </app-boq-analytics-tab>
          </ng-template>
        </mat-tab>

        <!-- Templates Tab -->
        <mat-tab label="Templates">
          <ng-template matTabContent>
            <app-boq-templates-tab [projectId]="projectId" [project]="project">
            </app-boq-templates-tab>
          </ng-template>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Loading State -->
    <div class="loading-container" *ngIf="!(project$ | async)">
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      <p>Loading BOQ data...</p>
    </div>
  `,
  styles: [
    `
      .boq-management-container {
        padding: 24px;
        max-width: 1600px;
        margin: 0 auto;
      }

      .boq-header {
        margin: -24px -24px 32px;
        padding: 24px 32px;
        background: rgb(var(--ff-card));
        border-bottom: 1px solid rgb(var(--ff-border));
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .back-button {
        margin-right: 8px;
      }

      .header-info {
        flex: 1;

        h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 500;
          color: rgb(var(--ff-foreground));
        }

        .project-name {
          margin: 4px 0 0;
          font-size: 16px;
          color: rgb(var(--ff-foreground));
          font-weight: 500;
        }

        .project-code {
          margin: 2px 0 0;
          font-size: 14px;
          color: rgb(var(--ff-muted-foreground));
        }
      }

      .header-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .summary-section {
        margin-bottom: 32px;
      }

      .boq-tabs {
        background: rgb(var(--ff-card));
        border-radius: 12px;
        padding: 0;

        ::ng-deep {
          .mat-mdc-tab-label {
            font-size: 15px;
            font-weight: 500;
            min-width: 140px;
          }

          .mat-mdc-tab-header {
            border-bottom: 1px solid rgb(var(--ff-border));
          }

          .mat-mdc-tab-body-wrapper {
            padding: 24px;
          }
        }
      }

      .loading-container {
        padding: 64px;
        text-align: center;

        p {
          margin-top: 16px;
          color: rgb(var(--ff-muted-foreground));
          font-size: 16px;
        }
      }

      @media (max-width: 768px) {
        .boq-management-container {
          padding: 16px;
        }

        .boq-header {
          margin: -16px -16px 24px;
          padding: 16px;
        }

        .header-content {
          flex-wrap: wrap;
        }

        .header-actions {
          width: 100%;
          margin-top: 16px;
          justify-content: flex-end;
        }
      }
    `,
  ],
})
export class ProjectBOQPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private boqService = inject(BOQService);
  private dialog = inject(MatDialog);

  projectId!: string;
  project$!: Observable<Project | undefined>;
  boqSummary$!: Observable<BOQSummary | null>;
  selectedTabIndex = 0;

  ngOnInit() {
    // Get project ID from route
    this.projectId = this.route.snapshot.params['projectId'];
    if (!this.projectId) {
      this.router.navigate(['/projects']);
      return;
    }

    this.loadData();
  }

  private loadData(): void {
    this.project$ = this.projectService.getProjectById(this.projectId).pipe(
      tap((project) => {
        if (!project) {
          this.router.navigate(['/projects']);
        }
      }),
    );

    this.boqSummary$ = this.boqService.getProjectSummary(this.projectId);
  }

  refreshData(): void {
    this.loadData();
  }

  navigateBack(): void {
    this.router.navigate(['/projects', this.projectId]);
  }

  openImportDialog(): void {
    this.project$.subscribe((project) => {
      if (project) {
        const dialogRef = this.dialog.open(BOQImportDialogComponent, {
          width: '800px',
          data: {
            projects: [project],
            selectedProjectId: this.projectId,
          },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            this.refreshData();
          }
        });
      }
    });
  }

  exportBOQ(): void {
    // TODO: Implement BOQ export functionality
    console.log('Export BOQ for project:', this.projectId);
  }
}
