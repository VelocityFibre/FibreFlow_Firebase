import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';

import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import {
  Supplier,
  SupplierStatus,
  SupplierCategory,
  VerificationStatus,
} from '../../../../core/suppliers/models';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatStepperModule,
  ],
  templateUrl: './supplier-form.component.html',
  styleUrls: ['./supplier-form.component.scss'],
})
export class SupplierFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supplierService = inject(SupplierService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  supplierForm!: FormGroup;
  isEditMode = false;
  supplierId?: string;
  loading = false;
  saving = false;

  supplierCategories = Object.values(SupplierCategory);
  supplierStatuses = Object.values(SupplierStatus);
  verificationStatuses = Object.values(VerificationStatus);

  paymentTermTypes = ['NET', 'COD', 'PREPAID', 'CUSTOM'];

  ngOnInit(): void {
    this.initializeForm();

    this.supplierId = this.route.snapshot.params['id'];
    if (this.supplierId) {
      this.isEditMode = true;
      this.loadSupplier();
    }
  }

  initializeForm(): void {
    this.supplierForm = this.fb.group({
      basicInfo: this.fb.group({
        companyName: ['', Validators.required],
        registrationNumber: [''],
        taxNumber: [''],
        primaryEmail: ['', [Validators.required, Validators.email]],
        primaryPhone: ['', Validators.required],
        website: [''],
      }),
      address: this.fb.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        postalCode: ['', Validators.required],
        country: ['', Validators.required],
      }),
      services: this.fb.group({
        categories: [[], Validators.required],
        products: [''],
        serviceAreas: this.fb.array([]),
      }),
      financial: this.fb.group({
        paymentTerms: this.fb.group({
          termType: ['NET', Validators.required],
          termDays: [30],
          customTerms: [''],
          earlyPaymentDiscount: this.fb.group({
            percentage: [null],
            withinDays: [null],
          }),
        }),
        creditLimit: [null],
        currentBalance: [{ value: 0, disabled: true }],
      }),
      status: this.fb.group({
        status: [SupplierStatus.PENDING, Validators.required],
        verificationStatus: [VerificationStatus.UNVERIFIED, Validators.required],
        portalEnabled: [false],
      }),
    });
  }

  get serviceAreasArray(): FormArray {
    return this.supplierForm.get('services.serviceAreas') as FormArray;
  }

  addServiceArea(): void {
    const serviceAreaGroup = this.fb.group({
      city: ['', Validators.required],
      state: ['', Validators.required],
      radius: [null],
    });
    this.serviceAreasArray.push(serviceAreaGroup);
  }

  removeServiceArea(index: number): void {
    this.serviceAreasArray.removeAt(index);
  }

  loadSupplier(): void {
    if (!this.supplierId) return;

    this.loading = true;
    this.supplierService.getSupplierById(this.supplierId).subscribe({
      next: (supplier) => {
        if (supplier) {
          this.populateForm(supplier);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading supplier:', error);
        this.snackBar.open('Failed to load supplier', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  populateForm(supplier: Supplier): void {
    this.supplierForm.patchValue({
      basicInfo: {
        companyName: supplier.companyName,
        registrationNumber: supplier.registrationNumber,
        taxNumber: supplier.taxNumber,
        primaryEmail: supplier.primaryEmail,
        primaryPhone: supplier.primaryPhone,
        website: supplier.website,
      },
      address: supplier.address,
      services: {
        categories: supplier.categories,
        products: supplier.products.join(', '),
      },
      financial: {
        paymentTerms: supplier.paymentTerms,
        creditLimit: supplier.creditLimit,
        currentBalance: supplier.currentBalance,
      },
      status: {
        status: supplier.status,
        verificationStatus: supplier.verificationStatus,
        portalEnabled: supplier.portalEnabled,
      },
    });

    // Clear and repopulate service areas
    while (this.serviceAreasArray.length !== 0) {
      this.serviceAreasArray.removeAt(0);
    }
    supplier.serviceAreas.forEach((area) => {
      this.serviceAreasArray.push(this.fb.group(area));
    });
  }

  async onSubmit(): Promise<void> {
    if (this.supplierForm.invalid) {
      Object.keys(this.supplierForm.controls).forEach((key) => {
        const control = this.supplierForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.saving = true;

    try {
      const formValue = this.supplierForm.value;

      const supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> = {
        companyName: formValue.basicInfo.companyName,
        registrationNumber: formValue.basicInfo.registrationNumber,
        taxNumber: formValue.basicInfo.taxNumber,
        primaryEmail: formValue.basicInfo.primaryEmail,
        primaryPhone: formValue.basicInfo.primaryPhone,
        website: formValue.basicInfo.website,
        address: formValue.address,
        categories: formValue.services.categories,
        products: formValue.services.products
          ? formValue.services.products
              .split(',')
              .map((p: string) => p.trim())
              .filter((p: string) => p)
          : [],
        serviceAreas: formValue.services.serviceAreas,
        paymentTerms: formValue.financial.paymentTerms,
        creditLimit: formValue.financial.creditLimit,
        currentBalance: formValue.financial.currentBalance || 0,
        status: formValue.status.status,
        verificationStatus: formValue.status.verificationStatus,
        portalEnabled: formValue.status.portalEnabled,
        createdBy: 'current-user-id', // TODO: Get from auth service
      };

      if (this.isEditMode && this.supplierId) {
        await this.supplierService.updateSupplier(this.supplierId, supplierData);
        this.snackBar.open('Supplier updated successfully', 'Close', { duration: 3000 });
      } else {
        const newId = await this.supplierService.createSupplier(supplierData);
        this.snackBar.open('Supplier created successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/suppliers', newId]);
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      this.snackBar.open('Failed to save supplier', 'Close', { duration: 3000 });
    } finally {
      this.saving = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/suppliers']);
  }

  getCategoryLabel(category: string): string {
    return category
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
