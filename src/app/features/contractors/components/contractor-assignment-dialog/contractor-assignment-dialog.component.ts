import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

import { ContractorService } from '../../services/contractor.service';
import { ContractorProjectService } from '../../services/contractor-project.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Contractor } from '../../models/contractor.model';
import { ContractorProject, ContractorProjectStatus } from '../../models/contractor-project.model';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-contractor-assignment-dialog',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatChipsModule,
  ],
  template: `
    <h2 mat-dialog-title>Assign Contractor to Project</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="contractor-assignment-form">
        <!-- Contractor Selection -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Select Contractor</mat-label>
          <mat-select
            formControlName="contractorId"
            (selectionChange)="onContractorSelect($event.value)"
          >
            <mat-option *ngFor="let contractor of contractors()" [value]="contractor.id">
              {{ contractor.companyName }}
              <span class="contractor-meta"> ({{ contractor.registrationNumber }}) </span>
            </mat-option>
          </mat-select>
          <mat-hint *ngIf="selectedContractor()">
            <mat-chip-set>
              <mat-chip *ngFor="let service of selectedContractor()!.capabilities?.services || []">
                {{ service }}
              </mat-chip>
            </mat-chip-set>
          </mat-hint>
        </mat-form-field>

        <!-- Contract Details -->
        <div class="contract-details-section" *ngIf="form.get('contractorId')?.value">
          <h3>Contract Details</h3>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Contract Number</mat-label>
            <input matInput formControlName="contractNumber" placeholder="e.g., CTR-2024-001" />
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Contract Value (R)</mat-label>
              <input matInput type="number" formControlName="contractValue" placeholder="0.00" />
              <mat-hint>Total contract amount</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Retention Amount (R)</mat-label>
              <input matInput type="number" formControlName="retentionAmount" placeholder="0.00" />
              <mat-hint>Amount to be retained</mat-hint>
            </mat-form-field>
          </div>

          <div class="row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Start Date</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="startDate" />
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Expected End Date</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="endDate" />
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Scope of Work</mat-label>
            <textarea
              matInput
              formControlName="scopeOfWork"
              rows="3"
              placeholder="Describe the work to be performed..."
            ></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Special Terms</mat-label>
            <textarea
              matInput
              formControlName="specialTerms"
              rows="2"
              placeholder="Any special terms or conditions..."
            ></textarea>
          </mat-form-field>
        </div>
      </form>

      <!-- Loading -->
      <div class="loading" *ngIf="loading()">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      </div>

      <!-- Error Message -->
      <div class="error-message" *ngIf="error()">
        <mat-icon>error</mat-icon>
        <span>{{ error() }}</span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="assignContractor()"
        [disabled]="!form.valid || loading()"
      >
        Assign Contractor
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .contractor-assignment-form {
        min-width: 500px;
        padding: 16px 0;
      }

      .full-width {
        width: 100%;
        margin-bottom: 16px;
      }

      .half-width {
        width: 48%;
      }

      .row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }

      .contractor-meta {
        font-size: 12px;
        color: #666;
        margin-left: 8px;
      }

      .contract-details-section {
        margin-top: 24px;
      }

      .contract-details-section h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 500;
      }

      mat-chip-set {
        margin-top: 8px;
      }

      mat-chip {
        font-size: 11px !important;
        min-height: 22px !important;
        padding: 0 8px !important;
      }

      .loading {
        margin: 16px 0;
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f44336;
        margin: 16px 0;
        padding: 12px;
        background-color: #ffebee;
        border-radius: 4px;
      }

      .error-message mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      @media (max-width: 600px) {
        .contractor-assignment-form {
          min-width: auto;
        }

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
export class ContractorAssignmentDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private contractorService = inject(ContractorService);
  private contractorProjectService = inject(ContractorProjectService);
  private authService = inject(AuthService);
  public dialogRef = inject(MatDialogRef<ContractorAssignmentDialogComponent>);
  public data = inject<{
    projectId: string;
    projectName: string;
    projectCode: string;
  }>(MAT_DIALOG_DATA);

  contractors = signal<Contractor[]>([]);
  selectedContractor = signal<Contractor | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    contractorId: ['', Validators.required],
    contractNumber: ['', Validators.required],
    contractValue: [0, [Validators.required, Validators.min(0)]],
    retentionAmount: [0, [Validators.required, Validators.min(0)]],
    startDate: [new Date(), Validators.required],
    endDate: [null as Date | null, Validators.required],
    scopeOfWork: ['', Validators.required],
    specialTerms: [''],
  });

  constructor() {}

  ngOnInit() {
    this.loadContractors();
  }

  loadContractors() {
    this.loading.set(true);
    this.contractorService.getActiveContractors().subscribe({
      next: (contractors) => {
        this.contractors.set(contractors);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading contractors:', err);
        this.error.set('Failed to load contractors');
        this.loading.set(false);
      },
    });
  }

  onContractorSelect(contractorId: string) {
    const contractor = this.contractors().find((c) => c.id === contractorId);
    this.selectedContractor.set(contractor || null);
  }

  async assignContractor() {
    if (!this.form.valid) return;

    const formValue = this.form.value;
    const contractor = this.selectedContractor();

    if (!contractor || !formValue.contractorId) {
      this.error.set('Please select a contractor');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const currentUser = await this.authService.getCurrentUser();

    const contractorProject: Omit<ContractorProject, 'id' | 'createdAt' | 'updatedAt'> = {
      contractorId: formValue.contractorId,
      contractorName: contractor.companyName,
      projectId: this.data.projectId,
      projectName: this.data.projectName,
      projectCode: this.data.projectCode,
      contractNumber: formValue.contractNumber!,
      contractValue: formValue.contractValue || 0,
      retentionAmount: formValue.retentionAmount || 0,
      retentionPercentage: formValue.contractValue
        ? (formValue.retentionAmount! / formValue.contractValue) * 100
        : 0,
      status: ContractorProjectStatus.PENDING,
      assignmentDate: Timestamp.fromDate(new Date()),
      expectedStartDate: Timestamp.fromDate(formValue.startDate!),
      expectedEndDate: Timestamp.fromDate(formValue.endDate!),
      scopeOfWork: formValue.scopeOfWork
        ? formValue.scopeOfWork.split('\n').filter((s: string) => s.trim())
        : [],
      allocatedTeams: [],
      totalTeamsRequired: 1,
      materialsNeeded: [],
      materialsUsed: [],
      payments: [],
      overallProgress: 0,
      totalPaymentRequested: 0,
      totalPaymentMade: 0,
      workProgress: {
        phaseProgress: [],
        totalTasksAssigned: 0,
        totalTasksCompleted: 0,
        totalTasksInProgress: 0,
        totalTasksDelayed: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        totalOvertimeHours: 0,
        qualityChecksPassed: 0,
        qualityChecksFailed: 0,
        reworkRequired: 0,
        dailyProgressReports: [],
      },
      performance: {
        qualityScore: 0,
        defectsReported: 0,
        defectsResolved: 0,
        customerComplaints: 0,
        onTimeCompletion: 0,
        averageDelayDays: 0,
        safetyIncidents: 0,
        safetyScore: 100,
        toolboxTalksAttended: 0,
        productivityScore: 0,
        averageTasksPerDay: 0,
        averageHoursPerTask: 0,
        costOverruns: 0,
        profitMargin: 0,
        overallRating: 0,
      },
      createdBy: currentUser?.uid || 'unknown',
      lastModifiedBy: currentUser?.uid || 'unknown',
    };

    this.contractorProjectService.createContractorProject(contractorProject).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.dialogRef.close(result);
      },
      error: (err) => {
        console.error('Error assigning contractor:', err);
        this.error.set('Failed to assign contractor. Please try again.');
        this.loading.set(false);
      },
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
