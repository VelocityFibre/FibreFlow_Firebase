import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PoleTrackerService } from '../../services/pole-tracker.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ContractorService } from '../../../contractors/services/contractor.service';
import { StaffService } from '../../../staff/services/staff.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PoleTracker, PoleType, ImageUpload, UploadType } from '../../models/pole-tracker.model';
import { Project } from '../../../../core/models/project.model';
import { Contractor } from '../../../contractors/models/contractor.model';
import { StaffMember } from '../../../staff/models/staff.model';
import { ImageUploadComponent } from '../../components/image-upload/image-upload.component';
import { switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-pole-tracker-form',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    ImageUploadComponent
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <h1>{{ isEditMode ? 'Edit' : 'New' }} Pole Entry</h1>
        <a mat-button routerLink="/pole-tracker">
          <mat-icon>arrow_back</mat-icon>
          Back to List
        </a>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      } @else {
        <form [formGroup]="poleForm" (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Basic Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-grid">
                <!-- VF Pole ID (Auto-generated) -->
                <mat-form-field appearance="outline">
                  <mat-label>VF Pole ID</mat-label>
                  <input matInput formControlName="vfPoleId" readonly>
                  <mat-hint>Auto-generated</mat-hint>
                </mat-form-field>

                <!-- Project -->
                <mat-form-field appearance="outline">
                  <mat-label>Project</mat-label>
                  <mat-select formControlName="projectId" required>
                    <mat-option *ngFor="let project of projects()" [value]="project.id">
                      {{ project.name }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <!-- Alternative Pole ID -->
                <mat-form-field appearance="outline">
                  <mat-label>Alternative Pole ID (if pole # not found)</mat-label>
                  <input matInput formControlName="alternativePoleId">
                </mat-form-field>

                <!-- Group Number -->
                <mat-form-field appearance="outline">
                  <mat-label>Group Number (if grouped)</mat-label>
                  <input matInput formControlName="groupNumber">
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Installation Details -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Installation Details</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-grid">
                <!-- Date Installed -->
                <mat-form-field appearance="outline">
                  <mat-label>Date Installed</mat-label>
                  <input matInput [matDatepicker]="picker" formControlName="dateInstalled" required>
                  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                  <mat-datepicker #picker></mat-datepicker>
                </mat-form-field>

                <!-- Location -->
                <mat-form-field appearance="outline">
                  <mat-label>Location (GPS or Address)</mat-label>
                  <input matInput formControlName="location" required>
                  <button mat-icon-button matSuffix type="button" (click)="getCurrentLocation()" matTooltip="Get current location">
                    <mat-icon>my_location</mat-icon>
                  </button>
                </mat-form-field>

                <!-- Pole Type -->
                <mat-form-field appearance="outline">
                  <mat-label>Pole Type</mat-label>
                  <mat-select formControlName="poleType" required>
                    <mat-option value="wooden">Wooden</mat-option>
                    <mat-option value="concrete">Concrete</mat-option>
                    <mat-option value="steel">Steel</mat-option>
                    <mat-option value="composite">Composite</mat-option>
                  </mat-select>
                </mat-form-field>

                <!-- Contractor -->
                <mat-form-field appearance="outline">
                  <mat-label>Contractor</mat-label>
                  <mat-select formControlName="contractorId" required>
                    <mat-option *ngFor="let contractor of contractors()" [value]="contractor.id">
                      {{ contractor.companyName }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <!-- Working Team -->
                <mat-form-field appearance="outline">
                  <mat-label>Working Team</mat-label>
                  <input matInput formControlName="workingTeam" required>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Image Uploads -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Image Uploads</mat-card-title>
              <mat-card-subtitle>Upload photos for each required angle</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="upload-grid">
                <app-image-upload
                  title="Before View"
                  [poleId]="poleId"
                  uploadType="before"
                  [currentUpload]="currentPole()?.uploads?.before"
                  (uploadComplete)="onImageUploaded('before', $event)"
                  (uploadError)="onUploadError($event)">
                </app-image-upload>

                <app-image-upload
                  title="Front View"
                  [poleId]="poleId"
                  uploadType="front"
                  [currentUpload]="currentPole()?.uploads?.front"
                  (uploadComplete)="onImageUploaded('front', $event)"
                  (uploadError)="onUploadError($event)">
                </app-image-upload>

                <app-image-upload
                  title="Side View"
                  [poleId]="poleId"
                  uploadType="side"
                  [currentUpload]="currentPole()?.uploads?.side"
                  (uploadComplete)="onImageUploaded('side', $event)"
                  (uploadError)="onUploadError($event)">
                </app-image-upload>

                <app-image-upload
                  title="Depth View"
                  [poleId]="poleId"
                  uploadType="depth"
                  [currentUpload]="currentPole()?.uploads?.depth"
                  (uploadComplete)="onImageUploaded('depth', $event)"
                  (uploadError)="onUploadError($event)">
                </app-image-upload>

                <app-image-upload
                  title="Concrete View"
                  [poleId]="poleId"
                  uploadType="concrete"
                  [currentUpload]="currentPole()?.uploads?.concrete"
                  (uploadComplete)="onImageUploaded('concrete', $event)"
                  (uploadError)="onUploadError($event)">
                </app-image-upload>

                <app-image-upload
                  title="Compaction View"
                  [poleId]="poleId"
                  uploadType="compaction"
                  [currentUpload]="currentPole()?.uploads?.compaction"
                  (uploadComplete)="onImageUploaded('compaction', $event)"
                  (uploadError)="onUploadError($event)">
                </app-image-upload>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Quality Check -->
          @if (isEditMode) {
            <mat-card class="form-section">
              <mat-card-header>
                <mat-card-title>Quality Check</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <mat-checkbox formControlName="qualityChecked">
                  Mark as Quality Checked
                </mat-checkbox>
                
                @if (poleForm.get('qualityChecked')?.value) {
                  <mat-form-field appearance="outline" class="full-width mt-3">
                    <mat-label>Quality Check Notes</mat-label>
                    <textarea matInput formControlName="qualityCheckNotes" rows="3"></textarea>
                  </mat-form-field>
                }
              </mat-card-content>
            </mat-card>
          }

          <!-- Form Actions -->
          <div class="form-actions">
            <button mat-button type="button" routerLink="/pole-tracker">Cancel</button>
            <button 
              mat-raised-button 
              color="primary" 
              type="submit"
              [disabled]="!poleForm.valid || saving()">
              <mat-icon *ngIf="saving()">sync</mat-icon>
              {{ saving() ? 'Saving...' : (isEditMode ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 500;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 400px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .upload-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }

    mat-form-field {
      width: 100%;
    }

    .full-width {
      width: 100%;
    }

    .mt-3 {
      margin-top: 16px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 24px;
    }

    @media (max-width: 600px) {
      .form-grid,
      .upload-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PoleTrackerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private poleTrackerService = inject(PoleTrackerService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);
  private staffService = inject(StaffService);
  private authService = inject(AuthService);

  // State
  loading = signal(true);
  saving = signal(false);
  projects = signal<Project[]>([]);
  contractors = signal<Contractor[]>([]);
  staff = signal<StaffMember[]>([]);
  currentPole = signal<PoleTracker | null>(null);

  // Form
  poleForm: FormGroup = this.fb.group({
    vfPoleId: ['', Validators.required],
    projectId: ['', Validators.required],
    alternativePoleId: [''],
    groupNumber: [''],
    dateInstalled: [new Date(), Validators.required],
    location: ['', Validators.required],
    poleType: ['', Validators.required],
    contractorId: ['', Validators.required],
    workingTeam: ['', Validators.required],
    qualityChecked: [false],
    qualityCheckNotes: ['']
  });
  isEditMode = false;
  poleId: string = '';

  ngOnInit() {
    // Check if edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.poleId = params['id'];
        this.loadPole();
      } else {
        // Generate temporary ID for new pole (will be replaced on save)
        this.poleId = 'temp_' + Date.now();
        this.loading.set(false);
      }
    });

    // Watch for project changes to generate VF Pole ID
    this.poleForm.get('projectId')?.valueChanges.subscribe(projectId => {
      if (projectId && !this.isEditMode) {
        this.generateVFPoleId(projectId);
      }
    });

    this.loadFormData();
  }

  loadFormData() {
    // Load projects
    this.projectService.getProjects().subscribe(projects => {
      this.projects.set(projects);
    });

    // Load contractors
    this.contractorService.getContractors().subscribe(contractors => {
      this.contractors.set(contractors);
    });

    // Load staff
    this.staffService.getStaff().subscribe(staff => {
      this.staff.set(staff);
    });
  }

  loadPole() {
    this.poleTrackerService.getPoleTracker(this.poleId).subscribe({
      next: (pole) => {
        if (pole) {
          this.currentPole.set(pole);
          this.poleForm.patchValue({
            vfPoleId: pole.vfPoleId,
            projectId: pole.projectId,
            alternativePoleId: pole.alternativePoleId || '',
            groupNumber: pole.groupNumber || '',
            dateInstalled: pole.dateInstalled,
            location: pole.location,
            poleType: pole.poleType,
            contractorId: pole.contractorId,
            workingTeam: pole.workingTeam,
            qualityChecked: pole.qualityChecked || false,
            qualityCheckNotes: pole.qualityCheckNotes || ''
          });
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading pole:', error);
        this.snackBar.open('Error loading pole data', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  async generateVFPoleId(projectId: string) {
    try {
      const project = this.projects().find(p => p.id === projectId);
      if (!project) return;

      // For now, just show the format - actual generation happens on save
      const tempId = `${project.projectCode || project.name.substring(0, 3).toUpperCase()}.P.AXXX`;
      this.poleForm.patchValue({ vfPoleId: tempId });
    } catch (error) {
      console.error('Error generating VF Pole ID:', error);
    }
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = `${position.coords.latitude}, ${position.coords.longitude}`;
          this.poleForm.patchValue({ location });
          this.snackBar.open('Location captured', 'Close', { duration: 2000 });
        },
        (error) => {
          console.error('Error getting location:', error);
          this.snackBar.open('Could not get location', 'Close', { duration: 3000 });
        }
      );
    } else {
      this.snackBar.open('Geolocation not supported', 'Close', { duration: 3000 });
    }
  }

  onImageUploaded(uploadType: keyof PoleTracker['uploads'], uploadData: ImageUpload) {
    if (this.isEditMode) {
      // Update the image in the database
      this.poleTrackerService.updateImageUpload(this.poleId, uploadType, uploadData).subscribe({
        next: () => {
          this.snackBar.open(`${uploadType} image updated`, 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error updating image:', error);
          this.snackBar.open('Failed to update image', 'Close', { duration: 3000 });
        }
      });
    }
  }

  onUploadError(error: string) {
    this.snackBar.open(error, 'Close', { duration: 3000 });
  }

  onSubmit() {
    if (!this.poleForm.valid) return;

    this.saving.set(true);
    const formData = this.poleForm.value;
    const currentUser = this.authService.currentUser();

    // Prepare pole data
    const poleData: Partial<PoleTracker> = {
      ...formData,
      projectCode: this.projects().find(p => p.id === formData.projectId)?.projectCode,
      projectName: this.projects().find(p => p.id === formData.projectId)?.name,
      contractorName: this.contractors().find(c => c.id === formData.contractorId)?.companyName,
      updatedBy: currentUser?.uid || '',
      updatedByName: currentUser?.displayName || currentUser?.email || ''
    };

    if (this.isEditMode) {
      // Update existing pole
      this.poleTrackerService.updatePoleTracker(this.poleId, poleData).subscribe({
        next: () => {
          this.snackBar.open('Pole updated successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/pole-tracker']);
        },
        error: (error) => {
          console.error('Error updating pole:', error);
          this.snackBar.open('Failed to update pole', 'Close', { duration: 3000 });
          this.saving.set(false);
        }
      });
    } else {
      // Create new pole
      poleData.createdBy = currentUser?.uid || '';
      poleData.createdByName = currentUser?.displayName || currentUser?.email || '';
      
      this.poleTrackerService.createPoleTracker(poleData).subscribe({
        next: (poleId) => {
          this.snackBar.open('Pole created successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/pole-tracker']);
        },
        error: (error) => {
          console.error('Error creating pole:', error);
          this.snackBar.open('Failed to create pole', 'Close', { duration: 3000 });
          this.saving.set(false);
        }
      });
    }
  }
}