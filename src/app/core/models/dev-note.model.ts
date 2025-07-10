export interface DevNote {
  id?: string;
  route: string; // e.g., '/projects', '/daily-progress'
  pageTitle: string; // Human-readable page name
  notes: string; // Markdown-supported notes
  tasks: DevTask[]; // Array of development tasks
  errors: PageError[]; // Logged errors for this page
  lastUpdated: Date;
  updatedBy: string; // User email who made changes
  createdAt: Date;
  createdBy: string;
}

export interface DevTask {
  id: string;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  completedAt?: Date;
  assignee?: string;
}

export interface PageError {
  id: string;
  message: string;
  stack?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  userAgent?: string;
  errorType?: string;
}
