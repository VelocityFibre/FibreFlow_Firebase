import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Observable, switchMap } from 'rxjs';
import { Project, Phase, ProjectStatus, Priority } from '../../../../core/models/project.model';
import { ProjectService } from '../../../../core/services/project.service';
import { DateFormatService } from '../../../../core/services/date-format.service';
import { ProjectPhasesComponent } from '../../components/phases/project-phases.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDividerModule,
    MatListModule,
    MatMenuModule,
    MatDialogModule,
    ProjectPhasesComponent
  ],
  template: `
    <div class="ff-page-container" *ngIf="project$ | async as project">
      <!-- Header -->
      <div class="project-header">
        <div class="header-top">
          <button mat-icon-button routerLink="/projects" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="header-info">
            <h1 class="project-title">{{ project.name }}</h1>
            <p class="project-code">{{ project.projectCode }}</p>
          </div>
          <div class="header-actions">
            <mat-chip [ngClass]="'status-' + project.status">
              {{ getStatusLabel(project.status) }}
            </mat-chip>
            <button mat-button (click)="editProject(project.id!)" [disabled]="!project.id">
              <mat-icon>edit</mat-icon>
              Edit
            </button>
            <button mat-icon-button [matMenuTriggerFor]="menu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="editProject(project.id!)" [disabled]="!project.id">
                <mat-icon>edit</mat-icon>
                <span>Edit Project</span>
              </button>
              <button mat-menu-item (click)="deleteProject(project.id!)" [disabled]="!project.id" class="delete-option">
                <mat-icon>delete</mat-icon>
                <span>Delete Project</span>
              </button>
            </mat-menu>
          </div>
        </div>
      </div>

      <!-- Key Metrics Cards -->
      <div class="metrics-grid">
        <mat-card class="metric-card">
          <mat-card-content>
            <div class="metric-icon overall-progress">
              <mat-icon>donut_large</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ project.overallProgress }}%</div>
              <div class="metric-label">Overall Progress</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card">
          <mat-card-content>
            <div class="metric-icon budget">
              <mat-icon>attach_money</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ 'R' + (project.budgetUsed | number:'1.0-0') }}</div>
              <div class="metric-label">Budget Used ({{ getBudgetPercentage(project) }}%)</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card">
          <mat-card-content>
            <div class="metric-icon tasks">
              <mat-icon>assignment</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ project.activeTasksCount }}</div>
              <div class="metric-label">Active Tasks</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card">
          <mat-card-content>
            <div class="metric-icon phase">
              <mat-icon>flag</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ project.currentPhaseName }}</div>
              <div class="metric-label">Current Phase ({{ project.currentPhaseProgress }}%)</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Tabs -->
      <mat-tab-group class="content-tabs">
        <!-- Overview Tab -->
        <mat-tab label="Overview">
          <div class="tab-content">
            <div class="overview-grid">
              <!-- Project Details Card -->
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Project Details</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="detail-list">
                    <div class="detail-item">
                      <span class="detail-label">Location</span>
                      <span class="detail-value">{{ project.location }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Project Type</span>
                      <span class="detail-value">{{ getProjectTypeLabel(project.projectType) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Priority</span>
                      <mat-chip class="priority-chip" [ngClass]="'priority-' + project.priorityLevel">
                        {{ project.priorityLevel }}
                      </mat-chip>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Start Date</span>
                      <span class="detail-value">{{ formatDate(project.startDate) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Expected End Date</span>
                      <span class="detail-value">{{ formatDate(project.expectedEndDate) }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Project Manager</span>
                      <span class="detail-value">{{ project.projectManagerName }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Working Hours</span>
                      <span class="detail-value">{{ project.workingHours }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Weekend Work</span>
                      <span class="detail-value">{{ project.allowWeekendWork ? 'Allowed' : 'Not Allowed' }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Client Information Card -->
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Client Information</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="detail-list">
                    <div class="detail-item">
                      <span class="detail-label">Organization</span>
                      <span class="detail-value">{{ project.clientOrganization }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Contact Person</span>
                      <span class="detail-value">{{ project.clientContact }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Email</span>
                      <span class="detail-value">
                        <a [href]="'mailto:' + project.clientEmail">{{ project.clientEmail }}</a>
                      </span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Phone</span>
                      <span class="detail-value">
                        <a [href]="'tel:' + project.clientPhone">{{ project.clientPhone }}</a>
                      </span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Budget Overview Card -->
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Budget Overview</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="budget-overview">
                    <div class="budget-stats">
                      <div class="budget-stat">
                        <span class="budget-label">Total Budget</span>
                        <span class="budget-value">{{ 'R' + (project.budget | number:'1.0-0') }}</span>
                      </div>
                      <div class="budget-stat">
                        <span class="budget-label">Used</span>
                        <span class="budget-value used">{{ 'R' + (project.budgetUsed | number:'1.0-0') }}</span>
                      </div>
                      <div class="budget-stat">
                        <span class="budget-label">Remaining</span>
                        <span class="budget-value remaining">{{ 'R' + ((project.budget - project.budgetUsed) | number:'1.0-0') }}</span>
                      </div>
                    </div>
                    <mat-progress-bar 
                      mode="determinate" 
                      [value]="getBudgetPercentage(project)"
                      [color]="getBudgetPercentage(project) > 80 ? 'warn' : 'primary'">
                    </mat-progress-bar>
                    <div class="budget-percentage">{{ getBudgetPercentage(project) }}% of budget used</div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Phases Tab -->
        <mat-tab label="Phases">
          <div class="tab-content">
            <app-project-phases [projectId]="project.id!"></app-project-phases>
          </div>
        </mat-tab>

        <!-- Tasks Tab -->
        <mat-tab label="Tasks" [disabled]="true">
          <div class="tab-content">
            <p>Task management coming soon...</p>
          </div>
        </mat-tab>

        <!-- Materials Tab -->
        <mat-tab label="Materials" [disabled]="true">
          <div class="tab-content">
            <p>Materials tracking coming soon...</p>
          </div>
        </mat-tab>

        <!-- Documents Tab -->
        <mat-tab label="Documents" [disabled]="true">
          <div class="tab-content">
            <p>Document management coming soon...</p>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Loading State -->
    <div class="loading-container" *ngIf="!(project$ | async)">
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    </div>
  `,
  styles: [`
    .project-header {
      background: white;
      margin: -40px -24px 32px;
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .header-top {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-button {
      margin-right: 8px;
    }

    .header-info {
      flex: 1;
    }

    .project-title {
      font-size: 32px;
      font-weight: 500;
      margin: 0;
      color: #1f2937;
    }

    .project-code {
      font-size: 16px;
      color: #6b7280;
      margin: 4px 0 0 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .metric-card {
      border-radius: 12px !important;
    }

    .metric-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px !important;
    }

    .metric-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .metric-icon.overall-progress {
      background-color: #eff6ff;
      color: #2563eb;
    }

    .metric-icon.budget {
      background-color: #f0fdf4;
      color: #16a34a;
    }

    .metric-icon.tasks {
      background-color: #fef3c7;
      color: #d97706;
    }

    .metric-icon.phase {
      background-color: #fce7f3;
      color: #db2777;
    }

    .metric-info {
      flex: 1;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 600;
      color: #111827;
      line-height: 1;
    }

    .metric-label {
      font-size: 14px;
      color: #6b7280;
      margin-top: 4px;
    }

    .content-tabs {
      margin-top: 32px;
      
      ::ng-deep .mat-mdc-tab-label {
        font-size: 15px;
        font-weight: 500;
      }
    }

    .tab-content {
      padding: 32px 0;
    }

    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }

    .detail-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
      
      &:last-child {
        border-bottom: none;
      }
    }

    .detail-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }

    .detail-value {
      font-size: 15px;
      color: #1f2937;
      text-align: right;
      
      a {
        color: #2563eb;
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }

    .priority-chip {
      font-size: 12px !important;
      height: 24px !important;
      
      &.priority-low {
        background-color: #e5e7eb !important;
        color: #374151 !important;
      }
      
      &.priority-medium {
        background-color: #dbeafe !important;
        color: #1e40af !important;
      }
      
      &.priority-high {
        background-color: #fed7aa !important;
        color: #c2410c !important;
      }
      
      &.priority-critical {
        background-color: #fee2e2 !important;
        color: #dc2626 !important;
      }
    }

    .budget-overview {
      margin-top: 16px;
    }

    .budget-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .budget-stat {
      text-align: center;
    }

    .budget-label {
      display: block;
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .budget-value {
      display: block;
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      
      &.used {
        color: #dc2626;
      }
      
      &.remaining {
        color: #16a34a;
      }
    }

    .budget-percentage {
      text-align: center;
      margin-top: 12px;
      font-size: 14px;
      color: #6b7280;
    }

    .loading-container {
      padding: 64px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .project-header {
        margin: -24px -16px 24px;
      }
      
      .header-top {
        flex-wrap: wrap;
      }
      
      .header-actions {
        width: 100%;
        margin-top: 16px;
      }
      
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      
      .overview-grid {
        grid-template-columns: 1fr;
      }
      
      .budget-stats {
        grid-template-columns: 1fr;
      }
    }

    .delete-option {
      color: #ef4444;
      
      mat-icon {
        color: #ef4444;
      }
    }
  `]
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private dateFormat = inject(DateFormatService);
  private dialog = inject(MatDialog);
  
  project$!: Observable<Project | undefined>;

  ngOnInit() {
    this.project$ = this.route.params.pipe(
      switchMap(params => this.projectService.getProjectById(params['id']))
    );
  }

  getStatusLabel(status: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      [ProjectStatus.PLANNING]: 'Planning',
      [ProjectStatus.ACTIVE]: 'Active', 
      [ProjectStatus.ON_HOLD]: 'On Hold',
      [ProjectStatus.COMPLETED]: 'Completed',
      [ProjectStatus.CANCELLED]: 'Cancelled'
    };
    return labels[status];
  }

  getProjectTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ftth: 'FTTH',
      fttb: 'FTTB',
      fttc: 'FTTC',
      backbone: 'Backbone',
      lastmile: 'Last Mile',
      enterprise: 'Enterprise',
      maintenance: 'Maintenance'
    };
    return labels[type] || type;
  }

  formatDate(date: any): string {
    return this.dateFormat.formatDate(date);
  }

  getBudgetPercentage(project: Project): number {
    if (!project.budget || project.budget === 0) return 0;
    return Math.round((project.budgetUsed / project.budget) * 100);
  }

  editProject(projectId: string): void {
    // Navigate to edit page (we'll create this later)
    this.router.navigate(['/projects', projectId, 'edit']);
  }

  async deleteProject(projectId: string): Promise<void> {
    const confirmDelete = confirm('Are you sure you want to delete this project? This action cannot be undone.');
    
    if (confirmDelete) {
      try {
        await this.projectService.deleteProject(projectId);
        // Navigate back to projects list after successful deletion
        this.router.navigate(['/projects']);
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project. Please try again.');
      }
    }
  }
}