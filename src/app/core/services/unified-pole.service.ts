import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Firestore, collection, doc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
import { NeonService } from './neon.service';
import { PoleTrackerService } from '../services/pole-tracker.service';

export interface UnifiedPoleView {
  // Identity
  id: string;
  poleNumber: string;
  
  // From Neon (SOW & OneMap)
  plannedLocation?: {
    latitude: number;
    longitude: number;
  };
  plannedCapacity?: number;
  zone?: string;
  feeder?: string;
  distribution?: string;
  status?: string;
  statusDate?: Date;
  statusHistory?: Array<{
    status: string;
    date: Date;
    source: string;
  }>;
  
  // From Firebase (Field Work)
  actualLocation?: {
    latitude: number;
    longitude: number;
  };
  actualGPS?: {
    accuracy: number;
    timestamp: number;
  };
  photos?: {
    before?: string;
    front?: string;
    side?: string;
    depth?: string;
    concrete?: string;
    compaction?: string;
  };
  photoCount: number;
  qualityChecked?: boolean;
  qualityCheckDate?: Date;
  fieldNotes?: string;
  capturedBy?: string;
  capturedAt?: Date;
  
  // Computed Fields
  hasDiscrepancy?: boolean;
  locationDiscrepancyMeters?: number;
  dataCompleteness: number;
  dataGaps: string[];
  lastUpdated: Date;
  dataSources: {
    firebase: boolean;
    neon: boolean;
    onemap: boolean;
    sow: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UnifiedPoleService {
  private firestore = inject(Firestore);
  private neonService = inject(NeonService);
  private poleTrackerService = inject(PoleTrackerService);

  /**
   * Get unified view of a single pole combining all data sources
   */
  getUnifiedPoleView(poleNumber: string): Observable<UnifiedPoleView | null> {
    // Fetch from all sources in parallel
    const firebaseData$ = this.getFirebasePoleData(poleNumber);
    const neonSOWData$ = this.getNeonSOWData(poleNumber);
    const neonStatusData$ = this.getNeonStatusData(poleNumber);
    
    return combineLatest([
      firebaseData$,
      neonSOWData$,
      neonStatusData$
    ]).pipe(
      map(([firebase, sow, status]) => {
        if (!firebase && !sow && !status) return null;
        
        // Combine all data sources
        const unified: UnifiedPoleView = {
          id: firebase?.id || poleNumber,
          poleNumber: poleNumber,
          
          // From SOW (planned data)
          plannedLocation: sow?.location ? {
            latitude: sow.location.latitude,
            longitude: sow.location.longitude
          } : undefined,
          plannedCapacity: sow?.capacity,
          zone: sow?.zone || status?.zone,
          feeder: sow?.feeder || status?.feeder,
          distribution: sow?.distribution || status?.distribution,
          
          // From OneMap (status)
          status: status?.latestStatus,
          statusDate: status?.statusDate,
          statusHistory: status?.history || [],
          
          // From Firebase (field data)
          actualLocation: firebase?.gpsLocation,
          actualGPS: firebase?.gpsData,
          photos: firebase?.photos || {},
          photoCount: firebase?.photoCount || 0,
          qualityChecked: firebase?.qualityChecked,
          qualityCheckDate: firebase?.qualityCheckDate,
          fieldNotes: firebase?.notes,
          capturedBy: firebase?.capturedBy,
          capturedAt: firebase?.capturedAt,
          
          // Computed fields
          hasDiscrepancy: false,
          locationDiscrepancyMeters: 0,
          dataCompleteness: 0,
          dataGaps: [],
          lastUpdated: new Date(),
          dataSources: {
            firebase: !!firebase,
            neon: !!sow || !!status,
            onemap: !!status,
            sow: !!sow
          }
        };
        
        // Calculate discrepancies
        if (unified.plannedLocation && unified.actualLocation) {
          unified.locationDiscrepancyMeters = this.calculateDistance(
            unified.plannedLocation,
            unified.actualLocation
          );
          unified.hasDiscrepancy = unified.locationDiscrepancyMeters > 10; // 10m threshold
        }
        
        // Calculate data completeness
        unified.dataCompleteness = this.calculateCompleteness(unified);
        unified.dataGaps = this.identifyDataGaps(unified);
        
        return unified;
      }),
      catchError(error => {
        console.error('Error fetching unified pole view:', error);
        return of(null);
      })
    );
  }

  /**
   * Get Firebase pole data
   */
  private getFirebasePoleData(poleNumber: string): Observable<any> {
    return from(this.poleTrackerService.getPoleByNumber(poleNumber)).pipe(
      map(pole => {
        if (!pole) return null;
        
        // Parse GPS location if stored as string
        let gpsLocation = null;
        let gpsData = null;
        
        if (pole.location) {
          const coords = pole.location.split(',').map(c => parseFloat(c.trim()));
          if (coords.length === 2) {
            gpsLocation = {
              latitude: coords[0],
              longitude: coords[1]
            };
          }
        }
        
        if (pole.gpsAccuracy !== undefined) {
          gpsData = {
            accuracy: pole.gpsAccuracy,
            timestamp: pole.capturedAt?.getTime() || Date.now()
          };
        }
        
        // Count photos
        const photoCount = [
          pole.beforePhoto,
          pole.frontPhoto,
          pole.sidePhoto,
          pole.depthPhoto,
          pole.concretePhoto,
          pole.compactionPhoto
        ].filter(p => p).length;
        
        return {
          id: pole.id,
          gpsLocation,
          gpsData,
          photos: {
            before: pole.beforePhoto,
            front: pole.frontPhoto,
            side: pole.sidePhoto,
            depth: pole.depthPhoto,
            concrete: pole.concretePhoto,
            compaction: pole.compactionPhoto
          },
          photoCount,
          qualityChecked: pole.qualityVerified || false,
          qualityCheckDate: pole.qualityVerifiedAt,
          notes: pole.notes,
          capturedBy: pole.createdBy,
          capturedAt: pole.createdAt
        };
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Get Neon SOW data (planned infrastructure)
   */
  private getNeonSOWData(poleNumber: string): Observable<any> {
    return this.neonService.query(`
      SELECT 
        pole_number,
        gps_latitude,
        gps_longitude,
        max_drops as capacity,
        zone,
        feeder,
        distribution
      FROM sow_poles
      WHERE pole_number = $1
    `, [poleNumber]).pipe(
      map(results => {
        if (!results || results.length === 0) return null;
        
        const pole = results[0];
        return {
          location: (pole.gps_latitude && pole.gps_longitude) ? {
            latitude: parseFloat(pole.gps_latitude),
            longitude: parseFloat(pole.gps_longitude)
          } : null,
          capacity: pole.capacity,
          zone: pole.zone,
          feeder: pole.feeder,
          distribution: pole.distribution
        };
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Get Neon status data (from OneMap)
   */
  private getNeonStatusData(poleNumber: string): Observable<any> {
    return this.neonService.query(`
      SELECT 
        status,
        status_date,
        zone,
        feeder,
        distribution,
        contractor
      FROM onemap_status_changes
      WHERE pole_number = $1
      ORDER BY status_date DESC
    `, [poleNumber]).pipe(
      map(results => {
        if (!results || results.length === 0) return null;
        
        const latest = results[0];
        const history = results.map(r => ({
          status: r.status,
          date: new Date(r.status_date),
          source: 'OneMap'
        }));
        
        return {
          latestStatus: latest.status,
          statusDate: new Date(latest.status_date),
          zone: latest.zone,
          feeder: latest.feeder,
          distribution: latest.distribution,
          contractor: latest.contractor,
          history
        };
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Calculate distance between two GPS points in meters
   */
  private calculateDistance(point1: { latitude: number; longitude: number }, 
                          point2: { latitude: number; longitude: number }): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Calculate data completeness percentage
   */
  private calculateCompleteness(pole: UnifiedPoleView): number {
    const requiredFields = [
      pole.poleNumber,
      pole.status,
      pole.zone,
      pole.actualLocation || pole.plannedLocation,
      pole.photoCount > 0
    ];
    
    const completedFields = requiredFields.filter(f => f).length;
    return Math.round((completedFields / requiredFields.length) * 100);
  }

  /**
   * Identify missing data fields
   */
  private identifyDataGaps(pole: UnifiedPoleView): string[] {
    const gaps: string[] = [];
    
    if (!pole.status) gaps.push('Status update');
    if (!pole.zone) gaps.push('Zone assignment');
    if (!pole.actualLocation && !pole.plannedLocation) gaps.push('GPS location');
    if (pole.photoCount === 0) gaps.push('Field photos');
    if (!pole.qualityChecked) gaps.push('Quality check');
    if (pole.plannedLocation && !pole.actualLocation) gaps.push('Field verification');
    
    return gaps;
  }

  /**
   * Get all poles with unified view (paginated)
   */
  getUnifiedPolesList(limit: number = 100, offset: number = 0): Observable<UnifiedPoleView[]> {
    // Get pole numbers from both sources
    const neonPoles$ = this.neonService.query<{ pole_number: string }>(`
      SELECT DISTINCT pole_number 
      FROM (
        SELECT pole_number FROM sow_poles WHERE pole_number IS NOT NULL
        UNION
        SELECT pole_number FROM onemap_status_changes WHERE pole_number IS NOT NULL
      ) combined
      ORDER BY pole_number
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return neonPoles$.pipe(
      switchMap(poles => {
        if (!poles || poles.length === 0) return of([]);
        
        // Fetch unified view for each pole
        const unifiedRequests = poles.map(p => 
          this.getUnifiedPoleView(p.pole_number)
        );
        
        return combineLatest(unifiedRequests);
      }),
      map(poles => poles.filter(p => p !== null) as UnifiedPoleView[])
    );
  }

  /**
   * Search poles across both databases
   */
  searchPoles(searchTerm: string): Observable<UnifiedPoleView[]> {
    const search = `%${searchTerm}%`;
    
    // Search in Neon
    const neonSearch$ = this.neonService.query<{ pole_number: string }>(`
      SELECT DISTINCT pole_number 
      FROM (
        SELECT pole_number FROM sow_poles 
        WHERE pole_number ILIKE $1 OR zone ILIKE $1
        UNION
        SELECT pole_number FROM onemap_status_changes 
        WHERE pole_number ILIKE $1 OR status ILIKE $1
      ) combined
      LIMIT 50
    `, [search]);
    
    return neonSearch$.pipe(
      switchMap(poles => {
        if (!poles || poles.length === 0) return of([]);
        
        const unifiedRequests = poles.map(p => 
          this.getUnifiedPoleView(p.pole_number)
        );
        
        return combineLatest(unifiedRequests);
      }),
      map(poles => poles.filter(p => p !== null) as UnifiedPoleView[])
    );
  }
}