import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, from, of, combineLatest, throwError } from 'rxjs';
import { map, catchError, switchMap, tap, mergeMap } from 'rxjs/operators';
import { Firestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, Timestamp, QueryConstraint } from '@angular/fire/firestore';
import { NeonAnalyticsService } from '../../../src/app/core/services/neon-analytics.service';
import { AuthService } from '../../../src/app/core/services/auth.service';

import {
  ArgonProject,
  ArgonTask,
  ArgonKnowledgeSource,
  ArgonSearchQuery,
  ArgonSearchResult,
  ArgonAnalyticsQuery,
  ArgonAnalyticsResult,
  ArgonDatabaseConnection,
  ArgonSystemMetrics,
  UnifiedQuery,
  UnifiedQueryResult,
  QueryExecutionResult,
  FirestoreQuery,
  NeonQuery
} from '../models/argon.models';

@Injectable({
  providedIn: 'root'
})
export class ArgonDatabaseService {
  private firestore = inject(Firestore);
  private neonAnalyticsService = inject(NeonAnalyticsService);
  private authService = inject(AuthService);

  constructor() {}

  // ==========================================================================
  // DATABASE CONNECTION TESTING
  // ==========================================================================

  /**
   * Test all database connections and return status
   */
  testAllConnections(): Observable<ArgonDatabaseConnection[]> {
    return combineLatest([
      this.testFirestoreConnection(),
      this.testNeonConnection()
    ]).pipe(
      map(([firestore, neon]) => [firestore, neon])
    );
  }

  private testFirestoreConnection(): Observable<ArgonDatabaseConnection> {
    const startTime = Date.now();
    
    return from(
      getDocs(query(collection(this.firestore, 'projects'), limit(1)))
    ).pipe(
      map(() => ({
        type: 'firestore' as const,
        status: 'connected' as const,
        name: 'FibreFlow Firestore',
        description: 'Primary FibreFlow database with projects, tasks, and user data',
        lastTestedAt: new Date(),
        metadata: {
          responseTimeMs: Date.now() - startTime,
          projectId: 'fibreflow-73daf'
        }
      })),
      catchError(error => of({
        type: 'firestore' as const,
        status: 'error' as const,
        name: 'FibreFlow Firestore',
        description: 'Primary FibreFlow database with projects, tasks, and user data',
        lastTestedAt: new Date(),
        error: error.message,
        metadata: { responseTimeMs: Date.now() - startTime }
      }))
    );
  }


  private testNeonConnection(): Observable<ArgonDatabaseConnection> {
    const startTime = Date.now();
    
    return this.neonAnalyticsService.testConnection().pipe(
      map(result => ({
        type: 'neon' as const,
        status: result.success ? 'connected' as const : 'error' as const,
        name: 'Neon PostgreSQL',
        description: 'High-performance analytics database with real OneMap data',
        lastTestedAt: new Date(),
        error: result.success ? undefined : result.message,
        metadata: {
          responseTimeMs: Date.now() - startTime,
          serverTime: result.timestamp?.toISOString()
        }
      }))
    );
  }

  // ==========================================================================
  // UNIFIED QUERY INTERFACE
  // ==========================================================================

  /**
   * Execute a unified query across multiple databases
   */
  executeUnifiedQuery(unifiedQuery: UnifiedQuery): Observable<UnifiedQueryResult> {
    const startTime = Date.now();
    const queryPromises: Observable<QueryExecutionResult>[] = [];

    // Execute Firestore query if provided
    if (unifiedQuery.firestore) {
      queryPromises.push(this.executeFirestoreQuery(unifiedQuery.firestore));
    }

    // Execute Neon query if provided
    if (unifiedQuery.neon) {
      queryPromises.push(this.executeNeonQuery(unifiedQuery.neon));
    }

    return forkJoin(queryPromises).pipe(
      map(results => {
        const mergedData = this.mergeQueryResults(results, unifiedQuery.mergeStrategy);
        
        return {
          query: unifiedQuery,
          results,
          mergedData,
          totalExecutionTimeMs: Date.now() - startTime,
          success: results.every(r => !r.error),
          errors: results.filter(r => r.error).map(r => r.error!)
        };
      }),
      catchError(error => of({
        query: unifiedQuery,
        results: [],
        mergedData: [],
        totalExecutionTimeMs: Date.now() - startTime,
        success: false,
        errors: [error.message]
      }))
    );
  }

  private executeFirestoreQuery(firestoreQuery: FirestoreQuery): Observable<QueryExecutionResult> {
    const startTime = Date.now();
    
    try {
      const constraints: QueryConstraint[] = [];

      // Add filters
      if (firestoreQuery.filters) {
        firestoreQuery.filters.forEach(filter => {
          constraints.push(where(filter.field, filter.operator as any, filter.value));
        });
      }

      // Add ordering
      if (firestoreQuery.orderBy) {
        firestoreQuery.orderBy.forEach(order => {
          constraints.push(orderBy(order.field, order.direction));
        });
      }

      // Add limit
      if (firestoreQuery.limit) {
        constraints.push(limit(firestoreQuery.limit));
      }

      const q = query(collection(this.firestore, firestoreQuery.collection), ...constraints);

      return from(getDocs(q)).pipe(
        map(snapshot => ({
          source: 'firestore' as const,
          data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          executionTimeMs: Date.now() - startTime
        })),
        catchError(error => of({
          source: 'firestore' as const,
          data: [],
          executionTimeMs: Date.now() - startTime,
          error: error.message
        }))
      );
    } catch (error: any) {
      return of({
        source: 'firestore' as const,
        data: [],
        executionTimeMs: Date.now() - startTime,
        error: error.message
      });
    }
  }


  private executeNeonQuery(neonQuery: NeonQuery): Observable<QueryExecutionResult> {
    const startTime = Date.now();
    
    return this.neonAnalyticsService.executeAnalyticsQuery(neonQuery.sql, neonQuery.parameters).pipe(
      map(data => ({
        source: 'neon' as const,
        data,
        executionTimeMs: Date.now() - startTime
      })),
      catchError(error => of({
        source: 'neon' as const,
        data: [],
        executionTimeMs: Date.now() - startTime,
        error: error.message
      }))
    );
  }

  private mergeQueryResults(results: QueryExecutionResult[], strategy: 'union' | 'intersection' | 'first-available' = 'union'): any[] {
    const validResults = results.filter(r => !r.error && r.data.length > 0);
    
    if (validResults.length === 0) return [];

    switch (strategy) {
      case 'first-available':
        return validResults[0].data;
      
      case 'union':
        return validResults.flatMap(r => r.data);
      
      case 'intersection':
        // Simple intersection by comparing JSON strings (could be improved)
        if (validResults.length < 2) return validResults[0]?.data || [];
        
        let intersection = validResults[0].data;
        for (let i = 1; i < validResults.length; i++) {
          intersection = intersection.filter(item1 => 
            validResults[i].data.some(item2 => 
              JSON.stringify(item1) === JSON.stringify(item2)
            )
          );
        }
        return intersection;
      
      default:
        return validResults.flatMap(r => r.data);
    }
  }

  // ==========================================================================
  // FIBREFLOW DATA INTEGRATION
  // ==========================================================================

  /**
   * Get FibreFlow projects from Firestore
   */
  getFibreFlowProjects(): Observable<any[]> {
    return from(getDocs(collection(this.firestore, 'projects'))).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
  }

  /**
   * Get project analytics combining Firestore projects with Neon analytics
   */
  getProjectAnalytics(projectId?: string): Observable<any> {
    return combineLatest([
      this.getFibreFlowProjects(),
      this.neonAnalyticsService.getBuildMilestones('Lawley').pipe(catchError(() => of([])))
    ]).pipe(
      map(([firestoreProjects, neonMilestones]) => {
        return {
          projects: firestoreProjects,
          milestones: neonMilestones,
          analysis: {
            totalProjects: firestoreProjects.length,
            activeProjects: firestoreProjects.filter(p => p.status === 'active').length,
            completedProjects: firestoreProjects.filter(p => p.status === 'completed').length,
            avgProgress: this.calculateAverageProgress(neonMilestones)
          }
        };
      })
    );
  }

  private calculateAverageProgress(milestones: any[]): number {
    if (!milestones || milestones.length === 0) return 0;
    const total = milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
    return Math.round(total / milestones.length);
  }

  /**
   * Execute custom analytics across all databases
   */
  executeCustomAnalytics(queries: ArgonAnalyticsQuery[]): Observable<ArgonAnalyticsResult[]> {
    const analyticsPromises = queries.map(query => {
      const startTime = Date.now();

      let queryObservable: Observable<any[]>;

      switch (query.database) {
        case 'firestore':
          // Convert to structured Firestore query
          queryObservable = this.executeFirestoreAnalytics(query.query);
          break;
        
        
        case 'neon':
          // Use neonAnalyticsService for all analytics queries
          queryObservable = this.neonAnalyticsService.executeAnalyticsQuery(query.query, query.parameters);
          break;
        
        case 'all':
          // Execute on all databases and combine results
          queryObservable = this.executeOnAllDatabases(query.query, query.parameters);
          break;
        
        default:
          queryObservable = throwError(() => new Error(`Unknown database: ${query.database}`));
      }

      return queryObservable.pipe(
        map(results => ({
          database: query.database,
          query: query.query,
          results,
          executionTimeMs: Date.now() - startTime,
          resultCount: results.length
        })),
        catchError(error => of({
          database: query.database,
          query: query.query,
          results: [],
          executionTimeMs: Date.now() - startTime,
          resultCount: 0,
          error: error.message
        }))
      );
    });

    return forkJoin(analyticsPromises);
  }

  private executeFirestoreAnalytics(queryDescription: string): Observable<any[]> {
    // For now, return empty array - would need AI/NLP to convert natural language to Firestore queries
    // This could be enhanced with OpenAI integration to parse natural language queries
    return of([]);
  }

  private executeOnAllDatabases(query: string, parameters?: any[]): Observable<any[]> {
    // Execute safe SELECT queries on available databases and combine results
    const observables: Observable<any[]>[] = [];
    
    // Add Neon query if it's a valid SELECT
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      observables.push(
        this.neonAnalyticsService.executeAnalyticsQuery(query, parameters).pipe(
          catchError(error => {
            console.warn('Neon query failed:', error);
            return of([]);
          })
        )
      );
    }
    
    if (observables.length === 0) {
      return of([]);
    }
    
    return combineLatest(observables).pipe(
      map(results => results.flat())
    );
  }

  // ==========================================================================
  // SYSTEM METRICS AND MONITORING
  // ==========================================================================

  /**
   * Get comprehensive system metrics
   */
  getSystemMetrics(): Observable<ArgonSystemMetrics> {
    return combineLatest([
      this.getFibreFlowProjects(),
      from(getDocs(collection(this.firestore, 'tasks'))).pipe(
        map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)))
      ),
      this.testAllConnections()
    ]).pipe(
      map(([projects, tasks, connections]) => ({
        projects: {
          total: projects.length,
          active: projects.filter(p => p.status === 'active').length,
          completed: projects.filter(p => p.status === 'completed').length
        },
        tasks: {
          total: tasks.length,
          backlog: tasks.filter(t => t.status === 'pending' || t.status === 'backlog').length,
          inProgress: tasks.filter(t => t.status === 'in_progress' || t.status === 'active').length,
          completed: tasks.filter(t => t.status === 'completed').length
        },
        knowledge: {
          totalSources: 0, // Would be populated from knowledge base
          indexedPages: 0,
          totalChunks: 0,
          lastCrawlAt: undefined
        },
        databases: connections,
        performance: {
          avgResponseTimeMs: this.calculateAverageResponseTime(connections),
          totalQueries: 0, // Would track query count
          errorRate: this.calculateErrorRate(connections)
        },
        generatedAt: new Date()
      }))
    );
  }

  private calculateAverageResponseTime(connections: ArgonDatabaseConnection[]): number {
    const responseTimes = connections
      .map(c => c.metadata?.['responseTimeMs'])
      .filter(rt => rt !== undefined) as number[];
    
    if (responseTimes.length === 0) return 0;
    return Math.round(responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length);
  }

  private calculateErrorRate(connections: ArgonDatabaseConnection[]): number {
    const errorCount = connections.filter(c => c.status === 'error').length;
    return connections.length > 0 ? errorCount / connections.length : 0;
  }

  // ==========================================================================
  // DATA SYNCHRONIZATION UTILITIES
  // ==========================================================================

  /**
   * Sync FibreFlow project data to Argon format
   */
  syncFibreFlowProjects(): Observable<ArgonProject[]> {
    return this.getFibreFlowProjects().pipe(
      map(firestoreProjects => 
        firestoreProjects.map(project => this.convertToArgonProject(project))
      )
    );
  }

  private convertToArgonProject(firestoreProject: any): ArgonProject {
    return {
      id: firestoreProject.id,
      name: firestoreProject.title || firestoreProject.name,
      description: firestoreProject.description,
      status: this.mapProjectStatus(firestoreProject.status),
      priority: firestoreProject.priority || 'medium',
      tags: firestoreProject.tags || [],
      repositoryUrl: undefined,
      framework: 'Angular',
      language: ['TypeScript', 'HTML', 'SCSS'],
      aiAssistant: 'claude',
      knowledgeSourceIds: [],
      createdAt: firestoreProject.createdAt?.toDate() || new Date(),
      updatedAt: firestoreProject.updatedAt?.toDate() || new Date(),
      completedAt: firestoreProject.completedAt?.toDate(),
      metadata: {
        originalId: firestoreProject.id,
        source: 'fibreflow',
        type: firestoreProject.type,
        location: firestoreProject.location,
        client: firestoreProject.client
      }
    };
  }

  private mapProjectStatus(firestoreStatus: string): ArgonProject['status'] {
    switch (firestoreStatus) {
      case 'active':
      case 'in-progress':
        return 'active';
      case 'completed':
        return 'completed';
      case 'on-hold':
      case 'paused':
        return 'on-hold';
      case 'archived':
        return 'archived';
      default:
        return 'active';
    }
  }

  /**
   * Export data for Argon AI assistant consumption
   */
  exportForAI(includeMetadata: boolean = false): Observable<any> {
    return combineLatest([
      this.syncFibreFlowProjects(),
      this.getProjectAnalytics(),
      this.getSystemMetrics()
    ]).pipe(
      map(([projects, analytics, metrics]) => ({
        projects: includeMetadata ? projects : projects.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          priority: p.priority,
          framework: p.framework,
          language: p.language
        })),
        analytics: {
          totalProjects: analytics.analysis.totalProjects,
          activeProjects: analytics.analysis.activeProjects,
          avgProgress: analytics.analysis.avgProgress,
          milestones: analytics.milestones?.slice(0, 5) // Top 5 milestones
        },
        system: {
          databases: metrics.databases.map(db => ({
            type: db.type,
            status: db.status,
            name: db.name
          })),
          performance: metrics.performance,
          lastUpdated: metrics.generatedAt
        },
        capabilities: {
          unifiedQueries: true,
          crossDatabaseAnalytics: true,
          realTimeSync: true,
          supportedDatabases: ['firestore', 'neon']
        }
      }))
    );
  }
}