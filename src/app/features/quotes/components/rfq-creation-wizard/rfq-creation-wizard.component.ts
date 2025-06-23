import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { BOQItem } from '../../../boq/models/boq.model';
import { Supplier } from '../../../../core/suppliers/models/supplier.model';
import { RFQService } from '../../services/rfq.service';
import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import { RemoteLoggerService } from '../../../../core/services/remote-logger.service';

interface DialogData {
  projectId: string;
  projectName: string;
  boqItems: BOQItem[];
}

interface RFQFormData {
  title: string;
  description: string;
  deadline: Date;
  deliveryLocation: string;
  paymentTerms: string;
  specialRequirements: string;
  selectedSuppliers: string[];
  selectedItems: string[];
}

@Component({
  selector: 'app-rfq-creation-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title>Create Request for Quote (RFQ)</h2>

    <mat-dialog-content>
      <mat-stepper [linear]="true" #stepper>
        <!-- Step 1: Review Items -->
        <mat-step [stepControl]="itemSelectionForm" label="Review Items">
          <form [formGroup]="itemSelectionForm">
            <div class="step-content">
              <h3>Items Requiring Quotes for {{ data.projectName }}</h3>
              <p class="step-description">
                Review and select the items you want to include in this RFQ. All
                {{ data.boqItems.length }} items are pre-selected.
              </p>

              <div class="items-summary">
                <div class="summary-card">
                  <div class="summary-stat">
                    <span class="stat-value">{{ selectedItemsCount }}</span>
                    <span class="stat-label">Selected Items</span>
                  </div>
                  <div class="summary-stat">
                    <span class="stat-value">{{
                      selectedItemsValue | currency: 'ZAR' : 'symbol' : '1.0-0'
                    }}</span>
                    <span class="stat-label">Estimated Value</span>
                  </div>
                </div>
              </div>

              <div class="items-table-container">
                <table mat-table [dataSource]="data.boqItems" class="items-table">
                  <!-- Checkbox Column -->
                  <ng-container matColumnDef="select">
                    <th mat-header-cell *matHeaderCellDef>
                      <mat-checkbox
                        [checked]="allItemsSelected"
                        [indeterminate]="someItemsSelected && !allItemsSelected"
                        (change)="toggleAllItems($event.checked)"
                      >
                      </mat-checkbox>
                    </th>
                    <td mat-cell *matCellDef="let item">
                      <mat-checkbox
                        [checked]="isItemSelected(item.id!)"
                        (change)="toggleItem(item.id!, $event.checked)"
                      >
                      </mat-checkbox>
                    </td>
                  </ng-container>

                  <!-- Item Code Column -->
                  <ng-container matColumnDef="itemCode">
                    <th mat-header-cell *matHeaderCellDef>Item Code</th>
                    <td mat-cell *matCellDef="let item">{{ item.itemCode || '-' }}</td>
                  </ng-container>

                  <!-- Description Column -->
                  <ng-container matColumnDef="description">
                    <th mat-header-cell *matHeaderCellDef>Description</th>
                    <td mat-cell *matCellDef="let item">
                      <div class="description-cell">
                        <div class="description-text">{{ item.description }}</div>
                        <div class="specification-text" *ngIf="item.specification">
                          {{ item.specification }}
                        </div>
                      </div>
                    </td>
                  </ng-container>

                  <!-- Quantity Column -->
                  <ng-container matColumnDef="quantity">
                    <th mat-header-cell *matHeaderCellDef class="number-header">Quantity</th>
                    <td mat-cell *matCellDef="let item" class="number-cell">
                      {{ item.remainingQuantity }} {{ item.unit }}
                    </td>
                  </ng-container>

                  <!-- Unit Price Column -->
                  <ng-container matColumnDef="unitPrice">
                    <th mat-header-cell *matHeaderCellDef class="number-header">Est. Unit Price</th>
                    <td mat-cell *matCellDef="let item" class="number-cell">
                      <span *ngIf="item.unitPrice > 0">{{
                        item.unitPrice | currency: 'ZAR' : 'symbol' : '1.2-2'
                      }}</span>
                      <span *ngIf="item.unitPrice === 0" class="no-price">No price</span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                </table>
              </div>
            </div>

            <div class="step-actions">
              <button
                mat-raised-button
                color="primary"
                matStepperNext
                [disabled]="selectedItemsCount === 0"
              >
                Next: RFQ Details
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Step 2: RFQ Details -->
        <mat-step [stepControl]="rfqDetailsForm" label="RFQ Details">
          <form [formGroup]="rfqDetailsForm">
            <div class="step-content">
              <h3>RFQ Information</h3>
              <p class="step-description">Provide details for this Request for Quote.</p>

              <div class="form-grid">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>RFQ Title</mat-label>
                  <input matInput formControlName="title" placeholder="Enter RFQ title" />
                  <mat-error *ngIf="rfqDetailsForm.get('title')?.hasError('required')">
                    Title is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <textarea
                    matInput
                    formControlName="description"
                    rows="3"
                    placeholder="Describe the requirements and scope of this RFQ"
                  ></textarea>
                </mat-form-field>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Quote Deadline</mat-label>
                    <input matInput [matDatepicker]="picker" formControlName="deadline" />
                    <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                    <mat-datepicker #picker></mat-datepicker>
                    <mat-error *ngIf="rfqDetailsForm.get('deadline')?.hasError('required')">
                      Deadline is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Delivery Location</mat-label>
                    <input
                      matInput
                      formControlName="deliveryLocation"
                      placeholder="Project site address"
                    />
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Payment Terms</mat-label>
                  <mat-select formControlName="paymentTerms">
                    <mat-option value="30_days">30 Days</mat-option>
                    <mat-option value="60_days">60 Days</mat-option>
                    <mat-option value="90_days">90 Days</mat-option>
                    <mat-option value="cod">Cash on Delivery</mat-option>
                    <mat-option value="advance">50% Advance, 50% on Delivery</mat-option>
                    <mat-option value="custom">Custom Terms</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Special Requirements</mat-label>
                  <textarea
                    matInput
                    formControlName="specialRequirements"
                    rows="2"
                    placeholder="Any special requirements, certifications, or notes"
                  ></textarea>
                </mat-form-field>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button mat-raised-button color="primary" matStepperNext>
                Next: Select Suppliers
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Step 3: Supplier Selection -->
        <mat-step [stepControl]="supplierSelectionForm" label="Select Suppliers">
          <form [formGroup]="supplierSelectionForm">
            <div class="step-content">
              <h3>Select Suppliers</h3>
              <p class="step-description">
                Choose which suppliers should receive this RFQ. You can select multiple suppliers to
                get competitive quotes.
              </p>

              <!-- Manual Email Input Section -->
              <div class="manual-email-section">
                <h4>Add Custom Email Recipients</h4>
                <p class="section-description">
                  Enter email addresses manually (one per line) for recipients not in your supplier list
                </p>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email Addresses</mat-label>
                  <textarea
                    matInput
                    formControlName="manualEmails"
                    rows="3"
                    placeholder="john@example.com&#10;supplier@company.com&#10;procurement@vendor.co.za"
                  ></textarea>
                  <mat-hint>Enter one email address per line</mat-hint>
                </mat-form-field>

                <div class="manual-emails-preview" *ngIf="manualEmailsList.length > 0">
                  <mat-chip-set aria-label="Manual email addresses">
                    <mat-chip *ngFor="let email of manualEmailsList" [removable]="true" (removed)="removeManualEmail(email)">
                      {{ email }}
                      <mat-icon matChipRemove>cancel</mat-icon>
                    </mat-chip>
                  </mat-chip-set>
                </div>
              </div>

              <mat-divider class="section-divider"></mat-divider>

              <div class="suppliers-header">
                <h4>Select from Existing Suppliers</h4>
                <button mat-icon-button (click)="refreshSuppliers()" matTooltip="Refresh supplier list">
                  <mat-icon>refresh</mat-icon>
                </button>
              </div>
              
              <!-- Supplier filter by category -->
              <div class="supplier-filters">
                <mat-form-field appearance="outline" class="category-filter">
                  <mat-label>Filter by Category</mat-label>
                  <mat-select formControlName="categoryFilter" (selectionChange)="onSupplierCategoryChange()">
                    <mat-option value="">All Categories</mat-option>
                    <mat-option value="ELECTRICAL">Electrical</mat-option>
                    <mat-option value="CIVIL">Civil</mat-option>
                    <mat-option value="TELECOMMUNICATIONS">Telecommunications</mat-option>
                    <mat-option value="FIBER_OPTICS">Fiber Optics</mat-option>
                    <mat-option value="EQUIPMENT_RENTAL">Equipment Rental</mat-option>
                    <mat-option value="CONSTRUCTION">Construction</mat-option>
                    <mat-option value="MATERIALS">Materials</mat-option>
                    <mat-option value="TOOLS">Tools</mat-option>
                    <mat-option value="SERVICES">Services</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="suppliers-loading" *ngIf="loadingSuppliers">
                <mat-spinner diameter="30"></mat-spinner>
                <p>Loading suppliers...</p>
              </div>

              <div class="suppliers-list" *ngIf="!loadingSuppliers">
                <div
                  *ngFor="let supplier of filteredSuppliers"
                  class="supplier-card"
                  [class.selected]="isSupplierSelected(supplier.id!)"
                  [class.unverified]="supplier.verificationStatus !== 'verified'"
                >
                  <mat-checkbox
                    [checked]="isSupplierSelected(supplier.id!)"
                    (change)="toggleSupplier(supplier.id!, $event.checked)"
                  >
                  </mat-checkbox>
                  <div class="supplier-info">
                    <div class="supplier-header">
                      <div class="supplier-name">{{ supplier.companyName }}</div>
                      <div class="verification-status">
                        @if (supplier.verificationStatus === 'verified') {
                          <mat-icon class="verified-icon" matTooltip="Verified Supplier">verified</mat-icon>
                        } @else {
                          <mat-icon class="unverified-icon" matTooltip="Unverified Supplier">warning</mat-icon>
                        }
                      </div>
                    </div>
                    <div class="supplier-details">
                      <span class="supplier-email">{{ supplier.primaryEmail }}</span>
                      <span class="supplier-phone">{{ supplier.primaryPhone }}</span>
                    </div>
                    <div class="supplier-categories">
                      <mat-chip *ngFor="let category of supplier.categories" class="category-chip">
                        {{ getCategoryLabel(category) }}
                      </mat-chip>
                    </div>
                  </div>
                </div>

                <div *ngIf="filteredSuppliers.length === 0 && suppliers.length === 0" class="no-suppliers">
                  <mat-icon>business</mat-icon>
                  <p>No suppliers found. Please add suppliers to your system first.</p>
                </div>
                
                <div *ngIf="filteredSuppliers.length === 0 && suppliers.length > 0" class="no-suppliers">
                  <mat-icon>filter_list</mat-icon>
                  <p>No suppliers match the selected category. Try selecting a different category or "All Categories".</p>
                </div>
              </div>
            </div>

            <div class="step-actions">
              <button mat-button matStepperPrevious>Back</button>
              <button
                mat-raised-button
                color="primary"
                matStepperNext
                [disabled]="selectedSuppliersCount === 0 && manualEmailsList.length === 0"
              >
                Review & Create RFQ
              </button>
            </div>
          </form>
        </mat-step>

        <!-- Step 4: Review & Create -->
        <mat-step label="Review & Create">
          <div class="step-content">
            <h3>Review RFQ</h3>
            <p class="step-description">Review all details before creating the RFQ.</p>

            <div class="review-sections">
              <div class="review-section">
                <h4>RFQ Details</h4>
                <div class="review-item">
                  <span class="label">Title:</span>
                  <span class="value">{{ rfqDetailsForm.get('title')?.value }}</span>
                </div>
                <div class="review-item">
                  <span class="label">Deadline:</span>
                  <span class="value">{{ rfqDetailsForm.get('deadline')?.value | date }}</span>
                </div>
                <div class="review-item">
                  <span class="label">Delivery Location:</span>
                  <span class="value">{{ rfqDetailsForm.get('deliveryLocation')?.value }}</span>
                </div>
              </div>

              <div class="review-section">
                <h4>Items ({{ selectedItemsCount }})</h4>
                <div class="review-item">
                  <span class="label">Total Estimated Value:</span>
                  <span class="value">{{
                    selectedItemsValue | currency: 'ZAR' : 'symbol' : '1.0-0'
                  }}</span>
                </div>
              </div>

              <div class="review-section">
                <h4>Recipients ({{ selectedSuppliersCount + manualEmailsList.length }})</h4>
                <div class="selected-suppliers" *ngIf="selectedSuppliersCount > 0">
                  <h5>Suppliers:</h5>
                  <mat-chip *ngFor="let supplierId of selectedSupplierIds" class="supplier-chip">
                    {{ getSupplierName(supplierId) }}
                  </mat-chip>
                </div>
                <div class="manual-emails-list" *ngIf="manualEmailsList.length > 0">
                  <h5>Manual Email Addresses:</h5>
                  <mat-chip *ngFor="let email of manualEmailsList" class="email-chip">
                    {{ email }}
                  </mat-chip>
                </div>
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button mat-button matStepperPrevious>Back</button>
            <button mat-raised-button color="primary" (click)="createRFQ()" [disabled]="creating">
              <mat-icon *ngIf="creating">hourglass_empty</mat-icon>
              <span>{{ creating ? 'Creating RFQ...' : 'Create RFQ' }}</span>
            </button>
          </div>
        </mat-step>
      </mat-stepper>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .step-content {
        padding: 24px;
        min-height: 450px;
        max-height: 60vh;
        overflow-y: auto;
      }

      .step-description {
        color: #666;
        margin-bottom: 24px;
      }

      .items-summary {
        margin-bottom: 24px;
      }

      .summary-card {
        display: flex;
        gap: 32px;
        padding: 16px;
        background: #f5f5f5;
        border-radius: 8px;
      }

      .summary-stat {
        text-align: center;
      }

      .stat-value {
        display: block;
        font-size: 24px;
        font-weight: 600;
        color: #1976d2;
      }

      .stat-label {
        font-size: 12px;
        color: #666;
      }

      .items-table-container {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
      }

      .items-table {
        width: 100%;
      }

      .description-cell {
        max-width: 200px;
      }

      .description-text {
        font-weight: 500;
      }

      .specification-text {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
      }

      .number-header {
        text-align: right;
      }

      .number-cell {
        text-align: right;
        font-family: monospace;
      }

      .no-price {
        color: #999;
        font-style: italic;
      }

      .form-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-row {
        display: flex;
        gap: 16px;
      }

      .form-row mat-form-field {
        flex: 1;
      }

      .full-width {
        width: 100%;
      }

      .suppliers-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
      }

      .suppliers-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 300px;
        overflow-y: auto;
      }

      .supplier-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        transition: all 0.2s;
      }

      .supplier-card.selected {
        border-color: #1976d2;
        background: #e3f2fd;
      }

      .supplier-card.unverified {
        border-left: 3px solid #ff9800;
      }

      .supplier-info {
        flex: 1;
      }

      .supplier-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .supplier-name {
        font-weight: 500;
      }

      .verification-status {
        display: flex;
        align-items: center;
      }

      .verified-icon {
        color: #4caf50;
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .unverified-icon {
        color: #ff9800;
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .supplier-details {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
      }

      .supplier-details span {
        margin-right: 16px;
      }

      .supplier-categories {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .category-chip {
        font-size: 10px;
        height: 20px;
        line-height: 20px;
      }

      .no-suppliers {
        text-align: center;
        padding: 48px;
        color: #666;
      }

      .no-suppliers mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }

      .review-sections {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .review-section h4 {
        margin: 0 0 12px 0;
        color: #1976d2;
      }

      .review-item {
        display: flex;
        margin-bottom: 8px;
      }

      .review-item .label {
        min-width: 140px;
        font-weight: 500;
      }

      .review-item .value {
        color: #666;
      }

      .selected-suppliers {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .supplier-chip {
        background: #e3f2fd;
        color: #1976d2;
      }

      .step-actions {
        margin-top: 24px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .manual-email-section {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 24px;
      }

      .manual-email-section h4 {
        margin: 0 0 8px 0;
        color: #333;
      }

      .section-description {
        color: #666;
        font-size: 14px;
        margin: 0 0 16px 0;
      }

      .manual-emails-preview {
        margin-top: 12px;
      }

      .section-divider {
        margin: 24px 0;
      }

      .suppliers-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .suppliers-header h4 {
        margin: 0;
        color: #333;
      }

      .supplier-filters {
        margin-bottom: 16px;
      }

      .category-filter {
        width: 300px;
      }

      .email-chip {
        background: #e3f2fd;
        color: #1976d2;
      }

      .manual-emails-list h5,
      .selected-suppliers h5 {
        margin: 8px 0;
        font-size: 14px;
        color: #666;
      }

      @media (max-width: 768px) {
        .form-row {
          flex-direction: column;
        }

        .summary-card {
          flex-direction: column;
          gap: 16px;
        }
      }
    `,
  ],
})
export class RFQCreationWizardComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<RFQCreationWizardComponent>);
  private rfqService = inject(RFQService);
  private supplierService = inject(SupplierService);
  private fb = inject(FormBuilder);
  private logger = inject(RemoteLoggerService);

  data: DialogData = inject(MAT_DIALOG_DATA);

  // Form groups
  itemSelectionForm!: FormGroup;
  rfqDetailsForm!: FormGroup;
  supplierSelectionForm!: FormGroup;

  // Data
  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];
  loadingSuppliers = true;
  creating = false;

  // Table columns
  displayedColumns = ['select', 'itemCode', 'description', 'quantity', 'unitPrice'];

  // Selected items and suppliers
  selectedItemIds: Set<string> = new Set();
  selectedSupplierIds: Set<string> = new Set();

  ngOnInit() {
    this.logger.info('RFQ Creation Wizard initialized', 'RFQCreationWizard', {
      projectId: this.data.projectId,
      projectName: this.data.projectName,
      boqItemsCount: this.data.boqItems.length,
    });

    this.initializeForms();
    this.loadSuppliers();

    // Pre-select all items
    this.data.boqItems.forEach((item) => {
      if (item.id) {
        this.selectedItemIds.add(item.id);
      }
    });

    this.logger.info('Initial items selected', 'RFQCreationWizard', {
      selectedCount: this.selectedItemIds.size,
    });
  }

  private initializeForms() {
    this.itemSelectionForm = this.fb.group({
      selectedItems: [this.selectedItemIds],
    });

    // Set default values
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 14); // 2 weeks from now

    this.rfqDetailsForm = this.fb.group({
      title: [`RFQ for ${this.data.projectName}`, Validators.required],
      description: [
        `Request for quotes for ${this.data.boqItems.length} items for ${this.data.projectName} project.`,
      ],
      deadline: [defaultDeadline, Validators.required],
      deliveryLocation: ['', Validators.required],
      paymentTerms: ['30_days'],
      specialRequirements: [''],
    });

    this.supplierSelectionForm = this.fb.group({
      selectedSuppliers: [this.selectedSupplierIds],
      manualEmails: [''],
      categoryFilter: [''],
    });
  }

  private loadSuppliers() {
    this.loadingSuppliers = true;
    this.supplierService.getSuppliers().subscribe({
      next: (suppliers) => {
        // Show all active suppliers (verified and unverified)
        this.suppliers = suppliers.filter((s) => s.status === 'active');
        this.applySupplierFilters();
        this.loadingSuppliers = false;
        console.log('Loaded suppliers for RFQ:', this.suppliers.length);
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.loadingSuppliers = false;
      },
    });
  }

  private applySupplierFilters() {
    const selectedCategory = this.supplierSelectionForm.get('categoryFilter')?.value;
    if (!selectedCategory) {
      this.filteredSuppliers = [...this.suppliers];
    } else {
      this.filteredSuppliers = this.suppliers.filter(supplier =>
        supplier.categories.includes(selectedCategory as any)
      );
    }
  }

  onSupplierCategoryChange() {
    this.applySupplierFilters();
    const selectedCategory = this.supplierSelectionForm.get('categoryFilter')?.value;
    console.log('Filtered suppliers by category:', selectedCategory, this.filteredSuppliers.length);
  }

  // Add a refresh button for suppliers
  refreshSuppliers() {
    console.log('Refreshing supplier list...');
    this.loadSuppliers();
  }

  getCategoryLabel(category: string): string {
    return category
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Item selection methods
  get allItemsSelected(): boolean {
    return this.selectedItemIds.size === this.data.boqItems.length;
  }

  get someItemsSelected(): boolean {
    return this.selectedItemIds.size > 0 && this.selectedItemIds.size < this.data.boqItems.length;
  }

  get selectedItemsCount(): number {
    return this.selectedItemIds.size;
  }

  get selectedItemsValue(): number {
    return this.data.boqItems
      .filter((item) => item.id && this.selectedItemIds.has(item.id))
      .reduce((sum, item) => sum + item.unitPrice * item.remainingQuantity, 0);
  }

  isItemSelected(itemId: string): boolean {
    return this.selectedItemIds.has(itemId);
  }

  toggleItem(itemId: string, selected: boolean) {
    if (selected) {
      this.selectedItemIds.add(itemId);
    } else {
      this.selectedItemIds.delete(itemId);
    }
  }

  toggleAllItems(selected: boolean) {
    if (selected) {
      this.data.boqItems.forEach((item) => {
        if (item.id) {
          this.selectedItemIds.add(item.id);
        }
      });
    } else {
      this.selectedItemIds.clear();
    }
  }

  // Supplier selection methods
  get selectedSuppliersCount(): number {
    return this.selectedSupplierIds.size;
  }

  isSupplierSelected(supplierId: string): boolean {
    return this.selectedSupplierIds.has(supplierId);
  }

  toggleSupplier(supplierId: string, selected: boolean) {
    if (selected) {
      this.selectedSupplierIds.add(supplierId);
    } else {
      this.selectedSupplierIds.delete(supplierId);
    }
  }

  getSupplierName(supplierId: string): string {
    const supplier = this.suppliers.find((s) => s.id === supplierId);
    return supplier?.companyName || 'Unknown Supplier';
  }

  // Manual email handling
  get manualEmailsList(): string[] {
    const emailsText = this.supplierSelectionForm.get('manualEmails')?.value || '';
    return emailsText
      .split('\n')
      .map((email: string) => email.trim())
      .filter((email: string) => this.isValidEmail(email));
  }

  removeManualEmail(email: string) {
    const currentEmails = this.supplierSelectionForm.get('manualEmails')?.value || '';
    const emailsList = currentEmails.split('\n').map((e: string) => e.trim());
    const updatedEmails = emailsList.filter((e: string) => e !== email);
    this.supplierSelectionForm.patchValue({
      manualEmails: updatedEmails.join('\n')
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // RFQ creation
  createRFQ() {
    this.logger.info('Create RFQ button clicked', 'RFQCreationWizard');

    if (!this.rfqDetailsForm.valid) {
      console.log('Form is invalid:', this.rfqDetailsForm.errors);
      this.logger.warn('RFQ form is invalid', 'RFQCreationWizard', {
        errors: this.rfqDetailsForm.errors,
        formValues: this.rfqDetailsForm.value,
      });
      return;
    }

    if (this.selectedItemIds.size === 0) {
      this.logger.warn('No items selected for RFQ', 'RFQCreationWizard');
      alert('Please select at least one item for the RFQ');
      return;
    }

    if (this.selectedSupplierIds.size === 0 && this.manualEmailsList.length === 0) {
      this.logger.warn('No suppliers or emails selected for RFQ', 'RFQCreationWizard');
      alert('Please select at least one supplier or enter manual email addresses for the RFQ');
      return;
    }

    console.log('Starting RFQ creation...');
    this.logger.info('Starting RFQ creation process', 'RFQCreationWizard', {
      selectedItemsCount: this.selectedItemIds.size,
      selectedSuppliersCount: this.selectedSupplierIds.size,
    });

    this.creating = true;
    const formData = this.rfqDetailsForm.value;
    const selectedItems = this.data.boqItems.filter(
      (item) => item.id && this.selectedItemIds.has(item.id),
    );

    console.log('Selected items for RFQ:', selectedItems.length);
    console.log('Selected suppliers:', Array.from(this.selectedSupplierIds));

    this.logger.info('Preparing RFQ data', 'RFQCreationWizard', {
      formData,
      selectedItemsCount: selectedItems.length,
      selectedSuppliers: Array.from(this.selectedSupplierIds),
    });

    const rfqData = {
      title: formData.title,
      description: formData.description,
      deadline: formData.deadline,
      deliveryLocation: formData.deliveryLocation,
      paymentTerms: formData.paymentTerms,
      specialRequirements: formData.specialRequirements,
      supplierIds: Array.from(this.selectedSupplierIds),
      manualEmails: this.manualEmailsList, // Add manual emails
    };

    console.log('RFQ data to submit:', rfqData);
    this.logger.info('Calling RFQ service', 'RFQCreationWizard', {
      rfqTitle: rfqData.title,
      deadlineType: typeof rfqData.deadline,
      hasDeadline: !!rfqData.deadline,
    });

    this.rfqService
      .createRFQFromBOQItems(this.data.projectId, this.data.projectName, selectedItems, rfqData)
      .subscribe({
        next: (rfqId) => {
          console.log('RFQ created successfully with ID:', rfqId);
          this.logger.info('RFQ created successfully', 'RFQCreationWizard', {
            rfqId,
            projectId: this.data.projectId,
          });
          this.creating = false;
          
          // Include info about whether emails should be sent
          const shouldSendEmails = this.selectedSupplierIds.size > 0 || this.manualEmailsList.length > 0;
          this.dialogRef.close({ 
            success: true, 
            rfqId,
            shouldSendEmails,
            recipientCount: this.selectedSupplierIds.size + this.manualEmailsList.length
          });
        },
        error: (error) => {
          console.error('Error creating RFQ:', error);
          this.logger.error('RFQ creation failed', 'RFQCreationWizard', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            projectId: this.data.projectId,
          });
          this.creating = false;
          alert(`Error creating RFQ: ${error.message || 'Unknown error'}`);
        },
        complete: () => {
          console.log('RFQ creation observable completed');
          this.logger.info('RFQ creation observable completed', 'RFQCreationWizard');
        },
      });
  }

  cancel() {
    this.dialogRef.close({ success: false });
  }
}
