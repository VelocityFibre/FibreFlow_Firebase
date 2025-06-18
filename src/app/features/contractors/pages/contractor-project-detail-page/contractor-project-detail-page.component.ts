import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, switchMap, map, combineLatest } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { ContractorProjectService } from '../../services/contractor-project.service';
import { ContractorService } from '../../services/contractor.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ContractorProject } from '../../models/contractor-project.model';
import { Contractor } from '../../models/contractor.model';
import { Project } from '../../../../core/models/project.model';

// Tab Components
import { TeamAllocationTabComponent } from '../../components/tabs/team-allocation-tab/team-allocation-tab.component';
import { WorkProgressTabComponent } from '../../components/tabs/work-progress-tab/work-progress-tab.component';
import { MaterialsNeededTabComponent } from '../../components/tabs/materials-needed-tab/materials-needed-tab.component';
import { MaterialsUsedTabComponent } from '../../components/tabs/materials-used-tab/materials-used-tab.component';
import { PaymentRequestedTabComponent } from '../../components/tabs/payment-requested-tab/payment-requested-tab.component';
import { PaymentMadeTabComponent } from '../../components/tabs/payment-made-tab/payment-made-tab.component';

interface ContractorProjectDetail {
  contractorProject: ContractorProject;
  contractor: Contractor | undefined | null;
  project: Project | undefined | null;
}

@Component({
  selector: 'app-contractor-project-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatMenuModule,
    MatDividerModule,
    TeamAllocationTabComponent,
    WorkProgressTabComponent,
    MaterialsNeededTabComponent,
    MaterialsUsedTabComponent,
    PaymentRequestedTabComponent,
    PaymentMadeTabComponent,
  ],
  template: `
    <div
      class="contractor-project-detail-container"
      *ngIf="contractorProjectDetail$ | async as detail"
    >
      <!-- Header -->
      <div class="detail-header">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>

        <div class="header-info">
          <h1>{{ detail.contractor?.companyName }} - {{ detail.project?.name }}</h1>
          <div class="header-meta">
            <span>Contract #{{ detail.contractorProject.contractNumber || 'N/A' }}</span>
            <mat-chip [ngClass]="'status-' + detail.contractorProject.status">
              {{ formatStatus(detail.contractorProject.status) }}
            </mat-chip>
          </div>
        </div>

        <div class="header-actions">
          <button mat-raised-button color="primary" [matMenuTriggerFor]="actionsMenu">
            <mat-icon>more_vert</mat-icon>
            Actions
          </button>
          <mat-menu #actionsMenu="matMenu">
            <button mat-menu-item (click)="updateContractStatus()">
              <mat-icon>update</mat-icon>
              <span>Update Status</span>
            </button>
            <button mat-menu-item (click)="generateReport()">
              <mat-icon>description</mat-icon>
              <span>Generate Report</span>
            </button>
            <button mat-menu-item (click)="viewPerformanceMetrics()">
              <mat-icon>analytics</mat-icon>
              <span>Performance Metrics</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="terminateContract()" class="danger-item">
              <mat-icon>cancel</mat-icon>
              <span>Terminate Contract</span>
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Key Metrics -->
      <div class="metrics-grid">
        <mat-card class="metric-card">
          <mat-card-content>
            <div class="metric-icon progress">
              <mat-icon>donut_large</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ detail.contractorProject.overallProgress }}%</div>
              <div class="metric-label">Overall Progress</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card">
          <mat-card-content>
            <div class="metric-icon teams">
              <mat-icon>groups</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ getActiveTeamsCount(detail.contractorProject) }}</div>
              <div class="metric-label">Active Teams</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card">
          <mat-card-content>
            <div class="metric-icon payment">
              <mat-icon>payments</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">
                R{{ (detail.contractorProject.totalPaymentMade / 1000).toFixed(0) }}K
              </div>
              <div class="metric-label">
                Paid ({{ getPaymentPercentage(detail.contractorProject) }}%)
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card">
          <mat-card-content>
            <div class="metric-icon performance">
              <mat-icon>star</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">
                {{ detail.contractorProject.performance.overallRating.toFixed(1) }}
              </div>
              <div class="metric-label">Performance Rating</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Contract Summary -->
      <mat-card class="contract-summary">
        <mat-card-header>
          <mat-card-title>Contract Summary</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">Contract Value</span>
              <span class="value"
                >R{{ (detail.contractorProject.contractValue / 1000000).toFixed(2) }}M</span
              >
            </div>
            <div class="summary-item">
              <span class="label">Start Date</span>
              <span class="value">{{
                formatDate(detail.contractorProject.expectedStartDate)
              }}</span>
            </div>
            <div class="summary-item">
              <span class="label">End Date</span>
              <span class="value">{{ formatDate(detail.contractorProject.expectedEndDate) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Retention</span>
              <span class="value"
                >{{ detail.contractorProject.retentionPercentage }}% (R{{
                  (detail.contractorProject.retentionAmount / 1000).toFixed(0)
                }}K)</span
              >
            </div>
          </div>

          <div class="scope-section">
            <h4>Scope of Work</h4>
            <div class="scope-chips">
              <mat-chip *ngFor="let scope of detail.contractorProject.scopeOfWork">
                {{ scope }}
              </mat-chip>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabs -->
      <mat-tab-group class="content-tabs">
        <mat-tab label="Team Allocation">
          <app-team-allocation-tab
            [contractorProject]="detail.contractorProject"
          ></app-team-allocation-tab>
        </mat-tab>

        <mat-tab label="Work Progress">
          <app-work-progress-tab
            [contractorProject]="detail.contractorProject"
          ></app-work-progress-tab>
        </mat-tab>

        <mat-tab label="Materials Needed">
          <app-materials-needed-tab
            [contractorProject]="detail.contractorProject"
          ></app-materials-needed-tab>
        </mat-tab>

        <mat-tab label="Materials Used">
          <app-materials-used-tab
            [contractorProject]="detail.contractorProject"
          ></app-materials-used-tab>
        </mat-tab>

        <mat-tab label="Payment Requested">
          <app-payment-requested-tab
            [contractorProject]="detail.contractorProject"
          ></app-payment-requested-tab>
        </mat-tab>

        <mat-tab label="Payment Made">
          <app-payment-made-tab
            [contractorProject]="detail.contractorProject"
          ></app-payment-made-tab>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Loading State -->
    <div class="loading-container" *ngIf="!(contractorProjectDetail$ | async)">
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    </div>
  `,
  styles: [
    `
      .contractor-project-detail-container {
        padding: 24px;
        max-width: 1600px;
        margin: 0 auto;
      }

      .detail-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }

      .back-button {
        flex-shrink: 0;
      }

      .header-info {
        flex: 1;
      }

      .header-info h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 500;
      }

      .header-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 8px;
        font-size: 14px;
        color: #666;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .metric-card {
        position: relative;
        overflow: hidden;
      }

      .metric-card mat-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px;
      }

      .metric-icon {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .metric-icon mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: white;
      }

      .metric-icon.progress {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .metric-icon.teams {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }

      .metric-icon.payment {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      .metric-icon.performance {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      }

      .metric-info {
        flex: 1;
      }

      .metric-value {
        font-size: 28px;
        font-weight: 600;
        line-height: 1;
        margin-bottom: 4px;
      }

      .metric-label {
        font-size: 14px;
        color: #666;
      }

      .contract-summary {
        margin-bottom: 24px;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 24px;
        margin-bottom: 24px;
      }

      .summary-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .summary-item .label {
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .summary-item .value {
        font-size: 16px;
        font-weight: 500;
      }

      .scope-section {
        margin-top: 24px;
      }

      .scope-section h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 500;
      }

      .scope-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .content-tabs {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .content-tabs ::ng-deep .mat-tab-body-wrapper {
        min-height: 400px;
      }

      .loading-container {
        padding: 40px;
      }

      .danger-item {
        color: #dc3545;
      }

      mat-chip {
        font-size: 12px;
      }

      .status-pending {
        background-color: #fff3cd !important;
        color: #856404 !important;
      }

      .status-active {
        background-color: #d4edda !important;
        color: #155724 !important;
      }

      .status-on_hold {
        background-color: #f8d7da !important;
        color: #721c24 !important;
      }

      .status-completed {
        background-color: #cce5ff !important;
        color: #004085 !important;
      }

      .status-terminated {
        background-color: #d1d1d1 !important;
        color: #333 !important;
      }

      @media (max-width: 768px) {
        .metrics-grid {
          grid-template-columns: 1fr;
        }

        .detail-header {
          flex-wrap: wrap;
        }

        .header-info h1 {
          font-size: 20px;
        }
      }
    `,
  ],
})
export class ContractorProjectDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contractorProjectService = inject(ContractorProjectService);
  private contractorService = inject(ContractorService);
  private projectService = inject(ProjectService);

  contractorProjectDetail$!: Observable<ContractorProjectDetail>;

  ngOnInit() {
    this.contractorProjectDetail$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const contractorId = params.get('contractorId') || '';
        const projectId = params.get('projectId') || '';

        // Find the contractor-project relationship
        return this.contractorProjectService.getContractorProjectsByContractor(contractorId).pipe(
          map((contractorProjects) => contractorProjects.find((cp) => cp.projectId === projectId)),
          switchMap((contractorProject) => {
            if (!contractorProject) {
              throw new Error('Contractor project relationship not found');
            }

            // Load contractor and project details
            return combineLatest({
              contractor: this.contractorService.getContractor(contractorId),
              project: this.projectService.getProject(projectId),
            }).pipe(
              map(({ contractor, project }) => ({
                contractorProject,
                contractor,
                project,
              })),
            );
          }),
        );
      }),
    );
  }

  goBack() {
    this.router.navigate(['/contractors']);
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  }

  getActiveTeamsCount(contractorProject: ContractorProject): number {
    return contractorProject.allocatedTeams?.filter((team) => team.isActive).length || 0;
  }

  getPaymentPercentage(contractorProject: ContractorProject): number {
    if (!contractorProject.contractValue || contractorProject.contractValue === 0) return 0;
    return Math.round((contractorProject.totalPaymentMade / contractorProject.contractValue) * 100);
  }

  updateContractStatus() {
    // TODO: Implement status update dialog
    console.log('Update contract status');
  }

  generateReport() {
    // TODO: Implement report generation
    console.log('Generate report');
  }

  viewPerformanceMetrics() {
    // TODO: Navigate to performance metrics dashboard
    console.log('View performance metrics');
  }

  terminateContract() {
    // TODO: Implement contract termination with confirmation
    console.log('Terminate contract');
  }
}
