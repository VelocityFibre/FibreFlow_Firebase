import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  setDoc,
  updateDoc,
  deleteDoc,
  // query,
  // where,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, map, of } from 'rxjs';
import {
  Role,
  Permission,
  DEFAULT_PERMISSIONS,
  SYSTEM_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from '../models/role.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private rolesCollection = collection(this.firestore, 'roles');

  // Get all roles
  getRoles(): Observable<Role[]> {
    return collectionData(this.rolesCollection, { idField: 'id' }) as Observable<Role[]>;
  }

  // Get a single role by ID
  getRole(id: string): Observable<Role | undefined> {
    const roleDoc = doc(this.firestore, 'roles', id);
    return docData(roleDoc, { idField: 'id' }) as Observable<Role>;
  }

  // Get all available permissions
  getPermissions(): Observable<Permission[]> {
    return of(DEFAULT_PERMISSIONS);
  }

  // Create a new role
  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const currentUser = await this.authService.getCurrentUser();
    const newRole: Omit<Role, 'id'> = {
      ...role,
      isSystem: false,
      userCount: 0,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      createdBy: currentUser?.uid || 'system',
      updatedBy: currentUser?.uid || 'system',
    };

    const roleDoc = doc(this.rolesCollection);
    await setDoc(roleDoc, newRole);
    return roleDoc.id;
  }

  // Update an existing role
  async updateRole(id: string, updates: Partial<Role>): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();
    const roleDoc = doc(this.firestore, 'roles', id);

    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser?.uid || 'system',
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    delete updateData.isSystem;

    await updateDoc(roleDoc, updateData);
  }

  // Delete a role (only non-system roles)
  async deleteRole(id: string): Promise<void> {
    const roleDoc = doc(this.firestore, 'roles', id);
    await deleteDoc(roleDoc);
  }

  // Initialize default roles (call this during app setup)
  async initializeDefaultRoles(): Promise<void> {
    try {
      const roles = await new Promise<Role[]>((resolve) => {
        this.getRoles()
          .pipe(map((roles) => roles))
          .subscribe(roles => resolve(roles));
      });

      if (!roles || roles.length === 0) {
        console.log('No roles found, creating default roles...');
        // Create default roles
        const defaultRoles: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[] = [
          {
            name: 'Admin',
            description: 'Full system access with all permissions',
            permissions: DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.ADMIN],
            isSystem: true,
            userCount: 0,
            createdBy: 'system',
            updatedBy: 'system',
          },
          {
            name: 'Project Manager',
            description: 'Manage projects, tasks, and teams',
            permissions: DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.PROJECT_MANAGER],
            isSystem: true,
            userCount: 0,
            createdBy: 'system',
            updatedBy: 'system',
          },
          {
            name: 'Sales',
            description: 'Manage clients and view project information',
            permissions: DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.SALES],
            isSystem: true,
            userCount: 0,
            createdBy: 'system',
            updatedBy: 'system',
          },
          {
            name: 'Technician',
            description: 'Field technician with task and stock viewing permissions',
            permissions: DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.TECHNICIAN],
            isSystem: true,
            userCount: 0,
            createdBy: 'system',
            updatedBy: 'system',
          },
          {
            name: 'Data Capture',
            description: 'Data entry and stock management permissions',
            permissions: DEFAULT_ROLE_PERMISSIONS[SYSTEM_ROLES.DATA_CAPTURE],
            isSystem: true,
            userCount: 0,
            createdBy: 'system',
            updatedBy: 'system',
          },
        ];

        // Create all default roles
        for (const role of defaultRoles) {
          await this.createRole(role);
        }
        console.log('Default roles created successfully');
      } else {
        console.log(`Found ${roles.length} existing roles`);
      }
    } catch (error) {
      console.error('Error initializing default roles:', error);
    }
  }

  // Check if a user has a specific permission
  async hasPermission(_userId: string, _permissionId: string): Promise<boolean> {
    // This would need to be implemented based on your user-role relationship
    // For now, returning true for demonstration
    return true;
  }

  // Get permissions grouped by category
  getPermissionsByCategory(): Observable<Map<string, Permission[]>> {
    return of(DEFAULT_PERMISSIONS).pipe(
      map((permissions) => {
        const grouped = new Map<string, Permission[]>();
        permissions.forEach((permission) => {
          const category = permission.category;
          if (!grouped.has(category)) {
            grouped.set(category, []);
          }
          grouped.get(category)!.push(permission);
        });
        return grouped;
      }),
    );
  }
}
