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
import { ColDef, GridApi, GridReadyEvent, RowDoubleClickedEvent } from 'ag-grid-community';
import { ContractorService } from '../../services/contractor.service';
import { Contractor } from '../../models/contractor.model';
import { MatDialog } from '@angular/material/dialog';
import { ContractorFormComponent } from '../../components/contractor-form/contractor-form.component';

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

      <!-- Grid Container -->
      <mat-card class="grid-card">
        <mat-card-content>
          <div class="grid-container">
            <ag-grid-angular
              class="ag-theme-material"
              [rowData]="contractors()"
              [columnDefs]="columnDefs"
              [defaultColDef]="defaultColDef"
              [animateRows]="true"
              [pagination]="true"
              [paginationPageSize]="20"
              [paginationPageSizeSelector]="[10, 20, 50, 100]"
              [enableCellTextSelection]="true"
              [ensureDomOrder]="true"
              (gridReady)="onGridReady($event)"
              (rowDoubleClicked)="onRowDoubleClicked($event)"
              [overlayLoadingTemplate]="'<span>Loading contractors...</span>'"
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
      height: calc(100vh - 300px);
      min-height: 500px;
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
    
    // Contact Information
    { 
      field: 'contactPerson', 
      headerName: 'Contact Person', 
      minWidth: 200
    },
    { 
      field: 'contactTitle', 
      headerName: 'Title', 
      minWidth: 150
    },
    { 
      field: 'contactNumber', 
      headerName: 'Phone', 
      minWidth: 150
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      minWidth: 200
    },
    
    // Address
    { 
      field: 'address.street1', 
      headerName: 'Street Address', 
      minWidth: 200
    },
    { 
      field: 'address.suburb', 
      headerName: 'Suburb', 
      minWidth: 150
    },
    { 
      field: 'address.city', 
      headerName: 'City', 
      minWidth: 150
    },
    { 
      field: 'address.postalCode', 
      headerName: 'Postal Code', 
      minWidth: 100
    },
    { 
      field: 'address.province', 
      headerName: 'Province', 
      minWidth: 120
    },
    
    // Services and Operations
    { 
      field: 'servicesOffered', 
      headerName: 'Services', 
      minWidth: 150,
      valueFormatter: params => params.value?.join(', ') || ''
    },
    { 
      field: 'regionsOfOperation', 
      headerName: 'Regions', 
      minWidth: 150,
      valueFormatter: params => params.value?.join(', ') || ''
    },
    { 
      field: 'projectZones', 
      headerName: 'Project Zones', 
      minWidth: 150,
      valueFormatter: params => params.value?.join(', ') || ''
    },
    
    // Banking Details
    { 
      field: 'bankingDetails.bankName', 
      headerName: 'Bank', 
      minWidth: 120
    },
    { 
      field: 'bankingDetails.accountNumber', 
      headerName: 'Account No.', 
      minWidth: 150
    },
    { 
      field: 'bankingDetails.branchCode', 
      headerName: 'Branch Code', 
      minWidth: 100
    },
    { 
      field: 'bankingDetails.accountType', 
      headerName: 'Account Type', 
      minWidth: 150
    },
    
    // Payment Terms
    { 
      field: 'paymentTerms', 
      headerName: 'Payment Terms', 
      minWidth: 200
    },
    
    // Documents Status
    { 
      field: 'documents.cipcRegistration', 
      headerName: 'CIPC Reg', 
      minWidth: 100,
      cellRenderer: (params: any) => params.value ? '✓' : '✗',
      cellClass: params => params.value ? 'text-green-600' : 'text-red-600'
    },
    { 
      field: 'documents.taxClearance', 
      headerName: 'Tax Clear', 
      minWidth: 100,
      cellRenderer: (params: any) => params.value ? '✓' : '✗',
      cellClass: params => params.value ? 'text-green-600' : 'text-red-600'
    },
    { 
      field: 'documents.bbbee', 
      headerName: 'B-BBEE', 
      minWidth: 100,
      cellRenderer: (params: any) => params.value ? '✓' : '✗',
      cellClass: params => params.value ? 'text-green-600' : 'text-red-600'
    },
    { 
      field: 'documents.coid', 
      headerName: 'COID', 
      minWidth: 100,
      cellRenderer: (params: any) => params.value ? '✓' : '✗',
      cellClass: params => params.value ? 'text-green-600' : 'text-red-600'
    },
    { 
      field: 'documents.publicLiability', 
      headerName: 'Insurance', 
      minWidth: 100,
      cellRenderer: (params: any) => params.value ? '✓' : '✗',
      cellClass: params => params.value ? 'text-green-600' : 'text-red-600'
    },
    
    // Status
    { 
      field: 'status', 
      headerName: 'Status', 
      minWidth: 120,
      cellRenderer: (params: any) => {
        const status = params.value || 'active';
        const formatted = status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        return `<span class="status-chip ${status}">${formatted}</span>`;
      }
    },
    
    // WhatsApp Group
    { 
      field: 'whatsappGroup', 
      headerName: 'WhatsApp', 
      minWidth: 100,
      cellRenderer: (params: any) => params.value ? 'Yes' : 'No'
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
    this.contractorService.getContractors().subscribe({
      next: (contractors) => {
        this.contractors.set(contractors);
      },
      error: (error) => {
        console.error('Error loading contractors:', error);
      }
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
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