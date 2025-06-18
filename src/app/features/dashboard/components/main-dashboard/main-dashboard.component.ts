import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ProjectService } from '../../../../core/services/project.service';
import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import { StockService } from '../../../stock/services/stock.service';
import { ClientService } from '../../../clients/services/client.service';
import { TaskService } from '../../../../core/services/task.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatCardModule],
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.scss']
})
export class MainDashboardComponent implements OnInit, OnDestroy {
  private projectService = inject(ProjectService);
  private supplierService = inject(SupplierService);
  private stockService = inject(StockService);
  private clientService = inject(ClientService);
  private taskService = inject(TaskService);
  private destroy$ = new Subject<void>();

  // Counts for dashboard cards
  projectsCount = 0;
  suppliersCount = 0;
  stockItemsCount = 0;
  clientsCount = 0;
  flaggedIssuesCount = 0;

  ngOnInit() {
    // Get projects count
    this.projectService.getProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projectsCount = projects.length;
        },
        error: (error) => {
          console.error('Error loading projects count:', error);
          this.projectsCount = 0;
        }
      });

    // Get suppliers count
    this.supplierService.getSuppliers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (suppliers) => {
          this.suppliersCount = suppliers.length;
        },
        error: (error) => {
          console.error('Error loading suppliers count:', error);
          this.suppliersCount = 0;
        }
      });

    // Get stock items count
    this.stockService.getStockItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.stockItemsCount = items.length;
        },
        error: (error) => {
          console.error('Error loading stock items count:', error);
          this.stockItemsCount = 0;
        }
      });

    // Get clients count
    this.clientService.getClients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients) => {
          this.clientsCount = clients.length;
        },
        error: (error) => {
          console.error('Error loading clients count:', error);
          this.clientsCount = 0;
        }
      });

    // Get flagged issues count (blocked tasks from all projects)
    // For now, we'll set this to 0 since we'd need to query all projects
    this.flaggedIssuesCount = 0;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
