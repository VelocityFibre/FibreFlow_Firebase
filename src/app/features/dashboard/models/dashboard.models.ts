// Priority will be imported when project model is available
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Main dashboard overview metrics
export interface DashboardMetrics {
  overview: OverviewMetrics;
  poles: PoleMetrics;
  tasks: TaskMetrics;
  alerts: Alert[];
  recentActivity: Activity[];
}

export interface OverviewMetrics {
  activeProjects: number;
  completedThisMonth: number;
  totalStaff: number;
  availableToday: number;
  criticalIssues: number;
}

export interface PoleMetrics {
  plantedToday: number;
  plannedToday: number;
  weeklyProgress: number[];
  monthlyTarget: number;
  monthlyCompleted: number;
  topContractors: ContractorPoleMetric[];
}

export interface ContractorPoleMetric {
  contractorId: string;
  contractorName: string;
  polesPlanted: number;
  target: number;
  percentage: number;
}

export interface TaskMetrics {
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  blockedCount: number;
  completedTodayCount: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  createdAt: Date;
  link?: string;
}

export enum AlertType {
  TASK_OVERDUE = 'task_overdue',
  BUDGET_OVERRUN = 'budget_overrun',
  RESOURCE_BLOCKED = 'resource_blocked',
  STOCK_LOW = 'stock_low',
  MILESTONE_AT_RISK = 'milestone_at_risk',
  SAFETY_ISSUE = 'safety_issue'
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  user: string;
  timestamp: Date;
  projectId?: string;
  projectName?: string;
}

export enum ActivityType {
  PROJECT_CREATED = 'project_created',
  PROJECT_COMPLETED = 'project_completed',
  TASK_COMPLETED = 'task_completed',
  POLE_PLANTED = 'pole_planted',
  ISSUE_RESOLVED = 'issue_resolved',
  STAFF_ASSIGNED = 'staff_assigned'
}

// Dashboard card configuration
export interface DashboardCard {
  id: string;
  title: string;
  icon: string;
  type: CardType;
  size: CardSize;
  order: number;
  refreshInterval?: number;
  data?: any;
}

export enum CardType {
  METRIC = 'metric',
  CHART = 'chart',
  LIST = 'list',
  ALERT = 'alert',
  NAVIGATION = 'navigation'
}

export enum CardSize {
  SMALL = 'small',   // 1x1
  MEDIUM = 'medium', // 2x1
  LARGE = 'large',   // 2x2
  WIDE = 'wide'      // 3x1
}

// Module navigation cards
export interface ModuleCard {
  title: string;
  icon: string;
  route: string;
  color: string;
  description: string;
  metrics?: {
    label: string;
    value: string | number;
  }[];
}

// User role for dashboard customization
export enum UserRole {
  ADMIN = 'admin',
  EXECUTIVE = 'executive',
  PROJECT_MANAGER = 'project_manager',
  FIELD_TEAM = 'field_team',
  CONTRACTOR = 'contractor',
  SUPPLIER = 'supplier'
}