import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedMaterialModule } from '../../../../shared/modules/shared-material.module';
import { MatExpansionModule } from '@angular/material/expansion';
import { StepService } from '../../../../core/services/step.service';
import { PhaseService } from '../../../../core/services/phase.service';
import { Step, StepStatus, StepWithPhase } from '../../../../core/models/step.model';
import { Phase } from '../../../../core/models/phase.model';
import { MatDialog } from '@angular/material/dialog';
import { Observable, combineLatest, map } from 'rxjs';
import { StepFormDialogComponent } from './step-form-dialog/step-form-dialog.component';

interface PhaseWithSteps {
  phase: Phase;
  steps: Step[];
  progress: number;
}

@Component({
  selector: 'app-project-steps',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMaterialModule, MatExpansionModule],
  template: `
    <div class="steps-container">
      <div class="header-section">
        <h2>Project Steps</h2>
        <button mat-raised-button color="primary" (click)="addStep()">
          <mat-icon>add</mat-icon>
          Add Step
        </button>
      </div>

      <div class="phases-accordion" *ngIf="phasesWithSteps$ | async as phasesWithSteps">
        <mat-accordion multi>
          <mat-expansion-panel *ngFor="let phaseData of phasesWithSteps" [expanded]="true">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <div class="phase-header">
                  <span class="phase-name">{{ phaseData.phase.name }}</span>
                  <mat-chip [color]="getPhaseColor(phaseData.phase.status)">
                    {{ phaseData.phase.status }}
                  </mat-chip>
                </div>
              </mat-panel-title>
              <mat-panel-description>
                <div class="phase-stats">
                  <span>{{ phaseData.steps.length }} steps</span>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="phaseData.progress"
                    class="phase-progress"
                  >
                  </mat-progress-bar>
                  <span>{{ phaseData.progress }}%</span>
                </div>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="steps-list">
              <div *ngIf="phaseData.steps.length === 0" class="no-steps">
                <p>No steps defined for this phase</p>
                <button mat-stroked-button color="primary" (click)="addStep(phaseData.phase)">
                  <mat-icon>add</mat-icon>
                  Add First Step
                </button>
              </div>

              <mat-card *ngFor="let step of phaseData.steps; let i = index" class="step-card">
                <mat-card-header>
                  <mat-card-title>
                    <div class="step-title">
                      <span class="step-number">Step {{ i + 1 }}</span>
                      <span class="step-name">{{ step.name }}</span>
                    </div>
                  </mat-card-title>
                  <mat-card-subtitle>
                    <mat-chip-set>
                      <mat-chip [color]="getStatusColor(step.status)" selected>
                        {{ step.status }}
                      </mat-chip>
                    </mat-chip-set>
                  </mat-card-subtitle>
                </mat-card-header>

                <mat-card-content>
                  <p *ngIf="step.description" class="step-description">{{ step.description }}</p>

                  <div class="step-details">
                    <div class="detail-row" *ngIf="step.startDate || step.endDate">
                      <mat-icon>calendar_today</mat-icon>
                      <span>
                        {{ step.startDate | date: 'mediumDate' }}
                        <span *ngIf="step.endDate"> - {{ step.endDate | date: 'mediumDate' }}</span>
                      </span>
                    </div>

                    <div class="detail-row" *ngIf="step.assignedTo && step.assignedTo.length > 0">
                      <mat-icon>people</mat-icon>
                      <span>{{ step.assignedTo.length }} assigned</span>
                    </div>

                    <div class="detail-row">
                      <mat-icon>trending_up</mat-icon>
                      <span>Progress: {{ step.progress }}%</span>
                    </div>
                  </div>

                  <mat-progress-bar
                    mode="determinate"
                    [value]="step.progress"
                    class="step-progress"
                  >
                  </mat-progress-bar>

                  <div
                    class="deliverables"
                    *ngIf="step.deliverables && step.deliverables.length > 0"
                  >
                    <h4>Deliverables:</h4>
                    <mat-chip-set>
                      <mat-chip *ngFor="let deliverable of step.deliverables">
                        {{ deliverable }}
                      </mat-chip>
                    </mat-chip-set>
                  </div>
                </mat-card-content>

                <mat-card-actions align="end">
                  <button mat-button (click)="editStep(step)">
                    <mat-icon>edit</mat-icon>
                    Edit
                  </button>
                  <button mat-button (click)="updateStepProgress(step)">
                    <mat-icon>update</mat-icon>
                    Update Progress
                  </button>
                  <button mat-button color="warn" (click)="deleteStep(step)">
                    <mat-icon>delete</mat-icon>
                    Delete
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      </div>

      <div class="empty-state" *ngIf="!(phasesWithSteps$ | async)?.length">
        <mat-icon>assignment</mat-icon>
        <h3>No phases defined</h3>
        <p>Please define phases for this project first</p>
      </div>
    </div>
  `,
  styles: [
    `
      .steps-container {
        padding: 24px;
      }

      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .header-section h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
      }

      .phases-accordion {
        max-width: 1200px;
        margin: 0 auto;
      }

      .phase-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .phase-name {
        font-weight: 500;
      }

      .phase-stats {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .phase-progress {
        width: 100px;
      }

      .steps-list {
        padding: 16px;
      }

      .no-steps {
        text-align: center;
        padding: 32px;
        color: rgba(0, 0, 0, 0.6);
      }

      .step-card {
        margin-bottom: 16px;
        transition: box-shadow 0.3s ease;
      }

      .step-card:hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }

      .step-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .step-number {
        color: rgba(0, 0, 0, 0.6);
        font-size: 14px;
      }

      .step-name {
        font-weight: 500;
      }

      .step-description {
        margin: 16px 0;
        color: rgba(0, 0, 0, 0.8);
      }

      .step-details {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        margin: 16px 0;
      }

      .detail-row {
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(0, 0, 0, 0.6);
      }

      .detail-row mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .step-progress {
        margin: 16px 0;
      }

      .deliverables {
        margin-top: 16px;
      }

      .deliverables h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 500;
      }

      .empty-state {
        text-align: center;
        padding: 64px;
        color: rgba(0, 0, 0, 0.6);
      }

      .empty-state mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
      }

      mat-chip {
        font-size: 12px;
      }

      @media (max-width: 768px) {
        .steps-container {
          padding: 16px;
        }

        .phase-stats {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .step-details {
          flex-direction: column;
          gap: 12px;
        }
      }
    `,
  ],
})
export class ProjectStepsComponent implements OnInit {
  @Input({ required: true }) projectId!: string;

  private stepService = inject(StepService);
  private phaseService = inject(PhaseService);
  private dialog = inject(MatDialog);

  phasesWithSteps$: Observable<PhaseWithSteps[]> = new Observable();

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.phasesWithSteps$ = combineLatest([
      this.phaseService.getByProject(this.projectId),
      this.stepService.getStepsByProject(this.projectId),
      this.stepService.getStepProgressByPhase(this.projectId),
    ]).pipe(
      map(([phases, steps, progressMap]) => {
        return phases.map((phase) => {
          const phaseSteps = steps.filter((step) => step.phaseId === phase.id);
          const progress = progressMap.get(phase.id!) || 0;

          return {
            phase,
            steps: phaseSteps.sort((a: Step, b: Step) => a.orderNo - b.orderNo),
            progress,
          };
        });
      }),
    );
  }

  addStep(phase?: Phase) {
    const dialogRef = this.dialog.open(StepFormDialogComponent, {
      width: '600px',
      data: {
        projectId: this.projectId,
        phaseId: phase?.id,
        phases: this.phaseService.getByProject(this.projectId),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }

  editStep(step: Step) {
    const dialogRef = this.dialog.open(StepFormDialogComponent, {
      width: '600px',
      data: {
        step,
        projectId: this.projectId,
        phases: this.phaseService.getByProject(this.projectId),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }

  updateStepProgress(step: Step) {
    const newProgress = prompt('Enter progress percentage (0-100):', step.progress.toString());
    if (newProgress !== null) {
      const progress = parseInt(newProgress, 10);
      if (!isNaN(progress) && progress >= 0 && progress <= 100) {
        this.stepService.updateStepProgress(step.id!, progress).subscribe(() => {
          this.loadData();
        });
      }
    }
  }

  deleteStep(step: Step) {
    if (confirm(`Are you sure you want to delete step "${step.name}"?`)) {
      this.stepService.deleteStep(step.id!).subscribe(() => {
        this.loadData();
      });
    }
  }

  getStatusColor(status: StepStatus): string {
    switch (status) {
      case StepStatus.COMPLETED:
        return 'primary';
      case StepStatus.IN_PROGRESS:
        return 'accent';
      case StepStatus.BLOCKED:
        return 'warn';
      default:
        return '';
    }
  }

  getPhaseColor(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'primary';
      case 'ACTIVE':
        return 'accent';
      case 'BLOCKED':
        return 'warn';
      default:
        return '';
    }
  }
}

