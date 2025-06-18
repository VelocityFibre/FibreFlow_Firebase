import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable, switchMap } from 'rxjs';

import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import { Supplier, SupplierContact, SupplierStatus } from '../../../../core/suppliers/models';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    MatMenuModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './supplier-detail.component.html',
  styleUrls: ['./supplier-detail.component.scss'],
})
export class SupplierDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private supplierService = inject(SupplierService);

  supplier$!: Observable<Supplier | undefined>;
  contacts$!: Observable<SupplierContact[]>;

  ngOnInit(): void {
    this.supplier$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        return this.supplierService.getSupplier(id!);
      }),
    );

    this.contacts$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        return this.supplierService.getSupplierContacts(id!);
      }),
    );
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

  getCategoryLabel(category: string): string {
    return category
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return 'R0.00';
    return `R${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  formatPaymentTerms(supplier: Supplier): string {
    const terms = supplier.paymentTerms;
    if (terms.termType === 'NET') {
      return `Net ${terms.termDays} days`;
    } else if (terms.termType === 'COD') {
      return 'Cash on Delivery';
    } else if (terms.termType === 'PREPAID') {
      return 'Prepaid';
    } else if (terms.termType === 'CUSTOM' && terms.customTerms) {
      return terms.customTerms;
    }
    return 'Custom Terms';
  }

  getPerformanceColor(value: number): string {
    if (value >= 90) return 'primary';
    if (value >= 70) return 'accent';
    return 'warn';
  }

  createQuoteRequest(): void {
    // TODO: Navigate to quote request creation
    console.log('Create quote request');
  }
}
