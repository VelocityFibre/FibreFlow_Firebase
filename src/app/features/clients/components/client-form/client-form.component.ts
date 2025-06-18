import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';

import { ClientService } from '../../services/client.service';
import { Client, ClientType, ClientStatus, ClientContact } from '../../models/client.model';

@Component({
  selector: 'app-client-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatCheckboxModule,
  ],
  templateUrl: './client-form.component.html',
  styleUrls: ['./client-form.component.scss'],
})
export class ClientFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private clientService = inject(ClientService);
  private snackBar = inject(MatSnackBar);

  clientForm!: FormGroup;
  basicInfoForm!: FormGroup;
  contactForm!: FormGroup;
  businessForm!: FormGroup;
  additionalForm!: FormGroup;

  isEditMode = false;
  clientId: string | null = null;
  isLoading = false;
  isSaving = false;

  clientTypes: ClientType[] = ['Enterprise', 'SMB', 'Residential'];
  clientStatuses: ClientStatus[] = ['Active', 'Inactive', 'Pending'];
  industries = [
    'Technology',
    'Finance',
    'Healthcare',
    'Retail',
    'Manufacturing',
    'Real Estate',
    'Education',
    'Hospitality',
    'Government',
    'Other',
  ];

  tags: string[] = [];
  additionalContacts: ClientContact[] = [];
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  ngOnInit() {
    this.initializeForms();
    this.checkEditMode();
  }

  initializeForms() {
    // Basic Information Form
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      clientType: ['', Validators.required],
      status: ['Active', Validators.required],
      industry: [''],
      website: ['', Validators.pattern('https?://.+')],
    });

    // Contact Information Form
    this.contactForm = this.fb.group({
      contactPerson: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[+]?[0-9]{10,15}$')]],
      address: ['', Validators.required],
    });

    // Business Information Form
    this.businessForm = this.fb.group({
      registrationNumber: [''],
      vatNumber: [''],
      notes: [''],
    });

    // Additional Contacts Form
    this.additionalForm = this.fb.group({
      additionalContactName: [''],
      additionalContactRole: [''],
      additionalContactEmail: ['', Validators.email],
      additionalContactPhone: ['', Validators.pattern('^[+]?[0-9]{10,15}$')],
    });

    // Main form that combines all step forms
    this.clientForm = this.fb.group({
      basicInfo: this.basicInfoForm,
      contact: this.contactForm,
      business: this.businessForm,
      additional: this.additionalForm,
    });
  }

  checkEditMode() {
    this.clientId = this.route.snapshot.paramMap.get('id');
    if (this.clientId) {
      this.isEditMode = true;
      this.loadClient();
    }
  }

  async loadClient() {
    if (!this.clientId) return;

    this.isLoading = true;
    try {
      const client = await this.clientService.getClientById(this.clientId);
      if (client) {
        this.populateForm(client);
      } else {
        this.snackBar.open('Client not found', 'Close', { duration: 3000 });
        this.router.navigate(['/clients']);
      }
    } catch (error) {
      console.error('Error loading client:', error);
      this.snackBar.open('Error loading client', 'Close', { duration: 3000 });
    } finally {
      this.isLoading = false;
    }
  }

  populateForm(client: Client) {
    this.basicInfoForm.patchValue({
      name: client.name,
      clientType: client.clientType,
      status: client.status,
      industry: client.industry || '',
      website: client.website || '',
    });

    this.contactForm.patchValue({
      contactPerson: client.contactPerson,
      email: client.email,
      phone: client.phone,
      address: client.address,
    });

    this.businessForm.patchValue({
      registrationNumber: client.registrationNumber || '',
      vatNumber: client.vatNumber || '',
      notes: client.notes || '',
    });

    this.tags = client.tags || [];
    this.additionalContacts = client.additionalContacts || [];
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.tags.includes(value)) {
      this.tags.push(value);
    }
    event.chipInput!.clear();
  }

  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  addAdditionalContact() {
    const contactData = this.additionalForm.value;
    if (contactData.additionalContactName && contactData.additionalContactEmail) {
      const newContact: ClientContact = {
        name: contactData.additionalContactName,
        role: contactData.additionalContactRole || '',
        email: contactData.additionalContactEmail,
        phone: contactData.additionalContactPhone || '',
        isPrimary: false,
      };
      this.additionalContacts.push(newContact);
      this.additionalForm.reset();
      this.snackBar.open('Contact added', 'Close', { duration: 2000 });
    }
  }

  removeAdditionalContact(index: number) {
    this.additionalContacts.splice(index, 1);
  }

  async onSubmit() {
    if (this.clientForm.invalid) {
      Object.keys(this.clientForm.controls).forEach((key) => {
        const control = this.clientForm.get(key);
        if (control && control.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.isSaving = true;
    const formData = {
      ...this.basicInfoForm.value,
      ...this.contactForm.value,
      ...this.businessForm.value,
      tags: this.tags,
      additionalContacts: this.additionalContacts,
    };

    try {
      if (this.isEditMode && this.clientId) {
        await this.clientService.updateClient(this.clientId, formData);
        this.snackBar.open('Client updated successfully', 'Close', { duration: 3000 });
      } else {
        await this.clientService.createClient(formData);
        this.snackBar.open('Client created successfully', 'Close', { duration: 3000 });
      }
      this.router.navigate(['/clients']);
    } catch (error) {
      this.snackBar.open('Error saving client', 'Close', { duration: 3000 });
    } finally {
      this.isSaving = false;
    }
  }

  onCancel() {
    if (this.clientForm.dirty) {
      if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        this.router.navigate(['/clients']);
      }
    } else {
      this.router.navigate(['/clients']);
    }
  }

  getErrorMessage(fieldName: string, formGroup: FormGroup): string {
    const control = formGroup.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.formatFieldName(fieldName)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email';
    }
    if (control?.hasError('pattern')) {
      if (fieldName.includes('phone')) {
        return 'Please enter a valid phone number';
      }
      if (fieldName.includes('website')) {
        return 'Please enter a valid URL';
      }
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Minimum length is ${minLength} characters`;
    }
    return '';
  }

  private formatFieldName(fieldName: string): string {
    return fieldName.replace(/([A-Z])/g, ' $1').trim();
  }
}
