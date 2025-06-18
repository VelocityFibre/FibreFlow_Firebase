import { Component, inject, ChangeDetectionStrategy, computed, signal } from '@angular/core';
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
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.scss'],
})
export class MainDashboardComponent {
  private projectService = inject(ProjectService);
  private supplierService = inject(SupplierService);
  private stockService = inject(StockService);
  private clientService = inject(ClientService);
  private taskService = inject(TaskService);

  // Signal-based state management for dashboard data
  projects = toSignal(this.projectService.getProjects().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  suppliers = toSignal(this.supplierService.getSuppliers().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  stockItems = toSignal(this.stockService.getStockItems().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  clients = toSignal(this.clientService.getClients().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  // Computed signals for dashboard counts
  projectsCount = computed(() => this.projects().length);
  suppliersCount = computed(() => this.suppliers().length);
  stockItemsCount = computed(() => this.stockItems().length);
  clientsCount = computed(() => this.clients().length);

  // Loading state computed from all data sources
  isLoading = computed(
    () =>
      this.projects().length === 0 &&
      this.suppliers().length === 0 &&
      this.stockItems().length === 0 &&
      this.clients().length === 0,
  );

  // Dashboard stats computed from real data
  dashboardStats = computed(() => {
    const projects = this.projects();
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const stockItems = this.stockItems();
    const lowStockItems = stockItems.filter(
      (item) => item.currentStock < (item.minimumStock || 10),
    ).length;

    return {
      polesPlanted: projects.reduce(
        (total, project) => total + (project.completedTasksCount || 0),
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

  // Flagged issues computed from project data
  flaggedIssuesCount = computed(() => {
    return this.projects().filter(
      (project) => project.priorityLevel === 'critical' || project.priorityLevel === 'high',
    ).length;
  });
}
