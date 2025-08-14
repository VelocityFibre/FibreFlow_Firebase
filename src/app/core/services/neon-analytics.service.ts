import { Injectable, inject } from '@angular/core';
import { neon, neonConfig } from '@neondatabase/serverless';
import { environment } from '../../../environments/environment';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NeonAnalyticsService {
  private sql: any;

  constructor() {
    // Configure Neon
    neonConfig.fetchConnectionCache = true;
    
    // Initialize connection only if connection string is provided
    if (environment.neonConnectionString) {
      this.sql = neon(environment.neonConnectionString);
    }
  }

  /**
   * Execute a raw SQL query
   * @param query SQL query string
   * @param params Optional parameters for parameterized queries
   * @returns Observable of query results
   */
  query<T = any>(query: string, params?: any[]): Observable<T[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const promise = this.sql(query, params);
    return from(promise) as Observable<T[]>;
  }

  /**
   * Test the database connection
   * @returns Observable of connection test result
   */
  testConnection(): Observable<{ success: boolean; message: string; timestamp?: Date }> {
    if (!this.sql) {
      return from(Promise.resolve({
        success: false,
        message: 'Neon connection not configured'
      }));
    }

    const promise = this.sql`SELECT NOW() as timestamp, version() as version`
      .then((result: any[]) => ({
        success: true,
        message: `Connected to ${result[0].version.split(',')[0]}`,
        timestamp: result[0].timestamp
      }))
      .catch((error: any) => ({
        success: false,
        message: `Connection failed: ${error.message}`
      }));
    
    return from(promise) as Observable<{ success: boolean; message: string; timestamp?: Date }>;
  }

  /**
   * Get build milestones from status_changes data (Lawley project)
   */
  getBuildMilestones(projectName: string = 'Lawley'): Observable<any[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const promise = this.sql`
      WITH project_stats AS (
        SELECT 
          COUNT(DISTINCT property_id) as total_properties,
          COUNT(DISTINCT CASE WHEN status LIKE '%Permission%Approved%' THEN property_id END) as permissions_approved,
          COUNT(DISTINCT CASE WHEN status LIKE '%Sign Ups%Approved%' THEN property_id END) as signups_approved,
          COUNT(DISTINCT CASE WHEN status LIKE '%Installed%' THEN property_id END) as completed_installs
        FROM status_changes
        WHERE status IS NOT NULL
      )
      SELECT 
        'Permissions' as name,
        total_properties as scope,
        permissions_approved as completed,
        ROUND(permissions_approved * 100.0 / NULLIF(total_properties, 0), 1) as percentage,
        'Pole permission approvals' as notes
      FROM project_stats
      
      UNION ALL
      
      SELECT 
        'Sign Ups' as name,
        total_properties as scope,
        signups_approved as completed,
        ROUND(signups_approved * 100.0 / NULLIF(total_properties, 0), 1) as percentage,
        'Customer sign-ups approved' as notes
      FROM project_stats
      
      UNION ALL
      
      SELECT 
        'Installations' as name,
        signups_approved as scope,
        completed_installs as completed,
        ROUND(completed_installs * 100.0 / NULLIF(signups_approved, 1), 1) as percentage,
        'Home installations completed' as notes
      FROM project_stats
      
      ORDER BY name
    `;
    
    return from(promise) as Observable<any[]>;
  }

  /**
   * Get status analytics from status_changes table
   */
  getStatusAnalytics(): Observable<any[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const promise = this.sql`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
      FROM status_changes 
      WHERE status IS NOT NULL AND status != ''
      GROUP BY status 
      ORDER BY count DESC
      LIMIT 10
    `;
    
    return from(promise) as Observable<any[]>;
  }

  /**
   * Get project progress summary
   */
  getProjectProgressSummary(): Observable<any> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const promise = this.sql`
      SELECT 
        COUNT(DISTINCT property_id) as total_properties,
        COUNT(*) as total_status_changes,
        COUNT(DISTINCT CASE WHEN status LIKE '%Permission%Approved%' THEN property_id END) as permissions_approved,
        COUNT(DISTINCT CASE WHEN status LIKE '%Sign Ups%Approved%' THEN property_id END) as signups_approved,
        COUNT(DISTINCT CASE WHEN status LIKE '%Installation%' AND status LIKE '%Progress%' THEN property_id END) as in_progress_installs,
        COUNT(DISTINCT CASE WHEN status LIKE '%Installed%' THEN property_id END) as completed_installs
      FROM status_changes
      WHERE status IS NOT NULL
    `.then((result: any[]) => result[0]);
    
    return from(promise) as Observable<any>;
  }

  /**
   * Get recent activity timeline
   */
  getRecentActivity(weeks: number = 8): Observable<any[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const promise = this.sql`
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as status_changes,
        COUNT(DISTINCT property_id) as unique_properties
      FROM status_changes 
      WHERE created_at >= NOW() - INTERVAL '${weeks} weeks'
        AND created_at IS NOT NULL
      GROUP BY week 
      ORDER BY week DESC
      LIMIT ${weeks}
    `;
    
    return from(promise) as Observable<any[]>;
  }

  /**
   * Execute custom analytics query (SELECT only for safety)
   * @param query Custom SQL query
   * @param params Query parameters
   */
  executeAnalyticsQuery<T = any>(query: string, params?: any[]): Observable<T[]> {
    // Only allow SELECT queries for safety
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed for analytics');
    }
    
    return this.query<T>(query, params);
  }

  /**
   * Get table information
   * @param tableName Optional table name to filter
   * @returns Observable of table information
   */
  getTableInfo(tableName?: string): Observable<any[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const promise = tableName
      ? this.sql`SELECT * FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${tableName}`
      : this.sql`SELECT * FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    
    return from(promise) as Observable<any[]>;
  }

  /**
   * Get available tables in the database
   */
  getAvailableTables(): Observable<string[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const promise = this.sql`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `.then((result: any[]) => result.map(r => r.table_name));
    
    return from(promise) as Observable<string[]>;
  }
}