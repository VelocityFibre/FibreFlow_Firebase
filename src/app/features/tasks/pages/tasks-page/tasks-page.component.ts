import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
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
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatExpansionModule,
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

      <!-- Task Templates by Phase -->
      <div class="phases-section">
        <mat-accordion multi="true">
          <mat-expansion-panel
            *ngFor="let phase of allPhases(); trackBy: trackByPhase"
            [expanded]="false"
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
                  *ngFor="let step of phase.steps; trackBy: trackByStep"
                  [expanded]="false"
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
                      <div *ngFor="let task of step.tasks; trackBy: trackByTask" class="task-item">
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
      /* Container following theme standards */
      .task-templates-page {
        max-width: 1280px;
        margin: 0 auto;
        padding: 40px 24px;
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
        color: rgb(var(--ff-muted-foreground));
      }

      .breadcrumb-separator {
        margin: 0 8px;
        font-size: 18px;
      }

      .breadcrumb-current {
        font-weight: 500;
        color: rgb(var(--ff-foreground));
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

      /* Phases Section with improved spacing */
      .phases-section {
        margin-bottom: 48px;
      }

      /* Phase Panel with better vertical spacing */
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

      /* Steps with improved spacing */
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

      /* Tasks with improved spacing */
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

      /* Responsive following theme standards */
      @media (max-width: 768px) {
        .task-templates-page {
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

        .task-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
        }
      }
    `,
  ],
})
export class TasksPageComponent implements OnInit {
  private router = inject(Router);

  // All phases with their steps and tasks
  allPhases = signal<PhaseTemplate[]>(TASK_TEMPLATES);

  ngOnInit() {
    // Component initialization
  }

  navigateHome() {
    this.router.navigate(['/']);
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
