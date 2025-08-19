import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

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

import { NokiaService } from '../../services/nokia.service';
import { ProjectService } from '@app/core/services/project.service';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError, tap, take } from 'rxjs/operators';
import { Project } from '@app/core/models/project.model';
import { NokiaData, NokiaSummary, getSignalQuality, getSignalQualityColor } from '../../models/nokia.model';

@Component({
  selector: 'app-nokia-grid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    AgGridAngular
  ],
  templateUrl: './nokia-grid.component.html',
  styleUrls: ['./nokia-grid.component.scss']
})
export class NokiaGridComponent implements OnInit {
  private nokiaService = inject(NokiaService);
  private projectService = inject(ProjectService);
  
  // Grid API
  private gridApi!: GridApi;
  
  // State
  loading = signal(true);
  rowData = signal<NokiaData[]>([]);
  
  // Summary data
  summary = signal<NokiaSummary>({
    totalEquipment: 0,
    activeEquipment: 0,
    inactiveEquipment: 0,
    totalTeams: 0,
    avgSignalStrength: 0,
    lastMeasurement: null
  });
  
  // Filters
  searchText = '';
  statusFilter = 'all';
  teamFilter = 'all';
  signalQualityFilter = 'all';
  projectFilter = '';
  
  // Options
  projects = signal<Project[]>([]);
  teams = signal<string[]>([]);
  statuses = signal<string[]>([]);
  
  // Column definitions
  columnDefs: ColDef[] = [
    {
      field: 'drop_number',
      headerName: 'Drop Number',
      width: 140,
      pinned: 'left',
      cellRenderer: (params: any) => {
        const dropNumber = params.value || 'Unknown';
        return `<span class="drop-number-cell">${dropNumber}</span>`;
      }
    },
    {
      field: 'serial_number',
      headerName: 'Serial Number',
      width: 160,
      cellRenderer: (params: any) => {
        return `<span class="monospace">${params.value || 'N/A'}</span>`;
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      cellRenderer: (params: any) => {
        const status = params.value || 'Unknown';
        const statusClass = status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
        return `<span class="status-chip ${statusClass}">${status}</span>`;
      }
    },
    {
      field: 'ont_rx_signal_dbm',
      headerName: 'ONT Signal (dBm)',
      width: 150,
      cellRenderer: (params: any) => {
        const signal = params.value;
        if (signal === null || signal === undefined) return '-';
        
        const quality = getSignalQuality(signal);
        const color = getSignalQualityColor(quality);
        const formattedSignal = signal.toFixed(2);
        
        return `<span style="color: ${color}; font-weight: bold;">${formattedSignal} dBm</span>
                <br><small style="color: ${color};">${quality.toUpperCase()}</small>`;
      },
      comparator: (valueA: number, valueB: number) => {
        if (valueA === null || valueA === undefined) return 1;
        if (valueB === null || valueB === undefined) return -1;
        return valueA - valueB;
      }
    },
    {
      field: 'current_ont_rx',
      headerName: 'Current RX (dBm)',
      width: 140,
      valueFormatter: (params: any) => {
        return params.value !== null && params.value !== undefined 
          ? `${params.value.toFixed(3)} dBm` 
          : '-';
      }
    },
    {
      field: 'olt_address',
      headerName: 'OLT Address',
      width: 200,
      cellRenderer: (params: any) => {
        const address = params.value;
        if (!address) return '-';
        
        // Split address into parts for better display
        const parts = address.split(':');
        const oltName = parts[0] || '';
        const port = parts[1] || '';
        
        return `<div class="olt-address">
                  <div class="olt-name">${oltName}</div>
                  <div class="olt-port">${port}</div>
                </div>`;
      }
    },
    {
      field: 'team',
      headerName: 'Team',
      width: 80,
      cellRenderer: (params: any) => {
        const team = params.value || 'Unknown';
        return `<span class="team-badge">${team}</span>`;
      }
    },
    {
      field: 'measurement_date',
      headerName: 'Measurement Date',
      width: 140,
      valueFormatter: (params: any) => {
        if (!params.value) return '-';
        const date = new Date(params.value);
        return date.toLocaleDateString('en-ZA');
      }
    },
    {
      field: 'coordinates',
      headerName: 'Location',
      width: 160,
      valueGetter: (params: any) => {
        const lat = params.data.latitude;
        const lng = params.data.longitude;
        if (!lat || !lng) return null;
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      },
      cellRenderer: (params: any) => {
        const lat = params.data.latitude;
        const lng = params.data.longitude;
        if (!lat || !lng) return '-';
        
        const coordsText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        
        return `<a href="${mapsUrl}" target="_blank" class="coordinates-link">
                  <mat-icon style="font-size: 14px; vertical-align: middle;">location_on</mat-icon>
                  ${coordsText}
                </a>`;
      }
    },
    {
      field: 'link_budget_ont_olt_db',
      headerName: 'Link Budget ONT→OLT',
      width: 150,
      valueFormatter: (params: any) => {
        return params.value !== null && params.value !== undefined 
          ? `${params.value.toFixed(2)} dB` 
          : '-';
      }
    },
    {
      field: 'link_budget_olt_ont_db',
      headerName: 'Link Budget OLT→ONT',
      width: 150,
      valueFormatter: (params: any) => {
        return params.value !== null && params.value !== undefined 
          ? `${params.value.toFixed(2)} dB` 
          : '-';
      }
    }
  ];
  
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true,
  };
  
  ngOnInit() {
    // Load initial data
    this.loadProjects();
    this.loadFilterOptions();
    this.loadNokiaData();
  }
  
  private loadProjects() {
    this.projectService.getAll().pipe(take(1)).subscribe(projects => {
      this.projects.set(projects);
      
      // Set default project to first one or Lawley if exists
      const lawleyProject = projects.find(p => p.name?.toLowerCase().includes('lawley'));
      if (lawleyProject) {
        this.projectFilter = lawleyProject.id || '';
      } else if (projects.length > 0) {
        this.projectFilter = projects[0].id || '';
      }
    });
  }
  
  private loadFilterOptions() {
    // Load teams
    this.nokiaService.getTeams(this.projectFilter || undefined).subscribe(teams => {
      this.teams.set(teams);
    });
    
    // Load statuses
    this.nokiaService.getStatuses().subscribe(statuses => {
      this.statuses.set(statuses);
    });
  }
  
  private loadNokiaData() {
    this.loading.set(true);
    
    const filters = this.buildFilters();
    
    // Load data and summary in parallel
    combineLatest([
      this.nokiaService.getNokiaData(filters),
      this.nokiaService.getNokiaSummary(this.projectFilter || undefined)
    ]).subscribe({
      next: ([data, summaryData]) => {
        this.rowData.set(data);
        this.summary.set(summaryData);
        this.loading.set(false);
        
        // Update grid
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', data);
        }
      },
      error: (error) => {
        console.error('Error loading Nokia data:', error);
        this.loading.set(false);
      }
    });
  }
  
  private buildFilters() {
    return {
      projectId: this.projectFilter || undefined,
      status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
      team: this.teamFilter !== 'all' ? this.teamFilter : undefined,
      signalQuality: this.signalQualityFilter !== 'all' ? 
        this.signalQualityFilter as any : undefined
    };
  }
  
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    
    // Auto-size columns
    this.gridApi.sizeColumnsToFit();
    
    // Set initial data
    this.gridApi.setGridOption('rowData', this.rowData());
  }
  
  onSearchChanged() {
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', this.searchText);
    }
  }
  
  onProjectFilterChanged() {
    this.loadFilterOptions();
    this.loadNokiaData();
  }
  
  onStatusFilterChanged() {
    this.loadNokiaData();
  }
  
  onTeamFilterChanged() {
    this.loadNokiaData();
  }
  
  onSignalQualityFilterChanged() {
    this.loadNokiaData();
  }
  
  exportData() {
    if (this.gridApi) {
      this.gridApi.exportDataAsCsv({
        fileName: `Nokia_Data_${new Date().toISOString().split('T')[0]}.csv`,
        allColumns: true
      });
    }
  }
  
  refreshData() {
    this.loadNokiaData();
  }
  
  clearFilters() {
    this.searchText = '';
    this.statusFilter = 'all';
    this.teamFilter = 'all';
    this.signalQualityFilter = 'all';
    
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', '');
      this.gridApi.setFilterModel(null);
    }
    
    this.loadNokiaData();
  }
}