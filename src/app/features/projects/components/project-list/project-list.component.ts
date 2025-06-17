import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Observable } from 'rxjs';
import { Project, ProjectStatus, ProjectType } from '../../../../core/models/project.model';
import { ProjectService } from '../../../../core/services/project.service';
import { DateFormatService } from '../../../../core/services/date-format.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    ScrollingModule,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Header -->
      <div class="ff-page-header">
        <h1 class="ff-page-title">Projects</h1>
        <p class="ff-page-subtitle">Manage your fiber optic infrastructure deployments</p>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <button mat-raised-button class="ff-button-primary" (click)="createNewProject()">
          <mat-icon>add</mat-icon>
          New Project
        </button>
      </div>

      <!-- Project Grid -->
      <section class="ff-section">
        <cdk-virtual-scroll-viewport
          itemSize="420"
          class="project-viewport"
          *ngIf="projects$ | async as projects"
        >
          <div class="project-grid">
            <mat-card
              *cdkVirtualFor="let project of projects; trackBy: trackByProjectFn"
              class="project-card ff-card-projects"
              [routerLink]="['/projects', project.id]"
              matRipple
            >
              <!-- Priority Indicator -->
              <div
                class="priority-ribbon"
                *ngIf="project.priorityLevel === 'high' || project.priorityLevel === 'critical'"
                [ngClass]="'priority-' + project.priorityLevel"
              >
                <mat-icon class="small-icon">flag</mat-icon>
              </div>

              <!-- Card Header -->
              <mat-card-header>
                <div class="header-content">
                  <div class="title-section">
                    <mat-card-title>{{ project.name }}</mat-card-title>
                    <mat-card-subtitle>{{ project.clientOrganization }}</mat-card-subtitle>
                  </div>
                  <mat-chip class="status-chip" [ngClass]="'status-' + project.status">
                    {{ getStatusLabel(project.status) }}
                  </mat-chip>
                </div>
              </mat-card-header>

              <!-- Card Content -->
              <mat-card-content>
                <!-- Project Meta Info -->
                <div class="project-meta">
                  <div class="meta-item">
                    <mat-icon class="small-icon">location_on</mat-icon>
                    <span>{{ project.location }}</span>
                  </div>
                  <div class="meta-item">
                    <mat-icon class="small-icon">calendar_today</mat-icon>
                    <span>{{ formatDate(project.startDate) }}</span>
                  </div>
                  <div class="meta-item">
                    <mat-icon class="small-icon">person</mat-icon>
                    <span>{{ project.projectManagerName }}</span>
                  </div>
                  <div class="meta-item">
                    <mat-icon class="small-icon">category</mat-icon>
                    <span class="project-type">{{ getProjectTypeLabel(project.projectType) }}</span>
                  </div>
                </div>

                <!-- Current Phase Card -->
                <div class="phase-card">
                  <div class="phase-header">
                    <span class="phase-label">Current Phase</span>
                    <span class="phase-progress">{{ project.currentPhaseProgress }}%</span>
                  </div>
                  <div class="phase-name">
                    {{ project.currentPhaseName || getPhaseLabel(project.currentPhase) }}
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="project.currentPhaseProgress"
                    color="primary"
                  >
                  </mat-progress-bar>
                </div>

                <!-- Overall Progress -->
                <div class="progress-section">
                  <div class="progress-header">
                    <span class="progress-label">Overall Progress</span>
                    <span class="progress-value">{{ project.overallProgress }}%</span>
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="project.overallProgress"
                    [color]="project.overallProgress === 100 ? 'accent' : 'primary'"
                  >
                  </mat-progress-bar>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                  <div class="stat-card">
                    <mat-icon color="primary">assignment</mat-icon>
                    <div class="stat-content">
                      <div class="stat-value">{{ project.activeTasksCount }}</div>
                      <div class="stat-label">Active Tasks</div>
                    </div>
                  </div>
                  <div class="stat-card">
                    <mat-icon class="completed-icon">check_circle</mat-icon>
                    <div class="stat-content">
                      <div class="stat-value">{{ project.completedTasksCount }}</div>
                      <div class="stat-label">Completed</div>
                    </div>
                  </div>
                  <div
                    class="stat-card"
                    [matTooltip]="'Budget: R' + (project.budget | number: '1.0-0')"
                  >
                    <mat-icon class="budget-icon">attach_money</mat-icon>
                    <div class="stat-content">
                      <div class="stat-value">{{ getBudgetPercentage(project) }}%</div>
                      <div class="stat-label">Budget Used</div>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Empty State -->
            <div *ngIf="projects.length === 0" class="empty-state">
              <div class="empty-state-icon">
                <mat-icon class="large-icon">folder_open</mat-icon>
              </div>
              <h2>No projects yet</h2>
              <p>Create your first fiber optic project to get started</p>
              <button mat-raised-button class="ff-button-primary" (click)="createNewProject()">
                <mat-icon>add</mat-icon>
                Create Your First Project
              </button>
            </div>
          </div>
        </cdk-virtual-scroll-viewport>

        <!-- Loading State -->
        <div *ngIf="(projects$ | async) === null" class="loading-state">
          <div class="loading-grid">
            <div class="loading-card" *ngFor="let i of [1, 2, 3, 4]; trackBy: trackByIndexFn">
              <div class="loading-skeleton loading-header"></div>
              <div class="loading-skeleton loading-content"></div>
              <div class="loading-skeleton loading-progress"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .ff-page-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        background-color: var(--mat-sys-background);
      }

      .ff-page-header {
        margin-bottom: 32px;
      }

      .ff-page-title {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
        color: var(--mat-sys-on-surface);
      }

      .ff-page-subtitle {
        color: var(--mat-sys-on-surface-variant);
        margin-top: 4px;
      }

      .ff-section {
        margin-bottom: 32px;
      }

      .project-viewport {
        height: calc(100vh - 250px);
        min-height: 600px;
      }

      .ff-button-primary {
        background-color: var(--mat-sys-primary) !important;
        color: var(--mat-sys-on-primary) !important;

        &:hover:not(:disabled) {
          opacity: 0.9;
        }
      }

      .actions-bar {
        margin-bottom: 32px;
        display: flex;
        justify-content: flex-end;
        gap: 16px;
      }

      .project-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 24px;
        padding: 4px;
      }

      .project-card {
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-4px);
          box-shadow: var(--mat-sys-elevation-4);
        }
      }

      .priority-ribbon {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      .priority-ribbon.priority-high {
        background-color: rgba(255, 152, 0, 0.15);
        color: #ff9800;
      }

      .priority-ribbon.priority-critical {
        background-color: rgba(var(--mat-sys-error-rgb), 0.15);
        color: var(--mat-sys-error);
      }

      mat-card-header {
        background-color: var(--mat-sys-surface-variant);
        border-bottom: 1px solid var(--mat-sys-outline-variant);
        padding: 16px 24px !important;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        width: 100%;
      }

      .title-section {
        flex: 1;
        min-width: 0;
      }

      mat-card-title {
        font-size: 20px !important;
        line-height: 1.3 !important;
        margin-bottom: 4px !important;
        color: var(--mat-sys-on-surface);
      }

      mat-card-subtitle {
        font-size: 14px !important;
        color: var(--mat-sys-on-surface-variant);
      }

      .status-chip {
        flex-shrink: 0;
        margin-left: 16px;
      }

      .status-chip.status-active {
        background-color: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }

      .status-chip.status-planning {
        background-color: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
      }

      .status-chip.status-on_hold {
        background-color: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
      }

      .status-chip.status-completed {
        background-color: rgba(16, 185, 129, 0.1);
        color: #10b981;
      }

      .status-chip.status-cancelled {
        background-color: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }

      mat-card-content {
        padding: 24px !important;
      }

      .project-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--mat-sys-on-surface-variant);
        font-size: 14px;
      }

      .meta-item mat-icon {
        color: var(--mat-sys-on-surface-variant);
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .project-type {
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }

      .phase-card {
        background: var(--mat-sys-surface-variant);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
      }

      .phase-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .phase-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--mat-sys-on-surface-variant);
        font-weight: 500;
      }

      .phase-progress {
        font-size: 14px;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }

      .phase-name {
        font-size: 16px;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
        margin-bottom: 8px;
      }

      .progress-section {
        margin-bottom: 24px;
      }

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .progress-label {
        font-size: 14px;
        color: var(--mat-sys-on-surface);
        font-weight: 500;
      }

      .progress-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .stat-card {
        background: var(--mat-sys-surface-variant);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .stat-card mat-icon {
        font-size: 24px !important;
        width: 24px !important;
        height: 24px !important;
      }

      .completed-icon {
        color: #22c55e;
      }

      .budget-icon {
        color: #3b82f6;
      }

      .stat-content {
        flex: 1;
      }

      .stat-value {
        font-size: 18px;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
        line-height: 1;
      }

      .stat-label {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        margin-top: 2px;
      }

      /* Empty State */
      .empty-state {
        text-align: center;
        padding: 80px 32px;
        background: var(--mat-sys-surface-variant);
        border-radius: 12px;
        border: 2px dashed var(--mat-sys-outline-variant);
      }

      .empty-state-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 24px;
        background: var(--mat-sys-surface);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .empty-state-icon mat-icon {
        font-size: 40px !important;
        width: 40px !important;
        height: 40px !important;
        color: var(--mat-sys-on-surface-variant);
      }

      .empty-state h2 {
        font-size: 24px;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
        margin: 0 0 8px 0;
      }

      .empty-state p {
        font-size: 16px;
        color: var(--mat-sys-on-surface-variant);
        margin: 0 0 24px 0;
      }

      /* Loading State */
      .loading-skeleton {
        background: linear-gradient(
          90deg,
          var(--mat-sys-surface-variant) 25%,
          var(--mat-sys-surface) 50%,
          var(--mat-sys-surface-variant) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      .loading-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 24px;
      }

      .loading-card {
        background: var(--mat-sys-surface);
        border: 1px solid var(--mat-sys-outline-variant);
        border-radius: 12px;
        padding: 24px;
        height: 400px;
      }

      .loading-header {
        height: 60px;
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .loading-content {
        height: 200px;
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .loading-progress {
        height: 40px;
        border-radius: 8px;
      }

      /* Small icon helper */
      .small-icon {
        font-size: 18px !important;
        width: 18px !important;
        height: 18px !important;
      }

      .large-icon {
        font-size: 40px !important;
        width: 40px !important;
        height: 40px !important;
      }

      /* Responsive */
      @media (max-width: 1200px) {
        .project-grid {
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        }
      }

      @media (max-width: 768px) {
        .ff-page-container {
          padding: 16px;
        }

        .project-grid {
          grid-template-columns: 1fr;
        }

        .project-meta {
          grid-template-columns: 1fr;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }

        .header-content {
          flex-direction: column;
          gap: 12px;
        }

        .status-chip {
          margin-left: 0;
        }
      }
    `,
  ],
})
export class ProjectListComponent implements OnInit {
  private projectService = inject(ProjectService);
  private dateFormat = inject(DateFormatService);
  private router = inject(Router);
  projects$!: Observable<Project[]>;

  ngOnInit() {
    this.projects$ = this.projectService.getProjects();
  }

  async createNewProject() {
    await this.router.navigate(['/projects/new']);
  }

  getStatusLabel(status: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      [ProjectStatus.PLANNING]: 'Planning',
      [ProjectStatus.ACTIVE]: 'Active',
      [ProjectStatus.ON_HOLD]: 'On Hold',
      [ProjectStatus.COMPLETED]: 'Completed',
      [ProjectStatus.CANCELLED]: 'Cancelled',
    };
    return labels[status];
  }

  getProjectTypeLabel(type: ProjectType): string {
    const labels: Record<ProjectType, string> = {
      [ProjectType.FTTH]: 'FTTH',
      [ProjectType.FTTB]: 'FTTB',
      [ProjectType.FTTC]: 'FTTC',
      [ProjectType.BACKBONE]: 'Backbone',
      [ProjectType.LASTMILE]: 'Last Mile',
      [ProjectType.ENTERPRISE]: 'Enterprise',
      [ProjectType.MAINTENANCE]: 'Maintenance',
    };
    return labels[type];
  }

  getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      planning: 'Planning',
      initiate_project: 'Initiate Project',
      work_in_progress: 'Work in Progress',
      handover: 'Handover',
      handover_complete: 'Handover Complete',
      final_acceptance: 'Final Acceptance',
    };
    return labels[phase] || phase;
  }

  formatDate(date: unknown): string {
    return this.dateFormat.formatShortDate(date as any);
  }

  getBudgetPercentage(project: Project): number {
    if (!project.budget || project.budget === 0) return 0;
    return Math.round((project.budgetUsed / project.budget) * 100);
  }

  trackByProjectFn(index: number, project: Project): string {
    return project.id || index.toString();
  }

  trackByIndexFn(index: number): number {
    return index;
  }
}
