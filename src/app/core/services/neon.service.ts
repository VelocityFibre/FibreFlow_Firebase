import { Injectable, inject } from '@angular/core';
import { neon, neonConfig } from '@neondatabase/serverless';
import { environment } from '../../../environments/environment';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NeonService {
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
   * Execute a query and return the first result
   * @param query SQL query string
   * @param params Optional parameters
   * @returns Observable of single result or null
   */
  queryOne<T = any>(query: string, params?: any[]): Observable<T | null> {
    return from(
      this.query<T>(query, params).toPromise().then(results => results?.[0] || null)
    );
  }

  /**
   * Test the database connection
   * @returns Observable of connection test result
   */
  testConnection(): Observable<{ success: boolean; message: string; timestamp?: Date }> {
    const promise = this.sql`SELECT NOW() as timestamp, version() as version`
      .then((result: any[]) => ({
        success: true,
        message: `Connected to ${result[0].version}`,
        timestamp: result[0].timestamp
      }))
      .catch((error: any) => ({
        success: false,
        message: `Connection failed: ${error.message}`
      }));
    
    return from(promise) as Observable<{ success: boolean; message: string; timestamp?: Date }>;
  }

  /**
   * Get table information
   * @param tableName Optional table name to filter
   * @returns Observable of table information
   */
  getTableInfo(tableName?: string): Observable<any[]> {
    const query = tableName
      ? `SELECT * FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`
      : `SELECT * FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    
    return this.query(query, tableName ? [tableName] : undefined);
  }

  /**
   * Get row count for a table
   * @param tableName Name of the table
   * @returns Observable of count
   */
  getTableCount(tableName: string): Observable<number> {
    const promise = this.sql(`SELECT COUNT(*) as count FROM ${tableName}`)
      .then((result: any[]) => parseInt(result[0].count));
    
    return from(promise) as Observable<number>;
  }

  /**
   * Analytics query examples
   */

  /**
   * Get project summary by status
   */
  getProjectSummaryByStatus(): Observable<any[]> {
    return this.query(`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(AVG(progress), 2) as avg_progress
      FROM projects
      GROUP BY status
      ORDER BY count DESC
    `);
  }

  /**
   * Get daily progress trends
   * @param days Number of days to look back
   */
  getDailyProgressTrends(days: number = 30): Observable<any[]> {
    return this.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(DISTINCT project_id) as active_projects,
        SUM(poles_installed) as poles,
        SUM(drops_connected) as drops
      FROM daily_progress
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY date
      ORDER BY date
    `, [days]);
  }

  /**
   * Get zone analytics
   */
  getZoneAnalytics(): Observable<any[]> {
    return this.query(`
      SELECT 
        z.zone_name,
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects,
        ROUND(AVG(p.progress), 2) as avg_progress
      FROM zones z
      LEFT JOIN projects p ON z.zone_name = p.location
      GROUP BY z.zone_name
      ORDER BY total_projects DESC
    `);
  }

  /**
   * Execute custom analytics query
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
   * Project Progress Analytics Methods
   */

  /**
   * Get build milestones for a project
   */
  getBuildMilestones(projectName: string): Observable<any[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const query = this.sql`
      SELECT 
        'Permissions' as name,
        COALESCE(SUM(permission_scope), 0) as scope,
        COALESCE(SUM(permissions_completed), 0) as completed,
        CASE 
          WHEN COALESCE(SUM(permission_scope), 0) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(permissions_completed), 0) * 100.0 / COALESCE(SUM(permission_scope), 1), 1)
        END as percentage,
        'Pole permission approvals' as notes
      FROM zone_progress 
      WHERE project_name = ${projectName}
      
      UNION ALL
      
      SELECT 
        'Poles' as name,
        COALESCE(SUM(pole_scope), 0) as scope,
        COALESCE(SUM(poles_planted), 0) as completed,
        CASE 
          WHEN COALESCE(SUM(pole_scope), 0) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(poles_planted), 0) * 100.0 / COALESCE(SUM(pole_scope), 1), 1)
        END as percentage,
        'Physical pole installations' as notes
      FROM zone_progress 
      WHERE project_name = ${projectName}
      
      UNION ALL
      
      SELECT 
        'Stringing' as name,
        COALESCE(SUM(stringing_scope), 0) as scope,
        COALESCE(SUM(stringing_completed), 0) as completed,
        CASE 
          WHEN COALESCE(SUM(stringing_scope), 0) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(stringing_completed), 0) * 100.0 / COALESCE(SUM(stringing_scope), 1), 1)
        END as percentage,
        'Cable stringing between poles' as notes
      FROM zone_progress 
      WHERE project_name = ${projectName}
      
      UNION ALL
      
      SELECT 
        'Sign Ups' as name,
        COALESCE(SUM(home_count), 0) as scope,
        COALESCE(SUM(signups_completed), 0) as completed,
        CASE 
          WHEN COALESCE(SUM(home_count), 0) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(signups_completed), 0) * 100.0 / COALESCE(SUM(home_count), 1), 1)
        END as percentage,
        'Customer sign-ups' as notes
      FROM zone_progress 
      WHERE project_name = ${projectName}
      
      ORDER BY name
    `;
    
    return from(query) as Observable<any[]>;
  }

  /**
   * Get zone progress for a project
   */
  getZoneProgress(projectName: string): Observable<any[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const query = this.sql`
      SELECT 
        zone,
        home_count,
        permission_scope,
        pole_scope,
        stringing_scope,
        permissions_completed,
        poles_planted,
        stringing_completed,
        signups_completed,
        drops_completed,
        connected_completed,
        permissions_percentage,
        poles_planted_percentage,
        stringing_percentage,
        signups_percentage,
        drops_percentage,
        connected_percentage
      FROM zone_progress 
      WHERE project_name = ${projectName}
      ORDER BY zone
    `;
    
    return from(query) as Observable<any[]>;
  }

  /**
   * Get daily progress for a project
   */
  getDailyProgress(projectName: string, days: number = 7): Observable<any[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const query = this.sql`
      SELECT 
        progress_date,
        day_name,
        permissions,
        poles_planted,
        stringing_d,
        stringing_f,
        sign_ups,
        home_drops,
        homes_connected
      FROM daily_progress 
      WHERE project_name = ${projectName}
      AND progress_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY progress_date DESC
    `;
    
    return from(query) as Observable<any[]>;
  }

  /**
   * Get key milestones for a project
   */
  getKeyMilestones(projectName: string): Observable<any[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const query = this.sql`
      SELECT 
        milestone_name,
        status,
        eta,
        actual_date
      FROM key_milestones 
      WHERE project_name = ${projectName}
      ORDER BY eta
    `;
    
    return from(query) as Observable<any[]>;
  }

  /**
   * Get prerequisites for a project
   */
  getPrerequisites(projectName: string): Observable<any[]> {
    if (!this.sql) {
      throw new Error('Neon connection not configured. Please add neonConnectionString to environment.');
    }

    const query = this.sql`
      SELECT 
        prerequisite_name,
        responsible,
        status
      FROM prerequisites 
      WHERE project_name = ${projectName}
      ORDER BY prerequisite_name
    `;
    
    return from(query) as Observable<any[]>;
  }
}