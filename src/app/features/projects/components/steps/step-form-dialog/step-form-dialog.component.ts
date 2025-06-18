import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Step, StepStatus } from '../../../../../core/models/step.model';
import { Phase } from '../../../../../core/models/phase.model';
import { StepService } from '../../../../../core/services/step.service';
import { Observable } from 'rxjs';

interface DialogData {
  step?: Step;
  projectId: string;
  phaseId?: string;
  phases: Observable<Phase[]>;
}

@Component({
  selector: 'app-step-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSliderModule,
    MatIconModule,
    MatChipsModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.step ? 'Edit Step' : 'Add New Step' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="stepForm" class="step-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Phase</mat-label>
          <mat-select formControlName="phaseId" required>
            <mat-option *ngFor="let phase of phases$ | async" [value]="phase.id">
              {{ phase.name }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="stepForm.get('phaseId')?.hasError('required')">
            Please select a phase
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Step Name</mat-label>
          <input matInput formControlName="name" required />
          <mat-error *ngIf="stepForm.get('name')?.hasError('required')">
            Step name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate" />
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" />
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option [value]="StepStatus.PENDING">Pending</mat-option>
              <mat-option [value]="StepStatus.IN_PROGRESS">In Progress</mat-option>
              <mat-option [value]="StepStatus.COMPLETED">Completed</mat-option>
              <mat-option [value]="StepStatus.BLOCKED">Blocked</mat-option>
              <mat-option [value]="StepStatus.ON_HOLD">On Hold</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Progress (%)</mat-label>
            <input matInput type="number" formControlName="progress" min="0" max="100" />
            <mat-error *ngIf="stepForm.get('progress')?.hasError('min')">
              Progress must be at least 0
            </mat-error>
            <mat-error *ngIf="stepForm.get('progress')?.hasError('max')">
              Progress cannot exceed 100
            </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Estimated Duration (days)</mat-label>
          <input matInput type="number" formControlName="estimatedDuration" min="1" />
        </mat-form-field>

        <div class="deliverables-section">
          <label>Deliverables</label>
          <mat-chip-grid #chipGrid>
            <mat-chip-row
              *ngFor="let deliverable of deliverables"
              (removed)="removeDeliverable(deliverable)"
            >
              {{ deliverable }}
              <button matChipRemove>
                <mat-icon>cancel</mat-icon>
              </button>
            </mat-chip-row>
            <input
              placeholder="Add deliverable..."
              [matChipInputFor]="chipGrid"
              [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
              (matChipInputTokenEnd)="addDeliverable($event)"
            />
          </mat-chip-grid>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="!stepForm.valid || loading"
        (click)="save()"
      >
        {{ loading ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .step-form {
        min-width: 400px;
        padding: 16px 0;
      }

      .full-width {
        width: 100%;
        margin-bottom: 16px;
      }

      .row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }

      .half-width {
        flex: 1;
      }

      .deliverables-section {
        margin-bottom: 16px;
      }

      .deliverables-section label {
        display: block;
        margin-bottom: 8px;
        color: rgba(0, 0, 0, 0.6);
        font-size: 12px;
      }

      mat-chip-grid {
        width: 100%;
      }

      @media (max-width: 600px) {
        .row {
          flex-direction: column;
        }

        .half-width {
          width: 100%;
        }
      }
    `,
  ],
})
export class StepFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stepService = inject(StepService);

  stepForm!: FormGroup;
  phases$: Observable<Phase[]>;
  loading = false;
  deliverables: string[] = [];
  readonly separatorKeysCodes = [13, 188]; // Enter and comma
  readonly StepStatus = StepStatus;

  constructor(
    public dialogRef: MatDialogRef<StepFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {
    this.phases$ = data.phases;
  }

  ngOnInit() {
    this.initForm();
    if (this.data.step) {
      this.populateForm(this.data.step);
    }
  }

  initForm() {
    this.stepForm = this.fb.group({
      phaseId: [this.data.phaseId || '', Validators.required],
      name: ['', Validators.required],
      description: [''],
      startDate: [null],
      endDate: [null],
      status: [StepStatus.PENDING],
      progress: [0, [Validators.min(0), Validators.max(100)]],
      estimatedDuration: [null, Validators.min(1)],
    });
  }

  populateForm(step: Step) {
    this.stepForm.patchValue({
      phaseId: step.phaseId,
      name: step.name,
      description: step.description || '',
      startDate: step.startDate,
      endDate: step.endDate,
      status: step.status,
      progress: step.progress,
      estimatedDuration: step.estimatedDuration,
    });
    this.deliverables = step.deliverables || [];
  }

  addDeliverable(event: any) {
    const value = (event.value || '').trim();
    if (value) {
      this.deliverables.push(value);
    }
    event.chipInput!.clear();
  }

  removeDeliverable(deliverable: string) {
    const index = this.deliverables.indexOf(deliverable);
    if (index >= 0) {
      this.deliverables.splice(index, 1);
    }
  }

  save() {
    if (this.stepForm.valid) {
      this.loading = true;
      const formValue = this.stepForm.value;

      const stepData: Omit<Step, 'id'> = {
        projectId: this.data.projectId,
        phaseId: formValue.phaseId,
        name: formValue.name,
        description: formValue.description || undefined,
        orderNo: this.data.step?.orderNo || 999, // Will be properly set on backend
        status: formValue.status,
        progress: formValue.progress || 0,
        startDate: formValue.startDate || undefined,
        endDate: formValue.endDate || undefined,
        estimatedDuration: formValue.estimatedDuration || undefined,
        deliverables: this.deliverables.length > 0 ? this.deliverables : undefined,
      };

      if (this.data.step) {
        this.stepService.updateStep(this.data.step.id!, stepData).subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: (error: any) => {
            console.error('Error saving step:', error);
            this.loading = false;
          },
        });
      } else {
        this.stepService.createStep(stepData).subscribe({
          next: () => {
            this.dialogRef.close(true);
          },
          error: (error: any) => {
            console.error('Error saving step:', error);
            this.loading = false;
          },
        });
      }
    }
  }
}
