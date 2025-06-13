import { Component, Inject, OnInit, inject } from '@angular/core';
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
import { Role, Permission, PermissionCategory } from '../../../../core/models/role.model';

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
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">{{ getTitleIcon() }}</mat-icon>
      {{ getTitle() }}
    </h2>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="roleForm" class="role-form">
        
        <!-- Basic Information -->
        <div class="form-section">
          <h3 class="section-title">Basic Information</h3>
          
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Role Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g., Marketing Manager"
                   [readonly]="isViewMode || (data.role?.isSystem && isEditMode)">
            <mat-error *ngIf="roleForm.get('name')?.hasError('required')">
              Role name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3" 
                      placeholder="Describe the purpose and responsibilities of this role"
                      [readonly]="isViewMode || (data.role?.isSystem && isEditMode)">
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
            <span class="permission-count">
              {{ getSelectedPermissionsCount() }} selected
            </span>
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
            <mat-expansion-panel *ngFor="let category of permissionCategories" 
                                 [expanded]="expandedCategories.has(category.key)">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <div class="category-header">
                    <mat-icon>{{ getCategoryIcon(category.key) }}</mat-icon>
                    <span>{{ formatCategoryName(category.key) }}</span>
                    <mat-chip class="category-count">
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
                    [disabled]="isViewMode || (data.role?.isSystem && isEditMode)">
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
      <button mat-raised-button color="primary" 
              (click)="onSubmit()" 
              [disabled]="!roleForm.valid || loading || isViewMode"
              *ngIf="!isViewMode">
        <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
        <span *ngIf="!loading">{{ isEditMode ? 'Update' : 'Create' }} Role</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .title-icon {
      margin-right: 8px;
      vertical-align: middle;
    }

    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
      padding: 24px;
    }

    .role-form {
      width: 100%;
      min-width: 600px;
    }

    .form-section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 16px;
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

    .quick-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .permissions-accordion {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .category-header mat-icon {
      color: #4a5568;
    }

    .category-count {
      margin-left: auto;
      font-size: 12px !important;
      height: 20px !important;
      padding: 0 8px !important;
      background: #edf2f7 !important;
      color: #4a5568 !important;
    }

    .permissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
      padding: 16px;
    }

    .permission-item {
      display: flex;
      align-items: flex-start;
    }

    .permission-content {
      display: flex;
      flex-direction: column;
      margin-left: 8px;
    }

    .permission-content strong {
      font-size: 14px;
      color: #2d3748;
      margin-bottom: 2px;
    }

    .permission-content small {
      font-size: 12px;
      color: #718096;
      line-height: 1.4;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      gap: 8px;
    }

    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    :host ::ng-deep {
      .mat-expansion-panel-header {
        background: #f7fafc !important;
      }

      .mat-expansion-panel-header:hover {
        background: #edf2f7 !important;
      }

      .mat-expansion-panel-body {
        padding: 0 !important;
      }
    }
  `]
})
export class RoleFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  
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

  constructor(
    public dialogRef: MatDialogRef<RoleFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

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
      permissions: [[]]
    });
  }

  loadPermissions() {
    this.roleService.getPermissionsByCategory().subscribe(grouped => {
      this.permissionCategories = Array.from(grouped.entries()).map(([key, permissions]) => ({
        key,
        permissions
      }));
      
      // Expand all categories by default
      this.permissionCategories.forEach(cat => this.expandedCategories.add(cat.key));
    });
  }

  populateForm(role: Role) {
    this.roleForm.patchValue({
      name: role.name,
      description: role.description
    });
    
    // Set selected permissions
    role.permissions.forEach(p => this.selectedPermissions.add(p));
  }

  getTitleIcon(): string {
    switch (this.data.mode) {
      case 'create': return 'add_circle';
      case 'edit': return 'edit';
      case 'view': return 'visibility';
      default: return 'security';
    }
  }

  getTitle(): string {
    switch (this.data.mode) {
      case 'create': return 'Create New Role';
      case 'edit': return 'Edit Role';
      case 'view': return 'View Role Details';
      default: return 'Role';
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
      roles: 'admin_panel_settings'
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
    const categoryPermissions = this.permissionCategories
      .find(c => c.key === category)?.permissions || [];
    return categoryPermissions.filter(p => this.selectedPermissions.has(p.id)).length;
  }

  selectAllPermissions() {
    this.permissionCategories.forEach(category => {
      category.permissions.forEach(permission => {
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
          permissions: Array.from(this.selectedPermissions)
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