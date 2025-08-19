import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import { map, catchError, tap, shareReplay, switchMap } from 'rxjs/operators';
import { Firestore } from '@angular/fire/firestore';
import { NeonService } from './neon.service';
import { AuthService } from './auth.service';

// Import Argon models and service
import { ArgonDatabaseService } from '../../../../agents/argon/services/argon-database.service';
import {
  ArgonProject,
  ArgonTask,
  ArgonAnalyticsQuery,
  ArgonAnalyticsResult,
  ArgonDatabaseConnection,
  ArgonSystemMetrics,
  UnifiedQuery,
  UnifiedQueryResult
} from '../../../../agents/argon/models/argon.models';

@Injectable({
  providedIn: 'root'
})
export class ArgonService {
  private argonDb: ArgonDatabaseService = inject(ArgonDatabaseService);
  private authService = inject(AuthService);
  
  // Signals for reactive state management
  private _connectionStatus = signal<ArgonDatabaseConnection[]>([]);
  private _systemMetrics = signal<ArgonSystemMetrics | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Computed signals
  connectionStatus = this._connectionStatus.asReadonly();
  systemMetrics = this._systemMetrics.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();
  
  // Computed connection health
  connectionHealth = computed(() => {
    const connections = this._connectionStatus();
    const total = connections.length;
    const connected = connections.filter(c => c.status === 'connected').length;
    
    return {
      total,
      connected,
      disconnected: total - connected,
      healthPercentage: total > 0 ? Math.round((connected / total) * 100) : 0,
      allConnected: connected === total && total > 0
    };
  });

  // Cache for expensive operations
  private _projectAnalyticsCache$ = new BehaviorSubject<any>(null);
  private _fibreFlowProjectsCache$ = new BehaviorSubject<any[]>([]);

  constructor() {
    // Initialize connection testing
    this.initializeConnections();
    
    // Set up periodic health checks (every 5 minutes)
    this.startPeriodicHealthChecks();
  }

  // ==========================================================================
  // INITIALIZATION AND HEALTH MONITORING
  // ==========================================================================

  /**
   * Initialize all database connections
   */
  private initializeConnections(): void {
    this._isLoading.set(true);
    this._error.set(null);

    this.argonDb.testAllConnections().subscribe({
      next: (connections) => {
        this._connectionStatus.set(connections);
        this._isLoading.set(false);
        
        // Load initial system metrics if connections are healthy
        if (connections.some(c => c.status === 'connected')) {
          this.loadSystemMetrics();
        }
      },
      error: (error) => {
        this._error.set(`Failed to initialize connections: ${error.message}`);
        this._isLoading.set(false);
      }
    });
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    // Check every 5 minutes
    timer(0, 5 * 60 * 1000).pipe(
      switchMap(() => this.argonDb.testAllConnections())
    ).subscribe({
      next: (connections) => this._connectionStatus.set(connections),
      error: (error) => console.warn('Health check failed:', error)
    });
  }

  /**
   * Manually refresh connection status
   */
  refreshConnections(): Observable<ArgonDatabaseConnection[]> {
    this._isLoading.set(true);
    
    return this.argonDb.testAllConnections().pipe(
      tap(connections => {
        this._connectionStatus.set(connections);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._error.set(error.message);
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  // ==========================================================================
  // SYSTEM METRICS AND MONITORING
  // ==========================================================================

  /**
   * Load comprehensive system metrics
   */
  loadSystemMetrics(): Observable<ArgonSystemMetrics> {
    return this.argonDb.getSystemMetrics().pipe(
      tap(metrics => this._systemMetrics.set(metrics)),
      shareReplay(1)
    );
  }

  /**
   * Get cached system metrics or load if not available
   */
  getSystemMetrics(): Observable<ArgonSystemMetrics> {
    const current = this._systemMetrics();
    if (current) {
      return new Observable(observer => {
        observer.next(current);
        observer.complete();
      });
    }
    
    return this.loadSystemMetrics();
  }

  // ==========================================================================
  // PROJECT ANALYTICS AND DATA
  // ==========================================================================

  /**
   * Get comprehensive project analytics
   */
  getProjectAnalytics(forceRefresh: boolean = false): Observable<any> {
    if (!forceRefresh && this._projectAnalyticsCache$.value) {
      return this._projectAnalyticsCache$.asObservable();
    }

    return this.argonDb.getProjectAnalytics().pipe(
      tap(analytics => this._projectAnalyticsCache$.next(analytics)),
      shareReplay(1)
    );
  }

  /**
   * Get FibreFlow projects in Argon format
   */
  getFibreFlowProjects(forceRefresh: boolean = false): Observable<ArgonProject[]> {
    if (!forceRefresh && this._fibreFlowProjectsCache$.value.length > 0) {
      return this._fibreFlowProjectsCache$.asObservable();
    }

    return this.argonDb.syncFibreFlowProjects().pipe(
      tap(projects => this._fibreFlowProjectsCache$.next(projects)),
      shareReplay(1)
    );
  }

  // ==========================================================================
  // UNIFIED QUERY INTERFACE
  // ==========================================================================

  /**
   * Execute a unified query across multiple databases
   */
  executeUnifiedQuery(query: UnifiedQuery, userQuestion?: string, intent?: string, dataType?: string): Observable<UnifiedQueryResult> {
    this._isLoading.set(true);
    this._error.set(null);

    const startTime = Date.now();

    return this.argonDb.executeUnifiedQuery(query).pipe(
      tap((result) => {
        // Add query insights
        if (userQuestion) {
          result.queryInsights = {
            timestamp: new Date(),
            userQuery: userQuestion,
            detectedIntent: intent || 'general',
            detectedDataType: dataType || 'unknown',
            databasesQueried: result.results.map(r => r.source),
            queries: result.results.map(r => ({
              database: r.source,
              queryString: this.getQueryString(query, r.source),
              parameters: this.getQueryParameters(query, r.source),
              executionTimeMs: r.executionTimeMs,
              recordsReturned: r.data.length
            })),
            dataProcessing: [
              {
                step: 'Query Parsing',
                description: 'Analyzed user question and determined intent',
                duration: 5
              },
              {
                step: 'Database Query',
                description: `Executed query on ${result.results.length} database(s)`,
                duration: result.totalExecutionTimeMs
              },
              {
                step: 'Data Processing',
                description: 'Formatted and analyzed results',
                duration: Date.now() - startTime - result.totalExecutionTimeMs
              }
            ],
            totalRecordsFound: result.mergedData.length,
            recordsShown: Math.min(result.mergedData.length, 10)
          };
        }
        
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._error.set(error.message);
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  private getQueryString(query: UnifiedQuery, source: string): string {
    if (source === 'firestore' && query.firestore) {
      return `collection('${query.firestore.collection}') ${query.firestore.filters ? '+ filters' : ''} ${query.firestore.orderBy ? '+ orderBy' : ''} ${query.firestore.limit ? `limit(${query.firestore.limit})` : ''}`;
    }
    if (source === 'neon' && query.neon) {
      return query.neon.sql;
    }
    return 'Unknown query';
  }

  private getQueryParameters(query: UnifiedQuery, source: string): any[] {
    if (source === 'firestore' && query.firestore?.filters) {
      return query.firestore.filters.map(f => ({ field: f.field, operator: f.operator, value: f.value }));
    }
    if (source === 'neon' && query.neon?.parameters) {
      return query.neon.parameters;
    }
    return [];
  }

  /**
   * Execute analytics queries across databases
   */
  executeCustomAnalytics(queries: ArgonAnalyticsQuery[]): Observable<ArgonAnalyticsResult[]> {
    this._isLoading.set(true);
    
    return this.argonDb.executeCustomAnalytics(queries).pipe(
      tap(() => this._isLoading.set(false)),
      catchError(error => {
        this._error.set(error.message);
        this._isLoading.set(false);
        throw error;
      })
    );
  }

  // ==========================================================================
  // CONVENIENCE METHODS FOR COMMON OPERATIONS
  // ==========================================================================


  /**
   * Get build milestones (Neon)
   */
  getBuildMilestones(projectName: string = 'Lawley'): Observable<any[]> {
    return this.argonDb.executeUnifiedQuery({
      description: `Get build milestones for ${projectName}`,
      neon: {
        sql: `
          SELECT name, scope, completed, percentage, notes 
          FROM build_milestones 
          WHERE project_name = $1 
          ORDER BY name
        `,
        parameters: [projectName]
      }
    }).pipe(
      map(result => result.mergedData)
    );
  }

  /**
   * Get project dashboard data combining Firestore and Neon sources
   */
  getProjectDashboard(projectName?: string): Observable<any> {
    return this.argonDb.executeUnifiedQuery({
      description: 'Get FibreFlow projects and build milestones',
      firestore: {
        collection: 'projects',
        limit: 10,
        orderBy: [{ field: 'updatedAt', direction: 'desc' }]
      },
      neon: {
        sql: `
          SELECT name, scope, completed, percentage 
          FROM build_milestones 
          WHERE project_name = $1 
          ORDER BY name
        `,
        parameters: [projectName || 'Lawley']
      }
    }).pipe(
      map(result => ({
        projects: result.results.find(r => r.source === 'firestore')?.data || [],
        milestones: result.results.find(r => r.source === 'neon')?.data || [],
        summary: {
          totalProjects: result.results.find(r => r.source === 'firestore')?.data.length || 0,
          activeProjects: result.results.find(r => r.source === 'firestore')?.data.filter(p => p.status === 'active').length || 0,
          milestonesTracked: result.results.find(r => r.source === 'neon')?.data.length || 0,
          lastUpdated: new Date()
        }
      }))
    );
  }

  // ==========================================================================
  // AI ASSISTANT INTEGRATION
  // ==========================================================================

  /**
   * Export data formatted for AI assistant consumption
   */
  exportForAI(includeMetadata: boolean = false): Observable<any> {
    return this.argonDb.exportForAI(includeMetadata);
  }

  /**
   * Execute natural language query (future enhancement with AI)
   */
  executeNaturalLanguageQuery(query: string): Observable<any> {
    // For now, return a structured response indicating this feature is planned
    return new Observable(observer => {
      observer.next({
        query,
        interpretation: 'Natural language processing not yet implemented',
        suggestion: 'Use executeUnifiedQuery() with structured queries instead',
        examples: [
          'Get all active projects',
          'Show zone progress for Lawley',
          'List completed milestones'
        ]
      });
      observer.complete();
    });
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this._projectAnalyticsCache$.next(null);
    this._fibreFlowProjectsCache$.next([]);
  }

  /**
   * Get connection summary for display
   */
  getConnectionSummary(): Observable<string> {
    return new Observable(observer => {
      const health = this.connectionHealth();
      let summary = `${health.connected}/${health.total} databases connected`;
      
      if (health.healthPercentage === 100) {
        summary += ' (All systems operational)';
      } else if (health.healthPercentage >= 66) {
        summary += ' (Mostly operational)';
      } else if (health.healthPercentage >= 33) {
        summary += ' (Partial connectivity)';
      } else {
        summary += ' (Limited connectivity)';
      }
      
      observer.next(summary);
      observer.complete();
    });
  }

  /**
   * Check if specific database is available
   */
  isDatabaseAvailable(dbType: 'firestore' | 'neon'): boolean {
    const connections = this._connectionStatus();
    return connections.some(c => c.type === dbType && c.status === 'connected');
  }

  /**
   * Get available databases
   */
  getAvailableDatabases(): string[] {
    return this._connectionStatus()
      .filter(c => c.status === 'connected')
      .map(c => c.type);
  }
}