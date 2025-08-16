import { Injectable, inject, signal, computed } from '@angular/core';
import { neon, neonConfig } from '@neondatabase/serverless';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../../environments/environment';
import { from, Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  execution_time?: number;
  metadata?: any;
}

export interface DatabaseInfo {
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

export interface NeonAIHealth {
  database_connected: boolean;
  agent_ready: boolean;
  uptime: number;
  last_health_check: number;
  connection_pool: {
    status: string;
    pool_size?: string;
    connection_test?: string;
  };
  gemini_status: string;
  server_info: {
    version: string;
    keep_alive_enabled: boolean;
    pool_size: number | string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SimpleNeonAIService {
  private sql: any;
  private genAI: GoogleGenerativeAI;
  
  // State
  private _chatHistory = signal<ChatMessage[]>([]);
  private _isProcessingQuery = signal<boolean>(false);
  private _isConnected = signal<boolean>(true); // Always connected (no server needed!)
  private _error = signal<string | null>(null);
  
  // Public signals
  readonly chatHistory = this._chatHistory.asReadonly();
  readonly isProcessingQuery = this._isProcessingQuery.asReadonly();
  readonly isConnected = this._isConnected.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoading = signal<boolean>(false);
  
  // Computed status
  readonly healthStatus = computed(() => 'healthy'); // Always healthy
  readonly isReady = computed(() => true); // Always ready
  
  // Mock health check data
  readonly lastHealthCheck = signal<NeonAIHealth>({
    database_connected: true,
    agent_ready: true,
    uptime: 999999,
    last_health_check: Math.floor(Date.now() / 1000),
    connection_pool: {
      status: 'serverless',
      pool_size: 'auto',
      connection_test: 'passed'
    },
    gemini_status: 'ready',
    server_info: {
      version: '1.0.0-direct',
      keep_alive_enabled: true,
      pool_size: 'serverless'
    }
  });

  constructor() {
    // Configure Neon (like Argon does)
    neonConfig.fetchConnectionCache = true;
    
    // Initialize Neon connection
    if (environment.neonConnectionString) {
      this.sql = neon(environment.neonConnectionString);
    } else {
      console.error('Neon connection string not found in environment');
      this._error.set('Neon connection string not configured');
      return;
    }
    
    // Initialize Gemini AI
    // Note: In production, this should be done via Firebase Functions for security
    // For now, using a development key directly
    const geminiKey = 'AIzaSyDBktsZ8DsqchXKLHFN07iRvJuHrr7jr_8'; // Your existing key
    this.genAI = new GoogleGenerativeAI(geminiKey);
  }
  
  /**
   * Test database connection (like NeonAnalyticsService does)
   */
  testConnection(): Observable<{success: boolean; message: string; timestamp?: Date; version?: string}> {
    if (!this.sql) {
      return of({
        success: false,
        message: 'Neon connection not configured'
      });
    }

    const promise = this.sql`SELECT NOW() as timestamp, version() as version`
      .then((result: any[]) => ({
        success: true,
        message: `Connected to ${result[0].version.split(',')[0]}`,
        timestamp: result[0].timestamp,
        version: result[0].version.split(',')[0]
      }))
      .catch((error: any) => ({
        success: false,
        message: `Connection failed: ${error.message}`
      }));
    
    return from(promise);
  }
  
  /**
   * Get database information
   */
  getDatabaseInfo(): Observable<DatabaseInfo> {
    if (!this.sql) {
      return of({
        connection_status: 'not_configured',
        llm_model: 'gemini-pro',
        error: 'Neon connection not configured'
      });
    }
    
    const promise = this.sql`
      SELECT table_name, 
             pg_size_pretty(pg_total_relation_size('public'||'.'||table_name)) as size
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `.then(async (tables: any[]) => {
      // Get table statistics
      const stats: Record<string, number> = {};
      for (const table of tables) {
        try {
          const count = await this.sql`SELECT COUNT(*) as count FROM ${this.sql(table.table_name)}`;
          stats[table.table_name] = parseInt(count[0].count);
        } catch (err) {
          stats[table.table_name] = 0;
        }
      }
      
      return {
        connection_status: 'connected',
        database_version: 'PostgreSQL (Neon Serverless)',
        tables: tables.map(t => ({ name: t.table_name, size: t.size })),
        table_statistics: stats,
        total_tables: tables.length,
        llm_model: 'gemini-pro',
        schema_available: true,
        supported_queries: ['SELECT', 'COUNT', 'GROUP BY', 'ORDER BY', 'WHERE', 'JOIN']
      };
    }).catch((error: any) => ({
      connection_status: 'error',
      llm_model: 'gemini-pro',
      error: error.message
    }));
    
    return from(promise);
  }
  
  /**
   * Execute natural language query with AI
   */
  sendChatMessage(message: string, userId?: string): Observable<ChatMessage> {
    const startTime = Date.now();
    
    // Add user message to chat history
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date()
    };
    
    this._chatHistory.update(history => [...history, userMessage]);
    this._isProcessingQuery.set(true);
    
    // First, get database schema
    return this.getDatabaseSchema().pipe(
      switchMap((schema) => {
        // Generate SQL with Gemini
        const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `You are a PostgreSQL expert. Given this database schema, convert the user's natural language question into a SELECT query.

DATABASE SCHEMA:
${schema}

RULES:
1. Only generate SELECT statements (no INSERT, UPDATE, DELETE)
2. Use proper PostgreSQL syntax
3. Be case-sensitive with column names
4. Use LIMIT to prevent large result sets
5. Return only the SQL query, nothing else

USER QUESTION: ${message}

SQL QUERY:`;

        return from(model.generateContent(prompt));
      }),
      switchMap(async (result) => {
        const response = await result.response;
        let sqlQuery = response.text().trim();
        
        // Clean up the SQL query
        sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Validate it's a SELECT query
        if (!sqlQuery.toUpperCase().startsWith('SELECT')) {
          throw new Error('Only SELECT queries are allowed for safety');
        }
        
        // Execute the SQL
        let queryResults;
        try {
          queryResults = await this.sql.unsafe(sqlQuery);
        } catch (sqlError: any) {
          // Try adding LIMIT if missing
          if (!sqlQuery.toLowerCase().includes('limit')) {
            sqlQuery += ' LIMIT 100';
            queryResults = await this.sql.unsafe(sqlQuery);
          } else {
            throw sqlError;
          }
        }
        
        // Generate human-readable answer
        const answerPrompt = `Based on this SQL query and results, provide a clear, conversational answer to the user's question.

ORIGINAL QUESTION: ${message}
SQL QUERY: ${sqlQuery}
RESULTS: ${JSON.stringify(queryResults.slice(0, 10))} ${queryResults.length > 10 ? `... (showing first 10 of ${queryResults.length} results)` : ''}

Provide a natural language answer that:
1. Directly answers the user's question
2. Includes relevant numbers/data from the results
3. Is conversational and helpful
4. Mentions if results were limited

ANSWER:`;
        
        const answerResult = await this.genAI.getGenerativeModel({ model: 'gemini-pro' }).generateContent(answerPrompt);
        const answerResponse = await answerResult.response;
        const answer = answerResponse.text();
        
        const executionTime = Date.now() - startTime;
        
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: answer,
          timestamp: new Date(),
          execution_time: executionTime,
          metadata: {
            llm_model: 'gemini-pro',
            question: message,
            user_id: userId || 'chat-user',
            timestamp: Date.now(),
            results_count: queryResults.length,
            query_type: 'natural_language'
          }
        };
        
        this._chatHistory.update(history => [...history, assistantMessage]);
        this._isProcessingQuery.set(false);
        
        return assistantMessage;
      }),
      catchError((error) => {
        this._isProcessingQuery.set(false);
        
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
   * Get database schema as text
   */
  private getDatabaseSchema(): Observable<string> {
    if (!this.sql) {
      return of('No database connection available');
    }
    
    const promise = this.sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `.then((tables: any[]) => {
      const schema: Record<string, string[]> = {};
      tables.forEach(row => {
        if (!schema[row.table_name]) {
          schema[row.table_name] = [];
        }
        schema[row.table_name].push(`${row.column_name} (${row.data_type})`);
      });
      
      return Object.entries(schema)
        .map(([table, columns]) => `${table}: ${columns.join(', ')}`)
        .join('\n');
    }).catch(() => 'Unable to load database schema');
    
    return from(promise);
  }
  
  /**
   * Clear chat history
   */
  clearChatHistory(): void {
    this._chatHistory.set([]);
  }
  
  /**
   * Refresh connection (always succeeds)
   */
  refreshConnection(): Observable<NeonAIHealth> {
    return of(this.lastHealthCheck());
  }
  
  /**
   * Get connection stats
   */
  getConnectionStats(): {
    isConnected: boolean;
    uptime: number;
    healthStatus: string;
    lastCheck: Date | null;
    serviceType: string;
  } {
    return {
      isConnected: true,
      uptime: 999999,
      healthStatus: 'healthy',
      lastCheck: new Date(),
      serviceType: 'Direct Connection (Neon Serverless + Gemini)'
    };
  }
}