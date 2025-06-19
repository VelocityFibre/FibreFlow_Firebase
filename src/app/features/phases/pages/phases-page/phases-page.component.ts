import { Component, OnInit, inject, Injector, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PhaseFormComponent } from '../../components/phase-form/phase-form.component';
import { DEFAULT_PHASES, PhaseTemplate } from '../../../../core/models/phase.model';

@Component({
  selector: 'app-phases-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="phases-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">Phase Management</h1>
          <p class="page-subtitle">Manage all available project phases</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="addPhase()">
            <mat-icon>add</mat-icon>
            Add Phase
          </button>
        </div>
      </div>

      <mat-card class="phases-card">
        <mat-card-content>
          <table mat-table [dataSource]="phases" class="phases-table">
            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Phase Name</th>
              <td mat-cell *matCellDef="let phase">{{ phase.name }}</td>
            </ng-container>

            <!-- Description Column -->
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let phase">{{ phase.description }}</td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let phase">
                <mat-chip [ngClass]="getPhaseTypeClass(phase.name)">
                  {{ getPhaseType(phase.name) }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Order Column -->
            <ng-container matColumnDef="order">
              <th mat-header-cell *matHeaderCellDef>Order</th>
              <td mat-cell *matCellDef="let phase">{{ phase.orderNo }}</td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let phase">
                <button mat-icon-button (click)="editPhase(phase)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="deletePhase(phase)" [disabled]="phase.isDefault">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      /* Container following theme standards */
      .phases-page {
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
        padding-bottom: 24px;
        border-bottom: 1px solid rgb(var(--ff-border));
      }

      .header-content {
        flex: 1;
      }

      .page-title {
        font-size: 32px;
        font-weight: 300;
        color: rgb(var(--ff-foreground));
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
      }

      .page-subtitle {
        font-size: 18px;
        color: rgb(var(--ff-muted-foreground));
        font-weight: 400;
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: 16px;
      }

      /* Card styling with improved spacing */
      .phases-card {
        background-color: rgb(var(--ff-card)) !important;
        border: 1px solid rgb(var(--ff-border)) !important;
        border-radius: var(--ff-radius) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
      }

      .phases-card mat-card-content {
        padding: 0 !important;
      }

      /* Table styling with theme colors */
      .phases-table {
        width: 100%;
      }

      .phases-table th {
        font-size: 14px;
        font-weight: 600;
        color: rgb(var(--ff-muted-foreground));
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 20px 16px !important;
        border-bottom: 2px solid rgb(var(--ff-border));
      }

      .phases-table td {
        padding: 20px 16px !important;
        font-size: 15px;
        color: rgb(var(--ff-foreground));
        border-bottom: 1px solid rgb(var(--ff-border));
      }

      .phases-table tr:hover {
        background-color: rgb(var(--ff-muted) / 0.5);
      }

      /* Chip styling with theme colors */
      mat-chip {
        font-size: 12px !important;
        font-weight: 500 !important;
        padding: 4px 12px !important;
        height: 28px !important;
        border-radius: 14px !important;
      }

      .type-planning {
        background-color: rgb(var(--ff-info) / 0.1) !important;
        color: rgb(var(--ff-info)) !important;
        border: 1px solid rgb(var(--ff-info) / 0.2) !important;
      }

      .type-initiation {
        background-color: rgb(var(--ff-success) / 0.1) !important;
        color: rgb(var(--ff-success)) !important;
        border: 1px solid rgb(var(--ff-success) / 0.2) !important;
      }

      .type-execution {
        background-color: rgb(var(--ff-warning) / 0.1) !important;
        color: rgb(var(--ff-warning)) !important;
        border: 1px solid rgb(var(--ff-warning) / 0.2) !important;
      }

      .type-handover {
        background-color: rgb(var(--ff-accent) / 0.1) !important;
        color: rgb(var(--ff-accent)) !important;
        border: 1px solid rgb(var(--ff-accent) / 0.2) !important;
      }

      .type-closure {
        background-color: rgb(var(--ff-primary) / 0.1) !important;
        color: rgb(var(--ff-primary)) !important;
        border: 1px solid rgb(var(--ff-primary) / 0.2) !important;
      }

      .type-custom {
        background-color: rgb(var(--ff-muted)) !important;
        color: rgb(var(--ff-muted-foreground)) !important;
        border: 1px solid rgb(var(--ff-border)) !important;
      }

      /* Button styling */
      button[mat-raised-button] {
        height: 48px;
        padding: 0 24px;
        font-size: 15px;
        font-weight: 500;
        letter-spacing: 0.02em;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      button[mat-icon-button] {
        width: 40px;
        height: 40px;
        line-height: 40px;
      }

      button[mat-icon-button]:hover {
        background-color: rgb(var(--ff-muted) / 0.5);
      }

      button[mat-icon-button]:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Responsive following theme standards */
      @media (max-width: 768px) {
        .phases-page {
          padding: 24px 16px;
        }

        .page-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }

        .page-title {
          font-size: 24px;
        }

        .page-subtitle {
          font-size: 16px;
        }

        .header-actions {
          width: 100%;
        }

        button[mat-raised-button] {
          width: 100%;
        }

        .phases-table {
          font-size: 14px;
        }

        .phases-table th,
        .phases-table td {
          padding: 12px 8px !important;
        }

        /* Hide description column on mobile */
        .mat-column-description {
          display: none;
        }
      }
    `,
  ],
})
export class PhasesPageComponent implements OnInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private injector = inject(Injector);

  displayedColumns = ['name', 'description', 'status', 'order', 'actions'];
  phases = [...DEFAULT_PHASES];

  ngOnInit() {
    // Use afterNextRender to avoid NG0200
    afterNextRender(
      () => {
        const savedPhases = localStorage.getItem('app-phases');
        if (savedPhases) {
          try {
            this.phases = JSON.parse(savedPhases);
          } catch (error) {
            console.error('Error parsing saved phases:', error);
          }
        }
      },
      { injector: this.injector },
    );
  }

  addPhase() {
    const dialogRef = this.dialog.open(PhaseFormComponent, {
      width: '600px',
      data: { phase: null },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        result.orderNo = this.phases.length + 1;
        result.isDefault = false;
        this.phases.push(result);
        this.savePhases();
        this.snackBar.open('Phase added successfully', 'Close', { duration: 3000 });
      }
    });
  }

  editPhase(phase: PhaseTemplate) {
    const dialogRef = this.dialog.open(PhaseFormComponent, {
      width: '600px',
      data: { phase: { ...phase } },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const index = this.phases.findIndex((p) => p.name === phase.name);
        if (index !== -1) {
          this.phases[index] = { ...result, isDefault: phase.isDefault };
          this.savePhases();
          this.snackBar.open('Phase updated successfully', 'Close', { duration: 3000 });
        }
      }
    });
  }

  deletePhase(phase: PhaseTemplate) {
    if (confirm(`Are you sure you want to delete the phase "${phase.name}"?`)) {
      this.phases = this.phases.filter((p) => p.name !== phase.name);
      // Reorder phases
      this.phases.forEach((p, index) => {
        p.orderNo = index + 1;
      });
      this.savePhases();
      this.snackBar.open('Phase deleted successfully', 'Close', { duration: 3000 });
    }
  }

  private savePhases() {
    localStorage.setItem('app-phases', JSON.stringify(this.phases));
  }

  getPhaseType(phaseName: string): string {
    if (phaseName === 'Planning') return 'Planning';
    if (phaseName === 'Initiate Project (IP)') return 'Initiation';
    if (phaseName === 'Work in Progress (WIP)') return 'Execution';
    if (phaseName === 'Handover (HOC)') return 'Handover';
    if (phaseName === 'Full Acceptance (FAC)') return 'Closure';
    return 'Custom';
  }

  getPhaseTypeClass(phaseName: string): string {
    if (phaseName === 'Planning') return 'type-planning';
    if (phaseName === 'Initiate Project (IP)') return 'type-initiation';
    if (phaseName === 'Work in Progress (WIP)') return 'type-execution';
    if (phaseName === 'Handover (HOC)') return 'type-handover';
    if (phaseName === 'Full Acceptance (FAC)') return 'type-closure';
    return 'type-custom';
  }
}
