export interface DailyProgress {
  id?: string;
  date: Date;
  projectId: string;
  projectName?: string;
  phaseId?: string;
  phaseName?: string;
  taskId?: string;
  taskName?: string;
  description: string;
  workCompleted: string;
  hoursWorked: number;
  materialsUsed?: MaterialUsage[];
  issuesEncountered?: string;
  nextSteps?: string;
  images?: string[];
  weather?: string;
  staffIds: string[];
  staffNames?: string[];
  contractorId?: string;
  contractorName?: string;
  status: 'draft' | 'submitted' | 'approved';
  submittedBy: string;
  submittedByName?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  comments?: ProgressComment[];
}

export interface MaterialUsage {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
}

export interface ProgressComment {
  id?: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export interface DailyProgressFilter {
  projectId?: string;
  phaseId?: string;
  taskId?: string;
  staffId?: string;
  contractorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
}

export interface DailyProgressSummary {
  projectId: string;
  projectName: string;
  totalHours: number;
  totalDays: number;
  completedTasks: number;
  issuesCount: number;
  periodStart: Date;
  periodEnd: Date;
}