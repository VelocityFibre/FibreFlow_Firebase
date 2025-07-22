import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// AG-Grid imports
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

// Register AG-Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Services and models
import { ActionItemsManagementService } from '../../services/action-items-management.service';
import { AuthService } from '../../../../core/services/auth.service';
import { 
  ActionItemManagement, 
  ActionItemStatus, 
  ActionItemFilter,
  ActionItemStats 
} from '../../models/action-item-management.model';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-action-items-grid',
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
    MatSnackBarModule,
    MatProgressSpinnerModule,
    AgGridAngular,
    PageHeaderComponent
  ],
  templateUrl: './action-items-grid.component.html',
  styleUrls: ['./action-items-grid.component.scss']
})
export class ActionItemsGridComponent implements OnInit, OnDestroy {
  private actionItemsService = inject(ActionItemsManagementService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();

  // Grid API
  private gridApi!: GridApi;

  // State
  loading = signal(true);
  actionItems = signal<ActionItemManagement[]>([]);
  stats = signal<ActionItemStats | null>(null);
  searchText = signal('');
  selectedStatus = signal<ActionItemStatus | ''>('');
  selectedPriority = signal<string>('');

  // Options
  statusOptions = ['', ...Object.values(ActionItemStatus)];
  priorityOptions = ['', 'high', 'medium', 'low'];

  // Grid Configuration
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true
  };

  columnDefs: ColDef[] = [
    {
      field: 'originalActionItem.text',
      headerName: 'Action Item',
      flex: 2,
      wrapText: true,
      autoHeight: true,
      cellStyle: { 'white-space': 'normal' },
      valueGetter: params => params.data?.originalActionItem?.text || '',
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true
    },
    {
      field: 'meetingTitle',
      headerName: 'Meeting',
      flex: 1
    },
    {
      field: 'meetingDate',
      headerName: 'Meeting Date',
      width: 120,
      valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString() : ''
    },
    {
      field: 'updates.priority',
      headerName: 'Priority',
      width: 100,
      cellClass: params => `priority-${params.value || 'medium'}`,
      valueGetter: params => params.data.updates?.priority || params.data.originalActionItem?.priority || 'medium',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['high', 'medium', 'low']
      }
    },
    {
      field: 'updates.assignee',
      headerName: 'Assignee',
      width: 150,
      valueGetter: params => params.data.updates?.assignee || params.data.originalActionItem?.assignee || 'Unassigned',
      editable: true,
      cellEditor: 'agTextCellEditor'
    },
    {
      field: 'updates.dueDate',
      headerName: 'Due Date',
      width: 120,
      valueGetter: params => params.data.updates?.dueDate || params.data.originalActionItem?.dueDate,
      valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString() : '',
      cellClass: params => {
        if (!params.value || params.data.status === ActionItemStatus.COMPLETED) return '';
        const dueDate = new Date(params.value);
        const today = new Date();
        return dueDate < today ? 'overdue' : '';
      },
      editable: true,
      cellEditor: 'agDateStringCellEditor'
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: Object.values(ActionItemStatus)
      },
      editable: true,
      cellClass: params => `status-${params.value}`
    },
    {
      field: 'updates.notes',
      headerName: 'Notes',
      flex: 1,
      editable: true,
      wrapText: true,
      autoHeight: true,
      cellStyle: { 'white-space': 'normal' }
    }
  ];

  // Computed values
  filteredItems = computed(() => {
    let items = this.actionItems();
    const search = this.searchText().toLowerCase();
    const status = this.selectedStatus();
    const priority = this.selectedPriority();

    if (search) {
      items = items.filter(item => 
        item.originalActionItem.text.toLowerCase().includes(search) ||
        item.meetingTitle.toLowerCase().includes(search) ||
        (item.updates.assignee || '').toLowerCase().includes(search) ||
        (item.updates.notes || '').toLowerCase().includes(search)
      );
    }

    if (status) {
      items = items.filter(item => item.status === status);
    }

    if (priority) {
      items = items.filter(item => 
        (item.updates.priority || item.originalActionItem.priority) === priority
      );
    }

    return items;
  });

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
    
    // Check if data is available
    const currentItems = this.filteredItems();
    console.log('Grid ready with items:', currentItems.length);
    if (currentItems.length === 0) {
      console.log('No items to display in grid');
    }
  }

  private loadData() {
    this.loading.set(true);
    
    // Load action items
    this.actionItemsService.getActionItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          console.log('Loaded action items:', items.length, items);
          this.actionItems.set(items);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading action items:', error);
          this.loading.set(false);
          this.snackBar.open('Error loading action items', 'Close', {
            duration: 3000
          });
        }
      });

    // Load stats
    this.actionItemsService.getActionItemStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => this.stats.set(stats),
        error: (error) => console.error('Error loading stats:', error)
      });
  }

  async onCellValueChanged(event: any) {
    try {
      const user = this.authService.currentUser();
      if (!user) {
        this.snackBar.open('Please login to update action items', 'Close', {
          duration: 3000
        });
        return;
      }

      const item = event.data as ActionItemManagement;
      const field = event.column.getColId();
      
      let updates: any = {};
      
      switch (field) {
        case 'originalActionItem.text':
          // Update the action item text
          updates.text = event.newValue;
          break;
        case 'status':
          updates.status = event.newValue;
          break;
        case 'updates.assignee':
          updates.assignee = event.newValue;
          break;
        case 'updates.priority':
          updates.priority = event.newValue;
          break;
        case 'updates.dueDate':
          updates.dueDate = event.newValue;
          break;
        case 'updates.notes':
          updates.notes = event.newValue;
          break;
      }

      await this.actionItemsService.updateActionItem(
        item.id!,
        updates,
        user.uid,
        user.email || 'unknown@fibreflow.com',
        `Updated ${field} via grid`
      );

      this.snackBar.open('Action item updated', 'Close', { duration: 2000 });
      this.loadData(); // Refresh data
      
    } catch (error) {
      console.error('Error updating action item:', error);
      this.snackBar.open('Error updating action item', 'Close', {
        duration: 3000
      });
      // Revert the change
      event.node.setDataValue(event.column.getColId(), event.oldValue);
    }
  }

  exportToExcel() {
    this.gridApi.exportDataAsExcel({
      fileName: `action-items-${new Date().toISOString().split('T')[0]}.xlsx`
    });
  }

  clearFilters() {
    this.searchText.set('');
    this.selectedStatus.set('');
    this.selectedPriority.set('');
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
    }
  }

  applyQuickFilter() {
    // AG-Grid doesn't use setQuickFilter anymore, we'll use our computed filteredItems instead
    // The filtering is already handled by the computed signal
  }
}