import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { PoleDataSource, PoleDataFilters } from './pole-data-source.interface';
import { PoleRecord } from '../../models/pole-record.model';
import { DataSourceMetadata } from '../../models/data-source-config.model';

/**
 * API implementation of PoleDataSource (Future implementation)
 * Will connect to OneMap API when available
 */
export class ApiPoleDataSource implements PoleDataSource {
  private metadata: DataSourceMetadata;

  constructor(
    private http: HttpClient,
    private apiUrl: string,
    private config: {
      apiKey?: string;
      headers?: Record<string, string>;
    } = {},
  ) {
    this.metadata = {
      type: 'api',
      name: 'OneMap API',
      description: 'Real-time pole data from OneMap API',
      apiVersion: '1.0',
    };
  }

  getRecords(filters?: PoleDataFilters): Observable<PoleRecord[]> {
    const params = this.buildQueryParams(filters);
    const headers = this.buildHeaders();

    return this.http
      .get<{ data: PoleRecord[] }>(`${this.apiUrl}/pole-records`, {
        params,
        headers,
      })
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error('API error:', error);
          throw new Error(`Failed to fetch data from API: ${error.message}`);
        }),
      );
  }

  validateConnection(): Observable<boolean> {
    const headers = this.buildHeaders();

    return this.http.get(`${this.apiUrl}/health`, { headers }).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  getMetadata(): Observable<DataSourceMetadata> {
    const headers = this.buildHeaders();

    return this.http
      .get<{ metadata: DataSourceMetadata }>(`${this.apiUrl}/metadata`, {
        headers,
      })
      .pipe(
        map((response) => ({
          ...this.metadata,
          ...response.metadata,
        })),
        catchError(() => of(this.metadata)),
      );
  }

  dispose(): void {
    // No resources to clean up for API
  }

  /**
   * Builds query parameters from filters
   */
  private buildQueryParams(filters?: PoleDataFilters): HttpParams {
    let params = new HttpParams();

    if (!filters) {
      return params;
    }

    if (filters.dateFrom) {
      params = params.set('dateFrom', filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      params = params.set('dateTo', filters.dateTo.toISOString());
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.agents && filters.agents.length > 0) {
      params = params.set('agents', filters.agents.join(','));
    }

    if (filters.sites && filters.sites.length > 0) {
      params = params.set('sites', filters.sites.join(','));
    }

    if (filters.sections && filters.sections.length > 0) {
      params = params.set('sections', filters.sections.join(','));
    }

    if (filters.flowNameGroups && filters.flowNameGroups.length > 0) {
      params = params.set('flowNameGroups', filters.flowNameGroups.join(','));
    }

    return params;
  }

  /**
   * Builds HTTP headers including authentication
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }
}
