export interface QualityMetrics {
  id?: string;
  projectId: string;
  projectName?: string;
  date: Date;
  
  // Inspection Results
  inspections: {
    scheduled: number;
    completed: number;
    passed: number;
    failed: number;
    pending: number;
    passRate: number; // percentage
  };
  
  // Quality Issues
  issues: {
    total: number;
    critical: number;
    major: number;
    minor: number;
    resolved: number;
    outstanding: number;
  };
  
  // Rework Tracking
  rework: {
    items: number;
    hoursSpent: number;
    costImpact: number;
    reasonBreakdown: {
      poorWorkmanship: number;
      materialDefect: number;
      designChange: number;
      weatherDamage: number;
      other: number;
    };
  };
  
  // Defect Tracking
  defects: {
    reported: number;
    verified: number;
    rectified: number;
    defectRate: number; // per 100 units
    categories: {
      installation: number;
      material: number;
      design: number;
      documentation: number;
    };
  };
  
  // SLA Compliance
  slaCompliance: {
    overallScore: number; // percentage
    responseTime: {
      target: number; // hours
      actual: number; // hours
      breaches: number;
    };
    resolutionTime: {
      target: number; // hours
      actual: number; // hours
      breaches: number;
    };
    uptime: {
      target: number; // percentage
      actual: number; // percentage
    };
  };
  
  // Customer Satisfaction
  customerSatisfaction: {
    complaints: number;
    compliments: number;
    surveyResponses: number;
    satisfactionScore: number; // 0-10 or percentage
    npsScore?: number; // Net Promoter Score
    feedbackCategories: {
      communication: number;
      quality: number;
      timeliness: number;
      professionalism: number;
    };
  };
  
  // Audit Results
  audits: {
    internal: {
      conducted: number;
      passed: number;
      failed: number;
      findings: number;
    };
    external: {
      conducted: number;
      passed: number;
      failed: number;
      findings: number;
    };
  };
  
  // Safety Quality
  safetyQuality: {
    incidentsReported: number;
    correctiveActions: number;
    preventiveActions: number;
    trainingCompliance: number; // percentage
    ppeCompliance: number; // percentage
  };
  
  // Documentation Quality
  documentation: {
    complete: number;
    incomplete: number;
    accuracy: number; // percentage
    timeliness: number; // percentage
  };
  
  // Performance Indicators
  kpis: {
    firstTimeRightRate: number; // percentage
    onTimeDelivery: number; // percentage
    materialWastage: number; // percentage
    processCompliance: number; // percentage
  };
  
  // Metadata
  submittedBy: string;
  submittedByName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved';
  notes?: string;
  attachments?: string[]; // URLs to quality reports/certificates
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QualityCheckpoint {
  id?: string;
  projectId: string;
  checkpointName: string;
  checkpointType: 'pole' | 'cable' | 'splicing' | 'connection' | 'testing' | 'documentation';
  
  criteria: {
    id: string;
    description: string;
    mandatory: boolean;
    weight: number; // importance factor
  }[];
  
  results: {
    criteriaId: string;
    passed: boolean;
    notes?: string;
    evidence?: string[]; // photo URLs
  }[];
  
  overallResult: 'pass' | 'fail' | 'conditional';
  score: number; // percentage
  
  inspector: {
    id: string;
    name: string;
    certification?: string;
  };
  
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  
  timestamp: Date;
  weatherConditions?: string;
  correctionRequired?: boolean;
  correctionDeadline?: Date;
  correctionCompleted?: Date;
}

export interface QualitySummary {
  projectId: string;
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly';
  };
  
  overview: {
    totalInspections: number;
    passRate: number;
    defectRate: number;
    reworkRate: number;
    customerSatisfaction: number;
    slaCompliance: number;
  };
  
  trends: {
    qualityScore: number[]; // array of daily/weekly scores
    defectRate: number[];
    customerSatisfaction: number[];
    reworkHours: number[];
  };
  
  topIssues: {
    description: string;
    frequency: number;
    impact: 'high' | 'medium' | 'low';
    status: 'open' | 'resolved';
  }[];
  
  recommendations: string[];
  
  comparison?: {
    previousPeriod: {
      qualityScore: number;
      defectRate: number;
      customerSatisfaction: number;
    };
    improvement: {
      qualityScore: number; // percentage change
      defectRate: number; // percentage change
      customerSatisfaction: number; // percentage change
    };
  };
}