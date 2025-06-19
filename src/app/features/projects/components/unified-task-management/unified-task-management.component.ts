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
import { Observable, map } from 'rxjs';

import {
  PhaseTemplate,
  StepTemplate,
  TaskTemplate,
  TASK_TEMPLATES,
} from '../../../tasks/models/task-template.model';
import { StaffMember } from '../../../staff/models/staff.model';
import { StaffService } from '../../../staff/services/staff.service';
import { NotificationService } from '../../../../core/services/notification.service';

interface ExtendedTaskTemplate extends TaskTemplate {
  isCompleted?: boolean;
  isFlagged?: boolean;
  assignedTo?: string;
  assignedToName?: string;
  progress?: number;
}

interface ExtendedStepTemplate extends StepTemplate {
  tasks: ExtendedTaskTemplate[];
  isCompleted?: boolean;
  isFlagged?: boolean;
  assignedTo?: string;
  assignedToName?: string;
  progress?: number;
}

interface ExtendedPhaseTemplate extends PhaseTemplate {
  steps: ExtendedStepTemplate[];
  isCompleted?: boolean;
  isFlagged?: boolean;
  assignedTo?: string;
  assignedToName?: string;
  progress?: number;
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
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Task Management</h1>
          <p class="subtitle">Manage all project phases, steps, and tasks in one place</p>
        </div>
      </div>

      <!-- Filter Bar -->
      <mat-card class="filter-card">
        <div class="filters-container">
          <div class="view-filters">
            <mat-button-toggle-group [value]="viewFilter()" (change)="setViewFilter($event.value)">
              <mat-button-toggle value="all">
                <mat-icon>list</mat-icon>
                <span>All Items</span>
              </mat-button-toggle>
              <mat-button-toggle value="uncompleted">
                <mat-icon>radio_button_unchecked</mat-icon>
                <span>Uncompleted</span>
              </mat-button-toggle>
              <mat-button-toggle value="flagged">
                <mat-icon>flag</mat-icon>
                <span>Flagged</span>
              </mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <mat-form-field appearance="outline" class="assignee-filter">
            <mat-label>Filter by Assignee</mat-label>
            <mat-select [value]="assigneeFilter()" (selectionChange)="setAssigneeFilter($event.value)">
              <mat-option value="all">All Assignees</mat-option>
              <mat-option value="unassigned">Unassigned</mat-option>
              <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
                {{ staff.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="filter-stats">
          <mat-icon>assessment</mat-icon>
          <span>Showing {{ getTotalFilteredTasks() }} items</span>
        </div>
      </mat-card>

      <!-- Task Templates by Phase -->
      <div class="phases-section">
        <mat-accordion multi="true" class="phases-accordion">
          <mat-expansion-panel
            *ngFor="let phase of filteredPhases(); trackBy: trackByPhase"
            [expanded]="shouldExpandPhase(phase)"
            class="phase-panel"
          >
            <mat-expansion-panel-header>
              <div class="phase-panel-content">
                <div class="phase-header">
                  <div class="phase-info">
                    <span class="phase-name">{{ phase.name }}</span>
                    <mat-chip class="phase-stats">
                      {{ phase.stepCount }} steps • {{ phase.totalTasks }} tasks
                    </mat-chip>
                  </div>
                  <div class="phase-actions" (click)="$event.stopPropagation()">
                    <mat-select
                      [(ngModel)]="phase.assignedTo"
                      (selectionChange)="updateAssignee('phase', phase, $event.value)"
                      placeholder="Assign to"
                      class="inline-select"
                    >
                      <mat-option [value]="null">Unassigned</mat-option>
                      <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
                        {{ staff.name }}
                      </mat-option>
                    </mat-select>
                    <button
                      mat-icon-button
                      (click)="toggleComplete('phase', phase)"
                      [matTooltip]="phase.isCompleted ? 'Mark as incomplete' : 'Mark as complete'"
                      class="action-button complete-button"
                      [class.completed]="phase.isCompleted"
                    >
                      <mat-icon>{{ phase.isCompleted ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      (click)="toggleFlag('phase', phase)"
                      [matTooltip]="phase.isFlagged ? 'Remove flag' : 'Flag this item'"
                      class="action-button flag-button"
                      [class.flagged]="phase.isFlagged"
                    >
                      <mat-icon>{{ phase.isFlagged ? 'flag' : 'outlined_flag' }}</mat-icon>
                    </button>
                  </div>
                </div>
                <div class="phase-description">
                  {{ phase.description }}
                  <span class="assignee-badge" *ngIf="phase.assignedToName">
                    <mat-icon>person</mat-icon>
                    {{ phase.assignedToName }}
                  </span>
                </div>
              </div>
            </mat-expansion-panel-header>

            <div class="phase-content">
              <!-- Steps within Phase -->
              <mat-accordion multi="true" class="steps-accordion">
                <mat-expansion-panel
                  *ngFor="let step of getFilteredStepsForPhase(phase); trackBy: trackByStep"
                  [expanded]="shouldExpandStep(step)"
                  class="step-panel"
                >
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <div class="step-header">
                        <div class="step-info">
                          <span class="step-name">{{ step.name }}</span>
                          <mat-chip class="step-count">{{ step.taskCount }} tasks</mat-chip>
                        </div>
                        <div class="step-actions" (click)="$event.stopPropagation()">
                          <mat-select
                            [(ngModel)]="step.assignedTo"
                            (selectionChange)="updateAssignee('step', step, $event.value)"
                            placeholder="Assign"
                            class="inline-select small"
                          >
                            <mat-option [value]="null">—</mat-option>
                            <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
                              {{ staff.name }}
                            </mat-option>
                          </mat-select>
                          <button
                            mat-icon-button
                            (click)="toggleComplete('step', step)"
                            [matTooltip]="step.isCompleted ? 'Mark as incomplete' : 'Mark as complete'"
                            class="action-button complete-button small"
                            [class.completed]="step.isCompleted"
                          >
                            <mat-icon>{{ step.isCompleted ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                          </button>
                          <button
                            mat-icon-button
                            (click)="toggleFlag('step', step)"
                            [matTooltip]="step.isFlagged ? 'Remove flag' : 'Flag this item'"
                            class="action-button flag-button small"
                            [class.flagged]="step.isFlagged"
                          >
                            <mat-icon>{{ step.isFlagged ? 'flag' : 'outlined_flag' }}</mat-icon>
                          </button>
                        </div>
                      </div>
                    </mat-panel-title>
                    <mat-panel-description class="step-description">
                      <span>{{ step.description }}</span>
                      <span class="assignee-badge small" *ngIf="step.assignedToName">
                        <mat-icon>person_outline</mat-icon>
                        {{ step.assignedToName }}
                      </span>
                    </mat-panel-description>
                  </mat-expansion-panel-header>

                  <div class="step-content">
                    <div class="tasks-list">
                      <div
                        *ngFor="let task of getFilteredTasksForStep(step); trackBy: trackByTask"
                        class="task-item"
                      >
                        <div class="task-number">{{ task.orderNo }}</div>
                        <div class="task-details">
                          <span class="task-name">{{ task.name }}</span>
                          <p *ngIf="task.description" class="task-description">
                            {{ task.description }}
                          </p>
                          <span class="assignee-badge tiny" *ngIf="task.assignedToName">
                            <mat-icon>person</mat-icon>
                            {{ task.assignedToName }}
                          </span>
                        </div>
                        <div class="task-actions">
                          <mat-select
                            [(ngModel)]="task.assignedTo"
                            (selectionChange)="updateAssignee('task', task, $event.value)"
                            placeholder="Assign"
                            class="inline-select tiny"
                          >
                            <mat-option [value]="null">—</mat-option>
                            <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
                              {{ staff.name }}
                            </mat-option>
                          </mat-select>
                          <button
                            mat-icon-button
                            (click)="toggleComplete('task', task)"
                            [matTooltip]="task.isCompleted ? 'Mark as incomplete' : 'Mark as complete'"
                            class="action-button complete-button tiny"
                            [class.completed]="task.isCompleted"
                          >
                            <mat-icon>{{ task.isCompleted ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                          </button>
                          <button
                            mat-icon-button
                            (click)="toggleFlag('task', task)"
                            [matTooltip]="task.isFlagged ? 'Remove flag' : 'Flag this item'"
                            class="action-button flag-button tiny"
                            [class.flagged]="task.isFlagged"
                          >
                            <mat-icon>{{ task.isFlagged ? 'flag' : 'outlined_flag' }}</mat-icon>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-expansion-panel>
              </mat-accordion>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      </div>
    </div>
  `,
  styles: [
    `
      /* Container following theme standards */
      .unified-task-management {
        max-width: 1280px;
        margin: 0 auto;
        padding: 40px 24px;
      }

      /* Page Header following ff-page-header pattern */
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 48px;
      }

      .header-content {
        flex: 1;
      }

      .page-header h1 {
        font-size: 32px;
        font-weight: 300;
        color: rgb(var(--ff-foreground));
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
      }

      .subtitle {
        font-size: 18px;
        color: rgb(var(--ff-muted-foreground));
        font-weight: 400;
        margin: 0;
      }

      /* Filter Card following Material overrides */
      .filter-card {
        border-radius: var(--ff-radius) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
        border: 1px solid rgb(var(--ff-border)) !important;
        background-color: rgb(var(--ff-card)) !important;
        margin-bottom: 24px;
        padding: 24px !important;
      }

      .filters-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 24px;
        flex-wrap: wrap;
      }

      .view-filters {
        flex: 1;
      }

      .view-filters mat-button-toggle-group {
        border: 1px solid rgb(var(--ff-border));
        border-radius: 6px;
        background-color: rgb(var(--ff-background));
      }

      .view-filters mat-button-toggle {
        border: none;
        padding: 0 16px;
        height: 40px;
      }

      .view-filters mat-button-toggle span {
        margin-left: 8px;
        font-weight: 500;
      }

      .assignee-filter {
        width: 250px;
      }

      .filter-stats {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgb(var(--ff-border));
        font-size: 14px;
        color: rgb(var(--ff-muted-foreground));
      }

      .filter-stats mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      /* Phases Section - matching tasks-page */
      .phases-section {
        margin-bottom: 48px;
      }

      .phases-accordion {
        display: block;
      }

      /* Phase Panel using theme variables */
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

      .phase-panel ::ng-deep .mat-expansion-panel-header-title {
        margin: 0 !important;
        flex: 1 !important;
      }

      .phase-panel ::ng-deep .mat-expansion-panel-header-description {
        display: none !important;
      }

      .phase-panel-content {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .phase-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 24px;
        padding: 8px 0;
      }

      .phase-info {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;
        min-width: 0;
      }

      .phase-name {
        font-size: 18px;
        font-weight: 500;
        color: rgb(var(--ff-foreground));
        white-space: nowrap;
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

      .phase-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }

      .phase-description {
        color: rgb(var(--ff-muted-foreground));
        font-size: 14px;
        line-height: 1.5;
        margin-top: 12px;
        padding-right: 24px;
      }

      .phase-content {
        padding: 24px;
        background-color: rgb(var(--ff-muted) / 0.3);
      }

      /* Steps Accordion - matching tasks-page */
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
        gap: 12px;
      }

      .step-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      .step-name {
        font-size: 16px;
        font-weight: 500;
        color: rgb(var(--ff-foreground));
      }

      .step-count {
        background-color: rgb(var(--ff-muted)) !important;
        color: rgb(var(--ff-muted-foreground)) !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        height: 20px !important;
        padding: 0 8px !important;
        border-radius: 10px !important;
      }

      .step-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .step-content {
        padding: 20px;
        background-color: rgb(var(--ff-muted) / 0.2);
      }

      /* Tasks List - matching tasks-page */
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
      }

      .task-item:hover {
        background-color: rgb(var(--ff-muted) / 0.5);
        border-color: rgb(var(--ff-primary));
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
        gap: 4px;
        flex-shrink: 0;
      }

      /* Inline Select Fields */
      .inline-select {
        width: 140px;
        height: 36px;
        padding: 0 12px;
        border: 1px solid rgb(var(--ff-border));
        border-radius: 6px;
        background-color: rgb(var(--ff-background));
        font-size: 13px;
        color: rgb(var(--ff-foreground));
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .inline-select:hover {
        border-color: rgb(var(--ff-primary));
      }

      .inline-select:focus {
        outline: 2px solid rgb(var(--ff-ring));
        outline-offset: 2px;
      }

      .inline-select.small {
        width: 120px;
        height: 32px;
        font-size: 12px;
      }

      .inline-select.tiny {
        width: 100px;
        height: 28px;
        font-size: 12px;
        padding: 0 8px;
      }

      /* Action Buttons */
      .action-button {
        color: rgb(var(--ff-muted-foreground));
        transition: all 0.2s ease;
        width: 36px;
        height: 36px;
      }

      .action-button:hover {
        background-color: rgb(var(--ff-muted) / 0.5);
      }

      .action-button.small {
        width: 32px;
        height: 32px;
      }

      .action-button.tiny {
        width: 28px;
        height: 28px;
      }

      .action-button mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      .action-button.small mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .action-button.tiny mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .complete-button.completed {
        color: rgb(var(--ff-success));
      }

      .flag-button.flagged {
        color: rgb(var(--ff-destructive));
      }

      /* Assignee Badge */
      .assignee-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background-color: rgb(var(--ff-muted));
        border-radius: 12px;
        font-size: 12px;
        color: rgb(var(--ff-muted-foreground));
      }

      .assignee-badge mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      .assignee-badge.small {
        font-size: 11px;
        padding: 1px 6px;
      }

      .assignee-badge.small mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }

      .assignee-badge.tiny {
        font-size: 11px;
        padding: 0 6px;
        margin-top: 4px;
      }

      .assignee-badge.tiny mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }

      /* Responsive following theme standards */
      @media (max-width: 768px) {
        .unified-task-management {
          padding: 24px 16px;
        }

        .page-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }

        .page-header h1 {
          font-size: 24px;
        }

        .subtitle {
          font-size: 16px;
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

        .steps-accordion {
          margin-left: 0;
        }

        .filters-container {
          flex-direction: column;
          align-items: stretch;
        }

        .view-filters {
          width: 100%;
        }

        .assignee-filter {
          width: 100%;
        }

        .phase-actions {
          width: 100%;
          justify-content: flex-end;
        }

        .step-actions {
          width: 100%;
          justify-content: flex-end;
        }

        .task-item {
          flex-direction: column;
          gap: 12px;
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

  staff$!: Observable<StaffMember[]>;
  staffMap = new Map<string, StaffMember>();

  viewFilter = signal<ViewFilter>('all');
  assigneeFilter = signal<string>('all');

  // Search and filter functionality
  searchTerm = signal('');
  selectedPhase = signal('');

  // All phases with their steps and tasks - extended with our custom fields
  allPhases = signal<ExtendedPhaseTemplate[]>([]);

  // Filtered phases based on search and filters
  filteredPhases = computed(() => {
    let phases = this.allPhases();
    const term = this.searchTerm().toLowerCase();
    const phaseFilter = this.selectedPhase();
    const viewFilterValue = this.viewFilter();
    const assigneeFilterValue = this.assigneeFilter();

    // Filter by view filter
    if (viewFilterValue === 'uncompleted') {
      phases = phases
        .map((phase) => ({
          ...phase,
          steps: phase.steps
            .map((step) => ({
              ...step,
              tasks: step.tasks.filter((task) => !task.isCompleted),
            }))
            .filter((step) => step.tasks.length > 0 || !step.isCompleted),
        }))
        .filter((phase) => phase.steps.length > 0 || !phase.isCompleted);
    } else if (viewFilterValue === 'flagged') {
      phases = phases
        .map((phase) => ({
          ...phase,
          steps: phase.steps
            .map((step) => ({
              ...step,
              tasks: step.tasks.filter((task) => task.isFlagged),
            }))
            .filter((step) => step.tasks.length > 0 || step.isFlagged),
        }))
        .filter((phase) => phase.steps.length > 0 || phase.isFlagged);
    }

    // Filter by assignee
    if (assigneeFilterValue !== 'all') {
      const checkAssignee = (item: any) => {
        if (assigneeFilterValue === 'unassigned') {
          return !item.assignedTo;
        }
        return item.assignedTo === assigneeFilterValue;
      };

      phases = phases
        .map((phase) => ({
          ...phase,
          steps: phase.steps
            .map((step) => ({
              ...step,
              tasks: step.tasks.filter((task) => checkAssignee(task)),
            }))
            .filter((step) => step.tasks.length > 0 || checkAssignee(step)),
        }))
        .filter((phase) => phase.steps.length > 0 || checkAssignee(phase));
    }

    // Filter by selected phase
    if (phaseFilter) {
      phases = phases.filter((phase) => phase.id === phaseFilter);
    }

    // If there's a search term, filter phases and their content
    if (term) {
      phases = phases
        .map((phase) => ({
          ...phase,
          steps: phase.steps
            .map((step) => ({
              ...step,
              tasks: step.tasks.filter(
                (task) =>
                  task.name.toLowerCase().includes(term) ||
                  task.description?.toLowerCase().includes(term),
              ),
            }))
            .filter((step) => step.tasks.length > 0),
        }))
        .filter((phase) => phase.steps.length > 0);
    }

    return phases;
  });

  ngOnInit() {
    this.loadStaff();
    this.loadTaskTemplates();
  }

  private loadStaff() {
    this.staff$ = this.staffService.getStaff();
    this.staff$.subscribe((staff) => {
      this.staffMap = new Map(staff.map((s) => [s.id, s]));
    });
  }

  private loadTaskTemplates() {
    // Load TASK_TEMPLATES and extend with our custom fields
    const extendedPhases: ExtendedPhaseTemplate[] = TASK_TEMPLATES.map((phase) => ({
      ...phase,
      isCompleted: false,
      isFlagged: false,
      assignedTo: undefined,
      assignedToName: undefined,
      progress: 0,
      steps: phase.steps.map((step) => ({
        ...step,
        isCompleted: false,
        isFlagged: false,
        assignedTo: undefined,
        assignedToName: undefined,
        progress: 0,
        tasks: step.tasks.map((task) => ({
          ...task,
          isCompleted: false,
          isFlagged: false,
          assignedTo: undefined,
          assignedToName: undefined,
          progress: 0,
        })),
      })),
    }));

    this.allPhases.set(extendedPhases);
  }

  setViewFilter(value: ViewFilter) {
    this.viewFilter.set(value);
  }

  setAssigneeFilter(value: string) {
    this.assigneeFilter.set(value);
  }

  refreshData() {
    // In a real implementation, this would reload from the database
    this.notification.info('Data refreshed');
  }

  shouldExpandPhase(phase: ExtendedPhaseTemplate): boolean {
    // Expand if there's a search term or phase filter
    return !!this.searchTerm() || !!this.selectedPhase();
  }

  shouldExpandStep(step: ExtendedStepTemplate): boolean {
    // Expand if there's a search term
    return !!this.searchTerm();
  }

  getFilteredStepsForPhase(phase: ExtendedPhaseTemplate): ExtendedStepTemplate[] {
    const filteredPhase = this.filteredPhases().find((p) => p.id === phase.id);
    return filteredPhase?.steps || [];
  }

  getFilteredTasksForStep(step: ExtendedStepTemplate): ExtendedTaskTemplate[] {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return step.tasks;
    }
    return step.tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(term) || task.description?.toLowerCase().includes(term),
    );
  }

  getTotalFilteredTasks(): number {
    return this.filteredPhases().reduce(
      (total, phase) =>
        total +
        phase.steps.reduce(
          (stepTotal, step) => stepTotal + this.getFilteredTasksForStep(step).length,
          0,
        ),
      0,
    );
  }

  trackByPhase(index: number, phase: ExtendedPhaseTemplate): string {
    return phase.id;
  }

  trackByStep(index: number, step: ExtendedStepTemplate): string {
    return step.id;
  }

  trackByTask(index: number, task: ExtendedTaskTemplate): string {
    return task.id;
  }

  updateAssignee(type: 'phase' | 'step' | 'task', item: any, assigneeId: string | null) {
    item.assignedTo = assigneeId || undefined;
    item.assignedToName = assigneeId ? this.staffMap.get(assigneeId)?.name : undefined;

    // In a real implementation, this would save to the database
    this.notification.success(`${type} assignee updated`);
  }

  toggleComplete(type: 'phase' | 'step' | 'task', item: any) {
    item.isCompleted = !item.isCompleted;
    item.progress = item.isCompleted ? 100 : 0;

    // In a real implementation, this would save to the database
    this.notification.success(`${type} marked as ${item.isCompleted ? 'completed' : 'incomplete'}`);
  }

  toggleFlag(type: 'phase' | 'step' | 'task', item: any) {
    item.isFlagged = !item.isFlagged;

    // In a real implementation, this would save to the database
    this.notification.info(`${type} ${item.isFlagged ? 'flagged' : 'unflagged'}`);
  }
}
