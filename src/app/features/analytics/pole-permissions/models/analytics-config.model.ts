import { ProcessingConfig } from './processed-pole-data.model';
import { DataSourceConfig } from './data-source-config.model';

/**
 * Overall configuration for analytics operation
 */
export interface AnalyticsConfig extends ProcessingConfig {
  dataSource: DataSourceConfig;
  exportOptions?: ExportOptions;
  notificationEmail?: string;
}

/**
 * Export options for generated reports
 */
export interface ExportOptions {
  format: 'excel' | 'csv' | 'json';
  includeMetadata: boolean;
  separateSheets: boolean;
  compression?: boolean;
  password?: string;
}

/**
 * Analysis session information
 */
export interface AnalysisSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  config: AnalyticsConfig;
  resultSummary?: {
    totalRecords: number;
    uniquePoles: number;
    reportsGenerated: number;
  };
  error?: string;
}
