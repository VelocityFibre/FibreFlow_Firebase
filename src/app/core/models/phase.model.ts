import { Timestamp } from '@angular/fire/firestore';

export interface Phase {
  id?: string;
  name: string;
  description: string;
  orderNo: number;
  status: PhaseStatus;
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;
  assignedTo?: string; // User ID
  assignedToDetails?: UserDetails; // Populated on read
  dependencies?: PhaseDependency[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  blockedReason?: string;
  progress?: number; // 0-100
}

export interface PhaseDependency {
  phaseId: string;
  type: DependencyType;
}

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start', // Previous phase must finish before this can start
  START_TO_START = 'start_to_start', // Can start when dependency starts
  FINISH_TO_FINISH = 'finish_to_finish', // Must finish when dependency finishes
}

export enum PhaseStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
}

export interface UserDetails {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export interface PhaseTemplate {
  id?: string;
  name: string;
  description: string;
  orderNo: number;
  isDefault: boolean;
  defaultDependencies?: PhaseDependency[];
}

export interface PhaseAssignment {
  phaseId: string;
  projectId: string;
  projectName: string;
  phaseName: string;
  assignedBy: string;
  assignedAt: Timestamp;
  status: PhaseStatus;
  dueDate?: Timestamp;
}

export interface PhaseNotification {
  id?: string;
  type: 'phase_assigned' | 'phase_completed' | 'phase_blocked' | 'phase_overdue';
  phaseId: string;
  projectId: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

// Default phase templates
export const DEFAULT_PHASES: Omit<PhaseTemplate, 'id'>[] = [
  {
    name: 'Planning',
    description: 'Initial project scoping and design',
    orderNo: 1,
    isDefault: true,
    defaultDependencies: [],
  },
  {
    name: 'Initiate Project (IP)',
    description: 'Setup and approval phase',
    orderNo: 2,
    isDefault: true,
    defaultDependencies: [{ phaseId: 'planning', type: DependencyType.FINISH_TO_START }],
  },
  {
    name: 'Work in Progress (WIP)',
    description: 'Active construction phase',
    orderNo: 3,
    isDefault: true,
    defaultDependencies: [{ phaseId: 'initiate-project', type: DependencyType.FINISH_TO_START }],
  },
  {
    name: 'Handover',
    description: 'Completion and client transition',
    orderNo: 4,
    isDefault: true,
    defaultDependencies: [{ phaseId: 'work-in-progress', type: DependencyType.FINISH_TO_START }],
  },
  {
    name: 'Handover Complete (HOC)',
    description: 'Delivery confirmation',
    orderNo: 5,
    isDefault: true,
    defaultDependencies: [{ phaseId: 'handover', type: DependencyType.FINISH_TO_START }],
  },
  {
    name: 'Final Acceptance Certificate (FAC)',
    description: 'Project closure',
    orderNo: 6,
    isDefault: true,
    defaultDependencies: [{ phaseId: 'handover-complete', type: DependencyType.FINISH_TO_START }],
  },
];
