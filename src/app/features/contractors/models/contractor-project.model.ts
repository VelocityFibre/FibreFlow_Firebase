import { Timestamp } from '@angular/fire/firestore';

// Contractor-Project Relationship Model
export interface ContractorProject {
  id?: string;
  contractorId: string;
  contractorName: string;
  projectId: string;
  projectName: string;
  projectCode: string;

  // Assignment Details
  assignmentDate: Timestamp | Date;
  expectedStartDate: Timestamp | Date;
  expectedEndDate: Timestamp | Date;
  actualStartDate?: Timestamp | Date;
  actualEndDate?: Timestamp | Date;

  // Status
  status: ContractorProjectStatus;
  overallProgress: number; // 0-100

  // Contract Details
  contractValue: number;
  contractNumber?: string;
  scopeOfWork: string[];

  // Team Allocation
  allocatedTeams: TeamAllocation[];
  totalTeamsRequired: number;

  // Work Progress Tracking
  workProgress: WorkProgress;

  // Materials Management
  materialsNeeded: MaterialRequirement[];
  materialsUsed: MaterialUsage[];

  // Payment Management
  payments: PaymentRecord[];
  totalPaymentRequested: number;
  totalPaymentMade: number;
  retentionAmount: number;
  retentionPercentage: number;

  // Performance Metrics
  performance: ContractorPerformance;

  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
  lastModifiedBy: string;
}

export enum ContractorProjectStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
}

// Team Allocation
export interface TeamAllocation {
  teamId: string;
  teamCode: string;
  teamName: string;
  teamLeadName: string;
  teamLeadPhone: string;
  membersCount: number;

  // Assignment
  assignedDate: Timestamp | Date;
  releaseDate?: Timestamp | Date;
  isActive: boolean;

  // Work Assignment
  assignedPhases?: string[];
  assignedSteps?: string[];
  currentTaskId?: string;

  // Performance
  tasksCompleted: number;
  averageCompletionTime: number; // in hours
  qualityScore: number; // 0-100
}

// Work Progress
export interface WorkProgress {
  // Phase-wise Progress
  phaseProgress: PhaseProgress[];

  // Overall Metrics
  totalTasksAssigned: number;
  totalTasksCompleted: number;
  totalTasksInProgress: number;
  totalTasksDelayed: number;

  // Time Tracking
  totalEstimatedHours: number;
  totalActualHours: number;
  totalOvertimeHours: number;

  // Quality Metrics
  qualityChecksPassed: number;
  qualityChecksFailed: number;
  reworkRequired: number;

  // Daily Progress
  dailyProgressReports: DailyProgressSummary[];
}

export interface PhaseProgress {
  phaseId: string;
  phaseName: string;
  phaseType: string;
  progress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;
  assignedTeamIds: string[];
}

export interface DailyProgressSummary {
  date: Timestamp | Date;
  teamsActive: number;
  tasksCompleted: number;
  hoursWorked: number;
  issuesReported: string[];
  photosUploaded: number;
}

// Materials Management
export interface MaterialRequirement {
  materialId: string;
  materialName: string;
  materialCode: string;
  unit: string;

  // Requirements
  requiredQuantity: number;
  requiredByDate: Timestamp | Date;
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Allocation
  allocatedQuantity: number;
  allocatedDate?: Timestamp | Date;
  allocationStatus: 'pending' | 'partial' | 'complete';

  // Usage Planning
  plannedUsagePerDay: number;
  bufferPercentage: number;

  notes?: string;
}

export interface MaterialUsage {
  materialId: string;
  materialName: string;
  materialCode: string;
  unit: string;

  // Usage Details
  usedQuantity: number;
  usageDate: Timestamp | Date;
  usedByTeamId: string;
  usedByTeamName: string;

  // Task/Location
  taskId?: string;
  stepId?: string;
  location?: string;

  // Wastage
  wastageQuantity: number;
  wastageReason?: string;

  // Verification
  verifiedBy?: string;
  verifiedDate?: Timestamp | Date;
  photoUrls?: string[];

  notes?: string;
}

// Payment Management
export interface PaymentRecord {
  id: string;

  // Payment Request
  requestType: PaymentRequestType;
  requestNumber: string;
  requestDate: Timestamp | Date;
  requestedAmount: number;

  // Work Completed
  workCompletedDescription: string;
  workCompletedPercentage: number;
  milestoneId?: string;

  // Approval
  approvalStatus: PaymentApprovalStatus;
  approvedBy?: string;
  approvedDate?: Timestamp | Date;
  approvedAmount?: number;

  // Payment
  paymentStatus: PaymentStatus;
  paymentDate?: Timestamp | Date;
  paymentReference?: string;
  paymentMethod?: string;

  // Deductions
  deductions: PaymentDeduction[];
  netPaymentAmount?: number;

  // Supporting Documents
  invoiceNumber?: string;
  invoiceUrl?: string;
  supportingDocuments?: string[];

  notes?: string;
}

export enum PaymentRequestType {
  ADVANCE = 'advance',
  MILESTONE = 'milestone',
  PROGRESS = 'progress',
  FINAL = 'final',
  RETENTION_RELEASE = 'retention_release',
  VARIATION = 'variation',
}

export enum PaymentApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PARTIAL_APPROVED = 'partial_approved',
  ON_HOLD = 'on_hold',
}

export enum PaymentStatus {
  NOT_PAID = 'not_paid',
  PROCESSING = 'processing',
  PAID = 'paid',
  PARTIAL_PAID = 'partial_paid',
  FAILED = 'failed',
}

export interface PaymentDeduction {
  type: 'retention' | 'penalty' | 'material_advance' | 'other';
  description: string;
  amount: number;
}

// Contractor Performance
export interface ContractorPerformance {
  // Quality Metrics
  qualityScore: number; // 0-100
  defectsReported: number;
  defectsResolved: number;
  customerComplaints: number;

  // Time Metrics
  onTimeCompletion: number; // percentage
  averageDelayDays: number;

  // Safety Metrics
  safetyIncidents: number;
  safetyScore: number; // 0-100
  toolboxTalksAttended: number;

  // Productivity Metrics
  productivityScore: number; // 0-100
  averageTasksPerDay: number;
  averageHoursPerTask: number;

  // Financial Metrics
  costOverruns: number;
  profitMargin: number;

  // Overall Rating
  overallRating: number; // 1-5
  lastEvaluationDate?: Timestamp | Date;
}

// Helper Types for UI
export interface ContractorProjectSummary {
  contractorId: string;
  contractorName: string;
  activeProjects: ProjectSummary[];
  completedProjects: ProjectSummary[];
  totalContractValue: number;
  totalPaymentsMade: number;
  overallPerformanceRating: number;
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: ContractorProjectStatus;
  progress: number;
  teamsAllocated: number;
  contractValue: number;
  paymentProgress: number;
}

// Material Summary for Dashboard
export interface ContractorMaterialSummary {
  totalMaterialsNeeded: number;
  totalMaterialsUsed: number;
  materialUtilizationRate: number;
  wastagePercentage: number;
  upcomingMaterialNeeds: MaterialRequirement[];
}

// Payment Summary for Dashboard
export interface ContractorPaymentSummary {
  totalContractValue: number;
  totalRequested: number;
  totalApproved: number;
  totalPaid: number;
  totalRetention: number;
  pendingPayments: PaymentRecord[];
  upcomingMilestones: PaymentMilestone[];
}

export interface PaymentMilestone {
  milestoneId: string;
  description: string;
  dueDate: Timestamp | Date;
  amount: number;
  completionCriteria: string[];
  currentProgress: number;
}
