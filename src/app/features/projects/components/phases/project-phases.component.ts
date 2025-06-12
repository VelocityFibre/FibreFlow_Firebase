import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { Phase, PhaseStatus } from '../../../../core/models/phase.model';
import { PhaseService } from '../../../../core/services/phase.service';
// TODO: Create these dialog components
// import { PhaseAssignDialogComponent } from './phase-assign-dialog/phase-assign-dialog.component';
// import { PhaseDatesDialogComponent } from './phase-dates-dialog/phase-dates-dialog.component';

@Component({
  selector: 'app-project-phases',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule
  ],
  template: `
    <div class="phases-container">
      <div class="phases-header">
        <h2 class="ff-section-title">Project Phases</h2>
        <div class="phases-progress" *ngIf="phases$ | async as phases">
          <span class="progress-label">Overall Progress</span>
          <mat-progress-bar 
            mode="determinate" 
            [value]="calculateProgress(phases)"
            class="overall-progress-bar">
          </mat-progress-bar>
          <span class="progress-value">{{ calculateProgress(phases) }}%</span>
        </div>
      </div>

      <div class="phases-grid" *ngIf="phases$ | async as phases">
        <mat-card 
          *ngFor="let phase of phases" 
          class="phase-card"
          [class.phase-blocked]="phase.status === 'blocked'"
          [class.phase-active]="phase.status === 'active'"
          [class.phase-completed]="phase.status === 'completed'">
          
          <!-- Phase Header -->
          <div class="phase-header">
            <div class="phase-title-row">
              <h3 class="phase-title">{{ phase.name }}</h3>
              <mat-chip [ngClass]="'status-' + phase.status">
                {{ getStatusLabel(phase.status) }}
              </mat-chip>
            </div>
            <button mat-icon-button [matMenuTriggerFor]="menu" class="phase-menu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="assignUser(phase)" [disabled]="!canModifyPhase(phase)">
                <mat-icon>person_add</mat-icon>
                <span>Assign User</span>
              </button>
              <button mat-menu-item (click)="setDates(phase)" [disabled]="!canModifyPhase(phase)">
                <mat-icon>event</mat-icon>
                <span>Set Dates</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="startPhase(phase)" 
                      *ngIf="phase.status === 'pending'" 
                      [disabled]="!canStartPhase(phase, phases)">
                <mat-icon>play_arrow</mat-icon>
                <span>Start Phase</span>
              </button>
              <button mat-menu-item (click)="completePhase(phase)" 
                      *ngIf="phase.status === 'active'">
                <mat-icon>check_circle</mat-icon>
                <span>Complete Phase</span>
              </button>
              <button mat-menu-item (click)="blockPhase(phase)" 
                      *ngIf="phase.status === 'active'">
                <mat-icon>block</mat-icon>
                <span>Block Phase</span>
              </button>
            </mat-menu>
          </div>

          <!-- Phase Content -->
          <mat-card-content>
            <p class="phase-description">{{ phase.description }}</p>
            
            <!-- Assigned User -->
            <div class="phase-assignee" *ngIf="phase.assignedToDetails">
              <img [src]="phase.assignedToDetails.avatar || '/placeholder-user.jpg'" 
                   [alt]="phase.assignedToDetails.name"
                   class="assignee-avatar">
              <div class="assignee-info">
                <span class="assignee-name">{{ phase.assignedToDetails.name }}</span>
                <span class="assignee-role">{{ phase.assignedToDetails.role }}</span>
              </div>
            </div>
            
            <!-- No Assignment -->
            <div class="phase-assignee unassigned" *ngIf="!phase.assignedToDetails">
              <mat-icon class="unassigned-icon">person_outline</mat-icon>
              <span class="unassigned-text">Unassigned</span>
            </div>

            <!-- Dates -->
            <div class="phase-dates" *ngIf="phase.startDate || phase.endDate">
              <div class="date-item" *ngIf="phase.startDate">
                <mat-icon>event</mat-icon>
                <span>Start: {{ formatDate(phase.startDate) }}</span>
              </div>
              <div class="date-item" *ngIf="phase.endDate">
                <mat-icon>event_available</mat-icon>
                <span>End: {{ formatDate(phase.endDate) }}</span>
              </div>
            </div>

            <!-- Dependencies -->
            <div class="phase-dependencies" *ngIf="phase.dependencies && phase.dependencies.length > 0">
              <mat-icon 
                class="dependency-icon"
                [matTooltip]="getDependencyTooltip(phase, phases)">
                link
              </mat-icon>
              <span class="dependency-text">
                Depends on {{ phase.dependencies.length }} phase(s)
              </span>
            </div>

            <!-- Blocked Reason -->
            <div class="blocked-reason" *ngIf="phase.status === 'blocked' && phase.blockedReason">
              <mat-icon>warning</mat-icon>
              <span>{{ phase.blockedReason }}</span>
            </div>
          </mat-card-content>

          <!-- Phase Actions -->
          <mat-card-actions *ngIf="canModifyPhase(phase)">
            <button mat-button 
                    color="primary" 
                    (click)="startPhase(phase)"
                    *ngIf="phase.status === 'pending' && canStartPhase(phase, phases)">
              <mat-icon>play_arrow</mat-icon>
              Start Phase
            </button>
            <button mat-button 
                    color="primary" 
                    (click)="completePhase(phase)"
                    *ngIf="phase.status === 'active'">
              <mat-icon>check_circle</mat-icon>
              Complete
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="(phases$ | async)?.length === 0">
        <mat-icon>timeline</mat-icon>
        <h3>No Phases Created</h3>
        <p>Project phases will appear here once created.</p>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../../styles/theme-functions' as *;
    @use '../../../../../styles/spacing' as *;

    .phases-container {
      padding: ff-spacing(lg);
    }

    .phases-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ff-spacing(xl);
    }

    .phases-progress {
      display: flex;
      align-items: center;
      gap: ff-spacing(md);
      flex: 0 0 400px;
    }

    .progress-label {
      font-size: ff-font-size(sm);
      color: ff-rgb(muted-foreground);
      white-space: nowrap;
    }

    .overall-progress-bar {
      flex: 1;
    }

    .progress-value {
      font-size: ff-font-size(lg);
      font-weight: ff-font-weight(medium);
      color: ff-rgb(foreground);
      min-width: 45px;
      text-align: right;
    }

    .phases-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: ff-spacing(lg);
    }

    .phase-card {
      position: relative;
      transition: all ff-transition(base) ease;
      
      &.phase-blocked {
        opacity: 0.7;
        
        .mat-mdc-card {
          border-color: ff-rgb(destructive) !important;
        }
      }
      
      &.phase-active {
        .mat-mdc-card {
          border-color: ff-rgb(primary) !important;
          border-width: 2px !important;
        }
      }
      
      &.phase-completed {
        .mat-mdc-card {
          background-color: ff-rgba(success, 0.05) !important;
        }
      }
    }

    .phase-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: ff-spacing(md);
    }

    .phase-title-row {
      flex: 1;
    }

    .phase-title {
      font-size: ff-font-size(xl);
      font-weight: ff-font-weight(medium);
      margin: 0 0 ff-spacing(sm) 0;
      color: ff-rgb(foreground);
    }

    .phase-menu {
      margin: ff-spacing(-sm) ff-spacing(-sm) 0 0;
    }

    .phase-description {
      color: ff-rgb(muted-foreground);
      margin-bottom: ff-spacing(lg);
      line-height: 1.5;
    }

    .phase-assignee {
      display: flex;
      align-items: center;
      gap: ff-spacing(sm);
      margin-bottom: ff-spacing(md);
      padding: ff-spacing(sm);
      background-color: ff-rgba(muted, 0.5);
      border-radius: calc(var(--ff-radius) * 0.5);
      
      &.unassigned {
        color: ff-rgb(muted-foreground);
        font-style: italic;
      }
    }

    .assignee-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .unassigned-icon {
      width: 40px;
      height: 40px;
      font-size: 40px;
      color: ff-rgb(muted-foreground);
    }

    .assignee-info {
      display: flex;
      flex-direction: column;
    }

    .assignee-name {
      font-weight: ff-font-weight(medium);
      color: ff-rgb(foreground);
    }

    .assignee-role {
      font-size: ff-font-size(sm);
      color: ff-rgb(muted-foreground);
    }

    .unassigned-text {
      color: ff-rgb(muted-foreground);
    }

    .phase-dates {
      display: flex;
      flex-direction: column;
      gap: ff-spacing(xs);
      margin-bottom: ff-spacing(md);
    }

    .date-item {
      display: flex;
      align-items: center;
      gap: ff-spacing(xs);
      font-size: ff-font-size(sm);
      color: ff-rgb(muted-foreground);
      
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .phase-dependencies {
      display: flex;
      align-items: center;
      gap: ff-spacing(xs);
      margin-bottom: ff-spacing(md);
      font-size: ff-font-size(sm);
      color: ff-rgb(warning);
    }

    .dependency-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .blocked-reason {
      display: flex;
      align-items: flex-start;
      gap: ff-spacing(xs);
      padding: ff-spacing(sm);
      background-color: ff-rgba(destructive, 0.1);
      border-radius: calc(var(--ff-radius) * 0.5);
      color: ff-rgb(destructive);
      font-size: ff-font-size(sm);
      
      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin-top: 2px;
      }
    }

    .mat-mdc-card-actions {
      padding: ff-spacing(md);
      padding-top: 0;
      display: flex;
      gap: ff-spacing(sm);
    }

    .empty-state {
      text-align: center;
      padding: ff-spacing(4xl) ff-spacing(lg);
      color: ff-rgb(muted-foreground);
      
      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: ff-spacing(lg);
        opacity: 0.3;
      }
      
      h3 {
        font-size: ff-font-size(xl);
        margin-bottom: ff-spacing(sm);
      }
    }

    // Status chip styles
    ::ng-deep {
      .status-pending {
        background-color: ff-rgb(muted) !important;
        color: ff-rgb(muted-foreground) !important;
      }
      
      .status-active {
        background-color: ff-rgb(primary) !important;
        color: ff-rgb(primary-foreground) !important;
      }
      
      .status-completed {
        background-color: ff-rgb(success) !important;
        color: ff-rgb(success-foreground) !important;
      }
      
      .status-blocked {
        background-color: ff-rgb(destructive) !important;
        color: ff-rgb(destructive-foreground) !important;
      }
    }
  `]
})
export class ProjectPhasesComponent implements OnInit {
  @Input() projectId!: string;
  
  private phaseService = inject(PhaseService);
  private dialog = inject(MatDialog);
  
  phases$!: Observable<Phase[]>;

  ngOnInit() {
    if (this.projectId) {
      this.phases$ = this.phaseService.getProjectPhases(this.projectId);
    }
  }

  getStatusLabel(status: PhaseStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  }

  calculateProgress(phases: Phase[]): number {
    return this.phaseService.calculateProjectProgress(phases);
  }

  canStartPhase(phase: Phase, allPhases: Phase[]): boolean {
    return this.phaseService.canStartPhase(phase, allPhases);
  }

  canModifyPhase(phase: Phase): boolean {
    // Add your business logic here - who can modify phases
    return true; // For now, everyone can modify
  }

  getDependencyTooltip(phase: Phase, allPhases: Phase[]): string {
    if (!phase.dependencies || phase.dependencies.length === 0) return '';
    
    const depNames = phase.dependencies.map(dep => {
      const depPhase = allPhases.find(p => p.id === dep.phaseId);
      return depPhase ? depPhase.name : 'Unknown';
    });
    
    return `Depends on: ${depNames.join(', ')}`;
  }

  async startPhase(phase: Phase) {
    if (phase.id) {
      await this.phaseService.updatePhaseStatus(this.projectId, phase.id, PhaseStatus.ACTIVE);
    }
  }

  async completePhase(phase: Phase) {
    if (phase.id) {
      const confirm = window.confirm('Are you sure you want to mark this phase as complete?');
      if (confirm) {
        await this.phaseService.updatePhaseStatus(this.projectId, phase.id, PhaseStatus.COMPLETED);
      }
    }
  }

  async blockPhase(phase: Phase) {
    if (phase.id) {
      const reason = window.prompt('Please provide a reason for blocking this phase:');
      if (reason) {
        // Would need to add this method to the service
        await this.phaseService.updatePhaseStatus(this.projectId, phase.id, PhaseStatus.BLOCKED);
      }
    }
  }

  assignUser(phase: Phase) {
    // TODO: Open assignment dialog
    alert('Assignment dialog coming soon!');
    // const dialogRef = this.dialog.open(PhaseAssignDialogComponent, {
    //   width: '400px',
    //   data: { phase, projectId: this.projectId }
    // });
  }

  setDates(phase: Phase) {
    // TODO: Open dates dialog
    alert('Dates dialog coming soon!');
    // const dialogRef = this.dialog.open(PhaseDatesDialogComponent, {
    //   width: '400px',
    //   data: { phase, projectId: this.projectId }
    // });
  }
}