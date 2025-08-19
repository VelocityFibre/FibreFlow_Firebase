import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Material Design
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

// AG Grid
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

// Services
import { OneMapNeonService, OneMapStatusChange } from '@app/core/services/onemap-neon.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { combineLatest, startWith, debounceTime, distinctUntilChanged } from 'rxjs';
import { FormControl } from '@angular/forms';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface OneMapGridData extends OneMapStatusChange {
  displayType: 'pole' | 'drop' | 'property';
}

interface SummaryStats {
  label: string;
  value: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-onemap-data-grid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    AgGridAngular,
    PageHeaderComponent,
  ],
  template: `
    <div class="onemap-grid-container">
      <!-- Page Header -->
      <app-page-header
        [title]="'OneMap Data Grid'"
        [subtitle]="'Current status view with comprehensive filtering'"
        [actions]="headerActions">
      </app-page-header>

      <!-- Summary Cards -->
      <div class="summary-cards" *ngIf="!loading()">
        <mat-card class="summary-card" *ngFor="let stat of summaryStats()">
          <mat-card-content>
            <div class="summary-icon" [style.color]="stat.color">
              <mat-icon>{{stat.icon}}</mat-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{stat.value | number}}</div>
              <div class="summary-label">{{stat.label}}</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Search</mat-label>
          <input matInput [formControl]="searchControl" placeholder="Search pole number, property ID, or address...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Zone/Project</mat-label>
          <mat-select [(ngModel)]="zoneFilter" (ngModelChange)="onFilterChanged()">
            <mat-option value="">All Zones</mat-option>
            <mat-option *ngFor="let zone of availableZones()" [value]="zone">
              {{zone}}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChanged()">
            <mat-option value="">All Statuses</mat-option>
            <mat-option *ngFor="let status of availableStatuses()" [value]="status">
              {{status}}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Contractor</mat-label>
          <mat-select [(ngModel)]="contractorFilter" (ngModelChange)="onFilterChanged()">
            <mat-option value="">All Contractors</mat-option>
            <mat-option *ngFor="let contractor of availableContractors()" [value]="contractor">
              {{contractor}}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-raised-button color="primary" (click)="exportData()">
          <mat-icon>download</mat-icon>
          Export CSV
        </button>

        <button mat-stroked-button (click)="clearFilters()">
          <mat-icon>clear</mat-icon>
          Clear Filters
        </button>
      </div>

      <!-- Loading Spinner -->
      <div class="loading-container" *ngIf="loading()">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading OneMap data...</p>
      </div>

      <!-- AG Grid -->
      <ag-grid-angular
        *ngIf="!loading()"
        class="ag-theme-material onemap-main-grid"
        [rowData]="filteredRowData()"
        [columnDefs]="columnDefs"
        [defaultColDef]="defaultColDef"
        (gridReady)="onGridReady($event)"
        [pagination]="true"
        [paginationPageSize]="100"
        [suppressCellFocus]="true">
      </ag-grid-angular>
    </div>
  `,
  styleUrls: ['./onemap-data-grid.component.scss']
})
export class OneMapDataGridComponent implements OnInit {
  private oneMapNeonService = inject(OneMapNeonService);
  
  // Grid API
  private gridApi!: GridApi;
  
  // Reactive state with signals
  loading = signal(true);
  rowData = signal<OneMapGridData[]>([]);
  filteredRowData = signal<OneMapGridData[]>([]);
  summaryStats = signal<SummaryStats[]>([]);
  availableZones = signal<string[]>([]);
  availableStatuses = signal<string[]>([]);
  availableContractors = signal<string[]>([]);

  // Filter controls
  searchControl = new FormControl('');
  zoneFilter = '';
  statusFilter = '';
  contractorFilter = '';

  // Header actions
  headerActions = [
    {
      label: 'Refresh',
      icon: 'refresh',
      color: 'primary' as const,
      action: () => this.loadData(),
    },
    {
      label: 'Import History',
      icon: 'history',
      color: 'accent' as const,
      action: () => this.viewImportHistory(),
    },
  ];

  // AG Grid Column Definitions
  columnDefs: ColDef[] = [
    {
      field: 'displayType',
      headerName: 'Type',
      width: 100,
      cellRenderer: (params: any) => {
        const icons: Record<string, string> = { pole: 'cell_tower', drop: 'home', property: 'location_on' };
        const colors: Record<string, string> = { pole: '#2196f3', drop: '#4caf50', property: '#ff9800' };
        const type = params.value as string || 'property';
        const icon = icons[type as keyof typeof icons] || 'help';
        const color = colors[type as keyof typeof colors] || '#999';
        return `<mat-icon style="color: ${color}; font-size: 18px; vertical-align: middle;">${icon}</mat-icon>`;
      }
    },
    {
      field: 'property_id',
      headerName: 'Property ID',
      width: 120,
      pinned: 'left'
    },
    {
      field: 'pole_number',
      headerName: 'Pole Number',
      width: 130,
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'drop_number', 
      headerName: 'Drop Number',
      width: 130,
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'status',
      headerName: 'Current Status',
      width: 300,
      cellRenderer: (params: any) => {
        const status = params.value || 'Unknown';
        const statusClass = this.getStatusClass(status);
        return `<span class="status-chip ${statusClass}">${status}</span>`;
      }
    },
    {
      field: 'status_date',
      headerName: 'Status Date',
      width: 120,
      cellRenderer: (params: any) => {
        if (!params.value) return '-';
        const date = new Date(params.value);
        return date.toLocaleDateString();
      }
    },
    {
      field: 'zone',
      headerName: 'Zone',
      width: 100,
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'feeder',
      headerName: 'Feeder',
      width: 100,
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'distribution',
      headerName: 'Distribution',
      width: 120,
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'contractor',
      headerName: 'Contractor',
      width: 150,
      cellRenderer: (params: any) => params.value || '-'
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: false, // Disabled for performance with large datasets
  };

  ngOnInit() {
    this.setupSearch();
    this.loadData();
  }

  private setupSearch() {
    // Setup search with debouncing
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  private async loadData() {
    this.loading.set(true);
    try {
      console.log('OneMap Data Grid: Starting data load...');
      
      // Load all data using optimized methods with error catching
      console.log('OneMap Data Grid: Calling getOneMapGridData...');
      const gridDataPromise = this.oneMapNeonService.getOneMapGridData().toPromise()
        .catch(error => {
          console.error('OneMap Data Grid: getOneMapGridData failed:', error);
          return [];
        });
      
      console.log('OneMap Data Grid: Calling getFilterOptions...');
      const filterOptionsPromise = this.oneMapNeonService.getFilterOptions().toPromise()
        .catch(error => {
          console.error('OneMap Data Grid: getFilterOptions failed:', error);
          return { zones: [], statuses: [], contractors: [] };
        });
      
      console.log('OneMap Data Grid: Calling getOneMapSummaryStats...');
      const summaryStatsPromise = this.oneMapNeonService.getOneMapSummaryStats().toPromise()
        .catch(error => {
          console.error('OneMap Data Grid: getOneMapSummaryStats failed:', error);
          return { totalProperties: 0, totalPoles: 0, totalDrops: 0, totalRecords: 0, statusBreakdown: [] };
        });

      const [gridData, filterOptions, summaryStats] = await Promise.all([
        gridDataPromise,
        filterOptionsPromise,
        summaryStatsPromise
      ]);
      
      console.log('OneMap Data Grid: Data loaded successfully');
      console.log('- Grid data records:', gridData?.length || 0);
      console.log('- Filter options:', filterOptions);
      console.log('- Summary stats:', summaryStats);

      // Transform data for grid
      const transformedData: OneMapGridData[] = (gridData || []).map(record => ({
        ...record,
        displayType: this.determineDisplayType(record)
      }));

      this.rowData.set(transformedData);
      
      // Update filter options
      if (filterOptions) {
        this.availableZones.set(filterOptions.zones);
        this.availableStatuses.set(filterOptions.statuses);
        this.availableContractors.set(filterOptions.contractors);
      }
      
      // Update summary stats
      if (summaryStats) {
        this.summaryStats.set([
          {
            label: 'Total Properties',
            value: summaryStats.totalProperties,
            icon: 'location_on',
            color: '#ff9800'
          },
          {
            label: 'Total Poles',
            value: summaryStats.totalPoles,
            icon: 'cell_tower',
            color: '#2196f3'
          },
          {
            label: 'Total Drops',
            value: summaryStats.totalDrops,
            icon: 'home',
            color: '#4caf50'
          },
          {
            label: 'Total Records',
            value: summaryStats.totalRecords,
            icon: 'storage',
            color: '#9c27b0'
          }
        ]);
      }
      
      this.applyFilters(); // Apply any existing filters
      
    } catch (error) {
      console.error('Failed to load OneMap data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private determineDisplayType(record: any): 'pole' | 'drop' | 'property' {
    if (record.pole_number) return 'pole';
    if (record.drop_number) return 'drop';
    return 'property';
  }


  private applyFilters() {
    let filtered = this.rowData();
    const searchTerm = this.searchControl.value?.toLowerCase() || '';

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.property_id?.toLowerCase().includes(searchTerm) ||
        record.pole_number?.toLowerCase().includes(searchTerm) ||
        record.drop_number?.toLowerCase().includes(searchTerm) ||
        record.status?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply dropdown filters
    if (this.zoneFilter) {
      filtered = filtered.filter(record => record.zone === this.zoneFilter);
    }

    if (this.statusFilter) {
      filtered = filtered.filter(record => record.status === this.statusFilter);
    }

    if (this.contractorFilter) {
      filtered = filtered.filter(record => record.contractor === this.contractorFilter);
    }

    this.filteredRowData.set(filtered);
  }

  onFilterChanged() {
    this.applyFilters();
  }

  clearFilters() {
    this.searchControl.setValue('');
    this.zoneFilter = '';
    this.statusFilter = '';
    this.contractorFilter = '';
    this.applyFilters();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  exportData() {
    if (this.gridApi) {
      this.gridApi.exportDataAsCsv({
        fileName: `onemap-data-${new Date().toISOString().split('T')[0]}.csv`
      });
    }
  }

  viewImportHistory() {
    // Navigate to import history or show dialog
    console.log('View import history - to be implemented');
  }

  private getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('approved') || statusLower.includes('installed')) {
      return 'status-success';
    } else if (statusLower.includes('progress') || statusLower.includes('scheduled')) {
      return 'status-warning';
    } else if (statusLower.includes('declined') || statusLower.includes('failed')) {
      return 'status-error';
    } else {
      return 'status-neutral';
    }
  }
}