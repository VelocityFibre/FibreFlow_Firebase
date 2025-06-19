import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  PhaseTemplate,
  StepTemplate,
  TaskTemplate,
  TASK_TEMPLATES,
} from '../../models/task-template.model';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatBadgeModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="task-templates-page">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <button mat-button (click)="navigateHome()">
          <mat-icon>home</mat-icon>
          Home
        </button>
        <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
        <span class="breadcrumb-current">Tasks</span>
      </nav>

      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Project Task Templates</h1>
          <p class="subtitle">Complete overview of all Velocity project tasks organized by step</p>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <mat-card class="search-card">
          <mat-card-content>
            <div class="search-filters">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Search tasks</mat-label>
                <input
                  matInput
                  [(ngModel)]="searchTerm"
                  (ngModelChange)="onSearchChange()"
                  placeholder="Search across all tasks..."
                />
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Filter by phase</mat-label>
                <mat-select [(ngModel)]="selectedPhase" (ngModelChange)="onFilterChange()">
                  <mat-option value="">All Phases</mat-option>
                  <mat-option *ngFor="let phase of allPhases()" [value]="phase.id">
                    {{ phase.name }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="search-stats" *ngIf="searchTerm || selectedPhase">
              <span class="stats-item">
                <mat-icon>search</mat-icon>
                {{ getTotalFilteredTasks() }} tasks found
              </span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Task Templates by Phase -->
      <div class="phases-section">
        <mat-accordion multi="true">
          <mat-expansion-panel
            *ngFor="let phase of filteredPhases(); trackBy: trackByPhase"
            [expanded]="shouldExpandPhase(phase)"
            class="phase-panel"
          >
            <mat-expansion-panel-header>
              <mat-panel-title>
                <div class="phase-header">
                  <span class="phase-name">{{ phase.name }}</span>
                  <mat-chip class="phase-stats">
                    {{ phase.stepCount }} steps • {{ phase.totalTasks }} tasks
                  </mat-chip>
                </div>
              </mat-panel-title>
              <mat-panel-description>
                {{ phase.description }}
              </mat-panel-description>
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
                        <span class="step-name">{{ step.name }}</span>
                        <mat-chip class="step-count">{{ step.taskCount }} tasks</mat-chip>
                      </div>
                    </mat-panel-title>
                    <mat-panel-description>
                      {{ step.description }}
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
      .task-templates-page {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
        color: #6b7280;
      }

      .breadcrumb-separator {
        margin: 0 8px;
        font-size: 18px;
      }

      .breadcrumb-current {
        font-weight: 500;
        color: #1f2937;
      }

      .page-header {
        margin-bottom: 32px;
      }

      .page-header h1 {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
        color: #1f2937;
      }

      .subtitle {
        color: #6b7280;
        margin: 8px 0 0 0;
        font-size: 16px;
      }

      .search-section {
        margin-bottom: 32px;
      }

      .search-card {
        border-radius: 12px;
      }

      .search-filters {
        display: flex;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
      }

      .search-field {
        flex: 1;
        min-width: 300px;
      }

      .filter-field {
        min-width: 200px;
      }

      .search-stats {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }

      .stats-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6b7280;
        font-size: 14px;
      }

      .stats-item mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .phases-section {
        margin-bottom: 32px;
      }

      .phase-panel {
        border-radius: 12px !important;
        margin-bottom: 16px;
        border: 1px solid #e5e7eb !important;
      }

      .phase-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 16px;
      }

      .phase-name {
        font-size: 16px;
        font-weight: 500;
        color: #1f2937;
        flex: 1;
      }

      .phase-stats {
        background-color: rgba(var(--ff-primary-rgb), 0.1) !important;
        color: rgb(var(--ff-primary-rgb)) !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        flex-shrink: 0;
      }

      .phase-content {
        padding: 16px 0;
      }

      .steps-accordion {
        margin-left: 16px;
      }

      .step-panel {
        border-radius: 8px !important;
        margin-bottom: 12px;
        border: 1px solid #f3f4f6 !important;
        background-color: #fafafa !important;
      }

      .step-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 12px;
      }

      .step-name {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        flex: 1;
      }

      .step-count {
        background-color: rgba(var(--ff-primary-rgb), 0.15) !important;
        color: rgb(var(--ff-primary-rgb)) !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        flex-shrink: 0;
      }

      .step-content {
        padding: 16px 0;
      }

      .tasks-list {
        display: grid;
        gap: 12px;
      }

      .task-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        background-color: #ffffff;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        transition: all 0.2s ease;
      }

      .task-item:hover {
        background-color: #f9fafb;
        border-color: rgb(var(--ff-primary-rgb));
        transform: translateX(2px);
      }

      .task-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background-color: rgb(var(--ff-primary-rgb));
        color: white;
        border-radius: 50%;
        font-weight: 600;
        font-size: 12px;
        flex-shrink: 0;
      }

      .task-details {
        flex: 1;
      }

      .task-name {
        font-size: 14px;
        font-weight: 500;
        color: #1f2937;
        line-height: 1.4;
      }

      .task-description {
        margin: 4px 0 0 0;
        color: #6b7280;
        font-size: 13px;
        line-height: 1.4;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .task-templates-page {
          padding: 16px;
        }

        .page-header h1 {
          font-size: 24px;
        }

        .search-filters {
          flex-direction: column;
          align-items: stretch;
        }

        .search-field,
        .filter-field {
          min-width: unset;
          width: 100%;
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
      }
    `,
  ],
})
export class TasksPageComponent implements OnInit {
  private router = inject(Router);

  // Search and filter functionality
  searchTerm = signal('');
  selectedPhase = signal('');

  // All phases with their steps and tasks
  allPhases = signal<PhaseTemplate[]>(TASK_TEMPLATES);

  // Filtered phases based on search and filters
  filteredPhases = computed(() => {
    const phases = this.allPhases();
    const term = this.searchTerm().toLowerCase();
    const phaseFilter = this.selectedPhase();

    let filteredPhases = phases;

    // Filter by selected phase
    if (phaseFilter) {
      filteredPhases = phases.filter((phase) => phase.id === phaseFilter);
    }

    // If there's a search term, filter phases and their content
    if (term) {
      filteredPhases = filteredPhases
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

    return filteredPhases;
  });

  ngOnInit() {
    // Component initialization
  }

  onSearchChange() {
    // Trigger computed signal recalculation
  }

  onFilterChange() {
    // Trigger computed signal recalculation
  }

  navigateHome() {
    this.router.navigate(['/']);
  }

  shouldExpandPhase(phase: PhaseTemplate): boolean {
    // Expand if there's a search term or phase filter
    return !!this.searchTerm() || !!this.selectedPhase();
  }

  shouldExpandStep(step: StepTemplate): boolean {
    // Expand if there's a search term
    return !!this.searchTerm();
  }

  getFilteredStepsForPhase(phase: PhaseTemplate): StepTemplate[] {
    const filteredPhase = this.filteredPhases().find((p) => p.id === phase.id);
    return filteredPhase?.steps || [];
  }

  getFilteredTasksForStep(step: StepTemplate): TaskTemplate[] {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return step.tasks;
    }
    return step.tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(term) || task.description?.toLowerCase().includes(term),
    );
  }

  getTotalPhases(): number {
    return this.allPhases().length;
  }

  getTotalSteps(): number {
    return this.allPhases().reduce((total, phase) => total + phase.stepCount, 0);
  }

  getTotalTasks(): number {
    return this.allPhases().reduce((total, phase) => total + phase.totalTasks, 0);
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

  trackByPhase(index: number, phase: PhaseTemplate): string {
    return phase.id;
  }

  trackByStep(index: number, step: StepTemplate): string {
    return step.id;
  }

  trackByTask(index: number, task: TaskTemplate): string {
    return task.id;
  }
}
