import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';

import { StaffService } from '../../services/staff.service';
import { StaffGroup, StaffMember, WorkingHours } from '../../models/staff.model';

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDividerModule,
    MatStepperModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="staff-form-container">
      <!-- Header -->
      <div class="form-header">
        <h1 class="form-title">{{ isEditMode ? 'Edit Staff Member' : 'Add New Staff Member' }}</h1>
        <p class="form-subtitle">
          {{ isEditMode ? 'Update staff member information' : 'Create a new staff profile' }}
        </p>
      </div>

      <!-- Form Card -->
      <mat-card class="form-card">
        <mat-card-content>
          <mat-stepper linear #stepper>
            <!-- Step 1: Basic Information -->
            <mat-step [stepControl]="basicInfoForm">
              <form [formGroup]="basicInfoForm">
                <ng-template matStepLabel>Basic Information</ng-template>

                <div class="form-section">
                  <h3 class="section-title">Personal Details</h3>

                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Employee ID</mat-label>
                      <input matInput formControlName="employeeId" placeholder="EMP001" />
                      <mat-error *ngIf="basicInfoForm.get('employeeId')?.hasError('required')">
                        Employee ID is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Full Name</mat-label>
                      <input matInput formControlName="name" placeholder="John Doe" />
                      <mat-error *ngIf="basicInfoForm.get('name')?.hasError('required')">
                        Name is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Email</mat-label>
                      <input
                        matInput
                        type="email"
                        formControlName="email"
                        placeholder="john.doe@company.com"
                      />
                      <mat-error *ngIf="basicInfoForm.get('email')?.hasError('required')">
                        Email is required
                      </mat-error>
                      <mat-error *ngIf="basicInfoForm.get('email')?.hasError('email')">
                        Please enter a valid email
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Phone</mat-label>
                      <input matInput formControlName="phone" placeholder="+1 234 567 8900" />
                      <mat-error *ngIf="basicInfoForm.get('phone')?.hasError('required')">
                        Phone is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Primary Group</mat-label>
                      <mat-select formControlName="primaryGroup">
                        <mat-option value="Management">Management</mat-option>
                        <mat-option value="Regional Project Manager">Regional Project Manager</mat-option>
                        <mat-option value="Project Manager">Project Manager</mat-option>
                        <mat-option value="Site Supervisor">Site Supervisor</mat-option>
                        <mat-option value="Senior Technician">Senior Technician</mat-option>
                        <mat-option value="Assistant Technician">Assistant Technician</mat-option>
                        <mat-option value="Planner">Planner</mat-option>
                      </mat-select>
                      <mat-error *ngIf="basicInfoForm.get('primaryGroup')?.hasError('required')">
                        Please select a group
                      </mat-error>
                    </mat-form-field>
                  </div>
                </div>

                <div class="step-actions">
                  <button mat-stroked-button routerLink="/staff">
                    <mat-icon>close</mat-icon>
                    Cancel
                  </button>
                  <button
                    mat-raised-button
                    color="primary"
                    matStepperNext
                    [disabled]="!basicInfoForm.valid"
                  >
                    Next
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </form>
            </mat-step>

            <!-- Step 2: Skills & Availability -->
            <mat-step [stepControl]="skillsForm">
              <form [formGroup]="skillsForm">
                <ng-template matStepLabel>Skills & Availability</ng-template>

                <div class="form-section">
                  <h3 class="section-title">Skills & Certifications</h3>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Skills</mat-label>
                    <mat-chip-grid #chipGrid>
                      <mat-chip-row
                        *ngFor="let skill of skills"
                        [removable]="true"
                        (removed)="removeSkill(skill)"
                      >
                        {{ skill }}
                        <mat-icon matChipRemove>cancel</mat-icon>
                      </mat-chip-row>
                    </mat-chip-grid>
                    <input
                      placeholder="Add skill..."
                      [matChipInputFor]="chipGrid"
                      [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
                      (matChipInputTokenEnd)="addSkill($event)"
                    />
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Certifications</mat-label>
                    <mat-chip-grid #certChipGrid>
                      <mat-chip-row
                        *ngFor="let cert of certifications"
                        [removable]="true"
                        (removed)="removeCertification(cert)"
                      >
                        {{ cert }}
                        <mat-icon matChipRemove>cancel</mat-icon>
                      </mat-chip-row>
                    </mat-chip-grid>
                    <input
                      placeholder="Add certification..."
                      [matChipInputFor]="certChipGrid"
                      [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
                      (matChipInputTokenEnd)="addCertification($event)"
                    />
                  </mat-form-field>
                </div>

                <mat-divider class="section-divider"></mat-divider>

                <div class="form-section">
                  <h3 class="section-title">Availability Settings</h3>

                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Max Concurrent Tasks</mat-label>
                      <input
                        matInput
                        type="number"
                        formControlName="maxConcurrentTasks"
                        min="1"
                        max="20"
                      />
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Initial Status</mat-label>
                      <mat-select formControlName="availabilityStatus">
                        <mat-option value="available">Available</mat-option>
                        <mat-option value="busy">Busy</mat-option>
                        <mat-option value="offline">Offline</mat-option>
                        <mat-option value="vacation">On Vacation</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>

                <div class="step-actions">
                  <button mat-stroked-button matStepperPrevious>
                    <mat-icon>arrow_back</mat-icon>
                    Back
                  </button>
                  <button mat-raised-button color="primary" matStepperNext>
                    Next
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </form>
            </mat-step>

            <!-- Step 3: Emergency Contact -->
            <mat-step>
              <form [formGroup]="emergencyForm">
                <ng-template matStepLabel>Emergency Contact</ng-template>

                <div class="form-section">
                  <h3 class="section-title">Emergency Contact Information</h3>
                  <p class="section-description">
                    This information will only be used in case of emergencies
                  </p>

                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Contact Name</mat-label>
                      <input matInput formControlName="name" placeholder="Jane Doe" />
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Contact Phone</mat-label>
                      <input matInput formControlName="phone" placeholder="+1 234 567 8900" />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Relationship</mat-label>
                      <input
                        matInput
                        formControlName="relationship"
                        placeholder="Spouse, Parent, Friend, etc."
                      />
                    </mat-form-field>
                  </div>
                </div>

                <div class="step-actions">
                  <button mat-stroked-button matStepperPrevious>
                    <mat-icon>arrow_back</mat-icon>
                    Back
                  </button>
                  <button mat-raised-button color="primary" matStepperNext>
                    Review
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </form>
            </mat-step>

            <!-- Step 4: Review & Submit -->
            <mat-step>
              <ng-template matStepLabel>Review & Submit</ng-template>

              <div class="review-section">
                <h3 class="section-title">Review Information</h3>

                <div class="review-grid">
                  <div class="review-item">
                    <span class="review-label">Employee ID:</span>
                    <span class="review-value">{{ basicInfoForm.get('employeeId')?.value }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Name:</span>
                    <span class="review-value">{{ basicInfoForm.get('name')?.value }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Email:</span>
                    <span class="review-value">{{ basicInfoForm.get('email')?.value }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Phone:</span>
                    <span class="review-value">{{ basicInfoForm.get('phone')?.value }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Group:</span>
                    <span class="review-value">{{ basicInfoForm.get('primaryGroup')?.value }}</span>
                  </div>
                  <div class="review-item full-width" *ngIf="skills.length > 0">
                    <span class="review-label">Skills:</span>
                    <div class="chip-list">
                      <mat-chip *ngFor="let skill of skills" class="small-chip">{{
                        skill
                      }}</mat-chip>
                    </div>
                  </div>
                </div>
              </div>

              <div class="step-actions">
                <button mat-stroked-button matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
                <button
                  mat-raised-button
                  color="primary"
                  (click)="onSubmit()"
                  [disabled]="isSubmitting"
                >
                  <mat-icon *ngIf="!isSubmitting">{{
                    isEditMode ? 'save' : 'person_add'
                  }}</mat-icon>
                  <mat-spinner *ngIf="isSubmitting" diameter="20"></mat-spinner>
                  {{ isEditMode ? 'Update Staff Member' : 'Create Staff Member' }}
                </button>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .staff-form-container {
        padding: 24px;
        max-width: 900px;
        margin: 0 auto;
      }

      .form-header {
        margin-bottom: 32px;
      }

      .form-title {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
        color: var(--mat-sys-on-surface);
      }

      .form-subtitle {
        color: var(--mat-sys-on-surface-variant);
        margin-top: 4px;
      }

      .form-card {
        box-shadow: var(--mat-sys-elevation-1);
      }

      .form-section {
        margin-bottom: 32px;
      }

      .section-title {
        font-size: 20px;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
        margin: 0 0 16px 0;
      }

      .section-description {
        color: var(--mat-sys-on-surface-variant);
        margin: -8px 0 16px 0;
        font-size: 14px;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      mat-form-field {
        width: 100%;
      }

      .section-divider {
        margin: 32px 0;
      }

      .step-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid var(--mat-sys-outline-variant);
      }

      .review-section {
        padding: 16px;
        background: var(--mat-sys-surface-variant);
        border-radius: 12px;
        margin-bottom: 24px;
      }

      .review-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }

      .review-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .review-label {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .review-value {
        font-size: 16px;
        color: var(--mat-sys-on-surface);
        font-weight: 500;
      }

      .chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 4px;
      }

      .small-chip {
        font-size: 12px !important;
        height: 24px !important;
        background-color: var(--mat-sys-primary-container) !important;
        color: var(--mat-sys-on-primary-container) !important;
      }

      mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .staff-form-container {
          padding: 16px;
        }

        .form-grid {
          grid-template-columns: 1fr;
        }

        .step-actions {
          flex-direction: column-reverse;
          gap: 8px;

          button {
            width: 100%;
          }
        }
      }
    `,
  ],
})
export class StaffFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private staffService = inject(StaffService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  isEditMode = false;
  isSubmitting = false;
  staffId?: string;

  // Form groups
  basicInfoForm!: FormGroup;
  skillsForm!: FormGroup;
  emergencyForm!: FormGroup;

  // Skills and certifications
  skills: string[] = [];
  certifications: string[] = [];
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  ngOnInit() {
    this.initializeForms();

    // Check if we're in edit mode
    this.staffId = this.route.snapshot.paramMap.get('id') || undefined;
    this.isEditMode = !!this.staffId;

    if (this.isEditMode && this.staffId) {
      this.loadStaffData(this.staffId);
    }
  }

  initializeForms() {
    this.basicInfoForm = this.fb.group({
      employeeId: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      primaryGroup: ['', Validators.required],
    });

    this.skillsForm = this.fb.group({
      maxConcurrentTasks: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
      availabilityStatus: ['available', Validators.required],
    });

    this.emergencyForm = this.fb.group({
      name: [''],
      phone: [''],
      relationship: [''],
    });
  }

  async loadStaffData(id: string) {
    try {
      this.staffService.getStaffById(id).subscribe({
        next: (staff) => {
          if (staff) {
            // Populate basic info
            this.basicInfoForm.patchValue({
              employeeId: staff.employeeId,
              name: staff.name,
              email: staff.email,
              phone: staff.phone,
              primaryGroup: staff.primaryGroup,
            });

            // Populate skills
            this.skills = staff.skills || [];
            this.certifications = staff.certifications || [];
            this.skillsForm.patchValue({
              maxConcurrentTasks: staff.availability.maxConcurrentTasks,
              availabilityStatus: staff.availability.status,
            });

            // Populate emergency contact
            if (staff.emergencyContact) {
              this.emergencyForm.patchValue(staff.emergencyContact);
            }
          }
        },
        error: (error) => {
          console.error('Error loading staff data:', error);
          this.snackBar.open('Error loading staff data', 'Close', { duration: 3000 });
        },
      });
    } catch (error) {
      console.error('Error loading staff data:', error);
      this.snackBar.open('Error loading staff data', 'Close', { duration: 3000 });
    }
  }

  addSkill(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.skills.includes(value)) {
      this.skills.push(value);
    }
    event.chipInput!.clear();
  }

  removeSkill(skill: string): void {
    const index = this.skills.indexOf(skill);
    if (index >= 0) {
      this.skills.splice(index, 1);
    }
  }

  addCertification(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.certifications.includes(value)) {
      this.certifications.push(value);
    }
    event.chipInput!.clear();
  }

  removeCertification(certification: string): void {
    const index = this.certifications.indexOf(certification);
    if (index >= 0) {
      this.certifications.splice(index, 1);
    }
  }

  async onSubmit() {
    if (this.basicInfoForm.invalid || this.skillsForm.invalid) {
      return;
    }

    this.isSubmitting = true;

    try {
      const staffData: Partial<StaffMember> = {
        ...this.basicInfoForm.value,
        skills: this.skills,
        certifications: this.certifications,
        availability: {
          status: this.skillsForm.get('availabilityStatus')?.value,
          maxConcurrentTasks: this.skillsForm.get('maxConcurrentTasks')?.value,
          currentTaskCount: 0,
          workingHours: this.getDefaultWorkingHours(),
        },
        activity: {
          lastLogin: null,
          lastActive: null,
          tasksCompleted: 0,
          tasksInProgress: 0,
          tasksFlagged: 0,
          totalProjectsWorked: 0,
          averageTaskCompletionTime: 0,
        },
        isActive: true,
      };

      // Add emergency contact if provided
      const emergencyData = this.emergencyForm.value;
      if (emergencyData.name && emergencyData.phone) {
        staffData.emergencyContact = emergencyData;
      }

      if (this.isEditMode && this.staffId) {
        this.staffService.updateStaff(this.staffId, staffData).subscribe({
          next: () => {
            this.snackBar.open('Staff member updated successfully', 'Close', { duration: 3000 });
            this.router.navigate(['/staff']);
          },
          error: (error) => {
            console.error('Error updating staff member:', error);
            this.snackBar.open('Error updating staff member', 'Close', { duration: 3000 });
            this.isSubmitting = false;
          },
        });
      } else {
        // Ensure all required fields are present for creation
        const createData: any = {
          employeeId: staffData.employeeId || '',
          name: staffData.name || '',
          email: staffData.email || '',
          phone: staffData.phone || '',
          primaryGroup: staffData.primaryGroup || ('Technician' as StaffGroup),
          skills: staffData.skills || [],
          certifications: staffData.certifications || [],
          availability: staffData.availability || {
            status: 'available' as const,
            maxConcurrentTasks: 5,
            currentTaskCount: 0,
            workingHours: this.getDefaultWorkingHours(),
          },
          activity: {
            lastLogin: null,
            lastActive: null,
            tasksCompleted: 0,
            tasksInProgress: 0,
            tasksFlagged: 0,
            totalProjectsWorked: 0,
            averageTaskCompletionTime: 0,
          },
          isActive: true,
          createdBy: 'system', // TODO: Replace with actual user ID when auth is implemented
        };

        // Only add emergencyContact if it exists
        if (staffData.emergencyContact) {
          createData.emergencyContact = staffData.emergencyContact;
        }

        // Log the final data being sent
        console.log('Final createData being sent to service:', createData);
        console.log('Emergency contact included?', !!createData.emergencyContact);

        this.staffService.createStaff(createData).subscribe({
          next: () => {
            this.snackBar.open('Staff member created successfully', 'Close', { duration: 3000 });
            this.router.navigate(['/staff']);
          },
          error: (error) => {
            console.error('Error creating staff member:', error);
            console.error('Error details:', error);

            // Show more specific error message if available
            let errorMessage = 'Error creating staff member';
            if (error?.message) {
              errorMessage = error.message;
            } else if (error?.error?.message) {
              errorMessage = error.error.message;
            }

            this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
            this.isSubmitting = false;
          },
        });
      }
    } catch (error) {
      console.error('Error saving staff member:', error);
      this.snackBar.open('Error saving staff member', 'Close', { duration: 3000 });
      this.isSubmitting = false;
    }
  }

  private getDefaultWorkingHours(): WorkingHours {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const workingHours: WorkingHours = {};

    days.forEach((day) => {
      workingHours[day] = {
        start: '09:00',
        end: '17:00',
        isWorkingDay: true,
      };
    });

    workingHours['saturday'] = null;
    workingHours['sunday'] = null;

    return workingHours;
  }
}
