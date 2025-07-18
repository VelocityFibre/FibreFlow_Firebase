/**
 * Configuration for data sources
 */
export interface DataSourceConfig {
  type: 'csv' | 'api';
  file?: File;
  apiUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

/**
 * Metadata about the data source
 */
export interface DataSourceMetadata {
  type: 'csv' | 'api';
  name: string;
  description: string;
  recordCount?: number;
  lastUpdated?: Date;
  columns?: string[];
  fileSize?: number;
  apiVersion?: string;
}

/**
 * CSV parsing options
 */
export interface CsvParseOptions {
  delimiter?: string;
  encoding?: string;
  skipEmptyLines?: boolean;
  trimHeaders?: boolean;
  trimValues?: boolean;
}

/**
 * API query parameters for filtering
 */
export interface ApiQueryParams {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  agents?: string[];
  sites?: string[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}
