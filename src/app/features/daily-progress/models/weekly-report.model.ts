export interface WeeklyReportData {
  projectInfo: ProjectReportInfo;
  reportPeriod: ReportPeriod;
  executiveSummary: ExecutiveSummary;
  performanceMetrics: PerformanceMetrics;
  dailyAnalysis: DailyAnalysis[];
  operationalChallenges: OperationalChallenge[];
  resourceManagement: ResourceManagement;
  riskAssessment: RiskAssessment;
  recommendations: Recommendation[];
}

export interface ProjectReportInfo {
  projectName: string;
  projectId: string;
  customer: string;
  location: string;
  contractorName?: string;
}

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  weekNumber?: number;
  year: number;
}

export interface ExecutiveSummary {
  overview: string;
  keyAchievements: Achievement[];
  criticalFocusAreas: string[];
}

export interface Achievement {
  metric: string;
  value: number | string;
  context: string;
}

export interface PerformanceMetrics {
  infrastructureDevelopment: InfrastructureMetrics;
  permissionsProcessing: PermissionsMetrics;
  stringingOperations: StringingMetrics;
  customerEngagement: CustomerMetrics;
}

export interface InfrastructureMetrics {
  totalPolesPlanted: number;
  dailyBreakdown: DailyMetric[];
  averagePerDay: number;
  peakDay: {
    date: Date;
    count: number;
  };
}

export interface PermissionsMetrics {
  totalPermissionsSecured: number;
  dailyBreakdown: DailyMetric[];
  bestPerformingDays: {
    date: Date;
    count: number;
  }[];
}

export interface StringingMetrics {
  totalByType: {
    cable24Core: number;
    cable48Core: number;
    cable96Core: number;
    cable144Core: number;
    cable288Core: number;
  };
  totalOperations: number;
}

export interface CustomerMetrics {
  homeSignUps: number;
  homeDropsCompleted: number;
  homeConnections: number;
  siteLiveStatus: 'Not Live' | 'Partially Live' | 'Fully Live';
}

export interface DailyMetric {
  date: Date;
  value: number;
}

export interface DailyAnalysis {
  date: Date;
  performanceLevel: 'high' | 'medium' | 'low';
  highlights: string[];
  challenges: string[];
  metrics: {
    polesPlanted: number;
    permissions: number;
    totalStringing: number;
    weatherImpact?: number;
    teamSize?: number;
  };
}

export interface OperationalChallenge {
  type: 'construction_gap' | 'status_reporting' | 'connection_delivery' | 'resource' | 'weather' | 'other';
  description: string;
  impact: 'high' | 'medium' | 'low';
  daysAffected: number;
}

export interface ResourceManagement {
  constructionExcellence: {
    peakCapacityDemonstrated: boolean;
    technicalIntegration: boolean;
    qualityMaintenance: boolean;
  };
  administrativeCapabilities: {
    regulatoryCompliance: boolean;
    marketValidation: boolean;
    infrastructurePreparation: boolean;
  };
  criticalGaps: string[];
}

export interface RiskAssessment {
  immediateRisks: Risk[];
  mediumTermRisks: Risk[];
  overallRiskLevel: 'high' | 'medium' | 'low';
}

export interface Risk {
  category: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  mitigation?: string;
}

export interface Recommendation {
  priority: 'immediate' | 'medium-term' | 'long-term';
  category: 'operational' | 'resource' | 'process' | 'quality' | 'safety';
  title: string;
  description: string;
  expectedImpact: string;
}

// Helper types for report generation
export interface WeeklyAggregates {
  totalPolesPlanted: number;
  totalPermissions: number;
  totalTrenching: number;
  totalStringing: {
    cable24: number;
    cable48: number;
    cable96: number;
    cable144: number;
    cable288: number;
  };
  totalHomeSignUps: number;
  totalHomeDrops: number;
  totalHomeConnections: number;
  totalCost: number;
  totalSafetyIncidents: number;
  totalQualityIssues: number;
  averageTeamSize: number;
  averageProductivityScore: number;
  daysWithActivity: number;
  daysWithNoActivity: number;
}