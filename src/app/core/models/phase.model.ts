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
    description: 'Comprehensive project planning including commercial, technical, and resource planning',
    orderNo: 1,
    isDefault: true,
    defaultDependencies: [],
  },
  {
    name: 'Initiate Project (IP)',
    description: 'Project kickoff, resource allocation, and preparation activities',
    orderNo: 2,
    isDefault: true,
    defaultDependencies: [{ phaseId: 'planning', type: DependencyType.FINISH_TO_START }],
  },
  {
    name: 'Work in Progress (WIP)',
    description: 'Active implementation including installation, configuration, and testing',
    orderNo: 3,
    isDefault: true,
    defaultDependencies: [{ phaseId: 'initiate-project', type: DependencyType.FINISH_TO_START }],
  },
  {
    name: 'Handover (HOC)',
    description: 'System handover, documentation transfer, and knowledge transfer',
    orderNo: 4,
    isDefault: true,
    defaultDependencies: [{ phaseId: 'work-in-progress', type: DependencyType.FINISH_TO_START }],
  },
  {
    name: 'Full Acceptance (FAC)',
    description: 'Final acceptance testing, issue resolution, and project closure',
    orderNo: 5,
    isDefault: true,
    defaultDependencies: [{ phaseId: 'handover', type: DependencyType.FINISH_TO_START }],
  },
];
