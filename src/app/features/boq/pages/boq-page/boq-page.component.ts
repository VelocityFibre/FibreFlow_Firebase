import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';

// Import all the tab components
import { BOQListComponent } from '../../components/boq-list/boq-list.component';
import { BOQImportExportComponent } from '../../components/boq-import-export/boq-import-export.component';
import { BOQAllocationsComponent } from '../../components/boq-allocations/boq-allocations.component';
import { BOQQuotesOrdersComponent } from '../../components/boq-quotes-orders/boq-quotes-orders.component';
import { BOQAnalyticsComponent } from '../../components/boq-analytics/boq-analytics.component';
import { BOQTemplatesComponent } from '../../components/boq-templates/boq-templates.component';

@Component({
  selector: 'app-boq-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    BOQListComponent,
    BOQImportExportComponent,
    BOQAllocationsComponent,
    BOQQuotesOrdersComponent,
    BOQAnalyticsComponent,
    BOQTemplatesComponent,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Page Header -->
      <div class="ff-page-header">
        <div class="header-content">
          <h1 class="page-title">Bill of Quantities Management</h1>
          <p class="page-subtitle">Manage project materials, quotes, and allocations</p>
        </div>
      </div>

      <!-- Tab Navigation -->
      <mat-tab-group class="boq-tabs" [(selectedIndex)]="selectedTab">
        <!-- Overview Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>dashboard</mat-icon>
            <span>Overview</span>
          </ng-template>
          <div class="tab-content">
            <app-boq-list [projectIdFilter]="projectIdFilter"></app-boq-list>
          </div>
        </mat-tab>

        <!-- Import/Export Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>import_export</mat-icon>
            <span>Import/Export</span>
          </ng-template>
          <div class="tab-content">
            <app-boq-import-export [projectIdFilter]="projectIdFilter"></app-boq-import-export>
          </div>
        </mat-tab>

        <!-- Allocations Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>link</mat-icon>
            <span>Allocations</span>
            <span class="tab-badge" *ngIf="pendingAllocations > 0">{{ pendingAllocations }}</span>
          </ng-template>
          <div class="tab-content">
            <app-boq-allocations [projectIdFilter]="projectIdFilter"></app-boq-allocations>
          </div>
        </mat-tab>

        <!-- Quotes & Orders Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>request_quote</mat-icon>
            <span>Quotes & Orders</span>
            <span class="tab-badge warning" *ngIf="itemsNeedingQuotes > 0">{{
              itemsNeedingQuotes
            }}</span>
          </ng-template>
          <div class="tab-content">
            <app-boq-quotes-orders [projectIdFilter]="projectIdFilter"></app-boq-quotes-orders>
          </div>
        </mat-tab>

        <!-- Analytics Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>analytics</mat-icon>
            <span>Analytics</span>
          </ng-template>
          <div class="tab-content">
            <app-boq-analytics [projectIdFilter]="projectIdFilter"></app-boq-analytics>
          </div>
        </mat-tab>

        <!-- Templates Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>description</mat-icon>
            <span>Templates</span>
          </ng-template>
          <div class="tab-content">
            <app-boq-templates></app-boq-templates>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .boq-tabs {
        margin-top: 24px;

        ::ng-deep .mat-mdc-tab-label {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 140px;
          padding: 0 24px;

          mat-icon {
            margin-right: 0;
          }
        }

        ::ng-deep .mat-mdc-tab-body-wrapper {
          margin-top: 24px;
        }
      }

      .tab-content {
        padding: 24px 0;
        min-height: 500px;
      }

      .tab-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
        background-color: rgb(var(--ff-primary) / 0.15);
        color: rgb(var(--ff-primary));
        margin-left: 8px;

        &.warning {
          background-color: rgb(var(--ff-warning) / 0.15);
          color: rgb(var(--ff-warning));
        }
      }

      @media (max-width: 768px) {
        .boq-tabs {
          ::ng-deep .mat-mdc-tab-label {
            min-width: unset;
            padding: 0 16px;

            span:not(.tab-badge) {
              display: none;
            }
          }
        }
      }
    `,
  ],
})
export class BOQPageComponent implements OnInit {
  private route = inject(ActivatedRoute);

  selectedTab = 0;
  projectIdFilter: string | undefined = undefined;
  pendingAllocations = 0;
  itemsNeedingQuotes = 0;

  ngOnInit() {
    // Check if coming from a project with filter
    this.route.queryParams.subscribe((params) => {
      if (params['projectId']) {
        this.projectIdFilter = params['projectId'];
      }

      // Set tab based on query parameter
      if (params['tab']) {
        this.selectedTab = this.getTabIndex(params['tab']);
      }
    });

    // TODO: Load badge counts from service
    this.loadBadgeCounts();
  }

  private getTabIndex(tabName: string): number {
    const tabs = [
      'overview',
      'import-export',
      'allocations',
      'quotes-orders',
      'analytics',
      'templates',
    ];
    const index = tabs.indexOf(tabName);
    return index >= 0 ? index : 0;
  }

  private loadBadgeCounts() {
    // TODO: Get actual counts from BOQ service
    // For now, using placeholder values
    this.pendingAllocations = 5;
    this.itemsNeedingQuotes = 12;
  }
}
