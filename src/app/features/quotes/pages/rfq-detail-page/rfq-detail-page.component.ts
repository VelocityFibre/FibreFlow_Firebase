import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import { RFQService } from '../../services/rfq.service';
import { BOQService } from '../../../boq/services/boq.service';
import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RFQPDFService } from '../../services/rfq-pdf.service';
import { RFQFirebaseEmailService } from '../../services/rfq-firebase-email.service';
import { RFQ, RFQItem } from '../../models/rfq.model';
import { BOQItem } from '../../../boq/models/boq.model';
import { Supplier } from '../../../../core/suppliers/models/supplier.model';
import { Observable, combineLatest, map, switchMap, of, catchError } from 'rxjs';

@Component({
  selector: 'app-rfq-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <button mat-icon-button routerLink="/quotes/rfq" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>RFQ Details</h1>
        <div class="header-actions">
          <button mat-button [matMenuTriggerFor]="actionsMenu">
            <mat-icon>more_vert</mat-icon>
            Actions
          </button>
          <mat-menu #actionsMenu="matMenu">
            <button
              mat-menu-item
              (click)="sendToSuppliers()"
              [disabled]="(rfq$ | async)?.status !== 'draft'"
            >
              <mat-icon>send</mat-icon>
              Send to Suppliers
            </button>
            <button mat-menu-item (click)="exportToPDF()">
              <mat-icon>picture_as_pdf</mat-icon>
              Export to PDF
            </button>
            <button
              mat-menu-item
              (click)="closeRFQ()"
              [disabled]="(rfq$ | async)?.status === 'closed'"
            >
              <mat-icon>close</mat-icon>
              Close RFQ
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="deleteRFQ()" class="delete-action">
              <mat-icon>delete</mat-icon>
              Delete RFQ
            </button>
          </mat-menu>
        </div>
      </div>

      <div class="content" *ngIf="rfq$ | async as rfq; else loading">
        <!-- RFQ Information Card -->
        <mat-card class="info-card">
          <mat-card-header>
            <mat-card-title>{{ rfq.title }}</mat-card-title>
            <mat-card-subtitle>{{ rfq.rfqNumber }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Project:</span>
                <span class="value">{{ rfq.projectName }}</span>
              </div>
              <div class="info-item">
                <span class="label">Status:</span>
                <mat-chip [ngClass]="'status-' + rfq.status">
                  {{ rfq.status | titlecase }}
                </mat-chip>
              </div>
              <div class="info-item">
                <span class="label">Deadline:</span>
                <span class="value" [class.overdue]="isOverdue(rfq.deadline)">
                  {{ rfq.deadline | date: 'MMM d, y' }}
                  <span class="deadline-info">({{ getDaysRemaining(rfq.deadline) }})</span>
                </span>
              </div>
              <div class="info-item">
                <span class="label">Created:</span>
                <span class="value">{{ rfq.createdAt | date: 'MMM d, y' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Delivery Location:</span>
                <span class="value">{{ rfq.deliveryLocation || 'Not specified' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Payment Terms:</span>
                <span class="value">{{ formatPaymentTerms(rfq.paymentTerms || '') }}</span>
              </div>
            </div>

            <div class="description-section" *ngIf="rfq.description">
              <h3>Description</h3>
              <p>{{ rfq.description }}</p>
            </div>

            <div class="requirements-section" *ngIf="rfq.specialRequirements">
              <h3>Special Requirements</h3>
              <p>{{ rfq.specialRequirements }}</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Items Table -->
        <mat-card class="items-card">
          <mat-card-header>
            <mat-card-title>Items ({{ items.length }})</mat-card-title>
            <mat-card-subtitle>
              Total Estimated Value: {{ totalValue | currency: 'ZAR' : 'symbol' : '1.0-0' }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="items" class="items-table">
              <ng-container matColumnDef="itemCode">
                <th mat-header-cell *matHeaderCellDef>Item Code</th>
                <td mat-cell *matCellDef="let item">{{ item.itemCode || '-' }}</td>
              </ng-container>

              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let item">
                  <div class="description-cell">
                    <div class="item-description">{{ item.description }}</div>
                    <div class="item-specification" *ngIf="item.specification">
                      {{ item.specification }}
                    </div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="quantity">
                <th mat-header-cell *matHeaderCellDef>Quantity</th>
                <td mat-cell *matCellDef="let item">
                  {{ item.remainingQuantity }} {{ item.unit }}
                </td>
              </ng-container>

              <ng-container matColumnDef="unitPrice">
                <th mat-header-cell *matHeaderCellDef class="number-header">Est. Unit Price</th>
                <td mat-cell *matCellDef="let item" class="number-cell">
                  <span *ngIf="item.unitPrice > 0">
                    {{ item.unitPrice | currency: 'ZAR' : 'symbol' : '1.2-2' }}
                  </span>
                  <span *ngIf="!item.unitPrice || item.unitPrice === 0" class="no-price">-</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="totalPrice">
                <th mat-header-cell *matHeaderCellDef class="number-header">Est. Total</th>
                <td mat-cell *matCellDef="let item" class="number-cell">
                  <span *ngIf="item.unitPrice > 0">
                    {{
                      item.unitPrice * item.remainingQuantity | currency: 'ZAR' : 'symbol' : '1.0-0'
                    }}
                  </span>
                  <span *ngIf="!item.unitPrice || item.unitPrice === 0" class="no-price">-</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <!-- Suppliers Card -->
        <mat-card class="suppliers-card">
          <mat-card-header>
            <mat-card-title>Recipients ({{ suppliers.length + (rfq.manualEmails?.length || 0) }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="suppliers-grid" *ngIf="suppliers.length > 0">
              <h4>Suppliers:</h4>
              <div *ngFor="let supplier of suppliers" class="supplier-item">
                <mat-icon>business</mat-icon>
                <div class="supplier-info">
                  <div class="supplier-name">{{ supplier.companyName }}</div>
                  <div class="supplier-contact">
                    {{ supplier.primaryEmail }} | {{ supplier.primaryPhone }}
                  </div>
                  <div class="supplier-categories">
                    <mat-chip *ngFor="let category of supplier.categories" class="category-chip">
                      {{ category }}
                    </mat-chip>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="manual-emails-section" *ngIf="rfq.manualEmails && rfq.manualEmails.length > 0">
              <h4>Manual Email Recipients:</h4>
              <div class="manual-emails-grid">
                <mat-chip *ngFor="let email of rfq.manualEmails" class="email-chip">
                  <mat-icon>email</mat-icon>
                  {{ email }}
                </mat-chip>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <ng-template #loading>
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading RFQ details...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }

      .page-header h1 {
        flex: 1;
        margin: 0;
      }

      .back-button {
        margin-right: 8px;
      }

      .content {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .label {
        font-size: 12px;
        color: #666;
        font-weight: 500;
      }

      .value {
        font-size: 14px;
        color: #333;
      }

      .deadline-info {
        font-size: 12px;
        color: #666;
        margin-left: 8px;
      }

      .overdue {
        color: #d32f2f;
      }

      .status-draft {
        background-color: #e3f2fd;
        color: #1976d2;
      }
      .status-sent {
        background-color: #fff3e0;
        color: #f57c00;
      }
      .status-closed {
        background-color: #e8f5e9;
        color: #388e3c;
      }
      .status-cancelled {
        background-color: #ffebee;
        color: #d32f2f;
      }

      .description-section,
      .requirements-section {
        margin-top: 24px;
      }

      .description-section h3,
      .requirements-section h3 {
        font-size: 16px;
        margin-bottom: 8px;
        color: #333;
      }

      .items-table {
        width: 100%;
      }

      .description-cell {
        max-width: 300px;
      }

      .item-description {
        font-weight: 500;
      }

      .item-specification {
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
      }

      .suppliers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }

      .supplier-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }

      .supplier-info {
        flex: 1;
      }

      .supplier-name {
        font-weight: 500;
        margin-bottom: 4px;
      }

      .supplier-contact {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
      }

      .supplier-categories {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .category-chip {
        height: 20px;
        font-size: 11px;
        padding: 0 8px;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
      }

      .delete-action {
        color: #d32f2f;
      }

      .manual-emails-section {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e0e0e0;
      }

      .manual-emails-section h4 {
        margin: 0 0 12px 0;
        color: #666;
        font-size: 14px;
      }

      .manual-emails-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .email-chip {
        background: #e3f2fd;
        color: #1976d2;
      }

      .email-chip mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }

      @media (max-width: 768px) {
        .page-container {
          padding: 16px;
        }

        .info-grid {
          grid-template-columns: 1fr;
        }

        .suppliers-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class RFQDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rfqService = inject(RFQService);
  private boqService = inject(BOQService);
  private supplierService = inject(SupplierService);
  private notificationService = inject(NotificationService);
  private dialog = inject(MatDialog);
  private rfqPDFService = inject(RFQPDFService);
  private emailService = inject(RFQFirebaseEmailService);

  rfq$!: Observable<RFQ | undefined>;
  items: BOQItem[] = [];
  suppliers: Supplier[] = [];
  displayedColumns = ['itemCode', 'description', 'quantity', 'unitPrice', 'totalPrice'];

  get totalValue(): number {
    return this.items.reduce((sum, item) => {
      return sum + item.unitPrice * item.remainingQuantity;
    }, 0);
  }

  ngOnInit() {
    const rfqId = this.route.snapshot.paramMap.get('id');
    if (!rfqId) {
      this.router.navigate(['/quotes/rfq']);
      return;
    }

    this.rfq$ = this.rfqService.getRFQ(rfqId).pipe(
      switchMap((rfq) => {
        if (!rfq) {
          this.notificationService.error('RFQ not found');
          this.router.navigate(['/quotes/rfq']);
          return of(undefined);
        }

        // Load BOQ items and suppliers in parallel
        return combineLatest([this.loadBOQItems(rfq), this.loadSuppliers(rfq)]).pipe(
          map(() => rfq),
        );
      }),
      catchError((error) => {
        console.error('Error loading RFQ:', error);
        this.notificationService.error('Failed to load RFQ details');
        this.router.navigate(['/quotes/rfq']);
        return of(undefined);
      }),
    );
  }

  private loadBOQItems(rfq: RFQ): Observable<void> {
    if (!rfq.boqItemIds || rfq.boqItemIds.length === 0) {
      return of(undefined);
    }

    return this.boqService.getBOQItemsByProject(rfq.projectId).pipe(
      map((items) => {
        this.items = items.filter((item) => item.id && rfq.boqItemIds.includes(item.id));
      }),
      catchError((error) => {
        console.error('Error loading BOQ items:', error);
        return of(undefined);
      }),
    );
  }

  private loadSuppliers(rfq: RFQ): Observable<void> {
    if (!rfq.supplierIds || rfq.supplierIds.length === 0) {
      return of(undefined);
    }

    return this.supplierService.getSuppliers().pipe(
      map((suppliers) => {
        this.suppliers = suppliers.filter(
          (supplier) => supplier.id && rfq.supplierIds.includes(supplier.id),
        );
      }),
      catchError((error) => {
        console.error('Error loading suppliers:', error);
        return of(undefined);
      }),
    );
  }

  isOverdue(deadline: string | Date): boolean {
    const deadlineDate = new Date(deadline);
    return deadlineDate < new Date();
  }

  getDaysRemaining(deadline: string | Date): string {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return '1 day remaining';
    } else {
      return `${diffDays} days remaining`;
    }
  }

  formatPaymentTerms(terms: string): string {
    const termsMap: Record<string, string> = {
      '30_days': '30 Days',
      '60_days': '60 Days',
      '90_days': '90 Days',
      cod: 'Cash on Delivery',
      advance: '50% Advance, 50% on Delivery',
      custom: 'Custom Terms',
    };
    return termsMap[terms] || terms;
  }

  sendToSuppliers() {
    this.rfq$.subscribe((rfq) => {
      if (rfq) {
        // Combine regular suppliers with manual email recipients
        const allSuppliers = [...this.suppliers];
        
        // Create temporary supplier objects for manual emails
        if (rfq.manualEmails && rfq.manualEmails.length > 0) {
          rfq.manualEmails.forEach((email, index) => {
            allSuppliers.push({
              id: `manual-${index}`,
              companyName: email, // Use email as company name
              primaryEmail: email,
              primaryPhone: '',
              categories: [],
              status: 'active',
              // Required fields with default values
              address: '',
              products: [],
              serviceAreas: [],
              paymentTerms: [],
              registrationNumber: '',
              taxNumber: '',
              bankingDetails: null,
              primaryContactName: email,
              secondaryContactName: '',
              secondaryEmail: '',
              secondaryPhone: '',
              createdAt: new Date(),
              updatedAt: new Date()
            } as unknown as Supplier);
          });
        }
        
        if (allSuppliers.length > 0) {
          // Use the new email service with confirmation required
          this.emailService.sendRFQToSuppliers(rfq, allSuppliers, this.items, true).subscribe({
            next: (success) => {
              if (success) {
                // Navigate to email history to review and confirm emails
                this.router.navigate(['/emails/history'], {
                  queryParams: { 
                    filter: 'pending_confirmation',
                    rfqId: rfq.id 
                  }
                });
                this.notificationService.info('Emails prepared for review. Please confirm before sending.');
              }
            },
            error: (error) => {
              console.error('Error preparing RFQ emails:', error);
              this.notificationService.error('Failed to prepare RFQ emails');
            },
          });
        } else {
          this.notificationService.warning('No suppliers or email addresses to send RFQ to');
        }
      }
    });
  }

  exportToPDF() {
    this.rfq$.subscribe((rfq) => {
      if (rfq) {
        const pdfDoc = this.rfqPDFService.generateRFQPDF(rfq, this.items, this.suppliers);
        this.rfqPDFService.savePDF(pdfDoc, `${rfq.rfqNumber}.pdf`);
        this.notificationService.success('PDF downloaded successfully');
      }
    });
  }

  closeRFQ() {
    // TODO: Implement close RFQ functionality
    this.notificationService.info('Close RFQ feature coming soon!');
  }

  deleteRFQ() {
    if (confirm('Are you sure you want to delete this RFQ? This action cannot be undone.')) {
      const rfqId = this.route.snapshot.paramMap.get('id');
      if (rfqId) {
        this.rfqService.deleteRFQ(rfqId).subscribe({
          next: () => {
            this.notificationService.success('RFQ deleted successfully');
            this.router.navigate(['/quotes/rfq']);
          },
          error: (error) => {
            console.error('Error deleting RFQ:', error);
            this.notificationService.error('Failed to delete RFQ');
          },
        });
      }
    }
  }
}
