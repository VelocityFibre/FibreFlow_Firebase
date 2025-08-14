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
        COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' THEN pole_number END) as completed,
        COUNT(DISTINCT pole_number) as scope,
        CASE 
          WHEN COUNT(DISTINCT pole_number) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' THEN pole_number END) * 100.0 / COUNT(DISTINCT pole_number), 1)
        END as percentage,
        'Pole permission approvals' as notes
      FROM status_changes 
      WHERE project_name = ${projectName}
      
      UNION ALL
      
      SELECT 
        'Poles' as name,
        COUNT(DISTINCT CASE WHEN pole_planted_date IS NOT NULL THEN pole_number END) as completed,
        COUNT(DISTINCT pole_number) as scope,
        CASE 
          WHEN COUNT(DISTINCT pole_number) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN pole_planted_date IS NOT NULL THEN pole_number END) * 100.0 / COUNT(DISTINCT pole_number), 1)
        END as percentage,
        'Physical pole installations' as notes
      FROM status_changes 
      WHERE project_name = ${projectName}
      
      UNION ALL
      
      SELECT 
        'Stringing' as name,
        COUNT(DISTINCT CASE WHEN stringing_date IS NOT NULL THEN pole_number END) as completed,
        COUNT(DISTINCT pole_number) as scope,
        CASE 
          WHEN COUNT(DISTINCT pole_number) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN stringing_date IS NOT NULL THEN pole_number END) * 100.0 / COUNT(DISTINCT pole_number), 1)
        END as percentage,
        'Cable stringing between poles' as notes
      FROM status_changes 
      WHERE project_name = ${projectName}
      
      UNION ALL
      
      SELECT 
        'Sign Ups' as name,
        COUNT(DISTINCT CASE WHEN status LIKE '%Sign Ups: Approved%' THEN property_id END) as completed,
        COUNT(DISTINCT property_id) as scope,
        CASE 
          WHEN COUNT(DISTINCT property_id) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN status LIKE '%Sign Ups: Approved%' THEN property_id END) * 100.0 / COUNT(DISTINCT property_id), 1)
        END as percentage,
        'Customer sign-ups' as notes
      FROM status_changes 
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
        COALESCE(NULLIF(zone, ''), 'No Zone Assigned') as zone,
        COUNT(DISTINCT property_id) as home_count,
        COUNT(DISTINCT pole_number) as permission_scope,
        COUNT(DISTINCT pole_number) as pole_scope,
        COUNT(DISTINCT pole_number) as stringing_scope,
        COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' THEN pole_number END) as permissions_completed,
        COUNT(DISTINCT CASE WHEN pole_planted_date IS NOT NULL THEN pole_number END) as poles_planted,
        COUNT(DISTINCT CASE WHEN stringing_date IS NOT NULL THEN pole_number END) as stringing_completed,
        COUNT(DISTINCT CASE WHEN status LIKE '%Sign Ups: Approved%' THEN property_id END) as signups_completed,
        COUNT(DISTINCT CASE WHEN drop_date IS NOT NULL THEN property_id END) as drops_completed,
        COUNT(DISTINCT CASE WHEN connected_date IS NOT NULL THEN property_id END) as connected_completed,
        CASE 
          WHEN COUNT(DISTINCT pole_number) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN status = 'Pole Permission: Approved' THEN pole_number END) * 100.0 / COUNT(DISTINCT pole_number), 1)
        END as permissions_percentage,
        CASE 
          WHEN COUNT(DISTINCT pole_number) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN pole_planted_date IS NOT NULL THEN pole_number END) * 100.0 / COUNT(DISTINCT pole_number), 1)
        END as poles_planted_percentage,
        CASE 
          WHEN COUNT(DISTINCT pole_number) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN stringing_date IS NOT NULL THEN pole_number END) * 100.0 / COUNT(DISTINCT pole_number), 1)
        END as stringing_percentage,
        CASE 
          WHEN COUNT(DISTINCT property_id) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN status LIKE '%Sign Ups: Approved%' THEN property_id END) * 100.0 / COUNT(DISTINCT property_id), 1)
        END as signups_percentage,
        CASE 
          WHEN COUNT(DISTINCT property_id) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN drop_date IS NOT NULL THEN property_id END) * 100.0 / COUNT(DISTINCT property_id), 1)
        END as drops_percentage,
        CASE 
          WHEN COUNT(DISTINCT property_id) = 0 THEN 0
          ELSE ROUND(COUNT(DISTINCT CASE WHEN connected_date IS NOT NULL THEN property_id END) * 100.0 / COUNT(DISTINCT property_id), 1)
        END as connected_percentage
      FROM status_changes 
      WHERE project_name = ${projectName}
      GROUP BY COALESCE(NULLIF(zone, ''), 'No Zone Assigned')
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
        DATE(status_date) as progress_date,
        TO_CHAR(DATE(status_date), 'Day') as day_name,
        COUNT(CASE WHEN status = 'Pole Permission: Approved' THEN 1 END) as permissions,
        COUNT(CASE WHEN pole_planted_date IS NOT NULL THEN 1 END) as poles_planted,
        COUNT(CASE WHEN stringing_date IS NOT NULL THEN 1 END) as stringing_d,
        COUNT(CASE WHEN stringing_date IS NOT NULL THEN 1 END) as stringing_f,
        COUNT(CASE WHEN status LIKE '%Sign Ups: Approved%' THEN 1 END) as sign_ups,
        COUNT(CASE WHEN drop_date IS NOT NULL THEN 1 END) as home_drops,
        COUNT(CASE WHEN connected_date IS NOT NULL THEN 1 END) as homes_connected
      FROM status_changes 
      WHERE project_name = ${projectName}
      AND status_date >= CURRENT_DATE - INTERVAL '7 days'
      AND status_date IS NOT NULL
      GROUP BY DATE(status_date)
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
      FROM (
        SELECT 
          'Pole Permission Start' as milestone_name,
          CASE WHEN COUNT(CASE WHEN status = 'Pole Permission: Approved' THEN 1 END) > 0 THEN 'Completed' ELSE 'Pending' END as status,
          MIN(permission_date) as eta,
          MIN(permission_date) as actual_date
        FROM status_changes 
        WHERE project_name = ${projectName}
        
        UNION ALL
        
        SELECT 
          'First Pole Installation' as milestone_name,
          CASE WHEN COUNT(CASE WHEN pole_planted_date IS NOT NULL THEN 1 END) > 0 THEN 'Completed' ELSE 'Pending' END as status,
          MIN(pole_planted_date) as eta,
          MIN(pole_planted_date) as actual_date
        FROM status_changes 
        WHERE project_name = ${projectName}
        
        UNION ALL
        
        SELECT 
          'First Sign-up Approval' as milestone_name,
          CASE WHEN COUNT(CASE WHEN status LIKE '%Sign Ups: Approved%' THEN 1 END) > 0 THEN 'Completed' ELSE 'Pending' END as status,
          MIN(signup_date) as eta,
          MIN(signup_date) as actual_date
        FROM status_changes 
        WHERE project_name = ${projectName}
        
        UNION ALL
        
        SELECT 
          'First Home Connection' as milestone_name,
          CASE WHEN COUNT(CASE WHEN connected_date IS NOT NULL THEN 1 END) > 0 THEN 'Completed' ELSE 'Pending' END as status,
          MIN(connected_date) as eta,
          MIN(connected_date) as actual_date
        FROM status_changes 
        WHERE project_name = ${projectName}
      ) milestones
      ORDER BY eta NULLS LAST
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
      FROM (
        SELECT 
          'Pole Permission Approvals' as prerequisite_name,
          'Municipal Department' as responsible,
          CASE 
            WHEN COUNT(CASE WHEN status = 'Pole Permission: Approved' THEN 1 END) > 0 THEN 'In Progress'
            ELSE 'Pending'
          END as status
        FROM status_changes 
        WHERE project_name = ${projectName}
        
        UNION ALL
        
        SELECT 
          'Equipment Procurement' as prerequisite_name,
          'Supply Chain Team' as responsible,
          'Completed' as status
        
        UNION ALL
        
        SELECT 
          'Site Survey Completion' as prerequisite_name,
          'Engineering Team' as responsible,
          'Completed' as status
        
        UNION ALL
        
        SELECT 
          'Contractor Assignment' as prerequisite_name,
          'Project Manager' as responsible,
          CASE 
            WHEN COUNT(DISTINCT contractor) > 0 THEN 'Completed'
            ELSE 'Pending'
          END as status
        FROM status_changes 
        WHERE project_name = ${projectName}
        AND contractor IS NOT NULL
        AND contractor != ''
      ) prerequisites
      ORDER BY prerequisite_name
    `;
    
    return from(query) as Observable<any[]>;
  }
}