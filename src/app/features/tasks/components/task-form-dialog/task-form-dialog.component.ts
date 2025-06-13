import { Component, OnInit, inject } from '@angular/core';
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
import { ProjectService } from '../../../../core/services/project.service';
import { PhaseService } from '../../../../core/services/phase.service';
import { StaffService } from '../../../staff/services/staff.service';
import { DestroyRef } from '@angular/core';
import { Observable } from 'rxjs';

interface TaskFormData {
  task: any | null;
  isTemplate?: boolean;
  projectId?: string;
  phaseId?: string;
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
    MatSliderModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{
        data.isTemplate
          ? data.task
            ? 'Edit Task Template'
            : 'Create Task Template'
          : data.task
            ? 'Edit Task'
            : 'Create New Task'
      }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="taskForm" class="task-form">
        <!-- Task Name -->
        <mat-form-field appearance="outline">
          <mat-label>Task Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter task name" />
          <mat-error *ngIf="taskForm.get('name')?.hasError('required')">
            Task name is required
          </mat-error>
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="3"
            placeholder="Enter task description"
          ></textarea>
        </mat-form-field>

        <!-- Phase Type for Templates -->
        <mat-form-field appearance="outline" *ngIf="data.isTemplate">
          <mat-label>Phase Type</mat-label>
          <mat-select formControlName="phaseType">
            <mat-option value="planning">Planning</mat-option>
            <mat-option value="initiate_project">Initiate Project (IP)</mat-option>
            <mat-option value="work_in_progress">Work in Progress (WIP)</mat-option>
            <mat-option value="handover">Handover</mat-option>
            <mat-option value="handover_complete">Handover Complete (HOC)</mat-option>
            <mat-option value="final_acceptance">Final Acceptance (FAC)</mat-option>
          </mat-select>
          <mat-error *ngIf="taskForm.get('phaseType')?.hasError('required')">
            Phase type is required
          </mat-error>
        </mat-form-field>

        <!-- Project & Phase for regular tasks -->
        <div class="row" *ngIf="!data.isTemplate">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Project</mat-label>
            <mat-select
              formControlName="projectId"
              (selectionChange)="onProjectChange($event.value)"
            >
              <mat-option *ngFor="let project of projects$ | async" [value]="project.id">
                {{ project.name }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="taskForm.get('projectId')?.hasError('required')">
              Project is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Phase</mat-label>
            <mat-select formControlName="phaseId" [disabled]="!taskForm.get('projectId')?.value">
              <mat-option *ngFor="let phase of phases$ | async" [value]="phase.id">
                {{ phase.name }}
              </mat-option>
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

          <mat-form-field appearance="outline" class="half-width" *ngIf="!data.isTemplate">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option [value]="TaskStatus.PENDING">Pending</mat-option>
              <mat-option [value]="TaskStatus.IN_PROGRESS">In Progress</mat-option>
              <mat-option [value]="TaskStatus.COMPLETED">Completed</mat-option>
              <mat-option [value]="TaskStatus.BLOCKED">Blocked</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Estimated Days for Templates -->
        <mat-form-field appearance="outline" *ngIf="data.isTemplate">
          <mat-label>Estimated Days</mat-label>
          <input matInput type="number" formControlName="estimatedDays" min="1" />
          <mat-error *ngIf="taskForm.get('estimatedDays')?.hasError('required')">
            Estimated days is required
          </mat-error>
        </mat-form-field>

        <!-- Assignee & Due Date for regular tasks -->
        <div class="row" *ngIf="!data.isTemplate">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Assignee</mat-label>
            <mat-select formControlName="assignedTo">
              <mat-option value="">Unassigned</mat-option>
              <mat-option *ngFor="let member of staff$ | async" [value]="member.id">
                {{ member.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Due Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="dueDate" />
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>

        <!-- Estimated Hours & Progress for regular tasks -->
        <div class="row" *ngIf="!data.isTemplate">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Estimated Hours</mat-label>
            <input matInput type="number" formControlName="estimatedHours" min="0" />
          </mat-form-field>

          <div class="half-width progress-section">
            <label>Completion Percentage</label>
            <div class="slider-container">
              <mat-slider min="0" max="100" step="5" showTickMarks discrete>
                <input matSliderThumb formControlName="completionPercentage" />
              </mat-slider>
              <span class="percentage-label"
                >{{ taskForm.get('completionPercentage')?.value }}%</span
              >
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
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!taskForm.valid">
        {{ data.task ? 'Update' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
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
    `,
  ],
})
export class TaskFormDialogComponent implements OnInit {
  taskForm!: FormGroup;
  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;

  private projectService = inject(ProjectService);
  private phaseService = inject(PhaseService);
  private staffService = inject(StaffService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<TaskFormDialogComponent>);
  public data = inject(MAT_DIALOG_DATA) as TaskFormData;

  projects$ = this.projectService.getProjects();
  phases$: Observable<any[]> | null = null;
  staff$ = this.staffService.getStaff();

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    const task = this.data.task;

    if (this.data.isTemplate) {
      // Template mode - different fields
      this.taskForm = this.fb.group({
        name: [task?.name || '', Validators.required],
        description: [task?.description || ''],
        phaseType: [task?.phaseType || 'planning', Validators.required],
        priority: [task?.priority || TaskPriority.MEDIUM],
        estimatedDays: [task?.estimatedDays || 1, [Validators.required, Validators.min(1)]],
        notes: [task?.notes || ''],
      });
    } else {
      // Regular task mode
      this.taskForm = this.fb.group({
        name: [task?.name || '', Validators.required],
        description: [task?.description || ''],
        projectId: [task?.projectId || this.data.projectId || '', Validators.required],
        phaseId: [task?.phaseId || this.data.phaseId || '', Validators.required],
        priority: [task?.priority || TaskPriority.MEDIUM],
        status: [task?.status || TaskStatus.PENDING],
        assignedTo: [task?.assignedTo || ''],
        dueDate: [
          task?.dueDate
            ? task.dueDate.toDate
              ? task.dueDate.toDate()
              : new Date(task.dueDate)
            : null,
        ],
        estimatedHours: [task?.estimatedHours || null],
        completionPercentage: [task?.completionPercentage || 0],
        notes: [task?.notes || ''],
      });

      // Load phases if project is already selected
      if (this.taskForm.get('projectId')?.value) {
        this.loadProjectPhases(this.taskForm.get('projectId')?.value);
      }
    }
  }

  onProjectChange(projectId: string) {
    if (projectId) {
      this.loadProjectPhases(projectId);
      this.taskForm.patchValue({ phaseId: '' });
    } else {
      this.phases$ = null;
    }
  }

  private loadProjectPhases(projectId: string) {
    this.phases$ = this.phaseService.getProjectPhases(projectId);
  }

  cancel() {
    this.dialogRef.close();
  }

  save() {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;

      const taskData: Partial<Task> = {
        ...this.data.task,
        ...formValue,
        orderNo: this.data.task?.orderNo || 1,
      };

      this.dialogRef.close(taskData);
    }
  }
}
