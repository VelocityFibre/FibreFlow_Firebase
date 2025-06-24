import {
  Component,
  inject,
  ChangeDetectionStrategy,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProjectService } from '../../../../core/services/project.service';
import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import { StockService } from '../../../stock/services/stock.service';
import { ClientService } from '../../../clients/services/client.service';
import { TaskService } from '../../../../core/services/task.service';
import { TaskPriority } from '../../../../core/models/task.model';
import { RFQService } from '../../../quotes/services/rfq.service';
import { StaffService } from '../../../staff/services/staff.service';
import { ContractorService } from '../../../contractors/services/contractor.service';
import { PoleTrackerService } from '../../../pole-tracker/services/pole-tracker.service';
import { catchError, of, interval, Subject, takeUntil, switchMap, startWith } from 'rxjs';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.scss'],
})
export class MainDashboardComponent implements OnInit, OnDestroy {
  private projectService = inject(ProjectService);
  private supplierService = inject(SupplierService);
  private stockService = inject(StockService);
  private clientService = inject(ClientService);
  private taskService = inject(TaskService);
  private rfqService = inject(RFQService);
  private staffService = inject(StaffService);
  private contractorService = inject(ContractorService);
  private poleTrackerService = inject(PoleTrackerService);
  private destroy$ = new Subject<void>();
  private refreshTrigger$ = new Subject<void>();

  // Signal-based state management for dashboard data
  projects = toSignal(this.projectService.getProjects().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  suppliers = toSignal(this.supplierService.getSuppliers().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  stockItems = toSignal(of<any[]>([]), {
    initialValue: [] as any[],
  });

  clients = toSignal(this.clientService.getClients().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  rfqs = toSignal(this.rfqService.getRFQs().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  staff = toSignal(this.staffService.getStaff().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  contractors = toSignal(this.contractorService.getContractors().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  poleTrackers = toSignal(this.poleTrackerService.getPoleTrackers().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  // Load all tasks to get flagged task count - with proper refresh mechanism
  allTasks = toSignal(
    this.refreshTrigger$.pipe(
      startWith(null),
      switchMap(() => this.taskService.getAllTasks()),
      catchError(() => of([])),
    ),
    {
      initialValue: [],
    },
  );

  // Computed signals for dashboard counts
  projectsCount = computed(() => this.projects().length);
  suppliersCount = computed(() => this.suppliers().length);
  stockItemsCount = computed(() => this.stockItems().length);
  clientsCount = computed(() => this.clients().length);
  rfqsCount = computed(() => this.rfqs().length);
  staffCount = computed(() => this.staff().length);
  contractorsCount = computed(() => this.contractors().length);
  polesInstalledCount = computed(() => this.poleTrackers().length);
  polesQualityCheckedCount = computed(() => this.poleTrackers().filter(p => p.qualityChecked).length);

  // Loading state computed from all data sources
  isLoading = computed(
    () =>
      this.projects().length === 0 &&
      this.suppliers().length === 0 &&
      this.stockItems().length === 0 &&
      this.clients().length === 0 &&
      this.allTasks().length === 0,
  );

  // Dashboard stats computed from real data
  dashboardStats = computed(() => {
    const projects = this.projects();
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const stockItems = this.stockItems();
    const lowStockItems = stockItems.filter(
      (item) => item.currentStock < ((item as any).minimumStock || 10),
    ).length;

    return {
      polesPlanted: projects.reduce(
        (total: number, project) => total + (project.completedTasksCount || 0),
        0,
      ),
      materialsNeeded: lowStockItems,
      activeProjects,
      completionRate:
        projects.length > 0
          ? Math.round(
              (projects.filter((p) => p.status === 'completed').length / projects.length) * 100,
            )
          : 0,
    };
  });

  // Flagged issues computed from actual task data
  flaggedIssuesCount = computed(() => {
    const tasks = this.allTasks();
    console.log('=== DASHBOARD FLAGGED COUNT DEBUG ===');
    console.log('Total tasks loaded:', tasks.length);

    // Simply count tasks where isFlagged is true
    const flaggedTasks = tasks.filter((task) => task.isFlagged === true);

    console.log('Flagged tasks found:', flaggedTasks.length);
    if (flaggedTasks.length > 0) {
      console.log(
        'Flagged task details:',
        flaggedTasks.map((t) => ({
          name: t.name,
          isFlagged: t.isFlagged,
          projectId: t.projectId,
        })),
      );
    }
    console.log('=== DASHBOARD DEBUG END ===');

    return flaggedTasks.length;
  });

  ngOnInit() {
    // Initial log
    console.log('Dashboard initialized. Starting auto-refresh cycle...');

    // Auto-refresh every 10 seconds to catch task updates
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('Dashboard: Auto-refreshing task data...');
        this.refreshTrigger$.next();
      });

    // Also log whenever tasks are loaded
    this.taskService.getAllTasks().subscribe((tasks) => {
      console.log('=== DASHBOARD TASKS LOADED ===');
      console.log('Total tasks:', tasks.length);
      const flaggedTasks = tasks.filter((t) => t.isFlagged === true);
      console.log('Flagged tasks:', flaggedTasks.length);
      if (flaggedTasks.length > 0) {
        console.log(
          'Flagged task names:',
          flaggedTasks.map((t) => t.name),
        );
      }
      console.log('=== END DASHBOARD TASKS ===');
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Manual refresh method
  refreshDashboard() {
    this.refreshTrigger$.next();
  }
}
