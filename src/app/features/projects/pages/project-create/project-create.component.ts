import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectService } from '../../../../core/services/project.service';
import {
  ProjectType,
  ProjectStatus,
  Priority,
  PhaseType,
} from '../../../../core/models/project.model';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Header -->
      <div class="form-header">
        <div class="header-content">
          <button mat-icon-button routerLink="/projects" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h1 class="page-title">Create New Project</h1>
            <p class="page-subtitle">Set up a new fiber optic infrastructure project</p>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="projectForm" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <!-- Project Information -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Project Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-section">
                <mat-form-field appearance="outline">
                  <mat-label>Project Code</mat-label>
                  <input matInput formControlName="projectCode" placeholder="PRJ-001" />
                  <mat-error *ngIf="projectForm.get('projectCode')?.hasError('required')">
                    Project code is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Project Name</mat-label>
                  <input matInput formControlName="name" placeholder="Enter project name" />
                  <mat-error *ngIf="projectForm.get('name')?.hasError('required')">
                    Project name is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <textarea
                    matInput
                    formControlName="description"
                    rows="3"
                    placeholder="Describe the project scope and objectives"
                  ></textarea>
                </mat-form-field>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Project Type</mat-label>
                    <mat-select formControlName="projectType">
                      <mat-option value="ftth">FTTH - Fiber to the Home</mat-option>
                      <mat-option value="fttb">FTTB - Fiber to the Building</mat-option>
                      <mat-option value="fttc">FTTC - Fiber to the Curb</mat-option>
                      <mat-option value="backbone">Backbone</mat-option>
                      <mat-option value="lastmile">Last Mile</mat-option>
                      <mat-option value="enterprise">Enterprise</mat-option>
                      <mat-option value="maintenance">Maintenance</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Priority</mat-label>
                    <mat-select formControlName="priorityLevel">
                      <mat-option value="low">Low</mat-option>
                      <mat-option value="medium">Medium</mat-option>
                      <mat-option value="high">High</mat-option>
                      <mat-option value="critical">Critical</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Location</mat-label>
                  <input matInput formControlName="location" placeholder="Project location" />
                  <mat-icon matSuffix>location_on</mat-icon>
                  <mat-error *ngIf="projectForm.get('location')?.hasError('required')">
                    Location is required
                  </mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Client Information -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Client Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-section">
                <mat-form-field appearance="outline">
                  <mat-label>Client Organization</mat-label>
                  <input matInput formControlName="clientOrganization" placeholder="Company name" />
                  <mat-error *ngIf="projectForm.get('clientOrganization')?.hasError('required')">
                    Client organization is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Contact Person</mat-label>
                  <input matInput formControlName="clientContact" placeholder="Full name" />
                  <mat-error *ngIf="projectForm.get('clientContact')?.hasError('required')">
                    Contact person is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input
                    matInput
                    type="email"
                    formControlName="clientEmail"
                    placeholder="email@example.com"
                  />
                  <mat-icon matSuffix>email</mat-icon>
                  <mat-error *ngIf="projectForm.get('clientEmail')?.hasError('required')">
                    Email is required
                  </mat-error>
                  <mat-error *ngIf="projectForm.get('clientEmail')?.hasError('email')">
                    Please enter a valid email
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="clientPhone" placeholder="+27 12 345 6789" />
                  <mat-icon matSuffix>phone</mat-icon>
                  <mat-error *ngIf="projectForm.get('clientPhone')?.hasError('required')">
                    Phone is required
                  </mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Schedule & Budget -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Schedule & Budget</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-section">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Start Date</mat-label>
                    <input matInput [matDatepicker]="startPicker" formControlName="startDate" />
                    <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                    <mat-datepicker #startPicker></mat-datepicker>
                    <mat-error *ngIf="projectForm.get('startDate')?.hasError('required')">
                      Start date is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Expected End Date</mat-label>
                    <input matInput [matDatepicker]="endPicker" formControlName="expectedEndDate" />
                    <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                    <mat-datepicker #endPicker></mat-datepicker>
                    <mat-error *ngIf="projectForm.get('expectedEndDate')?.hasError('required')">
                      End date is required
                    </mat-error>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Budget (ZAR)</mat-label>
                  <input matInput type="number" formControlName="budget" placeholder="0" />
                  <span matPrefix>R&nbsp;</span>
                  <mat-error *ngIf="projectForm.get('budget')?.hasError('required')">
                    Budget is required
                  </mat-error>
                  <mat-error *ngIf="projectForm.get('budget')?.hasError('min')">
                    Budget must be greater than 0
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Project Manager</mat-label>
                  <input
                    matInput
                    formControlName="projectManagerName"
                    placeholder="Project manager name"
                  />
                  <mat-icon matSuffix>person</mat-icon>
                  <mat-error *ngIf="projectForm.get('projectManagerName')?.hasError('required')">
                    Project manager is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Working Hours</mat-label>
                  <input
                    matInput
                    formControlName="workingHours"
                    placeholder="8:00 AM - 5:00 PM SAST"
                  />
                  <mat-icon matSuffix>schedule</mat-icon>
                </mat-form-field>

                <div class="checkbox-group">
                  <mat-checkbox formControlName="allowWeekendWork">Allow Weekend Work</mat-checkbox>
                  <mat-checkbox formControlName="allowNightWork">Allow Night Work</mat-checkbox>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button mat-button type="button" routerLink="/projects">Cancel</button>
          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="projectForm.invalid || isSubmitting"
          >
            <mat-icon *ngIf="!isSubmitting">save</mat-icon>
            <mat-icon *ngIf="isSubmitting">
              <mat-progress-spinner diameter="20" mode="indeterminate"></mat-progress-spinner>
            </mat-icon>
            {{ isSubmitting ? 'Creating...' : 'Create Project' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .form-header {
        margin: -40px -24px 32px;
        padding: 24px;
        background: white;
        border-bottom: 1px solid #e5e7eb;
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .page-title {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
        color: #1f2937;
      }

      .page-subtitle {
        font-size: 16px;
        color: #6b7280;
        margin: 4px 0 0 0;
      }

      .form-grid {
        display: grid;
        gap: 24px;
        margin-bottom: 32px;
      }

      .form-section {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      mat-form-field {
        width: 100%;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .checkbox-group {
        display: flex;
        gap: 24px;
        margin-top: 8px;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        padding: 24px;
        background: white;
        border-top: 1px solid #e5e7eb;
        margin: 0 -24px -40px;
        position: sticky;
        bottom: 0;
        z-index: 10;
      }

      mat-card {
        border-radius: 12px !important;
      }

      mat-card-header {
        margin-bottom: 16px;
      }

      mat-card-title {
        font-size: 20px !important;
        font-weight: 500 !important;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .form-header {
          margin: -24px -16px 24px;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .checkbox-group {
          flex-direction: column;
          gap: 12px;
        }

        .form-actions {
          margin: 0 -16px -24px;
        }
      }
    `,
  ],
})
export class ProjectCreateComponent {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  isSubmitting = false;

  projectForm: FormGroup = this.fb.group({
    projectCode: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    projectType: [ProjectType.FTTH, Validators.required],
    priorityLevel: [Priority.MEDIUM, Validators.required],
    location: ['', Validators.required],

    clientOrganization: ['', Validators.required],
    clientContact: ['', Validators.required],
    clientEmail: ['', [Validators.required, Validators.email]],
    clientPhone: ['', Validators.required],

    startDate: [new Date(), Validators.required],
    expectedEndDate: ['', Validators.required],
    budget: [0, [Validators.required, Validators.min(1)]],

    projectManagerName: ['', Validators.required],
    workingHours: ['8:00 AM - 5:00 PM SAST'],
    allowWeekendWork: [false],
    allowNightWork: [false],
  });

  async onSubmit() {
    if (this.projectForm.invalid) return;

    this.isSubmitting = true;

    try {
      const formValue = this.projectForm.value;

      // Prepare project data
      const projectData = {
        ...formValue,

        // Set client fields
        clientId: `client-${Date.now()}`,
        clientName: formValue.clientContact,

        // Set initial status and phase
        status: ProjectStatus.PLANNING,
        currentPhase: PhaseType.PLANNING,
        currentPhaseName: 'Planning Phase',

        // Set people
        projectManagerId: `pm-${Date.now()}`,

        // Initialize progress
        budgetUsed: 0,
        overallProgress: 0,
        activeTasksCount: 0,
        completedTasksCount: 0,
        currentPhaseProgress: 0,

        // Metadata
        createdBy: 'user',
        lastModifiedBy: 'user',
      };

      const projectId = await this.projectService.createProject(projectData);
      // Project created successfully

      // Check if projectId is valid before navigating
      if (projectId) {
        // Navigate to the new project
        await this.router.navigate(['/projects', projectId]);
      } else {
        // This shouldn't happen, but handle it just in case
        throw new Error('Project created but no ID returned');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      // Only show error if we actually failed to create the project
      // Check if we're already on a project page (which would indicate success)
      if (!this.router.url.includes('/projects/')) {
        alert('Failed to create project. Please try again.');
      }
    } finally {
      this.isSubmitting = false;
    }
  }
}
