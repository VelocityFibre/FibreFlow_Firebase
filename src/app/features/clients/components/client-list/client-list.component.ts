import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { Observable, map, startWith, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ClientService } from '../../services/client.service';
import { Client, ClientType, ClientStatus } from '../../models/client.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-client-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatDividerModule,
    MatInputModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
  ],
  template: `
    <div class="ff-page-container">
      <!-- Header -->
      <div class="ff-page-header">
        <div class="header-content">
          <h1 class="page-title">Clients</h1>
          <p class="page-subtitle">Manage your client relationships and project portfolios</p>
        </div>
        <div class="header-actions">
          <a mat-raised-button color="primary" routerLink="/clients/new">
            <mat-icon>add</mat-icon>
            Add Client
          </a>
        </div>
      </div>

      <!-- Search and Stats -->
      <div class="search-section">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search clients</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input
            matInput
            [formControl]="searchControl"
            placeholder="Search by name, contact, or industry..."
          />
        </mat-form-field>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid" *ngIf="clients$ | async as clients">
        <mat-card class="stat-card ff-card-clients">
          <mat-card-content>
            <div class="stat-icon">
              <mat-icon>business</mat-icon>
            </div>
            <div class="stat-content">
              <h3>Total Clients</h3>
              <div class="stat-value">{{ clients.length }}</div>
              <div class="stat-subtitle">{{ getActiveCount(clients) }} active</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card ff-card-clients">
          <mat-card-content>
            <div class="stat-icon currency">
              <mat-icon>attach_money</mat-icon>
            </div>
            <div class="stat-content">
              <h3>Total Value</h3>
              <div class="stat-value">{{ formatCurrency(getTotalValue(clients)) }}</div>
              <div class="stat-subtitle">Across all projects</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card ff-card-clients">
          <mat-card-content>
            <div class="stat-icon projects">
              <mat-icon>folder</mat-icon>
            </div>
            <div class="stat-content">
              <h3>Active Projects</h3>
              <div class="stat-value">{{ getTotalProjects(clients) }}</div>
              <div class="stat-subtitle">Total projects</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card ff-card-clients">
          <mat-card-content>
            <div class="stat-icon enterprise">
              <mat-icon>apartment</mat-icon>
            </div>
            <div class="stat-content">
              <h3>Enterprise Clients</h3>
              <div class="stat-value">{{ getEnterpriseCount(clients) }}</div>
              <div class="stat-subtitle">High-value accounts</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Clients Grid -->
      <div class="clients-grid" *ngIf="filteredClients$ | async as clients; else loading">
        <mat-card
          *ngFor="let client of clients"
          class="client-card ff-card-clients"
          (click)="navigateToClient(client.id)"
        >
          <mat-card-header>
            <div class="card-header-content">
              <div class="client-info">
                <mat-card-title>{{ client.name }}</mat-card-title>
                <mat-card-subtitle>{{ client.contactPerson }}</mat-card-subtitle>
              </div>
              <div class="header-actions">
                <div class="header-badges">
                  <mat-chip [ngClass]="getTypeClass(client.clientType)">
                    {{ client.clientType }}
                  </mat-chip>
                  <div class="status-indicator">
                    <div class="status-dot" [ngClass]="getStatusClass(client.status)"></div>
                    <span class="status-text">{{ client.status }}</span>
                  </div>
                </div>
                <button
                  mat-icon-button
                  [matMenuTriggerFor]="menu"
                  (click)="$event.stopPropagation()"
                >
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item [routerLink]="['/clients', client.id]">
                    <mat-icon>visibility</mat-icon>
                    <span>View Details</span>
                  </button>
                  <button mat-menu-item [routerLink]="['/clients', client.id, 'edit']">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="deleteClient(client)">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </div>
            </div>
          </mat-card-header>

          <mat-card-content>
            <div class="contact-info">
              <div class="info-item">
                <mat-icon class="info-icon">phone</mat-icon>
                <span>{{ client.phone }}</span>
              </div>
              <div class="info-item">
                <mat-icon class="info-icon">email</mat-icon>
                <span>{{ client.email }}</span>
              </div>
              <div class="info-item">
                <mat-icon class="info-icon">location_on</mat-icon>
                <span>{{ client.address }}</span>
              </div>
            </div>

            <mat-divider class="content-divider"></mat-divider>

            <div class="metrics-section">
              <div class="metric">
                <span class="metric-label">Projects:</span>
                <span class="metric-value">{{ client.projectsCount }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Total Value:</span>
                <span class="metric-value">{{ formatCurrency(client.totalValue) }}</span>
              </div>
              <div class="metric" *ngIf="client.industry">
                <span class="metric-label">Industry:</span>
                <span class="metric-value">{{ client.industry }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Empty State -->
        <div *ngIf="clients.length === 0" class="empty-state">
          <mat-icon class="empty-icon">business_off</mat-icon>
          <h2>No clients found</h2>
          <p>
            {{
              searchControl.value
                ? 'Try adjusting your search criteria'
                : 'Add your first client to get started'
            }}
          </p>
          <a
            mat-raised-button
            color="primary"
            routerLink="/clients/new"
            *ngIf="!searchControl.value"
          >
            <mat-icon>add</mat-icon>
            Add Your First Client
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <ng-template #loading>
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading clients...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
      @use '../../../../../styles/component-theming' as theme;

      // Page container following theme standards
      .ff-page-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 40px 24px;

        @media (max-width: 768px) {
          padding: 24px 16px;
        }
      }

      // Page header pattern matching dashboard exactly
      .ff-page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 48px;

        .header-content {
          flex: 1;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .page-title {
          font-size: 32px;
          font-weight: 300;
          color: theme.ff-rgb(foreground);
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          font-size: 18px;
          color: theme.ff-rgb(muted-foreground);
          font-weight: 400;
          margin: 0;
        }
      }

      .search-section {
        margin-bottom: 24px;
      }

      .search-field {
        width: 100%;
        max-width: 500px;
      }

      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }

      .stat-card {
        mat-card-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }
      }

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
        flex-shrink: 0;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        &.currency {
          background-color: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        &.projects {
          background-color: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        &.enterprise {
          background-color: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
      }

      .stat-content {
        flex: 1;

        h3 {
          font-size: 14px;
          font-weight: 500;
          color: var(--mat-sys-on-surface-variant);
          margin: 0 0 4px 0;
        }
      }

      .stat-value {
        font-size: 28px;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
        line-height: 1.2;
      }

      .stat-subtitle {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
        margin-top: 4px;
      }

      /* Clients Grid */
      .clients-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 24px;
      }

      .client-card {
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-4px);
          box-shadow: var(--mat-sys-elevation-4);
        }
      }

      .card-header-content {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }

      .client-info {
        flex: 1;
        min-width: 0;
      }

      mat-card-title {
        font-size: 18px;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
        margin-bottom: 4px;
      }

      mat-card-subtitle {
        color: var(--mat-sys-on-surface-variant);
      }

      .header-actions {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .header-badges {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }

      mat-chip {
        font-size: 12px !important;

        &.type-Enterprise {
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        &.type-SMB {
          background-color: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }

        &.type-Residential {
          background-color: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.status-Active {
          background-color: #22c55e;
        }

        &.status-Inactive {
          background-color: #6b7280;
        }

        &.status-Pending {
          background-color: #f59e0b;
        }
      }

      .status-text {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }

      .contact-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
      }

      .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: var(--mat-sys-on-surface-variant);
      }

      .info-icon {
        font-size: 16px !important;
        width: 16px !important;
        height: 16px !important;
        color: var(--mat-sys-on-surface-variant);
      }

      .content-divider {
        margin: 16px 0;
      }

      .metrics-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .metric {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
      }

      .metric-label {
        color: var(--mat-sys-on-surface-variant);
      }

      .metric-value {
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }

      /* Empty State */
      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 80px 32px;
        background: var(--mat-sys-surface-variant);
        border-radius: 12px;
        border: 2px dashed var(--mat-sys-outline-variant);
      }

      .empty-icon {
        font-size: 64px !important;
        width: 64px !important;
        height: 64px !important;
        color: var(--mat-sys-on-surface-variant);
        margin-bottom: 16px;
      }

      .empty-state h2 {
        font-size: 24px;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
        margin: 0 0 8px 0;
      }

      .empty-state p {
        font-size: 16px;
        color: var(--mat-sys-on-surface-variant);
        margin: 0 0 24px 0;
      }

      /* Loading State */
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
      @media (max-width: 1200px) {
        .clients-grid {
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        }
      }

      @media (max-width: 768px) {
        .clients-container {
          padding: 16px;
        }

        .page-header {
          flex-direction: column;
          gap: 16px;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }

        .clients-grid {
          grid-template-columns: 1fr;
        }

        .card-header-content {
          flex-direction: column;
          align-items: flex-start;
        }

        .header-badges {
          flex-direction: row;
          align-items: center;
        }
      }
    `,
  ],
})
export class ClientListComponent implements OnInit {
  private clientService = inject(ClientService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  searchControl = new FormControl('');
  clients$!: Observable<Client[]>;
  filteredClients$!: Observable<Client[]>;

  ngOnInit() {
    this.clients$ = this.clientService.getClients();

    this.filteredClients$ = combineLatest([
      this.clients$,
      this.searchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
      ),
    ]).pipe(
      map(([clients, searchTerm]) => {
        if (!searchTerm) return clients;

        const term = searchTerm.toLowerCase();
        return clients.filter(
          (client) =>
            client.name.toLowerCase().includes(term) ||
            client.contactPerson.toLowerCase().includes(term) ||
            client.email.toLowerCase().includes(term) ||
            (client.industry && client.industry.toLowerCase().includes(term)),
        );
      }),
    );
  }

  // Stats calculations
  getActiveCount(clients: Client[]): number {
    return clients.filter((c) => c.status === 'Active').length;
  }

  getTotalValue(clients: Client[]): number {
    return clients.reduce((sum, client) => sum + client.totalValue, 0);
  }

  getTotalProjects(clients: Client[]): number {
    return clients.reduce((sum, client) => sum + client.projectsCount, 0);
  }

  getEnterpriseCount(clients: Client[]): number {
    return clients.filter((c) => c.clientType === 'Enterprise').length;
  }

  // Formatting helpers
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getTypeClass(type: ClientType): string {
    return `type-${type}`;
  }

  getStatusClass(status: ClientStatus): string {
    return `status-${status}`;
  }

  navigateToClient(clientId: string): void {
    this.router.navigate(['/clients', clientId]);
  }

  async deleteClient(client: Client): Promise<void> {
    if (confirm(`Are you sure you want to delete ${client.name}? This action cannot be undone.`)) {
      try {
        await this.clientService.deleteClient(client.id!);
        this.notificationService.success(`Client "${client.name}" has been deleted successfully.`);
        // Refresh the clients list
        this.clients$ = this.clientService.getClients();
        this.ngOnInit(); // Re-initialize to refresh filtered clients
      } catch (error) {
        console.error('Error deleting client:', error);
        this.notificationService.error('Failed to delete client. Please try again.');
      }
    }
  }
}
