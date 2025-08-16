// Calculation-specific models and interfaces

export interface SOWImportData {
  poles: any[];
  drops: any[];
  fibre: any[];
  estimatedDays: number;
}

export interface CalculationOptions {
  roundUp: boolean;
  minDailyTarget: number;
  includeSpareCapacity: boolean;
}

export interface ProgressProjection {
  week: number;
  expectedPoles: number;
  expectedHomes: number;
  expectedFibre: number;
  cumulativePoles: number;
  cumulativeHomes: number;
  cumulativeFibre: number;
}

export interface ResourceRequirements {
  teams: number;
  vehicles: number;
  equipment: string[];
  materials: {
    poles: number;
    drops: number;
    fibreCable: number;
    connectors: number;
  };
}

export interface CostEstimate {
  labour: number;
  materials: number;
  equipment: number;
  overhead: number;
  total: number;
  contingency: number;
  grandTotal: number;
}

// Re-export from main model for convenience
export { SOWCalculations, SOWTotals, DailyTargets, GeographicBreakdown } from './sow.model';