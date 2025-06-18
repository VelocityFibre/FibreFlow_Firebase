import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

import { ContractorProjectService } from '../../../contractors/services/contractor-project.service';
import { ContractorProject, PaymentStatus, ContractorProjectStatus } from '../../../contractors/models/contractor-project.model';

@Component({
  selector: 'app-project-contractors',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    MatMenuModule
  ],
  template: `
    <div class="project-contractors-container">
      <div class="contractors-header">
        <h3>Contractors</h3>
        <button mat-raised-button color="primary" (click)="assignContractor()">
          <mat-icon>add</mat-icon>
          Assign Contractor
        </button>
      </div>

      <div class="contractors-grid" *ngIf="!loading()">
        <!-- No contractors message -->
        <div class="empty-state" *ngIf="contractorProjects().length === 0">
          <mat-icon>engineering</mat-icon>
          <p>No contractors assigned to this project</p>
          <button mat-button color="primary" (click)="assignContractor()">
            Assign First Contractor
          </button>
        </div>

        <!-- Contractor Cards -->
        <mat-card 
          *ngFor="let cp of contractorProjects()" 
          class="contractor-card ff-card-contractors"
          (click)="viewContractorDetails(cp)"
        >
          <mat-card-header>
            <mat-card-title>
              {{ cp.contractorName }}
              <mat-chip 
                class="status-chip" 
                [ngClass]="'status-' + cp.status"
              >
                {{ formatStatus(cp.status) }}
              </mat-chip>
            </mat-card-title>
            <mat-card-subtitle>
              Contract #{{ cp.contractNumber || 'N/A' }}
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <!-- Progress Overview -->
            <div class="progress-section">
              <div class="progress-header">
                <span>Overall Progress</span>
                <span>{{ cp.overallProgress }}%</span>
              </div>
              <mat-progress-bar 
                mode="determinate" 
                [value]="cp.overallProgress"
                [color]="cp.overallProgress < 50 ? 'warn' : 'primary'"
              ></mat-progress-bar>
            </div>

            <!-- Key Metrics -->
            <div class="metrics-grid">
              <div class="metric">
                <mat-icon>groups</mat-icon>
                <div class="metric-content">
                  <span class="value">{{ cp.allocatedTeams?.length || 0 }}</span>
                  <span class="label">Teams</span>
                </div>
              </div>
              <div class="metric">
                <mat-icon>task_alt</mat-icon>
                <div class="metric-content">
                  <span class="value">{{ cp.workProgress?.totalTasksCompleted || 0 }}</span>
                  <span class="label">Tasks Done</span>
                </div>
              </div>
              <div class="metric">
                <mat-icon>star</mat-icon>
                <div class="metric-content">
                  <span class="value">{{ cp.performance?.overallRating?.toFixed(1) || '0.0' }}</span>
                  <span class="label">Rating</span>
                </div>
              </div>
            </div>

            <!-- Financial Summary -->
            <mat-divider></mat-divider>
            <div class="financial-summary">
              <div class="financial-row">
                <span class="label">Contract Value</span>
                <span class="value">R{{ (cp.contractValue / 1000).toFixed(0) }}K</span>
              </div>
              <div class="financial-row">
                <span class="label">Paid to Date</span>
                <span class="value">R{{ (cp.totalPaymentMade / 1000).toFixed(0) }}K</span>
              </div>
              <div class="payment-progress">
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="getPaymentProgress(cp)"
                  color="accent"
                ></mat-progress-bar>
                <span class="progress-text">{{ getPaymentProgress(cp) }}% paid</span>
              </div>
            </div>

            <!-- Active Teams -->
            <div class="teams-section" *ngIf="getActiveTeams(cp).length > 0">
              <h4>Active Teams</h4>
              <div class="team-chips">
                <mat-chip *ngFor="let team of getActiveTeams(cp).slice(0, 3)">
                  <mat-icon matChipAvatar>group</mat-icon>
                  {{ team.teamCode }}
                </mat-chip>
                <mat-chip *ngIf="getActiveTeams(cp).length > 3">
                  +{{ getActiveTeams(cp).length - 3 }} more
                </mat-chip>
              </div>
            </div>

            <!-- Pending Payments -->
            <div class="pending-payments" *ngIf="getPendingPaymentsCount(cp) > 0">
              <mat-icon>warning</mat-icon>
              <span>{{ getPendingPaymentsCount(cp) }} pending payment(s)</span>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button (click)="viewContractorDetails($event, cp)">
              <mat-icon>visibility</mat-icon>
              View Details
            </button>
            <button mat-button (click)="manageTeams($event, cp)">
              <mat-icon>groups</mat-icon>
              Manage Teams
            </button>
            <button mat-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="recordPayment(cp)">
                <mat-icon>payment</mat-icon>
                <span>Record Payment</span>
              </button>
              <button mat-menu-item (click)="updateProgress(cp)">
                <mat-icon>update</mat-icon>
                <span>Update Progress</span>
              </button>
              <button mat-menu-item (click)="viewPerformance(cp)">
                <mat-icon>analytics</mat-icon>
                <span>View Performance</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="removeContractor(cp)" class="danger-item">
                <mat-icon>remove_circle</mat-icon>
                <span>Remove from Project</span>
              </button>
            </mat-menu>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading()">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      </div>
    </div>
  `,
  styles: [`
    .project-contractors-container {
      padding: 24px;
    }

    .contractors-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .contractors-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .contractors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .contractor-card {
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .contractor-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .contractor-card mat-card-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 18px;
    }

    .status-chip {
      font-size: 11px;
      height: 22px;
      line-height: 22px;
      padding: 0 8px;
    }

    .status-chip.status-pending {
      background-color: #fff3cd !important;
      color: #856404 !important;
    }

    .status-chip.status-active {
      background-color: #d4edda !important;
      color: #155724 !important;
    }

    .status-chip.status-on_hold {
      background-color: #f8d7da !important;
      color: #721c24 !important;
    }

    .status-chip.status-completed {
      background-color: #cce5ff !important;
      color: #004085 !important;
    }

    .progress-section {
      margin: 16px 0;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      margin-bottom: 8px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 16px 0;
    }

    .metric {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .metric mat-icon {
      color: #666;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .metric-content {
      display: flex;
      flex-direction: column;
    }

    .metric-content .value {
      font-size: 16px;
      font-weight: 500;
      line-height: 1;
    }

    .metric-content .label {
      font-size: 11px;
      color: #666;
    }

    .financial-summary {
      margin: 16px 0;
    }

    .financial-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .financial-row .label {
      color: #666;
    }

    .financial-row .value {
      font-weight: 500;
    }

    .payment-progress {
      margin-top: 8px;
    }

    .progress-text {
      font-size: 12px;
      color: #666;
      display: block;
      margin-top: 4px;
    }

    .teams-section {
      margin-top: 16px;
    }

    .teams-section h4 {
      font-size: 14px;
      font-weight: 500;
      margin: 0 0 8px 0;
      color: #666;
    }

    .team-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .team-chips mat-chip {
      font-size: 12px;
    }

    .pending-payments {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 8px 12px;
      background-color: #fff3cd;
      border-radius: 4px;
      font-size: 13px;
      color: #856404;
    }

    .pending-payments mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    mat-card-actions {
      display: flex;
      justify-content: space-between;
      padding: 8px 16px !important;
    }

    .empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 40px;
      text-align: center;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ddd;
      margin-bottom: 16px;
    }

    .empty-state p {
      margin: 0 0 16px 0;
      font-size: 16px;
    }

    .loading-state {
      padding: 40px;
    }

    .danger-item {
      color: #dc3545;
    }

    mat-divider {
      margin: 16px 0;
    }

    @media (max-width: 768px) {
      .contractors-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProjectContractorsComponent implements OnInit {
  @Input() projectId!: string;

  private contractorProjectService = inject(ContractorProjectService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  contractorProjects = signal<ContractorProject[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.loadContractorProjects();
  }

  loadContractorProjects() {
    this.loading.set(true);
    this.contractorProjectService.getContractorProjectsByProject(this.projectId).subscribe({
      next: (projects) => {
        this.contractorProjects.set(projects);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading contractor projects:', error);
        this.loading.set(false);
      }
    });
  }

  formatStatus(status: ContractorProjectStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getPaymentProgress(cp: ContractorProject): number {
    if (!cp.contractValue || cp.contractValue === 0) return 0;
    return Math.round((cp.totalPaymentMade / cp.contractValue) * 100);
  }

  getActiveTeams(cp: ContractorProject) {
    return cp.allocatedTeams?.filter(team => team.isActive) || [];
  }

  getPendingPaymentsCount(cp: ContractorProject): number {
    return cp.payments?.filter(p => 
      p.paymentStatus === 'not_paid' || p.paymentStatus === 'processing'
    ).length || 0;
  }

  viewContractorDetails(event: Event | ContractorProject, cp?: ContractorProject) {
    if (event instanceof Event) {
      event.stopPropagation();
    } else {
      cp = event;
    }
    
    if (cp) {
      this.router.navigate(['/contractors', cp.contractorId, 'projects', cp.projectId]);
    }
  }

  assignContractor() {
    // TODO: Implement contractor assignment dialog
    console.log('Assign contractor to project');
  }

  manageTeams(event: Event, cp: ContractorProject) {
    event.stopPropagation();
    // TODO: Implement team management dialog
    console.log('Manage teams for contractor:', cp.contractorId);
  }

  recordPayment(cp: ContractorProject) {
    // TODO: Implement payment recording dialog
    console.log('Record payment for contractor:', cp.contractorId);
  }

  updateProgress(cp: ContractorProject) {
    // TODO: Implement progress update dialog
    console.log('Update progress for contractor:', cp.contractorId);
  }

  viewPerformance(cp: ContractorProject) {
    // TODO: Navigate to performance dashboard
    console.log('View performance for contractor:', cp.contractorId);
  }

  removeContractor(cp: ContractorProject) {
    // TODO: Implement contractor removal with confirmation
    console.log('Remove contractor from project:', cp.contractorId);
  }
}