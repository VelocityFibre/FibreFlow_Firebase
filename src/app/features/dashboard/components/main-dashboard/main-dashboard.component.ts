import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ProjectService } from '../../../../core/services/project.service';
import { SupplierService } from '../../../../core/suppliers/services/supplier.service';
import { StockService } from '../../../stock/services/stock.service';
import { ClientService } from '../../../clients/services/client.service';
import { TaskService } from '../../../../core/services/task.service';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatCardModule],
  templateUrl: './main-dashboard.component.html',
  styleUrls: ['./main-dashboard.component.scss'],
})
export class MainDashboardComponent implements OnInit {
  private projectService = inject(ProjectService);
  private supplierService = inject(SupplierService);
  private stockService = inject(StockService);
  private clientService = inject(ClientService);
  private taskService = inject(TaskService);

  // Counts for dashboard cards
  projectsCount = 0;
  suppliersCount = 0;
  stockItemsCount = 0;
  clientsCount = 0;
  flaggedIssuesCount = 0;

  ngOnInit() {
    // Get projects count
    this.projectService.getProjects().subscribe((projects) => {
      this.projectsCount = projects.length;
    });

    // Get suppliers count
    this.supplierService.getSuppliers().subscribe((suppliers) => {
      this.suppliersCount = suppliers.length;
    });

    // Get stock items count
    this.stockService.getStockItems().subscribe((items) => {
      this.stockItemsCount = items.length;
    });

    // Get clients count
    this.clientService.getClients().subscribe((clients) => {
      this.clientsCount = clients.length;
    });

    // Get flagged issues count (blocked tasks from all projects)
    // For now, we'll set this to 0 since we'd need to query all projects
    this.flaggedIssuesCount = 0;
  }
}
