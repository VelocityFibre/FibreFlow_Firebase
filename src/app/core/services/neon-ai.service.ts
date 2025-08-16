import { Injectable, inject, signal, computed } from '@angular/core';
import { Functions, httpsCallable, HttpsCallableResult } from '@angular/fire/functions';
import { Observable, BehaviorSubject, interval, from, of, throwError } from 'rxjs';
import { map, catchError, tap, retry, switchMap, startWith, shareReplay } from 'rxjs/operators';

export interface NeonAIQuery {
  question: string;
  user_id?: string;
  include_metadata?: boolean;
  include_sql?: boolean;
}

export interface NeonAIResponse {
  success: boolean;
  answer: string;
  sql_query?: string;
  error?: string;
  execution_time: number;
  metadata?: {
    llm_model: string;
    question: string;
    user_id: string;
    timestamp: number;
    results_count: number;
    query_type: string;
  };
}

export interface NeonAIHealth {
  database_connected: boolean;
  agent_ready: boolean;
  uptime: number;
  last_health_check: number;
  connection_pool: {
    status: string;
    pool_size?: string;
    connection_test?: string;
    last_test?: number;
    error?: string;
  };
  gemini_status: string;
  server_info: {
    version: string;
    keep_alive_enabled: boolean;
    pool_size: number | string;
  };
}

export interface DatabaseInfo {
  success?: boolean;
  connection_status: string;
  database_version?: string;
  tables?: Array<{name: string; size: string}>;
  table_statistics?: Record<string, number>;
  total_tables?: number;
  llm_model: string;
  schema_available?: boolean;
  supported_queries?: string[];
  error?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  execution_time?: number;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NeonAIService {
  private functions = inject(Functions);
  
  // Reactive state
  private _isConnected = signal<boolean>(false);
  private _lastHealthCheck = signal<NeonAIHealth | null>(null);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  
  // Chat state
  private _chatHistory = signal<ChatMessage[]>([]);
  private _isProcessingQuery = signal<boolean>(false);
  
  // Public computed signals
  readonly isConnected = this._isConnected.asReadonly();
  readonly lastHealthCheck = this._lastHealthCheck.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly chatHistory = this._chatHistory.asReadonly();
  readonly isProcessingQuery = this._isProcessingQuery.asReadonly();
  
  // Computed health status
  readonly healthStatus = computed(() => {
    const health = this._lastHealthCheck();
    if (!health) return 'unknown';
    
    if (health.database_connected && health.agent_ready) {
      return 'healthy';
    } else if (health.database_connected || health.agent_ready) {
      return 'partial';
    } else {
      return 'unhealthy';
    }
  });
  
  readonly isReady = computed(() => {
    const health = this._lastHealthCheck();
    return health?.database_connected === true && health?.agent_ready === true;
  });
  
  // Health monitoring using Firebase Functions
  private healthCheck$ = interval(30000).pipe(
    startWith(0),
    switchMap(() => this.performHealthCheck()),
    shareReplay(1)
  );
  
  constructor() {
    // Start health monitoring immediately
    this.startHealthMonitoring();
  }
  
  /**
   * Start health monitoring using Firebase Functions
   */
  private startHealthMonitoring(): void {
    this.healthCheck$.subscribe({
      next: (health) => {
        this._lastHealthCheck.set(health);
        this._isConnected.set(health.database_connected && health.agent_ready);
        this._error.set(null);
      },
      error: (error) => {
        this._isConnected.set(false);
        this._error.set(error.message || 'Health check failed');
        console.warn('NeonAI: Health check failed:', error);
      }
    });
  }
  
  /**
   * Perform health check using Firebase Function
   */
  private performHealthCheck(): Observable<NeonAIHealth> {
    const healthCheck = httpsCallable(this.functions, 'getNeonAgentHealth');
    
    return from(healthCheck({})).pipe(
      map((result: HttpsCallableResult<NeonAIHealth>) => result.data),
      catchError((error) => {
        console.warn('NeonAI: Health check failed:', error);
        // Return a default unhealthy state
        return of({
          database_connected: false,
          agent_ready: false,
          uptime: 0,
          last_health_check: Math.floor(Date.now() / 1000),
          connection_pool: {
            status: 'unavailable',
            connection_test: 'failed'
          },
          gemini_status: 'unavailable',
          server_info: {
            version: '1.0.0',
            keep_alive_enabled: false,
            pool_size: 'unknown'
          }
        });
      })
    );
  }
  
  /**
   * Test database connection
   */
  testConnection(): Observable<{success: boolean; message: string; timestamp?: Date; version?: string}> {
    const testConnection = httpsCallable(this.functions, 'testNeonConnection');
    
    return from(testConnection({})).pipe(
      map((result: HttpsCallableResult<any>) => result.data),
      catchError(this.handleError('testConnection'))
    );
  }
  
  /**
   * Get database information
   */
  getDatabaseInfo(): Observable<DatabaseInfo> {
    const getDatabaseInfo = httpsCallable(this.functions, 'getNeonDatabaseInfo');
    
    return from(getDatabaseInfo({})).pipe(
      map((result: HttpsCallableResult<DatabaseInfo>) => result.data),
      catchError(this.handleError('getDatabaseInfo'))
    );
  }
  
  /**
   * Execute a natural language query
   */
  executeQuery(query: NeonAIQuery): Observable<NeonAIResponse> {
    this._isProcessingQuery.set(true);
    
    const processQuery = httpsCallable(this.functions, 'processNeonQuery');
    
    return from(processQuery({
      ...query,
      user_id: query.user_id || 'fibreflow-user',
      include_metadata: query.include_metadata ?? true,
      include_sql: query.include_sql ?? false
    })).pipe(
      map((result: HttpsCallableResult<NeonAIResponse>) => result.data),
      tap(() => this._isProcessingQuery.set(false)),
      catchError((error) => {
        this._isProcessingQuery.set(false);
        return this.handleError('executeQuery')(error);
      })
    );
  }
  
  /**
   * Send a chat message and get AI response
   */
  sendChatMessage(message: string, userId?: string): Observable<ChatMessage> {
    // Add user message to chat history
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    
    this._chatHistory.update(history => [...history, userMessage]);
    
    // Execute query
    const query: NeonAIQuery = {
      question: message,
      user_id: userId || 'chat-user',
      include_metadata: true,
      include_sql: false
    };
    
    return this.executeQuery(query).pipe(
      map((response: NeonAIResponse) => {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: response.success ? response.answer : `Error: ${response.error}`,
          timestamp: new Date(),
          execution_time: response.execution_time,
          metadata: response.metadata
        };
        
        this._chatHistory.update(history => [...history, assistantMessage]);
        return assistantMessage;
      }),
      catchError((error) => {
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          type: 'system',
          content: `Failed to process your query: ${error.message}`,
          timestamp: new Date()
        };
        
        this._chatHistory.update(history => [...history, errorMessage]);
        return of(errorMessage);
      })
    );
  }
  
  /**
   * Clear chat history
   */
  clearChatHistory(): void {
    this._chatHistory.set([]);
  }
  
  /**
   * Force refresh connection
   */
  refreshConnection(): Observable<NeonAIHealth> {
    this._isLoading.set(true);
    
    return this.performHealthCheck().pipe(
      tap((health) => {
        this._lastHealthCheck.set(health);
        this._isConnected.set(health.database_connected && health.agent_ready);
        this._error.set(null);
        this._isLoading.set(false);
      }),
      catchError((error) => {
        this._isLoading.set(false);
        this._error.set(error.message);
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Execute raw SQL query (admin only)
   */
  executeSQL(query: string, params: any[] = []): Observable<{success: boolean; results: any[]; count: number}> {
    const executeSQL = httpsCallable(this.functions, 'executeNeonSQL');
    
    return from(executeSQL({ query, params })).pipe(
      map((result: HttpsCallableResult<any>) => result.data),
      catchError(this.handleError('executeSQL'))
    );
  }
  
  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    isConnected: boolean;
    uptime: number;
    healthStatus: string;
    lastCheck: Date | null;
    serviceType: string;
  } {
    const health = this._lastHealthCheck();
    
    return {
      isConnected: this._isConnected(),
      uptime: health?.uptime || 0,
      healthStatus: this.healthStatus(),
      lastCheck: health ? new Date(health.last_health_check * 1000) : null,
      serviceType: 'Firebase Functions'
    };
  }
  
  /**
   * Generic error handler
   */
  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<never> => {
      console.error(`NeonAI ${operation} failed:`, error);
      
      let errorMessage = 'An unknown error occurred';
      if (error.code && error.message) {
        // Firebase Functions error
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return throwError(() => new Error(errorMessage));
    };
  }
}