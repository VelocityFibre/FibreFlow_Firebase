import { Timestamp } from '@angular/fire/firestore';

// 4-Level Hierarchy Models for FiberFlow

export interface Project {
  id?: string;
  projectCode: string; // Unique project identifier
  name: string;
  description: string;
  
  // Client Information
  clientId: string;
  clientName: string;
  clientOrganization: string;
  clientContact: string;
  clientEmail: string;
  clientPhone: string;
  
  // Project Details
  location: string;
  projectType: ProjectType;
  priorityLevel: Priority;
  status: ProjectStatus;
  currentPhase: PhaseType;
  currentPhaseName?: string;
  
  // Dates
  startDate: Timestamp | Date;
  expectedEndDate: Timestamp | Date;
  actualEndDate?: Timestamp | Date;
  
  // People
  projectManagerId: string;
  projectManagerName: string;
  teamIds?: string[];
  
  // Financial
  budget: number;
  budgetUsed: number;
  actualCost?: number;
  
  // Progress Tracking
  overallProgress: number; // 0-100
  activeTasksCount: number;
  completedTasksCount: number;
  currentPhaseProgress: number; // 0-100
  
  // Work Constraints
  workingHours: string; // e.g., "8:00 AM - 5:00 PM"
  allowWeekendWork: boolean;
  allowNightWork: boolean;
  
  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
  lastModifiedBy: string;
  metadata?: ProjectMetadata;
}

export interface Phase {
  id?: string;
  projectId: string;
  type: PhaseType;
  name: string;
  status: PhaseStatus;
  order: number;
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;
  dependencies?: string[]; // IDs of dependent phases
  progress: number; // 0-100
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Step {
  id?: string;
  projectId: string;
  phaseId: string;
  name: string;
  description?: string;
  status: StepStatus;
  order: number;
  assignedTeamId?: string;
  estimatedHours: number;
  actualHours?: number;
  dependencies?: string[]; // IDs of dependent steps
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Task {
  id?: string;
  projectId: string;
  phaseId: string;
  stepId: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: Timestamp | Date;
  completedDate?: Timestamp | Date;
  estimatedHours?: number;
  actualHours?: number;
  dependencies?: string[]; // IDs of dependent tasks
  attachments?: Attachment[];
  comments?: Comment[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Enums and Supporting Types

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectType {
  FTTH = 'ftth', // Fiber to the Home
  FTTB = 'fttb', // Fiber to the Building
  FTTC = 'fttc', // Fiber to the Curb
  BACKBONE = 'backbone',
  LASTMILE = 'lastmile',
  ENTERPRISE = 'enterprise',
  MAINTENANCE = 'maintenance'
}

export enum PhaseType {
  PLANNING = 'planning',
  INITIATE_PROJECT = 'initiate_project',
  WORK_IN_PROGRESS = 'work_in_progress',
  HANDOVER = 'handover',
  HANDOVER_COMPLETE = 'handover_complete',
  FINAL_ACCEPTANCE = 'final_acceptance'
}

export enum PhaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked'
}

export enum StepStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Supporting Interfaces

export interface ProjectMetadata {
  fiberType?: string;
  totalDistance?: number; // in meters
  numberOfSites?: number;
  networkType?: string;
  tags?: string[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Timestamp | Date;
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// Template Interfaces for Reusable Hierarchies

export interface ProjectTemplate {
  id?: string;
  name: string;
  description: string;
  phases: PhaseTemplate[];
  createdBy: string;
  createdAt: Timestamp | Date;
}

export interface PhaseTemplate {
  type: PhaseType;
  name: string;
  steps: StepTemplate[];
  order: number;
}

export interface StepTemplate {
  name: string;
  description?: string;
  tasks: TaskTemplate[];
  estimatedHours: number;
  order: number;
}

export interface TaskTemplate {
  name: string;
  description?: string;
  estimatedHours?: number;
  priority: Priority;
}

// Hierarchy Helper Types

export interface ProjectHierarchy extends Project {
  phases: PhaseHierarchy[];
}

export interface PhaseHierarchy extends Phase {
  steps: StepHierarchy[];
}

export interface StepHierarchy extends Step {
  tasks: Task[];
}

// Phase Configuration for Fiber Projects

export const FIBER_PROJECT_PHASES: PhaseTemplate[] = [
  {
    type: PhaseType.PLANNING,
    name: 'Planning',
    order: 1,
    steps: [
      {
        name: 'Site Survey',
        estimatedHours: 40,
        order: 1,
        tasks: [
          { name: 'Initial Site Assessment', priority: Priority.HIGH },
          { name: 'Route Planning', priority: Priority.HIGH },
          { name: 'Permit Requirements Analysis', priority: Priority.MEDIUM }
        ]
      },
      {
        name: 'Design & Engineering',
        estimatedHours: 80,
        order: 2,
        tasks: [
          { name: 'Network Design', priority: Priority.HIGH },
          { name: 'Bill of Materials', priority: Priority.HIGH },
          { name: 'Technical Drawings', priority: Priority.MEDIUM }
        ]
      }
    ]
  },
  {
    type: PhaseType.INITIATE_PROJECT,
    name: 'Initiate Project (IP)',
    order: 2,
    steps: [
      {
        name: 'Project Setup',
        estimatedHours: 20,
        order: 1,
        tasks: [
          { name: 'Kick-off Meeting', priority: Priority.HIGH },
          { name: 'Resource Allocation', priority: Priority.HIGH },
          { name: 'Budget Approval', priority: Priority.CRITICAL }
        ]
      },
      {
        name: 'Permits & Approvals',
        estimatedHours: 160,
        order: 2,
        tasks: [
          { name: 'Submit Permit Applications', priority: Priority.CRITICAL },
          { name: 'Wayleave Negotiations', priority: Priority.HIGH },
          { name: 'Environmental Clearances', priority: Priority.MEDIUM }
        ]
      }
    ]
  },
  {
    type: PhaseType.WORK_IN_PROGRESS,
    name: 'Work in Progress (WIP)',
    order: 3,
    steps: [
      {
        name: 'Civils',
        estimatedHours: 320,
        order: 1,
        tasks: [
          { name: 'Pole Permissions', priority: Priority.HIGH },
          { name: 'Trenching', priority: Priority.HIGH },
          { name: 'Duct Installation', priority: Priority.HIGH },
          { name: 'Cable Laying', priority: Priority.CRITICAL }
        ]
      },
      {
        name: 'Optical',
        estimatedHours: 160,
        order: 2,
        tasks: [
          { name: 'Fiber Splicing', priority: Priority.CRITICAL },
          { name: 'OTDR Testing', priority: Priority.HIGH },
          { name: 'Power Meter Testing', priority: Priority.HIGH },
          { name: 'Documentation', priority: Priority.MEDIUM }
        ]
      }
    ]
  },
  {
    type: PhaseType.HANDOVER,
    name: 'Handover',
    order: 4,
    steps: [
      {
        name: 'Quality Assurance',
        estimatedHours: 40,
        order: 1,
        tasks: [
          { name: 'End-to-End Testing', priority: Priority.CRITICAL },
          { name: 'Quality Checklist', priority: Priority.HIGH },
          { name: 'Punch List Items', priority: Priority.MEDIUM }
        ]
      },
      {
        name: 'Documentation',
        estimatedHours: 30,
        order: 2,
        tasks: [
          { name: 'As-Built Drawings', priority: Priority.HIGH },
          { name: 'Test Certificates', priority: Priority.HIGH },
          { name: 'Handover Package', priority: Priority.HIGH }
        ]
      }
    ]
  },
  {
    type: PhaseType.HANDOVER_COMPLETE,
    name: 'Handover Complete (HOC)',
    order: 5,
    steps: [
      {
        name: 'Client Acceptance',
        estimatedHours: 20,
        order: 1,
        tasks: [
          { name: 'Client Walkthrough', priority: Priority.HIGH },
          { name: 'Sign-off Documents', priority: Priority.CRITICAL },
          { name: 'Training Delivery', priority: Priority.MEDIUM }
        ]
      }
    ]
  },
  {
    type: PhaseType.FINAL_ACCEPTANCE,
    name: 'Final Acceptance Certificate (FAC)',
    order: 6,
    steps: [
      {
        name: 'Project Closure',
        estimatedHours: 20,
        order: 1,
        tasks: [
          { name: 'Final Invoice', priority: Priority.HIGH },
          { name: 'Warranty Documentation', priority: Priority.MEDIUM },
          { name: 'Project Archive', priority: Priority.LOW }
        ]
      }
    ]
  }
];