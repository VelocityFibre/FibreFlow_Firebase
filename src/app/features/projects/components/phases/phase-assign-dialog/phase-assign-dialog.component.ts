import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { Observable } from 'rxjs';

import { Phase } from '../../../../../core/models/phase.model';
import { PhaseService } from '../../../../../core/services/phase.service';
import { StaffService } from '../../../../staff/services/staff.service';
import { StaffMember } from '../../../../staff/models/staff.model';

interface DialogData {
  phase: Phase;
  projectId: string;
}

@Component({
  selector: 'app-phase-assign-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
  ],
  template: `
    <h2 mat-dialog-title>Assign Staff to Phase</h2>

    <mat-dialog-content>
      <div class="phase-info">
        <h3>{{ data.phase.name }}</h3>
        <p>{{ data.phase.description }}</p>
      </div>

      <div class="current-assignment" *ngIf="data.phase.assignedTo">
        <h4>Currently Assigned To:</h4>
        <div class="assignee-info" *ngIf="data.phase.assignedToDetails">
          <img
            [src]="data.phase.assignedToDetails.avatar || '/placeholder-user.jpg'"
            [alt]="data.phase.assignedToDetails.name"
            class="assignee-avatar"
          />
          <div>
            <div class="assignee-name">{{ data.phase.assignedToDetails.name }}</div>
            <div class="assignee-role">{{ data.phase.assignedToDetails.role }}</div>
          </div>
        </div>
      </div>

      <form [formGroup]="assignForm" class="assign-form">
        <mat-form-field appearance="outline">
          <mat-label>Select Staff Member</mat-label>
          <mat-select formControlName="staffId" [compareWith]="compareStaff">
            <mat-option [value]="null">
              <span class="unassign-option">Unassign</span>
            </mat-option>
            <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
              <div class="staff-option">
                <img
                  [src]="staff.photoUrl || '/placeholder-user.jpg'"
                  [alt]="staff.name"
                  class="staff-avatar"
                />
                <div class="staff-info">
                  <span class="staff-name">{{ staff.name }}</span>
                  <span class="staff-role">{{ staff.primaryGroup }}</span>
                  <span
                    class="staff-status"
                    [class.available]="staff.availability.status === 'available'"
                  >
                    {{ staff.availability.status }}
                  </span>
                </div>
              </div>
            </mat-option>
          </mat-select>
          <mat-error *ngIf="assignForm.get('staffId')?.hasError('required')">
            Please select a staff member
          </mat-error>
        </mat-form-field>

        <div class="selected-staff-details" *ngIf="selectedStaff">
          <h4>Selected Staff Details:</h4>
          <mat-list>
            <mat-list-item>
              <mat-icon matListItemIcon>email</mat-icon>
              <span matListItemTitle>{{ selectedStaff.email }}</span>
            </mat-list-item>
            <mat-list-item>
              <mat-icon matListItemIcon>phone</mat-icon>
              <span matListItemTitle>{{ selectedStaff.phone }}</span>
            </mat-list-item>
            <mat-list-item *ngIf="selectedStaff.skills && selectedStaff.skills.length > 0">
              <mat-icon matListItemIcon>build</mat-icon>
              <span matListItemTitle>Skills: {{ selectedStaff.skills.join(', ') }}</span>
            </mat-list-item>
            <mat-list-item>
              <mat-icon matListItemIcon>work</mat-icon>
              <span matListItemTitle
                >Current Tasks: {{ selectedStaff.activity.tasksInProgress || 0 }}</span
              >
            </mat-list-item>
          </mat-list>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="assign()" [disabled]="saving">
        <mat-spinner diameter="20" *ngIf="saving"></mat-spinner>
        <span *ngIf="!saving">{{ assignForm.value.staffId ? 'Assign' : 'Unassign' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-width: 400px;
        max-width: 600px;
      }

      .phase-info {
        margin-bottom: 24px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;
      }

      .phase-info h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 500;
      }

      .phase-info p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }

      .current-assignment {
        margin-bottom: 24px;
      }

      .current-assignment h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 500;
        color: #666;
      }

      .assignee-info {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background-color: #e3f2fd;
        border-radius: 8px;
      }

      .assignee-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
      }

      .assignee-name {
        font-weight: 500;
        font-size: 14px;
      }

      .assignee-role {
        font-size: 12px;
        color: #666;
      }

      .assign-form {
        margin-bottom: 24px;
      }

      mat-form-field {
        width: 100%;
      }

      .unassign-option {
        font-style: italic;
        color: #666;
      }

      .staff-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
      }

      .staff-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }

      .staff-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .staff-name {
        font-weight: 500;
        font-size: 14px;
      }

      .staff-role {
        font-size: 12px;
        color: #666;
      }

      .staff-status {
        font-size: 11px;
        color: #999;

        &.available {
          color: #4caf50;
        }
      }

      .selected-staff-details {
        background-color: #f9f9f9;
        border-radius: 8px;
        padding: 16px;
      }

      .selected-staff-details h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 500;
        color: #666;
      }

      mat-list {
        padding: 0;
      }

      mat-list-item {
        height: auto !important;
        padding: 8px 0 !important;
      }

      mat-dialog-actions {
        padding: 16px 24px;
      }

      mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }
    `,
  ],
})
export class PhaseAssignDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private phaseService = inject(PhaseService);
  private staffService = inject(StaffService);

  assignForm!: FormGroup;
  staff$!: Observable<StaffMember[]>;
  selectedStaff: StaffMember | null = null;
  saving = false;

  public dialogRef = inject(MatDialogRef<PhaseAssignDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as DialogData;

  constructor() {}

  ngOnInit() {
    this.assignForm = this.fb.group({
      staffId: [this.data.phase.assignedTo || null],
    });

    // Load available staff
    this.staff$ = this.staffService.getStaff();

    // Watch for staff selection changes
    this.assignForm.get('staffId')?.valueChanges.subscribe((staffId) => {
      if (staffId) {
        this.staffService.getStaffById(staffId).subscribe((staff) => {
          this.selectedStaff = staff || null;
        });
      } else {
        this.selectedStaff = null;
      }
    });

    // Load initially selected staff
    if (this.data.phase.assignedTo) {
      this.staffService.getStaffById(this.data.phase.assignedTo).subscribe((staff) => {
        this.selectedStaff = staff || null;
      });
    }
  }

  compareStaff(a: string | null, b: string | null): boolean {
    return a === b;
  }

  cancel() {
    this.dialogRef.close();
  }

  async assign() {
    if (!this.data.phase.id) {
      console.error('No phase ID provided');
      return;
    }

    if (!this.data.projectId) {
      console.error('No project ID provided');
      return;
    }

    this.saving = true;
    const staffId = this.assignForm.value.staffId;

    try {
      // Assigning phase with the provided data

      await this.phaseService.assignPhase(this.data.projectId, this.data.phase.id, staffId);

      this.dialogRef.close(true);
    } catch (error: unknown) {
      console.error('Error assigning phase:', error);
      const errorMessage = (error as Error)?.message || 'Failed to assign phase. Please try again.';
      alert(errorMessage);
    } finally {
      this.saving = false;
    }
  }
}
