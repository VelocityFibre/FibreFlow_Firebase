import { ActionItem } from '../../meetings/models/meeting.model';

export interface ActionItemManagement {
  id?: string;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  originalActionItem: ActionItem;
  updates: ActionItemUpdates;
  status: ActionItemStatus;
  history: ActionItemHistory[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ActionItemUpdates {
  priority?: 'high' | 'medium' | 'low';
  assignee?: string;
  assigneeEmail?: string;
  dueDate?: string;
  status?: ActionItemStatus;
  notes?: string;
  tags?: string[];
}

export enum ActionItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ActionItemHistory {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'completed';
  field?: string;
  oldValue?: any;
  newValue?: any;
  notes?: string;
}

export interface ActionItemFilter {
  status?: ActionItemStatus[];
  assignee?: string;
  priority?: ('high' | 'medium' | 'low')[];
  dueDateFrom?: string;
  dueDateTo?: string;
  meetingId?: string;
  searchText?: string;
}

export interface ActionItemStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  byAssignee: {
    [assignee: string]: number;
  };
}
