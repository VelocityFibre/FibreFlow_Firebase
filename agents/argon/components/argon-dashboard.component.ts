import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';

import { ArgonService } from '../../../src/app/core/services/argon.service';
import {
  ArgonDatabaseConnection,
  ArgonSystemMetrics,
  ArgonAnalyticsQuery,
  UnifiedQuery
} from '../models/argon.models';

@Component({
  selector: 'app-argon-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="argon-dashboard">
      <!-- Header -->
      <div class="header">
        <h1>
          <mat-icon>hub</mat-icon>
          Argon Database Command Center
        </h1>
        <button 
          mat-raised-button 
          color="primary" 
          (click)="refreshConnections()"
          [disabled]="argonService.isLoading()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </div>

      <!-- Connection Status -->
      <mat-card class="connection-status">
        <mat-card-header>
          <mat-card-title>Database Connections</mat-card-title>
          <mat-card-subtitle>
            {{ argonService.connectionHealth().connected }}/{{ argonService.connectionHealth().total }} 
            databases connected ({{ argonService.connectionHealth().healthPercentage }}%)
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="connection-grid">
            @for (connection of argonService.connectionStatus(); track connection.type) {
              <div class="connection-card" [class]="'status-' + connection.status">
                <div class="connection-info">
                  <mat-icon>{{ getConnectionIcon(connection.type) }}</mat-icon>
                  <div>
                    <h4>{{ connection.name }}</h4>
                    <p>{{ connection.description }}</p>
                  </div>
                </div>
                <mat-chip [class]="'status-chip-' + connection.status">
                  {{ connection.status | titlecase }}
                </mat-chip>
                @if (connection.error) {
                  <div class="error-message">
                    <mat-icon color="warn">error</mat-icon>
                    <span>{{ connection.error }}</span>
                  </div>
                }
                @if (connection.metadata?.['responseTimeMs']) {
                  <div class="response-time">
                    Response: {{ connection.metadata?.['responseTimeMs'] }}ms
                  </div>
                }
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabs for different functionalities -->
      <mat-tab-group>
        <!-- System Metrics Tab -->
        <mat-tab label="System Metrics" class="metrics-tab">
          @if (argonService.systemMetrics(); as metrics) {
            <div class="metrics-grid">
              <!-- Projects Metrics -->
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Projects</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="metric-item">
                    <span class="metric-value">{{ metrics.projects.total }}</span>
                    <span class="metric-label">Total</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value active">{{ metrics.projects.active }}</span>
                    <span class="metric-label">Active</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value completed">{{ metrics.projects.completed }}</span>
                    <span class="metric-label">Completed</span>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Tasks Metrics -->
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Tasks</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="metric-item">
                    <span class="metric-value">{{ metrics.tasks.total }}</span>
                    <span class="metric-label">Total</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value backlog">{{ metrics.tasks.backlog }}</span>
                    <span class="metric-label">Backlog</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value in-progress">{{ metrics.tasks.inProgress }}</span>
                    <span class="metric-label">In Progress</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value completed">{{ metrics.tasks.completed }}</span>
                    <span class="metric-label">Completed</span>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Performance Metrics -->
              <mat-card>
                <mat-card-header>
                  <mat-card-title>Performance</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="metric-item">
                    <span class="metric-value">{{ metrics.performance.avgResponseTimeMs }}ms</span>
                    <span class="metric-label">Avg Response Time</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value">{{ metrics.performance.totalQueries }}</span>
                    <span class="metric-label">Total Queries</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-value" 
                          [class.error]="metrics.performance.errorRate > 0.1">
                      {{ (metrics.performance.errorRate * 100).toFixed(1) }}%
                    </span>
                    <span class="metric-label">Error Rate</span>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          } @else {
            <div class="loading-container">
              <mat-spinner></mat-spinner>
              <p>Loading system metrics...</p>
            </div>
          }
        </mat-tab>

        <!-- Query Interface Tab -->
        <mat-tab label="Query Interface" class="query-tab">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Execute Unified Query</mat-card-title>
              <mat-card-subtitle>Query across multiple databases simultaneously</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="queryForm" (ngSubmit)="executeQuery()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Query Description</mat-label>
                  <input matInput formControlName="description" 
                         placeholder="Describe what you want to query">
                </mat-form-field>

                <div class="database-selection">
                  <mat-form-field appearance="outline">
                    <mat-label>Target Database</mat-label>
                    <mat-select formControlName="targetDatabase">
                      <mat-option value="firestore">Firestore (FibreFlow)</mat-option>
                      <mat-option value="supabase">Supabase (Analytics)</mat-option>
                      <mat-option value="neon">Neon (PostgreSQL)</mat-option>
                      <mat-option value="all">All Databases</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Query Parameters (JSON)</mat-label>
                    <textarea matInput formControlName="queryParams" 
                              rows="4" 
                              placeholder='{"limit": 10, "orderBy": "createdAt"}'>
                    </textarea>
                  </mat-form-field>
                </div>

                <div class="query-actions">
                  <button mat-raised-button color="primary" type="submit" 
                          [disabled]="queryForm.invalid || isExecutingQuery()">
                    <mat-icon>play_arrow</mat-icon>
                    Execute Query
                  </button>
                  <button mat-button type="button" (click)="clearQueryResults()">
                    <mat-icon>clear</mat-icon>
                    Clear Results
                  </button>
                </div>
              </form>

              <!-- Query Results -->
              @if (queryResults()) {
                <div class="query-results">
                  <h3>Query Results</h3>
                  <div class="results-summary">
                    <mat-chip-set>
                      <mat-chip>{{ queryResults()!.results.length }} sources</mat-chip>
                      <mat-chip>{{ queryResults()!.mergedData.length }} records</mat-chip>
                      <mat-chip>{{ queryResults()!.totalExecutionTimeMs }}ms</mat-chip>
                      <mat-chip [color]="queryResults()!.success ? 'primary' : 'warn'">
                        {{ queryResults()!.success ? 'Success' : 'Failed' }}
                      </mat-chip>
                    </mat-chip-set>
                  </div>

                  @if (queryResults()!.mergedData.length > 0) {
                    <div class="results-table">
                      <mat-table [dataSource]="queryResults()!.mergedData.slice(0, 10)">
                        <!-- Dynamic columns would be created based on data structure -->
                        <ng-container matColumnDef="data">
                          <mat-header-cell *matHeaderCellDef>Data</mat-header-cell>
                          <mat-cell *matCellDef="let element">
                            <pre>{{ element | json }}</pre>
                          </mat-cell>
                        </ng-container>

                        <mat-header-row *matHeaderRowDef="['data']"></mat-header-row>
                        <mat-row *matRowDef="let row; columns: ['data']"></mat-row>
                      </mat-table>
                    </div>
                  } @else if (queryResults()!.errors.length > 0) {
                    <div class="error-section">
                      <h4>Errors:</h4>
                      @for (error of queryResults()!.errors; track error) {
                        <div class="error-message">
                          <mat-icon color="warn">error</mat-icon>
                          <span>{{ error }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        </mat-tab>

        <!-- Project Analytics Tab -->
        <mat-tab label="Project Analytics" class="analytics-tab">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Project Analytics Dashboard</mat-card-title>
              <mat-card-subtitle>Comprehensive project insights across all databases</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (projectAnalytics()) {
                <div class="analytics-content">
                  <div class="analytics-summary">
                    <div class="summary-stat">
                      <span class="stat-value">{{ projectAnalytics()!.analysis.totalProjects }}</span>
                      <span class="stat-label">Total Projects</span>
                    </div>
                    <div class="summary-stat">
                      <span class="stat-value">{{ projectAnalytics()!.analysis.activeProjects }}</span>
                      <span class="stat-label">Active</span>
                    </div>
                    <div class="summary-stat">
                      <span class="stat-value">{{ projectAnalytics()!.analysis.avgProgress }}%</span>
                      <span class="stat-label">Avg Progress</span>
                    </div>
                  </div>

                  @if (projectAnalytics()!.milestones?.length) {
                    <div class="milestones-section">
                      <h3>Build Milestones</h3>
                      <div class="milestones-grid">
                        @for (milestone of projectAnalytics()!.milestones; track milestone.name) {
                          <div class="milestone-card">
                            <h4>{{ milestone.name }}</h4>
                            <div class="progress-bar">
                              <div class="progress-fill" 
                                   [style.width.%]="milestone.percentage">
                              </div>
                            </div>
                            <div class="progress-text">
                              {{ milestone.completed }} / {{ milestone.scope }} 
                              ({{ milestone.percentage }}%)
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="loading-container">
                  <mat-spinner></mat-spinner>
                  <p>Loading project analytics...</p>
                </div>
              }

              <div class="analytics-actions">
                <button mat-raised-button color="primary" (click)="loadProjectAnalytics(true)">
                  <mat-icon>refresh</mat-icon>
                  Refresh Analytics
                </button>
                <button mat-stroked-button (click)="exportAnalytics()">
                  <mat-icon>download</mat-icon>
                  Export Data
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </mat-tab>
      </mat-tab-group>

      <!-- Error Display -->
      @if (argonService.error()) {
        <mat-card class="error-card">
          <mat-card-content>
            <mat-icon color="warn">error</mat-icon>
            <span>{{ argonService.error() }}</span>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .argon-dashboard {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h1 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      flex: 1;
    }

    .connection-status {
      margin-bottom: 24px;
    }

    .connection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .connection-card {
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .connection-card.status-connected {
      border-color: #4caf50;
      background: #f1f8e9;
    }

    .connection-card.status-error {
      border-color: #f44336;
      background: #ffebee;
    }

    .connection-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .connection-info h4 {
      margin: 0;
      font-size: 16px;
    }

    .connection-info p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .status-chip-connected {
      background: #4caf50;
      color: white;
    }

    .status-chip-error {
      background: #f44336;
      color: white;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      font-size: 14px;
    }

    .response-time {
      font-size: 12px;
      color: #666;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: bold;
      line-height: 1;
    }

    .metric-value.active { color: #2196f3; }
    .metric-value.completed { color: #4caf50; }
    .metric-value.backlog { color: #ff9800; }
    .metric-value.in-progress { color: #9c27b0; }
    .metric-value.error { color: #f44336; }

    .metric-label {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .database-selection {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 16px;
      margin: 16px 0;
    }

    .query-actions {
      display: flex;
      gap: 16px;
      margin-top: 16px;
    }

    .query-results {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .results-summary {
      margin: 16px 0;
    }

    .results-table {
      margin-top: 16px;
      max-height: 400px;
      overflow-y: auto;
    }

    .error-section {
      margin-top: 16px;
    }

    .error-card {
      background: #ffebee;
      margin-top: 16px;
    }

    .error-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
    }

    .analytics-content {
      margin-top: 16px;
    }

    .analytics-summary {
      display: flex;
      gap: 32px;
      margin-bottom: 32px;
    }

    .summary-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #2196f3;
    }

    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }

    .milestones-section {
      margin-top: 32px;
    }

    .milestones-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }

    .milestone-card {
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .milestone-card h4 {
      margin: 0 0 12px 0;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0;
    }

    .progress-fill {
      height: 100%;
      background: #4caf50;
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 14px;
      color: #666;
      text-align: center;
    }

    .analytics-actions {
      margin-top: 24px;
      display: flex;
      gap: 16px;
    }
  `]
})
export class ArgonDashboardComponent implements OnInit {
  argonService = inject(ArgonService);
  private fb = inject(FormBuilder);

  // Signals for reactive state
  queryResults = signal<any>(null);
  projectAnalytics = signal<any>(null);
  isExecutingQuery = signal(false);

  queryForm: FormGroup;

  constructor() {
    this.queryForm = this.fb.group({
      description: [''],
      targetDatabase: ['firestore'],
      queryParams: ['{}']
    });
  }

  ngOnInit(): void {
    // Load initial data
    this.loadProjectAnalytics();
  }

  refreshConnections(): void {
    this.argonService.refreshConnections().subscribe();
  }

  loadProjectAnalytics(forceRefresh: boolean = false): void {
    this.argonService.getProjectAnalytics(forceRefresh).subscribe({
      next: (analytics) => this.projectAnalytics.set(analytics),
      error: (error) => console.error('Failed to load analytics:', error)
    });
  }

  executeQuery(): void {
    if (this.queryForm.invalid) return;

    this.isExecutingQuery.set(true);
    const formValue = this.queryForm.value;
    
    try {
      const queryParams = JSON.parse(formValue.queryParams || '{}');
      
      const unifiedQuery: UnifiedQuery = {
        description: formValue.description,
        mergeStrategy: 'union'
      };

      // Build query based on target database
      switch (formValue.targetDatabase) {
        case 'firestore':
          unifiedQuery.firestore = {
            collection: queryParams.collection || 'projects',
            limit: queryParams.limit || 10,
            filters: queryParams.filters || []
          };
          break;
        
        case 'supabase':
          unifiedQuery.supabase = {
            table: queryParams.table || 'zone_progress_view',
            select: queryParams.select || '*',
            limit: queryParams.limit || 10
          };
          break;
        
        case 'neon':
          unifiedQuery.neon = {
            sql: queryParams.sql || 'SELECT * FROM projects LIMIT 10',
            parameters: queryParams.parameters || []
          };
          break;
        
        case 'all':
          unifiedQuery.firestore = { collection: 'projects', limit: 5 };
          unifiedQuery.supabase = { table: 'zone_progress_view', select: '*', limit: 5 };
          unifiedQuery.neon = { sql: 'SELECT * FROM projects LIMIT 5' };
          break;
      }

      this.argonService.executeUnifiedQuery(unifiedQuery).subscribe({
        next: (result) => {
          this.queryResults.set(result);
          this.isExecutingQuery.set(false);
        },
        error: (error) => {
          console.error('Query execution failed:', error);
          this.isExecutingQuery.set(false);
        }
      });

    } catch (error) {
      console.error('Invalid query parameters:', error);
      this.isExecutingQuery.set(false);
    }
  }

  clearQueryResults(): void {
    this.queryResults.set(null);
  }

  exportAnalytics(): void {
    this.argonService.exportForAI(true).subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `argon-analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => console.error('Export failed:', error)
    });
  }

  getConnectionIcon(type: string): string {
    switch (type) {
      case 'firestore': return 'cloud_queue';
      case 'supabase': return 'analytics';
      case 'neon': return 'storage';
      default: return 'database';
    }
  }
}