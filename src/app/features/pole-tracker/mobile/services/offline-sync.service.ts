import { Injectable, inject, OnDestroy } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, doc } from '@angular/fire/firestore';
import { Storage, ref, uploadString, getDownloadURL } from '@angular/fire/storage';
import { BehaviorSubject, from, Observable, concat, of } from 'rxjs';
import { map, catchError, tap, concatMap } from 'rxjs/operators';
import { OfflinePoleService, OfflinePoleData, OfflinePhoto } from './offline-pole.service';
import { PoleTracker } from '../../models/pole-tracker.model';

export interface SyncProgress {
  totalItems: number;
  syncedItems: number;
  currentItem?: string;
  isComplete: boolean;
  errors: string[];
}

export interface SyncResult {
  poleId: string;
  firebaseId?: string;
  success: boolean;
  error?: string;
  photoUrls?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService implements OnDestroy {
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private offlinePoleService = inject(OfflinePoleService);
  
  private syncProgressSubject = new BehaviorSubject<SyncProgress>({
    totalItems: 0,
    syncedItems: 0,
    isComplete: true,
    errors: []
  });
  public syncProgress$ = this.syncProgressSubject.asObservable();
  
  private isSyncing = false;
  private autoSyncInterval?: any;
  private readonly AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  private lastSyncAttempt = 0;
  private readonly MIN_SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds minimum between syncs

  constructor() {
    // Initialize subscriptions after injection is complete
    // Using setTimeout to defer to next tick
    setTimeout(() => {
      // Listen for online status
      this.offlinePoleService.online$.subscribe(online => {
        if (online) {
          // Start auto-sync when coming online
          this.handleConnectionRestored();
          // Start periodic sync
          this.startPeriodicSync();
        } else {
          // Stop periodic sync when offline
          this.stopPeriodicSync();
        }
      });
      
      // Start periodic sync if already online
      if (navigator.onLine) {
        this.startPeriodicSync();
      }
    }, 0);
  }

  async startAutoSync(): Promise<void> {
    if (this.isSyncing) return;
    
    const pendingCount = this.offlinePoleService.getPendingSyncCount();
    if (pendingCount === 0) return;
    
    // Only sync if we're not on a metered connection (mobile data)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection?.saveData || connection?.effectiveType === 'slow-2g') {
        console.log('Skipping auto-sync on slow/metered connection');
        return;
      }
    }
    
    // Check battery level - skip sync if battery is low
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        if (battery.level < 0.2 && !battery.charging) {
          console.log('Skipping auto-sync - battery level below 20%');
          return;
        }
      } catch (error) {
        // Battery API not supported, continue with sync
      }
    }
    
    await this.syncAllPendingPoles();
  }

  async syncAllPendingPoles(): Promise<SyncResult[]> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }
    
    this.isSyncing = true;
    const results: SyncResult[] = [];
    
    try {
      // Get all offline poles that need syncing
      const offlinePoles = await this.getOfflinePoles();
      const pendingPoles = offlinePoles.filter(pole => 
        pole.syncStatus === 'pending' || pole.syncStatus === 'error'
      );
      
      this.updateProgress({
        totalItems: pendingPoles.length,
        syncedItems: 0,
        isComplete: false
      });
      
      // For now, just mark them as ready for staging sync
      // The staging sync service will pick them up independently
      for (const pole of pendingPoles) {
        results.push({
          poleId: pole.id,
          success: true,
          error: undefined
        });
      }
      
      this.updateProgress({
        isComplete: true
      });
      
      return results;
    } finally {
      this.isSyncing = false;
    }
  }

  // This method is deprecated - use syncAllPendingPoles which goes through staging
  async syncPole(pole: OfflinePoleData): Promise<SyncResult> {
    console.warn('syncPole is deprecated. Use syncAllPendingPoles for staging sync.');
    
    // Mark pole as pending for staging sync
    await this.offlinePoleService.updatePoleStatus(pole.id, 'pending');
    
    return {
      poleId: pole.id,
      success: true,
      error: undefined
    };
  }

  // Photo upload is now handled by staging sync service

  private async getOfflinePoles(): Promise<OfflinePoleData[]> {
    // Get the current value directly to avoid subscription issues
    return this.offlinePoleService.getCurrentOfflinePoles();
  }

  private updateProgress(updates: Partial<SyncProgress>): void {
    this.syncProgressSubject.next({
      ...this.syncProgressSubject.value,
      ...updates
    });
  }

  private addError(error: string): void {
    const currentErrors = this.syncProgressSubject.value.errors;
    this.updateProgress({
      errors: [...currentErrors, error]
    });
  }

  clearErrors(): void {
    this.updateProgress({ errors: [] });
  }

  cancelSync(): void {
    // In a real implementation, you might want to track and cancel ongoing operations
    this.isSyncing = false;
    this.updateProgress({ isComplete: true, currentItem: undefined });
  }

  getSyncStatus(): { isSyncing: boolean; progress: SyncProgress } {
    return {
      isSyncing: this.isSyncing,
      progress: this.syncProgressSubject.value
    };
  }

  // Manual sync for specific pole through staging
  async syncSinglePole(poleId: string): Promise<SyncResult> {
    const pole = await this.offlinePoleService.getOfflinePole(poleId);
    if (!pole) {
      throw new Error('Pole not found in offline storage');
    }
    
    // Reset status to pending so it gets picked up by staging sync
    await this.offlinePoleService.updatePoleStatus(poleId, 'pending');
    
    // Run staging sync
    const results = await this.syncAllPendingPoles();
    return results.find(r => r.poleId === poleId) || {
      poleId,
      success: false,
      error: 'Pole not found in sync results'
    };
  }

  // Retry failed syncs through staging
  async retryFailedSyncs(): Promise<SyncResult[]> {
    const offlinePoles = await this.getOfflinePoles();
    const failedPoles = offlinePoles.filter(pole => pole.syncStatus === 'error');
    
    // Reset all failed poles to pending
    for (const pole of failedPoles) {
      await this.offlinePoleService.updatePoleStatus(pole.id, 'pending');
    }
    
    // Run staging sync
    return this.syncAllPendingPoles();
  }

  // Get sync summary for offline data only
  async getSyncSummary(): Promise<{
    offlinePending: number;
    offlineError: number;
    staged: number;
  }> {
    const offlinePoles = await this.getOfflinePoles();
    
    return {
      offlinePending: offlinePoles.filter(p => p.syncStatus === 'pending').length,
      offlineError: offlinePoles.filter(p => p.syncStatus === 'error').length,
      staged: offlinePoles.filter(p => p.syncStatus === 'staged').length
    };
  }
  
  // Handle connection restored - sync immediately if needed
  private async handleConnectionRestored(): Promise<void> {
    // Check if enough time has passed since last sync
    const now = Date.now();
    if (now - this.lastSyncAttempt < this.MIN_SYNC_INTERVAL_MS) {
      console.log('Skipping sync - too soon since last attempt');
      return;
    }
    
    // Check if there are pending items
    const pendingCount = this.offlinePoleService.getPendingSyncCount();
    if (pendingCount > 0 && !this.isSyncing) {
      console.log(`Connection restored. Starting auto-sync for ${pendingCount} pending items`);
      this.lastSyncAttempt = now;
      await this.startAutoSync();
    }
  }
  
  // Start periodic sync every 15 minutes
  private startPeriodicSync(): void {
    // Clear any existing interval
    this.stopPeriodicSync();
    
    // Set up periodic sync
    this.autoSyncInterval = setInterval(async () => {
      if (!this.isSyncing && navigator.onLine) {
        const pendingCount = this.offlinePoleService.getPendingSyncCount();
        if (pendingCount > 0) {
          console.log(`Periodic sync triggered. ${pendingCount} items pending.`);
          this.lastSyncAttempt = Date.now();
          await this.startAutoSync();
        }
      }
    }, this.AUTO_SYNC_INTERVAL_MS);
    
    console.log('Periodic sync started (every 15 minutes)');
  }
  
  // Stop periodic sync
  private stopPeriodicSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = undefined;
      console.log('Periodic sync stopped');
    }
  }
  
  // Cleanup on service destroy
  ngOnDestroy(): void {
    this.stopPeriodicSync();
  }
}