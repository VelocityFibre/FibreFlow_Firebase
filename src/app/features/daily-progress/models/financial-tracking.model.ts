export interface ProjectFinancials {
  id?: string;
  projectId: string;
  projectName?: string;
  date: Date;
  
  // Budget Information
  budgetAllocated: number;
  budgetSpent: number;
  budgetRemaining: number;
  budgetUtilization: number; // percentage
  
  // Daily Costs
  laborCost: {
    regular: number;
    overtime: number;
    contractors: number;
    total: number;
  };
  
  materialCost: {
    poles: number;
    cables: number;
    accessories: number;
    consumables: number;
    total: number;
  };
  
  equipmentCost: {
    rental: number;
    fuel: number;
    maintenance: number;
    total: number;
  };
  
  otherCosts: {
    permits: number;
    utilities: number;
    accommodation: number;
    transport: number;
    miscellaneous: number;
    total: number;
  };
  
  // Revenue Tracking
  revenue: {
    homesConnected: number;
    serviceActivations: number;
    installations: number;
    other: number;
    total: number;
  };
  
  // Cost per Unit Metrics
  costPerUnit: {
    perPole: number;
    perMeterCable: number;
    perHomeConnection: number;
    perKmTrenching: number;
  };
  
  // Financial Health Indicators
  profitMargin: number; // percentage
  cashFlow: number;
  paymentsPending: number;
  invoicesRaised: number;
  invoicesPaid: number;
  
  // Variance Analysis
  variance: {
    budgetVariance: number; // percentage
    scheduleVariance: number; // percentage
    costVariance: number; // percentage
  };
  
  // Forecasting
  projectedTotalCost: number;
  projectedCompletionDate: Date;
  projectedROI: number; // percentage
  
  // Metadata
  submittedBy: string;
  submittedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  status: 'draft' | 'submitted' | 'approved' | 'revised';
  notes?: string;
  attachments?: string[]; // URLs to supporting documents
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MaterialPricing {
  id?: string;
  materialType: string;
  unit: string;
  unitPrice: number;
  supplier?: string;
  validFrom: Date;
  validTo?: Date;
  minimumOrder?: number;
  bulkDiscount?: {
    quantity: number;
    discountPercentage: number;
  }[];
}

export interface LaborRates {
  id?: string;
  role: string;
  regularHourlyRate: number;
  overtimeHourlyRate: number;
  weekendRate?: number;
  holidayRate?: number;
  nightShiftRate?: number;
  contractorRate?: number;
  validFrom: Date;
  validTo?: Date;
}

export interface FinancialSummary {
  projectId: string;
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
  
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  
  costBreakdown: {
    labor: number;
    materials: number;
    equipment: number;
    other: number;
  };
  
  revenueBreakdown: {
    connections: number;
    activations: number;
    installations: number;
    other: number;
  };
  
  metrics: {
    avgCostPerDay: number;
    avgRevenuePerDay: number;
    profitMargin: number;
    roi: number;
    paybackPeriod: number; // in months
  };
  
  comparison?: {
    previousPeriod: {
      revenue: number;
      costs: number;
      profit: number;
    };
    variance: {
      revenueChange: number; // percentage
      costChange: number; // percentage
      profitChange: number; // percentage
    };
  };
}