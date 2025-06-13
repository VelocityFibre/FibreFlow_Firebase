import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { Phase, PhaseStatus, DependencyType, PhaseTemplate, PhaseDependency } from '../../../../core/models/phase.model';
import { PhaseService } from '../../../../core/services/phase.service';

interface PhaseFormData {
  phase?: PhaseTemplate | null;
}

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
    MatIconModule,
    MatCheckboxModule,
    MatDividerModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.phase ? 'Edit Phase Template' : 'Add Phase Template' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="phaseForm" class="phase-form">
        <!-- Basic Information -->
        <div class="form-section">
          <h3>Basic Information</h3>
          
          <mat-form-field appearance="outline">
            <mat-label>Phase Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g., Planning, Work in Progress">
            <mat-error *ngIf="phaseForm.get('name')?.hasError('required')">
              Phase name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3" 
                      placeholder="Describe what this phase involves"></textarea>
            <mat-error *ngIf="phaseForm.get('description')?.hasError('required')">
              Description is required
            </mat-error>
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Order</mat-label>
              <input matInput type="number" formControlName="orderNo" placeholder="1">
              <mat-hint>Phases are executed in order</mat-hint>
              <mat-error *ngIf="phaseForm.get('orderNo')?.hasError('required')">
                Order is required
              </mat-error>
            </mat-form-field>

            <mat-checkbox formControlName="isDefault" class="half-width default-checkbox">
              Default Phase Template
            </mat-checkbox>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Dependencies -->
        <div class="form-section">
          <div class="section-header">
            <h3>Dependencies</h3>
            <button mat-button type="button" (click)="addDependency()">
              <mat-icon>add</mat-icon>
              Add Dependency
            </button>
          </div>

          <div formArrayName="dependencies" class="dependencies-list">
            <div *ngFor="let dependency of dependencies.controls; let i = index" 
                 [formGroupName]="i" class="dependency-item">
              <mat-form-field appearance="outline" class="dependency-phase">
                <mat-label>Depends on Phase</mat-label>
                <mat-select formControlName="phaseId">
                  <mat-option *ngFor="let phase of availablePhases" [value]="phase.id">
                    {{ phase.name }}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="dependency-type">
                <mat-label>Dependency Type</mat-label>
                <mat-select formControlName="type">
                  <mat-option [value]="'finish_to_start'">Finish to Start</mat-option>
                  <mat-option [value]="'start_to_start'">Start to Start</mat-option>
                  <mat-option [value]="'finish_to_finish'">Finish to Finish</mat-option>
                </mat-select>
              </mat-form-field>

              <button mat-icon-button type="button" (click)="removeDependency(i)" 
                      class="remove-dependency">
                <mat-icon>delete</mat-icon>
              </button>
            </div>

            <p class="no-dependencies" *ngIf="dependencies.length === 0">
              No dependencies defined. This phase can start independently.
            </p>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Advanced Settings -->
        <div class="form-section">
          <h3>Advanced Settings</h3>
          
          <!-- Advanced settings commented out until properties are added to Phase model -->
          <!--
          <mat-checkbox formControlName="isMilestone">
            Mark as Milestone Phase
          </mat-checkbox>
          <p class="checkbox-hint">Milestone phases are highlighted in project views</p>

          <mat-checkbox formControlName="requiresApproval">
            Requires Approval to Complete
          </mat-checkbox>
          <p class="checkbox-hint">Phase completion will need manager approval</p>

          <mat-checkbox formControlName="autoStart">
            Auto-start when Dependencies are Met
          </mat-checkbox>
          <p class="checkbox-hint">Phase will automatically begin when all dependencies are completed</p>
          -->
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!phaseForm.valid">
        {{ data.phase ? 'Update Phase' : 'Add Phase' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .phase-form {
      width: 100%;
      max-width: 600px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .form-section h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 500;
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

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .dependencies-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .dependency-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .dependency-phase {
      flex: 2;
    }

    .dependency-type {
      flex: 1;
    }

    .remove-dependency {
      margin-top: 8px;
    }

    .no-dependencies {
      color: #666;
      font-style: italic;
      margin: 16px 0;
    }

    mat-checkbox {
      display: block;
      margin-bottom: 8px;
    }

    .checkbox-hint {
      margin: 0 0 16px 32px;
      font-size: 13px;
      color: #666;
    }

    .default-checkbox {
      margin-top: 12px;
    }

    mat-divider {
      margin: 24px 0;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class PhaseFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private phaseService = inject(PhaseService);
  
  phaseForm!: FormGroup;
  availablePhases: PhaseTemplate[] = [];

  constructor(
    public dialogRef: MatDialogRef<PhaseFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PhaseFormData
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadAvailablePhases();
  }

  initializeForm() {
    const phase = this.data.phase;
    
    this.phaseForm = this.fb.group({
      name: [phase?.name || '', Validators.required],
      description: [phase?.description || '', Validators.required],
      orderNo: [phase?.orderNo || 1, [Validators.required, Validators.min(1)]],
      isDefault: [phase?.isDefault || false],
      dependencies: this.fb.array([])
    });

    // Add existing dependencies
    if (phase?.defaultDependencies) {
      phase.defaultDependencies.forEach(dep => this.addDependency(dep));
    }
  }

  loadAvailablePhases() {
    // Load phases that can be used as dependencies
    // For now, use default phases
    // For now, use empty array until getDefaultPhases is implemented
    this.availablePhases = [];
    // TODO: Implement getDefaultPhases() in PhaseService or use DEFAULT_PHASES from model
  }

  get dependencies() {
    return this.phaseForm.get('dependencies') as FormArray;
  }

  addDependency(dependency?: PhaseDependency) {
    const dependencyGroup = this.fb.group({
      phaseId: [dependency?.phaseId || '', Validators.required],
      type: [dependency?.type || DependencyType.FINISH_TO_START, Validators.required]
    });

    this.dependencies.push(dependencyGroup);
  }

  removeDependency(index: number) {
    this.dependencies.removeAt(index);
  }

  cancel() {
    this.dialogRef.close();
  }

  save() {
    if (this.phaseForm.valid) {
      const formValue = this.phaseForm.value;
      
      const phaseData: PhaseTemplate = {
        ...this.data.phase,
        name: formValue.name,
        description: formValue.description,
        orderNo: formValue.orderNo,
        isDefault: formValue.isDefault,
        defaultDependencies: formValue.dependencies.filter((dep: any) => dep.phaseId)
      };

      this.dialogRef.close(phaseData);
    }
  }
}