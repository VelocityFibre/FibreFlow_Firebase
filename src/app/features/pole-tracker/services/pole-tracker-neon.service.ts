import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of, BehaviorSubject, combineLatest, switchMap } from 'rxjs';
import { NeonService } from '../../../core/services/neon.service';
import { 
  PoleTracker, 
  PoleTrackerFilter, 
  PoleTrackerStats,
  UploadType,
  ImageUpload,
  StatusHistoryEntry,
  HomeSignup,
  HomesConnected,
  HomesActivated
} from '../models/pole-tracker.model';

interface NeonPole {
  id: string;
  project_id: string;
  pole_number: string;
  vf_pole_id: string;
  status: string;
  pole_type: string;
  pon: string;
  zone: string;
  location: string;
  gps_lat: number;
  gps_lon: number;
  drop_count: number;
  max_capacity: number;
  connected_drops: string[];
  quality_checked: boolean;
  contractor_id: string;
  working_team: string;
  upload_before: boolean;
  upload_front: boolean;
  upload_side: boolean;
  upload_depth: boolean;
  upload_concrete: boolean;
  upload_compaction: boolean;
  import_batch_id: string;
  date_installed: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  // Joined data
  project_name?: string;
  project_code?: string;
  status_history?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class PoleTrackerNeonService {
  private neonService = inject(NeonService);
  
  // Local cache for performance
  private polesCache = new BehaviorSubject<Map<string, PoleTracker>>(new Map());
  private lastRefresh = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all poles with optional filtering
   */
  getAll(filter?: PoleTrackerFilter): Observable<PoleTracker[]> {
    let query = `
      SELECT 
        p.*,
        pr.name as project_name,
        pr.project_code,
        p.connected_drops,
        (
          SELECT json_agg(sh ORDER BY sh.changed_at DESC)
          FROM status_history sh
          WHERE sh.pole_number = p.pole_number
        ) as status_history
      FROM project_poles p
      LEFT JOIN projects pr ON p.project_id = pr.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filter) {
      if (filter.projectId) {
        query += ` AND p.project_id = $${paramIndex++}`;
        params.push(filter.projectId);
      }
      if (filter.contractorId) {
        query += ` AND p.contractor_id = $${paramIndex++}`;
        params.push(filter.contractorId);
      }
      if (filter.workingTeam) {
        query += ` AND p.working_team = $${paramIndex++}`;
        params.push(filter.workingTeam);
      }
      if (filter.poleType) {
        query += ` AND p.pole_type = $${paramIndex++}`;
        params.push(filter.poleType);
      }
      if (filter.qualityChecked !== undefined) {
        query += ` AND p.quality_checked = $${paramIndex++}`;
        params.push(filter.qualityChecked);
      }
      if (filter.dateFrom) {
        query += ` AND p.date_installed >= $${paramIndex++}`;
        params.push(filter.dateFrom);
      }
      if (filter.dateTo) {
        query += ` AND p.date_installed <= $${paramIndex++}`;
        params.push(filter.dateTo);
      }
    }
    
    query += `
      GROUP BY p.id, pr.id
      ORDER BY p.created_at DESC
    `;
    
    return this.neonService.query<NeonPole>(query, params).pipe(
      map(rows => rows.map(row => this.mapNeonPoleToModel(row))),
      catchError(error => {
        console.error('Error fetching poles:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a single pole by ID
   */
  getById(id: string): Observable<PoleTracker | null> {
    const query = `
      SELECT 
        p.*,
        pr.name as project_name,
        pr.project_code,
        p.connected_drops,
        (
          SELECT json_agg(sh ORDER BY sh.changed_at DESC)
          FROM status_history sh
          WHERE sh.pole_number = p.pole_number
        ) as status_history
      FROM project_poles p
      LEFT JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = $1::uuid
    `;
    
    return this.neonService.query<NeonPole>(query, [id]).pipe(
      map(rows => rows.length > 0 ? this.mapNeonPoleToModel(rows[0]) : null),
      catchError(error => {
        console.error('Error fetching pole:', error);
        return of(null);
      })
    );
  }

  /**
   * Get pole by pole number
   */
  getByPoleNumber(poleNumber: string): Observable<PoleTracker | null> {
    const query = `
      SELECT p.*, pr.name as project_name, pr.project_code, p.connected_drops
      FROM project_poles p
      LEFT JOIN projects pr ON p.project_id = pr.id
      WHERE LOWER(p.pole_number) = LOWER($1)
    `;
    
    return this.neonService.query<NeonPole>(query, [poleNumber]).pipe(
      map(rows => rows.length > 0 ? this.mapNeonPoleToModel(rows[0]) : null),
      catchError(error => {
        console.error('Error fetching pole by number:', error);
        return of(null);
      })
    );
  }

  /**
   * Create a new pole
   */
  create(pole: Partial<PoleTracker>): Observable<string> {
    // Validate pole number uniqueness
    return this.validatePoleNumber(pole.poleNumber!).pipe(
      map(isValid => {
        if (!isValid) {
          throw new Error(`Pole number ${pole.poleNumber} already exists`);
        }
        return true;
      }),
      switchMap(() => {
        const query = `
          INSERT INTO project_poles (
            project_id, pole_number, vf_pole_id, status,
            zone, pon, location, gps_lat, gps_lon,
            contractor_id, working_team,
            date_installed, pole_type,
            drop_count, max_capacity, connected_drops,
            created_by, updated_by
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17
          )
          RETURNING id
        `;
        
        // Parse GPS from location string
        const gps = this.parseLocation(pole.location);
        
        const params = [
          pole.projectId,
          pole.poleNumber,
          pole.vfPoleId || this.generateVfPoleId(pole.projectCode!, pole.poleNumber!),
          pole.status || 'Permission not granted',
          pole.zone,
          pole.pon,
          pole.location,
          gps.lat,
          gps.lon,
          pole.contractorId,
          pole.workingTeam,
          pole.dateInstalled || new Date(),
          pole.poleType || 'wooden',
          pole.dropCount || 0,
          pole.maxCapacity || 12,
          pole.connectedDrops || [],
          pole.createdBy || 'system'
        ];
        
        return this.neonService.query<{ id: string }>(query, params);
      }),
      map(result => result[0].id),
      catchError(error => {
        console.error('Error creating pole:', error);
        throw error;
      })
    );
  }

  /**
   * Update an existing pole
   */
  update(id: string, updates: Partial<PoleTracker>): Observable<void> {
    // Build dynamic update query
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Add fields to update
    const allowedFields = [
      'pole_number', 'status', 'zone', 'pon', 'location',
      'gps_lat', 'gps_lon', 'contractor_id', 'working_team',
      'date_installed', 'pole_type', 'quality_checked',
      'drop_count', 'max_capacity', 'connected_drops',
      'upload_before', 'upload_front', 'upload_side',
      'upload_depth', 'upload_concrete', 'upload_compaction'
    ];
    
    // Create a mutable copy of updates
    const mutableUpdates: any = { ...updates };
    
    // Handle location parsing if location is being updated
    if (mutableUpdates.location) {
      const gps = this.parseLocation(mutableUpdates.location);
      mutableUpdates.gps_lat = gps.lat;
      mutableUpdates.gps_lon = gps.lon;
    }
    
    Object.entries(mutableUpdates).forEach(([key, value]) => {
      const dbField = this.camelToSnake(key);
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramIndex++}`);
        params.push(value);
      }
    });
    
    if (updateFields.length === 0) {
      return of(undefined);
    }
    
    // Add updated_by and updated_at
    updateFields.push(`updated_by = $${paramIndex++}`);
    params.push(updates.updatedBy || 'system');
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add ID as last parameter
    params.push(id);
    
    const query = `
      UPDATE project_poles 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}::uuid
    `;
    
    return this.neonService.query(query, params).pipe(
      map(() => undefined),
      catchError(error => {
        console.error('Error updating pole:', error);
        throw error;
      })
    );
  }

  /**
   * Delete a pole (soft delete by setting status)
   */
  delete(id: string): Observable<void> {
    const query = `
      UPDATE project_poles 
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::uuid
    `;
    
    return this.neonService.query(query, [id]).pipe(
      map(() => undefined),
      catchError(error => {
        console.error('Error deleting pole:', error);
        throw error;
      })
    );
  }

  /**
   * Get poles by project
   */
  getByProject(projectId: string): Observable<PoleTracker[]> {
    return this.getAll({ projectId });
  }

  /**
   * Get poles by contractor
   */
  getByContractor(contractorId: string): Observable<PoleTracker[]> {
    return this.getAll({ contractorId });
  }

  /**
   * Add status history entry
   */
  addStatusHistory(poleId: string, status: string, notes?: string, changedBy?: string): Observable<void> {
    const query = `
      WITH pole_info AS (
        SELECT pole_number, status, project_id 
        FROM project_poles 
        WHERE id = $1::uuid
      )
      INSERT INTO status_history (
        property_id, pole_number, old_status, new_status,
        changed_by, changed_at, change_details
      )
      SELECT project_id::text, pole_number, status, $2, $3, NOW(), $4::jsonb
      FROM pole_info
    `;
    
    return this.neonService.query(query, [
      poleId, 
      status, 
      changedBy || 'system', 
      JSON.stringify({ notes, source: 'fibreflow_app' })
    ]).pipe(
      switchMap(() => {
        // Update pole status
        return this.neonService.query(
          'UPDATE project_poles SET status = $1 WHERE id = $2::uuid',
          [status, poleId]
        );
      }),
      map(() => undefined),
      catchError(error => {
        console.error('Error adding status history:', error);
        throw error;
      })
    );
  }

  /**
   * Upload photo for a pole
   */
  uploadPhoto(poleId: string, photoType: UploadType, photoUrl: string, thumbnailUrl?: string): Observable<void> {
    // Map photo type to column name
    const uploadColumn = `upload_${photoType}`;
    
    // Update the boolean flag for the specific photo type
    const query = `
      UPDATE project_poles 
      SET ${uploadColumn} = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1::uuid
    `;
    
    return this.neonService.query(query, [poleId]).pipe(
      map(() => undefined),
      catchError(error => {
        console.error('Error uploading photo:', error);
        throw error;
      })
    );
  }

  /**
   * Get statistics
   */
  getStatistics(projectId?: string): Observable<PoleTrackerStats> {
    let whereClause = '';
    const params: any[] = [];
    
    if (projectId) {
      whereClause = 'WHERE p.project_id = $1::uuid';
      params.push(projectId);
    }
    
    const query = `
      WITH pole_stats AS (
        SELECT 
          COUNT(*) as total_poles,
          COUNT(CASE WHEN status LIKE '%Completed%' OR status LIKE '%Installed%' THEN 1 END) as installed_poles,
          COUNT(CASE WHEN quality_checked = true THEN 1 END) as quality_checked_poles,
          COUNT(CASE WHEN 
            upload_before = true AND upload_front = true AND 
            upload_side = true AND upload_depth = true AND 
            upload_concrete = true AND upload_compaction = true 
          THEN 1 END) as poles_with_all_uploads,
          SUM(drop_count) as total_drops,
          COUNT(CASE WHEN drop_count = 12 THEN 1 END) as poles_at_capacity,
          COUNT(CASE WHEN drop_count >= 10 THEN 1 END) as poles_near_capacity,
          AVG(drop_count) as avg_drops_per_pole
        FROM project_poles p
        ${whereClause}
      ),
      type_stats AS (
        SELECT 
          pole_type,
          COUNT(*) as count
        FROM project_poles p
        ${whereClause}
        GROUP BY pole_type
      ),
      contractor_stats AS (
        SELECT 
          contractor_id,
          working_team,
          COUNT(*) as count
        FROM project_poles p
        ${whereClause}
        WHERE contractor_id IS NOT NULL
        GROUP BY contractor_id, working_team
      )
      SELECT 
        ps.*,
        COALESCE(json_object_agg(ts.pole_type, ts.count) FILTER (WHERE ts.pole_type IS NOT NULL), '{}'::json) as poles_by_type,
        COALESCE(json_agg(json_build_object(
          'id', cs.contractor_id,
          'name', cs.working_team,
          'count', cs.count
        )) FILTER (WHERE cs.contractor_id IS NOT NULL), '[]'::json) as poles_by_contractor
      FROM pole_stats ps
      LEFT JOIN type_stats ts ON true
      LEFT JOIN contractor_stats cs ON true
      GROUP BY ps.total_poles, ps.installed_poles, ps.quality_checked_poles,
               ps.poles_with_all_uploads, ps.total_drops, ps.poles_at_capacity,
               ps.poles_near_capacity, ps.avg_drops_per_pole
    `;
    
    return this.neonService.query<any>(query, params).pipe(
      map(rows => {
        if (rows.length === 0) {
          return this.getEmptyStats();
        }
        
        const row = rows[0];
        return {
          totalPoles: parseInt(row.total_poles) || 0,
          installedPoles: parseInt(row.installed_poles) || 0,
          qualityCheckedPoles: parseInt(row.quality_checked_poles) || 0,
          polesWithAllUploads: parseInt(row.poles_with_all_uploads) || 0,
          polesByType: row.poles_by_type || {},
          polesByContractor: Object.entries(row.poles_by_contractor || {}).reduce((acc, [id, data]: any) => {
            acc[id] = { name: data.name, count: data.count };
            return acc;
          }, {} as any),
          installationProgress: row.total_poles > 0 
            ? (row.installed_poles / row.total_poles) * 100 
            : 0,
          poleCapacityStats: {
            totalDrops: parseInt(row.total_drops) || 0,
            polesAtCapacity: parseInt(row.poles_at_capacity) || 0,
            polesNearCapacity: parseInt(row.poles_near_capacity) || 0,
            averageDropsPerPole: parseFloat(row.avg_drops_per_pole) || 0,
            capacityUtilization: row.total_poles > 0
              ? (row.total_drops / (row.total_poles * 12)) * 100
              : 0
          }
        };
      }),
      catchError(error => {
        console.error('Error fetching statistics:', error);
        return of(this.getEmptyStats());
      })
    );
  }

  /**
   * Validate pole number uniqueness
   */
  validatePoleNumber(poleNumber: string, excludeId?: string): Observable<boolean> {
    const query = excludeId
      ? `SELECT NOT EXISTS(
          SELECT 1 FROM project_poles 
          WHERE LOWER(pole_number) = LOWER($1) 
          AND id != $2::uuid
        ) as is_valid`
      : `SELECT NOT EXISTS(
          SELECT 1 FROM project_poles 
          WHERE LOWER(pole_number) = LOWER($1)
        ) as is_valid`;
    
    const params = excludeId ? [poleNumber, excludeId] : [poleNumber];
    
    return this.neonService.query<{ is_valid: boolean }>(query, params).pipe(
      map(rows => rows[0]?.is_valid || false),
      catchError(() => of(false))
    );
  }

  /**
   * Check if pole has capacity for more drops
   */
  checkPoleCapacity(poleId: string): Observable<boolean> {
    return this.neonService.query<{ drop_count: number; max_capacity: number }>(
      'SELECT drop_count, max_capacity FROM project_poles WHERE id = $1::uuid',
      [poleId]
    ).pipe(
      map(rows => {
        if (rows.length === 0) return false;
        const pole = rows[0];
        return pole.drop_count < pole.max_capacity;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Get drops connected to a pole
   */
  getConnectedDrops(poleId: string): Observable<any[]> {
    const query = `
      SELECT 
        d.*,
        p.pole_number,
        p.zone,
        p.pon
      FROM project_drops d
      JOIN project_poles p ON d.connected_to_pole = p.pole_number
      WHERE p.id = $1::uuid
      ORDER BY d.drop_number
    `;
    
    return this.neonService.query(query, [poleId]).pipe(
      catchError(error => {
        console.error('Error fetching connected drops:', error);
        return of([]);
      })
    );
  }

  /**
   * Helper function to map Neon pole data to model
   */
  private mapNeonPoleToModel(row: NeonPole): PoleTracker {
    // Map upload boolean fields to uploads object
    const uploads: any = {
      before: { uploaded: row.upload_before || false },
      front: { uploaded: row.upload_front || false },
      side: { uploaded: row.upload_side || false },
      depth: { uploaded: row.upload_depth || false },
      concrete: { uploaded: row.upload_concrete || false },
      compaction: { uploaded: row.upload_compaction || false }
    };
    
    // Map status history
    const statusHistory = (row.status_history || []).map((sh: any) => ({
      status: sh.new_status,
      changedAt: new Date(sh.changed_at),
      changedBy: sh.changed_by,
      previousStatus: sh.old_status,
      notes: sh.change_details?.notes
    }));
    
    // Construct location string from GPS coordinates
    const location = row.gps_lat && row.gps_lon 
      ? `${row.gps_lat},${row.gps_lon}` 
      : row.location || '';
    
    return {
      id: row.id,
      vfPoleId: row.vf_pole_id || '',
      projectId: row.project_id,
      projectCode: row.project_code || '',
      projectName: row.project_name,
      poleNumber: row.pole_number,
      connectedDrops: row.connected_drops || [],
      dropCount: row.drop_count || 0,
      maxCapacity: row.max_capacity || 12,
      status: row.status,
      statusHistory,
      pon: row.pon,
      zone: row.zone,
      distributionFeeder: '', // Not in current schema
      dateInstalled: row.date_installed ? new Date(row.date_installed) : new Date(),
      location,
      poleType: row.pole_type as any,
      contractorId: row.contractor_id,
      contractorName: row.working_team, // Using working_team as contractor name
      workingTeam: row.working_team,
      ratePaid: undefined, // Not in current schema
      uploads,
      qualityChecked: row.quality_checked || false,
      qualityCheckedBy: undefined, // Not in current schema
      qualityCheckDate: undefined, // Not in current schema
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      updatedBy: row.updated_by
    };
  }

  /**
   * Generate VF Pole ID
   */
  private generateVfPoleId(projectCode: string, poleNumber: string): string {
    const prefix = projectCode.substring(0, 3).toUpperCase();
    return `${prefix}.P.${poleNumber}`;
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Parse location string to GPS coordinates
   */
  private parseLocation(location?: string): { lat: number | null; lon: number | null } {
    if (!location) return { lat: null, lon: null };
    
    // Handle "lat,lng" format
    const match = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lon: parseFloat(match[2])
      };
    }
    
    return { lat: null, lon: null };
  }

  /**
   * Get empty statistics object
   */
  private getEmptyStats(): PoleTrackerStats {
    return {
      totalPoles: 0,
      installedPoles: 0,
      qualityCheckedPoles: 0,
      polesWithAllUploads: 0,
      polesByType: {},
      polesByContractor: {},
      installationProgress: 0,
      poleCapacityStats: {
        totalDrops: 0,
        polesAtCapacity: 0,
        polesNearCapacity: 0,
        averageDropsPerPole: 0,
        capacityUtilization: 0
      }
    };
  }
}