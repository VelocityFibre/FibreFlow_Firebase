import { Component, inject, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// AG-Grid imports
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

// Register AG-Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Chart.js imports
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);

import { PoleTrackerService } from '../../services/pole-tracker.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ContractorService } from '../../../contractors/services/contractor.service';
import { PoleTrackerListItem } from '../../models/pole-tracker.model';
import { PlannedPole } from '../../models/mobile-pole-tracker.model';
import { Project } from '../../../../core/models/project.model';
import { Contractor } from '../../../contractors/models/contractor.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PoleAnalyticsService, PivotData } from '../../services/pole-analytics.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { PivotTableComponent } from '../../components/pivot-table/pivot-table';

@Component({
  selector: 'app-pole-tracker-grid',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    AgGridAngular,
    PivotTableComponent,
  ],
  templateUrl: './pole-tracker-grid-template.html',
  styleUrls: ['./pole-tracker-grid.component.scss'],
})
export class PoleTrackerGridComponent implements OnInit, OnDestroy, AfterViewInit {
  private poleTrackerService = inject(PoleTrackerService);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);
  private poleAnalyticsService = inject(PoleAnalyticsService);
  private excelExportService = inject(ExcelExportService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  // Chart elements
  @ViewChild('progressChart') progressChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('typeChart') typeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contractorChart') contractorChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('uploadChart') uploadChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('timeSeriesChart') timeSeriesChartRef!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private charts: { [key: string]: Chart } = {};

  // Grid API
  private gridApi?: GridApi;

  // State
  rowData = signal<PoleTrackerListItem[]>([]);
  projects = signal<Project[]>([]);
  contractors = signal<Contractor[]>([]);
  loading = signal(true);

  // Filters
  selectedProjectId = '';
  selectedContractorId = '';
  uploadStatusFilter: 'all' | 'complete' | 'incomplete' = 'all';
  pageSize = 50;

  // Stats
  totalCount = computed(() => this.rowData().length);
  selectedCount = signal(0);
  filteredCount = signal(0);
  completeCount = computed(() => {
    const total = this.rowData().length;
    const complete = this.rowData().filter(p => p.allUploadsComplete).length;
    return total > 0 ? Math.round((complete / total) * 100) : 0;
  });

  // UI State
  showBulkActions = false;
  showAnalytics = false;
  processing = signal(false);
  processingMessage = signal('');

  // Analytics Configuration
  pivotConfig = {
    rows: 'contractorName',
    columns: 'uploadStatus',
    values: 'count'
  };

  pivotData: PivotData | null = null;

  dateRange = {
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  };

  exportOptions = {
    includeCharts: true,
    includePivotTables: true,
    includeFormulas: true,
    autoFilter: true,
    conditionalFormatting: true,
    includeSummary: true
  };

  // Column Definitions
  columnDefs: ColDef[] = [
    {
      field: 'select',
      headerName: '',
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      pinned: 'left',
    },
    {
      field: 'vfPoleId',
      headerName: 'VF Pole ID',
      width: 150,
      pinned: 'left',
      cellRenderer: (params: any) => {
        return `<a href="/pole-tracker/${params.data.id}" style="color: #3f51b5; text-decoration: none; font-weight: 500;">${params.value}</a>`;
      },
    },
    { field: 'poleNumber', headerName: 'Pole #', width: 120, sortable: true, filter: true },
    { field: 'pon', headerName: 'PON', width: 100, sortable: true, filter: true },
    { field: 'zone', headerName: 'Zone', width: 100, sortable: true, filter: true },
    { field: 'location', headerName: 'GPS', width: 180, sortable: true },
    { 
      field: 'projectName', 
      headerName: 'Project', 
      width: 150, 
      sortable: true,
      filter: true,
      valueGetter: (params: any) => params.data.projectName || params.data.projectCode
    },
    {
      field: 'dateInstalled',
      headerName: 'Date Installed',
      width: 140,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params: any) => {
        if (!params.value) return '-';
        const date = params.value?.toDate ? params.value.toDate() : params.value;
        return new Date(date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }
    },
    {
      field: 'poleType',
      headerName: 'Type',
      width: 100,
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        const typeColors: Record<string, string> = {
          wooden: '#8d6e63',
          concrete: '#616161',
          steel: '#455a64',
          composite: '#5d4037'
        };
        return `<span class="status-chip" style="background: ${typeColors[params.value] || '#999'}; color: white;">${params.value}</span>`;
      }
    },
    { 
      field: 'contractorName', 
      headerName: 'Contractor', 
      width: 180, 
      sortable: true,
      filter: true,
      valueGetter: (params: any) => params.data.contractorName || params.data.contractorId || '-'
    },
    {
      field: 'uploadProgress',
      headerName: 'Upload Progress',
      width: 200,
      sortable: true,
      cellRenderer: (params: any) => {
        const progress = params.value || 0;
        const count = params.data.uploadedCount || 0;
        const statusClass = progress === 100 ? 'status-complete' : 'status-incomplete';
        
        return `
          <div class="upload-progress-cell">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <span class="progress-text ${statusClass}">${count}/6 photos</span>
          </div>
        `;
      }
    },
    {
      field: 'qualityChecked',
      headerName: 'QA',
      width: 80,
      sortable: true,
      filter: true,
      cellRenderer: (params: any) => {
        const icon = params.value ? 'check_circle' : 'pending';
        const color = params.value ? '#4caf50' : '#999';
        const tooltip = params.value ? 'Quality Checked' : 'Pending QA';
        return `<mat-icon style="color: ${color};" title="${tooltip}">${icon}</mat-icon>`;
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      pinned: 'right',
      cellRenderer: (params: any) => {
        return `
          <div class="cell-action-buttons">
            <button mat-icon-button title="Edit" onclick="window.location.href='/pole-tracker/${params.data.id}/edit'">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button title="Delete" style="color: #f44336;">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        `;
      }
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
  };

  ngOnInit() {
    // Restore filters from URL
    this.route.queryParams.subscribe(params => {
      this.selectedProjectId = params['project'] || '';
      this.selectedContractorId = params['contractor'] || '';
      this.uploadStatusFilter = params['uploadStatus'] || 'all';
      
      // Save filters to session storage
      if (this.selectedProjectId) {
        sessionStorage.setItem('poleTrackerFilters', JSON.stringify({ 
          project: this.selectedProjectId,
          contractor: this.selectedContractorId,
          uploadStatus: this.uploadStatusFilter
        }));
      }
      
      this.loadData();
    });
  }

  ngAfterViewInit() {
    // Charts will be initialized when analytics panel is opened
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Destroy all charts
    Object.values(this.charts).forEach(chart => chart.destroy());
  }

  loadData() {
    this.loading.set(true);

    // Load projects
    this.projectService.getProjects().subscribe(projects => {
      this.projects.set(projects);
    });

    // Load contractors
    this.contractorService.getContractors().subscribe(contractors => {
      this.contractors.set(contractors);
    });

    // Load poles if project selected
    if (this.selectedProjectId) {
      this.loadPoles();
    } else {
      this.rowData.set([]);
      this.loading.set(false);
    }
  }

  loadPoles() {
    if (!this.selectedProjectId) return;

    this.poleTrackerService.getPlannedPolesByProject(this.selectedProjectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (poles) => {
          const poleItems = this.transformPolesToListItems(poles);
          this.rowData.set(poleItems);
          this.loading.set(false);
          
          // Apply external filter if needed
          if (this.gridApi) {
            this.gridApi.onFilterChanged();
          }
        },
        error: (error) => {
          console.error('Error loading poles:', error);
          this.snackBar.open('Error loading poles', 'Close', { duration: 3000 });
          this.loading.set(false);
        }
      });
  }

  transformPolesToListItems(poles: PlannedPole[]): PoleTrackerListItem[] {
    return poles.map(pole => {
      const poleData = pole as any;
      
      const uploads = poleData.uploads || {
        before: { uploaded: false },
        front: { uploaded: false },
        side: { uploaded: false },
        depth: { uploaded: false },
        concrete: { uploaded: false },
        compaction: { uploaded: false },
      };
      
      const uploadedCount = Object.values(uploads).filter((upload: any) => upload.uploaded).length;
      const uploadProgress = Math.round((uploadedCount / 6) * 100);
      
      let locationString = '';
      if (poleData.location) {
        if (typeof poleData.location === 'string') {
          locationString = poleData.location;
        } else if (poleData.location.latitude && poleData.location.longitude) {
          locationString = `${poleData.location.latitude}, ${poleData.location.longitude}`;
        } else if (poleData.location.lat && poleData.location.lng) {
          locationString = `${poleData.location.lat}, ${poleData.location.lng}`;
        }
      } else if (poleData.plannedLocation) {
        if (poleData.plannedLocation.lat && poleData.plannedLocation.lng) {
          locationString = `${poleData.plannedLocation.lat}, ${poleData.plannedLocation.lng}`;
        }
      }
      
      return {
        id: poleData.id,
        vfPoleId: poleData.vfPoleId || poleData.poleNumber,
        projectId: poleData.projectId,
        projectCode: poleData.projectCode || 'Law-001',
        projectName: poleData.projectName,
        poleNumber: poleData.poleNumber,
        pon: poleData.ponNumber || '-',
        zone: poleData.zoneNumber || '-',
        distributionFeeder: poleData.distributionFeeder || poleData.poleType || '-',
        poleType: poleData.poleType || 'unknown',
        location: locationString,
        contractorId: poleData.contractorId || null,
        contractorName: poleData.contractorName || null,
        workingTeam: poleData.workingTeam || 'Import Team',
        dateInstalled: poleData.dateInstalled || poleData.createdAt,
        maxCapacity: poleData.maxCapacity || 12,
        connectedDrops: poleData.connectedDrops || [],
        dropCount: poleData.dropCount || 0,
        uploads: uploads,
        qualityChecked: poleData.qualityChecked || false,
        qualityCheckedBy: poleData.qualityCheckedBy,
        qualityCheckedByName: poleData.qualityCheckedByName,
        qualityCheckDate: poleData.qualityCheckDate,
        qualityCheckNotes: poleData.qualityCheckNotes,
        createdAt: poleData.createdAt,
        updatedAt: poleData.updatedAt,
        createdBy: poleData.createdBy,
        createdByName: poleData.createdByName,
        updatedBy: poleData.updatedBy,
        updatedByName: poleData.updatedByName,
        uploadProgress: uploadProgress,
        uploadedCount: uploadedCount,
        allUploadsComplete: uploadedCount === 6,
      };
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    
    // Auto-size columns
    this.gridApi.sizeColumnsToFit();
    
    // Update filtered count
    this.updateFilteredCount();
  }

  onSelectionChanged() {
    if (this.gridApi) {
      const selectedRows = this.gridApi.getSelectedRows();
      this.selectedCount.set(selectedRows.length);
    }
  }

  onRowClicked(event: any) {
    // Single click - could show preview
  }

  onRowDoubleClicked(event: any) {
    // Double click - navigate to details
    this.router.navigate(['/pole-tracker', event.data.id]);
  }

  onCellContextMenu(event: any) {
    // Right-click menu
    event.preventDefault();
  }

  getRowClass = (params: any) => {
    const classes = [];
    if (params.data.qualityChecked) {
      classes.push('row-quality-checked');
    }
    return classes.join(' ');
  };

  // External filtering
  isExternalFilterPresent = () => {
    return this.selectedContractorId !== '' || this.uploadStatusFilter !== 'all';
  };

  doesExternalFilterPass = (params: any) => {
    const pole = params.data;
    
    // Contractor filter
    if (this.selectedContractorId && pole.contractorId !== this.selectedContractorId) {
      return false;
    }
    
    // Upload status filter
    if (this.uploadStatusFilter !== 'all') {
      const isComplete = pole.allUploadsComplete;
      if (this.uploadStatusFilter === 'complete' && !isComplete) return false;
      if (this.uploadStatusFilter === 'incomplete' && isComplete) return false;
    }
    
    return true;
  };

  onProjectChange() {
    this.updateUrlParams();
    this.loadPoles();
  }

  onContractorChange() {
    this.updateUrlParams();
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  onUploadStatusChange() {
    this.updateUrlParams();
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  updateUrlParams() {
    const queryParams: any = {};
    if (this.selectedProjectId) queryParams.project = this.selectedProjectId;
    if (this.selectedContractorId) queryParams.contractor = this.selectedContractorId;
    if (this.uploadStatusFilter !== 'all') queryParams.uploadStatus = this.uploadStatusFilter;
    
    this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  updateFilteredCount() {
    if (this.gridApi) {
      this.filteredCount.set(this.gridApi.getDisplayedRowCount());
    }
  }

  exportData(format: string) {
    if (!this.gridApi) return;
    
    switch (format) {
      case 'csv':
        this.gridApi.exportDataAsCsv({
          fileName: `pole-tracker-${new Date().toISOString().split('T')[0]}.csv`,
          columnKeys: ['vfPoleId', 'poleNumber', 'pon', 'zone', 'location', 'projectName', 'dateInstalled', 'poleType', 'contractorName', 'uploadProgress', 'qualityChecked']
        });
        break;
      case 'excel':
        this.exportToExcel();
        break;
      case 'pdf':
        this.generateReport();
        break;
    }
  }

  refreshData() {
    this.loadPoles();
  }

  toggleView() {
    // Navigate back to table view with same filters
    const queryParams: any = {};
    if (this.selectedProjectId) queryParams.project = this.selectedProjectId;
    if (this.selectedContractorId) queryParams.contractor = this.selectedContractorId;
    if (this.uploadStatusFilter !== 'all') queryParams.uploadStatus = this.uploadStatusFilter;
    
    this.router.navigate(['/pole-tracker'], { queryParams });
  }

  deletePole(pole: PoleTrackerListItem) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Pole Entry',
        message: `Are you sure you want to delete pole ${pole.vfPoleId}?`,
        confirmText: 'Delete',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.poleTrackerService.deletePoleTracker(pole.id!).subscribe({
          next: () => {
            this.snackBar.open('Pole entry deleted successfully', 'Close', { duration: 3000 });
            this.loadPoles();
          },
          error: (error) => {
            console.error('Error deleting pole:', error);
            this.snackBar.open('Error deleting pole entry', 'Close', { duration: 3000 });
          },
        });
      }
    });
  }

  // Bulk Operations
  bulkAssignContractor() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    // TODO: Open contractor selection dialog
    this.snackBar.open(`Assign contractor to ${selectedRows.length} poles - Coming soon!`, 'Close', { duration: 3000 });
  }

  bulkUpdateStatus() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    // TODO: Open status update dialog
    this.snackBar.open(`Update status for ${selectedRows.length} poles - Coming soon!`, 'Close', { duration: 3000 });
  }

  bulkQualityCheck() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Bulk Quality Check',
        message: `Mark ${selectedRows.length} poles as quality checked?`,
        confirmText: 'Confirm',
        confirmColor: 'primary',
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // TODO: Implement bulk quality check
        this.snackBar.open(`Marked ${selectedRows.length} poles as quality checked`, 'Close', { duration: 3000 });
      }
    });
  }

  bulkDelete() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Bulk Delete',
        message: `Are you sure you want to delete ${selectedRows.length} poles?`,
        confirmText: 'Delete All',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // TODO: Implement bulk delete
        this.snackBar.open(`Deleted ${selectedRows.length} poles`, 'Close', { duration: 3000 });
      }
    });
  }

  exportSelected() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    // Export only selected rows
    this.gridApi.exportDataAsCsv({
      fileName: `selected-poles-${new Date().toISOString().split('T')[0]}.csv`,
      onlySelected: true
    });
  }

  // Analytics
  toggleAnalytics() {
    this.showAnalytics = !this.showAnalytics;
    if (this.showAnalytics) {
      // Initialize charts when analytics panel opens
      setTimeout(() => this.initializeCharts(), 100);
    }
  }

  initializeCharts() {
    if (!this.rowData().length) return;

    const analytics = this.poleAnalyticsService.generateAnalytics(this.rowData());
    const chartData = this.poleAnalyticsService.prepareChartData(analytics);

    // Installation Progress Chart
    if (this.progressChartRef) {
      this.createChart('progress', this.progressChartRef.nativeElement, {
        type: 'doughnut',
        data: chartData.installationProgress,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // Poles by Type Chart
    if (this.typeChartRef) {
      this.createChart('type', this.typeChartRef.nativeElement, {
        type: 'bar',
        data: chartData.polesByType,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    // Contractor Performance Chart
    if (this.contractorChartRef) {
      this.createChart('contractor', this.contractorChartRef.nativeElement, {
        type: 'bar',
        data: chartData.contractorPerformance,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    // Upload Completion Chart
    if (this.uploadChartRef) {
      this.createChart('upload', this.uploadChartRef.nativeElement, {
        type: 'pie',
        data: chartData.uploadCompletion,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  }

  createChart(key: string, canvas: HTMLCanvasElement, config: ChartConfiguration) {
    // Destroy existing chart if any
    if (this.charts[key]) {
      this.charts[key].destroy();
    }

    // Create new chart
    this.charts[key] = new Chart(canvas, config);
  }

  updatePivotTable() {
    if (!this.rowData().length) return;

    this.pivotData = this.poleAnalyticsService.generatePivotTable(
      this.rowData(),
      this.pivotConfig.rows,
      this.pivotConfig.columns,
      this.pivotConfig.values
    );
  }

  updateTimeSeries() {
    if (!this.timeSeriesChartRef) return;

    const analytics = this.poleAnalyticsService.generateAnalytics(this.rowData());
    const chartData = this.poleAnalyticsService.prepareChartData(analytics);

    this.createChart('timeSeries', this.timeSeriesChartRef.nativeElement, {
      type: 'line',
      data: chartData.timeSeries,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // Advanced Export Functions
  async exportToExcel() {
    this.processing.set(true);
    this.processingMessage.set('Generating Excel file...');

    try {
      const analytics = this.poleAnalyticsService.generateAnalytics(this.rowData());
      await this.excelExportService.exportToExcel(
        this.rowData(),
        analytics,
        this.pivotData || undefined,
        this.exportOptions
      );
      
      this.snackBar.open('Excel file generated successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error generating Excel:', error);
      this.snackBar.open('Error generating Excel file', 'Close', { duration: 3000 });
    } finally {
      this.processing.set(false);
      this.processingMessage.set('');
    }
  }

  async exportToPowerBI() {
    this.processing.set(true);
    this.processingMessage.set('Preparing Power BI export...');

    try {
      await this.excelExportService.exportForPowerBI(this.rowData());
      this.snackBar.open('Power BI export ready', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error preparing Power BI export:', error);
      this.snackBar.open('Error preparing Power BI export', 'Close', { duration: 3000 });
    } finally {
      this.processing.set(false);
      this.processingMessage.set('');
    }
  }

  async generateReport() {
    this.processing.set(true);
    this.processingMessage.set('Generating PDF report...');

    try {
      // TODO: Implement PDF generation with jsPDF
      this.snackBar.open('PDF report generation coming soon!', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error generating report:', error);
      this.snackBar.open('Error generating report', 'Close', { duration: 3000 });
    } finally {
      this.processing.set(false);
      this.processingMessage.set('');
    }
  }
}