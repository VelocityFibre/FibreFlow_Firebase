import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, switchMap, of } from 'rxjs';
import { ContractorService } from '../../services/contractor.service';
import {
  Contractor,
  ContractorStatus,
  ContractorService as ServiceType,
} from '../../models/contractor.model';

@Component({
  selector: 'app-contractor-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatTabsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatTooltipModule,
  ],
  template: `
    <div class="detail-container" *ngIf="contractor$ | async as contractor; else loading">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <button mat-icon-button routerLink="/contractors">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <h1 class="page-title">{{ contractor.companyName }}</h1>
            <div class="header-meta">
              <mat-chip [ngClass]="getStatusClass(contractor.status)">
                <mat-icon class="status-icon">{{ getStatusIcon(contractor.status) }}</mat-icon>
                {{ getStatusLabel(contractor.status) }}
              </mat-chip>
              <span class="registration-number">
                <mat-icon>badge</mat-icon>
                {{ contractor.registrationNumber }}
              </span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button mat-stroked-button [routerLink]="['/contractors', contractor.id, 'edit']">
            <mat-icon>edit</mat-icon>
            Edit
          </button>
          <button mat-stroked-button color="warn" *ngIf="contractor.status === 'active'">
            <mat-icon>block</mat-icon>
            Suspend
          </button>
          <button
            mat-raised-button
            color="primary"
            *ngIf="contractor.status === 'pending_approval'"
          >
            <mat-icon>check_circle</mat-icon>
            Approve
          </button>
        </div>
      </div>

      <!-- Content Tabs -->
      <mat-tab-group>
        <!-- Overview Tab -->
        <mat-tab label="Overview">
          <div class="tab-content">
            <div class="content-grid">
              <!-- Contact Information -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>contacts</mat-icon>
                    Primary Contact
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">Name</span>
                      <span class="info-value">{{ contractor.primaryContact.name }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Role</span>
                      <span class="info-value">{{ contractor.primaryContact.role }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Email</span>
                      <a
                        class="info-value link"
                        [href]="'mailto:' + contractor.primaryContact.email"
                      >
                        {{ contractor.primaryContact.email }}
                      </a>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Phone</span>
                      <a class="info-value link" [href]="'tel:' + contractor.primaryContact.phone">
                        {{ contractor.primaryContact.phone }}
                      </a>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Address -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>location_on</mat-icon>
                    Physical Address
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="address">
                    <p>{{ contractor.physicalAddress.street }}</p>
                    <p>
                      {{ contractor.physicalAddress.city }},
                      {{ contractor.physicalAddress.province }}
                    </p>
                    <p>{{ contractor.physicalAddress.postalCode }}</p>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Capabilities -->
              <mat-card class="info-card full-width">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>build</mat-icon>
                    Capabilities
                  </mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="capabilities-section">
                    <div class="capability-group">
                      <h4>Services</h4>
                      <div class="chips-container">
                        <mat-chip
                          *ngFor="let service of contractor.capabilities.services"
                          class="service-chip"
                        >
                          {{ getServiceLabel(service) }}
                        </mat-chip>
                      </div>
                    </div>

                    <div class="capability-group">
                      <h4>Equipment</h4>
                      <div class="chips-container">
                        <mat-chip *ngFor="let equipment of contractor.capabilities.equipment">
                          {{ equipment }}
                        </mat-chip>
                      </div>
                    </div>

                    <div class="capability-group">
                      <h4>Team Capacity</h4>
                      <div class="stat-value">
                        <mat-icon>groups</mat-icon>
                        {{ contractor.capabilities.maxTeams }} Teams
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Compliance Tab -->
        <mat-tab label="Compliance">
          <div class="tab-content">
            <mat-card class="info-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>verified_user</mat-icon>
                  Compliance Information
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="compliance-grid">
                  <!-- Insurance -->
                  <div class="compliance-item">
                    <mat-icon class="compliance-icon">security</mat-icon>
                    <div class="compliance-content">
                      <h4>Insurance</h4>
                      <p *ngIf="contractor.compliance.insurancePolicy">
                        Policy: {{ contractor.compliance.insurancePolicy }}
                      </p>
                      <p
                        *ngIf="contractor.compliance.insuranceExpiry"
                        [class.expired]="isExpired(contractor.compliance.insuranceExpiry)"
                      >
                        Expires: {{ formatDate(contractor.compliance.insuranceExpiry) }}
                      </p>
                      <button
                        mat-stroked-button
                        size="small"
                        *ngIf="contractor.compliance.insuranceDocUrl"
                      >
                        <mat-icon>description</mat-icon>
                        View Document
                      </button>
                    </div>
                  </div>

                  <!-- BBBEE -->
                  <div class="compliance-item">
                    <mat-icon class="compliance-icon">business_center</mat-icon>
                    <div class="compliance-content">
                      <h4>BBBEE Status</h4>
                      <p *ngIf="contractor.compliance.bbbeeLevel">
                        Level {{ contractor.compliance.bbbeeLevel }}
                      </p>
                      <button
                        mat-stroked-button
                        size="small"
                        *ngIf="contractor.compliance.bbbeeDocUrl"
                      >
                        <mat-icon>description</mat-icon>
                        View Certificate
                      </button>
                    </div>
                  </div>

                  <!-- Safety Rating -->
                  <div class="compliance-item">
                    <mat-icon class="compliance-icon">health_and_safety</mat-icon>
                    <div class="compliance-content">
                      <h4>Safety Rating</h4>
                      <div class="rating" *ngIf="contractor.compliance.safetyRating">
                        <mat-icon
                          *ngFor="let star of getStars(contractor.compliance.safetyRating)"
                          class="star-icon"
                        >
                          star
                        </mat-icon>
                        <span>{{ contractor.compliance.safetyRating }}/5</span>
                      </div>
                    </div>
                  </div>

                  <!-- Certifications -->
                  <div class="compliance-item full-width">
                    <mat-icon class="compliance-icon">workspace_premium</mat-icon>
                    <div class="compliance-content">
                      <h4>Certifications</h4>
                      <mat-list>
                        <mat-list-item *ngFor="let cert of contractor.capabilities.certifications">
                          <mat-icon matListItemIcon>verified</mat-icon>
                          <div matListItemTitle>{{ cert.name }}</div>
                          <div matListItemMeta>
                            {{ cert.issuer }} - Valid until {{ formatDate(cert.validUntil) }}
                          </div>
                        </mat-list-item>
                      </mat-list>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Financial Tab -->
        <mat-tab label="Financial">
          <div class="tab-content">
            <mat-card class="info-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>account_balance</mat-icon>
                  Banking Details
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Bank Name</span>
                    <span class="info-value">{{ contractor.financial.bankName }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Account Type</span>
                    <span class="info-value">{{
                      contractor.financial.accountType | titlecase
                    }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Account Number</span>
                    <span class="info-value">{{
                      maskAccountNumber(contractor.financial.accountNumber)
                    }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Branch Code</span>
                    <span class="info-value">{{ contractor.financial.branchCode }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Payment Terms</span>
                    <span class="info-value">{{ contractor.financial.paymentTerms }} days</span>
                  </div>
                  <div class="info-item" *ngIf="contractor.financial.creditLimit">
                    <span class="info-label">Credit Limit</span>
                    <span class="info-value">{{
                      formatCurrency(contractor.financial.creditLimit)
                    }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="info-card" *ngIf="contractor.vatNumber">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>receipt</mat-icon>
                  Tax Information
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">VAT Number</span>
                    <span class="info-value">{{ contractor.vatNumber }}</span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Teams Tab -->
        <mat-tab label="Teams">
          <div class="tab-content">
            <div class="teams-header">
              <h3>Teams</h3>
              <button mat-raised-button color="primary">
                <mat-icon>add</mat-icon>
                Add Team
              </button>
            </div>
            <p class="empty-message">No teams added yet</p>
          </div>
        </mat-tab>

        <!-- Projects Tab -->
        <mat-tab label="Projects">
          <div class="tab-content">
            <p class="empty-message">Project history will be displayed here</p>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Loading State -->
    <ng-template #loading>
      <div class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading contractor details...</p>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .detail-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 32px;
        gap: 24px;
      }

      .header-content {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        flex: 1;
      }

      .title-section {
        flex: 1;
      }

      .page-title {
        font-size: 32px;
        font-weight: 500;
        margin: 0;
        color: var(--mat-sys-on-surface);
      }

      .header-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 8px;
      }

      .registration-number {
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--mat-sys-on-surface-variant);
        font-size: 14px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }

      /* Status Chip Styles */
      mat-chip {
        &.status-active {
          background-color: rgba(34, 197, 94, 0.1) !important;
          color: #22c55e !important;
        }

        &.status-pending_approval {
          background-color: rgba(245, 158, 11, 0.1) !important;
          color: #f59e0b !important;
        }

        &.status-suspended {
          background-color: rgba(239, 68, 68, 0.1) !important;
          color: #ef4444 !important;
        }

        &.status-blacklisted {
          background-color: rgba(0, 0, 0, 0.1) !important;
          color: #000000 !important;
        }
      }

      .status-icon {
        font-size: 18px !important;
        width: 18px !important;
        height: 18px !important;
        margin-right: 4px !important;
      }

      /* Tab Content */
      .tab-content {
        padding: 24px 0;
      }

      .content-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 24px;
      }

      .info-card {
        mat-card-header {
          margin-bottom: 16px;
        }

        mat-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 500;

          mat-icon {
            color: var(--mat-sys-primary);
          }
        }

        &.full-width {
          grid-column: 1 / -1;
        }
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .info-label {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .info-value {
        font-size: 16px;
        color: var(--mat-sys-on-surface);

        &.link {
          color: var(--mat-sys-primary);
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      .address {
        p {
          margin: 0;
          line-height: 1.5;
          color: var(--mat-sys-on-surface);
        }
      }

      /* Capabilities */
      .capabilities-section {
        display: grid;
        gap: 24px;
      }

      .capability-group {
        h4 {
          font-size: 14px;
          font-weight: 500;
          color: var(--mat-sys-on-surface);
          margin: 0 0 12px 0;
        }
      }

      .chips-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .service-chip {
        background-color: var(--mat-sys-primary-container) !important;
        color: var(--mat-sys-on-primary-container) !important;
      }

      .stat-value {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 500;
        color: var(--mat-sys-on-surface);

        mat-icon {
          color: var(--mat-sys-primary);
        }
      }

      /* Compliance */
      .compliance-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
      }

      .compliance-item {
        display: flex;
        gap: 16px;

        &.full-width {
          grid-column: 1 / -1;
        }
      }

      .compliance-icon {
        font-size: 32px !important;
        width: 32px !important;
        height: 32px !important;
        color: var(--mat-sys-primary);
      }

      .compliance-content {
        flex: 1;

        h4 {
          font-size: 16px;
          font-weight: 500;
          margin: 0 0 8px 0;
          color: var(--mat-sys-on-surface);
        }

        p {
          margin: 4px 0;
          color: var(--mat-sys-on-surface-variant);

          &.expired {
            color: var(--mat-sys-error);
          }
        }
      }

      .rating {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .star-icon {
        font-size: 20px !important;
        width: 20px !important;
        height: 20px !important;
        color: #fbbf24;
      }

      /* Teams */
      .teams-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;

        h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
        }
      }

      .empty-message {
        text-align: center;
        padding: 48px;
        color: var(--mat-sys-on-surface-variant);
      }

      /* Loading */
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px;
        gap: 16px;

        p {
          color: var(--mat-sys-on-surface-variant);
        }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .detail-container {
          padding: 16px;
        }

        .page-header {
          flex-direction: column;
        }

        .header-actions {
          width: 100%;

          button {
            flex: 1;
          }
        }

        .content-grid {
          grid-template-columns: 1fr;
        }

        .info-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ContractorDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contractorService = inject(ContractorService);

  contractor$!: Observable<Contractor | null | undefined>;

  ngOnInit() {
    this.contractor$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (id) {
          return this.contractorService.getContractor(id);
        }
        return of(undefined);
      }),
    );
  }

  // Status helpers
  getStatusClass(status: ContractorStatus): string {
    return `status-${status}`;
  }

  getStatusIcon(status: ContractorStatus): string {
    const icons: Record<ContractorStatus, string> = {
      active: 'check_circle',
      pending_approval: 'pending',
      suspended: 'pause_circle',
      blacklisted: 'cancel',
    };
    return icons[status];
  }

  getStatusLabel(status: ContractorStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Service label helper
  getServiceLabel(service: ServiceType): string {
    return service.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // Date formatting
  formatDate(timestamp: unknown): string {
    if (!timestamp) return 'N/A';
    const date = (timestamp as any).toDate
      ? (timestamp as any).toDate()
      : new Date(timestamp as any);
    return date.toLocaleDateString('en-ZA');
  }

  isExpired(timestamp: unknown): boolean {
    if (!timestamp) return false;
    const date = (timestamp as any).toDate
      ? (timestamp as any).toDate()
      : new Date(timestamp as any);
    return date < new Date();
  }

  // Financial helpers
  maskAccountNumber(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) return accountNumber;
    const lastFour = accountNumber.slice(-4);
    const masked = '*'.repeat(accountNumber.length - 4);
    return masked + lastFour;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Rating helper
  getStars(rating: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => (i < rating ? 1 : 0));
  }
}
