/**
 * Argon Data Models
 * Defines interfaces for Argon AI Coding Assistant Platform
 */

export interface ArgonProject {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on-hold' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  repositoryUrl?: string;
  framework?: string;
  language?: string[];
  aiAssistant?: 'claude' | 'cursor' | 'windsurf' | 'copilot' | 'other';
  knowledgeSourceIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface ArgonTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'backlog' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: 'human' | 'ai' | 'collaborative';
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  dependencies?: string[]; // Task IDs this task depends on
  subtasks?: string[]; // Subtask IDs
  attachments?: ArgonAttachment[];
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface ArgonKnowledgeSource {
  id: string;
  title: string;
  description?: string;
  sourceType: 'website' | 'documentation' | 'pdf' | 'markdown' | 'code' | 'api';
  sourceUrl?: string;
  content?: string;
  crawlStatus?: 'pending' | 'in_progress' | 'completed' | 'failed';
  indexStatus?: 'pending' | 'indexed' | 'failed';
  pagesFound?: number;
  pagesProcessed?: number;
  chunkCount?: number;
  embedding?: number[];
  tags?: string[];
  projectIds?: string[]; // Projects this knowledge applies to
  createdAt: Date;
  updatedAt: Date;
  lastCrawledAt?: Date;
  metadata?: Record<string, any>;
}

export interface ArgonCrawlSession {
  id: string;
  sourceUrl: string;
  recursive: boolean;
  maxPages: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  pagesFound: number;
  pagesProcessed: number;
  pagesSkipped: number;
  errorCount: number;
  startedAt: Date;
  completedAt?: Date;
  errorLog?: ArgonCrawlError[];
  settings: ArgonCrawlSettings;
}

export interface ArgonCrawlSettings {
  maxPages: number;
  respectRobotsTxt: boolean;
  delayMs: number;
  userAgent: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxDepth?: number;
}

export interface ArgonCrawlError {
  url: string;
  error: string;
  statusCode?: number;
  timestamp: Date;
}

export interface ArgonAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export interface ArgonSearchQuery {
  query: string;
  projectIds?: string[];
  sourceTypes?: string[];
  tags?: string[];
  limit?: number;
  threshold?: number; // Similarity threshold for vector search
}

export interface ArgonSearchResult {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  sourceUrl?: string;
  projectIds?: string[];
  similarity?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ArgonAnalyticsQuery {
  database: 'firestore' | 'supabase' | 'neon' | 'all';
  query: string;
  parameters?: any[];
  description?: string;
}

export interface ArgonAnalyticsResult {
  database: string;
  query: string;
  results: any[];
  executionTimeMs: number;
  resultCount: number;
  columns?: string[];
  error?: string;
}

export interface ArgonDatabaseConnection {
  type: 'firestore' | 'supabase' | 'neon';
  status: 'connected' | 'disconnected' | 'error';
  name: string;
  description?: string;
  lastTestedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ArgonSystemMetrics {
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  tasks: {
    total: number;
    backlog: number;
    inProgress: number;
    completed: number;
  };
  knowledge: {
    totalSources: number;
    indexedPages: number;
    totalChunks: number;
    lastCrawlAt?: Date;
  };
  databases: ArgonDatabaseConnection[];
  performance: {
    avgResponseTimeMs: number;
    totalQueries: number;
    errorRate: number;
  };
  generatedAt: Date;
}

export interface ArgonConfiguration {
  llmProvider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  llmModel: string;
  embeddingModel: string;
  apiKeys: Record<string, string>;
  crawlSettings: ArgonCrawlSettings;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    defaultProjectView: 'kanban' | 'table' | 'calendar';
    autoSaveInterval: number;
    notificationsEnabled: boolean;
  };
  integrations: {
    fibreflow: {
      enabled: boolean;
      syncProjects: boolean;
      syncTasks: boolean;
    };
    mcpServer: {
      enabled: boolean;
      port: number;
      tools: string[];
    };
  };
}

// Database-specific query interfaces
export interface FirestoreQuery {
  collection: string;
  filters?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: any;
  }>;
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
  startAfter?: any;
}

export interface SupabaseQuery {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: {
    column: string;
    ascending: boolean;
  };
  limit?: number;
  range?: {
    from: number;
    to: number;
  };
}

export interface NeonQuery {
  sql: string;
  parameters?: any[];
  timeout?: number;
}

// Unified query interface
export interface UnifiedQuery {
  description: string;
  firestore?: FirestoreQuery;
  supabase?: SupabaseQuery;
  neon?: NeonQuery;
  mergeStrategy?: 'union' | 'intersection' | 'first-available';
}

export interface QueryExecutionResult {
  source: 'firestore' | 'supabase' | 'neon';
  data: any[];
  executionTimeMs: number;
  error?: string;
}

export interface UnifiedQueryResult {
  query: UnifiedQuery;
  results: QueryExecutionResult[];
  mergedData: any[];
  totalExecutionTimeMs: number;
  success: boolean;
  errors: string[];
}