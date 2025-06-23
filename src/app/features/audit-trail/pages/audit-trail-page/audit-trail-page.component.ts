import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { AuditTrailService } from '../../../../core/services/audit-trail.service';
import { Router } from '@angular/router';
import { 
  AuditLog, 
  EntityType, 
  AuditAction, 
  ActionType, 
  ActionStatus,
  AuditFilters 
} from '../../../../core/models/audit-log.model';

@Component({
  selector: 'app-audit-trail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="audit-trail-page">
      <!-- Access denied message -->
      <div *ngIf="!hasAccess" class="access-denied">
        <mat-card>
          <mat-card-header>
            <mat-card-title>
              <mat-icon color="warn">block</mat-icon>
              Access Denied
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>You don't have permission to access the audit trail.</p>
            <p>Only administrators can view audit logs.</p>
            <button mat-raised-button color="primary" (click)="goToDashboard()">
              Go to Dashboard
            </button>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Audit trail content -->
      <div *ngIf="hasAccess">
        <div class="page-header">
          <h1>
            <mat-icon>history</mat-icon>
            Audit Trail
          </h1>
          <p>Track all user actions and system changes</p>
        </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-header>
          <mat-card-title>Filters</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="filters-grid">
            <mat-form-field>
              <mat-label>Entity Type</mat-label>
              <mat-select [(value)]="selectedEntityType" multiple>
                <mat-option *ngFor="let type of entityTypes" [value]="type">
                  {{ type | titlecase }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Action</mat-label>
              <mat-select [(value)]="selectedActions" multiple>
                <mat-option *ngFor="let action of actions" [value]="action">
                  {{ action | titlecase }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Action Type</mat-label>
              <mat-select [(value)]="selectedActionTypes" multiple>
                <mat-option *ngFor="let type of actionTypes" [value]="type">
                  {{ type | titlecase }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Status</mat-label>
              <mat-select [(value)]="selectedStatuses" multiple>
                <mat-option *ngFor="let status of statuses" [value]="status">
                  {{ status | titlecase }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>User Email</mat-label>
              <input matInput [(ngModel)]="userEmailFilter" placeholder="user@example.com">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Search</mat-label>
              <input matInput [(ngModel)]="searchText" placeholder="Search entity names, actions...">
            </mat-form-field>

            <mat-form-field>
              <mat-label>From Date</mat-label>
              <input matInput [matDatepicker]="fromPicker" [(ngModel)]="fromDate">
              <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
              <mat-datepicker #fromPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field>
              <mat-label>To Date</mat-label>
              <input matInput [matDatepicker]="toPicker" [(ngModel)]="toDate">
              <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
              <mat-datepicker #toPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <div class="filter-actions">
            <button mat-raised-button color="primary" (click)="applyFilters()">
              <mat-icon>filter_list</mat-icon>
              Apply Filters
            </button>
            <button mat-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon>
              Clear
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Results summary -->
      <div class="results-summary" *ngIf="!loading()">
        <p>{{ auditLogs().length }} audit log(s) found</p>
      </div>

      <!-- Audit logs list -->
      <mat-card class="audit-logs-card">
        <mat-card-header>
          <mat-card-title>Audit Logs</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="loading()" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading audit logs...</p>
          </div>

          <div *ngIf="!loading() && auditLogs().length === 0" class="no-results">
            <mat-icon>search_off</mat-icon>
            <p>No audit logs found matching your criteria</p>
          </div>

          <div class="audit-log-list" *ngIf="!loading() && auditLogs().length > 0">
            <div 
              class="audit-log-item" 
              *ngFor="let log of auditLogs(); trackBy: trackByLogId"
              [class]="'status-' + log.status"
            >
              <!-- Log header -->
              <div class="log-header">
                <div class="log-badges">
                  <span class="entity-type-badge" [attr.data-entity]="log.entityType">
                    {{ log.entityType | titlecase }}
                  </span>
                  <span class="action-badge" [attr.data-action]="log.action">
                    {{ log.action | titlecase }}
                  </span>
                  <span class="action-type-badge" [attr.data-type]="log.actionType">
                    {{ log.actionType | titlecase }}
                  </span>
                  <span class="status-badge" [attr.data-status]="log.status">
                    <mat-icon>{{ getStatusIcon(log.status) }}</mat-icon>
                    {{ log.status | titlecase }}
                  </span>
                </div>
                <div class="log-timestamp">
                  {{ formatTimestamp(log.timestamp) }}
                </div>
              </div>

              <!-- Log details -->
              <div class="log-details">
                <div class="entity-info">
                  <strong>{{ log.entityName }}</strong>
                  <span class="entity-id">(ID: {{ log.entityId }})</span>
                </div>
                <div class="user-info">
                  {{ log.action | titlecase }} by 
                  <strong>{{ log.userDisplayName }}</strong> 
                  ({{ log.userEmail }})
                </div>
              </div>

              <!-- Field changes -->
              <div class="changes-section" *ngIf="log.changes && log.changes.length > 0">
                <h4>Changes:</h4>
                <div class="field-changes">
                  <div 
                    class="field-change" 
                    *ngFor="let change of log.changes"
                  >
                    <span class="field-name">{{ change.field }}:</span>
                    <span class="value-change">
                      <span class="old-value">{{ change.displayOldValue || change.oldValue || 'null' }}</span>
                      <mat-icon class="arrow-icon">arrow_forward</mat-icon>
                      <span class="new-value">{{ change.displayNewValue || change.newValue || 'null' }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Error message for failed operations -->
              <div class="error-section" *ngIf="log.errorMessage">
                <mat-icon color="warn">error</mat-icon>
                <span class="error-message">{{ log.errorMessage }}</span>
              </div>

              <!-- Metadata -->
              <div class="metadata-section" *ngIf="log.metadata && showMetadata">
                <h4>Metadata:</h4>
                <pre>{{ log.metadata | json }}</pre>
              </div>

              <mat-divider></mat-divider>
            </div>
          </div>

          <!-- Load more button -->
          <div class="load-more-section" *ngIf="hasMore() && !loading()">
            <button mat-raised-button (click)="loadMore()">
              <mat-icon>expand_more</mat-icon>
              Load More
            </button>
          </div>
        </mat-card-content>
      </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .audit-trail-page {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .access-denied {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 60vh;
    }

    .access-denied mat-card {
      max-width: 400px;
      text-align: center;
    }

    .access-denied mat-card-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .page-header {
      margin-bottom: 20px;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
    }

    .page-header p {
      color: rgba(0, 0, 0, 0.6);
      margin: 0;
    }

    .filters-card {
      margin-bottom: 20px;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .filter-actions {
      display: flex;
      gap: 12px;
    }

    .results-summary {
      margin-bottom: 16px;
      color: rgba(0, 0, 0, 0.6);
    }

    .loading-container {
      text-align: center;
      padding: 40px;
    }

    .loading-container mat-spinner {
      margin: 0 auto 16px;
    }

    .no-results {
      text-align: center;
      padding: 40px;
      color: rgba(0, 0, 0, 0.6);
    }

    .no-results mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .audit-log-item {
      padding: 16px;
      border-left: 4px solid #e0e0e0;
      margin-bottom: 16px;
    }

    .audit-log-item.status-success {
      border-left-color: #4caf50;
    }

    .audit-log-item.status-failed {
      border-left-color: #f44336;
    }

    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .log-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .entity-type-badge, .action-badge, .action-type-badge, .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .entity-type-badge {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .action-badge {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }

    .action-type-badge {
      background-color: #e8f5e8;
      color: #388e3c;
    }

    .status-badge {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .status-badge[data-status="success"] {
      background-color: #e8f5e8;
      color: #388e3c;
    }

    .status-badge[data-status="failed"] {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .log-timestamp {
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
    }

    .log-details {
      margin-bottom: 12px;
    }

    .entity-info {
      margin-bottom: 4px;
    }

    .entity-id {
      color: rgba(0, 0, 0, 0.6);
      font-size: 12px;
    }

    .user-info {
      color: rgba(0, 0, 0, 0.8);
    }

    .changes-section {
      margin-bottom: 12px;
    }

    .changes-section h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .field-changes {
      background-color: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
    }

    .field-change {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }

    .field-change:last-child {
      margin-bottom: 0;
    }

    .field-name {
      font-weight: 500;
      min-width: 120px;
      color: rgba(0, 0, 0, 0.8);
    }

    .value-change {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .old-value {
      background-color: #ffebee;
      color: #c62828;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }

    .new-value {
      background-color: #e8f5e8;
      color: #2e7d32;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }

    .arrow-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(0, 0, 0, 0.6);
    }

    .error-section {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #ffebee;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .error-message {
      color: #c62828;
      font-weight: 500;
    }

    .metadata-section {
      margin-bottom: 12px;
    }

    .metadata-section h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .metadata-section pre {
      background-color: #f5f5f5;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
    }

    .load-more-section {
      text-align: center;
      padding: 20px;
    }

    @media (max-width: 768px) {
      .audit-trail-page {
        padding: 12px;
      }

      .filters-grid {
        grid-template-columns: 1fr;
      }

      .log-header {
        flex-direction: column;
        gap: 8px;
      }

      .value-change {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class AuditTrailPageComponent implements OnInit {
  private auditService = inject(AuditTrailService);
  private router = inject(Router);

  // Access control
  hasAccess = false;

  // Signals for reactive state
  auditLogs = signal<AuditLog[]>([]);
  loading = signal(false);
  hasMore = signal(false);
  
  // Filter options
  entityTypes: EntityType[] = [
    'project', 'task', 'phase', 'step',
    'client', 'supplier', 'contractor', 'staff',
    'stock', 'material', 'boq', 'quote',
    'email', 'settings', 'role', 'user'
  ];

  actions: AuditAction[] = [
    'create', 'update', 'delete', 'assign', 'unassign',
    'status_change', 'send', 'approve', 'reject',
    'archive', 'restore', 'login', 'logout'
  ];

  actionTypes: ActionType[] = ['user', 'system', 'scheduled'];
  statuses: ActionStatus[] = ['success', 'failed'];

  // Filter values
  selectedEntityType: EntityType[] = [];
  selectedActions: AuditAction[] = [];
  selectedActionTypes: ActionType[] = [];
  selectedStatuses: ActionStatus[] = [];
  userEmailFilter = '';
  searchText = '';
  fromDate: Date | null = null;
  toDate: Date | null = null;

  // Pagination
  private lastDocument: any = null;
  showMetadata = false;

  ngOnInit() {
    this.hasAccess = this.auditService.canAccessAuditTrail();
    if (this.hasAccess) {
      this.loadAuditLogs();
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  async applyFilters() {
    this.auditLogs.set([]);
    this.lastDocument = null;
    await this.loadAuditLogs();
  }

  clearFilters() {
    this.selectedEntityType = [];
    this.selectedActions = [];
    this.selectedActionTypes = [];
    this.selectedStatuses = [];
    this.userEmailFilter = '';
    this.searchText = '';
    this.fromDate = null;
    this.toDate = null;
    this.applyFilters();
  }

  async loadAuditLogs() {
    if (this.loading()) return;

    this.loading.set(true);

    try {
      const filters: AuditFilters = {
        entityTypes: this.selectedEntityType.length > 0 ? this.selectedEntityType : undefined,
        actions: this.selectedActions.length > 0 ? this.selectedActions : undefined,
        actionTypes: this.selectedActionTypes.length > 0 ? this.selectedActionTypes : undefined,
        statuses: this.selectedStatuses.length > 0 ? this.selectedStatuses : undefined,
        userEmail: this.userEmailFilter || undefined,
        searchText: this.searchText || undefined,
        dateRange: this.fromDate && this.toDate ? {
          start: this.fromDate,
          end: this.toDate
        } : undefined
      };

      const result = await this.auditService.getAuditLogs(
        filters,
        50,
        this.lastDocument
      );

      if (this.lastDocument) {
        // Append to existing logs
        this.auditLogs.update(logs => [...logs, ...result.logs]);
      } else {
        // Replace with new logs
        this.auditLogs.set(result.logs);
      }

      this.hasMore.set(result.hasMore);
      this.lastDocument = result.lastDocument;
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore() {
    if (this.hasMore() && !this.loading()) {
      await this.loadAuditLogs();
    }
  }

  trackByLogId(index: number, log: AuditLog): string {
    return log.id;
  }

  getStatusIcon(status: ActionStatus): string {
    return status === 'success' ? 'check_circle' : 'error';
  }

  formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }
}