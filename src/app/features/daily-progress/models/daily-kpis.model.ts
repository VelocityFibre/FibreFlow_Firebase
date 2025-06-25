export interface DailyKPIs {
  id?: string;
  projectId: string;
  projectName?: string;
  contractorId?: string;
  contractorName?: string;
  date: Date;

  // Permissions
  permissionsToday: number;
  permissionsTotal: number;

  // Status Tracking
  missingStatusToday: number;
  missingStatusTotal: number;

  // Pole Operations
  polesPlantedToday: number;
  polesPlantedTotal: number;

  // Homes
  homeSignupsToday: number;
  homeSignupsTotal: number;

  homeDropsToday: number;
  homeDropsTotal: number;

  homesConnectedToday: number;
  homesConnectedTotal: number;

  // Civils
  trenchingToday: number;
  trenchingTotal: number;

  // Cable Stringing - Multiple Types
  stringing24Today: number; // meters
  stringing24Total: number; // meters

  stringing48Today: number; // meters
  stringing48Total: number; // meters

  stringing96Today: number; // meters
  stringing96Total: number; // meters

  stringing144Today: number; // meters
  stringing144Total: number; // meters

  stringing288Today: number; // meters
  stringing288Total: number; // meters

  // Reports & Documentation
  reportFile?: string; // File attachment URL
  weeklyReportDetails?: string;
  weeklyReportInsights?: string;
  monthlyReports?: string;
  keyIssuesSummary?: string;

  // Status Flags
  riskFlag: boolean;

  // Weather & Environmental
  weatherConditions?: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'windy' | 'foggy';
  weatherImpact?: number; // 0-10 scale (0 = no impact, 10 = work stopped)
  temperatureRange?: {
    min: number;
    max: number;
  };

  // Safety & Compliance
  safetyIncidents?: number;
  nearMisses?: number;
  toolboxTalks?: number;
  safetyObservations?: number;
  complianceScore?: number; // 0-100 percentage

  // Quality Metrics
  qualityIssues?: number;
  reworkRequired?: number;
  inspectionsPassed?: number;
  inspectionsFailed?: number;
  defectRate?: number; // percentage

  // Resource Utilization
  teamSize?: number;
  teamMembers?: {
    id: string;
    name: string;
    role: string;
    hoursWorked: number;
  }[];
  regularHours?: number;
  overtimeHours?: number;
  equipmentUtilization?: number; // percentage
  vehiclesUsed?: number;

  // Material Tracking
  materialWastage?: {
    type: string;
    quantity: number;
    unit: string;
    reason?: string;
  }[];
  materialsUsed?: {
    type: string;
    quantity: number;
    unit: string;
    cost?: number;
  }[];

  // Financial Tracking (Basic - detailed in separate model)
  laborCostToday?: number;
  materialCostToday?: number;
  equipmentCostToday?: number;
  totalCostToday?: number;
  
  // Productivity Metrics
  productivityScore?: number; // 0-100 percentage
  plannedVsActual?: {
    planned: number;
    actual: number;
    variance: number; // percentage
  };
  
  // Customer Impact
  customerComplaints?: number;
  customerCompliments?: number;
  serviceInterruptions?: number;

  // Optional fields
  comments?: string;
  submittedBy: string;
  submittedByName?: string;
  submittedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface KPIDefinition {
  key: keyof DailyKPIs;
  label: string;
  unit: string;
  category: 'permissions' | 'status' | 'poles' | 'homes' | 'civils' | 'stringing';
  todayField: keyof DailyKPIs;
  totalField: keyof DailyKPIs;
}

export const KPI_DEFINITIONS: KPIDefinition[] = [
  // Permissions
  {
    key: 'permissionsToday',
    label: 'Permissions',
    unit: 'count',
    category: 'permissions',
    todayField: 'permissionsToday',
    totalField: 'permissionsTotal',
  },

  // Status
  {
    key: 'missingStatusToday',
    label: 'Missing Status',
    unit: 'count',
    category: 'status',
    todayField: 'missingStatusToday',
    totalField: 'missingStatusTotal',
  },

  // Poles
  {
    key: 'polesPlantedToday',
    label: 'Poles Planted',
    unit: 'count',
    category: 'poles',
    todayField: 'polesPlantedToday',
    totalField: 'polesPlantedTotal',
  },

  // Homes
  {
    key: 'homeSignupsToday',
    label: 'Home Signups',
    unit: 'count',
    category: 'homes',
    todayField: 'homeSignupsToday',
    totalField: 'homeSignupsTotal',
  },
  {
    key: 'homeDropsToday',
    label: 'Home Drops',
    unit: 'count',
    category: 'homes',
    todayField: 'homeDropsToday',
    totalField: 'homeDropsTotal',
  },
  {
    key: 'homesConnectedToday',
    label: 'Homes Connected',
    unit: 'count',
    category: 'homes',
    todayField: 'homesConnectedToday',
    totalField: 'homesConnectedTotal',
  },

  // Civils
  {
    key: 'trenchingToday',
    label: 'Trenching',
    unit: 'meters',
    category: 'civils',
    todayField: 'trenchingToday',
    totalField: 'trenchingTotal',
  },

  // Stringing - All Types
  {
    key: 'stringing24Today',
    label: 'Stringing 24F',
    unit: 'meters',
    category: 'stringing',
    todayField: 'stringing24Today',
    totalField: 'stringing24Total',
  },
  {
    key: 'stringing48Today',
    label: 'Stringing 48F',
    unit: 'meters',
    category: 'stringing',
    todayField: 'stringing48Today',
    totalField: 'stringing48Total',
  },
  {
    key: 'stringing96Today',
    label: 'Stringing 96F',
    unit: 'meters',
    category: 'stringing',
    todayField: 'stringing96Today',
    totalField: 'stringing96Total',
  },
  {
    key: 'stringing144Today',
    label: 'Stringing 144F',
    unit: 'meters',
    category: 'stringing',
    todayField: 'stringing144Today',
    totalField: 'stringing144Total',
  },
  {
    key: 'stringing288Today',
    label: 'Stringing 288F',
    unit: 'meters',
    category: 'stringing',
    todayField: 'stringing288Today',
    totalField: 'stringing288Total',
  },
];

export interface KPISummary {
  projectId: string;
  projectName: string;
  period: {
    start: Date;
    end: Date;
  };
  totals: Partial<DailyKPIs>;
  trends: {
    [K in keyof DailyKPIs]?: {
      change: number;
      percentage: number;
    };
  };
}
