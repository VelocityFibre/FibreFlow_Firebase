export interface PersonalTodo {
  id?: string;
  userId: string;
  text: string;
  description?: string;
  source: TodoSource;
  meetingId?: string;
  meetingTitle?: string;
  projectId?: string;
  projectName?: string;
  dueDate?: Date;
  priority: TodoPriority;
  status: TodoStatus;
  completed: boolean;
  completedAt?: Date;
  assignedBy?: string;
  assignedByName?: string;
  category?: string;
  tags?: string[];
  reminder?: TodoReminder;
  createdAt: Date;
  updatedAt: Date;
}

export enum TodoSource {
  MEETING = 'meeting',
  MANUAL = 'manual',
  EMAIL = 'email',
  PROJECT_TASK = 'project_task',
}

export enum TodoPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TodoStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DEFERRED = 'deferred',
}

export interface TodoReminder {
  enabled: boolean;
  date: Date;
  sent: boolean;
  sentAt?: Date;
}

export interface TodoFilter {
  userId?: string;
  status?: TodoStatus[];
  priority?: TodoPriority[];
  source?: TodoSource[];
  dueDate?: {
    from?: Date;
    to?: Date;
  };
  category?: string[];
  tags?: string[];
  search?: string;
}

export interface TodoStats {
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
  bySource: {
    meeting: number;
    manual: number;
    email: number;
    projectTask: number;
  };
}
