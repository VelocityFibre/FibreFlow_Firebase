import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';

import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import {
  Supplier,
  SupplierFilter,
  SupplierStatus,
  SupplierCategory,
} from '../../../../core/suppliers/models';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule,
    MatCardModule,
    MatRippleModule,
    MatProgressBarModule,
    MatDividerModule,
  ],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss'],
})
export class SupplierListComponent implements OnInit {
  private supplierService = inject(SupplierService);

  suppliers$!: Observable<Supplier[]>;
  displayedColumns: string[] = [
    'companyName',
    'categories',
    'contact',
    'status',
    'verification',
    'actions',
  ];

  filter: SupplierFilter = {};
  searchQuery = '';

  supplierStatuses = Object.values(SupplierStatus);
  supplierCategories = Object.values(SupplierCategory);

  loading = false;
  viewMode: 'card' | 'table' = 'card'; // Default to card view

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.loading = true;
    this.suppliers$ = this.supplierService.getSuppliers(this.filter);
    setTimeout(() => (this.loading = false), 500);
  }

  onSearch(): void {
    this.filter.searchQuery = this.searchQuery;
    this.loadSuppliers();
  }

  onFilterChange(): void {
    this.loadSuppliers();
  }

  clearFilters(): void {
    this.filter = {};
    this.searchQuery = '';
    this.loadSuppliers();
  }

  getCategoryLabel(category: string): string {
    return category
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  getStatusClass(status: SupplierStatus): string {
    switch (status) {
      case SupplierStatus.ACTIVE:
        return 'status-active';
      case SupplierStatus.INACTIVE:
        return 'status-inactive';
      case SupplierStatus.SUSPENDED:
        return 'status-suspended';
      case SupplierStatus.PENDING:
        return 'status-pending';
      default:
        return '';
    }
  }

  getVerificationClass(status: string): string {
    switch (status) {
      case 'verified':
        return 'verification-verified';
      case 'pending':
        return 'verification-pending';
      case 'unverified':
        return 'verification-unverified';
      default:
        return '';
    }
  }

  async deleteSupplier(supplier: Supplier): Promise<void> {
    if (confirm(`Are you sure you want to delete ${supplier.companyName}?`)) {
      try {
        await this.supplierService.deleteSupplier(supplier.id!);
        this.loadSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  }

  getPerformanceColor(value: number): string {
    if (value >= 90) return 'primary';
    if (value >= 70) return 'accent';
    return 'warn';
  }

  createQuoteRequest(supplier: Supplier, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    // TODO: Navigate to quote request creation with supplier preselected
    console.log('Create quote request for:', supplier.companyName);
  }
}
