import { Timestamp } from '@angular/fire/firestore';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: PermissionCategory;
  actions: string[]; // ['view', 'create', 'edit', 'delete']
}

export enum PermissionCategory {
  PROJECTS = 'projects',
  TASKS = 'tasks',
  STAFF = 'staff',
  CLIENTS = 'clients',
  SUPPLIERS = 'suppliers',
  STOCK = 'stock',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  ROLES = 'roles',
}

export interface Role {
  id?: string;
  name: string;
  description: string;
  permissions: string[]; // Array of permission IDs
  isSystem?: boolean; // System roles cannot be deleted
  userCount?: number; // Number of users with this role
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  SALES: 'sales',
  TECHNICIAN: 'technician',
  DATA_CAPTURE: 'data_capture',
};

// Default permissions structure
export const DEFAULT_PERMISSIONS: Permission[] = [
  // Projects
  {
    id: 'projects_view',
    name: 'View Projects',
    description: 'View project details and information',
    category: PermissionCategory.PROJECTS,
    actions: ['view'],
  },
  {
    id: 'projects_manage',
    name: 'Manage Projects',
    description: 'Create, edit, and delete projects',
    category: PermissionCategory.PROJECTS,
    actions: ['create', 'edit', 'delete'],
  },
  // Tasks
  {
    id: 'tasks_view',
    name: 'View Tasks',
    description: 'View task details and information',
    category: PermissionCategory.TASKS,
    actions: ['view'],
  },
  {
    id: 'tasks_manage',
    name: 'Manage Tasks',
    description: 'Create, edit, and delete tasks',
    category: PermissionCategory.TASKS,
    actions: ['create', 'edit', 'delete'],
  },
  // Staff
  {
    id: 'staff_view',
    name: 'View Staff',
    description: 'View staff members and their information',
    category: PermissionCategory.STAFF,
    actions: ['view'],
  },
  {
    id: 'staff_manage',
    name: 'Manage Staff',
    description: 'Add, edit, and remove staff members',
    category: PermissionCategory.STAFF,
    actions: ['create', 'edit', 'delete'],
  },
  // Clients
  {
    id: 'clients_view',
    name: 'View Clients',
    description: 'View client information',
    category: PermissionCategory.CLIENTS,
    actions: ['view'],
  },
  {
    id: 'clients_manage',
    name: 'Manage Clients',
    description: 'Add, edit, and remove clients',
    category: PermissionCategory.CLIENTS,
    actions: ['create', 'edit', 'delete'],
  },
  // Suppliers
  {
    id: 'suppliers_view',
    name: 'View Suppliers',
    description: 'View supplier information',
    category: PermissionCategory.SUPPLIERS,
    actions: ['view'],
  },
  {
    id: 'suppliers_manage',
    name: 'Manage Suppliers',
    description: 'Add, edit, and remove suppliers',
    category: PermissionCategory.SUPPLIERS,
    actions: ['create', 'edit', 'delete'],
  },
  // Stock
  {
    id: 'stock_view',
    name: 'View Stock',
    description: 'View stock items and inventory',
    category: PermissionCategory.STOCK,
    actions: ['view'],
  },
  {
    id: 'stock_manage',
    name: 'Manage Stock',
    description: 'Add, edit, and manage stock items',
    category: PermissionCategory.STOCK,
    actions: ['create', 'edit', 'delete'],
  },
  // Reports
  {
    id: 'reports_view',
    name: 'View Reports',
    description: 'Access and view reports',
    category: PermissionCategory.REPORTS,
    actions: ['view'],
  },
  {
    id: 'reports_generate',
    name: 'Generate Reports',
    description: 'Create and export reports',
    category: PermissionCategory.REPORTS,
    actions: ['create', 'export'],
  },
  // Settings
  {
    id: 'settings_view',
    name: 'View Settings',
    description: 'View system settings',
    category: PermissionCategory.SETTINGS,
    actions: ['view'],
  },
  {
    id: 'settings_manage',
    name: 'Manage Settings',
    description: 'Modify system settings',
    category: PermissionCategory.SETTINGS,
    actions: ['edit'],
  },
  // Roles
  {
    id: 'roles_view',
    name: 'View Roles',
    description: 'View roles and permissions',
    category: PermissionCategory.ROLES,
    actions: ['view'],
  },
  {
    id: 'roles_manage',
    name: 'Manage Roles',
    description: 'Create, edit, and delete roles',
    category: PermissionCategory.ROLES,
    actions: ['create', 'edit', 'delete'],
  },
];

// Default role configurations
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  [SYSTEM_ROLES.ADMIN]: DEFAULT_PERMISSIONS.map((p) => p.id), // Admin gets all permissions
  [SYSTEM_ROLES.PROJECT_MANAGER]: [
    'projects_view',
    'projects_manage',
    'tasks_view',
    'tasks_manage',
    'staff_view',
    'clients_view',
    'clients_manage',
    'suppliers_view',
    'stock_view',
    'reports_view',
    'reports_generate',
  ],
  [SYSTEM_ROLES.SALES]: ['projects_view', 'clients_view', 'clients_manage', 'reports_view'],
  [SYSTEM_ROLES.TECHNICIAN]: ['projects_view', 'tasks_view', 'stock_view', 'reports_view'],
  [SYSTEM_ROLES.DATA_CAPTURE]: [
    'projects_view',
    'tasks_view',
    'tasks_manage',
    'stock_view',
    'stock_manage',
    'reports_view',
  ],
};
