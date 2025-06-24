import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { StaffService } from '../../services/staff.service';
import { RoleService } from '../../../../core/services/role.service';
import { StaffMember, StaffGroup } from '../../models/staff.model';
import { Role } from '../../../../core/models/role.model';

@Component({
  selector: 'app-staff-import',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
    MatDialogModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Import Staff Members</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Click the button below to import the predefined staff members from the Excel screenshot.</p>
        <p>This will create:</p>
        <ul>
          <li>10 staff members with their roles and contact information</li>
          <li>7 role definitions (Senior Management, RPM, PM, CLO, Engineer, Site Supervisor, Admin)</li>
        </ul>
      </mat-card-content>
      <mat-card-actions>
        <button 
          mat-raised-button 
          color="primary" 
          (click)="importStaff()"
          [disabled]="importing"
        >
          <mat-spinner *ngIf="importing" diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
          {{ importing ? 'Importing...' : 'Import Staff Members' }}
        </button>
        <button mat-button (click)="dialogRef.close()" [disabled]="importing">Cancel</button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    mat-card {
      max-width: 600px;
      margin: 20px auto;
    }
    ul {
      margin-top: 8px;
    }
    mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class StaffImportComponent {
  private staffService = inject(StaffService);
  private roleService = inject(RoleService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<StaffImportComponent>);
  
  importing = false;

  // Staff data from the screenshot - simplified for compatibility
  private staffData = [
    {
      name: 'Lew Hofmeyr',
      email: 'lew@velocityfibre.co.za',
      phone: '+27 77 609 2092',
      employeeId: 'VF001',
      primaryGroup: 'Admin' as StaffGroup,
      position: 'Senior Management',
      roleId: 'senior-management'
    },
    {
      name: 'Hein van Vuuren',
      email: 'hein@velocityfibre.co.za',
      phone: '+27 82 321 6574',
      employeeId: 'VF002',
      primaryGroup: 'Admin' as StaffGroup,
      position: 'Senior Management',
      roleId: 'senior-management'
    },
    {
      name: 'Wian Musgrave',
      email: 'wian@velocityfibre.co.za',
      phone: '+27 72 956 7350',
      employeeId: 'VF003',
      primaryGroup: 'ProjectManager' as StaffGroup,
      position: 'RPM',
      roleId: 'rpm'
    },
    {
      name: 'Lenardt Meyer',
      email: 'lenardt@velocityfibre.co.za',
      phone: '+2767 630 6884',
      employeeId: 'VF004',
      primaryGroup: 'ProjectManager' as StaffGroup,
      position: 'PM',
      roleId: 'pm'
    },
    {
      name: 'Leonel Felix',
      email: 'felix@velocityfibre.co.za',
      phone: '',
      employeeId: 'VF005',
      primaryGroup: 'Admin' as StaffGroup,
      position: 'CLO',
      roleId: 'clo'
    },
    {
      name: 'Marchael Meyer',
      email: 'marchael@velocity.co.za',
      phone: '+27 68 114 1064',
      employeeId: 'VF006',
      primaryGroup: 'Technician' as StaffGroup,
      position: 'Engineer',
      roleId: 'engineer'
    },
    {
      name: 'Janice George',
      email: 'janice@velocityfibre.co.za',
      phone: '(082) 994-6865',
      employeeId: 'VF007',
      primaryGroup: 'Admin' as StaffGroup,
      position: 'Admin',
      roleId: 'admin'
    },
    {
      name: 'Kylin Musgrave',
      email: 'kylin@velocityfibre.co.za',
      phone: '(082) 925-9234',
      employeeId: 'VF008',
      primaryGroup: 'Admin' as StaffGroup,
      position: 'Admin',
      roleId: 'admin'
    },
    {
      name: 'Jody Lenardt',
      email: 'jody@velocityfibre.co.za',
      phone: '',
      employeeId: 'VF009',
      primaryGroup: 'ProjectManager' as StaffGroup,
      position: 'PM',
      roleId: 'pm'
    },
    {
      name: 'Gert van Vuuren',
      email: 'gert@velocityfibre.co.za',
      phone: '',
      employeeId: 'VF010',
      primaryGroup: 'Technician' as StaffGroup,
      position: 'Site Supervisor',
      roleId: 'site-supervisor'
    }
  ];

  // Role mappings
  private roles: Partial<Role>[] = [
    {
      id: 'senior-management',
      name: 'Senior Management',
      description: 'Senior management team members',
      permissions: [
        'projects_view', 'projects_manage',
        'tasks_view', 'tasks_manage',
        'staff_view', 'staff_manage',
        'clients_view', 'clients_manage',
        'suppliers_view', 'suppliers_manage',
        'stock_view', 'stock_manage',
        'reports_view', 'reports_generate',
        'settings_view', 'settings_manage',
        'roles_view', 'roles_manage'
      ],
      isSystem: true
    },
    {
      id: 'rpm',
      name: 'RPM',
      description: 'Regional Project Manager',
      permissions: [
        'projects_view', 'projects_manage',
        'tasks_view', 'tasks_manage',
        'staff_view', 'staff_manage',
        'clients_view', 'clients_manage',
        'suppliers_view', 'suppliers_manage',
        'stock_view',
        'reports_view', 'reports_generate'
      ],
      isSystem: true
    },
    {
      id: 'pm',
      name: 'PM',
      description: 'Project Manager',
      permissions: [
        'projects_view',
        'tasks_view', 'tasks_manage',
        'staff_view',
        'clients_view',
        'suppliers_view',
        'stock_view',
        'reports_view'
      ],
      isSystem: true
    },
    {
      id: 'clo',
      name: 'CLO',
      description: 'Chief Logistics Officer',
      permissions: [
        'projects_view',
        'tasks_view',
        'staff_view',
        'suppliers_view', 'suppliers_manage',
        'stock_view', 'stock_manage',
        'reports_view', 'reports_generate'
      ],
      isSystem: true
    },
    {
      id: 'engineer',
      name: 'Engineer',
      description: 'Engineering staff',
      permissions: [
        'projects_view',
        'tasks_view',
        'stock_view',
        'reports_view'
      ],
      isSystem: true
    },
    {
      id: 'site-supervisor',
      name: 'Site Supervisor',
      description: 'On-site supervision staff',
      permissions: [
        'projects_view',
        'tasks_view',
        'staff_view',
        'stock_view',
        'reports_view'
      ],
      isSystem: true
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Administrative staff',
      permissions: [
        'projects_view',
        'tasks_view',
        'staff_view',
        'clients_view', 'clients_manage',
        'suppliers_view', 'suppliers_manage',
        'stock_view',
        'reports_view',
        'settings_view'
      ],
      isSystem: true
    }
  ];

  async importStaff() {
    this.importing = true;
    let successCount = 0;
    let roleSuccessCount = 0;

    try {
      // First create roles
      console.log('Creating roles...');
      for (const role of this.roles) {
        try {
          await this.roleService.createRole(role as Role);
          roleSuccessCount++;
          console.log(`✓ Role created: ${role.name}`);
        } catch (error) {
          console.error(`Failed to create role ${role.name}:`, error);
        }
      }

      // Then create staff members
      console.log('Creating staff members...');
      for (const staff of this.staffData) {
        try {
          // Create a proper StaffMember object with required fields
          const newStaff: Partial<StaffMember> = {
            ...staff,
            isActive: true,
            availability: {
              status: 'available',
              workingHours: {},
              currentTaskCount: 0,
              maxConcurrentTasks: 5
            },
            activity: {
              lastLogin: null,
              lastActive: null,
              tasksCompleted: 0,
              tasksInProgress: 0,
              tasksFlagged: 0,
              totalProjectsWorked: 0,
              averageTaskCompletionTime: 0
            },
            skills: [],
            certifications: [],
            emergencyContact: {
              name: '',
              phone: '',
              relationship: ''
            }
          };

          await this.staffService.createStaff(newStaff as StaffMember);
          successCount++;
          console.log(`✓ Staff created: ${staff.name}`);
        } catch (error) {
          console.error(`Failed to create staff ${staff.name}:`, error);
        }
      }

      this.snackBar.open(
        `Import completed! Created ${roleSuccessCount} roles and ${successCount} staff members.`,
        'Close',
        { duration: 5000 }
      );
      
      // Close dialog on success
      this.dialogRef.close(true);

    } catch (error) {
      console.error('Import error:', error);
      this.snackBar.open(
        'Error during import. Check console for details.',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.importing = false;
    }
  }
}