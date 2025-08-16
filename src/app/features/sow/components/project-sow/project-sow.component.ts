import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

// AG Grid imports
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridReadyEvent,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

import { NeonService } from '@app/core/services/neon.service';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

interface SOWPole {
  pole_number: string;
  status: string;
  latitude: number;
  longitude: number;
  zone_no: string;
  pon_no: string;
}

interface SOWDrop {
  drop_number: string;
  pole_number: string;
  address: string;
  status: string;
  distance_to_pole: number;
}

interface SOWFibre {
  segment_id: string;
  from_point: string;
  to_point: string;
  distance: number;
  fibre_type: string;
  contractor: string;
  completed: string;
}

@Component({
  selector: 'app-project-sow',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    AgGridAngular
  ],
  template: `
    <div class="sow-container">
      <!-- SOW Summary Cards -->
      <div class="summary-cards" *ngIf="sowSummary$ | async as summary">
        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon poles">
              <mat-icon>cell_tower</mat-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ summary.totalPoles }}</div>
              <div class="summary-label">Poles</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon drops">
              <mat-icon>home</mat-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ summary.totalDrops }}</div>
              <div class="summary-label">Drops</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon fibre">
              <mat-icon>cable</mat-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ summary.totalFibre }}</div>
              <div class="summary-label">Fibre Segments</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card">
          <mat-card-content>
            <div class="summary-icon distance">
              <mat-icon>straighten</mat-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ summary.totalDistance.toLocaleString() }}m</div>
              <div class="summary-label">Total Distance</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- No Data Message -->
      <div class="no-data-container" *ngIf="(sowSummary$ | async) && !(hasData$ | async)">
        <mat-card class="no-data-card">
          <mat-card-content>
            <mat-icon class="no-data-icon">description</mat-icon>
            <h3>No SOW Data Available</h3>
            <p>SOW data has not been imported for this project yet.</p>
            <p class="import-note">Please contact your administrator to import the SOW Excel files.</p>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Data Tabs -->
      <mat-tab-group *ngIf="hasData$ | async" class="sow-tabs">
        <!-- Poles Tab -->
        <mat-tab label="Poles">
          <div class="tab-content">
            <!-- Filter Bar -->
            <div class="filter-bar">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Search poles</mat-label>
                <input matInput [(ngModel)]="searchText" (ngModelChange)="onSearchChanged()">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
              
              <button mat-stroked-button (click)="exportData('poles')" class="export-btn">
                <mat-icon>download</mat-icon>
                Export Poles
              </button>
            </div>

            <!-- AG Grid -->
            <ag-grid-angular
              class="ag-theme-material sow-grid"
              [rowData]="polesData"
              [columnDefs]="poleColumnDefs"
              [defaultColDef]="defaultColDef"
              (gridReady)="onPolesGridReady($event)"
              [pagination]="true"
              [paginationPageSize]="50"
              [paginationPageSizeSelector]="[25, 50, 100, 200]"
              [animateRows]="true"
              [rowSelection]="'multiple'"
              [suppressRowClickSelection]="true"
              [enableCellTextSelection]="true">
            </ag-grid-angular>
          </div>
        </mat-tab>

        <!-- Drops Tab -->
        <mat-tab label="Drops">
          <div class="tab-content">
            <!-- Filter Bar -->
            <div class="filter-bar">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Search drops</mat-label>
                <input matInput [(ngModel)]="searchText" (ngModelChange)="onSearchChanged()">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChanged()">
                  <mat-option value="">All</mat-option>
                  <mat-option value="pending">Pending</mat-option>
                  <mat-option value="approved">Approved</mat-option>
                  <mat-option value="installed">Installed</mat-option>
                </mat-select>
              </mat-form-field>

              <button mat-stroked-button (click)="exportData('drops')" class="export-btn">
                <mat-icon>download</mat-icon>
                Export Drops
              </button>
            </div>

            <!-- AG Grid -->
            <ag-grid-angular
              class="ag-theme-material sow-grid"
              [rowData]="dropsData"
              [columnDefs]="dropColumnDefs"
              [defaultColDef]="defaultColDef"
              (gridReady)="onDropsGridReady($event)"
              [pagination]="true"
              [paginationPageSize]="50"
              [paginationPageSizeSelector]="[25, 50, 100, 200]"
              [animateRows]="true"
              [rowSelection]="'multiple'"
              [suppressRowClickSelection]="true"
              [enableCellTextSelection]="true">
            </ag-grid-angular>
          </div>
        </mat-tab>

        <!-- Fibre Tab -->
        <mat-tab label="Fibre">
          <div class="tab-content">
            <!-- Filter Bar -->
            <div class="filter-bar">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Search segments</mat-label>
                <input matInput [(ngModel)]="searchText" (ngModelChange)="onSearchChanged()">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Contractor</mat-label>
                <mat-select [(ngModel)]="contractorFilter" (ngModelChange)="onFilterChanged()">
                  <mat-option value="">All</mat-option>
                  <mat-option value="velocity">Velocity</mat-option>
                  <mat-option value="elevate">Elevate</mat-option>
                  <mat-option value="plannet">PlanNet</mat-option>
                </mat-select>
              </mat-form-field>

              <button mat-stroked-button (click)="exportData('fibre')" class="export-btn">
                <mat-icon>download</mat-icon>
                Export Fibre
              </button>
            </div>

            <!-- AG Grid -->
            <ag-grid-angular
              class="ag-theme-material sow-grid"
              [rowData]="fibreData"
              [columnDefs]="fibreColumnDefs"
              [defaultColDef]="defaultColDef"
              (gridReady)="onFibreGridReady($event)"
              [pagination]="true"
              [paginationPageSize]="50"
              [paginationPageSizeSelector]="[25, 50, 100, 200]"
              [animateRows]="true"
              [rowSelection]="'multiple'"
              [suppressRowClickSelection]="true"
              [enableCellTextSelection]="true">
            </ag-grid-angular>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="loading()">
        <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
        <p>Loading SOW data...</p>
      </div>
    </div>
  `,
  styleUrls: ['./project-sow.component.scss']
})
export class ProjectSOWComponent implements OnInit {
  @Input() projectId!: string;
  
  private neonService = inject(NeonService);
  
  loading = signal(true);
  poles$!: Observable<SOWPole[]>;
  drops$!: Observable<SOWDrop[]>;
  fibre$!: Observable<SOWFibre[]>;
  sowSummary$!: Observable<any>;
  hasData$!: Observable<boolean>;
  
  // AG Grid properties
  polesData: SOWPole[] = [];
  dropsData: SOWDrop[] = [];
  fibreData: SOWFibre[] = [];
  
  polesGridApi!: GridApi;
  dropsGridApi!: GridApi;
  fibreGridApi!: GridApi;
  
  // Filter properties
  searchText = '';
  statusFilter = '';
  contractorFilter = '';
  
  // Column definitions for AG Grid
  poleColumnDefs: ColDef[] = [
    {
      field: 'pole_number',
      headerName: 'Pole Number',
      sortable: true,
      filter: true,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        const statusClass = this.getStatusClass(params.value);
        return `<span class="status-chip ${statusClass}">${params.value || 'Unknown'}</span>`;
      }
    },
    { field: 'zone_no', headerName: 'Zone', sortable: true, filter: true },
    { field: 'pon_no', headerName: 'PON', sortable: true, filter: true },
    {
      field: 'location',
      headerName: 'Location',
      sortable: true,
      valueGetter: (params: any) => {
        if (params.data.latitude && params.data.longitude) {
          return `${params.data.latitude.toFixed(6)}, ${params.data.longitude.toFixed(6)}`;
        }
        return '-';
      }
    },
    { field: 'designer', headerName: 'Designer', sortable: true, filter: true }
  ];
  
  dropColumnDefs: ColDef[] = [
    {
      field: 'drop_number',
      headerName: 'Drop Number',
      sortable: true,
      filter: true,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
    },
    { field: 'pole_number', headerName: 'Pole', sortable: true, filter: true },
    { field: 'address', headerName: 'Address', sortable: true, filter: true },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        const statusClass = this.getStatusClass(params.value);
        return `<span class="status-chip ${statusClass}">${params.value || 'Unknown'}</span>`;
      }
    },
    {
      field: 'distance_to_pole',
      headerName: 'Distance',
      sortable: true,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params: any) => {
        return `${params.value || 0}m`;
      }
    },
    { field: 'installer', headerName: 'Installer', sortable: true, filter: true }
  ];
  
  fibreColumnDefs: ColDef[] = [
    {
      field: 'segment_id',
      headerName: 'Segment ID',
      sortable: true,
      filter: true,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
    },
    {
      field: 'distance',
      headerName: 'Distance',
      sortable: true,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params: any) => {
        return `${this.roundDistance(params.value)}m`;
      }
    },
    { field: 'fibre_type', headerName: 'Type', sortable: true, filter: true },
    { field: 'contractor', headerName: 'Contractor', sortable: true, filter: true },
    {
      field: 'completed',
      headerName: 'Completed',
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        const isCompleted = params.value === 'Y';
        const icon = isCompleted ? '✓' : '○';
        const color = isCompleted ? '#4caf50' : '#999';
        return `<span style="color: ${color}; font-weight: bold; font-size: 16px;">${icon}</span>`;
      }
    }
  ];
  
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
  };
  
  ngOnInit() {
    this.loadSOWData();
  }
  
  private loadSOWData() {
    if (!this.projectId) {
      console.warn('No project ID provided for SOW data loading');
      this.loading.set(false);
      return;
    }

    // Check if Neon service is configured
    try {
      // Load poles with better error handling
      this.poles$ = this.neonService.query<SOWPole>(
        'SELECT * FROM sow_poles WHERE project_id = $1 ORDER BY pole_number',
        [this.projectId]
      ).pipe(
        catchError(error => {
          console.error('Error loading poles from sow_poles table:', error);
          console.info('This is expected if SOW data has not been imported yet');
          return of([]);
        }),
        tap(poles => {
          this.polesData = poles;
          console.log('Loaded poles:', poles.length);
        })
      );
      
      // Load drops with better error handling
      this.drops$ = this.neonService.query<SOWDrop>(
        'SELECT * FROM sow_drops WHERE project_id = $1 ORDER BY drop_number',
        [this.projectId]
      ).pipe(
        catchError(error => {
          console.error('Error loading drops from sow_drops table:', error);
          console.info('This is expected if SOW data has not been imported yet');
          return of([]);
        }),
        tap(drops => {
          this.dropsData = drops;
          console.log('Loaded drops:', drops.length);
        })
      );
      
      // Load fibre with better error handling
      this.fibre$ = this.neonService.query<SOWFibre>(
        'SELECT * FROM sow_fibre WHERE project_id = $1 ORDER BY segment_id',
        [this.projectId]
      ).pipe(
        catchError(error => {
          console.error('Error loading fibre from sow_fibre table:', error);
          console.info('This is expected if SOW data has not been imported yet');
          return of([]);
        }),
        tap(fibre => {
          this.fibreData = fibre;
          console.log('Loaded fibre segments:', fibre.length);
        })
      );
    } catch (error) {
      console.error('Neon service not configured:', error);
      // Fallback to empty data
      this.poles$ = of([]);
      this.drops$ = of([]);
      this.fibre$ = of([]);
    }
    
    // Create summary
    this.sowSummary$ = combineLatest([this.poles$, this.drops$, this.fibre$]).pipe(
      map(([poles, drops, fibre]) => ({
        totalPoles: poles.length,
        totalDrops: drops.length,
        totalFibre: fibre.length,
        totalDistance: Math.round(fibre.reduce((sum, f) => sum + (parseFloat(String(f.distance)) || 0), 0))
      })),
      tap(() => this.loading.set(false))
    );
    
    // Check if has data
    this.hasData$ = this.sowSummary$.pipe(
      map(summary => summary.totalPoles > 0 || summary.totalDrops > 0 || summary.totalFibre > 0)
    );
  }
  
  getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved')) return 'status-approved';
    if (statusLower.includes('installed')) return 'status-completed';
    if (statusLower.includes('progress')) return 'status-progress';
    if (statusLower.includes('pending')) return 'status-pending';
    return 'status-default';
  }
  
  roundDistance(distance: any): number {
    return Math.round(parseFloat(distance) || 0);
  }
  
  // Grid ready events
  onPolesGridReady(params: GridReadyEvent) {
    this.polesGridApi = params.api;
  }
  
  onDropsGridReady(params: GridReadyEvent) {
    this.dropsGridApi = params.api;
  }
  
  onFibreGridReady(params: GridReadyEvent) {
    this.fibreGridApi = params.api;
  }
  
  // Filter methods
  onSearchChanged() {
    if (this.polesGridApi) {
      this.polesGridApi.setGridOption('quickFilterText', this.searchText);
    }
    if (this.dropsGridApi) {
      this.dropsGridApi.setGridOption('quickFilterText', this.searchText);
    }
    if (this.fibreGridApi) {
      this.fibreGridApi.setGridOption('quickFilterText', this.searchText);
    }
  }
  
  onFilterChanged() {
    // Apply filters based on current tab
    if (this.dropsGridApi && this.statusFilter) {
      this.dropsGridApi.setFilterModel({
        status: {
          type: 'contains',
          filter: this.statusFilter
        }
      });
    }
    
    if (this.fibreGridApi && this.contractorFilter) {
      this.fibreGridApi.setFilterModel({
        contractor: {
          type: 'contains',
          filter: this.contractorFilter
        }
      });
    }
  }
  
  // Export methods
  exportData(type: 'poles' | 'drops' | 'fibre') {
    let gridApi: GridApi | undefined;
    let filename: string;
    
    switch (type) {
      case 'poles':
        gridApi = this.polesGridApi;
        filename = `${this.projectId}_poles_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'drops':
        gridApi = this.dropsGridApi;
        filename = `${this.projectId}_drops_${new Date().toISOString().split('T')[0]}.csv`;
        break;
      case 'fibre':
        gridApi = this.fibreGridApi;
        filename = `${this.projectId}_fibre_${new Date().toISOString().split('T')[0]}.csv`;
        break;
    }
    
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: filename,
        allColumns: true,
        skipColumnHeaders: false
      });
    }
  }
}