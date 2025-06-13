import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { Task, TaskStatus, TaskPriority } from '../../../../core/models/task.model';

interface TaskFormData {
  task: Task | null;
}

@Component({
  selector: 'app-task-form-dialog',
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
    MatSliderModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.task ? 'Edit Task' : 'Create New Task' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="taskForm" class="task-form">
        <!-- Task Name -->
        <mat-form-field appearance="outline">
          <mat-label>Task Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter task name">
          <mat-error *ngIf="taskForm.get('name')?.hasError('required')">
            Task name is required
          </mat-error>
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" 
                    rows="3" 
                    placeholder="Enter task description"></textarea>
        </mat-form-field>

        <!-- Project & Phase -->
        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Project</mat-label>
            <mat-select formControlName="projectId">
              <mat-option value="1">Westside Fiber Deployment</mat-option>
              <mat-option value="2">Downtown Network Expansion</mat-option>
              <mat-option value="3">Rural Connectivity Phase 2</mat-option>
              <mat-option value="4">Industrial Park Installation</mat-option>
            </mat-select>
            <mat-error *ngIf="taskForm.get('projectId')?.hasError('required')">
              Project is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Phase</mat-label>
            <mat-select formControlName="phaseId">
              <mat-option value="1">Planning</mat-option>
              <mat-option value="2">Initiate Project (IP)</mat-option>
              <mat-option value="3">Work in Progress (WIP)</mat-option>
              <mat-option value="4">Handover</mat-option>
              <mat-option value="5">Handover Complete (HOC)</mat-option>
              <mat-option value="6">Final Acceptance (FAC)</mat-option>
            </mat-select>
            <mat-error *ngIf="taskForm.get('phaseId')?.hasError('required')">
              Phase is required
            </mat-error>
          </mat-form-field>
        </div>

        <!-- Priority & Status -->
        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Priority</mat-label>
            <mat-select formControlName="priority">
              <mat-option [value]="TaskPriority.LOW">Low</mat-option>
              <mat-option [value]="TaskPriority.MEDIUM">Medium</mat-option>
              <mat-option [value]="TaskPriority.HIGH">High</mat-option>
              <mat-option [value]="TaskPriority.CRITICAL">Critical</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option [value]="TaskStatus.PENDING">Pending</mat-option>
              <mat-option [value]="TaskStatus.IN_PROGRESS">In Progress</mat-option>
              <mat-option [value]="TaskStatus.COMPLETED">Completed</mat-option>
              <mat-option [value]="TaskStatus.BLOCKED">Blocked</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Assignee & Due Date -->
        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Assignee</mat-label>
            <mat-select formControlName="assignedTo">
              <mat-option value="">Unassigned</mat-option>
              <mat-option value="john-doe">John Doe</mat-option>
              <mat-option value="sarah-johnson">Sarah Johnson</mat-option>
              <mat-option value="mike-wilson">Mike Wilson</mat-option>
              <mat-option value="emily-chen">Emily Chen</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Due Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="dueDate">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>

        <!-- Estimated Hours & Progress -->
        <div class="row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Estimated Hours</mat-label>
            <input matInput type="number" formControlName="estimatedHours" min="0">
          </mat-form-field>

          <div class="half-width progress-section">
            <label>Completion Percentage</label>
            <div class="slider-container">
              <mat-slider min="0" max="100" step="5" showTickMarks discrete>
                <input matSliderThumb formControlName="completionPercentage">
              </mat-slider>
              <span class="percentage-label">{{ taskForm.get('completionPercentage')?.value }}%</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button 
              color="primary" 
              (click)="save()" 
              [disabled]="!taskForm.valid">
        {{ data.task ? 'Update' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .task-form {
      width: 100%;
      max-width: 600px;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .row {
      display: flex;
      gap: 16px;
    }

    .half-width {
      flex: 1;
    }

    .progress-section {
      margin-bottom: 16px;
    }

    .progress-section label {
      display: block;
      margin-bottom: 8px;
      color: rgba(0, 0, 0, 0.6);
      font-size: 12px;
    }

    .slider-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .slider-container mat-slider {
      flex: 1;
    }

    .percentage-label {
      min-width: 40px;
      text-align: right;
      font-weight: 500;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class TaskFormDialogComponent implements OnInit {
  taskForm!: FormGroup;
  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TaskFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskFormData
  ) {}

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    const task = this.data.task;
    
    this.taskForm = this.fb.group({
      name: [task?.name || '', Validators.required],
      description: [task?.description || ''],
      projectId: [task?.projectId || '', Validators.required],
      phaseId: [task?.phaseId || '', Validators.required],
      priority: [task?.priority || TaskPriority.MEDIUM],
      status: [task?.status || TaskStatus.PENDING],
      assignedTo: [task?.assignedTo || ''],
      dueDate: [task?.dueDate ? new Date(task.dueDate) : null],
      estimatedHours: [task?.estimatedHours || null],
      completionPercentage: [task?.completionPercentage || 0],
      notes: [task?.notes || '']
    });

    // Update assignedToName when assignedTo changes
    this.taskForm.get('assignedTo')?.valueChanges.subscribe(value => {
      // This would normally lookup the user name from a service
      const userMap: { [key: string]: string } = {
        'john-doe': 'John Doe',
        'sarah-johnson': 'Sarah Johnson',
        'mike-wilson': 'Mike Wilson',
        'emily-chen': 'Emily Chen'
      };
      this.taskForm.patchValue({
        assignedToName: userMap[value] || ''
      }, { emitEvent: false });
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  save() {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      
      // Map assignee ID to name (this would normally be done by a service)
      const userMap: { [key: string]: string } = {
        'john-doe': 'John Doe',
        'sarah-johnson': 'Sarah Johnson',
        'mike-wilson': 'Mike Wilson',
        'emily-chen': 'Emily Chen'
      };
      
      const taskData: Partial<Task> = {
        ...this.data.task,
        ...formValue,
        assignedToName: userMap[formValue.assignedTo] || undefined,
        orderNo: this.data.task?.orderNo || 1
      };

      this.dialogRef.close(taskData);
    }
  }
}