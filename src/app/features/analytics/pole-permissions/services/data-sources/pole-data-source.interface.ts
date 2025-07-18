import { Observable } from 'rxjs';
import { PoleRecord } from '../../models/pole-record.model';
import { DataSourceMetadata } from '../../models/data-source-config.model';

/**
 * Filter options for data retrieval
 */
export interface PoleDataFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  agents?: string[];
  sites?: string[];
  sections?: string[];
  flowNameGroups?: string[];
}

/**
 * Interface for pole data sources (CSV, API, etc.)
 * Provides abstraction for different data retrieval methods
 */
export interface PoleDataSource {
  /**
   * Retrieves pole records with optional filtering
   * @param filters Optional filters to apply
   * @returns Observable stream of pole records
   */
  getRecords(filters?: PoleDataFilters): Observable<PoleRecord[]>;

  /**
   * Validates the data source connection/availability
   * @returns Observable boolean indicating if source is valid
   */
  validateConnection(): Observable<boolean>;

  /**
   * Gets metadata about the data source
   * @returns Observable metadata including type, name, record count, etc.
   */
  getMetadata(): Observable<DataSourceMetadata>;

  /**
   * Disposes of any resources (e.g., file handles, connections)
   */
  dispose(): void;
}
