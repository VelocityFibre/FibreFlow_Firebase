import { Injectable, inject } from '@angular/core';
import { Observable, timer, BehaviorSubject, Subject } from 'rxjs';
import { switchMap, map, catchError, distinctUntilChanged, tap } from 'rxjs/operators';
import { NeonService } from './neon.service';

export interface StatusUpdate {
  poleNumber: string;
  previousStatus?: string;
  currentStatus: string;
  statusDate: Date;
  source: 'OneMap' | 'Manual';
  zone?: string;
  contractor?: string;
}

export interface StatusSyncState {
  isRunning: boolean;
  lastSync: Date | null;
  pendingUpdates: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class StatusSyncService {
  private neonService = inject(NeonService);
  
  // State management
  private syncStateSubject = new BehaviorSubject<StatusSyncState>({
    isRunning: false,
    lastSync: null,
    pendingUpdates: 0,
    errors: []
  });
  public syncState$ = this.syncStateSubject.asObservable();
  
  // Status updates stream
  private statusUpdatesSubject = new Subject<StatusUpdate[]>();
  public statusUpdates$ = this.statusUpdatesSubject.asObservable();
  
  // Track last sync timestamp
  private lastSyncTimestamp: Date | null = null;
  
  // Polling interval (30 seconds)
  private readonly POLL_INTERVAL = 30000;
  
  private pollingSubscription?: any;

  /**
   * Start polling for status updates
   */
  startStatusSync(): void {
    if (this.syncStateSubject.value.isRunning) {
      console.log('Status sync already running');
      return;
    }
    
    this.updateSyncState({ isRunning: true, errors: [] });
    
    // Set initial timestamp to now if not set
    if (!this.lastSyncTimestamp) {
      this.lastSyncTimestamp = new Date();
    }
    
    // Start polling
    this.pollingSubscription = timer(0, this.POLL_INTERVAL).pipe(
      switchMap(() => this.fetchLatestStatusUpdates()),
      tap(updates => {
        if (updates.length > 0) {
          this.statusUpdatesSubject.next(updates);
          this.updateSyncState({ 
            lastSync: new Date(),
            pendingUpdates: 0 
          });
        }
      }),
      catchError(error => {
        console.error('Status sync error:', error);
        this.addError(error.message || 'Unknown sync error');
        return [];
      })
    ).subscribe();
  }

  /**
   * Stop polling for status updates
   */
  stopStatusSync(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
    
    this.updateSyncState({ isRunning: false });
  }

  /**
   * Fetch latest status updates from Neon
   */
  private fetchLatestStatusUpdates(): Observable<StatusUpdate[]> {
    const since = this.lastSyncTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    
    return this.neonService.query<any>(`
      WITH latest_updates AS (
        SELECT 
          pole_number,
          status,
          status_date,
          zone,
          contractor,
          ROW_NUMBER() OVER (PARTITION BY pole_number ORDER BY status_date DESC) as rn
        FROM onemap_status_changes
        WHERE status_date > $1
          AND pole_number IS NOT NULL
      ),
      previous_status AS (
        SELECT DISTINCT ON (pole_number)
          pole_number,
          status as previous_status
        FROM onemap_status_changes
        WHERE status_date <= $1
          AND pole_number IS NOT NULL
        ORDER BY pole_number, status_date DESC
      )
      SELECT 
        lu.pole_number,
        ps.previous_status,
        lu.status as current_status,
        lu.status_date,
        lu.zone,
        lu.contractor
      FROM latest_updates lu
      LEFT JOIN previous_status ps ON lu.pole_number = ps.pole_number
      WHERE lu.rn = 1
      ORDER BY lu.status_date DESC
    `, [since]).pipe(
      map(results => {
        // Update last sync timestamp to the newest status date
        if (results.length > 0) {
          const newestDate = new Date(results[0].status_date);
          if (newestDate > since) {
            this.lastSyncTimestamp = newestDate;
          }
        }
        
        return results.map(r => ({
          poleNumber: r.pole_number,
          previousStatus: r.previous_status,
          currentStatus: r.current_status,
          statusDate: new Date(r.status_date),
          source: 'OneMap' as const,
          zone: r.zone,
          contractor: r.contractor
        }));
      })
    );
  }

  /**
   * Get status history for a specific pole
   */
  getPoleStatusHistory(poleNumber: string): Observable<StatusUpdate[]> {
    return this.neonService.query<any>(`
      SELECT 
        pole_number,
        status as current_status,
        status_date,
        zone,
        contractor,
        LAG(status) OVER (ORDER BY status_date) as previous_status
      FROM onemap_status_changes
      WHERE pole_number = $1
      ORDER BY status_date DESC
    `, [poleNumber]).pipe(
      map(results => results.map(r => ({
        poleNumber: r.pole_number,
        previousStatus: r.previous_status,
        currentStatus: r.current_status,
        statusDate: new Date(r.status_date),
        source: 'OneMap' as const,
        zone: r.zone,
        contractor: r.contractor
      })))
    );
  }

  /**
   * Get status summary analytics
   */
  getStatusSummary(): Observable<any> {
    return this.neonService.query(`
      WITH status_counts AS (
        SELECT 
          status,
          COUNT(DISTINCT pole_number) as pole_count,
          COUNT(DISTINCT property_id) as property_count,
          MAX(status_date) as last_updated
        FROM onemap_status_changes
        WHERE pole_number IS NOT NULL
        GROUP BY status
      )
      SELECT 
        status,
        pole_count,
        property_count,
        last_updated,
        CASE 
          WHEN status LIKE '%Approved%' THEN 'success'
          WHEN status LIKE '%In Progress%' THEN 'warning'
          WHEN status LIKE '%Declined%' THEN 'error'
          ELSE 'info'
        END as status_color
      FROM status_counts
      ORDER BY pole_count DESC
    `);
  }

  /**
   * Get pending status changes count
   */
  getPendingCount(): Observable<number> {
    const since = this.lastSyncTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return this.neonService.query<any>(`
      SELECT COUNT(DISTINCT pole_number) as count
      FROM onemap_status_changes
      WHERE status_date > $1
        AND pole_number IS NOT NULL
    `, [since]).pipe(
      map(results => results[0]?.count || 0)
    );
  }

  /**
   * Force sync immediately
   */
  async forceSyncNow(): Promise<StatusUpdate[]> {
    try {
      this.updateSyncState({ errors: [] });
      
      const updates = await this.fetchLatestStatusUpdates().toPromise();
      
      if (updates && updates.length > 0) {
        this.statusUpdatesSubject.next(updates);
        this.updateSyncState({ 
          lastSync: new Date(),
          pendingUpdates: 0 
        });
      }
      
      return updates || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      this.addError(errorMessage);
      throw error;
    }
  }

  /**
   * Update sync state
   */
  private updateSyncState(updates: Partial<StatusSyncState>): void {
    this.syncStateSubject.next({
      ...this.syncStateSubject.value,
      ...updates
    });
  }

  /**
   * Add error to state
   */
  private addError(error: string): void {
    const currentErrors = this.syncStateSubject.value.errors;
    this.updateSyncState({
      errors: [...currentErrors, `${new Date().toISOString()}: ${error}`].slice(-10) // Keep last 10 errors
    });
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.updateSyncState({ errors: [] });
  }

  /**
   * Reset sync timestamp (useful for full re-sync)
   */
  resetSyncTimestamp(): void {
    this.lastSyncTimestamp = null;
  }
}