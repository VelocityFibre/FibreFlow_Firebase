export interface Step {
  id?: string;
  projectId: string;
  phaseId: string;
  name: string;
  description?: string;
  orderNo: number;
  status: StepStatus;
  startDate?: Date;
  endDate?: Date;
  estimatedDuration?: number; // in days
  actualDuration?: number; // in days
  progress: number; // 0-100
  assignedTo?: string[]; // User IDs
  dependencies?: StepDependency[];
  deliverables?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export enum StepStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  ON_HOLD = 'ON_HOLD',
}

export interface StepDependency {
  stepId: string;
  type: DependencyType;
}

export enum DependencyType {
  FINISH_TO_START = 'FINISH_TO_START',
  START_TO_START = 'START_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
  START_TO_FINISH = 'START_TO_FINISH',
}

export interface StepWithPhase extends Step {
  phaseName?: string;
  phaseStatus?: string;
}

