import { DailyKPIs } from '../../daily-progress/models/daily-kpis.model';
import {
  ProjectFinancials,
  FinancialSummary,
} from '../../daily-progress/models/financial-tracking.model';
import { QualityMetrics, QualitySummary } from '../../daily-progress/models/quality-metrics.model';
import { Project } from '../../../core/models/project.model';
import { Contractor } from '../../contractors/models/contractor.model';

export interface ReportMetadata {
  id?: string;
  projectId: string;
  projectName: string;
  reportType: 'daily' | 'weekly' | 'monthly';
  period: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  generatedBy: string;
  status: 'draft' | 'final' | 'distributed';
  version: number;
  recipients?: string[]; // email addresses
  distributedAt?: Date;
}

export interface DailyReport extends ReportMetadata {
  reportType: 'daily';

  // Executive Summary
  summary: {
    date: Date;
    weatherConditions: string;
    overallProgress: number; // percentage
    keyAchievements: string[];
    criticalIssues: string[];
    tomorrowPlan: string[];
  };

  // KPI Data
  kpis: DailyKPIs;

  // Financial Data
  financials?: ProjectFinancials;

  // Quality Data
  quality?: QualityMetrics;

  // Team Performance
  teamPerformance: {
    totalTeamSize: number;
    totalHoursWorked: number;
    overtimeHours: number;
    productivityScore: number;
    contractors: {
      name: string;
      teamSize: number;
      performance: {
        polesPlanted: number;
        trenchingMeters: number;
        cableStrung: number;
        homesConnected: number;
      };
    }[];
  };

  // Resource Utilization
  resources: {
    equipment: {
      name: string;
      hoursUsed: number;
      utilization: number; // percentage
    }[];
    materials: {
      type: string;
      consumed: number;
      unit: string;
      remaining: number;
    }[];
  };

  // Safety Summary
  safety: {
    incidents: number;
    nearMisses: number;
    toolboxTalks: number;
    observations: number;
    complianceScore: number;
  };

  // Photos/Evidence
  attachments: {
    type: 'photo' | 'document' | 'report';
    url: string;
    caption?: string;
    timestamp: Date;
  }[];
}

export interface WeeklyReport extends ReportMetadata {
  reportType: 'weekly';

  // Executive Summary
  summary: {
    weekNumber: number;
    overallProgress: number; // percentage
    weeklyHighlights: string[];
    majorChallenges: string[];
    nextWeekPriorities: string[];
    executiveNotes?: string;
  };

  // Aggregated KPIs
  kpiSummary: {
    dailyKpis: DailyKPIs[]; // array of daily entries
    weeklyTotals: Partial<DailyKPIs>; // aggregated totals
    trends: {
      metric: string;
      values: number[]; // daily values
      trend: 'up' | 'down' | 'stable';
      changePercentage: number;
    }[];
  };

  // Financial Summary
  financialSummary?: FinancialSummary;

  // Quality Summary
  qualitySummary?: QualitySummary;

  // Progress Analysis
  progressAnalysis: {
    planned: {
      poles: number;
      trenching: number;
      cableStringing: number;
      connections: number;
    };
    actual: {
      poles: number;
      trenching: number;
      cableStringing: number;
      connections: number;
    };
    variance: {
      poles: number; // percentage
      trenching: number;
      cableStringing: number;
      connections: number;
    };
  };

  // Contractor Performance
  contractorPerformance: {
    contractorId: string;
    contractorName: string;
    metrics: {
      productivity: number; // percentage
      quality: number; // percentage
      safety: number; // percentage
      overall: number; // percentage
    };
    ranking: number;
  }[];

  // Risk Register
  risks: {
    id: string;
    description: string;
    category: 'safety' | 'quality' | 'schedule' | 'cost' | 'environmental';
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
    status: 'new' | 'ongoing' | 'mitigated' | 'closed';
    owner: string;
  }[];

  // Lessons Learned
  lessonsLearned: {
    category: 'process' | 'technical' | 'safety' | 'quality';
    description: string;
    recommendation: string;
  }[];
}

export interface MonthlyReport extends ReportMetadata {
  reportType: 'monthly';

  // Executive Dashboard
  dashboard: {
    month: string; // e.g., "June 2025"
    overallHealth: 'on-track' | 'at-risk' | 'behind-schedule';
    completionPercentage: number;
    budgetUtilization: number;
    scheduleAdherence: number;
    qualityScore: number;
    safetyScore: number;
  };

  // Strategic Summary
  strategicSummary: {
    executiveSummary: string;
    majorMilestones: {
      description: string;
      plannedDate: Date;
      actualDate?: Date;
      status: 'completed' | 'on-track' | 'delayed' | 'at-risk';
    }[];
    strategicIssues: string[];
    recommendations: string[];
  };

  // Comprehensive Metrics
  metrics: {
    kpis: {
      monthly: Partial<DailyKPIs>; // monthly totals
      weeklyBreakdown: Partial<DailyKPIs>[]; // 4-5 weekly summaries
      dailyTrend: number[]; // array of daily productivity scores
    };
    financial: FinancialSummary;
    quality: QualitySummary;
  };

  // Resource Analysis
  resourceAnalysis: {
    manpower: {
      planned: number;
      actual: number;
      utilization: number; // percentage
      forecast: number; // next month requirement
    };
    equipment: {
      availability: number; // percentage
      utilization: number; // percentage
      maintenanceHours: number;
      breakdowns: number;
    };
    materials: {
      consumption: {
        type: string;
        planned: number;
        actual: number;
        variance: number; // percentage
      }[];
      wastage: number; // percentage
      stockLevels: {
        type: string;
        current: number;
        required: number;
        orderStatus: string;
      }[];
    };
  };

  // Stakeholder Management
  stakeholderUpdate: {
    customerSatisfaction: number; // percentage or score
    communityEngagement: {
      meetings: number;
      complaints: number;
      resolved: number;
    };
    regulatoryCompliance: {
      permits: {
        required: number;
        obtained: number;
        pending: number;
      };
      inspections: {
        passed: number;
        failed: number;
        scheduled: number;
      };
    };
  };

  // Forecast & Projections
  forecast: {
    completionDate: Date;
    finalCost: number;
    remainingWork: {
      poles: number;
      trenching: number;
      connections: number;
    };
    requiredResources: {
      manDays: number;
      equipment: string[];
      materials: { type: string; quantity: number }[];
    };
    risks: string[];
  };

  // Improvement Plan
  improvementPlan: {
    area: 'productivity' | 'quality' | 'safety' | 'cost';
    issue: string;
    action: string;
    owner: string;
    deadline: Date;
    status: 'planned' | 'in-progress' | 'completed';
  }[];

  // Appendices
  appendices: {
    detailedFinancials?: any;
    qualityCertificates?: string[];
    safetyReports?: string[];
    photos?: {
      category: string;
      urls: string[];
      captions: string[];
    }[];
  };
}

// Report generation configuration
export interface ReportConfig {
  projectId: string;
  reportType: 'daily' | 'weekly' | 'monthly';
  period: {
    start: Date;
    end: Date;
  };
  includeFinancials: boolean;
  includeQuality: boolean;
  includePhotos: boolean;
  includeCharts: boolean;
  format: 'pdf' | 'excel' | 'email' | 'web';
  recipients?: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // e.g., "08:00"
    timezone: string;
    enabled: boolean;
  };
}

// Report template for consistent formatting
export interface ReportTemplate {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly';
  sections: {
    id: string;
    title: string;
    order: number;
    required: boolean;
    dataSource: string; // which model/collection to pull from
    chartType?: 'bar' | 'line' | 'pie' | 'table';
  }[];
  styling: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    fontFamily: string;
  };
}
