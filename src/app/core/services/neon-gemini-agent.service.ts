import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface NeonQueryRequest {
  question: string;
  user_id?: string;
  include_metadata?: boolean;
  include_sql?: boolean;
}

export interface NeonQueryResponse {
  success: boolean;
  answer?: string;
  sql_query?: string;
  error?: string;
  execution_time: number;
  metadata?: {
    llm_model: string;
    total_execution_time: number;
    question: string;
    user_id?: string;
    timestamp: number;
  };
}

export interface NeonAgentHealth {
  status: string;
  version: string;
  database_connected: boolean;
  agent_ready: boolean;
  uptime: number;
}

export interface DatabaseInfo {
  connection_status: string;
  whitelisted_tables: string[];
  table_statistics: Record<string, number>;
  schema_sample: string;
  llm_model?: string;
}

@Injectable({ providedIn: 'root' })
export class NeonGeminiAgentService {
  private readonly apiUrl = 'http://localhost:8000'; // Our Python FastAPI server
  
  constructor(private http: HttpClient) {}

  /**
   * Ask a natural language question about the database
   */
  askQuestion(question: string, options: Partial<NeonQueryRequest> = {}): Observable<NeonQueryResponse> {
    const request: NeonQueryRequest = {
      question,
      include_metadata: true,
      include_sql: false,
      ...options
    };

    return this.http.post<NeonQueryResponse>(`${this.apiUrl}/query`, request).pipe(
      catchError((error) => {
        console.error('Neon Gemini Agent query failed:', error);
        return of({
          success: false,
          error: `Agent not available: ${error.message || 'Connection failed'}`,
          execution_time: 0
        });
      })
    );
  }

  /**
   * Check if the agent service is healthy
   */
  checkHealth(): Observable<NeonAgentHealth> {
    return this.http.get<NeonAgentHealth>(`${this.apiUrl}/health`).pipe(
      catchError((error) => {
        console.error('Health check failed:', error);
        return of({
          status: 'unhealthy',
          version: 'unknown',
          database_connected: false,
          agent_ready: false,
          uptime: 0
        });
      })
    );
  }

  /**
   * Get database information and statistics
   */
  getDatabaseInfo(): Observable<DatabaseInfo> {
    return this.http.get<DatabaseInfo>(`${this.apiUrl}/database/info`).pipe(
      catchError((error) => {
        console.error('Database info failed:', error);
        return of({
          connection_status: 'error',
          whitelisted_tables: [],
          table_statistics: {},
          schema_sample: 'Error retrieving schema',
          llm_model: 'unknown'
        });
      })
    );
  }

  /**
   * Get agent performance statistics
   */
  getAgentStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/agent/stats`).pipe(
      catchError((error) => {
        console.error('Agent stats failed:', error);
        return of({
          total_queries: 0,
          successful_queries: 0,
          success_rate: 0,
          recent_queries: [],
          recent_failures: [],
          average_execution_time: 0
        });
      })
    );
  }

  /**
   * Test the agent with basic functionality
   */
  testAgent(): Observable<any> {
    return this.http.post(`${this.apiUrl}/agent/test`, {}).pipe(
      catchError((error) => {
        console.error('Agent test failed:', error);
        return of({
          total_tests: 0,
          successful_tests: 0,
          success_rate: 0,
          results: []
        });
      })
    );
  }

  /**
   * Clear conversation history
   */
  clearHistory(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/agent/history`).pipe(
      catchError((error) => {
        console.error('Clear history failed:', error);
        return of({ message: 'Failed to clear history' });
      })
    );
  }

  /**
   * Get conversation history
   */
  getHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/agent/history`).pipe(
      map((response: any) => response.history || []),
      catchError((error) => {
        console.error('Get history failed:', error);
        return of([]);
      })
    );
  }

  /**
   * Check if the agent service is running
   */
  isServiceRunning(): Observable<boolean> {
    return this.checkHealth().pipe(
      map(health => health.status === 'healthy' && health.agent_ready),
      catchError(() => of(false))
    );
  }

  /**
   * Get suggested questions based on the current context
   */
  getSuggestedQuestions(): string[] {
    return [
      "How many poles have been planted in Lawley?",
      "What's the status distribution for all poles?",
      "Which agent has processed the most poles?",
      "Show me poles with 'Home Installation: Installed' status",
      "How many unique properties are in the system?",
      "What percentage of poles are approved?",
      "Compare pole installation progress by zone",
      "Which areas have the most declined installations?",
      "What's the average installation time per pole?",
      "Show me recent status changes"
    ];
  }

  /**
   * Enhanced query method that adds context about FibreFlow
   */
  askQuestionWithContext(question: string, currentRoute?: string): Observable<NeonQueryResponse> {
    let enhancedQuestion = question;

    // Add context based on current route
    if (currentRoute) {
      if (currentRoute.includes('pole-tracker')) {
        enhancedQuestion = `About the pole tracking system: ${question}`;
      } else if (currentRoute.includes('project')) {
        enhancedQuestion = `About projects and installations: ${question}`;
      }
    }

    return this.askQuestion(enhancedQuestion, {
      include_metadata: true,
      user_id: `fibreflow-${Date.now()}`
    });
  }
}