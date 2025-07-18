import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ContractorService } from '../../services/contractor.service';
import {
  Contractor,
  CONTRACTOR_SERVICES,
  SOUTH_AFRICAN_PROVINCES,
  BANKS,
  ContractorService as _ContractorServiceType,
} from '../../models/contractor.model';

@Component({
  selector: 'app-contractor-form',
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
    MatChipsModule,
    MatStepperModule,
    MatCheckboxModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'add' ? 'Add New Contractor' : 'Edit Contractor' }}</h2>

    <mat-dialog-content>
      <mat-stepper linear #stepper>
        <!-- Step 1: Basic Information -->
        <mat-step [stepControl]="basicInfoForm">
          <form [formGroup]="basicInfoForm">
            <ng-template matStepLabel>Basic Information</ng-template>

            <div class="form-section">
              <h3>Company Details</h3>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Company Name</mat-label>
                  <input matInput formControlName="companyName" required />
                  <mat-error *ngIf="basicInfoForm.get('companyName')?.hasError('required')">
                    Company name is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Registration Number</mat-label>
                  <input matInput formControlName="registrationNumber" required />
                  <mat-error *ngIf="basicInfoForm.get('registrationNumber')?.hasError('required')">
                    Registration number is required
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>VAT Number</mat-label>
                  <input matInput formControlName="vatNumber" />
                </mat-form-field>
              </div>
            </div>

            <div class="form-section">
              <h3>Primary Contact</h3>
              <div formGroupName="primaryContact">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Contact Name</mat-label>
                    <input matInput formControlName="name" required />
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Role/Position</mat-label>
                    <input matInput formControlName="role" required />
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Email</mat-label>
                    <input matInput type="email" formControlName="email" required />
                    <mat-error *ngIf="basicInfoForm.get('primaryContact.email')?.hasError('email')">
                      Please enter a valid email
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Phone</mat-label>
                    <input matInput formControlName="phone" required />
                  </mat-form-field>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3>Physical Address</h3>
              <div formGroupName="physicalAddress">
                <div class="form-row">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Street Address</mat-label>
                    <input matInput formControlName="street" required />
                  </mat-form-field>
                </div>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>City</mat-label>
                    <input matInput formControlName="city" required />
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Province</mat-label>
                    <mat-select formControlName="province" required>
                      <mat-option *ngFor="let province of provinces" [value]="province">
                        {{ province }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Postal Code</mat-label>
                    <input matInput formControlName="postalCode" required />
                  </mat-form-field>
                </div>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperNext type="button">Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 2: Capabilities -->
        <mat-step [stepControl]="capabilitiesForm">
          <form [formGroup]="capabilitiesForm">
            <ng-template matStepLabel>Capabilities & Services</ng-template>

            <div class="form-section">
              <h3>Services Offered</h3>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Select Services</mat-label>
                <mat-select
                  formControlName="services"
                  multiple
                  required
                  panelClass="services-dropdown-panel"
                  #servicesSelect
                >
                  <mat-select-trigger>
                    <mat-chip-set>
                      <mat-chip
                        *ngFor="let service of capabilitiesForm.get('services')?.value"
                        removable="false"
                      >
                        {{ getServiceLabel(service) }}
                      </mat-chip>
                    </mat-chip-set>
                    <span *ngIf="!capabilitiesForm.get('services')?.value?.length"
                      >Select services...</span
                    >
                  </mat-select-trigger>
                  <mat-option *ngFor="let service of contractorServices" [value]="service.value">
                    {{ service.label }}
                  </mat-option>
                  <div class="dropdown-actions">
                    <button
                      mat-flat-button
                      color="primary"
                      type="button"
                      (click)="closeServicesDropdown()"
                    >
                      Done
                    </button>
                  </div>
                </mat-select>
                <mat-error *ngIf="capabilitiesForm.get('services')?.hasError('required')">
                  Please select at least one service
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-section">
              <h3>Capacity</h3>
              <mat-form-field appearance="outline">
                <mat-label>Maximum Number of Teams</mat-label>
                <input matInput type="number" formControlName="maxTeams" min="1" required />
              </mat-form-field>
            </div>

            <div class="form-section">
              <h3>Equipment (Optional)</h3>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Equipment Available</mat-label>
                <textarea
                  matInput
                  formControlName="equipment"
                  rows="3"
                  placeholder="List equipment separated by commas"
                ></textarea>
              </mat-form-field>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious type="button">Back</button>
              <button mat-button matStepperNext type="button">Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 3: Financial Information -->
        <mat-step [stepControl]="financialForm">
          <form [formGroup]="financialForm">
            <ng-template matStepLabel>Financial Information</ng-template>

            <div class="form-section">
              <h3>Banking Details</h3>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Bank Name</mat-label>
                  <mat-select formControlName="bankName" required>
                    <mat-option *ngFor="let bank of banks" [value]="bank">
                      {{ bank }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Account Type</mat-label>
                  <mat-select formControlName="accountType" required>
                    <mat-option value="current">Current Account</mat-option>
                    <mat-option value="savings">Savings Account</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Account Number</mat-label>
                  <input matInput formControlName="accountNumber" required />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Branch Code</mat-label>
                  <input matInput formControlName="branchCode" required />
                </mat-form-field>
              </div>
            </div>

            <div class="form-section">
              <h3>Payment Terms</h3>
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Payment Terms (Days)</mat-label>
                  <input matInput type="number" formControlName="paymentTerms" min="0" required />
                  <mat-hint>Number of days for payment after invoice</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Credit Limit (Optional)</mat-label>
                  <input matInput type="number" formControlName="creditLimit" min="0" />
                  <span matPrefix>R&nbsp;</span>
                </mat-form-field>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious type="button">Back</button>
              <button mat-button matStepperNext type="button">Next</button>
            </div>
          </form>
        </mat-step>

        <!-- Step 4: Review -->
        <mat-step>
          <ng-template matStepLabel>Review & Submit</ng-template>

          <div class="review-section">
            <h3>Review Information</h3>

            <div class="review-item">
              <strong>Company:</strong> {{ basicInfoForm.get('companyName')?.value }}
            </div>

            <div class="review-item">
              <strong>Registration:</strong> {{ basicInfoForm.get('registrationNumber')?.value }}
            </div>

            <div class="review-item">
              <strong>Contact:</strong> {{ basicInfoForm.get('primaryContact.name')?.value }} ({{
                basicInfoForm.get('primaryContact.phone')?.value
              }})
            </div>

            <div class="review-item">
              <strong>Services:</strong>
              <mat-chip-set>
                <mat-chip *ngFor="let service of capabilitiesForm.get('services')?.value">
                  {{ getServiceLabel(service) }}
                </mat-chip>
              </mat-chip-set>
            </div>

            <div class="review-item">
              <strong>Bank:</strong> {{ financialForm.get('bankName')?.value }} ({{
                financialForm.get('accountType')?.value
              }})
            </div>
          </div>

          <div class="step-actions">
            <button mat-button matStepperPrevious type="button">Back</button>
            <button mat-raised-button color="primary" (click)="save()" [disabled]="saving">
              {{
                saving
                  ? 'Saving...'
                  : data.mode === 'add'
                    ? 'Create Contractor'
                    : 'Update Contractor'
              }}
            </button>
          </div>
        </mat-step>
      </mat-stepper>

      <mat-progress-bar mode="indeterminate" *ngIf="saving"></mat-progress-bar>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-height: 400px;
        max-height: 80vh;
        overflow-y: auto;
      }

      .form-section {
        margin-bottom: 24px;
      }

      .form-section h3 {
        margin-bottom: 16px;
        color: #333;
        font-size: 16px;
      }

      .form-row {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }

      .form-row mat-form-field {
        flex: 1;
      }

      .full-width {
        width: 100%;
      }

      .step-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 24px;
      }

      .review-section {
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 4px;
      }

      .review-item {
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .review-item strong {
        min-width: 120px;
      }

      mat-progress-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
      }

      ::ng-deep .services-dropdown-panel {
        max-height: 300px !important;
      }

      ::ng-deep .cdk-overlay-backdrop {
        position: fixed;
      }

      mat-select mat-chip-set {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      mat-select mat-chip {
        font-size: 12px;
        min-height: 24px;
        padding: 2px 8px;
      }

      .dropdown-actions {
        padding: 8px 16px;
        border-top: 1px solid #e0e0e0;
        background-color: #f9f9f9;
        display: flex;
        justify-content: flex-end;
        margin-top: 8px;
      }

      .dropdown-actions button {
        min-width: 80px;
        font-size: 14px;
      }
    `,
  ],
})
export class ContractorFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private contractorService = inject(ContractorService);
  public dialogRef = inject(MatDialogRef<ContractorFormComponent>);
  public data: { mode: 'add' | 'edit'; contractor?: Contractor } = inject(MAT_DIALOG_DATA);

  @ViewChild('servicesSelect') servicesSelect!: MatSelect;

  basicInfoForm!: FormGroup;
  capabilitiesForm!: FormGroup;
  financialForm!: FormGroup;

  provinces = SOUTH_AFRICAN_PROVINCES;
  contractorServices = CONTRACTOR_SERVICES;
  banks = BANKS;
  saving = false;

  ngOnInit() {
    this.initializeForms();

    if (this.data.mode === 'edit' && this.data.contractor) {
      this.populateForms(this.data.contractor);
    }
  }

  initializeForms() {
    this.basicInfoForm = this.fb.group({
      companyName: ['', Validators.required],
      registrationNumber: ['', Validators.required],
      vatNumber: [''],
      primaryContact: this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
        role: ['', Validators.required],
      }),
      physicalAddress: this.fb.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        province: ['', Validators.required],
        postalCode: ['', Validators.required],
      }),
    });

    this.capabilitiesForm = this.fb.group({
      services: [[], Validators.required],
      maxTeams: [1, [Validators.required, Validators.min(1)]],
      equipment: [''],
    });

    this.financialForm = this.fb.group({
      bankName: ['', Validators.required],
      accountNumber: ['', Validators.required],
      branchCode: ['', Validators.required],
      accountType: ['current', Validators.required],
      paymentTerms: [30, [Validators.required, Validators.min(0)]],
      creditLimit: [null],
    });
  }

  populateForms(contractor: Contractor) {
    this.basicInfoForm.patchValue({
      companyName: contractor.companyName,
      registrationNumber: contractor.registrationNumber,
      vatNumber: contractor.vatNumber,
      primaryContact: contractor.primaryContact,
      physicalAddress: contractor.physicalAddress,
    });

    this.capabilitiesForm.patchValue({
      services: contractor.capabilities.services,
      maxTeams: contractor.capabilities.maxTeams,
      equipment: contractor.capabilities.equipment?.join(', '),
    });

    this.financialForm.patchValue({
      bankName: contractor.financial.bankName,
      accountNumber: contractor.financial.accountNumber,
      branchCode: contractor.financial.branchCode,
      accountType: contractor.financial.accountType,
      paymentTerms: contractor.financial.paymentTerms,
      creditLimit: contractor.financial.creditLimit,
    });
  }

  async save() {
    if (!this.isFormValid()) {
      return;
    }

    this.saving = true;

    const formData = this.getFormData();

    try {
      if (this.data.mode === 'add') {
        await this.contractorService.createContractor(formData);
      } else {
        await this.contractorService.updateContractor(this.data.contractor!.id!, formData);
      }

      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error saving contractor:', error);
      // TODO: Show error message
    } finally {
      this.saving = false;
    }
  }

  isFormValid(): boolean {
    return this.basicInfoForm.valid && this.capabilitiesForm.valid && this.financialForm.valid;
  }

  getFormData(): Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'> {
    const equipment = this.capabilitiesForm.get('equipment')?.value;
    const equipmentArray = equipment
      ? equipment
          .split(',')
          .map((e: string) => e.trim())
          .filter((e: string) => e)
      : [];

    return {
      ...this.basicInfoForm.value,
      capabilities: {
        ...this.capabilitiesForm.value,
        equipment: equipmentArray,
        certifications: [], // To be implemented in phase 2
      },
      financial: this.financialForm.value,
      compliance: {
        // To be implemented in phase 2
      },
      status: 'pending_approval',
      onboardingStatus: 'documents_pending',
      createdBy: 'current-user-id', // TODO: Get from auth service
    };
  }

  getServiceLabel(service: string): string {
    const found = this.contractorServices.find((s) => s.value === service);
    return found ? found.label : service;
  }

  cancel() {
    this.dialogRef.close();
  }

  closeServicesDropdown() {
    if (this.servicesSelect) {
      this.servicesSelect.close();
    }
  }
}
