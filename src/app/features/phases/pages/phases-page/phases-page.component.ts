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
      <div class="page-header">
        <div>
          <h1>Phase Management</h1>
          <p class="subtitle">Manage all available project phases</p>
        </div>
        <button mat-raised-button color="primary" (click)="addPhase()">
          <mat-icon>add</mat-icon>
          Add Phase
        </button>
      </div>

      <mat-card>
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
      .phases-page {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
      }

      .page-header h1 {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
      }

      .subtitle {
        color: #666;
        margin: 4px 0 0 0;
      }

      .phases-table {
        width: 100%;
      }

      mat-chip {
        font-size: 12px;
      }

      .type-planning {
        background-color: #e3f2fd !important;
        color: #1976d2 !important;
      }

      .type-initiation {
        background-color: #e8f5e9 !important;
        color: #388e3c !important;
      }

      .type-execution {
        background-color: #fff8e1 !important;
        color: #f57c00 !important;
      }

      .type-handover {
        background-color: #fff3e0 !important;
        color: #ff6f00 !important;
      }

      .type-closure {
        background-color: #f3e5f5 !important;
        color: #7b1fa2 !important;
      }

      .type-custom {
        background-color: #f5f5f5 !important;
        color: #616161 !important;
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
