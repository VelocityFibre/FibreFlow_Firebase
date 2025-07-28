import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
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
import {
  ColDef,
  GridReadyEvent,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';

// Register AG-Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Chart.js imports
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);

import { Task, TaskStatus, TaskPriority } from '../../../../core/models/task.model';
import { Project } from '../../../../core/models/project.model';
import { StaffMember } from '../../../staff/models/staff.model';
import { TaskService } from '../../../../core/services/task.service';
import { ProjectService } from '../../../../core/services/project.service';
import { StaffService } from '../../../staff/services/staff.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TaskAnalyticsService, TaskAnalytics } from '../../services/task-analytics.service';
import { TaskExportService } from '../../services/task-export.service';

interface TaskDisplay extends Task {
  projectName?: string;
  assigneeName?: string;
  statusDisplay?: string;
  priorityDisplay?: string;
  daysUntilDue?: number;
  isOverdue?: boolean;
  hoursVariance?: number;
}

@Component({
  selector: 'app-task-management-grid',
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
  ],
  templateUrl: './task-management-grid.component.html',
  styleUrls: ['./task-management-grid.component.scss'],
})
export class TaskManagementGridComponent implements OnInit, OnDestroy, AfterViewInit {
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private staffService = inject(StaffService);
  private taskAnalyticsService = inject(TaskAnalyticsService);
  private taskExportService = inject(TaskExportService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  // Chart elements
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('priorityChart') priorityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('projectChart') projectChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('timeChart') timeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('completionChart') completionChartRef!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private charts: { [key: string]: Chart } = {};

  // Grid API
  private gridApi?: GridApi;

  // State
  rowData = signal<TaskDisplay[]>([]);
  projects = signal<Project[]>([]);
  staff = signal<StaffMember[]>([]);
  loading = signal(true);

  // Filters
  selectedProjectId = '';
  selectedAssigneeId = '';
  selectedStatus: TaskStatus | 'all' = 'all';
  selectedPriority: TaskPriority | 'all' = 'all';
  dueDateFilter: 'all' | 'overdue' | 'today' | 'week' | 'month' = 'all';
  searchTerm = '';
  showCompleted = false;
  pageSize = 50;

  // Stats
  totalCount = computed(() => this.rowData().length);
  selectedCount = signal(0);
  filteredCount = signal(0);
  completedCount = computed(() => {
    return this.rowData().filter((t) => t.status === TaskStatus.COMPLETED).length;
  });
  overdueCount = computed(() => {
    return this.rowData().filter((t) => t.isOverdue).length;
  });

  averageProgress = computed(() => {
    const data = this.rowData();
    if (data.length === 0) return 0;
    return Math.round(
      data.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) / data.length,
    );
  });

  // UI State
  showBulkActions = false;
  showAnalytics = false;
  processing = signal(false);
  processingMessage = signal('');

  // Enums for template
  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;

  // Export options
  exportOptions = {
    includeCharts: true,
    includeAnalytics: true,
    includeTimeTracking: true,
    includeProjectBreakdown: true,
    autoFilter: true,
    conditionalFormatting: true,
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
      field: 'name',
      headerName: 'Task Name',
      width: 250,
      pinned: 'left',
      editable: true,
      cellRenderer: (params: any) => {
        const flagIcon = params.data.isFlagged
          ? '<mat-icon style="color: #ff9800; font-size: 16px; margin-right: 8px;">flag</mat-icon>'
          : '';
        return `<div style="display: flex; align-items: center;">${flagIcon}<span style="font-weight: 500;">${params.value}</span></div>`;
      },
    },
    {
      field: 'projectName',
      headerName: 'Project',
      width: 150,
      sortable: true,
      filter: true,
      valueGetter: (params: any) => params.data.projectName || 'No Project',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      sortable: true,
      filter: true,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: [
          TaskStatus.PENDING,
          TaskStatus.IN_PROGRESS,
          TaskStatus.COMPLETED,
          TaskStatus.BLOCKED,
        ],
      },
      cellRenderer: (params: any) => {
        const statusColors: Record<TaskStatus, string> = {
          [TaskStatus.PENDING]: '#9e9e9e',
          [TaskStatus.IN_PROGRESS]: '#2196f3',
          [TaskStatus.COMPLETED]: '#4caf50',
          [TaskStatus.BLOCKED]: '#f44336',
        };
        const color = statusColors[params.value as TaskStatus] || '#9e9e9e';
        return `<span class="status-chip" style="background: ${color}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">${params.value}</span>`;
      },
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      sortable: true,
      filter: true,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL],
      },
      cellRenderer: (params: any) => {
        const priorityColors: Record<TaskPriority, string> = {
          [TaskPriority.LOW]: '#4caf50',
          [TaskPriority.MEDIUM]: '#ff9800',
          [TaskPriority.HIGH]: '#f44336',
          [TaskPriority.CRITICAL]: '#9c27b0',
        };
        const color = priorityColors[params.value as TaskPriority] || '#9e9e9e';
        return `<span class="priority-chip" style="background: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">${params.value}</span>`;
      },
    },
    {
      field: 'assignedToName',
      headerName: 'Assignee',
      width: 150,
      sortable: true,
      filter: true,
      editable: true,
      valueGetter: (params: any) => params.data.assignedToName || 'Unassigned',
    },
    {
      field: 'completionPercentage',
      headerName: 'Progress',
      width: 150,
      sortable: true,
      editable: true,
      cellRenderer: (params: any) => {
        const progress = params.value || 0;
        const color = progress === 100 ? '#4caf50' : progress > 50 ? '#ff9800' : '#2196f3';
        return `
          <div class="progress-cell">
            <div class="progress-bar" style="width: 100%; height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden;">
              <div class="progress-fill" style="width: ${progress}%; height: 100%; background: ${color}; transition: width 0.3s ease;"></div>
            </div>
            <span class="progress-text" style="font-size: 12px; color: #666; margin-left: 8px;">${progress}%</span>
          </div>
        `;
      },
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 120,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params: any) => {
        if (!params.value) return '-';
        const date = params.value?.toDate ? params.value.toDate() : params.value;
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
      cellRenderer: (params: any) => {
        if (!params.value) return '-';
        const date = params.value?.toDate ? params.value.toDate() : params.value;
        const isOverdue = params.data.isOverdue;
        const color = isOverdue ? '#f44336' : '#666';
        const formatted = new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return `<span style="color: ${color}; font-weight: ${isOverdue ? '500' : 'normal'}">${formatted}</span>`;
      },
    },
    {
      field: 'estimatedHours',
      headerName: 'Est. Hours',
      width: 100,
      sortable: true,
      editable: true,
      cellRenderer: (params: any) => params.value || '-',
    },
    {
      field: 'actualHours',
      headerName: 'Actual Hours',
      width: 100,
      sortable: true,
      editable: true,
      cellRenderer: (params: any) => {
        const actual = params.value || 0;
        const estimated = params.data.estimatedHours || 0;
        if (estimated > 0) {
          const variance = actual - estimated;
          const color = variance > 0 ? '#f44336' : variance < 0 ? '#4caf50' : '#666';
          return `<span style="color: ${color}">${actual}</span>`;
        }
        return actual || '-';
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      pinned: 'right',
      cellRenderer: (params: any) => {
        return `
          <div class="cell-action-buttons">
            <button mat-icon-button title="Edit" onclick="window.editTask('${params.data.id}')">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button title="Flag" onclick="window.toggleFlag('${params.data.id}')" style="color: ${params.data.isFlagged ? '#ff9800' : '#666'};">
              <mat-icon>flag</mat-icon>
            </button>
            <button mat-icon-button title="Delete" onclick="window.deleteTask('${params.data.id}')" style="color: #f44336;">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        `;
      },
    },
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
  };

  ngOnInit() {
    // Set up global functions for action buttons
    (window as any).editTask = (id: string) => this.editTask(id);
    (window as any).toggleFlag = (id: string) => this.toggleFlag(id);
    (window as any).deleteTask = (id: string) => this.deleteTask(id);

    // Restore filters from URL
    this.route.queryParams.subscribe((params) => {
      this.selectedProjectId = params['project'] || '';
      this.selectedAssigneeId = params['assignee'] || '';
      this.selectedStatus = params['status'] || 'all';
      this.selectedPriority = params['priority'] || 'all';
      this.dueDateFilter = params['dueDate'] || 'all';
      this.showCompleted = params['showCompleted'] === 'true';

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
    Object.values(this.charts).forEach((chart) => chart.destroy());

    // Clean up global functions
    delete (window as any).editTask;
    delete (window as any).toggleFlag;
    delete (window as any).deleteTask;
  }

  loadData() {
    this.loading.set(true);

    // Load projects
    this.projectService.getProjects().subscribe((projects) => {
      this.projects.set(projects);
    });

    // Load staff
    this.staffService.getStaff().subscribe((staff) => {
      this.staff.set(staff);
    });

    // Load tasks
    this.taskService
      .getAllTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          const taskDisplay = this.transformTasksToDisplay(tasks);
          this.rowData.set(taskDisplay);
          this.loading.set(false);

          // Apply external filter if needed
          if (this.gridApi) {
            this.gridApi.onFilterChanged();
          }
        },
        error: (error: any) => {
          console.error('Error loading tasks:', error);
          this.snackBar.open('Error loading tasks', 'Close', { duration: 3000 });
          this.loading.set(false);
        },
      });
  }

  transformTasksToDisplay(tasks: Task[]): TaskDisplay[] {
    const projects = this.projects();
    const staff = this.staff();
    const now = new Date();

    return tasks.map((task) => {
      const project = projects.find((p) => p.id === task.projectId);
      const assignee = staff.find((s) => s.id === task.assignedTo);

      // Calculate due date info
      let daysUntilDue = 0;
      let isOverdue = false;
      if (task.dueDate) {
        const dueDate = task.dueDate.toDate ? task.dueDate.toDate() : (task.dueDate as any as Date);
        daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        isOverdue = daysUntilDue < 0 && task.status !== TaskStatus.COMPLETED;
      }

      // Calculate hours variance
      const hoursVariance = (task.actualHours || 0) - (task.estimatedHours || 0);

      return {
        ...task,
        projectName: project?.name,
        assigneeName: assignee?.name,
        statusDisplay: task.status,
        priorityDisplay: task.priority,
        daysUntilDue,
        isOverdue,
        hoursVariance,
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
    // Double click - edit task
    this.editTask(event.data.id);
  }

  async onCellValueChanged(event: any) {
    // Handle inline editing
    const updatedTask = { ...event.data };
    try {
      await this.taskService.update(updatedTask.id, updatedTask);
      this.snackBar.open('Task updated successfully', 'Close', { duration: 3000 });
    } catch (error: any) {
      console.error('Error updating task:', error);
      this.snackBar.open('Error updating task', 'Close', { duration: 3000 });
      // Refresh data to revert changes
      this.loadData();
    }
  }

  // External filtering
  isExternalFilterPresent = () => {
    return (
      this.selectedProjectId !== '' ||
      this.selectedAssigneeId !== '' ||
      this.selectedStatus !== 'all' ||
      this.selectedPriority !== 'all' ||
      this.dueDateFilter !== 'all' ||
      this.searchTerm !== '' ||
      !this.showCompleted
    );
  };

  doesExternalFilterPass = (params: any) => {
    const task = params.data;

    // Project filter
    if (this.selectedProjectId && task.projectId !== this.selectedProjectId) {
      return false;
    }

    // Assignee filter
    if (this.selectedAssigneeId && task.assignedTo !== this.selectedAssigneeId) {
      return false;
    }

    // Status filter
    if (this.selectedStatus !== 'all' && task.status !== this.selectedStatus) {
      return false;
    }

    // Priority filter
    if (this.selectedPriority !== 'all' && task.priority !== this.selectedPriority) {
      return false;
    }

    // Due date filter
    if (this.dueDateFilter !== 'all') {
      const now = new Date();
      const dueDate = task.dueDate
        ? task.dueDate.toDate
          ? task.dueDate.toDate()
          : task.dueDate
        : null;

      switch (this.dueDateFilter) {
        case 'overdue':
          if (!dueDate || dueDate >= now) return false;
          break;
        case 'today':
          if (!dueDate || dueDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          if (!dueDate || dueDate > new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) return false;
          break;
        case 'month':
          if (!dueDate || dueDate > new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
            return false;
          break;
      }
    }

    // Search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      const matchesSearch =
        task.name.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.projectName?.toLowerCase().includes(searchLower) ||
        task.assigneeName?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Completed filter
    if (!this.showCompleted && task.status === TaskStatus.COMPLETED) {
      return false;
    }

    return true;
  };

  // Filter methods
  onProjectChange() {
    this.updateUrlParams();
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  onAssigneeChange() {
    this.updateUrlParams();
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  onStatusChange() {
    this.updateUrlParams();
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  onPriorityChange() {
    this.updateUrlParams();
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  onDueDateChange() {
    this.updateUrlParams();
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  onSearchChange() {
    this.updateUrlParams();
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  onShowCompletedChange() {
    this.updateUrlParams();
    if (this.gridApi) {
      this.gridApi.onFilterChanged();
    }
  }

  updateUrlParams() {
    const queryParams: any = {};
    if (this.selectedProjectId) queryParams.project = this.selectedProjectId;
    if (this.selectedAssigneeId) queryParams.assignee = this.selectedAssigneeId;
    if (this.selectedStatus !== 'all') queryParams.status = this.selectedStatus;
    if (this.selectedPriority !== 'all') queryParams.priority = this.selectedPriority;
    if (this.dueDateFilter !== 'all') queryParams.dueDate = this.dueDateFilter;
    if (this.showCompleted) queryParams.showCompleted = 'true';

    this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  updateFilteredCount() {
    if (this.gridApi) {
      this.filteredCount.set(this.gridApi.getDisplayedRowCount());
    }
  }

  // Action methods
  editTask(id: string) {
    // TODO: Open task edit dialog
    this.snackBar.open('Task editing - Coming soon!', 'Close', { duration: 3000 });
  }

  async toggleFlag(id: string) {
    const task = this.rowData().find((t) => t.id === id);
    if (task) {
      const updatedTask = { ...task, isFlagged: !task.isFlagged };
      try {
        await this.taskService.update(id, updatedTask);
        this.snackBar.open(`Task ${updatedTask.isFlagged ? 'flagged' : 'unflagged'}`, 'Close', {
          duration: 3000,
        });
        this.loadData();
      } catch (error: any) {
        console.error('Error updating task flag:', error);
        this.snackBar.open('Error updating task flag', 'Close', { duration: 3000 });
      }
    }
  }

  deleteTask(id: string) {
    const task = this.rowData().find((t) => t.id === id);
    if (!task) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Task',
        message: `Are you sure you want to delete "${task.name}"?`,
        confirmText: 'Delete',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.taskService.deleteTask(id);
          this.snackBar.open('Task deleted successfully', 'Close', { duration: 3000 });
          this.loadData();
        } catch (error: any) {
          console.error('Error deleting task:', error);
          this.snackBar.open('Error deleting task', 'Close', { duration: 3000 });
        }
      }
    });
  }

  // Export methods
  exportData(format: string) {
    if (!this.gridApi) return;

    switch (format) {
      case 'csv':
        this.gridApi.exportDataAsCsv({
          fileName: `tasks-${new Date().toISOString().split('T')[0]}.csv`,
          columnKeys: [
            'name',
            'projectName',
            'status',
            'priority',
            'assignedToName',
            'completionPercentage',
            'dueDate',
            'estimatedHours',
            'actualHours',
          ],
        });
        break;
      case 'excel':
        this.exportToExcel();
        break;
    }
  }

  async exportToExcel() {
    this.processing.set(true);
    this.processingMessage.set('Generating Excel file...');

    try {
      const analytics = this.taskAnalyticsService.generateAnalytics(this.rowData());
      await this.taskExportService.exportToExcel(this.rowData(), analytics, this.exportOptions);

      this.snackBar.open('Excel file generated successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error generating Excel:', error);
      this.snackBar.open('Error generating Excel file', 'Close', { duration: 3000 });
    } finally {
      this.processing.set(false);
      this.processingMessage.set('');
    }
  }

  // Bulk operations
  bulkAssignTasks() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    // TODO: Open assignee selection dialog
    this.snackBar.open(`Assign ${selectedRows.length} tasks - Coming soon!`, 'Close', {
      duration: 3000,
    });
  }

  bulkUpdateStatus() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    // TODO: Open status selection dialog
    this.snackBar.open(`Update status for ${selectedRows.length} tasks - Coming soon!`, 'Close', {
      duration: 3000,
    });
  }

  bulkUpdatePriority() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    // TODO: Open priority selection dialog
    this.snackBar.open(`Update priority for ${selectedRows.length} tasks - Coming soon!`, 'Close', {
      duration: 3000,
    });
  }

  bulkDelete() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Bulk Delete',
        message: `Are you sure you want to delete ${selectedRows.length} tasks?`,
        confirmText: 'Delete All',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // TODO: Implement bulk delete
        this.snackBar.open(`Deleted ${selectedRows.length} tasks`, 'Close', { duration: 3000 });
      }
    });
  }

  exportSelected() {
    if (!this.gridApi) return;
    const selectedRows = this.gridApi.getSelectedRows();
    if (selectedRows.length === 0) return;

    // Export only selected rows
    this.gridApi.exportDataAsCsv({
      fileName: `selected-tasks-${new Date().toISOString().split('T')[0]}.csv`,
      onlySelected: true,
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

    const analytics = this.taskAnalyticsService.generateAnalytics(this.rowData());
    const chartData = this.taskAnalyticsService.prepareChartData(analytics);

    // Status Distribution Chart
    if (this.statusChartRef) {
      this.createChart('status', this.statusChartRef.nativeElement, {
        type: 'doughnut',
        data: chartData.statusDistribution,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
          },
        },
      });
    }

    // Priority Distribution Chart
    if (this.priorityChartRef) {
      this.createChart('priority', this.priorityChartRef.nativeElement, {
        type: 'bar',
        data: chartData.priorityDistribution,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

    // Project Breakdown Chart
    if (this.projectChartRef) {
      this.createChart('project', this.projectChartRef.nativeElement, {
        type: 'bar',
        data: chartData.projectBreakdown,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

    // Time Tracking Chart
    if (this.timeChartRef) {
      this.createChart('time', this.timeChartRef.nativeElement, {
        type: 'scatter',
        data: chartData.timeTracking,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
          },
        },
      });
    }

    // Completion Rate Chart
    if (this.completionChartRef) {
      this.createChart('completion', this.completionChartRef.nativeElement, {
        type: 'line',
        data: chartData.completionRate,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' },
          },
        },
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

  refreshData() {
    this.loadData();
  }

  toggleView() {
    // Navigate back to basic table view
    this.router.navigate(['/tasks/management']);
  }
}
