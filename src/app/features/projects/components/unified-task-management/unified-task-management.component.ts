import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable, map, firstValueFrom, combineLatest } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

import { StaffMember } from '../../../staff/models/staff.model';
import { StaffService } from '../../../staff/services/staff.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TaskService } from '../../../../core/services/task.service';
import { TaskStatus, Task, TaskPriority } from '../../../../core/models/task.model';
import { PhaseService } from '../../../../core/services/phase.service';
import { Phase } from '../../../../core/models/phase.model';
import {
  TASK_TEMPLATES,
  PhaseTemplate,
  StepTemplate,
  TaskTemplate,
} from '../../../tasks/models/task-template.model';

// Extended interfaces to include database data
interface TaskWithTracking extends TaskTemplate {
  dbTask?: Task; // The actual database task
  isCompleted: boolean;
  isFlagged: boolean;
  assignedTo?: string;
  assignedToName?: string;
  progress: number;
  priority: TaskPriority;
}

interface StepWithTracking extends StepTemplate {
  tasks: TaskWithTracking[];
  completedCount: number;
  progress: number;
}

interface PhaseWithTracking extends PhaseTemplate {
  steps: StepWithTracking[];
  completedCount: number;
  progress: number;
}

type ViewFilter = 'all' | 'uncompleted' | 'flagged';

@Component({
  selector: 'app-unified-task-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    MatExpansionModule,
    MatInputModule,
    MatBadgeModule,
  ],
  template: `
    <div class="unified-task-management">
      <!-- Header with filters -->
      <mat-card class="filters-card">
        <div class="filters-container">
          <div class="filter-group">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search tasks</mat-label>
              <input
                matInput
                [(ngModel)]="searchTerm"
                placeholder="Search by name or description"
              />
              <mat-icon matPrefix>search</mat-icon>
              @if (searchTerm()) {
                <button mat-icon-button matSuffix (click)="searchTerm.set('')">
                  <mat-icon>clear</mat-icon>
                </button>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="phase-filter">
              <mat-label>Filter by phase</mat-label>
              <mat-select [(ngModel)]="selectedPhase">
                <mat-option value="">All phases</mat-option>
                @for (phase of phasesWithTracking(); track phase.id) {
                  <mat-option [value]="phase.id">{{ phase.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="assignee-filter">
              <mat-label>Filter by assignee</mat-label>
              <mat-select [(ngModel)]="assigneeFilter">
                <mat-option value="all">All assignees</mat-option>
                <mat-option value="unassigned">Unassigned</mat-option>
                @for (staff of staff$ | async; track staff.id) {
                  <mat-option [value]="staff.id">{{ staff.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div class="filter-actions">
            <mat-button-toggle-group [(ngModel)]="viewFilter" class="view-toggle">
              <mat-button-toggle value="all">
                <mat-icon>list</mat-icon>
                All Tasks
              </mat-button-toggle>
              <mat-button-toggle value="uncompleted">
                <mat-icon>pending</mat-icon>
                Uncompleted
              </mat-button-toggle>
              <mat-button-toggle value="flagged">
                <mat-icon>flag</mat-icon>
                Flagged
              </mat-button-toggle>
            </mat-button-toggle-group>

            <button mat-button (click)="refreshData()" class="refresh-button">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
          </div>
        </div>

        <!-- Stats bar -->
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-value">{{ getTotalTasks() }}</span>
            <span class="stat-label">Total Tasks</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ getCompletedTasks() }}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ getInProgressTasks() }}</span>
            <span class="stat-label">In Progress</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ getOverallProgress() }}%</span>
            <span class="stat-label">Progress</span>
          </div>
        </div>
      </mat-card>

      <!-- Loading state -->
      @if (loading()) {
        <mat-card class="loading-card">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p>Loading project tasks...</p>
        </mat-card>
      }

      <!-- No tasks state -->
      @if (!loading() && databaseTasks().length === 0) {
        <mat-card class="empty-state-card">
          <mat-icon class="empty-icon">assignment</mat-icon>
          <h2>No tasks found</h2>
          <p>This project doesn't have any tasks yet.</p>
          <button mat-raised-button color="primary" (click)="initializeTasks()">
            <mat-icon>add</mat-icon>
            Initialize Project Tasks
          </button>
        </mat-card>
      }

      <!-- Phases with Steps and Tasks (matching tasks page structure) -->
      @if (!loading() && databaseTasks().length > 0) {
        <div class="phases-section">
          <mat-accordion multi="true">
            @for (phase of filteredPhases(); track phase.id) {
              <mat-expansion-panel class="phase-panel" [expanded]="shouldExpandPhase(phase)">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <div class="phase-header">
                      <span class="phase-name">{{ phase.name }}</span>
                      <mat-chip class="phase-stats">
                        {{ phase.completedCount }} / {{ phase.totalTasks }} tasks •
                        {{ phase.progress }}%
                      </mat-chip>
                    </div>
                  </mat-panel-title>
                  <mat-panel-description>
                    {{ phase.description }}
                  </mat-panel-description>
                </mat-expansion-panel-header>

                <div class="phase-content">
                  <!-- Steps Accordion -->
                  <mat-accordion multi="true" class="steps-accordion">
                    @for (step of phase.steps; track step.id) {
                      <mat-expansion-panel class="step-panel" [expanded]="shouldExpandStep(step)">
                        <mat-expansion-panel-header>
                          <mat-panel-title>
                            <div class="step-header">
                              <span class="step-name">{{ step.name }}</span>
                              <mat-chip class="step-count">
                                {{ step.completedCount }} / {{ step.taskCount }} •
                                {{ step.progress }}%
                              </mat-chip>
                            </div>
                          </mat-panel-title>
                          <mat-panel-description>
                            {{ step.description }}
                          </mat-panel-description>
                        </mat-expansion-panel-header>

                        <div class="step-content">
                          <!-- Tasks List -->
                          <div class="tasks-list">
                            @for (task of getFilteredTasks(step.tasks); track task.id) {
                              <div class="task-item" [class.completed]="task.isCompleted">
                                <div class="task-number">{{ task.orderNo }}</div>
                                <div class="task-details">
                                  <span class="task-name">{{ task.name }}</span>
                                  @if (task.description) {
                                    <p class="task-description">{{ task.description }}</p>
                                  }
                                </div>
                                <div class="task-actions">
                                  <!-- Priority indicator -->
                                  <mat-chip
                                    class="priority-chip"
                                    [class]="'priority-' + task.priority"
                                  >
                                    {{ task.priority }}
                                  </mat-chip>

                                  <!-- Assignee selector -->
                                  <mat-form-field appearance="outline" class="assignee-select">
                                    <mat-select
                                      [value]="task.assignedTo"
                                      (selectionChange)="updateAssignee(task, $event.value)"
                                      placeholder="Assign to"
                                    >
                                      <mat-option [value]="null">
                                        <span class="unassigned-text">Unassigned</span>
                                      </mat-option>
                                      @for (staff of staff$ | async; track staff.id) {
                                        <mat-option [value]="staff.id">
                                          {{ staff.name }}
                                        </mat-option>
                                      }
                                    </mat-select>
                                  </mat-form-field>

                                  <!-- Action buttons -->
                                  <button
                                    mat-icon-button
                                    (click)="toggleFlag(task)"
                                    [matTooltip]="task.isFlagged ? 'Remove flag' : 'Flag task'"
                                    class="action-button flag-button"
                                    [class.flagged]="task.isFlagged"
                                  >
                                    <mat-icon>{{
                                      task.isFlagged ? 'flag' : 'outlined_flag'
                                    }}</mat-icon>
                                  </button>

                                  <button
                                    mat-icon-button
                                    (click)="toggleComplete(task)"
                                    [matTooltip]="
                                      task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'
                                    "
                                    class="action-button complete-button"
                                    [class.completed]="task.isCompleted"
                                  >
                                    <mat-icon>{{
                                      task.isCompleted ? 'check_circle' : 'radio_button_unchecked'
                                    }}</mat-icon>
                                  </button>
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      </mat-expansion-panel>
                    }
                  </mat-accordion>
                </div>
              </mat-expansion-panel>
            }
          </mat-accordion>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .unified-task-management {
        display: block;
        padding: 48px 32px;
        max-width: 1400px;
        margin: 0 auto;
      }

      /* Filters Card */
      .filters-card {
        margin-bottom: 32px;
        border-radius: var(--ff-radius-lg) !important;
        padding: 24px;
      }

      .filters-container {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 24px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .filter-group {
        display: flex;
        gap: 16px;
        align-items: center;
        flex: 1;
        flex-wrap: wrap;
      }

      .search-field {
        flex: 1;
        min-width: 300px;
      }

      .phase-filter,
      .assignee-filter {
        width: 200px;
      }

      .filter-actions {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      .view-toggle {
        border: 1px solid rgb(var(--ff-border));
        border-radius: var(--ff-radius);
      }

      .refresh-button {
        color: rgb(var(--ff-muted-foreground));
      }

      /* Stats Bar */
      .stats-bar {
        display: flex;
        gap: 48px;
        padding-top: 24px;
        border-top: 1px solid rgb(var(--ff-border));
      }

      .stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .stat-value {
        font-size: 28px;
        font-weight: 600;
        color: rgb(var(--ff-foreground));
      }

      .stat-label {
        font-size: 13px;
        color: rgb(var(--ff-muted-foreground));
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Loading & Empty States */
      .loading-card,
      .empty-state-card {
        text-align: center;
        padding: 64px;
        border-radius: var(--ff-radius-lg) !important;
      }

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin: 0 auto 24px;
        color: rgb(var(--ff-muted-foreground));
      }

      /* Phases Section - matching tasks page */
      .phases-section {
        margin-bottom: 48px;
      }

      /* Phase Panel */
      .phase-panel {
        border-radius: var(--ff-radius) !important;
        margin-bottom: 24px;
        border: 1px solid rgb(var(--ff-border)) !important;
        background-color: rgb(var(--ff-card)) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
      }

      .phase-panel ::ng-deep .mat-expansion-panel-header {
        height: auto !important;
        min-height: 80px !important;
        padding: 20px 24px !important;
      }

      .phase-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 24px;
      }

      .phase-name {
        font-size: 18px;
        font-weight: 500;
        color: rgb(var(--ff-foreground));
        flex: 1;
      }

      .phase-stats {
        background-color: rgb(var(--ff-muted)) !important;
        color: rgb(var(--ff-muted-foreground)) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        height: 24px !important;
        padding: 0 12px !important;
        border-radius: 12px !important;
        flex-shrink: 0;
      }

      ::ng-deep .mat-expansion-panel-header-description {
        color: rgb(var(--ff-muted-foreground));
        font-size: 14px;
        line-height: 1.5;
        margin-top: 8px;
      }

      .phase-content {
        padding: 24px;
        background-color: rgb(var(--ff-muted) / 0.3);
      }

      /* Steps Accordion */
      .steps-accordion {
        margin-left: 0;
      }

      .step-panel {
        border-radius: 8px !important;
        margin-bottom: 16px;
        border: 1px solid rgb(var(--ff-border)) !important;
        background-color: rgb(var(--ff-background)) !important;
      }

      .step-panel ::ng-deep .mat-expansion-panel-header {
        height: auto !important;
        min-height: 64px !important;
        padding: 16px 20px !important;
      }

      .step-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 16px;
      }

      .step-name {
        font-size: 16px;
        font-weight: 500;
        color: rgb(var(--ff-foreground));
        flex: 1;
      }

      .step-count {
        background-color: rgb(var(--ff-muted)) !important;
        color: rgb(var(--ff-muted-foreground)) !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        height: 20px !important;
        padding: 0 8px !important;
        border-radius: 10px !important;
        flex-shrink: 0;
      }

      .step-content {
        padding: 20px;
        background-color: rgb(var(--ff-muted) / 0.2);
      }

      /* Tasks List */
      .tasks-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .task-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background-color: rgb(var(--ff-card));
        border-radius: 8px;
        border: 1px solid rgb(var(--ff-border));
        transition: all 0.2s ease;
        min-height: 80px;

        &:hover {
          background-color: rgb(var(--ff-muted) / 0.5);
          border-color: rgb(var(--ff-primary));
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        &.completed {
          opacity: 0.7;
          background-color: rgb(var(--ff-muted) / 0.3);

          .task-name {
            text-decoration: line-through;
            color: rgb(var(--ff-muted-foreground));
          }
        }
      }

      .task-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background-color: rgb(var(--ff-primary));
        color: rgb(var(--ff-primary-foreground));
        border-radius: 50%;
        font-weight: 600;
        font-size: 14px;
        flex-shrink: 0;
      }

      .task-details {
        flex: 1;
        min-width: 0;
      }

      .task-name {
        font-size: 14px;
        font-weight: 500;
        color: rgb(var(--ff-foreground));
        line-height: 1.5;
        margin-bottom: 2px;
      }

      .task-description {
        margin: 0;
        color: rgb(var(--ff-muted-foreground));
        font-size: 13px;
        line-height: 1.5;
      }

      .task-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }

      /* Priority Chip */
      .priority-chip {
        height: 24px !important;
        font-size: 11px !important;
        padding: 0 10px !important;
        font-weight: 500 !important;

        &.priority-low {
          background-color: rgb(var(--ff-success) / 0.1) !important;
          color: rgb(var(--ff-success)) !important;
        }

        &.priority-medium {
          background-color: rgb(var(--ff-warning) / 0.1) !important;
          color: rgb(var(--ff-warning)) !important;
        }

        &.priority-high {
          background-color: rgb(var(--ff-destructive) / 0.1) !important;
          color: rgb(var(--ff-destructive)) !important;
        }

        &.priority-critical {
          background-color: rgb(var(--ff-destructive)) !important;
          color: rgb(var(--ff-destructive-foreground)) !important;
        }
      }

      /* Assignee Select */
      .assignee-select {
        width: 160px;

        ::ng-deep .mat-mdc-form-field-wrapper {
          padding: 0;
        }

        ::ng-deep .mat-mdc-form-field-infix {
          padding: 8px 0;
          min-height: auto;
        }

        ::ng-deep .mat-mdc-form-field-subscript-wrapper {
          display: none;
        }
      }

      .unassigned-text {
        color: rgb(var(--ff-muted-foreground));
        font-style: italic;
      }

      /* Action Buttons */
      .action-button {
        width: 36px;
        height: 36px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        &.flag-button {
          color: rgb(var(--ff-muted-foreground));

          &.flagged {
            color: rgb(var(--ff-warning));
          }
        }

        &.complete-button {
          color: rgb(var(--ff-muted-foreground));

          &.completed {
            color: rgb(var(--ff-success));
          }
        }
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .unified-task-management {
          padding: 24px 16px;
        }

        .filters-container {
          flex-direction: column;
          gap: 16px;
        }

        .filter-group {
          width: 100%;
        }

        .search-field {
          min-width: auto;
        }

        .phase-filter,
        .assignee-filter {
          width: 100%;
        }

        .stats-bar {
          gap: 24px;
          flex-wrap: wrap;
        }

        .phase-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .step-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .task-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
        }

        .task-actions {
          width: 100%;
          justify-content: flex-end;
        }
      }
    `,
  ],
})
export class UnifiedTaskManagementComponent implements OnInit {
  @Input() projectId!: string;

  private staffService = inject(StaffService);
  private notification = inject(NotificationService);
  private taskService = inject(TaskService);
  private phaseService = inject(PhaseService);

  staff$!: Observable<StaffMember[]>;
  staffMap = new Map<string, StaffMember>();

  // Signals for reactive state
  searchTerm = signal('');
  selectedPhase = signal('');
  viewFilter = signal<ViewFilter>('all');
  assigneeFilter = signal('all');
  loading = signal(true);

  // Data
  databaseTasks = signal<Task[]>([]);
  phasesWithTracking = signal<PhaseWithTracking[]>([]);

  // Computed filtered phases
  filteredPhases = computed(() => {
    let phases = this.phasesWithTracking();
    const term = this.searchTerm().toLowerCase();
    const phaseFilter = this.selectedPhase();
    const view = this.viewFilter();
    const assignee = this.assigneeFilter();

    // Filter by selected phase
    if (phaseFilter) {
      phases = phases.filter((p) => p.id === phaseFilter);
    }

    // Filter tasks within phases
    if (view !== 'all' || assignee !== 'all' || term) {
      phases = phases.map((phase) => ({
        ...phase,
        steps: phase.steps.map((step) => ({
          ...step,
          tasks: step.tasks.filter((task) => {
            // Search filter
            if (
              term &&
              !task.name.toLowerCase().includes(term) &&
              (!task.description || !task.description.toLowerCase().includes(term))
            ) {
              return false;
            }

            // View filter
            if (view === 'uncompleted' && task.isCompleted) {
              return false;
            }
            if (view === 'flagged') {
              console.log(
                `Filtering task ${task.name}: isFlagged=${task.isFlagged}, priority=${task.priority}`,
              );
              if (!task.isFlagged) {
                return false;
              }
            }

            // Assignee filter
            if (assignee !== 'all') {
              if (assignee === 'unassigned' && task.assignedTo) {
                return false;
              }
              if (assignee !== 'unassigned' && task.assignedTo !== assignee) {
                return false;
              }
            }

            return true;
          }),
        })),
      }));
    }

    // Recalculate counts after filtering
    return phases.map((phase) => {
      let phaseCompleted = 0;
      let phaseTotal = 0;

      const filteredSteps = phase.steps.map((step) => {
        const filteredTasks = step.tasks;
        const stepCompleted = filteredTasks.filter((t) => t.isCompleted).length;
        const stepTotal = filteredTasks.length;

        phaseCompleted += stepCompleted;
        phaseTotal += stepTotal;

        return {
          ...step,
          completedCount: stepCompleted,
          taskCount: stepTotal,
          progress: stepTotal > 0 ? Math.round((stepCompleted / stepTotal) * 100) : 0,
        };
      });

      return {
        ...phase,
        steps: filteredSteps,
        completedCount: phaseCompleted,
        totalTasks: phaseTotal,
        progress: phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0,
      };
    });
  });

  ngOnInit() {
    this.loadStaff();
    this.loadProjectData();
  }

  private loadStaff() {
    this.staff$ = this.staffService.getStaff();
    this.staff$.subscribe((staff) => {
      this.staffMap = new Map(staff.map((s) => [s.id, s]));
    });
  }

  private async loadProjectData() {
    this.loading.set(true);

    try {
      // Load tasks from database
      const tasks = await firstValueFrom(this.taskService.getTasksByProject(this.projectId));

      // If no tasks exist, initialize them
      if (tasks.length === 0) {
        await this.initializeTasks();
        return;
      }

      // Check if any tasks are missing stepId and migrate them
      let finalTasks = tasks;
      const tasksWithoutStepId = tasks.filter((t) => !t.stepId);
      if (tasksWithoutStepId.length > 0) {
        console.log(`Found ${tasksWithoutStepId.length} tasks without stepId. Migrating...`);
        await this.taskService.migrateTasksWithStepIds(this.projectId);
        // Reload tasks after migration
        finalTasks = await firstValueFrom(this.taskService.getTasksByProject(this.projectId));
      }

      console.log(`Project ${this.projectId} has ${finalTasks.length} total tasks`);
      console.log('Tasks by stepId:', finalTasks.filter((t) => t.stepId).length);
      console.log('Tasks without stepId:', finalTasks.filter((t) => !t.stepId).length);

      this.databaseTasks.set(finalTasks);

      // Create a map of database tasks by stepId for proper organization
      const tasksByStepId = new Map<string, Task[]>();
      const unmappedTasks: Task[] = [];

      finalTasks.forEach((task) => {
        if (task.stepId) {
          const stepTasks = tasksByStepId.get(task.stepId) || [];
          stepTasks.push(task);
          tasksByStepId.set(task.stepId, stepTasks);
        } else {
          // Tasks without stepId - we'll try to map them by name
          unmappedTasks.push(task);
        }
      });

      // Map TASK_TEMPLATES to include database data
      const phasesWithTracking: PhaseWithTracking[] = TASK_TEMPLATES.map((phaseTemplate) => {
        let phaseCompleted = 0;
        let phaseTotal = 0;

        const stepsWithTracking: StepWithTracking[] = phaseTemplate.steps.map((stepTemplate) => {
          let stepCompleted = 0;

          // Get all database tasks for this step
          const dbTasksForStep = tasksByStepId.get(stepTemplate.id) || [];

          // If no tasks with stepId, try to find by name matching
          if (dbTasksForStep.length === 0 && unmappedTasks.length > 0) {
            stepTemplate.tasks.forEach((taskTemplate) => {
              const matchingTask = unmappedTasks.find((t) => t.name === taskTemplate.name);
              if (matchingTask) {
                dbTasksForStep.push(matchingTask);
              }
            });
          }

          // Build tasks list for this step
          let tasksWithTracking: TaskWithTracking[];

          if (dbTasksForStep.length > 0) {
            // Use actual database tasks
            console.log(`Step ${stepTemplate.name} has ${dbTasksForStep.length} database tasks`);
            tasksWithTracking = dbTasksForStep
              .map((dbTask) => {
                const isCompleted = dbTask.status === TaskStatus.COMPLETED;
                if (isCompleted) {
                  stepCompleted++;
                }

                // Find matching template to get the orderNo and other template data
                const matchingTemplate = stepTemplate.tasks.find((t) => t.name === dbTask.name);

                const taskWithTracking = {
                  id: dbTask.id || matchingTemplate?.id || '',
                  name: dbTask.name,
                  description: dbTask.description || matchingTemplate?.description,
                  stepId: dbTask.stepId || stepTemplate.id,
                  phaseId: dbTask.phaseId,
                  orderNo: dbTask.orderNo || matchingTemplate?.orderNo || 1,
                  dbTask,
                  isCompleted,
                  isFlagged: dbTask.isFlagged === true,
                  assignedTo: dbTask.assignedTo,
                  assignedToName: dbTask.assignedToName,
                  progress: dbTask.completionPercentage || 0,
                  priority: dbTask.priority || TaskPriority.MEDIUM,
                };

                if (!dbTask.id) {
                  console.warn('Task missing ID:', dbTask.name);
                }

                return taskWithTracking;
              })
              .sort((a, b) => a.orderNo - b.orderNo);
          } else {
            // Use template tasks as placeholders (no database tasks yet)
            console.log(
              `Step ${stepTemplate.name} has no database tasks, using ${stepTemplate.tasks.length} template tasks`,
            );
            tasksWithTracking = stepTemplate.tasks.map((taskTemplate) => ({
              ...taskTemplate,
              dbTask: undefined,
              isCompleted: false,
              isFlagged: false,
              assignedTo: undefined,
              assignedToName: undefined,
              progress: 0,
              priority: TaskPriority.MEDIUM,
            }));
          }

          const actualTaskCount = tasksWithTracking.length;
          phaseCompleted += stepCompleted;
          phaseTotal += actualTaskCount;

          return {
            ...stepTemplate,
            tasks: tasksWithTracking,
            taskCount: actualTaskCount,
            completedCount: stepCompleted,
            progress: actualTaskCount > 0 ? Math.round((stepCompleted / actualTaskCount) * 100) : 0,
          };
        });

        return {
          ...phaseTemplate,
          steps: stepsWithTracking,
          completedCount: phaseCompleted,
          totalTasks: phaseTotal,
          progress: phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0,
        };
      });

      this.phasesWithTracking.set(phasesWithTracking);
    } catch (error) {
      console.error('Error loading project data:', error);
      this.notification.error('Failed to load project data');
    } finally {
      this.loading.set(false);
    }
  }

  async initializeTasks() {
    try {
      this.loading.set(true);
      await this.taskService.initializeProjectTasks(this.projectId);
      this.notification.success('Project tasks initialized successfully');
      await this.loadProjectData();
    } catch (error) {
      console.error('Error initializing tasks:', error);
      this.notification.error('Failed to initialize tasks');
      this.loading.set(false);
    }
  }

  refreshData() {
    this.loadProjectData();
  }

  shouldExpandPhase(phase: PhaseWithTracking): boolean {
    return !!this.searchTerm() || !!this.selectedPhase();
  }

  shouldExpandStep(step: StepWithTracking): boolean {
    return !!this.searchTerm();
  }

  getFilteredTasks(tasks: TaskWithTracking[]): TaskWithTracking[] {
    // Tasks are already filtered in the computed signal
    return tasks;
  }

  getTotalTasks(): number {
    return this.databaseTasks().length;
  }

  getCompletedTasks(): number {
    return this.databaseTasks().filter((t) => t.status === TaskStatus.COMPLETED).length;
  }

  getInProgressTasks(): number {
    return this.databaseTasks().filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
  }

  getOverallProgress(): number {
    const total = this.getTotalTasks();
    const completed = this.getCompletedTasks();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  async updateAssignee(task: TaskWithTracking, assigneeId: string | null) {
    console.log('🎯 ASSIGNMENT EVENT TRIGGERED!');
    console.log('=== ASSIGNMENT DEBUG START ===');
    console.log('Task:', task.name);
    console.log('Task DB ID:', task.dbTask?.id);
    console.log('Assignee ID:', assigneeId);
    console.log('Staff Map:', this.staffMap);

    if (!task.dbTask) {
      console.error('No dbTask found for:', task.name);
      console.error('This task exists only as template, not in database');
      this.notification.error(
        `Task "${task.name}" needs to be initialized first. Creating missing tasks...`,
      );

      // Try to create the missing tasks
      try {
        await this.taskService.initializeProjectTasksWithSteps(this.projectId);
        this.notification.success('Missing tasks created. Please try assigning again.');
        // Reload the data to include the new tasks
        await this.loadProjectData();
        return;
      } catch (error) {
        console.error('Failed to create missing tasks:', error);
        this.notification.error('Failed to create missing tasks');
        return;
      }
    }

    if (!task.dbTask.id) {
      console.error('Task missing ID:', task.dbTask);
      this.notification.error('Task missing ID, cannot assign');
      return;
    }

    const oldAssignee = task.assignedTo;
    const oldAssigneeName = task.assignedToName;

    // Update locally for immediate feedback
    task.assignedTo = assigneeId || undefined;
    task.assignedToName = assigneeId ? this.staffMap.get(assigneeId)?.name : undefined;

    console.log('Old assignment:', { oldAssignee, oldAssigneeName });
    console.log('New assignment:', { assigneeId, assigneeName: task.assignedToName });

    try {
      if (assigneeId) {
        console.log('Calling assignTask with:', task.dbTask.id, assigneeId);
        await this.taskService.assignTask(task.dbTask.id!, assigneeId);
        console.log('AssignTask completed successfully');
      } else {
        console.log('Clearing assignment with updateTask');
        await this.taskService.updateTask(task.dbTask.id!, {
          assignedTo: undefined,
          assignedToName: undefined,
        });
        console.log('Clear assignment completed successfully');
      }

      // Update the database task reference
      task.dbTask.assignedTo = task.assignedTo;
      task.dbTask.assignedToName = task.assignedToName;

      console.log('Assignment successful, updated dbTask:', {
        assignedTo: task.dbTask.assignedTo,
        assignedToName: task.dbTask.assignedToName,
      });

      this.notification.success('Task assignee updated');
    } catch (error) {
      console.error('=== ASSIGNMENT ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', (error as any)?.message);
      console.error('Error code:', (error as any)?.code);

      // Revert on error
      task.assignedTo = oldAssignee;
      task.assignedToName = oldAssigneeName;
      this.notification.error('Failed to update task assignee: ' + (error as any)?.message);
    }

    console.log('=== ASSIGNMENT DEBUG END ===');
  }

  async toggleComplete(task: TaskWithTracking) {
    if (!task.dbTask || !task.dbTask.id) {
      console.error('Cannot toggle complete: task has no database record', task);
      this.notification.error('This task needs to be initialized first. Please refresh the page.');
      return;
    }

    const wasCompleted = task.isCompleted;
    const oldStatus = task.dbTask.status;
    const oldPercentage = task.dbTask.completionPercentage;

    // Update locally for immediate feedback
    task.isCompleted = !wasCompleted;
    task.progress = task.isCompleted ? 100 : 0;
    task.dbTask.status = task.isCompleted ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS;
    task.dbTask.completionPercentage = task.progress;

    try {
      const updates = {
        status: task.dbTask.status,
        completionPercentage: task.progress,
        completedDate: task.isCompleted ? Timestamp.now() : undefined,
      };

      await this.taskService.updateTask(task.dbTask.id!, updates);
      this.notification.success(`Task marked as ${task.isCompleted ? 'completed' : 'incomplete'}`);

      // Recalculate progress
      this.updateProgress();
    } catch (error) {
      // Revert on error
      task.isCompleted = wasCompleted;
      task.progress = wasCompleted ? 100 : 0;
      task.dbTask.status = oldStatus;
      task.dbTask.completionPercentage = oldPercentage;
      this.notification.error('Failed to update task status');
      console.error('Error updating task:', error);
    }
  }

  async toggleFlag(task: TaskWithTracking) {
    if (!task.dbTask) return;

    const wasFlagged = task.isFlagged;

    // Toggle flag state
    task.isFlagged = !wasFlagged;

    try {
      // Update only isFlagged
      await this.taskService.updateTask(task.dbTask.id!, {
        isFlagged: task.isFlagged,
      });

      // Update the database task reference
      task.dbTask.isFlagged = task.isFlagged;

      this.notification.success(`Task ${task.isFlagged ? 'flagged' : 'unflagged'}`);

      // Update the database tasks signal with the new data
      const updatedTasks = this.databaseTasks().map((t) =>
        t.id === task.dbTask?.id ? { ...t, isFlagged: task.isFlagged } : t,
      );
      this.databaseTasks.set(updatedTasks);

      // Trigger reactivity by updating the phases signal
      this.updateProgress();
    } catch (error) {
      // Revert on error
      task.isFlagged = wasFlagged;
      this.notification.error('Failed to update task flag');
      console.error('Error updating task flag:', error);
    }
  }

  private updateProgress() {
    // Trigger recomputation of the signal by completely reloading the data
    // This ensures that all isFlagged properties are recalculated from database
    const currentTasks = this.databaseTasks();
    console.log('Updating progress - current tasks:', currentTasks.length);

    // Force a complete rebuild of the phases structure
    this.loadProjectDataFromTasks(currentTasks);
  }

  private loadProjectDataFromTasks(tasks: any[]) {
    // This is the same logic from loadProjectData but split out for reuse
    const tasksByStepId = new Map<string, any[]>();
    const unmappedTasks: any[] = [];

    tasks.forEach((task) => {
      if (task.stepId) {
        const stepTasks = tasksByStepId.get(task.stepId) || [];
        stepTasks.push(task);
        tasksByStepId.set(task.stepId, stepTasks);
      } else {
        unmappedTasks.push(task);
      }
    });

    // Use the already imported templates
    const phasesWithTracking: PhaseWithTracking[] = TASK_TEMPLATES.map((phaseTemplate: any) => {
      let phaseCompleted = 0;
      let phaseTotal = 0;

      const stepsWithTracking: StepWithTracking[] = phaseTemplate.steps.map((stepTemplate: any) => {
        let stepCompleted = 0;

        const dbTasksForStep = tasksByStepId.get(stepTemplate.id) || [];

        if (dbTasksForStep.length === 0 && unmappedTasks.length > 0) {
          stepTemplate.tasks.forEach((taskTemplate: any) => {
            const matchingTask = unmappedTasks.find((t) => t.name === taskTemplate.name);
            if (matchingTask) {
              dbTasksForStep.push(matchingTask);
            }
          });
        }

        let tasksWithTracking: TaskWithTracking[];

        if (dbTasksForStep.length > 0) {
          tasksWithTracking = dbTasksForStep
            .map((dbTask) => {
              const isCompleted = dbTask.status === 'completed';
              if (isCompleted) {
                stepCompleted++;
              }

              const matchingTemplate = stepTemplate.tasks.find((t: any) => t.name === dbTask.name);

              // Use isFlagged from database
              const isFlagged = dbTask.isFlagged === true;

              console.log(`Task ${dbTask.name}: isFlagged=${isFlagged}`);

              return {
                id: dbTask.id || matchingTemplate?.id || '',
                name: dbTask.name,
                description: dbTask.description || matchingTemplate?.description,
                stepId: dbTask.stepId || stepTemplate.id,
                phaseId: dbTask.phaseId,
                orderNo: dbTask.orderNo || matchingTemplate?.orderNo || 1,
                dbTask,
                isCompleted,
                isFlagged,
                assignedTo: dbTask.assignedTo,
                assignedToName: dbTask.assignedToName,
                progress: dbTask.completionPercentage || 0,
                priority: dbTask.priority || 'medium',
              };
            })
            .sort((a, b) => a.orderNo - b.orderNo);
        } else {
          tasksWithTracking = stepTemplate.tasks.map((taskTemplate: any) => ({
            ...taskTemplate,
            dbTask: undefined,
            isCompleted: false,
            isFlagged: false,
            assignedTo: undefined,
            assignedToName: undefined,
            progress: 0,
            priority: 'medium' as any,
          }));
        }

        const actualTaskCount = tasksWithTracking.length;
        phaseCompleted += stepCompleted;
        phaseTotal += actualTaskCount;

        return {
          ...stepTemplate,
          tasks: tasksWithTracking,
          taskCount: actualTaskCount,
          completedCount: stepCompleted,
          progress: actualTaskCount > 0 ? Math.round((stepCompleted / actualTaskCount) * 100) : 0,
        };
      });

      return {
        ...phaseTemplate,
        steps: stepsWithTracking,
        completedCount: phaseCompleted,
        totalTasks: phaseTotal,
        progress: phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0,
      };
    });

    this.phasesWithTracking.set(phasesWithTracking);
    console.log('Updated phases with tracking:', phasesWithTracking);
  }

  async reinitializeTasks() {
    const confirmDialog = confirm(
      'This will delete all existing tasks and recreate them from templates. Are you sure?',
    );
    if (!confirmDialog) return;

    try {
      this.loading.set(true);

      // Delete all existing tasks for this project
      const existingTasks = await firstValueFrom(
        this.taskService.getTasksByProject(this.projectId),
      );
      console.log(`Deleting ${existingTasks.length} existing tasks...`);

      for (const task of existingTasks) {
        if (task.id) {
          await this.taskService.deleteTask(task.id);
        }
      }

      // Reinitialize tasks from templates
      await this.taskService.initializeProjectTasksWithSteps(this.projectId);

      this.notification.success('Tasks reinitialized successfully');

      // Reload the data
      await this.loadProjectData();
    } catch (error) {
      console.error('Error reinitializing tasks:', error);
      this.notification.error('Failed to reinitialize tasks');
      this.loading.set(false);
    }
  }

  async flagTestTasks() {
    try {
      const phases = this.phasesWithTracking();
      let flaggedCount = 0;

      // Flag the first task in each of the first 3 phases
      for (let phaseIndex = 0; phaseIndex < Math.min(3, phases.length); phaseIndex++) {
        const phase = phases[phaseIndex];
        if (phase.steps.length > 0 && phase.steps[0].tasks.length > 0) {
          const task = phase.steps[0].tasks[0];
          if (task.dbTask && !task.isFlagged) {
            await this.toggleFlag(task);
            flaggedCount++;
          }
        }
      }

      this.notification.success(`Flagged ${flaggedCount} test tasks`);
      console.log(`Flagged ${flaggedCount} test tasks for filter testing`);
    } catch (error) {
      console.error('Error flagging test tasks:', error);
      this.notification.error('Failed to flag test tasks');
    }
  }

  async createMissingTasks() {
    try {
      this.loading.set(true);
      console.log('Creating missing tasks for project:', this.projectId);

      // Count tasks without database records
      const phases = this.phasesWithTracking();
      let missingCount = 0;
      phases.forEach((phase) => {
        phase.steps.forEach((step) => {
          step.tasks.forEach((task) => {
            if (!task.dbTask) {
              missingCount++;
            }
          });
        });
      });

      console.log(`Found ${missingCount} tasks without database records`);

      if (missingCount === 0) {
        this.notification.info('All tasks already exist in database');
        return;
      }

      await this.taskService.initializeProjectTasksWithSteps(this.projectId);
      this.notification.success(`Created ${missingCount} missing tasks`);

      // Reload the data to include the new tasks
      await this.loadProjectData();
    } catch (error) {
      console.error('Error creating missing tasks:', error);
      this.notification.error('Failed to create missing tasks');
    } finally {
      this.loading.set(false);
    }
  }
}
