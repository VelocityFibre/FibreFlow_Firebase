import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { Observable } from 'rxjs';

import { RoleService } from '../../../../core/services/role.service';
import { Role } from '../../../../core/models/role.model';
import { RoleFormDialogComponent } from '../role-form-dialog/role-form-dialog.component';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule,
  ],
  template: `
    <div class="roles-container">
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <h1>Roles & Permissions</h1>
          <p class="subtitle">Manage user roles and their permissions</p>
        </div>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          Add Role
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon">
              <mat-icon>security</mat-icon>
            </div>
            <div class="stat-content">
              <h3>{{ (roles$ | async)?.length || 0 }}</h3>
              <p>Total Roles</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon system">
              <mat-icon>verified_user</mat-icon>
            </div>
            <div class="stat-content">
              <h3>{{ getSystemRolesCount() }}</h3>
              <p>System Roles</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon custom">
              <mat-icon>person_add</mat-icon>
            </div>
            <div class="stat-content">
              <h3>{{ getCustomRolesCount() }}</h3>
              <p>Custom Roles</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Roles Table -->
      <mat-card class="table-card">
        <mat-card-content>
          <div class="table-container" *ngIf="!loading; else loadingTemplate">
            <table mat-table [dataSource]="(roles$ | async) || []" class="roles-table">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Role Name</th>
                <td mat-cell *matCellDef="let role">
                  <div class="role-name">
                    <strong>{{ role.name }}</strong>
                    <mat-chip *ngIf="role.isSystem" class="system-badge">
                      <mat-icon inline>lock</mat-icon>
                      System
                    </mat-chip>
                  </div>
                </td>
              </ng-container>

              <!-- Description Column -->
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let role">{{ role.description }}</td>
              </ng-container>

              <!-- Permissions Column -->
              <ng-container matColumnDef="permissions">
                <th mat-header-cell *matHeaderCellDef>Permissions</th>
                <td mat-cell *matCellDef="let role">
                  <div class="permissions-preview">
                    <mat-chip-set>
                      <mat-chip *ngFor="let perm of getPermissionPreview(role.permissions)">
                        {{ perm }}
                      </mat-chip>
                      <mat-chip *ngIf="role.permissions.length > 3" class="more-chip">
                        +{{ role.permissions.length - 3 }} more
                      </mat-chip>
                    </mat-chip-set>
                  </div>
                </td>
              </ng-container>

              <!-- Users Column -->
              <ng-container matColumnDef="users">
                <th mat-header-cell *matHeaderCellDef>Users</th>
                <td mat-cell *matCellDef="let role">
                  <div class="user-count">
                    <mat-icon>people</mat-icon>
                    <span>{{ role.userCount || 0 }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let role">
                  <button mat-icon-button [matMenuTriggerFor]="menu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="viewRole(role)">
                      <mat-icon>visibility</mat-icon>
                      <span>View Details</span>
                    </button>
                    <button mat-menu-item (click)="editRole(role)" [disabled]="role.isSystem">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <button mat-menu-item (click)="duplicateRole(role)">
                      <mat-icon>content_copy</mat-icon>
                      <span>Duplicate</span>
                    </button>
                    <mat-divider></mat-divider>
                    <button
                      mat-menu-item
                      (click)="deleteRole(role)"
                      [disabled]="role.isSystem || role.userCount > 0"
                      class="delete-action"
                    >
                      <mat-icon>delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>

          <ng-template #loadingTemplate>
            <div class="loading-container">
              <mat-spinner></mat-spinner>
              <p>Loading roles...</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .roles-container {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 32px;
      }

      .header-content h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 500;
        color: #1a202c;
      }

      .subtitle {
        margin: 4px 0 0;
        color: #718096;
        font-size: 16px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 24px;
        margin-bottom: 32px;
      }

      .stat-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }

      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .stat-card mat-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e0f2fe;
        color: #0284c7;
      }

      .stat-icon.system {
        background: #dbeafe;
        color: #2563eb;
      }

      .stat-icon.custom {
        background: #e0e7ff;
        color: #4f46e5;
      }

      .stat-icon mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .stat-content h3 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
        color: #1a202c;
      }

      .stat-content p {
        margin: 0;
        color: #718096;
        font-size: 14px;
      }

      .table-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .table-container {
        overflow-x: auto;
      }

      .roles-table {
        width: 100%;
        background: transparent;
      }

      .role-name {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .system-badge {
        font-size: 11px !important;
        height: 20px !important;
        padding: 0 8px !important;
        background: #dbeafe !important;
        color: #2563eb !important;
      }

      .system-badge mat-icon {
        font-size: 14px !important;
        width: 14px !important;
        height: 14px !important;
        margin-right: 4px !important;
      }

      .permissions-preview mat-chip-set {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .permissions-preview mat-chip {
        font-size: 12px !important;
        height: 24px !important;
        padding: 0 8px !important;
        background: #f3f4f6 !important;
        color: #4b5563 !important;
      }

      .more-chip {
        background: #e5e7eb !important;
        color: #6b7280 !important;
        font-weight: 500;
      }

      .user-count {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #6b7280;
      }

      .user-count mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .delete-action {
        color: #ef4444;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        gap: 16px;
      }

      .loading-container p {
        color: #718096;
        margin: 0;
      }

      @media (max-width: 768px) {
        .roles-container {
          padding: 16px;
        }

        .header {
          flex-direction: column;
          gap: 16px;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class RolesListComponent implements OnInit {
  private roleService = inject(RoleService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  roles$!: Observable<Role[]>;
  displayedColumns: string[] = ['name', 'description', 'permissions', 'users', 'actions'];
  loading = true;

  // Role counts
  systemRolesCount = 0;
  customRolesCount = 0;
  rolesArray: Role[] = [];

  ngOnInit() {
    // Initialize default roles if needed
    this.roleService.initializeDefaultRoles().then(() => {
      this.loadRoles();
    });
  }

  loadRoles() {
    this.loading = true;
    this.roles$ = this.roleService.getRoles();
    this.roles$.subscribe((roles) => {
      this.rolesArray = roles;
      this.systemRolesCount = roles.filter((r) => r.isSystem).length;
      this.customRolesCount = roles.filter((r) => !r.isSystem).length;
      this.loading = false;
    });
  }

  getSystemRolesCount(): number {
    return this.systemRolesCount;
  }

  getCustomRolesCount(): number {
    return this.customRolesCount;
  }

  getPermissionPreview(permissions: string[]): string[] {
    return permissions.slice(0, 3).map((p) => this.formatPermissionName(p));
  }

  formatPermissionName(permissionId: string): string {
    // Convert permission ID to readable format
    return permissionId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  openCreateDialog() {
    const _dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { mode: 'create' },
      panelClass: 'role-dialog-container',
    });

    _dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Role created successfully', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  viewRole(role: Role) {
    const _dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { mode: 'view', role },
      panelClass: 'role-dialog-container',
    });
  }

  editRole(role: Role) {
    if (role.isSystem) {
      this.snackBar.open('System roles cannot be edited', 'Close', {
        duration: 3000,
      });
      return;
    }

    const _dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { mode: 'edit', role },
      panelClass: 'role-dialog-container',
    });

    _dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Role updated successfully', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  duplicateRole(role: Role) {
    const duplicatedRole = {
      ...role,
      name: `${role.name} (Copy)`,
      isSystem: false,
    };
    delete duplicatedRole.id;

    const _dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { mode: 'create', role: duplicatedRole },
      panelClass: 'role-dialog-container',
    });

    _dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open('Role duplicated successfully', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  async deleteRole(role: Role) {
    if (role.isSystem) {
      this.snackBar.open('System roles cannot be deleted', 'Close', {
        duration: 3000,
      });
      return;
    }

    if (role.userCount && role.userCount > 0) {
      this.snackBar.open('Cannot delete role with assigned users', 'Close', {
        duration: 3000,
      });
      return;
    }

    if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      try {
        await this.roleService.deleteRole(role.id!);
        this.snackBar.open('Role deleted successfully', 'Close', {
          duration: 3000,
        });
      } catch (error) {
        this.snackBar.open('Error deleting role', 'Close', {
          duration: 3000,
        });
      }
    }
  }
}
