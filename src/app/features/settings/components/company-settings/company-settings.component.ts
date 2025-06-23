import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { CompanyService } from '../../services/company.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  template: `
    <div class="company-settings-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Company Information</mat-card-title>
          <mat-card-subtitle>Manage your company details and settings</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="companyForm" (ngSubmit)="onSubmit()">
            <!-- Basic Information -->
            <div class="section">
              <h3>Basic Information</h3>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Company Name</mat-label>
                  <input matInput formControlName="companyName" required />
                  <mat-error *ngIf="companyForm.get('companyName')?.hasError('required')">
                    Company name is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Trading Name</mat-label>
                  <input matInput formControlName="tradingName" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Registration Number</mat-label>
                  <input matInput formControlName="registrationNumber" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>VAT Number</mat-label>
                  <input matInput formControlName="vatNumber" />
                </mat-form-field>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Contact Information -->
            <div class="section">
              <h3>Contact Information</h3>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Email</mat-label>
                  <input matInput type="email" formControlName="email" required />
                  <mat-error *ngIf="companyForm.get('email')?.hasError('required')">
                    Email is required
                  </mat-error>
                  <mat-error *ngIf="companyForm.get('email')?.hasError('email')">
                    Please enter a valid email
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone" required />
                  <mat-error *ngIf="companyForm.get('phone')?.hasError('required')">
                    Phone is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Alternative Phone</mat-label>
                  <input matInput formControlName="alternativePhone" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Website</mat-label>
                  <input matInput formControlName="website" />
                </mat-form-field>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Physical Address -->
            <div class="section">
              <h3>Physical Address</h3>
              <div formGroupName="physicalAddress" class="form-grid">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Street Address</mat-label>
                  <input matInput formControlName="street" required />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Suburb</mat-label>
                  <input matInput formControlName="suburb" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>City</mat-label>
                  <input matInput formControlName="city" required />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Province</mat-label>
                  <input matInput formControlName="province" required />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Postal Code</mat-label>
                  <input matInput formControlName="postalCode" required />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Country</mat-label>
                  <input matInput formControlName="country" required />
                </mat-form-field>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Banking Details -->
            <div class="section">
              <h3>Banking Details (Optional)</h3>
              <div formGroupName="bankingDetails" class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Bank Name</mat-label>
                  <input matInput formControlName="bankName" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Account Name</mat-label>
                  <input matInput formControlName="accountName" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Account Number</mat-label>
                  <input matInput formControlName="accountNumber" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Branch Code</mat-label>
                  <input matInput formControlName="branchCode" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>SWIFT Code</mat-label>
                  <input matInput formControlName="swiftCode" />
                </mat-form-field>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Additional Settings -->
            <div class="section">
              <h3>Additional Settings</h3>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Currency</mat-label>
                  <mat-select formControlName="currency">
                    <mat-option value="ZAR">ZAR - South African Rand</mat-option>
                    <mat-option value="USD">USD - US Dollar</mat-option>
                    <mat-option value="EUR">EUR - Euro</mat-option>
                    <mat-option value="GBP">GBP - British Pound</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Timezone</mat-label>
                  <mat-select formControlName="timezone">
                    <mat-option value="Africa/Johannesburg">Africa/Johannesburg</mat-option>
                    <mat-option value="Africa/Lagos">Africa/Lagos</mat-option>
                    <mat-option value="Africa/Cairo">Africa/Cairo</mat-option>
                    <mat-option value="Europe/London">Europe/London</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Fiscal Year End</mat-label>
                  <input matInput formControlName="fiscalYearEnd" placeholder="e.g., December" />
                </mat-form-field>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
              <button mat-button type="button" (click)="resetForm()" [disabled]="isLoading">
                Reset
              </button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="!companyForm.valid || isLoading"
              >
                <mat-icon *ngIf="!isLoading">save</mat-icon>
                <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
                {{ isLoading ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .company-settings-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .section {
        margin: 24px 0;
      }

      .section h3 {
        margin-bottom: 16px;
        color: rgba(0, 0, 0, 0.87);
        font-weight: 500;
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

      mat-divider {
        margin: 24px 0;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        margin-top: 24px;
      }

      mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }
    `,
  ],
})
export class CompanySettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private notificationService = inject(NotificationService);

  companyForm!: FormGroup;
  isLoading = false;

  ngOnInit() {
    this.initializeForm();
    this.loadCompanyInfo();
  }

  initializeForm() {
    this.companyForm = this.fb.group({
      companyName: ['', Validators.required],
      tradingName: [''],
      registrationNumber: [''],
      vatNumber: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      alternativePhone: [''],
      website: [''],
      physicalAddress: this.fb.group({
        street: ['', Validators.required],
        suburb: [''],
        city: ['', Validators.required],
        province: ['', Validators.required],
        postalCode: ['', Validators.required],
        country: ['', Validators.required],
      }),
      bankingDetails: this.fb.group({
        bankName: [''],
        accountName: [''],
        accountNumber: [''],
        branchCode: [''],
        swiftCode: [''],
      }),
      currency: ['ZAR'],
      timezone: ['Africa/Johannesburg'],
      fiscalYearEnd: [''],
    });
  }

  loadCompanyInfo() {
    this.isLoading = true;
    this.companyService.getCompanyInfo().subscribe({
      next: (companyInfo) => {
        this.companyForm.patchValue(companyInfo);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading company info:', error);
        this.notificationService.error('Failed to load company information');
        this.isLoading = false;
      },
    });
  }

  async onSubmit() {
    if (this.companyForm.valid) {
      this.isLoading = true;
      try {
        await this.companyService.updateCompanyInfo(this.companyForm.value);
        this.notificationService.success('Company information updated successfully');
      } catch (error) {
        console.error('Error updating company info:', error);
        this.notificationService.error('Failed to update company information');
      } finally {
        this.isLoading = false;
      }
    }
  }

  resetForm() {
    this.loadCompanyInfo();
  }
}
