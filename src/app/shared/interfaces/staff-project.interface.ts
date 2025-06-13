import { Timestamp } from '@angular/fire/firestore';

// Staff assignment to projects
export interface StaffAssignment {
  id?: string;
  staffId: string;
  staffName?: string; // Denormalized for performance
  projectId: string;
  projectName?: string; // Denormalized for performance
  role: 'Lead' | 'Member' | 'Support' | 'Observer';
  assignedDate: Timestamp;
  assignedBy: string;
  estimatedHours?: number;
  actualHours?: number;
  status: 'active' | 'completed' | 'removed';
  removalDate?: Timestamp;
  removalReason?: string;
}

// Task assignment to staff
export interface TaskAssignment {
  id?: string;
  taskId: string;
  taskName?: string; // Denormalized
  projectId: string;
  staffId: string;
  staffName?: string; // Denormalized
  assignedDate: Timestamp;
  assignedBy: string;
  dueDate?: Timestamp;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'started' | 'completed' | 'flagged';
  completedDate?: Timestamp;
  flaggedReason?: string;
  estimatedHours?: number;
  actualHours?: number;
}

// Project staffing requirements
export interface ProjectStaffRequirement {
  projectId: string;
  requiredSkills: string[];
  requiredCount: number;
  currentCount: number;
  urgency: 'low' | 'medium' | 'high';
  dateNeeded: Date;
  description?: string;
}

// Staff workload summary
export interface StaffWorkload {
  staffId: string;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  flaggedTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  utilizationPercentage: number;
  availableHours: number;
}

// Staff project summary
export interface StaffProjectSummary {
  staffId: string;
  activeProjects: number;
  completedProjects: number;
  totalProjectsWorked: number;
  totalHoursWorked: number;
  currentWorkload: number; // percentage
  projectList: {
    projectId: string;
    projectName: string;
    role: string;
    status: string;
    hoursWorked: number;
  }[];
}

// Date range for queries
export interface DateRange {
  start: Date;
  end: Date;
}

// Skill requirement
export interface SkillRequirement {
  skill: string;
  level: 'beginner' | 'intermediate' | 'expert';
  required: boolean;
}

// Staff recommendation
export interface StaffRecommendation {
  staff: {
    id: string;
    name: string;
    primaryGroup: string;
    photoUrl?: string;
  };
  matchScore: number; // 0-100
  availability: {
    status: string;
    availableHours: number;
    currentWorkload: number;
  };
  matchingSkills: string[];
  missingSkills: string[];
  recommendation: 'highly-recommended' | 'recommended' | 'available';
  reasons: string[];
}
