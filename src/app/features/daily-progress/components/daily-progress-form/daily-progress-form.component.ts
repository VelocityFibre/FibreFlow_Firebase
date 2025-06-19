import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, of } from 'rxjs';
import { DailyProgress, MaterialUsage } from '../../models/daily-progress.model';
import { ProjectService } from '../../../../core/services/project.service';
import { PhaseService } from '../../../../core/services/phase.service';
import { Phase } from '../../../../core/models/phase.model';
import { TaskService } from '../../../../core/services/task.service';
import { Task } from '../../../../core/models/task.model';
import { StaffService } from '../../../staff/services/staff.service';
import { ContractorService } from '../../../contractors/services/contractor.service';
import { StockService } from '../../../stock/services/stock.service';
import { StockItem } from '../../../stock/models/stock-item.model';

@Component({
  selector: 'app-daily-progress-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatChipsModule,
    MatAutocompleteModule,
  ],
  template: `
    <form [formGroup]="progressForm" (ngSubmit)="onSubmit()" class="daily-progress-form">
      <mat-form-field appearance="fill">
        <mat-label>Date</mat-label>
        <input matInput [matDatepicker]="picker" formControlName="date" required />
        <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-datepicker #picker></mat-datepicker>
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Project</mat-label>
        <mat-select
          formControlName="projectId"
          required
          (selectionChange)="onProjectChange($event.value)"
        >
          <mat-option *ngFor="let project of projects$ | async" [value]="project.id">
            {{ project.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill" *ngIf="phases$ | async as phases">
        <mat-label>Phase</mat-label>
        <mat-select formControlName="phaseId" (selectionChange)="onPhaseChange($event.value)">
          <mat-option value="">None</mat-option>
          <mat-option *ngFor="let phase of phases" [value]="phase.id">
            {{ phase.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill" *ngIf="tasks$ | async as tasks">
        <mat-label>Task</mat-label>
        <mat-select formControlName="taskId">
          <mat-option value="">None</mat-option>
          <mat-option *ngFor="let task of tasks" [value]="task.id">
            {{ task.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Description</mat-label>
        <textarea matInput formControlName="description" rows="3" required></textarea>
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Work Completed</mat-label>
        <textarea matInput formControlName="workCompleted" rows="4" required></textarea>
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Hours Worked</mat-label>
        <input matInput type="number" formControlName="hoursWorked" min="0" step="0.5" required />
      </mat-form-field>

      <div class="materials-section">
        <h3>Materials Used</h3>
        <div formArrayName="materialsUsed">
          <div
            *ngFor="let material of materialsUsed.controls; let i = index"
            [formGroupName]="i"
            class="material-row"
          >
            <mat-form-field appearance="fill">
              <mat-label>Material</mat-label>
              <mat-select formControlName="materialId" required>
                <mat-option *ngFor="let item of stockItems$ | async" [value]="item.id">
                  {{ item.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Quantity</mat-label>
              <input
                matInput
                type="number"
                formControlName="quantity"
                min="0"
                step="0.01"
                required
              />
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Unit</mat-label>
              <input matInput formControlName="unit" required />
            </mat-form-field>

            <button mat-icon-button color="warn" type="button" (click)="removeMaterial(i)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
        <button mat-button type="button" (click)="addMaterial()">
          <mat-icon>add</mat-icon> Add Material
        </button>
      </div>

      <mat-form-field appearance="fill">
        <mat-label>Issues Encountered</mat-label>
        <textarea matInput formControlName="issuesEncountered" rows="3"></textarea>
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Next Steps</mat-label>
        <textarea matInput formControlName="nextSteps" rows="3"></textarea>
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Weather Conditions</mat-label>
        <input matInput formControlName="weather" />
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Staff Members</mat-label>
        <mat-select formControlName="staffIds" multiple required>
          <mat-option *ngFor="let staff of staff$ | async" [value]="staff.id">
            {{ staff.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill">
        <mat-label>Contractor</mat-label>
        <mat-select formControlName="contractorId">
          <mat-option value="">None</mat-option>
          <mat-option *ngFor="let contractor of contractors$ | async" [value]="contractor.id">
            {{ contractor.companyName }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <div class="form-actions">
        <button mat-button type="button" (click)="cancelForm.emit()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          type="submit"
          [disabled]="!progressForm.valid || isSubmitting"
        >
          {{ isSubmitting ? 'Saving...' : progress ? 'Update' : 'Create' }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .daily-progress-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      .materials-section {
        margin: 16px 0;
        padding: 16px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
      }

      .material-row {
        display: flex;
        gap: 16px;
        align-items: center;
        margin-bottom: 16px;
      }

      .material-row mat-form-field {
        flex: 1;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        margin-top: 24px;
      }

      mat-form-field {
        width: 100%;
      }
    `,
  ],
})
export class DailyProgressFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private phaseService = inject(PhaseService);
  private taskService = inject(TaskService);
  private staffService = inject(StaffService);
  private contractorService = inject(ContractorService);
  private stockService = inject(StockService);

  @Input() progress?: DailyProgress;
  @Output() save = new EventEmitter<Partial<DailyProgress>>();
  @Output() cancelForm = new EventEmitter<void>();

  progressForm: FormGroup;
  isSubmitting = false;

  projects$ = this.projectService.getProjects();
  phases$?: Observable<Phase[]>;
  tasks$?: Observable<Task[]>;
  staff$ = this.staffService.getStaff();
  contractors$ = this.contractorService.getContractors();
  stockItems$: Observable<StockItem[]> = of([]);

  constructor() {
    this.progressForm = this.fb.group({
      date: [new Date(), Validators.required],
      projectId: ['', Validators.required],
      phaseId: [''],
      taskId: [''],
      description: ['', Validators.required],
      workCompleted: ['', Validators.required],
      hoursWorked: [0, [Validators.required, Validators.min(0)]],
      materialsUsed: this.fb.array([]),
      issuesEncountered: [''],
      nextSteps: [''],
      weather: [''],
      staffIds: [[], Validators.required],
      contractorId: [''],
      status: ['draft'],
    });
  }

  ngOnInit() {
    if (this.progress) {
      this.progressForm.patchValue({
        ...this.progress,
        date:
          this.progress.date instanceof Date ? this.progress.date : new Date(this.progress.date),
      });

      if (this.progress.materialsUsed) {
        this.progress.materialsUsed.forEach((material) => {
          this.addMaterial(material);
        });
      }

      if (this.progress.projectId) {
        this.onProjectChange(this.progress.projectId);
      }
    }
  }

  get materialsUsed() {
    return this.progressForm.get('materialsUsed') as FormArray;
  }

  addMaterial(material?: MaterialUsage) {
    const materialGroup = this.fb.group({
      materialId: [material?.materialId || '', Validators.required],
      materialName: [material?.materialName || ''],
      quantity: [material?.quantity || 0, [Validators.required, Validators.min(0)]],
      unit: [material?.unit || '', Validators.required],
    });
    this.materialsUsed.push(materialGroup);
  }

  removeMaterial(index: number) {
    this.materialsUsed.removeAt(index);
  }

  onProjectChange(projectId: string) {
    if (projectId) {
      this.phases$ = this.phaseService.getByProject(projectId);
      this.stockItems$ = this.stockService.getStockItems(projectId);
      this.progressForm.patchValue({ phaseId: '', taskId: '' });
    }
  }

  onPhaseChange(phaseId: string) {
    if (phaseId) {
      this.tasks$ = this.taskService.getByPhase(phaseId);
      this.progressForm.patchValue({ taskId: '' });
    }
  }

  onSubmit() {
    if (this.progressForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const formValue = this.progressForm.value;

      // Add material names
      const materialsWithNames = formValue.materialsUsed.map(
        (material: { materialId: string; quantity: number; materialName?: string }) => {
          return {
            ...material,
            materialName: material.materialName || '',
          };
        },
      );

      const progressData: Partial<DailyProgress> = {
        ...formValue,
        materialsUsed: materialsWithNames,
      };

      this.save.emit(progressData);
    }
  }
}
