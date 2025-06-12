import { Component, OnInit, inject } from '@angular/core';
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
import { Observable } from 'rxjs';
import { Project, ProjectStatus, ProjectType, Priority, PhaseType } from '../../../../core/models/project.model';
import { ProjectService } from '../../../../core/services/project.service';
import { DateFormatService } from '../../../../core/services/date-format.service';
import { ProjectCleanupService } from '../../../../core/services/project-cleanup.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
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
    MatDividerModule
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
        <button mat-raised-button class="ff-button-warn" (click)="cleanupAndReset()">
          <mat-icon>cleaning_services</mat-icon>
          Clean & Create LouisTest
        </button>
        <button mat-raised-button class="ff-button-primary" (click)="createNewProject()">
          <mat-icon>add</mat-icon>
          New Project
        </button>
      </div>

      <!-- Project Grid -->
      <section class="ff-section">
        <div class="project-grid" *ngIf="projects$ | async as projects">
          <mat-card 
            *ngFor="let project of projects" 
            class="project-card"
            [routerLink]="['/projects', project.id]"
            matRipple>
            
            <!-- Priority Indicator -->
            <div class="priority-ribbon" 
                 *ngIf="project.priorityLevel === 'high' || project.priorityLevel === 'critical'"
                 [ngClass]="'priority-' + project.priorityLevel">
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
                <div class="phase-name">{{ project.currentPhaseName || getPhaseLabel(project.currentPhase) }}</div>
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="project.currentPhaseProgress"
                  color="primary">
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
                  [color]="project.overallProgress === 100 ? 'accent' : 'primary'">
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
                <div class="stat-card" [matTooltip]="'Budget: R' + (project.budget | number:'1.0-0')">
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

        <!-- Loading State -->
        <div *ngIf="!(projects$ | async)" class="loading-state">
          <div class="loading-grid">
            <div class="loading-card" *ngFor="let i of [1,2,3,4]">
              <div class="loading-skeleton loading-header"></div>
              <div class="loading-skeleton loading-content"></div>
              <div class="loading-skeleton loading-progress"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    @use '../../../../../styles/theme-functions' as *;
    @use '../../../../../styles/spacing' as *;
    
    // Custom button styles for FibreFlow theme
    .ff-button-primary {
      background-color: ff-rgb(primary) !important;
      color: ff-rgb(primary-foreground) !important;
      
      &:hover:not(:disabled) {
        opacity: 0.9;
      }
    }
    
    .ff-button-warn {
      background-color: ff-rgb(destructive) !important;
      color: ff-rgb(destructive-foreground) !important;
      
      &:hover:not(:disabled) {
        opacity: 0.9;
      }
    }
    
    .actions-bar {
      margin-bottom: ff-spacing(xl);
      display: flex;
      justify-content: flex-end;
      gap: ff-spacing(md);
    }

    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .project-card {
      position: relative;
      cursor: pointer;
      background: ff-rgb(card) !important;
      padding: 0 !important;
      transition: all ff-transition(slow) ease;
      
      &:hover {
        transform: translateY(-4px);
        box-shadow: ff-shadow(lg) !important;
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
      background-color: ff-rgba(warning, 0.15);
      color: ff-rgb(warning);
    }

    .priority-ribbon.priority-critical {
      background-color: ff-rgba(destructive, 0.15);
      color: ff-rgb(destructive);
    }

    mat-card-header {
      background-color: ff-rgba(muted, 0.5);
      border-bottom: 1px solid ff-rgb(border);
      padding: ff-spacing(lg) ff-spacing(xl) !important;
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
      font-size: ff-font-size(xl) !important;
      line-height: 1.3 !important;
      margin-bottom: ff-spacing(xs) !important;
      color: ff-rgb(card-foreground);
    }

    mat-card-subtitle {
      font-size: ff-font-size(base) !important;
      color: ff-rgb(muted-foreground);
    }

    .status-chip {
      flex-shrink: 0;
      margin-left: 16px;
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
      gap: ff-spacing(sm);
      color: ff-rgb(muted-foreground);
      font-size: ff-font-size(sm);
    }

    .meta-item mat-icon {
      color: ff-rgba(muted-foreground, 0.7);
    }

    .project-type {
      font-weight: ff-font-weight(medium);
      color: ff-rgb(foreground);
    }

    .phase-card {
      background: ff-rgb(muted);
      border-radius: var(--ff-radius);
      padding: ff-spacing(md);
      margin-bottom: ff-spacing(lg);
    }

    .phase-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .phase-label {
      font-size: ff-font-size(xs);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ff-rgb(muted-foreground);
      font-weight: ff-font-weight(medium);
    }

    .phase-progress {
      font-size: ff-font-size(sm);
      font-weight: ff-font-weight(semibold);
      color: ff-rgb(foreground);
    }

    .phase-name {
      font-size: ff-font-size(base);
      font-weight: ff-font-weight(medium);
      color: ff-rgb(card-foreground);
      margin-bottom: ff-spacing(sm);
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
      font-size: ff-font-size(sm);
      color: ff-rgb(foreground);
      font-weight: ff-font-weight(medium);
    }

    .progress-value {
      font-size: ff-font-size(base);
      font-weight: ff-font-weight(semibold);
      color: ff-rgb(foreground);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .stat-card {
      background: ff-rgb(muted);
      border-radius: calc(var(--ff-radius) * 0.66);
      padding: ff-spacing(md);
      display: flex;
      align-items: center;
      gap: ff-spacing(sm);
    }

    .stat-card mat-icon {
      font-size: 24px !important;
      width: 24px !important;
      height: 24px !important;
    }

    .completed-icon {
      color: ff-rgb(success);
    }

    .budget-icon {
      color: ff-rgb(info);
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: ff-font-size(lg);
      font-weight: ff-font-weight(semibold);
      color: ff-rgb(foreground);
      line-height: 1;
    }

    .stat-label {
      font-size: ff-font-size(xs);
      color: ff-rgb(muted-foreground);
      margin-top: ff-spacing(0);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: ff-spacing(5xl) ff-spacing(2xl);
      background: ff-rgb(muted);
      border-radius: var(--ff-radius);
      border: 2px dashed ff-rgb(border);
    }

    .empty-state-icon {
      width: ff-spacing(5xl);
      height: ff-spacing(5xl);
      margin: 0 auto ff-spacing(xl);
      background: ff-rgb(secondary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-state-icon mat-icon {
      font-size: 40px !important;
      width: 40px !important;
      height: 40px !important;
      color: ff-rgb(muted-foreground);
    }

    .empty-state h2 {
      font-size: ff-font-size(2xl);
      font-weight: ff-font-weight(medium);
      color: ff-rgb(foreground);
      margin: 0 0 ff-spacing(sm) 0;
    }

    .empty-state p {
      font-size: ff-font-size(base);
      color: ff-rgb(muted-foreground);
      margin: 0 0 ff-spacing(xl) 0;
    }

    /* Loading State */
    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .loading-card {
      background: ff-rgb(card);
      border: 1px solid ff-rgb(border);
      border-radius: var(--ff-radius);
      padding: ff-spacing(xl);
      height: 400px;
    }

    .loading-header {
      height: 60px;
      border-radius: calc(var(--ff-radius) * 0.66);
      margin-bottom: ff-spacing(lg);
    }

    .loading-content {
      height: 200px;
      border-radius: calc(var(--ff-radius) * 0.66);
      margin-bottom: ff-spacing(lg);
    }

    .loading-progress {
      height: 40px;
      border-radius: calc(var(--ff-radius) * 0.66);
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .project-grid {
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      }
    }

    @media (max-width: 768px) {
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
  `]
})
export class ProjectListComponent implements OnInit {
  private projectService = inject(ProjectService);
  private dateFormat = inject(DateFormatService);
  private cleanupService = inject(ProjectCleanupService);
  private router = inject(Router);
  projects$!: Observable<Project[]>;

  ngOnInit() {
    this.projects$ = this.projectService.getProjects();
  }

  async createNewProject() {
    await this.router.navigate(['/projects/new']);
  }

  async cleanupAndReset() {
    if (confirm('This will delete ALL existing projects and create only LouisTest. Are you sure?')) {
      try {
        const result = await this.cleanupService.cleanupAndCreateLouisTest();
        console.log(`Cleanup complete: Deleted ${result.deleted} projects, Created ${result.created} project`);
        // Force refresh the project list
        this.projects$ = this.projectService.getProjects();
      } catch (error) {
        console.error('Cleanup failed:', error);
        alert('Cleanup failed. Check console for details.');
      }
    }
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

  getProjectTypeLabel(type: ProjectType): string {
    const labels: Record<ProjectType, string> = {
      [ProjectType.FTTH]: 'FTTH',
      [ProjectType.FTTB]: 'FTTB',
      [ProjectType.FTTC]: 'FTTC',
      [ProjectType.BACKBONE]: 'Backbone',
      [ProjectType.LASTMILE]: 'Last Mile',
      [ProjectType.ENTERPRISE]: 'Enterprise',
      [ProjectType.MAINTENANCE]: 'Maintenance'
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
      final_acceptance: 'Final Acceptance'
    };
    return labels[phase] || phase;
  }

  formatDate(date: any): string {
    return this.dateFormat.formatShortDate(date);
  }

  getBudgetPercentage(project: Project): number {
    if (!project.budget || project.budget === 0) return 0;
    return Math.round((project.budgetUsed / project.budget) * 100);
  }
}