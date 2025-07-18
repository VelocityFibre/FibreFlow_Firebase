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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { HomeSignupService } from '../../../../core/services/home-signup.service';
import { PoleTrackerService } from '../../../pole-tracker/services/pole-tracker.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HomeSignup } from '../../../pole-tracker/models/pole-tracker.model';
import { DataIntegrityValidator } from '../../../../core/validators/data-integrity.validator';
import { switchMap, tap, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-home-signup-form',
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
    MatTooltipModule,
    MatChipsModule,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <h1>{{ isEditMode ? 'Edit' : 'New' }} Home Signup</h1>
        <a mat-button routerLink="/home-signups">
          <mat-icon>arrow_back</mat-icon>
          Back to List
        </a>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
        </div>
      } @else {
        <form [formGroup]="homeSignupForm" (ngSubmit)="onSubmit()">
          <!-- Basic Information -->
          <mat-card class="form-section">
            <mat-card-header>
              <mat-card-title>Home Signup Information</mat-card-title>
              <mat-card-subtitle
                >Data Integrity: Drop numbers must be globally unique</mat-card-subtitle
              >
            </mat-card-header>
            <mat-card-content>
              <div class="form-grid">
                <!-- Drop Number with Data Integrity Validation -->
                <mat-form-field appearance="outline">
                  <mat-label>Drop Number</mat-label>
                  <input
                    matInput
                    formControlName="dropNumber"
                    placeholder="Unique drop identifier"
                    required
                  />
                  <mat-hint>Must be globally unique (3-20 characters)</mat-hint>

                  <!-- Real-time validation feedback -->
                  @if (homeSignupForm.get('dropNumber')?.pending) {
                    <mat-icon matSuffix>sync</mat-icon>
                  }
                  @if (
                    homeSignupForm.get('dropNumber')?.invalid &&
                    homeSignupForm.get('dropNumber')?.touched
                  ) {
                    <mat-error>
                      {{ getDropNumberError() }}
                    </mat-error>
                  }
                  @if (
                    homeSignupForm.get('dropNumber')?.valid &&
                    homeSignupForm.get('dropNumber')?.value
                  ) {
                    <mat-icon matSuffix color="primary">check_circle</mat-icon>
                  }
                </mat-form-field>

                <!-- Connected Pole with Validation -->
                <mat-form-field appearance="outline">
                  <mat-label>Connected Pole</mat-label>
                  <input
                    matInput
                    formControlName="connectedToPole"
                    placeholder="Pole number this drop connects to"
                    required
                  />
                  <mat-hint>Must reference an existing pole with available capacity</mat-hint>

                  <!-- Real-time validation feedback -->
                  @if (homeSignupForm.get('connectedToPole')?.pending) {
                    <mat-icon matSuffix>sync</mat-icon>
                  }
                  @if (
                    homeSignupForm.get('connectedToPole')?.invalid &&
                    homeSignupForm.get('connectedToPole')?.touched
                  ) {
                    <mat-error>
                      {{ getConnectedPoleError() }}
                    </mat-error>
                  }
                  @if (
                    homeSignupForm.get('connectedToPole')?.valid &&
                    homeSignupForm.get('connectedToPole')?.value
                  ) {
                    <mat-icon matSuffix color="primary">check_circle</mat-icon>
                  }
                </mat-form-field>

                <!-- Pole Capacity Indicator -->
                @if (
                  homeSignupForm.get('connectedToPole')?.valid &&
                  homeSignupForm.get('connectedToPole')?.value &&
                  poleCapacityInfo()
                ) {
                  <div class="capacity-indicator full-width">
                    <mat-chip-set>
                      <mat-chip
                        [matTooltip]="
                          'This pole has ' + poleCapacityInfo()?.count + ' of 12 maximum drops'
                        "
                      >
                        <mat-icon matChipAvatar>cable</mat-icon>
                        Pole Capacity: {{ poleCapacityInfo()?.count || 0 }}/12
                      </mat-chip>

                      @if (poleCapacityInfo() && poleCapacityInfo()!.count >= 10) {
                        <mat-chip>
                          <mat-icon matChipAvatar>warning</mat-icon>
                          Near Capacity
                        </mat-chip>
                      }

                      @if (poleCapacityInfo() && poleCapacityInfo()!.count >= 12) {
                        <mat-chip>
                          <mat-icon matChipAvatar>block</mat-icon>
                          At Maximum
                        </mat-chip>
                      }
                    </mat-chip-set>
                  </div>
                }

                <!-- Address -->
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Address</mat-label>
                  <input
                    matInput
                    formControlName="address"
                    placeholder="Full property address"
                    required
                  />
                  <mat-hint>Complete physical address for the home signup</mat-hint>
                </mat-form-field>

                <!-- Status -->
                <mat-form-field appearance="outline">
                  <mat-label>Status</mat-label>
                  <mat-select formControlName="status" required>
                    <mat-option value="pending">Pending</mat-option>
                    <mat-option value="approved">Approved</mat-option>
                    <mat-option value="rejected">Rejected</mat-option>
                    <mat-option value="completed">Completed</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Validation Status -->
          @if (
            homeSignupForm.get('connectedToPole')?.value && homeSignupForm.get('dropNumber')?.value
          ) {
            <mat-card class="validation-section">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon [color]="getValidationIconColor()">{{ getValidationIcon() }}</mat-icon>
                  Data Integrity Status
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="validation-grid">
                  <div class="validation-item">
                    <mat-icon
                      [color]="homeSignupForm.get('dropNumber')?.valid ? 'primary' : 'warn'"
                    >
                      {{ homeSignupForm.get('dropNumber')?.valid ? 'check_circle' : 'error' }}
                    </mat-icon>
                    <span>Drop Number Uniqueness</span>
                  </div>

                  <div class="validation-item">
                    <mat-icon
                      [color]="homeSignupForm.get('connectedToPole')?.valid ? 'primary' : 'warn'"
                    >
                      {{ homeSignupForm.get('connectedToPole')?.valid ? 'check_circle' : 'error' }}
                    </mat-icon>
                    <span>Pole Exists & Has Capacity</span>
                  </div>

                  @if (poleCapacityInfo()) {
                    <div class="validation-item">
                      <mat-icon [color]="poleCapacityInfo()!.canAddMore ? 'primary' : 'warn'">
                        {{ poleCapacityInfo()!.canAddMore ? 'check_circle' : 'warning' }}
                      </mat-icon>
                      <span>
                        Pole Capacity: {{ poleCapacityInfo()!.count }}/12
                        {{ poleCapacityInfo()!.canAddMore ? '(Available)' : '(Full)' }}
                      </span>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }

          <!-- Form Actions -->
          <div class="form-actions">
            <button mat-button type="button" routerLink="/home-signups">Cancel</button>
            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="!homeSignupForm.valid || saving()"
            >
              <mat-icon *ngIf="saving()">sync</mat-icon>
              {{ saving() ? 'Saving...' : isEditMode ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
        max-width: 800px;
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

      .form-section,
      .validation-section {
        margin-bottom: 24px;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
        align-items: start;
      }

      .validation-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .validation-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      mat-form-field {
        width: 100%;
      }

      .full-width {
        grid-column: 1 / -1;
        width: 100%;
      }

      .capacity-indicator {
        margin-top: 8px;
        margin-bottom: 16px;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        margin-top: 24px;
      }

      @media (max-width: 600px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HomeSignupFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private homeSignupService = inject(HomeSignupService);
  private poleTrackerService = inject(PoleTrackerService);
  private authService = inject(AuthService);

  // State
  loading = signal(true);
  saving = signal(false);
  currentHomeSignup = signal<HomeSignup | null>(null);
  poleCapacityInfo = signal<{ count: number; canAddMore: boolean } | null>(null);

  // Form
  homeSignupForm: FormGroup = this.fb.group({
    dropNumber: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(20)],
      [
        DataIntegrityValidator.uniqueDropNumber(
          this.poleTrackerService,
          this.isEditMode ? this.homeSignupId : undefined,
        ),
      ],
    ],
    connectedToPole: [
      '',
      [Validators.required],
      [DataIntegrityValidator.validPoleForDrop(this.poleTrackerService)],
    ],
    address: ['', Validators.required],
    status: ['pending', Validators.required],
  });

  isEditMode = false;
  homeSignupId: string = '';

  ngOnInit() {
    // Check if edit mode
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.homeSignupId = params['id'];
        this.loadHomeSignup();
      } else {
        this.loading.set(false);
      }
    });

    // Watch for pole changes to check capacity
    this.homeSignupForm
      .get('connectedToPole')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((poleNumber) => {
        if (
          poleNumber &&
          poleNumber.length >= 3 &&
          this.homeSignupForm.get('connectedToPole')?.valid
        ) {
          this.checkPoleCapacity(poleNumber);
        } else {
          this.poleCapacityInfo.set(null);
        }
      });
  }

  loadHomeSignup() {
    this.homeSignupService.getHomeSignup(this.homeSignupId).subscribe({
      next: (homeSignup) => {
        if (homeSignup) {
          this.currentHomeSignup.set(homeSignup);
          this.homeSignupForm.patchValue({
            dropNumber: homeSignup.dropNumber,
            connectedToPole: homeSignup.connectedToPole,
            address: homeSignup.address,
            status: homeSignup.status,
          });

          // Check capacity for existing pole
          if (homeSignup.connectedToPole) {
            this.checkPoleCapacity(homeSignup.connectedToPole);
          }
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading home signup:', error);
        this.snackBar.open('Error loading home signup data', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  // Check pole capacity when pole number changes
  async checkPoleCapacity(poleNumber: string) {
    try {
      const capacity = await this.poleTrackerService.checkPoleCapacity(poleNumber);
      this.poleCapacityInfo.set(capacity);
    } catch (error) {
      console.error('Error checking pole capacity:', error);
      this.poleCapacityInfo.set(null);
    }
  }

  // Get drop number validation error message
  getDropNumberError(): string {
    const control = this.homeSignupForm.get('dropNumber');
    if (control?.errors && control.touched) {
      return DataIntegrityValidator.getErrorMessage(control.errors);
    }
    return '';
  }

  // Get connected pole validation error message
  getConnectedPoleError(): string {
    const control = this.homeSignupForm.get('connectedToPole');
    if (control?.errors && control.touched) {
      return DataIntegrityValidator.getErrorMessage(control.errors);
    }
    return '';
  }

  // Get capacity indicator color
  getCapacityColor(): 'primary' | 'accent' | 'warn' {
    const info = this.poleCapacityInfo();
    if (!info) return 'primary';

    if (info.count >= 12) return 'warn';
    if (info.count >= 10) return 'accent';
    return 'primary';
  }

  // Get validation status icon
  getValidationIcon(): string {
    const formValid = this.homeSignupForm.valid;
    const capacityOk = this.poleCapacityInfo()?.canAddMore ?? true;

    if (formValid && capacityOk) return 'verified';
    if (!formValid) return 'error';
    if (!capacityOk) return 'warning';
    return 'help';
  }

  // Get validation status icon color
  getValidationIconColor(): 'primary' | 'accent' | 'warn' {
    const formValid = this.homeSignupForm.valid;
    const capacityOk = this.poleCapacityInfo()?.canAddMore ?? true;

    if (formValid && capacityOk) return 'primary';
    if (!capacityOk) return 'accent';
    return 'warn';
  }

  onSubmit() {
    if (!this.homeSignupForm.valid) return;

    this.saving.set(true);
    const formData = this.homeSignupForm.value;

    // Prepare home signup data
    const homeSignupData: Partial<HomeSignup> = {
      ...formData,
    };

    if (this.isEditMode) {
      // Update existing home signup
      this.homeSignupService.updateHomeSignup(this.homeSignupId, homeSignupData).subscribe({
        next: () => {
          this.snackBar.open('Home signup updated successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/home-signups']);
        },
        error: (error) => {
          console.error('Error updating home signup:', error);
          const errorMessage = error.message || 'Failed to update home signup';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
          this.saving.set(false);
        },
      });
    } else {
      // Create new home signup
      this.homeSignupService.createHomeSignup(homeSignupData).subscribe({
        next: (homeSignupId) => {
          this.snackBar.open('Home signup created successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/home-signups']);
        },
        error: (error) => {
          console.error('Error creating home signup:', error);
          const errorMessage = error.message || 'Failed to create home signup';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
          this.saving.set(false);
        },
      });
    }
  }
}
