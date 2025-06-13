import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-phase-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.phase ? 'Edit Phase' : 'Add New Phase' }}</h2>

    <form [formGroup]="phaseForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Phase Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter phase name" />
          <mat-error *ngIf="phaseForm.get('name')?.hasError('required')">
            Phase name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="3"
            placeholder="Enter phase description"
          ></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Phase Type</mat-label>
          <mat-select formControlName="type">
            <mat-option value="planning">Planning</mat-option>
            <mat-option value="execution">Execution</mat-option>
            <mat-option value="handover">Handover</mat-option>
            <mat-option value="milestone">Milestone</mat-option>
          </mat-select>
          <mat-error *ngIf="phaseForm.get('type')?.hasError('required')">
            Phase type is required
          </mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="phaseForm.invalid">
          {{ data.phase ? 'Update' : 'Add' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .full-width {
        width: 100%;
        margin-bottom: 16px;
      }

      mat-dialog-content {
        padding: 20px 24px;
      }
    `,
  ],
})
export class PhaseFormComponent {
  phaseForm: FormGroup;
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<PhaseFormComponent>);
  public data = inject<{ phase: any }>(MAT_DIALOG_DATA);

  constructor() {
    this.phaseForm = this.fb.group({
      name: [this.data.phase?.name || '', Validators.required],
      description: [this.data.phase?.description || ''],
      type: [this.data.phase?.type || 'planning', Validators.required],
    });
  }

  onSubmit() {
    if (this.phaseForm.valid) {
      this.dialogRef.close(this.phaseForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
