import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { NeonService } from '@app/core/services/neon.service';
import { ProjectService } from '@app/core/services/project.service';
import { 
  NokiaData, 
  NokiaSummary, 
  NokiaTeamSummary, 
  NokiaSignalQuality,
  NokiaFilterOptions,
  NokiaImportBatch,
  getSignalQuality,
  parseSignalStrength,
  convertExcelTimestamp
} from '../models/nokia.model';

@Injectable({
  providedIn: 'root'
})
export class NokiaService {
  private neonService = inject(NeonService);
  private projectService = inject(ProjectService);

  /**
   * Get all Nokia data with optional filtering
   */
  getNokiaData(filters?: NokiaFilterOptions): Observable<NokiaData[]> {
    // Query status_changes table where Nokia data was imported
    let baseQuery = 'SELECT * FROM status_changes WHERE project_name = \'Nokia\'';
    const conditions: string[] = [];

    // Add filters using string interpolation (safe because we control the values)
    if (filters?.projectId) {
      conditions.push(`project_id = '${filters.projectId.replace(/'/g, "''")}'`);
    }

    if (filters?.status) {
      conditions.push(`LOWER(status) = LOWER('${filters.status.replace(/'/g, "''")}')`);
    }

    if (filters?.team) {
      conditions.push(`LOWER(team) = LOWER('${filters.team.replace(/'/g, "''")}')`);
    }

    if (filters?.dateFrom) {
      const dateStr = filters.dateFrom.toISOString().split('T')[0];
      conditions.push(`measurement_date >= '${dateStr}'`);
    }

    if (filters?.dateTo) {
      const dateStr = filters.dateTo.toISOString().split('T')[0];
      conditions.push(`measurement_date <= '${dateStr}'`);
    }

    // Filter by signal quality if specified
    if (filters?.signalQuality) {
      switch (filters.signalQuality) {
        case 'excellent':
          conditions.push('ont_rx_signal_dbm > -15');
          break;
        case 'good':
          conditions.push('ont_rx_signal_dbm BETWEEN -20 AND -15');
          break;
        case 'fair':
          conditions.push('ont_rx_signal_dbm BETWEEN -25 AND -20');
          break;
        case 'poor':
          conditions.push('ont_rx_signal_dbm < -25');
          break;
      }
    }

    // Combine conditions
    if (conditions.length > 0) {
      baseQuery += ' AND ' + conditions.join(' AND ');
    }

    baseQuery += ' ORDER BY measurement_date DESC, team, drop_number';

    return this.neonService.query<NokiaData>(baseQuery)
      .pipe(
        catchError(error => {
          console.error('Error fetching Nokia data:', error);
          return of([]);
        })
      );
  }

  /**
   * Get Nokia data summary statistics
   */
  getNokiaSummary(projectId?: string): Observable<NokiaSummary> {
    let query = `
      SELECT 
        COUNT(*) as total_equipment,
        COUNT(CASE WHEN LOWER(status) = 'active' THEN 1 END) as active_equipment,
        COUNT(CASE WHEN LOWER(status) != 'active' THEN 1 END) as inactive_equipment,
        COUNT(DISTINCT team) as total_teams,
        AVG(ont_rx_signal_dbm) as avg_signal_strength,
        MAX(measurement_date) as last_measurement
      FROM status_changes
      WHERE project_name = 'Nokia'
    `;
    
    if (projectId) {
      query += ` AND project_id = '${projectId.replace(/'/g, "''")}'`;
    }

    return this.neonService.query<any>(query)
      .pipe(
        map(results => {
          const result = results[0] || {};
          return {
            totalEquipment: parseInt(result.total_equipment) || 0,
            activeEquipment: parseInt(result.active_equipment) || 0,
            inactiveEquipment: parseInt(result.inactive_equipment) || 0,
            totalTeams: parseInt(result.total_teams) || 0,
            avgSignalStrength: parseFloat(result.avg_signal_strength) || 0,
            lastMeasurement: result.last_measurement ? new Date(result.last_measurement) : null
          };
        }),
        catchError(error => {
          console.error('Error fetching Nokia summary:', error);
          return of({
            totalEquipment: 0,
            activeEquipment: 0,
            inactiveEquipment: 0,
            totalTeams: 0,
            avgSignalStrength: 0,
            lastMeasurement: null
          });
        })
      );
  }

  /**
   * Get team performance summary
   */
  getTeamSummary(projectId?: string): Observable<NokiaTeamSummary[]> {
    let query = `
      SELECT 
        team,
        COUNT(*) as equipment_count,
        COUNT(CASE WHEN LOWER(status) = 'active' THEN 1 END) as active_count,
        AVG(ont_rx_signal_dbm) as avg_signal_strength,
        AVG(current_ont_rx) as avg_current_rx,
        MAX(measurement_date) as last_measurement
      FROM status_changes
      WHERE project_name = 'Nokia'
    `;
    
    if (projectId) {
      query += ` AND project_id = '${projectId.replace(/'/g, "''")}'`;
    }
    
    query += ' GROUP BY team ORDER BY equipment_count DESC';

    return this.neonService.query<any>(query)
      .pipe(
        map(results => results.map(result => ({
          team: result.team || 'Unknown',
          equipmentCount: parseInt(result.equipment_count) || 0,
          activeCount: parseInt(result.active_count) || 0,
          avgSignalStrength: parseFloat(result.avg_signal_strength) || 0,
          avgCurrentRx: parseFloat(result.avg_current_rx) || 0,
          lastMeasurement: result.last_measurement ? new Date(result.last_measurement) : null
        }))),
        catchError(error => {
          console.error('Error fetching team summary:', error);
          return of([]);
        })
      );
  }

  /**
   * Get signal quality distribution
   */
  getSignalQualityDistribution(projectId?: string): Observable<NokiaSignalQuality> {
    let query = `
      SELECT 
        COUNT(CASE WHEN ont_rx_signal_dbm > -15 THEN 1 END) as excellent,
        COUNT(CASE WHEN ont_rx_signal_dbm BETWEEN -20 AND -15 THEN 1 END) as good,
        COUNT(CASE WHEN ont_rx_signal_dbm BETWEEN -25 AND -20 THEN 1 END) as fair,
        COUNT(CASE WHEN ont_rx_signal_dbm < -25 THEN 1 END) as poor
      FROM status_changes
      WHERE project_name = 'Nokia'
        AND ont_rx_signal_dbm IS NOT NULL
    `;
    
    if (projectId) {
      query += ` AND project_id = '${projectId.replace(/'/g, "''")}'`;
    }

    return this.neonService.query<any>(query)
      .pipe(
        map(results => {
          const result = results[0] || {};
          return {
            excellent: parseInt(result.excellent) || 0,
            good: parseInt(result.good) || 0,
            fair: parseInt(result.fair) || 0,
            poor: parseInt(result.poor) || 0
          };
        }),
        catchError(error => {
          console.error('Error fetching signal quality distribution:', error);
          return of({ excellent: 0, good: 0, fair: 0, poor: 0 });
        })
      );
  }

  /**
   * Get unique teams list
   */
  getTeams(projectId?: string): Observable<string[]> {
    let query = 'SELECT DISTINCT team FROM status_changes WHERE project_name = \'Nokia\' AND team IS NOT NULL';
    
    if (projectId) {
      query += ` AND project_id = '${projectId.replace(/'/g, "''")}'`;
    }
    
    query += ' ORDER BY team';

    return this.neonService.query<{team: string}>(query)
      .pipe(
        map(results => results.map(r => r.team)),
        catchError(error => {
          console.error('Error fetching teams:', error);
          return of([]);
        })
      );
  }

  /**
   * Get unique status values
   */
  getStatuses(): Observable<string[]> {
    const query = 'SELECT DISTINCT status FROM status_changes WHERE project_name = \'Nokia\' AND status IS NOT NULL ORDER BY status';
    
    return this.neonService.query<{status: string}>(query)
      .pipe(
        map(results => results.map(r => r.status)),
        catchError(error => {
          console.error('Error fetching statuses:', error);
          return of([]);
        })
      );
  }

  /**
   * Get equipment by drop number
   */
  getEquipmentByDrop(dropNumber: string): Observable<NokiaData[]> {
    const query = `SELECT * FROM status_changes WHERE project_name = 'Nokia' AND drop_number = '${dropNumber.replace(/'/g, "''")}' ORDER BY measurement_date DESC`;
    
    return this.neonService.query<NokiaData>(query)
      .pipe(
        catchError(error => {
          console.error('Error fetching equipment by drop:', error);
          return of([]);
        })
      );
  }

  /**
   * Search equipment by serial number or drop number
   */
  searchEquipment(searchTerm: string): Observable<NokiaData[]> {
    const escapedTerm = searchTerm.replace(/'/g, "''").replace(/%/g, '\\%').replace(/_/g, '\\_');
    const searchPattern = `%${escapedTerm}%`;
    
    const query = `
      SELECT * FROM status_changes 
      WHERE project_name = 'Nokia'
        AND (drop_number ILIKE '${searchPattern}'
         OR serial_number ILIKE '${searchPattern}'
         OR olt_address ILIKE '${searchPattern}'
         OR team ILIKE '${searchPattern}')
      ORDER BY measurement_date DESC
      LIMIT 100
    `;
    
    return this.neonService.query<NokiaData>(query)
      .pipe(
        catchError(error => {
          console.error('Error searching equipment:', error);
          return of([]);
        })
      );
  }

  /**
   * Test database connection and table existence
   */
  testConnection(): Observable<{ success: boolean; message: string; recordCount?: number }> {
    return this.neonService.query<{count: string}>('SELECT COUNT(*) as count FROM status_changes WHERE project_name = \'Nokia\'')
      .pipe(
        map(result => ({
          success: true,
          message: `Nokia database connected successfully`,
          recordCount: parseInt((result as any)[0]?.count || '0') || 0
        })),
        catchError((error: any) => of({
          success: false,
          message: `Nokia database connection failed: ${error.message}`,
          recordCount: 0
        }))
      );
  }
}