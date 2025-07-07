import {
  Component,
  OnInit,
  inject,
  signal,
  DestroyRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StaffService } from '../../services/staff.service';
import { StaffMember, StaffGroup, AvailabilityStatus } from '../../models';
import { LoadingSkeletonComponent } from '../../../../shared/components/loading-skeleton/loading-skeleton.component';
import { StaffImportComponent } from '../staff-import/staff-import.component';

@Component({
  selector: 'app-staff-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    LoadingSkeletonComponent,
  ],
  template: `
    <div class="staff-list-container">
      <div class="header">
        <h1>Staff Management</h1>
        <div class="header-actions">
          <button mat-raised-button color="accent" (click)="openImportDialog()">
            <mat-icon>upload</mat-icon>
            Import Staff
          </button>
          <button mat-raised-button color="primary" routerLink="new">
            <mat-icon>add</mat-icon>
            Add Staff Member
          </button>
        </div>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline">
          <mat-label>Search</mat-label>
          <input
            matInput
            [formControl]="searchControl"
            placeholder="Search by name, email, or ID"
          />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Filter by Group</mat-label>
          <mat-select [formControl]="groupControl" multiple>
            <mat-option value="Admin">Admin</mat-option>
            <mat-option value="ProjectManager">Project Manager</mat-option>
            <mat-option value="Technician">Technician</mat-option>
            <mat-option value="Supplier">Supplier</mat-option>
            <mat-option value="Client">Client</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Availability Status</mat-label>
          <mat-select [formControl]="statusControl" multiple>
            <mat-option value="available">Available</mat-option>
            <mat-option value="busy">Busy</mat-option>
            <mat-option value="offline">Offline</mat-option>
            <mat-option value="vacation">On Vacation</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [formControl]="activeControl">
            <mat-option [value]="null">All</mat-option>
            <mat-option [value]="true">Active</mat-option>
            <mat-option [value]="false">Inactive</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="table-container">
          <app-loading-skeleton type="table"></app-loading-skeleton>
        </div>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="dataSource" matSort>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
              <td mat-cell *matCellDef="let staff">
                <div class="staff-info">
                  <div class="avatar">
                    @if (staff.photoUrl) {
                      <img [src]="staff.photoUrl" [alt]="staff.name" />
                    } @else {
                      <mat-icon>person</mat-icon>
                    }
                  </div>
                  <div>
                    <div class="name">{{ staff.name }}</div>
                    <div class="employee-id">{{ staff.employeeId }}</div>
                  </div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
              <td mat-cell *matCellDef="let staff">{{ staff.email }}</td>
            </ng-container>

            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef>Phone</th>
              <td mat-cell *matCellDef="let staff">{{ staff.phone }}</td>
            </ng-container>

            <ng-container matColumnDef="group">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Group</th>
              <td mat-cell *matCellDef="let staff">
                <mat-chip [ngClass]="'group-' + staff.primaryGroup.toLowerCase()">
                  {{ formatGroup(staff.primaryGroup) }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="availability">
              <th mat-header-cell *matHeaderCellDef>Availability</th>
              <td mat-cell *matCellDef="let staff">
                <div class="availability-status" [ngClass]="'status-' + staff.availability.status">
                  <mat-icon>{{ getStatusIcon(staff.availability.status) }}</mat-icon>
                  {{ formatStatus(staff.availability.status) }}
                </div>
                <div class="task-count">
                  {{ staff.availability.currentTaskCount }}/{{
                    staff.availability.maxConcurrentTasks
                  }}
                  tasks
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="activity">
              <th mat-header-cell *matHeaderCellDef>Activity</th>
              <td mat-cell *matCellDef="let staff">
                <div class="activity-info">
                  <div>Tasks: {{ staff.activity.tasksCompleted }} completed</div>
                  @if (staff.activity.lastActive) {
                    <div class="last-active">
                      Last active: {{ formatLastActive(staff.activity.lastActive) }}
                    </div>
                  }
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let staff">
                <mat-chip [color]="staff.isActive ? 'primary' : 'warn'">
                  {{ staff.isActive ? 'Active' : 'Inactive' }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let staff">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item [routerLink]="[staff.id]">
                    <mat-icon>visibility</mat-icon>
                    <span>View Profile</span>
                  </button>
                  <button mat-menu-item [routerLink]="[staff.id, 'edit']">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item [routerLink]="[staff.id, 'availability']">
                    <mat-icon>calendar_today</mat-icon>
                    <span>Availability</span>
                  </button>
                  <button mat-menu-item [routerLink]="[staff.id, 'activity']">
                    <mat-icon>analytics</mat-icon>
                    <span>Activity</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="toggleStaffStatus(staff)">
                    <mat-icon>{{ staff.isActive ? 'block' : 'check_circle' }}</mat-icon>
                    <span>{{ staff.isActive ? 'Deactivate' : 'Activate' }}</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>

          <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" [pageSize]="25" showFirstLastButtons>
          </mat-paginator>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .staff-list-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        background-color: var(--mat-sys-background);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }

      .filters {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .filters mat-form-field {
        min-width: 200px;
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: 48px;
      }

      .table-container {
        background: var(--mat-sys-surface);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: var(--mat-sys-elevation-1);
        border: 1px solid var(--mat-sys-outline-variant);
      }

      table {
        width: 100%;
      }

      .staff-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--mat-sys-surface-variant);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .name {
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }

      .employee-id {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }

      .availability-status {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
      }

      .status-available {
        color: #4caf50;
      }
      .status-busy {
        color: #ff9800;
      }
      .status-offline {
        color: #9e9e9e;
      }
      .status-vacation {
        color: #2196f3;
      }

      .task-count {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }

      .activity-info {
        font-size: 14px;
      }

      .last-active {
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }

      mat-chip {
        font-size: 12px;
      }

      .group-admin {
        background: #e3f2fd;
        color: #1976d2;
      }
      .group-projectmanager {
        background: #f3e5f5;
        color: #7b1fa2;
      }
      .group-technician {
        background: #e8f5e9;
        color: #388e3c;
      }
      .group-supplier {
        background: #fff3e0;
        color: #f57c00;
      }
      .group-client {
        background: #fce4ec;
        color: #c2185b;
      }
    `,
  ],
})
export class StaffListComponent implements OnInit, AfterViewInit {
  private staffService = inject(StaffService);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = signal(true);
  staff = signal<StaffMember[]>([]);
  dataSource = new MatTableDataSource<StaffMember>([]);

  searchControl = new FormControl('');
  groupControl = new FormControl<StaffGroup[]>([]);
  statusControl = new FormControl<AvailabilityStatus[]>([]);
  activeControl = new FormControl<boolean | null>(true);

  displayedColumns = [
    'name',
    'email',
    'phone',
    'group',
    'availability',
    'activity',
    'status',
    'actions',
  ];

  ngOnInit() {
    this.loadStaff();
    this.setupFilterSubscriptions();
    this.setupDataSourceFilter();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private setupDataSourceFilter() {
    this.dataSource.filterPredicate = (data: StaffMember, filter: string) => {
      const filters = JSON.parse(filter);

      // Search term filter
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const matchesSearch =
          data.name.toLowerCase().includes(searchTerm) ||
          data.email.toLowerCase().includes(searchTerm) ||
          data.employeeId.toLowerCase().includes(searchTerm) ||
          data.phone.includes(searchTerm);
        if (!matchesSearch) return false;
      }

      // Group filter
      if (filters.groups?.length > 0) {
        if (!filters.groups.includes(data.primaryGroup)) return false;
      }

      // Status filter
      if (filters.availabilityStatus?.length > 0) {
        const status = data.availability?.status || 'available';
        if (!filters.availabilityStatus.includes(status)) return false;
      }

      // Active filter
      if (filters.isActive !== undefined && filters.isActive !== null) {
        if (data.isActive !== filters.isActive) return false;
      }

      return true;
    };
  }

  private loadStaff() {
    this.loading.set(true);
    this.staffService
      .getStaff()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (staff) => {
          this.staff.set(staff);
          this.dataSource.data = staff;
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading staff:', error);
          this.loading.set(false);
        },
      });
  }

  private setupFilterSubscriptions() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());

    this.groupControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());

    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());

    this.activeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());
  }

  private applyFilters() {
    const filter = {
      searchTerm: this.searchControl.value || undefined,
      groups: this.groupControl.value || undefined,
      availabilityStatus: this.statusControl.value || undefined,
      isActive: this.activeControl.value ?? undefined,
    };

    this.dataSource.filter = JSON.stringify(filter);

    // Reset to first page when applying filters
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  toggleStaffStatus(staff: StaffMember) {
    const action = staff.isActive
      ? this.staffService.deactivateStaff(staff.id)
      : this.staffService.reactivateStaff(staff.id);

    action.subscribe({
      next: () => this.loadStaff(),
      error: (error) => console.error('Error toggling staff status:', error),
    });
  }

  formatGroup(group: StaffGroup): string {
    const groupNames: Record<StaffGroup, string> = {
      Admin: 'Admin',
      ProjectManager: 'Project Manager',
      Technician: 'Technician',
      Supplier: 'Supplier',
      Client: 'Client',
    };
    return groupNames[group] || group;
  }

  formatStatus(status: AvailabilityStatus): string {
    const statusNames: Record<AvailabilityStatus, string> = {
      available: 'Available',
      busy: 'Busy',
      offline: 'Offline',
      vacation: 'On Vacation',
    };
    return statusNames[status] || status;
  }

  getStatusIcon(status: AvailabilityStatus): string {
    const icons: Record<AvailabilityStatus, string> = {
      available: 'check_circle',
      busy: 'schedule',
      offline: 'cancel',
      vacation: 'beach_access',
    };
    return icons[status] || 'help';
  }

  formatLastActive(_timestamp: unknown): string {
    // TODO: Implement proper date formatting
    return 'Recently';
  }

  openImportDialog() {
    const dialogRef = this.dialog.open(StaffImportComponent, {
      width: '600px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadStaff();
      }
    });
  }
}
