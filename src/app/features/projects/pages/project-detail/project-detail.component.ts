import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { Observable, switchMap, combineLatest, map, from } from 'rxjs';
import { Project, ProjectStatus } from '../../../../core/models/project.model';
import { Phase, PhaseStatus } from '../../../../core/models/phase.model';
import { ProjectService } from '../../../../core/services/project.service';
import { DateFormatService } from '../../../../core/services/date-format.service';
import { ProjectPhasesComponent } from '../../components/phases/project-phases.component';
import { ProjectTasksComponent } from '../../components/tasks/project-tasks.component';
import { ProjectStockComponent } from '../../components/stock/project-stock.component';
import { ProjectStepsComponent } from '../../components/steps/project-steps.component';
import { ProjectContractorsComponent } from '../../components/contractors/project-contractors.component';
import { PhaseService } from '../../../../core/services/phase.service';
import { TaskService } from '../../../../core/services/task.service';
import { Task } from '../../../../core/models/task.model';
import { BOQService } from '../../../boq/services/boq.service';
import { BOQSummary } from '../../../boq/models/boq.model';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    MatExpansionModule,
    ProjectPhasesComponent,
    ProjectTasksComponent,
    ProjectStockComponent,
    ProjectStepsComponent,
    ProjectContractorsComponent,
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
              <button
                mat-menu-item
                (click)="deleteProject(project.id!)"
                [disabled]="!project.id"
                class="delete-option"
              >
                <mat-icon>delete</mat-icon>
                <span>Delete Project</span>
              </button>
            </mat-menu>
          </div>
        </div>
      </div>

      <!-- Key Metrics Cards -->
      <div class="metrics-grid">
        <mat-card class="metric-card ff-card-projects">
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

        <mat-card class="metric-card ff-card-projects">
          <mat-card-content>
            <div class="metric-icon budget">
              <mat-icon>attach_money</mat-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ 'R' + (project.budgetUsed | number: '1.0-0') }}</div>
              <div class="metric-label">Budget Used ({{ getBudgetPercentage(project) }}%)</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card ff-card-projects">
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

        <mat-card class="metric-card ff-card-projects">
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
              <mat-card class="ff-card-projects">
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
                      <span class="detail-value">{{
                        getProjectTypeLabel(project.projectType)
                      }}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Priority</span>
                      <mat-chip
                        class="priority-chip"
                        [ngClass]="'priority-' + project.priorityLevel"
                      >
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
                      <span class="detail-value">{{
                        project.allowWeekendWork ? 'Allowed' : 'Not Allowed'
                      }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Client Information Card -->
              <mat-card class="ff-card-clients">
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
              <mat-card class="ff-card-projects">
                <mat-card-header>
                  <mat-card-title>Budget Overview</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="budget-overview">
                    <div class="budget-stats">
                      <div class="budget-stat">
                        <span class="budget-label">Total Budget</span>
                        <span class="budget-value">{{
                          'R' + (project.budget | number: '1.0-0')
                        }}</span>
                      </div>
                      <div class="budget-stat">
                        <span class="budget-label">Used</span>
                        <span class="budget-value used">{{
                          'R' + (project.budgetUsed | number: '1.0-0')
                        }}</span>
                      </div>
                      <div class="budget-stat">
                        <span class="budget-label">Remaining</span>
                        <span class="budget-value remaining">{{
                          'R' + (project.budget - project.budgetUsed | number: '1.0-0')
                        }}</span>
                      </div>
                    </div>
                    <mat-progress-bar
                      mode="determinate"
                      [value]="getBudgetPercentage(project)"
                      [color]="getBudgetPercentage(project) > 80 ? 'warn' : 'primary'"
                    >
                    </mat-progress-bar>
                    <div class="budget-percentage">
                      {{ getBudgetPercentage(project) }}% of budget used
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- BOQ Management Card -->
              <mat-card class="ff-card-stock action-card" (click)="navigateToBOQ(project.id!)">
                <mat-card-header>
                  <mat-card-title>BOQ Management</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="boq-overview">
                    <div class="boq-icon">
                      <mat-icon>receipt_long</mat-icon>
                    </div>
                    <div class="boq-info">
                      <p class="boq-description">Manage Bill of Quantities for this project</p>
                      <div class="boq-stats" *ngIf="boqSummary$ | async as boqSummary">
                        <span class="stat-item">{{ boqSummary.totalItems }} Items</span>
                        <span class="stat-item"
                          >R{{ boqSummary.totalValue | number: '1.0-0' }} Total</span
                        >
                      </div>
                    </div>
                    <mat-icon class="navigate-icon">arrow_forward</mat-icon>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Phases Tab -->
        <mat-tab label="Phases">
          <div class="tab-content" *ngIf="phasesWithTasks$ | async as phasesWithTasks">
            <div class="phases-tasks-container">
              <div class="phases-header">
                <h2>Project Phases & Tasks</h2>
                <div class="header-actions">
                  <button
                    mat-button
                    *ngIf="phasesWithTasks.length > 0 && getTotalTaskCount(phasesWithTasks) === 0"
                    (click)="initializeTasks()"
                  >
                    <mat-icon>auto_awesome</mat-icon>
                    Initialize Default Tasks
                  </button>
                  <button mat-raised-button color="primary" (click)="addTask()">
                    <mat-icon>add</mat-icon>
                    Add Task
                  </button>
                </div>
              </div>

              <div *ngIf="phasesWithTasks.length === 0" class="empty-state">
                <mat-icon>view_list</mat-icon>
                <p>No phases created for this project</p>
                <button mat-raised-button color="primary" (click)="initializePhases()">
                  <mat-icon>add_circle</mat-icon>
                  Initialize Default Phases
                </button>
              </div>

              <mat-accordion *ngIf="phasesWithTasks.length > 0" multi>
                <mat-expansion-panel *ngFor="let phaseData of phasesWithTasks" [expanded]="true">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <div class="phase-header-content">
                        <span class="phase-name">{{ phaseData.phase.name }}</span>
                        <button
                          mat-raised-button
                          [ngClass]="'phase-status-button status-' + phaseData.phase.status"
                          [matMenuTriggerFor]="phaseStatusMenu"
                          (click)="$event.stopPropagation()"
                        >
                          {{ getPhaseStatusLabel(phaseData.phase.status) }}
                          <mat-icon>arrow_drop_down</mat-icon>
                        </button>
                        <mat-menu #phaseStatusMenu="matMenu">
                          <button
                            mat-menu-item
                            (click)="updatePhaseStatus(phaseData.phase, 'pending')"
                          >
                            <mat-icon>schedule</mat-icon>
                            <span>Pending</span>
                          </button>
                          <button
                            mat-menu-item
                            (click)="updatePhaseStatus(phaseData.phase, 'active')"
                          >
                            <mat-icon>play_arrow</mat-icon>
                            <span>Active</span>
                          </button>
                          <button
                            mat-menu-item
                            (click)="updatePhaseStatus(phaseData.phase, 'completed')"
                          >
                            <mat-icon>check_circle</mat-icon>
                            <span>Completed</span>
                          </button>
                          <button
                            mat-menu-item
                            (click)="updatePhaseStatus(phaseData.phase, 'blocked')"
                          >
                            <mat-icon>block</mat-icon>
                            <span>Blocked</span>
                          </button>
                        </mat-menu>
                      </div>
                    </mat-panel-title>
                    <mat-panel-description>
                      <span class="task-count">{{ phaseData.tasks.length }} tasks</span>
                      <span class="phase-progress" *ngIf="phaseData.tasks.length > 0">
                        {{ getPhaseProgress(phaseData.tasks) }}% complete
                      </span>
                    </mat-panel-description>
                  </mat-expansion-panel-header>

                  <div class="phase-tasks">
                    <div
                      *ngIf="phaseData.phase.status === 'blocked' && phaseData.phase.blockedReason"
                      class="phase-blocked-reason"
                    >
                      <mat-icon>warning</mat-icon>
                      <span><strong>Blocked:</strong> {{ phaseData.phase.blockedReason }}</span>
                    </div>
                    <div *ngIf="phaseData.tasks.length === 0" class="no-tasks">
                      <p>No tasks in this phase</p>
                      <button
                        mat-button
                        color="primary"
                        (click)="addTaskToPhase(phaseData.phase.id!)"
                      >
                        Add Task
                      </button>
                    </div>

                    <div *ngIf="phaseData.tasks.length > 0" class="task-list">
                      <div
                        *ngFor="let task of phaseData.tasks"
                        class="task-item"
                        (click)="viewTask(task)"
                      >
                        <div class="task-status-indicator" [class]="'status-' + task.status"></div>

                        <div class="task-main">
                          <div class="task-header-row">
                            <h4 class="task-name">{{ task.name }}</h4>
                            <mat-chip [class]="'priority-' + task.priority">
                              {{ task.priority }}
                            </mat-chip>
                          </div>

                          <div class="task-meta">
                            <div class="meta-item" *ngIf="task.assignedToName">
                              <mat-icon>person</mat-icon>
                              <span>{{ task.assignedToName }}</span>
                            </div>
                            <div class="meta-item" *ngIf="task.dueDate">
                              <mat-icon>event</mat-icon>
                              <span>Due {{ formatDate(task.dueDate) }}</span>
                            </div>
                            <div class="meta-item">
                              <mat-icon>donut_small</mat-icon>
                              <span>{{ task.completionPercentage }}%</span>
                            </div>
                          </div>
                        </div>

                        <div class="task-actions" (click)="$event.stopPropagation()">
                          <button mat-icon-button [matMenuTriggerFor]="taskMenu">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                          <mat-menu #taskMenu="matMenu">
                            <button mat-menu-item (click)="editTask(task)">
                              <mat-icon>edit</mat-icon>
                              <span>Edit Task</span>
                            </button>
                            <button mat-menu-item (click)="deleteTask(task)" class="delete-option">
                              <mat-icon>delete</mat-icon>
                              <span>Delete Task</span>
                            </button>
                          </mat-menu>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-expansion-panel>
              </mat-accordion>
            </div>
          </div>
        </mat-tab>

        <!-- Steps Tab -->
        <mat-tab label="Steps">
          <div class="tab-content">
            <app-project-steps [projectId]="project.id!"></app-project-steps>
          </div>
        </mat-tab>

        <!-- Tasks Tab -->
        <mat-tab label="Tasks">
          <div class="tab-content tasks-tab-content">
            <app-project-tasks [projectId]="project.id!"></app-project-tasks>

            <!-- Phases Summary Below Tasks -->
            <div class="phases-summary-section">
              <h3 class="summary-title">Project Phases Overview</h3>
              <app-project-phases
                [projectId]="project.id!"
                class="phases-summary"
              ></app-project-phases>
            </div>
          </div>
        </mat-tab>

        <!-- Stock Tab -->
        <mat-tab label="Stock">
          <div class="tab-content">
            <app-project-stock [projectId]="project.id!"></app-project-stock>
          </div>
        </mat-tab>

        <!-- Contractors Tab -->
        <mat-tab label="Contractors">
          <div class="tab-content">
            <app-project-contractors [projectId]="project.id!"></app-project-contractors>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Loading State -->
    <div class="loading-container" *ngIf="(project$ | async) === null">
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    </div>
  `,
  styles: [
    `
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

      .tasks-tab-content {
        max-width: 100%;

        ::ng-deep app-project-tasks {
          display: block;
          margin-bottom: 48px;

          .tasks-card {
            max-width: 100%;
          }

          .task-item {
            width: 100%;
          }
        }
      }

      .phases-summary-section {
        margin-top: 48px;
        padding-top: 48px;
        border-top: 2px solid #e5e7eb;
      }

      .summary-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 24px;
        color: #1f2937;
      }

      .phases-summary {
        display: block;
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

      /* Phases with Tasks Styles */
      .phases-tasks-container {
        padding: 0;
      }

      .phases-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
      }

      .phases-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      .empty-state {
        text-align: center;
        padding: 48px 24px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: #e5e7eb;
          margin-bottom: 16px;
        }

        p {
          color: #6b7280;
          margin-bottom: 24px;
        }
      }

      mat-accordion {
        mat-expansion-panel {
          margin-bottom: 16px;
          border-radius: 12px !important;
          overflow: hidden;

          &:before {
            display: none;
          }
        }
      }

      .phase-header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .phase-status-button {
        font-size: 12px;
        font-weight: 600;
        padding: 4px 12px;
        min-width: 100px;
        height: 28px;
        line-height: 20px;
        border: none;
        display: flex;
        align-items: center;
        gap: 4px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &.status-pending {
          background-color: #f3f4f6 !important;
          color: #6b7280 !important;
        }

        &.status-active {
          background-color: #dbeafe !important;
          color: #1e40af !important;
        }

        &.status-completed {
          background-color: #d1fae5 !important;
          color: #065f46 !important;
        }

        &.status-blocked {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;
        }
      }

      .phase-name {
        font-size: 16px;
        font-weight: 500;
      }

      .task-count {
        margin-right: 16px;
      }

      .phase-progress {
        color: #6b7280;
      }

      mat-chip.phase-status-pending {
        background-color: #e5e7eb !important;
        color: #374151 !important;
      }

      mat-chip.phase-status-active {
        background-color: #dbeafe !important;
        color: #1e40af !important;
      }

      mat-chip.phase-status-completed {
        background-color: #d1fae5 !important;
        color: #065f46 !important;
      }

      mat-chip.phase-status-blocked {
        background-color: #fee2e2 !important;
        color: #dc2626 !important;
      }

      .phase-tasks {
        padding: 0 24px 16px;
      }

      .phase-blocked-reason {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #991b1b;
        margin-bottom: 16px;

        mat-icon {
          color: #dc2626;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        strong {
          color: #dc2626;
        }
      }

      .no-tasks {
        text-align: center;
        padding: 24px;
        background-color: #f9fafb;
        border-radius: 8px;

        p {
          margin-bottom: 12px;
          color: #6b7280;
        }
      }

      .task-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .task-item {
        display: flex;
        align-items: center;
        padding: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: white;

        &:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
      }

      .task-status-indicator {
        width: 4px;
        height: 40px;
        border-radius: 4px;
        margin-right: 16px;

        &.status-pending {
          background-color: #6b7280;
        }

        &.status-in_progress {
          background-color: #3b82f6;
        }

        &.status-completed {
          background-color: #10b981;
        }

        &.status-blocked {
          background-color: #ef4444;
        }
      }

      .task-main {
        flex: 1;
        min-width: 0;
      }

      .task-header-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .task-name {
        margin: 0;
        font-size: 15px;
        font-weight: 500;
        color: #1f2937;
        flex: 1;
      }

      .task-meta {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #6b7280;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
      }

      .task-actions {
        margin-left: 16px;
      }

      mat-chip.priority-low {
        background-color: #e5e7eb !important;
        color: #374151 !important;
        font-size: 11px !important;
        min-height: 22px !important;
      }

      mat-chip.priority-medium {
        background-color: #dbeafe !important;
        color: #1e40af !important;
        font-size: 11px !important;
        min-height: 22px !important;
      }

      mat-chip.priority-high {
        background-color: #fed7aa !important;
        color: #c2410c !important;
        font-size: 11px !important;
        min-height: 22px !important;
      }

      mat-chip.priority-critical {
        background-color: #fee2e2 !important;
        color: #dc2626 !important;
        font-size: 11px !important;
        min-height: 22px !important;
      }
    `,
  ],
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private dateFormat = inject(DateFormatService);
  private dialog = inject(MatDialog);
  private phaseService = inject(PhaseService);
  private taskService = inject(TaskService);
  private boqService = inject(BOQService);

  project$!: Observable<Project | undefined>;
  phasesWithTasks$!: Observable<{ phase: Phase; tasks: Task[] }[]>;
  boqSummary$!: Observable<BOQSummary | null>;

  ngOnInit() {
    const projectId$ = this.route.paramMap.pipe(map((params) => params.get('id') || ''));

    this.project$ = projectId$.pipe(switchMap((id) => this.projectService.getProjectById(id)));

    this.boqSummary$ = projectId$.pipe(switchMap((id) => this.boqService.getProjectSummary(id)));

    // Ensure phases exist for this project
    projectId$
      .pipe(switchMap((projectId) => from(this.phaseService.ensureProjectHasPhases(projectId))))
      .subscribe();

    this.phasesWithTasks$ = projectId$.pipe(
      switchMap((projectId) =>
        combineLatest([
          this.phaseService.getProjectPhases(projectId),
          this.taskService.getTasksByProject(projectId),
        ]).pipe(
          map(([phases, tasks]) => {
            console.log(
              `ProjectDetailComponent: Loaded ${phases.length} phases for project ${projectId}`,
            );
            console.log('Phases:', phases);
            console.log(
              `ProjectDetailComponent: Loaded ${tasks.length} tasks for project ${projectId}`,
            );
            return phases.map((phase) => ({
              phase,
              tasks: tasks
                .filter((task) => task.phaseId === phase.id)
                .sort((a, b) => a.orderNo - b.orderNo),
            }));
          }),
        ),
      ),
    );
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

  getProjectTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ftth: 'FTTH',
      fttb: 'FTTB',
      fttc: 'FTTC',
      backbone: 'Backbone',
      lastmile: 'Last Mile',
      enterprise: 'Enterprise',
      maintenance: 'Maintenance',
    };
    return labels[type] || type;
  }

  formatDate(date: unknown): string {
    return this.dateFormat.formatDate(date as any);
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
    const confirmDelete = confirm(
      'Are you sure you want to delete this project? This action cannot be undone.',
    );

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

  getPhaseStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      active: 'Active',
      completed: 'Completed',
      blocked: 'Blocked',
    };
    return labels[status] || status;
  }

  getPhaseProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    const totalProgress = tasks.reduce((sum, task) => sum + task.completionPercentage, 0);
    return Math.round(totalProgress / tasks.length);
  }

  addTask(): void {
    // This will be implemented with the task dialog
    // Add task clicked
  }

  addTaskToPhase(_phaseId: string): void {
    // This will be implemented with the task dialog
    // Add task to phase: ${phaseId}
  }

  viewTask(_task: Task): void {
    // This will be implemented with the task dialog
    // View task: ${task.name}
  }

  editTask(_task: Task): void {
    // This will be implemented with the task dialog
    // Edit task: ${task.name}
  }

  async deleteTask(task: Task): Promise<void> {
    if (confirm(`Are you sure you want to delete "${task.name}"?`)) {
      try {
        await this.taskService.deleteTask(task.id!);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  }

  async initializePhases(): Promise<void> {
    const projectId = this.route.snapshot.params['id'];
    if (confirm('This will create the default project phases with tasks. Continue?')) {
      try {
        await this.phaseService.createProjectPhases(projectId, true);
        // Refresh the phases data
        this.ngOnInit();
      } catch (error) {
        console.error('Error initializing phases:', error);
        alert('Failed to initialize phases. Please try again.');
      }
    }
  }

  async initializeTasks(): Promise<void> {
    const projectId = this.route.snapshot.params['id'];
    if (confirm('This will create default tasks for all phases. Continue?')) {
      try {
        await this.taskService.initializeProjectTasks(projectId);
        // Refresh the data
        this.ngOnInit();
      } catch (error) {
        console.error('Error initializing tasks:', error);
        alert('Failed to initialize tasks. Please try again.');
      }
    }
  }

  getTotalTaskCount(phasesWithTasks: { tasks: Task[] }[]): number {
    return phasesWithTasks.reduce((total, phase) => total + phase.tasks.length, 0);
  }

  async updatePhaseStatus(phase: Phase, newStatus: string): Promise<void> {
    try {
      const projectId = this.route.snapshot.params['id'];

      // If changing to blocked, prompt for reason
      let blockedReason: string | undefined;
      if (newStatus === 'blocked') {
        const reason = prompt('Please provide a reason for blocking this phase:');
        if (!reason) {
          return; // User cancelled
        }
        blockedReason = reason;
      }

      await this.phaseService.updatePhaseStatus(
        projectId,
        phase.id!,
        newStatus as PhaseStatus,
        blockedReason,
      );

      // Refresh the data
      this.ngOnInit();
    } catch (error) {
      console.error('Error updating phase status:', error);
      alert('Failed to update phase status. Please try again.');
    }
  }

  trackByPhaseFn(index: number, phaseData: { phase: Phase; tasks: Task[] }): string {
    return phaseData.phase.id || index.toString();
  }

  trackByTaskFn(index: number, task: Task): string {
    return task.id || index.toString();
  }

  navigateToBOQ(projectId: string): void {
    this.router.navigate(['/projects', projectId, 'boq']);
  }
}
