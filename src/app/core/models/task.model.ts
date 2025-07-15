import { Timestamp } from '@angular/fire/firestore';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface Task {
  id?: string;
  name: string;
  description?: string;
  phaseId: string;
  projectId: string;
  stepId?: string;
  orderNo: number;
  status: TaskStatus;
  priority: TaskPriority;
  isFlagged?: boolean; // Simple boolean flag
  assignedTo?: string;
  assignedToName?: string;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage: number;
  dueDate?: Timestamp;
  startDate?: Timestamp;
  completedDate?: Timestamp;
  notes?: string;
  dependencies?: string[];
  attachments?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  updatedBy?: string;

  // Additional fields populated on read
  projectName?: string;
  projectCode?: string;
  clientName?: string;
  phaseName?: string;
  stepName?: string;
}

export interface TaskAssignment {
  taskId: string;
  userId: string;
  assignedDate: Timestamp;
  assignedBy: string;
  notes?: string;
}

export interface TaskUpdate {
  taskId: string;
  updateType: 'status' | 'progress' | 'hours' | 'assignment' | 'general';
  oldValue?: string | number | TaskStatus | TaskPriority;
  newValue?: string | number | TaskStatus | TaskPriority;
  notes?: string;
  updatedBy: string;
  updatedAt: Timestamp;
}
