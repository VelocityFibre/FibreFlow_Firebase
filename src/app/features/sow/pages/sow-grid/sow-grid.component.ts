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
import { ProjectService } from '@app/core/services/project.service';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError, tap, take } from 'rxjs/operators';
import { Project } from '@app/core/models/project.model';

// Unified SOW data interface
interface SOWData {
  type: 'pole' | 'drop' | 'fibre';
  id: string;
  pole_number?: string;
  drop_number?: string;
  segment_id?: string;
  status: string;
  location?: string;
  address?: string;
  ont_reference?: string;
  distance?: string;
  zone?: string;
  pon?: string;
  designer?: string;
  contractor?: string;
  from_point?: string;
  to_point?: string;
  fibre_type?: string;
}

@Component({
  selector: 'app-sow-grid',
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
    AgGridAngular
  ],
  templateUrl: './sow-grid.component.html',
  styleUrls: ['./sow-grid.component.scss']
})
export class SOWGridComponent implements OnInit {
  private neonService = inject(NeonService);
  private projectService = inject(ProjectService);
  
  // Grid API
  private gridApi!: GridApi;
  
  // State
  loading = signal(true);
  rowData = signal<SOWData[]>([]);
  
  // Summary data
  summary = signal({
    totalPoles: 0,
    totalDrops: 0,
    totalFibre: 0,
    totalDistance: 0
  });
  
  // Filters
  searchText = '';
  typeFilter = 'all';
  projectFilter = ''; // Will be set on init
  
  // Projects list
  projects = signal<Project[]>([]);
  
  // Column definitions
  columnDefs: ColDef[] = [
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      cellRenderer: (params: any) => {
        const icons: Record<string, string> = {
          pole: 'timeline',
          drop: 'home',
          fibre: 'cable'
        };
        const colors: Record<string, string> = {
          pole: '#2196f3',
          drop: '#4caf50',
          fibre: '#ff9800'
        };
        const icon = icons[params.value as string] || 'help';
        const color = colors[params.value as string] || '#999';
        return `<mat-icon style="color: ${color}; font-size: 20px;">${icon}</mat-icon> ${params.value.toUpperCase()}`;
      }
    },
    {
      field: 'identifier',
      headerName: 'Reference Number',
      width: 150,
      valueGetter: (params: any) => {
        if (params.data.type === 'pole') return params.data.pole_number;
        if (params.data.type === 'drop') return params.data.drop_number;
        if (params.data.type === 'fibre') return params.data.segment_id;
        return '-';
      }
    },
    {
      field: 'ont_reference',
      headerName: 'ONT Reference',
      width: 200,
      valueGetter: (params: any) => {
        // For drops, show the ONT reference from address if it contains "ONT"
        if (params.data.type === 'drop' && params.data.address?.includes('ONT')) {
          return params.data.address;
        }
        return '-';
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 200,
      cellRenderer: (params: any) => {
        const status = params.value || 'Unknown';
        const statusClass = this.getStatusClass(status);
        return `<span class="status-chip ${statusClass}">${status}</span>`;
      }
    },
    {
      field: 'location',
      headerName: 'Location/Address',
      width: 250,
      valueGetter: (params: any) => {
        if (params.data.type === 'pole') return params.data.location || '-';
        if (params.data.type === 'drop') return params.data.address || '-';
        if (params.data.type === 'fibre') {
          return `${params.data.from_point || ''} → ${params.data.to_point || ''}`;
        }
        return '-';
      }
    },
    {
      field: 'pole_number',
      headerName: 'Associated Pole',
      width: 150,
      valueGetter: (params: any) => {
        if (params.data.type === 'drop') return params.data.pole_number || '-';
        return '-';
      }
    },
    {
      field: 'distance',
      headerName: 'Distance',
      width: 120,
      valueGetter: (params: any) => {
        if (params.data.distance) {
          const dist = parseFloat(params.data.distance);
          return `${dist}m`;
        }
        return '-';
      }
    },
    {
      field: 'zone',
      headerName: 'Zone',
      width: 80,
      valueGetter: (params: any) => params.data.zone || '-'
    },
    {
      field: 'pon',
      headerName: 'PON',
      width: 80,
      valueGetter: (params: any) => params.data.pon || '-'
    },
    {
      field: 'designer',
      headerName: 'Designer/Contractor',
      width: 150,
      valueGetter: (params: any) => {
        return params.data.designer || params.data.contractor || '-';
      }
    },
    {
      field: 'fibre_type',
      headerName: 'Fibre Type',
      width: 120,
      valueGetter: (params: any) => {
        if (params.data.type === 'fibre') return params.data.fibre_type || '-';
        return '-';
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
    // Load projects first
    this.projectService.getAll().pipe(take(1)).subscribe(projects => {
      this.projects.set(projects);
      
      // Set default project to first one or Lawley if exists
      const lawleyProject = projects.find(p => p.name?.toLowerCase().includes('lawley'));
      if (lawleyProject) {
        this.projectFilter = lawleyProject.id || '';
      } else if (projects.length > 0) {
        this.projectFilter = projects[0].id || '';
      }
      
      // Load SOW data after project is set
      if (this.projectFilter) {
        this.loadAllSOWData();
      }
    });
  }
  
  private loadAllSOWData() {
    this.loading.set(true);
    
    // Load all three data types in parallel
    const poles$ = this.neonService.query<any>(
      'SELECT * FROM sow_poles WHERE project_id = $1',
      [this.projectFilter]
    ).pipe(
      catchError(error => {
        console.error('Error loading poles:', error);
        return of([]);
      })
    );
    
    const drops$ = this.neonService.query<any>(
      'SELECT * FROM sow_drops WHERE project_id = $1',
      [this.projectFilter]
    ).pipe(
      catchError(error => {
        console.error('Error loading drops:', error);
        return of([]);
      })
    );
    
    const fibre$ = this.neonService.query<any>(
      'SELECT * FROM sow_fibre WHERE project_id = $1',
      [this.projectFilter]
    ).pipe(
      catchError(error => {
        console.error('Error loading fibre:', error);
        return of([]);
      })
    );
    
    // Combine all data
    combineLatest([poles$, drops$, fibre$]).subscribe(([poles, drops, fibre]) => {
      // Transform poles
      const poleData: SOWData[] = poles.map(pole => ({
        type: 'pole' as const,
        id: `pole-${pole.id}`,
        pole_number: pole.pole_number,
        status: pole.status,
        location: pole.latitude && pole.longitude ? `${pole.latitude}, ${pole.longitude}` : '',
        zone: pole.zone_no,
        pon: pole.pon_no,
        designer: pole.designer
      }));
      
      // Transform drops - only include ones with ONT reference
      const dropData: SOWData[] = drops
        .filter(drop => drop.address?.includes('ONT')) // Only drops with ONT reference
        .map(drop => ({
          type: 'drop' as const,
          id: `drop-${drop.id}`,
          drop_number: drop.drop_number,
          pole_number: drop.pole_number,
          status: drop.status,
          address: drop.address,
          ont_reference: drop.address, // Since it contains ONT
          distance: drop.distance_to_pole,
          designer: drop.designer
        }));
      
      // Transform fibre
      const fibreData: SOWData[] = fibre.map(f => ({
        type: 'fibre' as const,
        id: `fibre-${f.id}`,
        segment_id: f.segment_id,
        status: f.completed === 'Y' ? 'Completed' : 'Pending',
        from_point: f.from_point,
        to_point: f.to_point,
        distance: f.distance,
        fibre_type: f.fibre_type,
        contractor: f.contractor,
        zone: f.zone_no,
        pon: f.pon_no
      }));
      
      // Combine all data
      const allData = [...poleData, ...dropData, ...fibreData];
      this.rowData.set(allData);
      
      // Update summary
      const totalDistance = fibre.reduce((sum, f) => sum + (parseFloat(f.distance) || 0), 0);
      this.summary.set({
        totalPoles: poles.length,
        totalDrops: drops.filter(d => d.address?.includes('ONT')).length, // Count only ONT drops
        totalFibre: fibre.length,
        totalDistance: Math.round(totalDistance)
      });
      
      this.loading.set(false);
      
      // Refresh grid
      if (this.gridApi) {
        this.gridApi.setGridOption('rowData', allData);
      }
    });
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
  
  onTypeFilterChanged() {
    if (this.gridApi) {
      if (this.typeFilter === 'all') {
        this.gridApi.setFilterModel(null);
      } else {
        this.gridApi.setFilterModel({
          type: {
            type: 'equals',
            filter: this.typeFilter
          }
        });
      }
    }
  }
  
  onProjectFilterChanged() {
    if (this.projectFilter) {
      this.loadAllSOWData();
    }
  }
  
  exportData() {
    if (this.gridApi) {
      this.gridApi.exportDataAsCsv({
        fileName: `SOW_Data_${new Date().toISOString().split('T')[0]}.csv`,
        allColumns: true
      });
    }
  }
  
  private getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('approved') || statusLower.includes('completed')) return 'status-approved';
    if (statusLower.includes('installed')) return 'status-completed';
    if (statusLower.includes('progress')) return 'status-progress';
    if (statusLower.includes('pending') || statusLower.includes('not granted')) return 'status-pending';
    return 'status-default';
  }
}