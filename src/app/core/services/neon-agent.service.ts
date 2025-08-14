import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, from, of, throwError } from 'rxjs';
import { map, catchError, tap, retry, switchMap, startWith, shareReplay } from 'rxjs/operators';

export interface NeonAgentQuery {
  question: string;
  user_id?: string;
  include_metadata?: boolean;
  include_sql?: boolean;
}

export interface NeonAgentResponse {
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

export interface NeonAgentHealth {
  status: string;
  version: string;
  database_connected: boolean;
  agent_ready: boolean;
  uptime: number;
}

export interface NeonAgentDetailedHealth {
  database_connected: boolean;
  agent_ready: boolean;
  uptime: number;
  last_health_check: number;
  connection_pool_status: string;
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
    pool_size: number;
  };
}

export interface DatabaseInfo {
  connection_status: string;
  database_version?: string;
  tables?: Array<{name: string; size: string}>;
  table_statistics?: Record<string, number>;
  total_tables?: number;
  llm_model: string;
  schema_available?: boolean;
  connection_pool?: string;
  supported_queries?: string[];
  error?: string;
  pool_status?: string;
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
export class NeonAgentService {
  private http = inject(HttpClient);
  
  // Service configuration
  private readonly LOCAL_URL = 'http://localhost:8000';
  private readonly CLOUD_URL = 'https://neon-agent-814485644774.us-central1.run.app'; // Will be updated after deployment
  
  // Reactive state
  private _serviceUrl = signal<string>(this.LOCAL_URL);
  private _isConnected = signal<boolean>(false);
  private _lastHealthCheck = signal<NeonAgentDetailedHealth | null>(null);
  private _connectionAttempts = signal<number>(0);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);
  
  // Chat state
  private _chatHistory = signal<ChatMessage[]>([]);
  private _isProcessingQuery = signal<boolean>(false);
  
  // Public computed signals
  readonly serviceUrl = this._serviceUrl.asReadonly();
  readonly isConnected = this._isConnected.asReadonly();
  readonly lastHealthCheck = this._lastHealthCheck.asReadonly();
  readonly connectionAttempts = this._connectionAttempts.asReadonly();
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
  
  // Health monitoring
  private healthCheck$ = interval(30000).pipe(
    startWith(0),
    switchMap(() => this.performHealthCheck()),
    shareReplay(1)
  );
  
  constructor() {
    // Try to detect best service URL on startup
    this.detectServiceUrl().subscribe({
      next: (url) => {
        this._serviceUrl.set(url);
        this.startHealthMonitoring();
      },
      error: () => {
        this.startHealthMonitoring();
      }
    });
  }
  
  /**
   * Detect which service URL is available (local vs cloud)
   */
  private detectServiceUrl(): Observable<string> {
    // Try local first, then cloud
    return this.testConnection(this.LOCAL_URL).pipe(
      map(() => {
        console.log('🟢 NeonAgent: Using local service');
        return this.LOCAL_URL;
      }),
      catchError(() => {
        console.log('🟡 NeonAgent: Local unavailable, trying cloud service');
        return this.testConnection(this.CLOUD_URL).pipe(
          map(() => {
            console.log('🟢 NeonAgent: Using cloud service');
            return this.CLOUD_URL;
          }),
          catchError(() => {
            console.log('🔴 NeonAgent: No service available');
            return of(this.LOCAL_URL); // Default fallback
          })
        );
      })
    );
  }
  
  /**
   * Test connection to a specific URL
   */
  private testConnection(url: string): Observable<boolean> {
    return this.http.get<NeonAgentHealth>(`${url}/health`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
  
  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheck$.subscribe({
      next: (health) => {
        this._lastHealthCheck.set(health);
        this._isConnected.set(true);
        this._error.set(null);
        this._connectionAttempts.set(0);
      },
      error: (error) => {
        this._isConnected.set(false);
        this._error.set(error.message || 'Health check failed');
        this._connectionAttempts.update(c => c + 1);
        
        // Try switching URLs if health checks keep failing
        if (this._connectionAttempts() > 5) {
          this.switchServiceUrl();
        }
      }
    });
  }
  
  /**
   * Switch between local and cloud service URLs
   */
  private switchServiceUrl(): void {
    const currentUrl = this._serviceUrl();
    const newUrl = currentUrl === this.LOCAL_URL ? this.CLOUD_URL : this.LOCAL_URL;
    
    console.log(`🔄 NeonAgent: Switching from ${currentUrl} to ${newUrl}`);
    this._serviceUrl.set(newUrl);
    this._connectionAttempts.set(0);
  }
  
  /**
   * Perform health check
   */
  private performHealthCheck(): Observable<NeonAgentDetailedHealth> {
    const url = this._serviceUrl();
    return this.http.get<NeonAgentDetailedHealth>(`${url}/health/detailed`).pipe(
      retry(2),
      catchError((error: HttpErrorResponse) => {
        throw new Error(`Health check failed: ${error.message}`);
      })
    );
  }
  
  /**
   * Get basic health status
   */
  getHealth(): Observable<NeonAgentHealth> {
    const url = this._serviceUrl();
    return this.http.get<NeonAgentHealth>(`${url}/health`).pipe(
      retry(2),
      catchError(this.handleError('getHealth'))
    );
  }
  
  /**
   * Get detailed health status
   */
  getDetailedHealth(): Observable<NeonAgentDetailedHealth> {
    const url = this._serviceUrl();
    return this.http.get<NeonAgentDetailedHealth>(`${url}/health/detailed`).pipe(
      retry(2),
      catchError(this.handleError('getDetailedHealth'))
    );
  }
  
  /**
   * Get database information
   */
  getDatabaseInfo(): Observable<DatabaseInfo> {
    const url = this._serviceUrl();
    return this.http.get<DatabaseInfo>(`${url}/database/info`).pipe(
      retry(2),
      catchError(this.handleError('getDatabaseInfo'))
    );
  }
  
  /**
   * Execute a natural language query
   */
  executeQuery(query: NeonAgentQuery): Observable<NeonAgentResponse> {
    this._isProcessingQuery.set(true);
    const url = this._serviceUrl();
    
    return this.http.post<NeonAgentResponse>(`${url}/query`, {
      ...query,
      user_id: query.user_id || 'fibreflow-user',
      include_metadata: query.include_metadata ?? true,
      include_sql: query.include_sql ?? false
    }).pipe(
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
    const query: NeonAgentQuery = {
      question: message,
      user_id: userId || 'chat-user',
      include_metadata: true,
      include_sql: false
    };
    
    return this.executeQuery(query).pipe(
      map((response: NeonAgentResponse) => {
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
  refreshConnection(): Observable<NeonAgentDetailedHealth> {
    this._isLoading.set(true);
    
    return this.detectServiceUrl().pipe(
      switchMap((url) => {
        this._serviceUrl.set(url);
        return this.getDetailedHealth();
      }),
      tap((health) => {
        this._lastHealthCheck.set(health);
        this._isConnected.set(true);
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
   * Set custom service URL
   */
  setServiceUrl(url: string): void {
    this._serviceUrl.set(url);
    this._connectionAttempts.set(0);
    
    // Test the new URL
    this.getHealth().subscribe({
      next: () => {
        console.log(`🟢 NeonAgent: Connected to custom URL: ${url}`);
      },
      error: (error) => {
        console.error(`🔴 NeonAgent: Failed to connect to custom URL: ${url}`, error);
      }
    });
  }
  
  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    url: string;
    isConnected: boolean;
    uptime: number;
    healthStatus: string;
    lastCheck: Date | null;
    connectionAttempts: number;
  } {
    const health = this._lastHealthCheck();
    
    return {
      url: this._serviceUrl(),
      isConnected: this._isConnected(),
      uptime: health?.uptime || 0,
      healthStatus: this.healthStatus(),
      lastCheck: health ? new Date(health.last_health_check * 1000) : null,
      connectionAttempts: this._connectionAttempts()
    };
  }
  
  /**
   * Generic error handler
   */
  private handleError<T>(operation = 'operation') {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      let errorMessage = 'An unknown error occurred';
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error
        errorMessage = `Server returned code ${error.status}: ${error.message}`;
      }
      
      return throwError(() => new Error(errorMessage));
    };
  }
}