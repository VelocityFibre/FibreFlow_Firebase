import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PoleDataSource } from './pole-data-source.interface';
import { DataSourceConfig } from '../../models/data-source-config.model';
import { CsvPoleDataSource } from './csv-pole-data-source';
import { ApiPoleDataSource } from './api-pole-data-source';

/**
 * Factory for creating appropriate data source implementations
 */
@Injectable()
export class PoleDataSourceFactory {
  constructor(private http: HttpClient) {}

  /**
   * Creates a data source based on configuration
   * @param config Data source configuration
   * @returns Appropriate data source implementation
   */
  createDataSource(config: DataSourceConfig): PoleDataSource {
    switch (config.type) {
      case 'csv':
        if (!config.file) {
          throw new Error('CSV data source requires a file');
        }
        return new CsvPoleDataSource(config.file);

      case 'api':
        if (!config.apiUrl) {
          throw new Error('API data source requires a URL');
        }
        return new ApiPoleDataSource(this.http, config.apiUrl, {
          apiKey: config.apiKey,
          headers: config.headers,
        });

      default:
        throw new Error(`Unsupported data source type: ${config.type}`);
    }
  }

  /**
   * Checks if a data source type is available
   * @param type Data source type
   * @returns Whether the type is supported
   */
  isTypeAvailable(type: 'csv' | 'api'): boolean {
    switch (type) {
      case 'csv':
        return true; // Always available

      case 'api':
        // Check environment config or feature flag
        return this.isApiEnabled();

      default:
        return false;
    }
  }

  /**
   * Gets available data source types
   * @returns Array of available types
   */
  getAvailableTypes(): Array<'csv' | 'api'> {
    const types: Array<'csv' | 'api'> = ['csv'];

    if (this.isApiEnabled()) {
      types.push('api');
    }

    return types;
  }

  /**
   * Checks if API is enabled (future implementation)
   */
  private isApiEnabled(): boolean {
    // TODO: Check environment config or feature flag
    // For now, return false as API is not yet available
    return false;
  }
}
