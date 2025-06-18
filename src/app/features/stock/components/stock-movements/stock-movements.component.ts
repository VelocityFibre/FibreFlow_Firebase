import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  Injector,
  afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

import { StockService } from '../../services/stock.service';
import { StockMovementService } from '../../services/stock-movement.service';
import { ProjectService } from '../../../../core/services/project.service';
import { StockMovementFormDialogComponent } from '../stock-movement-form-dialog/stock-movement-form-dialog.component';
import {
  StockMovement,
  MovementType,
  ReferenceType,
  StockMovementFilter,
  isIncomingMovement,
  isOutgoingMovement,
  getMovementTypeLabel,
  getMovementTypeIcon,
  getMovementTypeColor,
} from '../../models/stock-movement.model';
import { StockItem } from '../../models/stock-item.model';
import { Project } from '../../../../core/models/project.model';

@Component({
  selector: 'app-stock-movements',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatChipsModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './stock-movements.component.html',
  styleUrls: ['./stock-movements.component.scss'],
})
export class StockMovementsComponent implements OnInit {
  private stockService = inject(StockService);
  private stockMovementService = inject(StockMovementService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private injector = inject(Injector);

  // State signals
  movements = signal<StockMovement[]>([]);
  stockItems = signal<StockItem[]>([]);
  projects = signal<Project[]>([]);
  loading = signal(false);

  // Filter form
  filterForm!: FormGroup;

  // Movement types for filter
  movementTypes = Object.values(MovementType);
  movementTypeLabels = getMovementTypeLabel;

  // Reference types for filter
  referenceTypes = Object.values(ReferenceType);

  // Table configuration
  displayedColumns = [
    'movementDate',
    'itemCode',
    'itemName',
    'movementType',
    'quantity',
    'reference',
    'location',
    'performedBy',
    'actions',
  ];

  // Computed values
  summary = computed(() => {
    const movs = this.movements();
    let totalIn = 0;
    let totalOut = 0;
    let totalValue = 0;

    movs.forEach((m) => {
      if (isIncomingMovement(m.movementType)) {
        totalIn += m.quantity;
        totalValue += m.totalCost;
      } else if (isOutgoingMovement(m.movementType)) {
        totalOut += m.quantity;
        totalValue -= m.totalCost;
      }
    });

    return {
      totalIn,
      totalOut,
      netMovement: totalIn - totalOut,
      totalValue: Math.abs(totalValue),
    };
  });

  ngOnInit() {
    this.initializeForm();
    // Use afterNextRender to avoid NG0200
    afterNextRender(
      () => {
        this.loadData();
      },
      { injector: this.injector },
    );
  }

  private initializeForm() {
    this.filterForm = this.fb.group({
      itemId: [''],
      movementType: [''],
      referenceType: [''],
      projectId: [''],
      dateFrom: [''],
      dateTo: [''],
    });

    // Apply filters on value changes - defer initial emission
    afterNextRender(
      () => {
        this.filterForm.valueChanges.subscribe(() => {
          this.applyFilters();
        });
      },
      { injector: this.injector },
    );
  }

  private async loadData() {
    this.loading.set(true);

    try {
      // Load stock items for filter
      const items = await firstValueFrom(this.stockService.getStockItems());
      this.stockItems.set(items);

      // Load projects for filter
      const projects = await firstValueFrom(this.projectService.getProjects());
      this.projects.set(projects);

      // Load movements
      await this.loadMovements();
    } catch (error) {
      console.error('Error loading data:', error);
      this.snackBar.open('Error loading data', 'Close', {
        duration: 3000,
        panelClass: 'error-snackbar',
      });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadMovements() {
    const filter = this.buildFilter();
    const movements = await firstValueFrom(this.stockMovementService.getMovements(filter));
    this.movements.set(movements);
  }

  private buildFilter(): StockMovementFilter {
    const values = this.filterForm.value;
    const filter: StockMovementFilter = {};

    if (values.itemId) filter.itemId = values.itemId;
    if (values.movementType) filter.movementType = values.movementType;
    if (values.referenceType) filter.referenceType = values.referenceType;
    if (values.projectId) filter.projectId = values.projectId;
    if (values.dateFrom) filter.dateFrom = values.dateFrom;
    if (values.dateTo) filter.dateTo = values.dateTo;

    return filter;
  }

  private applyClientSideFilter(
    movements: StockMovement[],
    filter: StockMovementFilter,
  ): StockMovement[] {
    return movements.filter((m) => {
      if (filter.itemId && m.itemId !== filter.itemId) return false;
      if (filter.movementType && m.movementType !== filter.movementType) return false;
      if (filter.referenceType && m.referenceType !== filter.referenceType) return false;
      if (
        filter.projectId &&
        m.toProjectId !== filter.projectId &&
        m.fromProjectId !== filter.projectId
      )
        return false;

      if (filter.dateFrom || filter.dateTo) {
        const movementDate = m.movementDate.toDate();
        if (filter.dateFrom && movementDate < filter.dateFrom) return false;
        if (filter.dateTo && movementDate > filter.dateTo) return false;
      }

      return true;
    });
  }

  applyFilters() {
    this.loadMovements();
  }

  clearFilters() {
    this.filterForm.reset();
  }

  openMovementDialog() {
    const dialogRef = this.dialog.open(StockMovementFormDialogComponent, {
      width: '800px',
      data: {
        stockItems: this.stockItems(),
        projects: this.projects(),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createMovement(result);
      }
    });
  }

  async createMovement(movement: Partial<StockMovement>) {
    this.loading.set(true);

    try {
      await this.stockMovementService.createMovement(
        movement as Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'>,
      );
      this.snackBar.open('Stock movement created successfully', 'Close', {
        duration: 3000,
        panelClass: 'success-snackbar',
      });
      await this.loadMovements();
    } catch (error) {
      console.error('Error creating movement:', error);
      this.snackBar.open('Error creating stock movement', 'Close', {
        duration: 3000,
        panelClass: 'error-snackbar',
      });
    } finally {
      this.loading.set(false);
    }
  }

  viewMovementDetails(movement: StockMovement) {
    // Navigate to stock item detail with movement highlighted
    this.router.navigate(['/stock', movement.itemId], {
      queryParams: { highlightMovement: movement.id },
    });
  }

  formatDate(timestamp: Timestamp): string {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(value);
  }

  getLocationDisplay(movement: StockMovement): string {
    if (movement.fromLocation && movement.toLocation) {
      return `${movement.fromLocation} → ${movement.toLocation}`;
    } else if (movement.fromProjectName && movement.toProjectName) {
      return `${movement.fromProjectName} → ${movement.toProjectName}`;
    } else if (movement.toProjectName) {
      return `→ ${movement.toProjectName}`;
    } else if (movement.fromProjectName) {
      return `${movement.fromProjectName} →`;
    }
    return '-';
  }

  getReferenceDisplay(movement: StockMovement): string {
    if (movement.referenceNumber) {
      return movement.referenceNumber;
    } else if (movement.referenceType && movement.referenceId) {
      return `${movement.referenceType}: ${movement.referenceId}`;
    }
    return '-';
  }

  // Helper methods exposed to template
  isIncoming = isIncomingMovement;
  isOutgoing = isOutgoingMovement;
  getTypeLabel = getMovementTypeLabel;
  getTypeIcon = getMovementTypeIcon;
  getTypeColor = getMovementTypeColor;
}
