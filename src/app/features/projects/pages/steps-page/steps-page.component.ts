import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SharedMaterialModule } from '../../../../shared/modules/shared-material.module';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';
import { StepService } from '../../../../core/services/step.service';
import { ProjectService } from '../../../../core/services/project.service';
import { PhaseService } from '../../../../core/services/phase.service';
import { Step, StepStatus, StepWithPhase } from '../../../../core/models/step.model';
import { Project } from '../../../../core/models/project.model';
import { Phase } from '../../../../core/models/phase.model';
import { StepFormDialogComponent } from '../../components/steps/step-form-dialog/step-form-dialog.component';
import { Observable, combineLatest, map, switchMap, of } from 'rxjs';

interface StepWithProjectPhase extends StepWithPhase {
  projectName?: string;
  projectCode?: string;
}

interface FilteredStepsData {
  steps: StepWithProjectPhase[];
  projects: Project[];
  phases: Phase[];
}

@Component({
  selector: 'app-steps-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMaterialModule, MatExpansionModule],
  template: `
    <div class="steps-page-container">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h1>Steps Management</h1>
          <p class="header-subtitle">Manage project steps across all projects</p>
        </div>
        <button mat-raised-button color="primary" (click)="addStep()">
          <mat-icon>add</mat-icon>
          Add Step
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <mat-card class="filters-card">
          <mat-card-content>
            <div class="filters-grid">
              <mat-form-field appearance="outline">
                <mat-label>Project</mat-label>
                <mat-select [(ngModel)]="selectedProjectId" (ngModelChange)="onFiltersChange()">
                  <mat-option value="">All Projects</mat-option>
                  <mat-option *ngFor="let project of filteredData()?.projects" [value]="project.id">
                    {{ project.projectCode }} - {{ project.name }}
                  </mat-option>
                </mat-select>
              </mat-form-field>


              <mat-form-field appearance="outline">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="selectedStatus" (ngModelChange)="onFiltersChange()">
                  <mat-option value="">All Statuses</mat-option>
                  <mat-option value="PENDING">Pending</mat-option>
                  <mat-option value="IN_PROGRESS">In Progress</mat-option>
                  <mat-option value="COMPLETED">Completed</mat-option>
                  <mat-option value="BLOCKED">Blocked</mat-option>
                  <mat-option value="ON_HOLD">On Hold</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Search</mat-label>
                <input matInput [(ngModel)]="searchTerm" (ngModelChange)="onFiltersChange()" 
                       placeholder="Search steps...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
            </div>

            <div class="filter-stats" *ngIf="filteredSteps().length > 0">
              <span class="stats-item">
                <mat-icon>assignment</mat-icon>
                {{ filteredSteps().length }} steps found
              </span>
              <span class="stats-item">
                <mat-icon>trending_up</mat-icon>
                {{ calculateOverallProgress() }}% average progress
              </span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Steps List -->
      <div class="steps-content" *ngIf="filteredData() as data">
        <div *ngIf="filteredSteps().length === 0 && !loading()" class="empty-state">
          <mat-icon>assignment</mat-icon>
          <h3>No steps found</h3>
          <p>Try adjusting your filters or create a new step</p>
          <button mat-raised-button color="primary" (click)="addStep()">
            <mat-icon>add</mat-icon>
            Create First Step
          </button>
        </div>

        <div *ngIf="loading()" class="loading-state">
          <mat-spinner></mat-spinner>
          <p>Loading steps...</p>
        </div>

        <div *ngIf="filteredSteps().length > 0" class="steps-grid">
          <mat-card *ngFor="let step of filteredSteps(); trackBy: trackByStep" class="step-card">
            <mat-card-header>
              <mat-card-title>
                <div class="step-title-section">
                  <span class="step-name">{{ step.name }}</span>
                  <mat-chip [color]="getStatusColor(step.status)" selected>
                    {{ step.status }}
                  </mat-chip>
                </div>
              </mat-card-title>
              <mat-card-subtitle>
                <div class="step-meta">
                  <span class="project-info">
                    <mat-icon>folder</mat-icon>
                    {{ step.projectCode }} - {{ step.projectName }}
                  </span>
                  <span class="phase-info">
                    <mat-icon>flag</mat-icon>
                    {{ step.phaseName }}
                  </span>
                </div>
              </mat-card-subtitle>
            </mat-card-header>

            <mat-card-content>
              <p *ngIf="step.description" class="step-description">{{ step.description }}</p>

              <div class="step-details">
                <div class="detail-row" *ngIf="step.startDate || step.endDate">
                  <mat-icon>calendar_today</mat-icon>
                  <span>
                    <span *ngIf="step.startDate">{{ step.startDate | date: 'mediumDate' }}</span>
                    <span *ngIf="step.startDate && step.endDate"> - </span>
                    <span *ngIf="step.endDate">{{ step.endDate | date: 'mediumDate' }}</span>
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
                [color]="step.progress === 100 ? 'primary' : 'accent'"
              >
              </mat-progress-bar>

              <div class="deliverables" *ngIf="step.deliverables && step.deliverables.length > 0">
                <h4>Deliverables:</h4>
                <mat-chip-set>
                  <mat-chip *ngFor="let deliverable of step.deliverables">
                    {{ deliverable }}
                  </mat-chip>
                </mat-chip-set>
              </div>
            </mat-card-content>

            <mat-card-actions align="end">
              <button mat-button (click)="viewProject(step.projectId)">
                <mat-icon>visibility</mat-icon>
                View Project
              </button>
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
      </div>
    </div>
  `,
  styles: [`
    .steps-page-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 32px;
    }

    .header-content h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 500;
      color: #1f2937;
    }

    .header-subtitle {
      margin: 8px 0 0 0;
      color: #6b7280;
      font-size: 16px;
    }

    .filters-section {
      margin-bottom: 32px;
    }

    .filters-card {
      border-radius: 12px;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .filter-stats {
      display: flex;
      gap: 24px;
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

    .empty-state, .loading-state {
      text-align: center;
      padding: 80px 40px;
      color: #6b7280;
    }

    .empty-state mat-icon, .loading-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #d1d5db;
      margin-bottom: 16px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .step-card {
      border-radius: 12px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .step-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .step-title-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .step-name {
      font-weight: 500;
      font-size: 18px;
    }

    .step-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .project-info, .phase-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6b7280;
      font-size: 14px;
    }

    .project-info mat-icon, .phase-info mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .step-description {
      margin: 16px 0;
      color: #374151;
      line-height: 1.5;
    }

    .step-details {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 16px 0;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #6b7280;
      font-size: 14px;
    }

    .detail-row mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .step-progress {
      margin: 16px 0;
      height: 8px;
      border-radius: 4px;
    }

    .deliverables {
      margin-top: 16px;
    }

    .deliverables h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .steps-page-container {
        padding: 16px;
      }

      .header-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .filters-grid {
        grid-template-columns: 1fr;
      }

      .filter-stats {
        flex-direction: column;
        gap: 12px;
      }

      .steps-grid {
        grid-template-columns: 1fr;
      }

      .step-meta {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class StepsPageComponent implements OnInit {
  private stepService = inject(StepService);
  private projectService = inject(ProjectService);
  private phaseService = inject(PhaseService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  // Signals for reactive state
  loading = signal(true);
  filteredData = signal<FilteredStepsData | null>(null);
  
  // Filter values
  selectedProjectId = '';
  selectedStatus = '';
  searchTerm = '';

  // Computed filtered steps
  filteredSteps = computed(() => {
    const data = this.filteredData();
    if (!data) return [];

    let steps = data.steps;

    // Apply filters
    if (this.selectedProjectId) {
      steps = steps.filter(step => step.projectId === this.selectedProjectId);
    }


    if (this.selectedStatus) {
      steps = steps.filter(step => step.status === this.selectedStatus);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      steps = steps.filter(step => 
        step.name.toLowerCase().includes(term) ||
        step.description?.toLowerCase().includes(term) ||
        step.projectName?.toLowerCase().includes(term) ||
        step.phaseName?.toLowerCase().includes(term)
      );
    }

    return steps.sort((a, b) => {
      // Sort by project, then phase, then order
      if (a.projectName !== b.projectName) {
        return (a.projectName || '').localeCompare(b.projectName || '');
      }
      if (a.phaseName !== b.phaseName) {
        return (a.phaseName || '').localeCompare(b.phaseName || '');
      }
      return a.orderNo - b.orderNo;
    });
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    // Since phases are subcollections, we'll skip loading them globally for now
    combineLatest([
      this.stepService.getAllSteps(),
      this.projectService.getProjects()
    ]).subscribe({
      next: ([steps, projects]) => {
        // Enrich steps with project information
        const enrichedSteps: StepWithProjectPhase[] = steps.map(step => {
          const project = projects.find(p => p.id === step.projectId);
          
          return {
            ...step,
            projectName: project?.name,
            projectCode: project?.projectCode,
            phaseName: step.phaseName || 'Unknown Phase',
            phaseStatus: step.phaseStatus
          };
        });

        this.filteredData.set({
          steps: enrichedSteps,
          projects,
          phases: [] // Empty for now since phases are subcollections
        });
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading steps data:', error);
        this.loading.set(false);
      }
    });
  }

  onFiltersChange() {
    // Trigger computed signal recalculation
    // The computed signal will automatically update the filtered results
  }

  addStep() {
    const dialogRef = this.dialog.open(StepFormDialogComponent, {
      width: '600px',
      data: {
        projectId: this.selectedProjectId || '',
        phases: this.selectedProjectId ? 
          this.phaseService.getByProject(this.selectedProjectId) : 
          of([])
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  editStep(step: StepWithProjectPhase) {
    const dialogRef = this.dialog.open(StepFormDialogComponent, {
      width: '600px',
      data: {
        step,
        projectId: step.projectId,
        phases: this.phaseService.getByProject(step.projectId)
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  updateStepProgress(step: StepWithProjectPhase) {
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

  deleteStep(step: StepWithProjectPhase) {
    if (confirm(`Are you sure you want to delete step "${step.name}"?`)) {
      this.stepService.deleteStep(step.id!).subscribe(() => {
        this.loadData();
      });
    }
  }

  viewProject(projectId: string) {
    this.router.navigate(['/projects', projectId]);
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

  calculateOverallProgress(): number {
    const steps = this.filteredSteps();
    if (steps.length === 0) return 0;
    
    const totalProgress = steps.reduce((sum, step) => sum + step.progress, 0);
    return Math.round(totalProgress / steps.length);
  }

  trackByStep(index: number, step: StepWithProjectPhase): string {
    return step.id || index.toString();
  }
}