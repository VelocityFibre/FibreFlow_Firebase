import { Component, OnInit, inject, signal, computed, Inject, Optional, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SowService } from '../../services/sow.service';
import { SOWExcelService } from '../../services/sow-excel.service';
import { SOWValidationService, ValidationResult } from '../../services/sow-validation.service';
import { ProjectService } from '../../../../core/services/project.service';
import { SOWData } from '../../models/sow.model';
import { ExcelParseResult } from '../../models/sow-import.model';

// Import component parts
import { SOWImportComponent } from '../../components/sow-import/sow-import.component';
import { SOWValidationComponent } from '../../components/sow-validation/sow-validation.component';
import { SOWCalculationsComponent } from '../../components/sow-calculations/sow-calculations.component';
import { SOWSummaryComponent } from '../../components/sow-summary/sow-summary.component';

@Component({
  selector: 'app-sow-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    SOWImportComponent,
    SOWValidationComponent,
    SOWCalculationsComponent,
    SOWSummaryComponent
  ],
  template: `
    <div class="sow-wizard-container">
      <!-- Header -->
      <div class="wizard-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-content">
          <h1>Scope of Work Wizard</h1>
          <p class="project-info" *ngIf="selectedProject()">
            Project: {{ selectedProject()?.title }}
          </p>
        </div>
      </div>

      <!-- Progress Bar -->
      <mat-progress-bar 
        mode="determinate" 
        [value]="progressValue()"
        class="wizard-progress">
      </mat-progress-bar>

      <!-- Stepper -->
      <mat-stepper 
        [linear]="true" 
        #stepper
        class="wizard-stepper"
        (selectionChange)="onStepChange($event)">
        
        <!-- Step 1: Import Data -->
        <mat-step [stepControl]="importForm" label="Import Data" errorMessage="Import data is required">
          <form [formGroup]="importForm">
            <app-sow-import
              (dataImported)="onDataImported($event)"
              (validationRequested)="moveToValidation()"
              [isLoading]="isLoading()"
            ></app-sow-import>
          </form>
        </mat-step>

        <!-- Step 2: Validate Data -->
        <mat-step [stepControl]="validationForm" label="Validate Data" errorMessage="Data validation failed">
          <form [formGroup]="validationForm">
            <app-sow-validation
              [importData]="importedData"
              [validationResult]="validationResult"
              (validationComplete)="onValidationComplete($event)"
              (recalculateRequested)="moveToCalculations()"
              [isLoading]="isLoading()"
            ></app-sow-validation>
          </form>
        </mat-step>

        <!-- Step 3: Calculate SOW -->
        <mat-step [stepControl]="calculationForm" label="Calculate SOW" errorMessage="SOW calculations incomplete">
          <form [formGroup]="calculationForm">
            <app-sow-calculations
              [validatedData]="validatedData"
              [projectId]="_projectId"
              (calculationsComplete)="onCalculationsComplete($event)"
              (reviewRequested)="moveToSummary()"
              [isLoading]="isLoading()"
            ></app-sow-calculations>
          </form>
        </mat-step>

        <!-- Step 4: Review & Save -->
        <mat-step [stepControl]="summaryForm" label="Review & Save">
          <form [formGroup]="summaryForm">
            <app-sow-summary
              [sowData]="finalSOWData()"
              [projectData]="selectedProject"
              (saveRequested)="saveFinalSOW()"
              (exportRequested)="exportSOW()"
              [isLoading]="isLoading()"
            ></app-sow-summary>
          </form>
        </mat-step>
      </mat-stepper>

      <!-- Loading Overlay -->
      <div *ngIf="isLoading()" class="loading-overlay">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>{{ loadingMessage() }}</p>
      </div>
    </div>
  `,
  styleUrl: './sow-wizard.component.scss'
})
export class SOWWizardComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private sowService = inject(SowService);
  private excelService = inject(SOWExcelService);
  private validationService = inject(SOWValidationService);
  private projectService = inject(ProjectService);
  private cdr = inject(ChangeDetectorRef);

  // Dialog support
  public dialogRef = inject(MatDialogRef<SOWWizardComponent>, { optional: true });
  public dialogData = inject<any>(MAT_DIALOG_DATA, { optional: true });
  
  // Mode flags
  isDialogMode = signal<boolean>(false);

  // Signals for reactive state
  @Input() set projectId(value: string) {
    this._projectId.set(value);
  }
  _projectId = signal<string>('');
  
  get projectId(): string {
    return this._projectId();
  }
  selectedProject = signal<any>(null);
  currentStep = signal<number>(0);
  isLoading = signal<boolean>(false);
  loadingMessage = signal<string>('');

  // Data signals
  importedData = signal<ExcelParseResult | null>(null);
  validationResult = signal<ValidationResult | null>(null);
  validatedData = signal<any>(null);
  finalSOWData = signal<SOWData | null>(null);

  // Computed values
  progressValue = computed(() => ((this.currentStep() + 1) / 4) * 100);

  // Form controls
  importForm = this.fb.group({
    dataImported: [false, Validators.requiredTrue]
  });

  validationForm = this.fb.group({
    validationPassed: [false, Validators.requiredTrue]
  });

  calculationForm = this.fb.group({
    calculationsComplete: [false, Validators.requiredTrue]
  });

  summaryForm = this.fb.group({
    finalReview: [false, Validators.requiredTrue]
  });

  ngOnInit() {
    // Check if opened as dialog
    if (this.dialogRef && this.dialogData) {
      this.isDialogMode.set(true);
      this._projectId.set(this.dialogData.projectId || '');
      this.selectedProject.set(this.dialogData.projectData || null);
    } else {
      // Defer loading to next tick to avoid change detection issues
      setTimeout(() => this.loadProject(), 0);
    }
  }

  private async loadProject() {
    // Try route params first, then query params
    let projectId = this.route.snapshot.paramMap.get('projectId');
    if (!projectId) {
      projectId = this.route.snapshot.queryParamMap.get('projectId');
    }
    
    if (projectId && projectId !== 'temp') {
      this._projectId.set(projectId);
      this.isLoading.set(true);
      this.loadingMessage.set('Loading project details...');

      try {
        this.projectService.getById(projectId).subscribe({
          next: (project) => {
            this.selectedProject.set(project);
            this.isLoading.set(false);
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error loading project:', error);
            // If project doesn't exist yet (temp project), just continue
            if (projectId === 'temp' || error.code === 'not-found') {
              this.isLoading.set(false);
            } else {
              this.snackBar.open('Error loading project', 'Close', { duration: 3000 });
              this.isLoading.set(false);
            }
            this.cdr.markForCheck();
          }
        });
      } catch (error) {
        console.error('Error loading project:', error);
        this.isLoading.set(false);
      }
    } else if (projectId === 'temp') {
      // Temporary project - just set basic info
      this._projectId.set('temp');
      const projectName = this.route.snapshot.queryParamMap.get('projectName') || 'New Project';
      this.selectedProject.set({ title: projectName });
    } else {
      // Defer navigation to avoid change detection issues
      setTimeout(() => {
        this.snackBar.open('Project ID is required', 'Close', { duration: 3000 });
        this.goBack();
      }, 0);
    }
  }

  onStepChange(event: any) {
    this.currentStep.set(event.selectedIndex);
  }

  onDataImported(parseResult: ExcelParseResult) {
    this.importedData.set(parseResult);
    this.importForm.patchValue({ dataImported: true });
    
    this.snackBar.open(
      `Imported ${parseResult.summary.validRows} records successfully`,
      'Close',
      { duration: 3000 }
    );
  }

  moveToValidation() {
    if (this.importedData()) {
      this.currentStep.set(1);
      this.startValidation();
    }
  }

  private async startValidation() {
    const data = this.importedData();
    if (!data) return;

    this.isLoading.set(true);
    this.loadingMessage.set('Validating imported data...');

    try {
      this.validationService.validateImportData({
        poles: data.poles,
        drops: data.drops,
        fibre: data.fibre
      }).subscribe({
        next: (result) => {
          this.validationResult.set(result);
          this.isLoading.set(false);
          
          if (result.isValid) {
            this.snackBar.open('Data validation passed', 'Close', { duration: 3000 });
          } else {
            this.snackBar.open(
              `Validation found ${result.errors.length} errors`,
              'View Details',
              { duration: 5000 }
            );
          }
        },
        error: (error) => {
          console.error('Validation error:', error);
          this.snackBar.open('Error during validation', 'Close', { duration: 3000 });
          this.isLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Validation error:', error);
      this.isLoading.set(false);
    }
  }

  onValidationComplete(isValid: boolean) {
    this.validationForm.patchValue({ validationPassed: isValid });
    
    if (isValid) {
      this.validatedData.set(this.importedData());
    }
  }

  moveToCalculations() {
    if (this.validatedData()) {
      this.currentStep.set(2);
    }
  }

  onCalculationsComplete(calculatedData: any) {
    this.calculationForm.patchValue({ calculationsComplete: true });
    
    // Create final SOW data
    const sowData: SOWData = {
      projectId: this._projectId(),
      version: 1,
      createdAt: new Date() as any,
      createdBy: 'current-user', // TODO: Get from auth service
      poles: calculatedData.poles || [],
      drops: calculatedData.drops || [],
      fibre: calculatedData.fibre || [],
      calculations: calculatedData.calculations,
      estimatedDays: calculatedData.estimatedDays,
      totalCost: calculatedData.totalCost,
      status: 'draft'
    };
    
    this.finalSOWData.set(sowData);
  }

  moveToSummary() {
    if (this.finalSOWData()) {
      this.currentStep.set(3);
      this.summaryForm.patchValue({ finalReview: true });
    }
  }

  async saveFinalSOW() {
    const sowData = this.finalSOWData();
    if (!sowData) return;

    // If in dialog mode, return data instead of saving
    if (this.isDialogMode() && this.dialogRef) {
      this.dialogRef.close(sowData);
      return;
    }

    this.isLoading.set(true);
    this.loadingMessage.set('Saving SOW data...');

    try {
      // Check if we're in standalone page mode
      const queryParams = this.route.snapshot.queryParamMap;
      const returnUrl = queryParams.get('returnUrl');
      
      if (returnUrl) {
        // Save SOW data to session storage for the project form to pick up
        sessionStorage.setItem('sowData', JSON.stringify(sowData));
        
        // Navigate back to the project form
        this.router.navigateByUrl(returnUrl);
      } else {
        // Normal save flow
        const sowId = await this.sowService.createSOW(sowData);
        this.snackBar.open('SOW saved successfully', 'Close', { duration: 3000 });
        this.isLoading.set(false);
        
        // Navigate back to project detail
        this.router.navigate(['/projects', this._projectId()]);
      }
    } catch (error) {
      console.error('Error saving SOW:', error);
      this.snackBar.open('Error saving SOW', 'Close', { duration: 3000 });
      this.isLoading.set(false);
    }
  }

  async exportSOW() {
    const sowData = this.finalSOWData();
    if (!sowData) return;

    this.isLoading.set(true);
    this.loadingMessage.set('Generating Excel export...');

    try {
      this.excelService.exportSOW(sowData).subscribe({
        next: (blob) => {
          this.downloadBlob(blob, `SOW_${this._projectId()}_v${sowData.version}.xlsx`);
          this.snackBar.open('SOW exported successfully', 'Close', { duration: 3000 });
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Export error:', error);
          this.snackBar.open('Error exporting SOW', 'Close', { duration: 3000 });
          this.isLoading.set(false);
        }
      });
    } catch (error) {
      console.error('Export error:', error);
      this.isLoading.set(false);
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  goBack() {
    // If in dialog mode, close dialog
    if (this.isDialogMode() && this.dialogRef) {
      this.dialogRef.close();
      return;
    }
    
    // Check if we have a return URL
    const queryParams = this.route.snapshot.queryParamMap;
    const returnUrl = queryParams.get('returnUrl');
    
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      const projectId = this._projectId();
      if (projectId) {
        this.router.navigate(['/projects', projectId]);
      } else {
        this.router.navigate(['/projects']);
      }
    }
  }
}