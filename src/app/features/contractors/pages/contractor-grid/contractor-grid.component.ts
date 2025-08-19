import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, RowDoubleClickedEvent, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { ContractorService } from '../../services/contractor.service';
import { Contractor } from '../../models/contractor.model';
import { MatDialog } from '@angular/material/dialog';
import { ContractorFormComponent } from '../../components/contractor-form/contractor-form.component';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-contractor-grid',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    AgGridAngular
  ],
  template: `
    <div class="ff-page-container">
      <!-- Header -->
      <div class="ff-page-header">
        <div class="header-content">
          <div class="breadcrumb">
            <a routerLink="/contractors" class="breadcrumb-link">
              <mat-icon>arrow_back</mat-icon>
              Back to Contractors
            </a>
          </div>
          <h1 class="page-title">Contractors Grid View</h1>
          <p class="page-subtitle">Comprehensive contractor data in table format</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button (click)="exportToExcel()">
            <mat-icon>download</mat-icon>
            Export to Excel
          </button>
          <button mat-raised-button color="primary" (click)="openAddDialog()">
            <mat-icon>add</mat-icon>
            Add Contractor
          </button>
        </div>
      </div>


      <!-- Debug Info - Remove after testing -->
      <div style="margin-bottom: 16px; padding: 16px; background: #f5f5f5; border-radius: 4px;">
        <p>Debug: Contractors count: {{ contractors().length }}</p>
        <p>Debug: First contractor: {{ contractors()[0]?.companyName || 'None' }}</p>
        <p>Debug: Sample contractor data: {{ contractors()[0] | json }}</p>
      </div>

      <!-- Grid Container -->
      <mat-card class="grid-card">
        <mat-card-content>
          <div class="grid-container">
            <ag-grid-angular
              class="ag-theme-material"
              [rowData]="contractors()"
              [columnDefs]="columnDefs"
              [defaultColDef]="defaultColDef"
              [animateRows]="false"
              [pagination]="true"
              [paginationPageSize]="20"
              [enableCellTextSelection]="true"
              (gridReady)="onGridReady($event)"
              (rowDoubleClicked)="onRowDoubleClicked($event)"
              [overlayNoRowsTemplate]="'<span>No contractors found</span>'"
            >
            </ag-grid-angular>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    @use '../../../../../styles/component-theming' as theme;

    .ff-page-container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    .ff-page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 32px;

      .header-content {
        flex: 1;
      }

      .breadcrumb {
        margin-bottom: 16px;
      }

      .breadcrumb-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: theme.ff-rgb(muted-foreground);
        text-decoration: none;
        font-size: 14px;
        transition: color 0.2s;

        &:hover {
          color: theme.ff-rgb(primary);
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
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

      .header-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }
    }

    .grid-card {
      border-radius: 12px;
      overflow: hidden;
    }

    .grid-container {
      height: 600px;
      width: 100%;
    }
    
    .ag-theme-material {
      height: 100%;
      width: 100%;
    }

    .status-chip {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      
      &.active {
        background-color: #e3f2fd;
        color: #1976d2;
      }
      
      &.pending_approval {
        background-color: #fff3cd;
        color: #856404;
      }
      
      &.suspended {
        background-color: #f8d7da;
        color: #721c24;
      }
      
      &.blacklisted {
        background-color: #d1d1d1;
        color: #333;
      }
    }

    @media (max-width: 768px) {
      .ff-page-container {
        padding: 24px 16px;
      }

      .ff-page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 24px;
      }

      .header-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `]
})
export class ContractorGridComponent implements OnInit {
  private contractorService = inject(ContractorService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  
  contractors = signal<Contractor[]>([]);
  private gridApi!: GridApi;

  columnDefs: ColDef[] = [
    // Basic Information
    { 
      field: 'companyName', 
      headerName: 'Company Name', 
      minWidth: 250,
      pinned: 'left',
      cellStyle: { fontWeight: '500' }
    },
    { 
      field: 'tradingName', 
      headerName: 'Trading Name', 
      minWidth: 200
    },
    { 
      field: 'registrationNumber', 
      headerName: 'Registration No.', 
      minWidth: 150
    },
    { 
      field: 'vatNumber', 
      headerName: 'VAT Number', 
      minWidth: 150
    },
    { 
      field: 'entityType', 
      headerName: 'Entity Type', 
      minWidth: 120
    },
    
    // Contact Information - Using new nested structure
    { 
      field: 'primaryContact.name', 
      headerName: 'Contact Person', 
      minWidth: 200
    },
    { 
      field: 'primaryContact.role', 
      headerName: 'Title', 
      minWidth: 150
    },
    { 
      field: 'primaryContact.phone', 
      headerName: 'Phone', 
      minWidth: 150
    },
    { 
      field: 'primaryContact.email', 
      headerName: 'Email', 
      minWidth: 200
    },
    
    // Address - Using new nested structure
    { 
      field: 'physicalAddress.street', 
      headerName: 'Street Address', 
      minWidth: 200
    },
    { 
      field: 'physicalAddress.city', 
      headerName: 'City', 
      minWidth: 150
    },
    { 
      field: 'physicalAddress.province', 
      headerName: 'Province', 
      minWidth: 120
    },
    { 
      field: 'physicalAddress.postalCode', 
      headerName: 'Postal Code', 
      minWidth: 100
    },
    
    // Services and Operations
    { 
      field: 'capabilities.services', 
      headerName: 'Services', 
      minWidth: 150,
      valueGetter: (params) => {
        const services = params.data?.capabilities?.services || [];
        return Array.isArray(services) ? services.join(', ') : '';
      }
    },
    { 
      field: 'regionsOfOperation', 
      headerName: 'Regions', 
      minWidth: 150,
      valueGetter: (params) => {
        const regions = params.data?.regionsOfOperation || [];
        return Array.isArray(regions) ? regions.join(', ') : '';
      }
    },
    { 
      field: 'projectZones', 
      headerName: 'Project Zones', 
      minWidth: 150,
      valueGetter: (params) => {
        const zones = params.data?.projectZones || [];
        return Array.isArray(zones) ? zones.join(', ') : '';
      }
    },
    
    // Banking Details - Using new nested structure
    { 
      field: 'financial.bankName', 
      headerName: 'Bank', 
      minWidth: 120
    },
    { 
      field: 'financial.accountNumber', 
      headerName: 'Account No.', 
      minWidth: 150
    },
    { 
      field: 'financial.branchCode', 
      headerName: 'Branch Code', 
      minWidth: 100
    },
    { 
      field: 'financial.accountType', 
      headerName: 'Account Type', 
      minWidth: 150
    },
    { 
      field: 'financial.paymentTerms', 
      headerName: 'Payment Terms', 
      minWidth: 120,
      valueGetter: (params) => {
        const terms = params.data?.financial?.paymentTerms;
        return terms ? `${terms} days` : '';
      }
    },
    
    // Status
    { 
      field: 'status', 
      headerName: 'Status', 
      minWidth: 120,
      valueGetter: (params) => {
        const status = params.data?.status || 'active';
        return status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
    },
    
    // WhatsApp Group
    { 
      field: 'whatsappGroup', 
      headerName: 'WhatsApp', 
      minWidth: 100,
      valueGetter: (params) => params.data?.whatsappGroup ? 'Yes' : 'No'
    }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  };

  ngOnInit() {
    this.loadContractors();
  }

  loadContractors() {
    console.log('ContractorGridComponent: Loading contractors...');
    this.contractorService.getContractors().subscribe({
      next: (contractors) => {
        console.log('ContractorGridComponent: Contractors received:', contractors?.length || 0);
        
        if (contractors && contractors.length > 0) {
          console.log('ContractorGridComponent: Sample contractor:', {
            id: contractors[0].id,
            companyName: contractors[0].companyName,
            primaryContact: contractors[0].primaryContact
          });
        }
        
        this.contractors.set(contractors || []);
        
        // Force AG Grid to refresh data if grid is ready
        if (this.gridApi && contractors && contractors.length > 0) {
          console.log('ContractorGridComponent: Grid API available, forcing refresh');
          this.gridApi.setGridOption('rowData', contractors);
          
          // Check what AG Grid thinks it has
          setTimeout(() => {
            const rowCount = this.gridApi.getDisplayedRowCount();
            const allRowData: any[] = [];
            this.gridApi.forEachNode(node => allRowData.push(node.data));
            console.log('ContractorGridComponent: AG Grid row count:', rowCount);
            console.log('ContractorGridComponent: AG Grid data sample:', allRowData[0]);
          }, 100);
        }
      },
      error: (error) => {
        console.error('ContractorGridComponent: Error loading contractors:', error);
        this.contractors.set([]);
      }
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    console.log('ContractorGridComponent: Grid API ready');
    
    // Check if data is available
    const contractorsData = this.contractors();
    console.log('ContractorGridComponent: Current contractors data:', contractorsData.length);
    
    if (contractorsData.length > 0) {
      console.log('ContractorGridComponent: Setting row data immediately');
      console.log('ContractorGridComponent: Sample data:', contractorsData[0]);
      this.gridApi.setGridOption('rowData', contractorsData);
      
      // Additional debugging
      setTimeout(() => {
        const displayedRows = this.gridApi.getDisplayedRowCount();
        console.log('ContractorGridComponent: Displayed rows after set:', displayedRows);
      }, 1000);
    }
    
    this.gridApi.sizeColumnsToFit();
  }

  onRowDoubleClicked(event: RowDoubleClickedEvent) {
    if (event.data?.id) {
      this.router.navigate(['/contractors', event.data.id]);
    }
  }

  exportToExcel() {
    this.gridApi.exportDataAsExcel({
      fileName: `contractors_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName: 'Contractors'
    });
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(ContractorFormComponent, {
      width: '800px',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadContractors();
      }
    });
  }
}