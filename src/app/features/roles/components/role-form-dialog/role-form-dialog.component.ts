import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';

import { RoleService } from '../../../../core/services/role.service';
import { Role, Permission } from '../../../../core/models/role.model';

interface DialogData {
  mode: 'create' | 'edit' | 'view';
  role?: Role;
}

@Component({
  selector: 'app-role-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <div style="display: flex; align-items: center;">
        <mat-icon class="title-icon">{{ getTitleIcon() }}</mat-icon>
        <span>{{ getTitle() }}</span>
      </div>
    </h2>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="roleForm" class="role-form">
        <!-- Basic Information -->
        <div class="form-section">
          <h3 class="section-title">Basic Information</h3>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Role Name</mat-label>
            <input
              matInput
              formControlName="name"
              placeholder="e.g., Marketing Manager"
              [readonly]="isViewMode || (data.role?.isSystem && isEditMode)"
            />
            <mat-error *ngIf="roleForm.get('name')?.hasError('required')">
              Role name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea
              matInput
              formControlName="description"
              rows="3"
              placeholder="Describe the purpose and responsibilities of this role"
              [readonly]="isViewMode || (data.role?.isSystem && isEditMode)"
            >
            </textarea>
            <mat-error *ngIf="roleForm.get('description')?.hasError('required')">
              Description is required
            </mat-error>
          </mat-form-field>
        </div>

        <mat-divider></mat-divider>

        <!-- Permissions -->
        <div class="form-section">
          <h3 class="section-title">
            Permissions
            <span class="permission-count"> {{ getSelectedPermissionsCount() }} selected </span>
          </h3>

          <div class="quick-actions" *ngIf="!isViewMode && !(data.role?.isSystem && isEditMode)">
            <button mat-stroked-button type="button" (click)="selectAllPermissions()">
              <mat-icon>check_box</mat-icon>
              Select All
            </button>
            <button mat-stroked-button type="button" (click)="clearAllPermissions()">
              <mat-icon>check_box_outline_blank</mat-icon>
              Clear All
            </button>
          </div>

          <mat-accordion class="permissions-accordion">
            <mat-expansion-panel
              *ngFor="let category of permissionCategories"
              [expanded]="expandedCategories.has(category.key)"
            >
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <div class="category-header">
                    <mat-icon>{{ getCategoryIcon(category.key) }}</mat-icon>
                    <span>{{ formatCategoryName(category.key) }}</span>
                    <mat-chip
                      class="category-count"
                      [matTooltip]="
                        getCategorySelectedCount(category.key) +
                        ' of ' +
                        category.permissions.length +
                        ' selected'
                      "
                    >
                      {{ getCategorySelectedCount(category.key) }}/{{ category.permissions.length }}
                    </mat-chip>
                  </div>
                </mat-panel-title>
              </mat-expansion-panel-header>

              <div class="permissions-grid">
                <div *ngFor="let permission of category.permissions" class="permission-item">
                  <mat-checkbox
                    [checked]="isPermissionSelected(permission.id)"
                    (change)="togglePermission(permission.id)"
                    [disabled]="isViewMode || (data.role?.isSystem && isEditMode)"
                    [matTooltip]="permission.description"
                    matTooltipPosition="above"
                  >
                    <div class="permission-content">
                      <strong>{{ permission.name }}</strong>
                      <small>{{ permission.description }}</small>
                    </div>
                  </mat-checkbox>
                </div>
              </div>
            </mat-expansion-panel>
          </mat-accordion>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ isViewMode ? 'Close' : 'Cancel' }}
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSubmit()"
        [disabled]="!roleForm.valid || loading || isViewMode"
        *ngIf="!isViewMode"
      >
        <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
        <span *ngIf="!loading">{{ isEditMode ? 'Update' : 'Create' }} Role</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .title-icon {
        margin-right: 8px;
        vertical-align: middle;
      }

      .dialog-content {
        max-height: 80vh;
        overflow-y: auto;
        padding: 0;
      }

      .role-form {
        width: 100%;
        min-width: 400px;
        max-width: 800px;
        margin: 0 auto;
      }

      .form-section {
        margin-bottom: 24px;
        padding: 0 24px;
      }

      .form-section:first-child {
        padding-top: 24px;
      }

      .section-title {
        font-size: 18px;
        font-weight: 500;
        color: #1a202c;
        margin: 0 0 16px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .permission-count {
        font-size: 14px;
        font-weight: 400;
        color: #718096;
      }

      .full-width {
        width: 100%;
      }

      mat-divider {
        margin: 24px 0;
      }

      /* Ensure proper label styling */
      ::ng-deep .mat-mdc-form-field {
        width: 100%;
      }

      ::ng-deep .mat-mdc-text-field-wrapper {
        padding-bottom: 0 !important;
      }

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        margin-top: 0.25rem !important;
      }

      .quick-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        padding: 0 24px;
      }

      .permissions-accordion {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        margin: 0 24px 16px 24px;
      }

      .category-header {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-width: 0;
        overflow: hidden;
      }

      .category-header span {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .category-header mat-icon {
        color: #4a5568;
      }

      .category-count {
        margin-left: auto;
        font-size: 12px !important;
        min-height: 20px !important;
        line-height: 20px !important;
        padding: 0 8px !important;
        background: #edf2f7 !important;
        color: #4a5568 !important;
        border-radius: 10px;
        white-space: nowrap;
      }

      .permissions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
        padding: 16px;
        background: #f7fafc;
      }

      .permission-item {
        display: flex;
        align-items: flex-start;
        background: white;
        padding: 12px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        transition: all 0.2s ease;
      }

      .permission-item:hover {
        border-color: #cbd5e0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      ::ng-deep .permission-item .mat-mdc-checkbox {
        margin-top: -4px;
      }

      .permission-content {
        display: flex;
        flex-direction: column;
        margin-left: 8px;
        flex: 1;
        min-width: 0;
      }

      .permission-content strong {
        font-size: 14px;
        font-weight: 500;
        color: #2d3748;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .permission-content small {
        font-size: 12px;
        color: #718096;
        line-height: 1.4;
        display: block;
        white-space: normal;
        word-wrap: break-word;
      }

      mat-dialog-actions {
        padding: 16px 24px !important;
        gap: 8px;
        border-top: 1px solid #e2e8f0;
        background: #f7fafc;
        margin: 0 !important;
      }

      mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }

      :host ::ng-deep {
        .mat-expansion-panel-header {
          background: #f7fafc !important;
          min-height: 48px;
          padding: 0 16px;
        }

        .mat-expansion-panel-header:hover {
          background: #edf2f7 !important;
        }

        .mat-expansion-panel-body {
          padding: 0 !important;
        }

        .mat-expansion-panel-header-title {
          flex-grow: 1;
          margin-right: 16px;
        }

        .mdc-dialog__container {
          width: 100%;
        }

        .mat-mdc-dialog-container {
          max-width: 90vw !important;
        }
      }
    `,
  ],
})
export class RoleFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  public dialogRef = inject(MatDialogRef<RoleFormDialogComponent>);
  public data: DialogData = inject(MAT_DIALOG_DATA);

  roleForm!: FormGroup;
  loading = false;
  permissions$!: Observable<Permission[]>;
  permissionCategories: { key: string; permissions: Permission[] }[] = [];
  expandedCategories = new Set<string>();
  selectedPermissions = new Set<string>();

  get isViewMode(): boolean {
    return this.data.mode === 'view';
  }

  get isEditMode(): boolean {
    return this.data.mode === 'edit';
  }

  ngOnInit() {
    this.initializeForm();
    this.loadPermissions();

    if (this.data.role) {
      this.populateForm(this.data.role);
    }
  }

  initializeForm() {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      permissions: [[]],
    });
  }

  loadPermissions() {
    this.roleService.getPermissionsByCategory().subscribe((grouped) => {
      this.permissionCategories = Array.from(grouped.entries()).map(([key, permissions]) => ({
        key,
        permissions,
      }));

      // Expand all categories by default
      this.permissionCategories.forEach((cat) => this.expandedCategories.add(cat.key));
    });
  }

  populateForm(role: Role) {
    this.roleForm.patchValue({
      name: role.name,
      description: role.description,
    });

    // Set selected permissions
    role.permissions.forEach((p) => this.selectedPermissions.add(p));
  }

  getTitleIcon(): string {
    switch (this.data.mode) {
      case 'create':
        return 'add_circle';
      case 'edit':
        return 'edit';
      case 'view':
        return 'visibility';
      default:
        return 'security';
    }
  }

  getTitle(): string {
    switch (this.data.mode) {
      case 'create':
        return 'Create New Role';
      case 'edit':
        return 'Edit Role';
      case 'view':
        return 'View Role Details';
      default:
        return 'Role';
    }
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      projects: 'folder',
      tasks: 'task_alt',
      staff: 'people',
      clients: 'business',
      suppliers: 'local_shipping',
      stock: 'inventory_2',
      reports: 'assessment',
      settings: 'settings',
      roles: 'admin_panel_settings',
    };
    return icons[category] || 'category';
  }

  formatCategoryName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions.has(permissionId);
  }

  togglePermission(permissionId: string) {
    if (this.selectedPermissions.has(permissionId)) {
      this.selectedPermissions.delete(permissionId);
    } else {
      this.selectedPermissions.add(permissionId);
    }
  }

  getSelectedPermissionsCount(): number {
    return this.selectedPermissions.size;
  }

  getCategorySelectedCount(category: string): number {
    const categoryPermissions =
      this.permissionCategories.find((c) => c.key === category)?.permissions || [];
    return categoryPermissions.filter((p) => this.selectedPermissions.has(p.id)).length;
  }

  selectAllPermissions() {
    this.permissionCategories.forEach((category) => {
      category.permissions.forEach((permission) => {
        this.selectedPermissions.add(permission.id);
      });
    });
  }

  clearAllPermissions() {
    this.selectedPermissions.clear();
  }

  async onSubmit() {
    if (this.roleForm.valid && !this.loading) {
      this.loading = true;

      try {
        const formValue = this.roleForm.value;
        const roleData = {
          ...formValue,
          permissions: Array.from(this.selectedPermissions),
        };

        if (this.data.mode === 'edit' && this.data.role?.id) {
          await this.roleService.updateRole(this.data.role.id, roleData);
        } else {
          await this.roleService.createRole(roleData);
        }

        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error saving role:', error);
      } finally {
        this.loading = false;
      }
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
