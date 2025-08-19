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
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';

// AG Grid imports
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridReadyEvent,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
  SelectionChangedEvent
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Services
import { StagingSyncService, StagingPoleData } from '../../../pole-tracker/mobile/services/staging-sync.service';
import { PlantedPoleService } from '../../services/planted-pole.service';
import { ProjectService } from '@app/core/services/project.service';
import { AuthService } from '@app/core/services/auth.service';

// Models
import { Project } from '@app/core/models/project.model';
import { PlantedPole } from '../../models/planted-pole.model';

// Components
import { PhotoViewerDialogComponent } from '../../../pole-tracker/desktop/photo-viewer-dialog/photo-viewer-dialog.component';

interface VerificationGridData extends StagingPoleData {
  // Additional computed fields for grid display
  photoCount: number;
  locationAccuracy: string;
  submittedDaysAgo: number;
  qualityScore: number;
  hasRequiredPhotos: boolean;
}

@Component({
  selector: 'app-pole-planting-verification',
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
    MatBadgeModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCheckboxModule,
    AgGridAngular
  ],
  template: `
    <div class="verification-container">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <div class="title-section">
            <h1>
              <mat-icon>verified</mat-icon>
              Pole Planting Verification
            </h1>
            <p class="subtitle">Review and approve field-captured pole data before syncing to production</p>
          </div>
          
          <!-- Action Buttons -->
          <div class="header-actions">
            <button 
              mat-raised-button 
              color="primary" 
              (click)="bulkApprove()"
              [disabled]="selectedRows().length === 0 || isProcessing()"
            >
              <mat-icon>done_all</mat-icon>
              Approve Selected ({{ selectedRows().length }})
            </button>
            
            <button 
              mat-raised-button 
              color="warn" 
              (click)="bulkReject()"
              [disabled]="selectedRows().length === 0 || isProcessing()"
            >
              <mat-icon>clear</mat-icon>
              Reject Selected ({{ selectedRows().length }})
            </button>
            
            <button 
              mat-stroked-button 
              (click)="refreshData()"
              [disabled]="loading()"
            >
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards">
        <mat-card class="summary-card pending">
          <mat-card-content>
            <div class="card-icon">
              <mat-icon>pending</mat-icon>
            </div>
            <div class="card-stats">
              <div class="number">{{ summary().pending }}</div>
              <div class="label">Pending Verification</div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card validated">
          <mat-card-content>
            <div class="card-icon">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="card-stats">
              <div class="number">{{ summary().validated }}</div>
              <div class="label">Validated & Ready</div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card rejected">
          <mat-card-content>
            <div class="card-icon">
              <mat-icon>cancel</mat-icon>
            </div>
            <div class="card-stats">
              <div class="number">{{ summary().rejected }}</div>
              <div class="label">Rejected</div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="summary-card quality">
          <mat-card-content>
            <div class="card-icon">
              <mat-icon>grade</mat-icon>
            </div>
            <div class="card-stats">
              <div class="number">{{ summary().averageQuality }}%</div>
              <div class="label">Avg. Quality Score</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters">
            <mat-form-field appearance="outline">
              <mat-label>Search</mat-label>
              <input 
                matInput 
                [(ngModel)]="searchText" 
                (ngModelChange)="onSearchChanged()"
                placeholder="Pole number, project, notes..."
              >
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            
            <mat-form-field appearance="outline">
              <mat-label>Validation Status</mat-label>
              <mat-select 
                [(ngModel)]="statusFilter" 
                (ngModelChange)="onFilterChanged()"
              >
                <mat-option value="all">All Statuses</mat-option>
                <mat-option value="pending">Pending</mat-option>
                <mat-option value="validated">Validated</mat-option>
                <mat-option value="rejected">Rejected</mat-option>
              </mat-select>
            </mat-form-field>
            
            <mat-form-field appearance="outline">
              <mat-label>Project</mat-label>
              <mat-select 
                [(ngModel)]="projectFilter" 
                (ngModelChange)="onFilterChanged()"
              >
                <mat-option value="">All Projects</mat-option>
                @for (project of projects(); track project.id) {
                  <mat-option [value]="project.id">{{ project.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            
            <mat-form-field appearance="outline">
              <mat-label>Quality Threshold</mat-label>
              <mat-select 
                [(ngModel)]="qualityFilter" 
                (ngModelChange)="onFilterChanged()"
              >
                <mat-option value="all">All Quality</mat-option>
                <mat-option value="excellent">Excellent (90%+)</mat-option>
                <mat-option value="good">Good (70%+)</mat-option>
                <mat-option value="fair">Fair (50%+)</mat-option>
                <mat-option value="poor">Poor (<50%)</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Data Grid -->
      <mat-card class="grid-card">
        <mat-card-content>
          @if (loading()) {
            <div class="loading-container">
              <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
              <p>Loading staging data...</p>
            </div>
          } @else {
            <ag-grid-angular
              #agGrid
              class="ag-theme-material"
              [columnDefs]="columnDefs"
              [defaultColDef]="defaultColDef"
              [rowData]="rowData()"
              [rowSelection]="'multiple'"
              [suppressRowClickSelection]="false"
              (gridReady)="onGridReady($event)"
              (selectionChanged)="onSelectionChanged($event)"
              domLayout="autoHeight"
            >
            </ag-grid-angular>
          }
        </mat-card-content>
      </mat-card>

      <!-- Processing Overlay -->
      @if (isProcessing()) {
        <div class="processing-overlay">
          <mat-progress-spinner mode="indeterminate" diameter="60"></mat-progress-spinner>
          <p>{{ processingMessage() }}</p>
        </div>
      }
    </div>
  `,
  styleUrls: ['./pole-planting-verification.component.scss']
})
export class PolePlantingVerificationComponent implements OnInit {
  private stagingSyncService = inject(StagingSyncService);
  private plantedPoleService = inject(PlantedPoleService);
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  
  // Grid API
  private gridApi!: GridApi;
  
  // State
  loading = signal(true);
  isProcessing = signal(false);
  processingMessage = signal('');
  rowData = signal<VerificationGridData[]>([]);
  selectedRows = signal<VerificationGridData[]>([]);
  
  // Filters
  searchText = '';
  statusFilter = 'pending';
  projectFilter = '';
  qualityFilter = 'all';
  
  // Data
  projects = signal<Project[]>([]);
  summary = signal({
    pending: 0,
    validated: 0,
    rejected: 0,
    averageQuality: 0
  });
  
  // Column definitions
  columnDefs: ColDef[] = [
    {
      field: 'selection',
      headerName: '',
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      pinned: 'left',
      lockPinned: true,
      cellClass: 'ag-cell-selection'
    },
    {
      field: 'validation_status',
      headerName: 'Status',
      width: 120,
      cellRenderer: (params: any) => {
        const status = params.value || 'unknown';
        const statusClasses: Record<string, string> = {
          pending: 'status-pending',
          validated: 'status-validated',
          rejected: 'status-rejected'
        };
        const statusIcons: Record<string, string> = {
          pending: 'pending',
          validated: 'check_circle',
          rejected: 'cancel'
        };
        const statusClass = statusClasses[status] || 'status-unknown';
        const icon = statusIcons[status] || 'help';
        return `
          <div class="status-chip ${statusClass}">
            <mat-icon>${icon}</mat-icon>
            <span>${status.charAt(0).toUpperCase() + status.slice(1)}</span>
          </div>
        `;
      }
    },
    {
      field: 'poleNumber',
      headerName: 'Pole Number',
      width: 150,
      filter: true,
      cellRenderer: (params: any) => {
        return params.value || '<em>Auto-generated</em>';
      }
    },
    {
      field: 'projectId',
      headerName: 'Project',
      width: 150,
      valueGetter: (params: any) => {
        const project = this.projects().find(p => p.id === params.data.projectId);
        return project?.name || params.data.projectId;
      }
    },
    {
      field: 'capturedBy',
      headerName: 'Captured By',
      width: 130
    },
    {
      field: 'submittedDaysAgo',
      headerName: 'Submitted',
      width: 110,
      valueGetter: (params: any) => {
        const submittedAt = params.data.submitted_at;
        if (submittedAt && submittedAt.toDate) {
          const days = Math.floor((new Date().getTime() - submittedAt.toDate().getTime()) / (1000 * 60 * 60 * 24));
          return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
        }
        return 'Unknown';
      }
    },
    {
      field: 'locationAccuracy',
      headerName: 'GPS Accuracy',
      width: 120,
      valueGetter: (params: any) => {
        const accuracy = params.data.gpsAccuracy;
        if (accuracy) {
          return accuracy < 5 ? `${accuracy}m (Excellent)` :
                 accuracy < 10 ? `${accuracy}m (Good)` :
                 accuracy < 20 ? `${accuracy}m (Fair)` :
                 `${accuracy}m (Poor)`;
        }
        return 'Unknown';
      },
      cellStyle: (params: any) => {
        const accuracy = params.data.gpsAccuracy;
        if (accuracy < 5) return { color: '#4caf50' };
        if (accuracy < 10) return { color: '#ff9800' };
        if (accuracy >= 20) return { color: '#f44336' };
        return null;
      }
    },
    {
      field: 'photoCount',
      headerName: 'Photos',
      width: 100,
      valueGetter: (params: any) => {
        return Object.keys(params.data.photoUrls || {}).length;
      },
      cellRenderer: (params: any) => {
        const photoCount = Object.keys(params.data.photoUrls || {}).length;
        const requiredPhotos = 6; // before, front, side, depth, concrete, compaction
        const isComplete = photoCount >= requiredPhotos;
        return `
          <div class="photo-count ${isComplete ? 'complete' : 'incomplete'}">
            <mat-icon>${isComplete ? 'photo_library' : 'photo'}</mat-icon>
            <span>${photoCount}/${requiredPhotos}</span>
          </div>
        `;
      }
    },
    {
      field: 'qualityScore',
      headerName: 'Quality',
      width: 100,
      valueGetter: (params: any) => {
        // Calculate quality score based on various factors
        let score = 0;
        
        // GPS accuracy (40% weight)
        const accuracy = params.data.gpsAccuracy;
        if (accuracy) {
          if (accuracy < 5) score += 40;
          else if (accuracy < 10) score += 30;
          else if (accuracy < 20) score += 20;
          else score += 10;
        }
        
        // Photo completeness (40% weight)
        const photoCount = Object.keys(params.data.photoUrls || {}).length;
        const photoCompleteness = Math.min(photoCount / 6, 1);
        score += photoCompleteness * 40;
        
        // Has pole number (10% weight)
        if (params.data.poleNumber) score += 10;
        
        // Has notes (10% weight)
        if (params.data.notes && params.data.notes.trim()) score += 10;
        
        return Math.round(score);
      },
      cellRenderer: (params: any) => {
        const score = params.value;
        const scoreClass = score >= 90 ? 'excellent' :
                          score >= 70 ? 'good' :
                          score >= 50 ? 'fair' : 'poor';
        return `<div class="quality-score ${scoreClass}">${score}%</div>`;
      }
    },
    {
      field: 'notes',
      headerName: 'Notes',
      width: 200,
      cellRenderer: (params: any) => {
        const notes = params.value;
        if (notes && notes.length > 50) {
          return notes.substring(0, 50) + '...';
        }
        return notes || '<em>No notes</em>';
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      cellRenderer: (params: any) => {
        return `
          <div class="action-buttons">
            <button class="btn-view-photos" title="View Photos">
              <mat-icon>photo_library</mat-icon>
            </button>
            <button class="btn-approve" title="Approve">
              <mat-icon>check</mat-icon>
            </button>
            <button class="btn-reject" title="Reject">
              <mat-icon>close</mat-icon>
            </button>
            <button class="btn-details" title="View Details">
              <mat-icon>info</mat-icon>
            </button>
          </div>
        `;
      },
      onCellClicked: (params: any) => {
        const target = (params.event.target as HTMLElement);
        const button = target.closest('button');
        
        if (button?.classList.contains('btn-view-photos')) {
          this.viewPhotos(params.data);
        } else if (button?.classList.contains('btn-approve')) {
          this.approveSingle(params.data);
        } else if (button?.classList.contains('btn-reject')) {
          this.rejectSingle(params.data);
        } else if (button?.classList.contains('btn-details')) {
          this.viewDetails(params.data);
        }
      }
    }
  ];
  
  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: false,
    floatingFilter: false
  };
  
  async ngOnInit() {
    await this.loadProjects();
    await this.loadStagingData();
  }
  
  private async loadProjects() {
    this.projectService.getAll().subscribe(projects => {
      this.projects.set(projects);
    });
  }
  
  private async loadStagingData() {
    this.loading.set(true);
    
    try {
      // Get staging data based on current filter
      // Note: 'validating' status is not supported by getStagingItems, treat it as 'pending'
      let status: 'pending' | 'validated' | 'rejected' | undefined = undefined;
      
      if (this.statusFilter !== 'all') {
        if (this.statusFilter === 'validating') {
          status = 'pending'; // Treat validating as pending
        } else {
          status = this.statusFilter as 'pending' | 'validated' | 'rejected';
        }
      }
      
      // Get data from Angular staging collection
      const angularStagingData = await this.stagingSyncService.getStagingItems(status);
      // TODO: Add React app data loading when method is implemented
      // const reactAppData = await this.loadReactAppStagingData(status);
      
      // For now, just use Angular staging data
      const stagingData = angularStagingData;
      
      // Transform for grid display
      const gridData: VerificationGridData[] = stagingData.map(item => ({
        ...item,
        photoCount: Object.keys(item.photoUrls || {}).length,
        locationAccuracy: item.gpsAccuracy ? `${item.gpsAccuracy}m` : 'Unknown',
        submittedDaysAgo: this.calculateDaysAgo(item.submitted_at),
        qualityScore: this.calculateQualityScore(item),
        hasRequiredPhotos: Object.keys(item.photoUrls || {}).length >= 6
      }));
      
      this.rowData.set(gridData);
      this.updateSummary(stagingData);
      
    } catch (error) {
      console.error('Error loading staging data:', error);
      this.snackBar.open('Error loading data', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }
  
  private calculateDaysAgo(timestamp: any): number {
    if (timestamp && timestamp.toDate) {
      const days = Math.floor((new Date().getTime() - timestamp.toDate().getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    }
    return 0;
  }
  
  private calculateQualityScore(item: StagingPoleData): number {
    let score = 0;
    
    // GPS accuracy (40% weight)
    if (item.gpsAccuracy) {
      if (item.gpsAccuracy < 5) score += 40;
      else if (item.gpsAccuracy < 10) score += 30;
      else if (item.gpsAccuracy < 20) score += 20;
      else score += 10;
    }
    
    // Photo completeness (40% weight)
    const photoCount = Object.keys(item.photoUrls || {}).length;
    const photoCompleteness = Math.min(photoCount / 6, 1);
    score += photoCompleteness * 40;
    
    // Has pole number (10% weight)
    if (item.poleNumber) score += 10;
    
    // Has notes (10% weight)
    if (item.notes && item.notes.trim()) score += 10;
    
    return Math.round(score);
  }
  
  private updateSummary(data: StagingPoleData[]) {
    const pending = data.filter(d => d.validation_status === 'pending').length;
    const validated = data.filter(d => d.validation_status === 'validated').length;
    const rejected = data.filter(d => d.validation_status === 'rejected').length;
    
    const qualityScores = data.map(d => this.calculateQualityScore(d));
    const averageQuality = qualityScores.length > 0 ? 
      Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) : 0;
    
    this.summary.set({
      pending,
      validated,
      rejected,
      averageQuality
    });
  }
  
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }
  
  onSelectionChanged(event: SelectionChangedEvent) {
    this.selectedRows.set(event.api.getSelectedRows());
  }
  
  onSearchChanged() {
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', this.searchText);
    }
  }
  
  onFilterChanged() {
    this.loadStagingData();
  }
  
  async refreshData() {
    await this.loadStagingData();
    this.snackBar.open('Data refreshed', 'Close', { duration: 2000 });
  }
  
  async bulkApprove() {
    const selectedItems = this.selectedRows();
    if (selectedItems.length === 0) return;
    
    this.isProcessing.set(true);
    this.processingMessage.set(`Approving ${selectedItems.length} poles...`);
    
    try {
      const currentUser = await this.authService.getCurrentUser();
      const verifiedBy = currentUser?.email || 'admin';
      
      // Process each item
      for (const item of selectedItems) {
        // First mark as validated in staging
        if (item.id) {
          await this.stagingSyncService.approveStagingItem(item.id);
        }
        
        // Create planted pole from staging data
        const plantedPoleId = await this.plantedPoleService.createFromStagingData(item);
        
        console.log(`Created planted pole ${plantedPoleId} from staging item ${item.id}`);
      }
      
      this.snackBar.open(
        `Successfully approved ${selectedItems.length} poles`, 
        'Close', 
        { duration: 3000 }
      );
      
      await this.refreshData();
      
    } catch (error) {
      console.error('Error in bulk approval:', error);
      this.snackBar.open('Error during bulk approval', 'Close', { duration: 3000 });
    } finally {
      this.isProcessing.set(false);
    }
  }
  
  async bulkReject() {
    const selectedItems = this.selectedRows();
    if (selectedItems.length === 0) return;

    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to reject ${selectedItems.length} selected poles? This action cannot be undone.`);
    if (!confirmed) return;
    
    this.isProcessing.set(true);
    this.processingMessage.set(`Rejecting ${selectedItems.length} poles...`);
    
    try {
      const currentUser = await this.authService.getCurrentUser();
      const verifiedBy = currentUser?.email || 'admin';
      
      // Process each item
      for (const item of selectedItems) {
        if (item.id) {
          await this.stagingSyncService.rejectStagingItem(
            item.id, 
            `Bulk rejected by ${verifiedBy} during manual verification`
          );
          console.log(`Rejected staging item ${item.id}`);
        }
      }
      
      this.snackBar.open(
        `Successfully rejected ${selectedItems.length} poles`, 
        'Close', 
        { duration: 3000 }
      );
      
      await this.refreshData();
      
    } catch (error) {
      console.error('Error in bulk rejection:', error);
      this.snackBar.open('Error during bulk rejection', 'Close', { duration: 3000 });
    } finally {
      this.isProcessing.set(false);
    }
  }
  
  async approveSingle(item: VerificationGridData) {
    this.isProcessing.set(true);
    this.processingMessage.set(`Approving pole ${item.poleNumber || item.id}...`);
    
    try {
      // First mark as validated in staging
      if (item.id) {
        await this.stagingSyncService.approveStagingItem(item.id);
      }
      
      // Then create planted pole from staging data
      const plantedPoleId = await this.plantedPoleService.createFromStagingData(item);
      
      this.snackBar.open(
        `Approved pole ${item.poleNumber || 'unnamed'}`, 
        'Close', 
        { duration: 2000 }
      );
      
      await this.refreshData();
      
    } catch (error) {
      console.error('Error approving pole:', error);
      this.snackBar.open('Error approving pole', 'Close', { duration: 3000 });
    } finally {
      this.isProcessing.set(false);
    }
  }
  
  async rejectSingle(item: VerificationGridData) {
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to reject pole ${item.poleNumber || 'unnamed'}? This action cannot be undone.`);
    if (!confirmed) return;

    this.isProcessing.set(true);
    this.processingMessage.set(`Rejecting pole ${item.poleNumber || item.id}...`);
    
    try {
      const currentUser = await this.authService.getCurrentUser();
      const verifiedBy = currentUser?.email || 'admin';
      
      if (item.id) {
        await this.stagingSyncService.rejectStagingItem(
          item.id,
          `Manually rejected by ${verifiedBy} during verification`
        );
        
        this.snackBar.open(
          `Rejected pole ${item.poleNumber || 'unnamed'}`, 
          'Close', 
          { duration: 2000 }
        );
        
        await this.refreshData();
      } else {
        throw new Error('No item ID available for rejection');
      }
      
    } catch (error) {
      console.error('Error rejecting pole:', error);
      this.snackBar.open('Error rejecting pole', 'Close', { duration: 3000 });
    } finally {
      this.isProcessing.set(false);
    }
  }
  
  viewPhotos(item: VerificationGridData) {
    if (!item.photoUrls || Object.keys(item.photoUrls).length === 0) {
      this.snackBar.open('No photos available for this pole', 'Close', { duration: 2000 });
      return;
    }
    
    const photoUrls = Object.values(item.photoUrls);
    
    this.dialog.open(PhotoViewerDialogComponent, {
      data: {
        photos: photoUrls,
        title: `Photos for Pole ${item.poleNumber || item.id}`
      },
      maxWidth: '90vw',
      maxHeight: '90vh',
      width: '800px',
      height: '600px'
    });
  }
  
  viewDetails(item: VerificationGridData) {
    // TODO: Implement details dialog
    console.log('View details for:', item);
  }
}
