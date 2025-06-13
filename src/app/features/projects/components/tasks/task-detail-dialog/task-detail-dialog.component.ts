import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { Task, TaskStatus, TaskPriority } from '../../../../../core/models/task.model';
import { TaskService } from '../../../../../core/services/task.service';
import { PhaseService } from '../../../../../core/services/phase.service';
import { StaffService } from '../../../../staff/services/staff.service';
import { Phase } from '../../../../../core/models/phase.model';
import { StaffMember } from '../../../../staff/models/staff.model';

interface DialogData {
  task?: Task;
  projectId?: string;
  phaseId?: string;
  mode: 'create' | 'edit' | 'view';
}

@Component({
  selector: 'app-task-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    MatChipsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ getDialogTitle() }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="taskForm" class="task-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Task Name</mat-label>
          <input matInput formControlName="name" [readonly]="isViewMode" />
          <mat-error *ngIf="taskForm.get('name')?.hasError('required')">
            Task name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="3"
            [readonly]="isViewMode"
          ></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Phase</mat-label>
            <mat-select formControlName="phaseId" [disabled]="isViewMode">
              <mat-option *ngFor="let phase of phases$ | async" [value]="phase.id">
                {{ phase.name }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="taskForm.get('phaseId')?.hasError('required')">
              Phase is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Priority</mat-label>
            <mat-select formControlName="priority" [disabled]="isViewMode">
              <mat-option value="low">Low</mat-option>
              <mat-option value="medium">Medium</mat-option>
              <mat-option value="high">High</mat-option>
              <mat-option value="critical">Critical</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status" [disabled]="isViewMode">
              <mat-option value="pending">Pending</mat-option>
              <mat-option value="in_progress">In Progress</mat-option>
              <mat-option value="completed">Completed</mat-option>
              <mat-option value="blocked">Blocked</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Assigned To</mat-label>
            <mat-select formControlName="assignedTo" [disabled]="isViewMode">
              <mat-option value="">Unassigned</mat-option>
              <mat-option *ngFor="let staff of staffMembers$ | async" [value]="staff.id">
                {{ staff.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Start Date</mat-label>
            <input
              matInput
              [matDatepicker]="startPicker"
              formControlName="startDate"
              [readonly]="isViewMode"
            />
            <mat-datepicker-toggle
              matSuffix
              [for]="startPicker"
              [disabled]="isViewMode"
            ></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Due Date</mat-label>
            <input
              matInput
              [matDatepicker]="duePicker"
              formControlName="dueDate"
              [readonly]="isViewMode"
            />
            <mat-datepicker-toggle
              matSuffix
              [for]="duePicker"
              [disabled]="isViewMode"
            ></mat-datepicker-toggle>
            <mat-datepicker #duePicker></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Estimated Hours</mat-label>
            <input
              matInput
              type="number"
              formControlName="estimatedHours"
              [readonly]="isViewMode"
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Actual Hours</mat-label>
            <input matInput type="number" formControlName="actualHours" [readonly]="isViewMode" />
          </mat-form-field>
        </div>

        <div class="progress-section">
          <label for="completion-slider"
            >Completion Progress: {{ taskForm.get('completionPercentage')?.value }}%</label
          >
          <mat-slider
            id="completion-slider"
            [min]="0"
            [max]="100"
            [step]="5"
            [discrete]="true"
            [displayWith]="formatLabel"
            [disabled]="isViewMode"
          >
            <input matSliderThumb formControlName="completionPercentage" />
          </mat-slider>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3" [readonly]="isViewMode"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ isViewMode ? 'Close' : 'Cancel' }}
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSave()"
        *ngIf="!isViewMode"
        [disabled]="!taskForm.valid || isLoading"
      >
        {{ isLoading ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .task-form {
        min-width: 500px;
        padding: 16px 0;
      }

      .full-width {
        width: 100%;
      }

      .form-row {
        display: flex;
        gap: 16px;

        mat-form-field {
          flex: 1;
        }
      }

      .progress-section {
        margin: 16px 0;

        label {
          display: block;
          margin-bottom: 8px;
          color: rgba(0, 0, 0, 0.6);
          font-size: 14px;
        }

        mat-slider {
          width: 100%;
        }
      }

      @media (max-width: 600px) {
        .form-row {
          flex-direction: column;
        }

        .task-form {
          min-width: auto;
        }
      }
    `,
  ],
})
export class TaskDetailDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private phaseService = inject(PhaseService);
  private staffService = inject(StaffService);
  public dialogRef = inject(MatDialogRef<TaskDetailDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as DialogData;

  taskForm!: FormGroup;
  phases$!: Observable<Phase[]>;
  staffMembers$!: Observable<StaffMember[]>;
  isLoading = false;

  get isViewMode(): boolean {
    return this.data.mode === 'view';
  }

  constructor() {
    this.initializeForm();
  }

  ngOnInit() {
    if (this.data.projectId) {
      this.phases$ = this.phaseService.getProjectPhases(this.data.projectId);
    }
    this.staffMembers$ = this.staffService.getStaff();

    if (this.data.task) {
      this.taskForm.patchValue(this.data.task);
    } else if (this.data.phaseId) {
      this.taskForm.patchValue({ phaseId: this.data.phaseId });
    }
  }

  private initializeForm(): void {
    this.taskForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      phaseId: [this.data.phaseId || '', Validators.required],
      priority: [TaskPriority.MEDIUM],
      status: [TaskStatus.PENDING],
      assignedTo: [''],
      startDate: [null],
      dueDate: [null],
      estimatedHours: [null, [Validators.min(0)]],
      actualHours: [null, [Validators.min(0)]],
      completionPercentage: [0, [Validators.min(0), Validators.max(100)]],
      notes: [''],
    });
  }

  getDialogTitle(): string {
    switch (this.data.mode) {
      case 'create':
        return 'Create New Task';
      case 'edit':
        return 'Edit Task';
      case 'view':
        return 'Task Details';
      default:
        return 'Task';
    }
  }

  formatLabel(value: number): string {
    return `${value}%`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSave(): Promise<void> {
    if (!this.taskForm.valid) return;

    this.isLoading = true;
    const formValue = this.taskForm.value;

    try {
      if (this.data.mode === 'create') {
        const newTask: Omit<Task, 'id'> = {
          ...formValue,
          projectId: this.data.projectId,
          orderNo: Date.now(), // Simple ordering for now
        };
        await this.taskService.createTask(newTask);
      } else if (this.data.mode === 'edit' && this.data.task?.id) {
        await this.taskService.updateTask(this.data.task.id, formValue);
      }

      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
