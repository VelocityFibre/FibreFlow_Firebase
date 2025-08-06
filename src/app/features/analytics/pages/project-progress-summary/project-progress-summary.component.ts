import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';

// AG Grid imports
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridReadyEvent,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
  GridOptions,
  RowClassParams,
  CellClassParams,
  ValueFormatterParams,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

// Register AG-Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

import { SupabaseService } from '../../../../core/services/supabase.service';

interface BuildMilestone {
  name: string;
  scope: number;
  completed: number;
  percentage: number;
  duration_days?: number;
  duration_months?: number;
  notes?: string;
}

interface ZoneProgress {
  zone: number | string;
  home_count: number;
  permission_scope: number;
  pole_scope: number;
  stringing_scope: number;
  permissions_completed: number;
  poles_planted: number;
  stringing_completed: number;
  signups_completed: number;
  drops_completed: number;
  connected_completed: number;
  permissions_percentage: number;
  poles_planted_percentage: number;
  stringing_percentage: number;
  signups_percentage: number;
  drops_percentage: number;
  connected_percentage: number;
}

interface DailyProgress {
  progress_date: string;
  day_name: string;
  permissions: number;
  poles_planted: number;
  stringing_d: number;
  stringing_f: number;
  sign_ups: number;
  home_drops: number;
  homes_connected: number;
}

interface KeyMilestone {
  milestone_name: string;
  status: string;
  eta: string;
  actual_date: string;
}

interface Prerequisite {
  prerequisite_name: string;
  responsible: string;
  status: string;
}

interface ProjectProgressData {
  build_milestones: BuildMilestone[];
  zone_progress: ZoneProgress[];
  daily_progress: DailyProgress[];
  key_milestones: KeyMilestone[];
  prerequisites: Prerequisite[];
}

@Component({
  selector: 'app-project-progress-summary',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    AgGridAngular
  ],
  templateUrl: './project-progress-summary.component.html',
  styleUrl: './project-progress-summary.component.scss'
})
export class ProjectProgressSummaryComponent implements OnInit {
  private supabase = inject(SupabaseService);
  
  // Signals for reactive data
  loading = signal(true);
  error = signal<string | null>(null);
  projectName = signal('Lawley');
  lastUpdated = signal(new Date());
  
  // Data signals
  buildMilestones = signal<BuildMilestone[]>([]);
  zoneProgress = signal<ZoneProgress[]>([]);
  dailyProgress = signal<DailyProgress[]>([]);
  keyMilestones = signal<KeyMilestone[]>([]);
  prerequisites = signal<Prerequisite[]>([]);

  // AG Grid references
  @ViewChild('zoneGrid') zoneGrid!: AgGridAngular;
  @ViewChild('dailyGrid') dailyGrid!: AgGridAngular;
  @ViewChild('milestonesGrid') milestonesGrid!: AgGridAngular;
  @ViewChild('prerequisitesGrid') prerequisitesGrid!: AgGridAngular;

  // Grid APIs
  zoneGridApi?: GridApi;
  dailyGridApi?: GridApi;
  milestonesGridApi?: GridApi;
  prerequisitesGridApi?: GridApi;

  // Zone Progress Grid Configuration
  zoneColumnDefs: ColDef[] = [
    { 
      field: 'zone', 
      headerName: 'Zone',
      width: 80,
      pinned: 'left',
      cellClass: 'zone-cell',
      cellRenderer: (params: any) => {
        if (params.value === 'Total') {
          return '<strong>TOTAL</strong>';
        }
        return params.value;
      }
    },
    { field: 'home_count', headerName: 'Home Count', width: 110, type: 'numericColumn' },
    { field: 'permission_scope', headerName: 'Permission Scope', width: 140, type: 'numericColumn' },
    { field: 'pole_scope', headerName: 'Pole Scope', width: 120, type: 'numericColumn' },
    { field: 'stringing_scope', headerName: 'Stringing Scope', width: 140, type: 'numericColumn' },
    { field: 'permissions_completed', headerName: 'Permissions ✓', width: 130, type: 'numericColumn' },
    { field: 'poles_planted', headerName: 'Poles Planted', width: 120, type: 'numericColumn' },
    { field: 'stringing_completed', headerName: 'Stringing ✓', width: 120, type: 'numericColumn' },
    { field: 'signups_completed', headerName: 'Signups ✓', width: 110, type: 'numericColumn' },
    { field: 'drops_completed', headerName: 'Drops ✓', width: 100, type: 'numericColumn' },
    { field: 'connected_completed', headerName: 'Connected ✓', width: 120, type: 'numericColumn' },
    { 
      field: 'permissions_percentage', 
      headerName: 'Permissions %',
      width: 130,
      type: 'numericColumn',
      valueFormatter: (params: ValueFormatterParams) => `${params.value}%`,
      cellClass: (params: CellClassParams) => this.getPercentageCellClass(params.value)
    },
    { 
      field: 'poles_planted_percentage', 
      headerName: 'Poles %',
      width: 100,
      type: 'numericColumn',
      valueFormatter: (params: ValueFormatterParams) => `${params.value}%`,
      cellClass: (params: CellClassParams) => this.getPercentageCellClass(params.value)
    },
    { 
      field: 'stringing_percentage', 
      headerName: 'Stringing %',
      width: 120,
      type: 'numericColumn',
      valueFormatter: (params: ValueFormatterParams) => `${params.value}%`,
      cellClass: (params: CellClassParams) => this.getPercentageCellClass(params.value)
    },
    { 
      field: 'signups_percentage', 
      headerName: 'Signups %',
      width: 110,
      type: 'numericColumn',
      valueFormatter: (params: ValueFormatterParams) => `${params.value}%`,
      cellClass: (params: CellClassParams) => this.getPercentageCellClass(params.value)
    },
    { 
      field: 'drops_percentage', 
      headerName: 'Drops %',
      width: 100,
      type: 'numericColumn',
      valueFormatter: (params: ValueFormatterParams) => `${params.value}%`,
      cellClass: (params: CellClassParams) => this.getPercentageCellClass(params.value)
    },
    { 
      field: 'connected_percentage', 
      headerName: 'Connected %',
      width: 120,
      type: 'numericColumn',
      valueFormatter: (params: ValueFormatterParams) => `${params.value}%`,
      cellClass: (params: CellClassParams) => this.getPercentageCellClass(params.value)
    }
  ];

  // Daily Progress Grid Configuration
  dailyColumnDefs: ColDef[] = [
    { field: 'progress_date', headerName: 'Date', width: 120, pinned: 'left' },
    { field: 'day_name', headerName: 'Day', width: 80 },
    { field: 'permissions', headerName: 'Permissions', width: 120, type: 'numericColumn' },
    { field: 'poles_planted', headerName: 'Poles Planted', width: 130, type: 'numericColumn' },
    { field: 'stringing_d', headerName: 'Stringing D', width: 120, type: 'numericColumn' },
    { field: 'stringing_f', headerName: 'Stringing F', width: 120, type: 'numericColumn' },
    { field: 'sign_ups', headerName: 'Sign Ups', width: 100, type: 'numericColumn' },
    { field: 'home_drops', headerName: 'Home Drops', width: 120, type: 'numericColumn' },
    { field: 'homes_connected', headerName: 'Connected', width: 110, type: 'numericColumn' }
  ];

  // Key Milestones Grid Configuration
  milestonesColumnDefs: ColDef[] = [
    { field: 'milestone_name', headerName: 'Milestone', flex: 1, minWidth: 200 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 140,
      cellRenderer: (params: any) => {
        const status = params.value.toLowerCase();
        const chipClass = status.includes('complete') ? 'status-complete' : 
                         status.includes('progress') ? 'status-progress' : 'status-pending';
        return `<span class="status-chip ${chipClass}">${params.value}</span>`;
      }
    },
    { field: 'eta', headerName: 'ETA', width: 120 },
    { field: 'actual_date', headerName: 'Actual Date', width: 140 }
  ];

  // Prerequisites Grid Configuration
  prerequisitesColumnDefs: ColDef[] = [
    { field: 'prerequisite_name', headerName: 'Prerequisite', flex: 1, minWidth: 200 },
    { field: 'responsible', headerName: 'Responsible', width: 150 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 140,
      cellRenderer: (params: any) => {
        const status = params.value.toLowerCase();
        const chipClass = status === 'complete' ? 'status-complete' : 'status-progress';
        return `<span class="status-chip ${chipClass}">${params.value}</span>`;
      }
    }
  ];

  // Default grid options
  defaultGridOptions: GridOptions = {
    animateRows: true,
    enableCellTextSelection: true,
    suppressRowClickSelection: true,
    rowHeight: 40,
    headerHeight: 50,
    suppressMenuHide: true,
    getRowClass: (params: RowClassParams) => {
      if (params.data?.zone === 'Total') {
        return 'total-row';
      }
      return '';
    }
  };

  // Zone progress with total row computed signal
  zoneProgressWithTotal = computed(() => {
    const zones = this.zoneProgress();
    if (zones.length === 0) return [];
    
    const totalRow = this.calculateTotalRow(zones);
    return [...zones, totalRow];
  });

  // Summary statistics computed signals
  totalZones = computed(() => this.zoneProgress().length);
  totalHomes = computed(() => this.zoneProgress().reduce((sum, z) => sum + z.home_count, 0));
  totalPermissions = computed(() => this.zoneProgress().reduce((sum, z) => sum + z.permissions_completed, 0));
  totalSignups = computed(() => this.zoneProgress().reduce((sum, z) => sum + z.signups_completed, 0));

  ngOnInit() {
    this.loadProgressData();
  }

  async loadProgressData() {
    try {
      this.loading.set(true);
      this.error.set(null);
      
      // Load all data from Supabase
      const response = await this.supabase.getProjectProgress(this.projectName()).toPromise();
      const data = response as ProjectProgressData;
      
      if (data) {
        this.buildMilestones.set(data.build_milestones || []);
        this.zoneProgress.set(data.zone_progress || []);
        this.dailyProgress.set(data.daily_progress || []);
        this.keyMilestones.set(data.key_milestones || []);
        this.prerequisites.set(data.prerequisites || []);
        this.lastUpdated.set(new Date());
      }
    } catch (err) {
      console.error('Error loading progress data:', err);
      this.error.set('Failed to load progress data. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  refreshData() {
    this.loadProgressData();
  }

  // AG Grid Event Handlers
  onZoneGridReady(params: GridReadyEvent) {
    this.zoneGridApi = params.api;
    params.api.sizeColumnsToFit();
  }

  onDailyGridReady(params: GridReadyEvent) {
    this.dailyGridApi = params.api;
    params.api.sizeColumnsToFit();
  }

  onMilestonesGridReady(params: GridReadyEvent) {
    this.milestonesGridApi = params.api;
    params.api.sizeColumnsToFit();
  }

  onPrerequisitesGridReady(params: GridReadyEvent) {
    this.prerequisitesGridApi = params.api;
    params.api.sizeColumnsToFit();
  }

  // Export functions
  exportZoneData() {
    if (this.zoneGridApi) {
      this.zoneGridApi.exportDataAsCsv({
        fileName: `zone-progress-${this.projectName()}-${new Date().toISOString().split('T')[0]}.csv`
      });
    }
  }

  exportDailyData() {
    if (this.dailyGridApi) {
      this.dailyGridApi.exportDataAsCsv({
        fileName: `daily-progress-${this.projectName()}-${new Date().toISOString().split('T')[0]}.csv`
      });
    }
  }

  // Utility functions
  getProgressColor(percentage: number): string {
    if (percentage >= 80) return 'primary';
    if (percentage >= 50) return 'accent';
    if (percentage >= 20) return 'warn';
    return 'warn';
  }

  getPercentageCellClass(percentage: number): string {
    if (percentage >= 80) return 'percentage-cell good';
    if (percentage >= 50) return 'percentage-cell warning';
    return 'percentage-cell danger';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-ZA');
  }

  calculateTotalRow(data: ZoneProgress[]): ZoneProgress {
    const total: ZoneProgress = {
      zone: 'Total',
      home_count: 0,
      permission_scope: 0,
      pole_scope: 0,
      stringing_scope: 0,
      permissions_completed: 0,
      poles_planted: 0,
      stringing_completed: 0,
      signups_completed: 0,
      drops_completed: 0,
      connected_completed: 0,
      permissions_percentage: 0,
      poles_planted_percentage: 0,
      stringing_percentage: 0,
      signups_percentage: 0,
      drops_percentage: 0,
      connected_percentage: 0
    };

    data.forEach(zone => {
      total.home_count += zone.home_count;
      total.permission_scope += zone.permission_scope;
      total.pole_scope += zone.pole_scope;
      total.stringing_scope += zone.stringing_scope;
      total.permissions_completed += zone.permissions_completed;
      total.poles_planted += zone.poles_planted;
      total.stringing_completed += zone.stringing_completed;
      total.signups_completed += zone.signups_completed;
      total.drops_completed += zone.drops_completed;
      total.connected_completed += zone.connected_completed;
    });

    // Calculate percentages for totals
    total.permissions_percentage = total.permission_scope > 0 ? 
      Math.round((total.permissions_completed / total.permission_scope) * 100 * 10) / 10 : 0;
    total.poles_planted_percentage = total.pole_scope > 0 ? 
      Math.round((total.poles_planted / total.pole_scope) * 100 * 10) / 10 : 0;
    total.stringing_percentage = total.stringing_scope > 0 ? 
      Math.round((total.stringing_completed / total.stringing_scope) * 100 * 10) / 10 : 0;
    total.signups_percentage = total.home_count > 0 ? 
      Math.round((total.signups_completed / total.home_count) * 100 * 10) / 10 : 0;
    total.drops_percentage = total.home_count > 0 ? 
      Math.round((total.drops_completed / total.home_count) * 100 * 10) / 10 : 0;
    total.connected_percentage = total.home_count > 0 ? 
      Math.round((total.connected_completed / total.home_count) * 100 * 10) / 10 : 0;

    return total;
  }
}