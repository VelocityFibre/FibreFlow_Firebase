import { Injectable, inject } from '@angular/core';
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
export class OfflineSyncService {
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

  constructor() {
    // Listen for online status
    this.offlinePoleService.online$.subscribe(online => {
      if (online && !this.isSyncing) {
        this.startAutoSync();
      }
    });
  }

  async startAutoSync(): Promise<void> {
    if (this.isSyncing) return;
    
    const pendingCount = this.offlinePoleService.getPendingSyncCount();
    if (pendingCount === 0) return;
    
    await this.syncAllPendingPoles();
  }

  async syncAllPendingPoles(): Promise<SyncResult[]> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }
    
    this.isSyncing = true;
    const results: SyncResult[] = [];
    
    try {
      // Get all offline poles
      const offlinePoles = await this.getOfflinePoles();
      const pendingPoles = offlinePoles.filter(pole => pole.syncStatus === 'pending');
      
      if (pendingPoles.length === 0) {
        this.updateProgress({
          totalItems: 0,
          syncedItems: 0,
          isComplete: true
        });
        return results;
      }
      
      this.updateProgress({
        totalItems: pendingPoles.length,
        syncedItems: 0,
        isComplete: false
      });
      
      // Sync each pole
      for (const pole of pendingPoles) {
        this.updateProgress({ currentItem: `Syncing ${pole.poleNumber || pole.id}` });
        
        try {
          const result = await this.syncPole(pole);
          results.push(result);
          
          if (result.success) {
            this.updateProgress({
              syncedItems: this.syncProgressSubject.value.syncedItems + 1
            });
          } else {
            this.addError(`Failed to sync pole ${pole.id}: ${result.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            poleId: pole.id,
            success: false,
            error: errorMessage
          });
          this.addError(`Error syncing pole ${pole.id}: ${errorMessage}`);
        }
      }
      
      this.updateProgress({ isComplete: true, currentItem: undefined });
    } finally {
      this.isSyncing = false;
    }
    
    return results;
  }

  async syncPole(pole: OfflinePoleData): Promise<SyncResult> {
    try {
      // Update status to syncing
      await this.offlinePoleService.updatePoleStatus(pole.id, 'syncing');
      
      // Handle photos - use existing URLs or upload if needed
      const photoUrls: { [key: string]: string } = {};
      
      for (const photo of pole.photos || []) {
        try {
          if (photo.uploadUrl && photo.uploadStatus === 'uploaded') {
            // Use existing upload URL
            photoUrls[photo.type] = photo.uploadUrl;
          } else {
            // Upload photo if not already uploaded
            const url = await this.uploadPhoto(pole.id, photo);
            photoUrls[photo.type] = url;
          }
        } catch (error) {
          console.error(`Failed to upload photo ${photo.id}:`, error);
          // Continue with other photos even if one fails
        }
      }
      
      // Prepare pole data for Firebase
      const poleData: Partial<PoleTracker> = {
        poleNumber: pole.poleNumber || '',
        projectId: pole.projectId || '',
        location: pole.gpsLocation ? `${pole.gpsLocation.latitude},${pole.gpsLocation.longitude}` : (pole.location || ''),
        status: pole.status || 'captured',
        createdAt: pole.createdAt || new Date(),
        updatedAt: new Date(),
        createdBy: pole.capturedBy || 'offline_user',
        updatedBy: pole.capturedBy || 'offline_user'
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(this.firestore, 'planned-poles'), poleData);
      
      // Update status to synced
      await this.offlinePoleService.updatePoleStatus(pole.id, 'synced');
      
      // Delete from offline storage after successful sync
      await this.offlinePoleService.deleteSyncedPole(pole.id);
      
      return {
        poleId: pole.id,
        firebaseId: docRef.id,
        success: true,
        photoUrls
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update status to error
      await this.offlinePoleService.updatePoleStatus(pole.id, 'error', errorMessage);
      
      return {
        poleId: pole.id,
        success: false,
        error: errorMessage
      };
    }
  }

  private async uploadPhoto(poleId: string, photo: OfflinePhoto): Promise<string> {
    const fileName = `poles/${poleId}/${photo.type}_${photo.timestamp.getTime()}.jpg`;
    const storageRef = ref(this.storage, fileName);
    
    // Upload base64 string
    await uploadString(storageRef, photo.data, 'data_url');
    
    // Get download URL
    return getDownloadURL(storageRef);
  }

  private async getOfflinePoles(): Promise<OfflinePoleData[]> {
    return new Promise((resolve) => {
      const subscription = this.offlinePoleService.offlinePoles$.subscribe(poles => {
        resolve(poles);
        subscription.unsubscribe();
      });
    });
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

  // Manual sync for specific pole
  async syncSinglePole(poleId: string): Promise<SyncResult> {
    const pole = await this.offlinePoleService.getOfflinePole(poleId);
    if (!pole) {
      throw new Error('Pole not found in offline storage');
    }
    
    return this.syncPole(pole);
  }

  // Retry failed syncs
  async retryFailedSyncs(): Promise<SyncResult[]> {
    const offlinePoles = await this.getOfflinePoles();
    const failedPoles = offlinePoles.filter(pole => pole.syncStatus === 'error');
    
    const results: SyncResult[] = [];
    
    for (const pole of failedPoles) {
      const result = await this.syncPole(pole);
      results.push(result);
    }
    
    return results;
  }
}