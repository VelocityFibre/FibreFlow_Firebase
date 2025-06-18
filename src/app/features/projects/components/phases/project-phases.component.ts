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
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable, tap, Subject, switchMap, startWith } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { Phase, PhaseStatus } from '../../../../core/models/phase.model';
import { PhaseService } from '../../../../core/services/phase.service';
import { PhaseAssignDialogComponent } from './phase-assign-dialog/phase-assign-dialog.component';
// TODO: Create these dialog components
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
    MatDialogModule,
    MatTableModule,
    MatBadgeModule,
  ],
  template: `
    <div class="phases-container">
      <div class="phases-header">
        <h2 class="section-title">Project Phases</h2>
        <div class="header-actions">
          <span class="phase-status-summary" *ngIf="phases$ | async as phases">
            Click status button to cycle through: Pending → Started → Flagged → Completed. Click
            phase details to edit.
          </span>
        </div>
      </div>

      <!-- Phase Cards -->
      <div class="phases-grid" *ngIf="phases$ | async as phases">
        <mat-card class="phase-card ff-card-phases" *ngFor="let phase of phases; let i = index">
          <mat-card-header>
            <div class="phase-header-content">
              <mat-card-title>
                <span class="phase-number">{{ i + 1 }}.</span>
                {{ phase.name }}
              </mat-card-title>
              <button
                mat-flat-button
                [ngClass]="'status-button status-' + phase.status"
                (click)="cyclePhaseStatus(phase, phases)"
                [disabled]="!canModifyPhase(phase)"
              >
                <mat-icon class="status-icon">{{ getStatusIcon(phase.status) }}</mat-icon>
                {{ getStatusLabel(phase.status) }}
              </button>
            </div>
          </mat-card-header>

          <mat-card-content>
            <div class="phase-details">
              <div class="phase-duration">
                <strong>{{ getPhaseDefaults(phase.name).duration }}</strong>
              </div>

              <div class="phase-description">
                {{ getPhaseDefaults(phase.name).description }}
              </div>

              <div class="key-deliverables" *ngIf="getPhaseDefaults(phase.name).deliverables">
                <strong>Key Deliverables:</strong> {{ getPhaseDefaults(phase.name).deliverables }}
              </div>

              <div class="flag-reason" *ngIf="phase.status === 'blocked' && phase.blockedReason">
                <mat-icon class="flag-icon">flag</mat-icon>
                <strong>Flag Reason:</strong> <em>{{ phase.blockedReason }}</em>
              </div>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button (click)="editPhase(phase)">
              <mat-icon>edit</mat-icon>
              Edit Phase
            </button>
            <button mat-button [matMenuTriggerFor]="menu">
              <mat-icon>more_vert</mat-icon>
              More Actions
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="assignUser(phase)">
                <mat-icon>person_add</mat-icon>
                <span>Assign Staff</span>
              </button>
              <button mat-menu-item (click)="setDates(phase)">
                <mat-icon>event</mat-icon>
                <span>Set Dates</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="updatePhaseStatus(phase, 'pending')">
                <mat-icon>schedule</mat-icon>
                <span>Mark as Pending</span>
              </button>
              <button
                mat-menu-item
                (click)="updatePhaseStatus(phase, 'active')"
                [disabled]="!canStartPhase(phase, phases)"
              >
                <mat-icon>play_arrow</mat-icon>
                <span>Mark as Started</span>
              </button>
              <button mat-menu-item (click)="updatePhaseStatus(phase, 'completed')">
                <mat-icon>check_circle</mat-icon>
                <span>Mark as Completed</span>
              </button>
              <button mat-menu-item (click)="flagPhase(phase)">
                <mat-icon>flag</mat-icon>
                <span>Flag Phase</span>
              </button>
            </mat-menu>
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
  styles: [
    `
      .phases-container {
        padding: 0;
        width: 100%;
      }

      .phases-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        flex-wrap: wrap;
        gap: 16px;
      }

      .section-title {
        font-size: 24px;
        font-weight: 600;
        margin: 0;
        color: #1f2937;
      }

      .phase-status-summary {
        font-size: 13px;
        color: #6b7280;
        font-style: italic;
      }

      .phases-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 20px;
        width: 100%;
      }

      .phase-card {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: box-shadow 0.2s ease;

        &:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
      }

      ::ng-deep .phase-card .mat-mdc-card-header {
        padding: 12px 16px;
        background-color: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
        display: block;
      }

      .phase-header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      ::ng-deep .phase-card .mat-mdc-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        flex: 1;
      }

      .phase-number {
        color: #6b7280;
      }

      .status-button {
        font-size: 12px;
        font-weight: 600;
        padding: 4px 16px;
        min-width: 120px;
        height: 32px;
        line-height: 24px;
        border: none;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: center;
        cursor: pointer;

        .status-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        &.status-pending {
          background-color: #f3f4f6 !important;
          color: #6b7280 !important;

          &:hover:not(:disabled) {
            background-color: #e5e7eb !important;
          }
        }

        &.status-active {
          background-color: #dbeafe !important;
          color: #1e40af !important;

          &:hover:not(:disabled) {
            background-color: #bfdbfe !important;
          }
        }

        &.status-completed {
          background-color: #d1fae5 !important;
          color: #065f46 !important;

          &:hover:not(:disabled) {
            background-color: #a7f3d0 !important;
          }
        }

        &.status-blocked {
          background-color: #fee2e2 !important;
          color: #dc2626 !important;

          &:hover:not(:disabled) {
            background-color: #fecaca !important;
          }
        }
      }

      ::ng-deep .phase-card .mat-mdc-card-content {
        padding: 16px;
      }

      .phase-details {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .phase-duration {
        font-size: 14px;
        color: #6b7280;
      }

      .phase-description {
        font-size: 14px;
        color: #4b5563;
        line-height: 1.5;
      }

      .key-deliverables {
        font-size: 14px;
        color: #4b5563;
        line-height: 1.5;

        strong {
          color: #1f2937;
        }
      }

      .flag-reason {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 12px;
        background-color: #fef2f2;
        border-radius: 6px;
        border: 1px solid #fecaca;
        font-size: 14px;
        color: #991b1b;

        .flag-icon {
          color: #dc2626;
          font-size: 18px;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        strong {
          color: #dc2626;
        }

        em {
          font-style: italic;
        }
      }

      ::ng-deep .phase-card .mat-mdc-card-actions {
        padding: 8px 16px;
        border-top: 1px solid #e5e7eb;
        background-color: #f9fafb;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      .empty-state {
        text-align: center;
        padding: 64px 32px;
        color: #6b7280;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          margin-bottom: 24px;
          opacity: 0.3;
        }

        h3 {
          font-size: 20px;
          margin-bottom: 8px;
        }
      }

      // Mobile responsive
      @media (max-width: 768px) {
        .phases-grid {
          grid-template-columns: 1fr;
        }

        .phase-status-summary {
          width: 100%;
          text-align: center;
        }
      }
    `,
  ],
})
export class ProjectPhasesComponent implements OnInit {
  @Input() projectId!: string;

  private phaseService = inject(PhaseService);
  private dialog = inject(MatDialog);

  phases$!: Observable<Phase[]>;
  currentPhases: Phase[] = [];
  displayedColumns: string[] = [
    'order',
    'phase',
    'status',
    'assignedTo',
    'dates',
    'dependencies',
    'actions',
  ];

  private refreshPhases$ = new Subject<void>();

  ngOnInit() {
    if (this.projectId) {
      this.loadPhases();
    }
  }

  loadPhases() {
    // Initialize the observable with startWith to ensure initial load
    this.phases$ = this.refreshPhases$.pipe(
      startWith({}), // Trigger initial load
      switchMap(() => this.phaseService.getProjectPhases(this.projectId)),
      tap((phases) => {
        // Phases loaded successfully
        this.currentPhases = phases;
      }),
    );
  }

  getStatusLabel(status: PhaseStatus | string): string {
    const statusStr = status.toString().toLowerCase();
    switch (statusStr) {
      case 'pending':
        return 'Pending';
      case 'active':
        return 'Started';
      case 'completed':
        return 'Completed';
      case 'blocked':
        return 'Flagged';
      default:
        return statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
    }
  }

  getStatusIcon(status: PhaseStatus | string): string {
    const statusStr = status.toString().toLowerCase();
    switch (statusStr) {
      case 'pending':
        return 'schedule';
      case 'active':
        return 'play_circle';
      case 'completed':
        return 'check_circle';
      case 'blocked':
        return 'flag';
      default:
        return 'help';
    }
  }

  formatDate(date: Date | Timestamp | string | null | undefined): string {
    if (!date) return '';

    let d: Date;
    if (date instanceof Timestamp) {
      d = date.toDate();
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else if (date instanceof Date) {
      d = date;
    } else {
      return '';
    }

    return d.toLocaleDateString();
  }

  calculateProgress(phases: Phase[]): number {
    return this.phaseService.calculateProjectProgress(phases);
  }

  canStartPhase(phase: Phase, allPhases: Phase[]): boolean {
    return this.phaseService.canStartPhase(phase, allPhases);
  }

  canModifyPhase(_phase: Phase): boolean {
    // Add your business logic here - who can modify phases
    return true; // For now, everyone can modify
  }

  getDependencyTooltip(phase: Phase, allPhases: Phase[]): string {
    if (!phase.dependencies || phase.dependencies.length === 0) return '';

    const depNames = phase.dependencies.map((dep) => {
      const depPhase = allPhases.find((p) => p.id === dep.phaseId);
      return depPhase ? depPhase.name : 'Unknown';
    });

    return `Depends on: ${depNames.join(', ')}`;
  }

  getPhaseDefaults(phaseName: string): {
    duration: string;
    description: string;
    deliverables: string | null;
  } {
    // Phase-specific details based on the screenshot
    const phaseDetails: Record<
      string,
      {
        duration: string;
        description: string;
        deliverables: string | null;
      }
    > = {
      'Site Survey and Planning': {
        duration: '2 weeks',
        description: 'Conduct comprehensive site surveys and create detailed deployment plans',
        deliverables: 'Site survey reports, network topology maps, equipment placement plans',
      },
      'Permits and Approvals': {
        duration: '3 weeks',
        description: 'Obtain all necessary permits and regulatory approvals',
        deliverables: 'Building permits, utility crossing agreements, environmental clearances',
      },
      'Network Installation': {
        duration: '8 weeks',
        description: 'Install fiber optic cables, equipment, and infrastructure',
        deliverables: 'Installed fiber network, equipment racks, power systems',
      },
      'Testing and Commissioning': {
        duration: '2 weeks',
        description: 'Test all network components and commission the system',
        deliverables: null,
      },
      // Map our default phases to the ones shown in screenshot
      Planning: {
        duration: '2 weeks',
        description: 'Initial project scoping and design',
        deliverables: 'Project scope document, initial design plans, resource allocation',
      },
      'Initiate Project (IP)': {
        duration: '1 week',
        description: 'Setup and approval phase',
        deliverables: 'Project charter, kickoff meeting notes, stakeholder sign-offs',
      },
      'Work in Progress (WIP)': {
        duration: '8 weeks',
        description: 'Active construction phase',
        deliverables: 'Progress reports, installation documentation, quality checks',
      },
      Handover: {
        duration: '1 week',
        description: 'Completion and client transition',
        deliverables: 'Handover documentation, training materials, warranty information',
      },
      'Handover Complete (HOC)': {
        duration: '1 week',
        description: 'Delivery confirmation',
        deliverables: 'Client acceptance form, final documentation, asset register',
      },
      'Final Acceptance Certificate (FAC)': {
        duration: '1 week',
        description: 'Project closure',
        deliverables: 'Final acceptance certificate, project closure report, lessons learned',
      },
    };

    return (
      phaseDetails[phaseName] || {
        duration: '1 week',
        description: phaseName,
        deliverables: null,
      }
    );
  }

  async cyclePhaseStatus(phase: Phase, _allPhases: Phase[]) {
    if (!phase.id) {
      console.error('Phase has no ID:', phase);
      return;
    }

    // Processing phase status change
    let newStatus: PhaseStatus;

    // Handle both enum and string values - normalize to lowercase
    const currentStatus = phase.status.toString().toLowerCase();

    // Cycle through: Pending → Started → Flagged → Completed → Pending
    switch (currentStatus) {
      case 'pending':
        newStatus = PhaseStatus.ACTIVE;
        break;
      case 'active':
        newStatus = PhaseStatus.BLOCKED;
        break;
      case 'blocked':
        newStatus = PhaseStatus.COMPLETED;
        break;
      case 'completed':
        newStatus = PhaseStatus.PENDING;
        break;
      default:
        // Unrecognized status, defaulting to pending
        newStatus = PhaseStatus.PENDING;
    }

    // New status determined

    // If changing to blocked, prompt for reason
    if (newStatus === PhaseStatus.BLOCKED) {
      const reason = window.prompt('Please provide a reason for flagging this phase:');
      if (reason) {
        try {
          await this.phaseService.updatePhaseStatus(this.projectId, phase.id, newStatus, reason);
          // Reload phases to show updated status
          this.refreshPhases$.next();
        } catch (error) {
          console.error('Error flagging phase:', error);
          alert('Failed to flag phase. Please try again.');
        }
      }
    } else {
      try {
        await this.phaseService.updatePhaseStatus(this.projectId, phase.id, newStatus);
        // Reload phases to show updated status
        this.refreshPhases$.next();
      } catch (error) {
        console.error('Error updating phase status:', error);
        alert('Failed to update phase status. Please try again.');
      }
    }
  }

  editPhase(_phase: Phase) {
    // TODO: Implement phase editing dialog
    alert('Phase editing dialog coming soon!');
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
        try {
          await this.phaseService.updatePhaseStatus(
            this.projectId,
            phase.id,
            PhaseStatus.COMPLETED,
          );
          // Reload phases to show updated status
          this.refreshPhases$.next();
        } catch (error) {
          console.error('Error completing phase:', error);
          alert('Failed to complete phase. Please try again.');
        }
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

  async updatePhaseStatus(phase: Phase, status: string) {
    if (phase.id) {
      let confirmMessage = '';
      switch (status) {
        case 'pending':
          confirmMessage = 'Are you sure you want to mark this phase as pending?';
          break;
        case 'active':
          confirmMessage = 'Are you sure you want to start this phase?';
          break;
        case 'completed':
          confirmMessage = 'Are you sure you want to mark this phase as completed?';
          break;
      }

      if (confirmMessage && confirm(confirmMessage)) {
        try {
          await this.phaseService.updatePhaseStatus(
            this.projectId,
            phase.id,
            status as PhaseStatus,
          );
          // Reload phases to show updated status
          this.refreshPhases$.next();
        } catch (error) {
          console.error('Error updating phase status:', error);
          alert('Failed to update phase status. Please try again.');
        }
      }
    }
  }

  async flagPhase(phase: Phase) {
    if (phase.id) {
      const reason = window.prompt('Please provide a reason for flagging this phase:');
      if (reason) {
        try {
          await this.phaseService.updatePhaseStatus(
            this.projectId,
            phase.id,
            PhaseStatus.BLOCKED,
            reason,
          );
          // Reload phases to show updated status
          this.refreshPhases$.next();
        } catch (error) {
          console.error('Error flagging phase:', error);
          alert('Failed to flag phase. Please try again.');
        }
      }
    }
  }

  async unflagPhase(phase: Phase) {
    if (phase.id && confirm('Are you sure you want to remove the flag from this phase?')) {
      await this.phaseService.updatePhaseStatus(this.projectId, phase.id, PhaseStatus.PENDING);
    }
  }

  assignUser(phase: Phase) {
    const dialogRef = this.dialog.open(PhaseAssignDialogComponent, {
      width: '500px',
      data: { phase, projectId: this.projectId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Reload phases to show updated assignment
        this.loadPhases();
      }
    });
  }

  setDates(_phase: Phase) {
    // TODO: Open dates dialog
    alert('Dates dialog coming soon!');
    // const dialogRef = this.dialog.open(PhaseDatesDialogComponent, {
    //   width: '400px',
    //   data: { phase, projectId: this.projectId }
    // });
  }
}
