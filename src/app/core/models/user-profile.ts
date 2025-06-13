export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  userGroup: 'admin' | 'project-manager' | 'technician' | 'supplier' | 'client';
  createdAt: Date;
  isActive: boolean;
  phoneNumber?: string;
  company?: string;
  lastLogin?: Date;
}

export interface UserPermissions {
  canCreateProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canViewFinancials: boolean;
  canManageUsers: boolean;
  canManageStock: boolean;
  canViewReports: boolean;
}

export const USER_GROUP_PERMISSIONS: Record<UserProfile['userGroup'], UserPermissions> = {
  admin: {
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: true,
    canViewFinancials: true,
    canManageUsers: true,
    canManageStock: true,
    canViewReports: true,
  },
  'project-manager': {
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: false,
    canViewFinancials: true,
    canManageUsers: false,
    canManageStock: true,
    canViewReports: true,
  },
  technician: {
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canViewFinancials: false,
    canManageUsers: false,
    canManageStock: true,
    canViewReports: false,
  },
  supplier: {
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canViewFinancials: false,
    canManageUsers: false,
    canManageStock: false,
    canViewReports: false,
  },
  client: {
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canViewFinancials: false,
    canManageUsers: false,
    canManageStock: false,
    canViewReports: false,
  },
};
