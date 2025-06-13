import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { Phase, PhaseStatus, DependencyType, DEFAULT_PHASES } from '../../../../../core/models/phase.model';
import { PhaseService } from '../../../../../core/services/phase.service';

@Component({
  selector: 'app-phase-management-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    DragDropModule
  ],
  template: `
    <h2 mat-dialog-title>Manage Project Phases</h2>
    
    <mat-dialog-content class="dialog-content">
      <form [formGroup]="phasesForm">
        <div class="phases-list" cdkDropList (cdkDropListDropped)="drop($event)">
          <div 
            *ngFor="let phase of phasesArray.controls; let i = index" 
            class="phase-item"
            cdkDrag
            [cdkDragDisabled]="phase.get('status')?.value === 'completed'">
            
            <div class="phase-drag-handle" cdkDragHandle>
              <mat-icon>drag_indicator</mat-icon>
            </div>
            
            <div class="phase-content" [formGroup]="$any(phase)">
              <div class="phase-header">
                <mat-form-field class="phase-name">
                  <mat-label>Phase Name</mat-label>
                  <input matInput formControlName="name" placeholder="Enter phase name">
                </mat-form-field>
                
                <mat-form-field class="phase-status">
                  <mat-label>Status</mat-label>
                  <mat-select formControlName="status">
                    <mat-option value="pending">Pending</mat-option>
                    <mat-option value="active">Active</mat-option>
                    <mat-option value="completed">Completed</mat-option>
                    <mat-option value="blocked">Blocked</mat-option>
                  </mat-select>
                </mat-form-field>
                
                <button 
                  mat-icon-button 
                  color="warn" 
                  (click)="removePhase(i)"
                  [disabled]="phase.get('status')?.value === 'completed'"
                  matTooltip="Remove phase">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
              
              <mat-form-field class="phase-description">
                <mat-label>Description</mat-label>
                <textarea 
                  matInput 
                  formControlName="description" 
                  rows="2"
                  placeholder="Describe this phase">
                </textarea>
              </mat-form-field>
              
              <!-- Dependencies Section -->
              <div class="dependencies-section">
                <div class="section-header">
                  <span class="section-title">Dependencies</span>
                  <button 
                    mat-icon-button 
                    (click)="addDependency(i)"
                    matTooltip="Add dependency">
                    <mat-icon>add_circle</mat-icon>
                  </button>
                </div>
                
                <div formArrayName="dependencies" class="dependencies-list">
                  <div 
                    *ngFor="let dep of getDependencies(i).controls; let j = index" 
                    [formGroup]="$any(dep)"
                    class="dependency-item">
                    
                    <mat-form-field class="dep-phase">
                      <mat-label>Depends on</mat-label>
                      <mat-select formControlName="phaseId">
                        <mat-option 
                          *ngFor="let availPhase of getAvailablePhasesForDependency(i)" 
                          [value]="availPhase.id">
                          {{ availPhase.name }}
                        </mat-option>
                      </mat-select>
                    </mat-form-field>
                    
                    <mat-form-field class="dep-type">
                      <mat-label>Type</mat-label>
                      <mat-select formControlName="type">
                        <mat-option value="finish-to-start">Finish to Start</mat-option>
                        <mat-option value="start-to-start">Start to Start</mat-option>
                        <mat-option value="finish-to-finish">Finish to Finish</mat-option>
                      </mat-select>
                    </mat-form-field>
                    
                    <button 
                      mat-icon-button 
                      color="warn" 
                      (click)="removeDependency(i, j)"
                      matTooltip="Remove dependency">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                  
                  <div class="no-dependencies" *ngIf="getDependencies(i).length === 0">
                    No dependencies configured
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="add-phase-section">
          <button mat-button color="primary" (click)="addPhase()">
            <mat-icon>add</mat-icon>
            Add New Phase
          </button>
          
          <button mat-button (click)="resetToDefaults()">
            <mat-icon>restore</mat-icon>
            Reset to Default Phases
          </button>
        </div>
      </form>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button 
        mat-raised-button 
        color="primary" 
        (click)="save()"
        [disabled]="!phasesForm.valid || saving">
        {{ saving ? 'Saving...' : 'Save Changes' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      width: 800px;
      max-height: 600px;
      padding: 0;
    }
    
    .phases-list {
      margin-bottom: 24px;
      max-height: 450px;
      overflow-y: auto;
    }
    
    .phase-item {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      margin-bottom: 16px;
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: move;
      
      &:hover {
        background: #f0f0f0;
      }
      
      &.cdk-drag-preview {
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        opacity: 0.9;
      }
      
      &.cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    }
    
    .phase-drag-handle {
      margin-right: 16px;
      color: #999;
      cursor: grab;
      
      &:active {
        cursor: grabbing;
      }
    }
    
    .phase-content {
      flex: 1;
    }
    
    .phase-header {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      align-items: flex-start;
    }
    
    .phase-name {
      flex: 1;
    }
    
    .phase-status {
      width: 150px;
    }
    
    .phase-description {
      width: 100%;
      margin-bottom: 16px;
    }
    
    .dependencies-section {
      background: white;
      padding: 16px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .section-title {
      font-weight: 500;
      color: #666;
    }
    
    .dependencies-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .dependency-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    
    .dep-phase {
      flex: 1;
    }
    
    .dep-type {
      width: 180px;
    }
    
    .no-dependencies {
      color: #999;
      font-style: italic;
      padding: 8px 0;
    }
    
    .add-phase-section {
      display: flex;
      gap: 16px;
      padding: 16px;
      border-top: 1px solid #e0e0e0;
    }
    
    mat-form-field {
      font-size: 14px;
    }
    
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class PhaseManagementDialogComponent implements OnInit {
  phasesForm!: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private phaseService: PhaseService,
    public dialogRef: MatDialogRef<PhaseManagementDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectId: string; phases: Phase[] }
  ) {}

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    this.phasesForm = this.fb.group({
      phases: this.fb.array([])
    });

    // Initialize with existing phases
    if (this.data.phases && this.data.phases.length > 0) {
      this.data.phases.forEach(phase => {
        this.addExistingPhase(phase);
      });
    } else {
      // Initialize with default phases if none exist
      this.resetToDefaults();
    }
  }

  get phasesArray() {
    return this.phasesForm.get('phases') as FormArray;
  }

  addExistingPhase(phase: Phase) {
    const phaseGroup = this.fb.group({
      id: [phase.id],
      name: [phase.name, Validators.required],
      description: [phase.description],
      orderNo: [phase.orderNo],
      status: [phase.status],
      dependencies: this.fb.array([])
    });

    // Add existing dependencies
    if (phase.dependencies) {
      phase.dependencies.forEach(dep => {
        this.addExistingDependency(phaseGroup, dep);
      });
    }

    this.phasesArray.push(phaseGroup);
  }

  addExistingDependency(phaseGroup: FormGroup, dependency: any) {
    const dependencies = phaseGroup.get('dependencies') as FormArray;
    dependencies.push(this.fb.group({
      phaseId: [dependency.phaseId, Validators.required],
      type: [dependency.type, Validators.required]
    }));
  }

  addPhase() {
    const newPhase = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      description: [''],
      orderNo: [this.phasesArray.length],
      status: ['pending'],
      dependencies: this.fb.array([])
    });

    this.phasesArray.push(newPhase);
  }

  removePhase(index: number) {
    const phase = this.phasesArray.at(index);
    if (phase.get('status')?.value === 'completed') {
      return; // Can't remove completed phases
    }

    if (confirm('Are you sure you want to remove this phase?')) {
      this.phasesArray.removeAt(index);
      this.updateOrderNumbers();
    }
  }

  getDependencies(phaseIndex: number): FormArray {
    return this.phasesArray.at(phaseIndex).get('dependencies') as FormArray;
  }

  addDependency(phaseIndex: number) {
    const dependencies = this.getDependencies(phaseIndex);
    dependencies.push(this.fb.group({
      phaseId: ['', Validators.required],
      type: ['finish-to-start', Validators.required]
    }));
  }

  removeDependency(phaseIndex: number, depIndex: number) {
    const dependencies = this.getDependencies(phaseIndex);
    dependencies.removeAt(depIndex);
  }

  getAvailablePhasesForDependency(currentPhaseIndex: number): any[] {
    // Can only depend on phases that come before this one
    return this.phasesArray.controls
      .slice(0, currentPhaseIndex)
      .map((phase, index) => ({
        id: phase.get('id')?.value || `temp-${index}`,
        name: phase.get('name')?.value || `Phase ${index + 1}`
      }));
  }

  drop(event: CdkDragDrop<any[]>) {
    const array = this.phasesArray;
    const controls = array.controls;
    const prevIndex = event.previousIndex;
    const currIndex = event.currentIndex;

    // Move the form control
    const dir = currIndex > prevIndex ? 1 : -1;
    const from = prevIndex;
    const to = currIndex;

    const temp = controls[from];
    for (let i = from; i * dir < to * dir; i = i + dir) {
      const current = controls[i + dir];
      controls[i] = current;
      array.setControl(i, current);
    }
    controls[to] = temp;
    array.setControl(to, temp);

    this.updateOrderNumbers();
  }

  updateOrderNumbers() {
    this.phasesArray.controls.forEach((phase, index) => {
      phase.patchValue({ orderNo: index });
    });
  }

  resetToDefaults() {
    if (this.phasesArray.length > 0 && !confirm('This will replace all current phases with the default phases. Continue?')) {
      return;
    }

    this.phasesArray.clear();
    
    DEFAULT_PHASES.forEach((template, index) => {
      const phaseGroup = this.fb.group({
        id: [null],
        name: [template.name, Validators.required],
        description: [template.description],
        orderNo: [template.orderNo],
        status: ['pending'],
        dependencies: this.fb.array([])
      });

      // Add default dependencies
      if (template.defaultDependencies) {
        template.defaultDependencies.forEach((dep: any) => {
          const depIndex = DEFAULT_PHASES.findIndex(p => 
            p.name.toLowerCase().replace(/\s+/g, '-') === dep.phaseId
          );
          if (depIndex !== -1 && depIndex < index) {
            const dependencies = phaseGroup.get('dependencies') as FormArray;
            dependencies.push(this.fb.group({
              phaseId: [`temp-${depIndex}`],
              type: [dep.type, Validators.required]
            }));
          }
        });
      }

      this.phasesArray.push(phaseGroup);
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  async save() {
    if (!this.phasesForm.valid) return;

    this.saving = true;
    try {
      const phases = this.phasesArray.value;
      
      // Update phases in Firebase
      await this.phaseService.updateProjectPhases(this.data.projectId, phases);
      
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving phases:', error);
      alert('Failed to save phases. Please try again.');
    } finally {
      this.saving = false;
    }
  }
}