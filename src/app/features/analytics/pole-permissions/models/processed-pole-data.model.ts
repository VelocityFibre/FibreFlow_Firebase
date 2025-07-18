import { ParsedPoleRecord, AgentValidation } from './pole-record.model';

/**
 * Represents the processed analytics data after all transformations
 */
export interface ProcessedPoleData {
  // Primary analysis results
  firstStatusChanges: ParsedPoleRecord[]; // Unique poles with earliest status change

  // Quality control results
  duplicatePoles: ParsedPoleRecord[]; // Duplicate entries removed
  noPoleAllocated: ParsedPoleRecord[]; // Missing pole numbers
  agentDataMismatches: AgentValidation[]; // Agent validation failures

  // Time-based breakdowns
  monthlyBreakdown: MonthlyBreakdown[];
  weeklyBreakdown: WeeklyBreakdown[];

  // Processing metadata
  processingMetadata: ProcessingMetadata;
}

/**
 * Monthly breakdown of pole approvals
 */
export interface MonthlyBreakdown {
  year: number;
  month: number;
  monthLabel: string; // e.g., "2025-04"
  count: number;
  poles: ParsedPoleRecord[];
}

/**
 * Weekly breakdown of pole approvals
 */
export interface WeeklyBreakdown {
  weekEndingDate: Date;
  weekLabel: string; // e.g., "Week_Ending_2025-04-27"
  count: number;
  poles: ParsedPoleRecord[];
}

/**
 * Metadata about the processing operation
 */
export interface ProcessingMetadata {
  // Input statistics
  totalRecordsProcessed: number;
  recordsWithTargetStatus: number;

  // Output statistics
  uniquePolesIdentified: number;
  duplicatesRemoved: number;
  missingPoleNumbers: number;
  agentMismatches: number;

  // Time information
  processingStartTime: Date;
  processingEndTime: Date;
  processingDurationMs: number;

  // Date range
  earliestDate: Date | null;
  latestDate: Date | null;
  dateRangeDays: number;

  // Quality metrics
  dataQualityScore: number; // Percentage 0-100
  validationErrors: string[];
}

/**
 * Options for custom date range analysis
 */
export interface DateRangeOptions {
  startDate: Date;
  endDate: Date;
  includePartialWeeks?: boolean;
}

/**
 * Configuration for processing operation
 */
export interface ProcessingConfig {
  targetStatus: string; // Default: "Pole Permission: Approved"
  timePeriod: 'complete' | 'monthly' | 'weekly' | 'custom';
  dateRange?: DateRangeOptions;
  validateAgents: boolean;
  generateStats: boolean;
}
