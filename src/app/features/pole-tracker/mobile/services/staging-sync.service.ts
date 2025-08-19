import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  Timestamp 
} from '@angular/fire/firestore';
import { Storage, ref, uploadString, getDownloadURL } from '@angular/fire/storage';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { OfflinePoleService, OfflinePoleData, OfflinePhoto } from './offline-pole.service';

export interface StagingPoleData {
  id?: string;
  // Original pole data
  poleNumber?: string;
  projectId: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
  };
  gpsAccuracy?: number;
  notes?: string;
  capturedBy: string;
  capturedAt: Date | Timestamp;
  
  // Staging metadata
  validation_status: 'pending' | 'validating' | 'validated' | 'rejected';
  validation_errors: ValidationError[];
  submitted_at: Date | Timestamp;
  validated_at?: Date | Timestamp;
  synced_to_production: boolean;
  production_id?: string;
  synced_at?: Date | Timestamp;
  
  // Photo URLs after upload
  photoUrls?: { [key: string]: string };
  
  // Offline sync metadata
  offline_id: string; // Reference to offline storage ID
  device_id?: string;
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface StagingSyncProgress {
  totalItems: number;
  syncedToStaging: number;
  validatedItems: number;
  syncedToProduction: number;
  currentItem?: string;
  currentStage: 'idle' | 'uploading' | 'validating' | 'syncing' | 'complete';
  errors: string[];
}

export interface StagingSyncResult {
  offlineId: string;
  stagingId?: string;
  success: boolean;
  stage: 'staging' | 'validation' | 'production';
  error?: string;
  validationErrors?: ValidationError[];
}

@Injectable({
  providedIn: 'root'
})
export class StagingSyncService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private offlinePoleService = inject(OfflinePoleService);
  
  private readonly STAGING_COLLECTION = 'staging-field-captures';
  
  private syncProgressSubject = new BehaviorSubject<StagingSyncProgress>({
    totalItems: 0,
    syncedToStaging: 0,
    validatedItems: 0,
    syncedToProduction: 0,
    currentStage: 'idle',
    errors: []
  });
  public syncProgress$ = this.syncProgressSubject.asObservable();
  
  private isSyncing = false;

  constructor() {
    // Initialize online listener after injection is complete
    // Using setTimeout to defer subscription to next tick
    setTimeout(() => {
      this.offlinePoleService.online$.subscribe(online => {
        if (online && !this.isSyncing) {
          this.checkPendingSyncs();
        }
      });
    }, 0);
  }

  /**
   * Check if there are pending items to sync
   */
  private async checkPendingSyncs(): Promise<void> {
    const pendingCount = this.offlinePoleService.getPendingSyncCount();
    if (pendingCount > 0) {
      console.log(`Found ${pendingCount} pending items to sync to staging`);
      // Auto-sync when connection is restored
      await this.syncAllToStaging();
    }
  }

  /**
   * Sync all pending offline poles to staging
   */
  async syncAllToStaging(): Promise<StagingSyncResult[]> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }
    
    this.isSyncing = true;
    const results: StagingSyncResult[] = [];
    
    try {
      // Get all offline poles
      const offlinePoles = await this.getOfflinePoles();
      const pendingPoles = offlinePoles.filter(pole => 
        pole.syncStatus === 'pending' || pole.syncStatus === 'error'
      );
      
      if (pendingPoles.length === 0) {
        this.updateProgress({
          totalItems: 0,
          currentStage: 'complete'
        });
        return results;
      }
      
      this.updateProgress({
        totalItems: pendingPoles.length,
        syncedToStaging: 0,
        currentStage: 'uploading'
      });
      
      // Sync each pole to staging
      for (const pole of pendingPoles) {
        this.updateProgress({ 
          currentItem: `Uploading ${pole.poleNumber || pole.id} to staging`
        });
        
        try {
          const result = await this.syncPoleToStaging(pole);
          results.push(result);
          
          if (result.success) {
            this.updateProgress({
              syncedToStaging: this.syncProgressSubject.value.syncedToStaging + 1
            });
          } else {
            this.addError(`Failed to sync pole ${pole.id}: ${result.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            offlineId: pole.id,
            success: false,
            stage: 'staging',
            error: errorMessage
          });
          this.addError(`Error syncing pole ${pole.id}: ${errorMessage}`);
        }
      }
      
      this.updateProgress({ 
        currentStage: 'complete',
        currentItem: undefined 
      });
      
    } finally {
      this.isSyncing = false;
    }
    
    return results;
  }

  /**
   * Sync a single pole to staging
   */
  private async syncPoleToStaging(pole: OfflinePoleData): Promise<StagingSyncResult> {
    try {
      // Update offline status to syncing
      await this.offlinePoleService.updatePoleStatus(pole.id, 'syncing');
      
      // Upload photos first
      const photoUrls: { [key: string]: string } = {};
      
      for (const photo of pole.photos || []) {
        try {
          if (photo.uploadUrl && photo.uploadStatus === 'uploaded') {
            // Use existing URL
            photoUrls[photo.type] = photo.uploadUrl;
          } else {
            // Upload photo
            const url = await this.uploadPhoto(pole.id, photo);
            photoUrls[photo.type] = url;
            
            // Update photo upload status in offline storage
            await this.offlinePoleService.updatePhotoUploadStatus(
              pole.id,
              photo.id,
              'uploaded',
              url
            );
          }
        } catch (error) {
          console.error(`Failed to upload photo ${photo.type}:`, error);
          // Continue with other photos
        }
      }
      
      // Prepare staging data - remove undefined fields
      const stagingData: any = {
        // Original data
        projectId: pole.projectId || '',
        capturedBy: pole.capturedBy || 'offline_user',
        capturedAt: pole.capturedAt || new Date(),
        
        // Staging metadata
        validation_status: 'pending',
        validation_errors: [],
        submitted_at: serverTimestamp() as Timestamp,
        synced_to_production: false,
        offline_id: pole.id,
        
        // Photos
        photoUrls
      };
      
      // Only add fields that have values
      if (pole.poleNumber) stagingData.poleNumber = pole.poleNumber;
      if (pole.gpsLocation) stagingData.gpsLocation = pole.gpsLocation;
      if (pole.gpsAccuracy) stagingData.gpsAccuracy = pole.gpsAccuracy;
      if (pole.notes) stagingData.notes = pole.notes;
      if (pole.deviceId) stagingData.device_id = pole.deviceId;
      
      // Add to staging collection
      const docRef = await addDoc(
        collection(this.firestore, this.STAGING_COLLECTION),
        stagingData
      );
      
      // Update offline status to staged
      await this.offlinePoleService.updatePoleStatus(pole.id, 'staged', undefined, docRef.id);
      
      // Run basic validation
      await this.runBasicValidation(docRef.id);
      
      return {
        offlineId: pole.id,
        stagingId: docRef.id,
        success: true,
        stage: 'staging'
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update offline status to error
      await this.offlinePoleService.updatePoleStatus(pole.id, 'error', errorMessage);
      
      return {
        offlineId: pole.id,
        success: false,
        stage: 'staging',
        error: errorMessage
      };
    }
  }

  /**
   * Run basic validation on staged data
   */
  private async runBasicValidation(stagingId: string): Promise<void> {
    try {
      const stagingDoc = doc(this.firestore, this.STAGING_COLLECTION, stagingId);
      const validationErrors: ValidationError[] = [];
      
      // Get the staging document data (in real app, would use getDoc)
      // For now, we'll just validate based on what we know
      
      // Example validation rules
      // This would be expanded with actual validation logic
      
      // Update validation status
      await updateDoc(stagingDoc, {
        validation_status: validationErrors.length === 0 ? 'validated' : 'rejected',
        validation_errors: validationErrors,
        validated_at: serverTimestamp()
      });
      
      if (validationErrors.length === 0) {
        this.updateProgress({
          validatedItems: this.syncProgressSubject.value.validatedItems + 1
        });
      }
      
    } catch (error) {
      console.error('Validation error:', error);
    }
  }

  /**
   * Upload photo to Firebase Storage
   */
  private async uploadPhoto(poleId: string, photo: OfflinePhoto): Promise<string> {
    const fileName = `poles/staging/${poleId}/${photo.type}_${photo.timestamp.getTime()}.jpg`;
    const storageRef = ref(this.storage, fileName);
    
    // Upload base64 string
    await uploadString(storageRef, photo.data, 'data_url');
    
    // Get download URL
    return getDownloadURL(storageRef);
  }

  /**
   * Get all offline poles
   */
  private async getOfflinePoles(): Promise<OfflinePoleData[]> {
    // Get the current value directly to avoid subscription issues
    return this.offlinePoleService.getCurrentOfflinePoles();
  }

  /**
   * Get staging items pending validation
   */
  async getStagingItems(status?: 'pending' | 'validated' | 'rejected'): Promise<StagingPoleData[]> {
    let q = collection(this.firestore, this.STAGING_COLLECTION);
    
    if (status) {
      q = query(q, where('validation_status', '==', status)) as any;
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as StagingPoleData));
  }

  /**
   * Manually trigger validation for a staging item
   */
  async validateStagingItem(stagingId: string): Promise<void> {
    await this.runBasicValidation(stagingId);
  }

  /**
   * Sync validated items from staging to production
   */
  async syncValidatedToProduction(): Promise<void> {
    const validatedItems = await this.getStagingItems('validated');
    
    for (const item of validatedItems) {
      // This would sync to planned-poles collection
      // Implementation would go here
      console.log('Would sync to production:', item.id);
    }
  }

  /**
   * Get sync status summary
   */
  async getSyncSummary(): Promise<{
    offlinePending: number;
    stagingPending: number;
    stagingValidated: number;
    stagingRejected: number;
  }> {
    const offlinePending = this.offlinePoleService.getPendingSyncCount();
    const stagingItems = await this.getStagingItems();
    
    return {
      offlinePending,
      stagingPending: stagingItems.filter(i => i.validation_status === 'pending').length,
      stagingValidated: stagingItems.filter(i => i.validation_status === 'validated').length,
      stagingRejected: stagingItems.filter(i => i.validation_status === 'rejected').length
    };
  }

  /**
   * Update progress
   */
  private updateProgress(updates: Partial<StagingSyncProgress>): void {
    this.syncProgressSubject.next({
      ...this.syncProgressSubject.value,
      ...updates
    });
  }

  /**
   * Add error to progress
   */
  private addError(error: string): void {
    const currentErrors = this.syncProgressSubject.value.errors;
    this.updateProgress({
      errors: [...currentErrors, error]
    });
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.updateProgress({ errors: [] });
  }
}