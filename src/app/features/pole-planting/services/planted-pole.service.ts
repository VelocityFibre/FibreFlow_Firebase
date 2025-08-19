import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PlantedPole, PlantedPoleVerificationRequest, PlantedPoleBulkVerification, PlantedPoleStats } from '../models/planted-pole.model';
import { StagingPoleData } from '../../pole-tracker/mobile/services/staging-sync.service';

@Injectable({
  providedIn: 'root'
})
export class PlantedPoleService {
  private firestore = inject(Firestore);
  
  private readonly PLANTED_POLES_COLLECTION = 'planted-poles';
  private readonly STAGING_COLLECTION = 'staging-field-captures';
  private readonly REACT_APP_STAGING_COLLECTION = 'pole-plantings-staging';

  /**
   * Get all planted poles
   */
  getAll(): Observable<PlantedPole[]> {
    const plantedPolesRef = collection(this.firestore, this.PLANTED_POLES_COLLECTION);
    const q = query(plantedPolesRef, orderBy('plantedDate', 'desc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PlantedPole))
      ),
      catchError(error => {
        console.error('Error fetching planted poles:', error);
        return of([]);
      })
    );
  }

  /**
   * Get planted poles by status
   */
  getByStatus(status: PlantedPole['verificationStatus']): Observable<PlantedPole[]> {
    const plantedPolesRef = collection(this.firestore, this.PLANTED_POLES_COLLECTION);
    const q = query(
      plantedPolesRef, 
      where('verificationStatus', '==', status),
      orderBy('plantedDate', 'desc')
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PlantedPole))
      ),
      catchError(error => {
        console.error('Error fetching planted poles by status:', error);
        return of([]);
      })
    );
  }

  /**
   * Get planted poles by project
   */
  getByProject(projectId: string): Observable<PlantedPole[]> {
    const plantedPolesRef = collection(this.firestore, this.PLANTED_POLES_COLLECTION);
    const q = query(
      plantedPolesRef, 
      where('projectId', '==', projectId),
      orderBy('plantedDate', 'desc')
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PlantedPole))
      ),
      catchError(error => {
        console.error('Error fetching planted poles by project:', error);
        return of([]);
      })
    );
  }

  /**
   * Create planted pole from approved staging data
   */
  async createFromStagingData(stagingData: StagingPoleData): Promise<string> {
    const plantedPole: Omit<PlantedPole, 'id'> = {
      // Core identification
      poleNumber: stagingData.poleNumber || '',
      projectId: stagingData.projectId,
      
      // Location data
      actualGpsLocation: stagingData.gpsLocation || { latitude: 0, longitude: 0 },
      gpsAccuracy: stagingData.gpsAccuracy || 0,
      
      // Installation details
      plantedDate: stagingData.capturedAt,
      plantedBy: stagingData.capturedBy,
      
      // Status
      status: 'planted',
      verificationStatus: 'approved', // Already approved from staging
      
      // Photos
      photoUrls: stagingData.photoUrls || {},
      photoCount: Object.keys(stagingData.photoUrls || {}).length,
      
      // Notes
      notes: stagingData.notes,
      
      // References
      stagingId: stagingData.id,
      
      // Metadata
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      deviceId: stagingData.device_id,
      
      // Auto-approved from staging
      approvedBy: 'system',
      approvedAt: serverTimestamp() as Timestamp
    };

    const docRef = await addDoc(
      collection(this.firestore, this.PLANTED_POLES_COLLECTION),
      plantedPole
    );

    return docRef.id;
  }

  /**
   * Verify a single pole
   */
  async verifyPole(request: PlantedPoleVerificationRequest): Promise<void> {
    const poleDoc = doc(this.firestore, this.PLANTED_POLES_COLLECTION, request.poleId);
    
    const updates: Partial<PlantedPole> = {
      verificationStatus: request.action === 'approve' ? 'approved' : 'rejected',
      updatedAt: serverTimestamp() as Timestamp
    };

    if (request.action === 'approve') {
      updates.verifiedBy = request.verifiedBy;
      updates.verifiedDate = serverTimestamp() as Timestamp;
      updates.approvedBy = request.verifiedBy;
      updates.approvedAt = serverTimestamp() as Timestamp;
    } else {
      updates.rejectedBy = request.verifiedBy;
      updates.rejectedAt = serverTimestamp() as Timestamp;
      updates.rejectionReason = request.notes;
    }

    if (request.notes) {
      updates.qualityNotes = request.notes;
    }

    await updateDoc(poleDoc, updates);
  }

  /**
   * Bulk verify multiple poles
   */
  async bulkVerifyPoles(request: PlantedPoleBulkVerification): Promise<void> {
    const batch = writeBatch(this.firestore);
    
    const updates: Partial<PlantedPole> = {
      verificationStatus: request.action === 'approve' ? 'approved' : 'rejected',
      updatedAt: serverTimestamp() as Timestamp
    };

    if (request.action === 'approve') {
      updates.verifiedBy = request.verifiedBy;
      updates.verifiedDate = serverTimestamp() as Timestamp;
      updates.approvedBy = request.verifiedBy;
      updates.approvedAt = serverTimestamp() as Timestamp;
    } else {
      updates.rejectedBy = request.verifiedBy;
      updates.rejectedAt = serverTimestamp() as Timestamp;
      updates.rejectionReason = request.notes;
    }

    if (request.notes) {
      updates.qualityNotes = request.notes;
    }

    request.poleIds.forEach(poleId => {
      const poleDoc = doc(this.firestore, this.PLANTED_POLES_COLLECTION, poleId);
      batch.update(poleDoc, updates);
    });

    await batch.commit();
  }

  /**
   * Get planted pole statistics
   */
  async getStats(): Promise<PlantedPoleStats> {
    const plantedPolesRef = collection(this.firestore, this.PLANTED_POLES_COLLECTION);
    const snapshot = await getDocs(plantedPolesRef);
    
    const poles = snapshot.docs.map(doc => doc.data() as PlantedPole);
    
    const stats: PlantedPoleStats = {
      totalPlanted: poles.length,
      pendingVerification: poles.filter(p => p.verificationStatus === 'pending').length,
      approved: poles.filter(p => p.verificationStatus === 'approved').length,
      rejected: poles.filter(p => p.verificationStatus === 'rejected').length,
      averageQualityScore: 0,
      completionRate: 0
    };
    
    // Calculate average quality score
    const polesWithQuality = poles.filter(p => p.qualityScore);
    if (polesWithQuality.length > 0) {
      stats.averageQualityScore = 
        polesWithQuality.reduce((sum, p) => sum + (p.qualityScore || 0), 0) / polesWithQuality.length;
    }
    
    // Calculate completion rate
    if (stats.totalPlanted > 0) {
      stats.completionRate = (stats.approved / stats.totalPlanted) * 100;
    }
    
    return stats;
  }

  /**
   * Delete a planted pole
   */
  async delete(id: string): Promise<void> {
    const poleDoc = doc(this.firestore, this.PLANTED_POLES_COLLECTION, id);
    await deleteDoc(poleDoc);
  }

  /**
   * Get a single planted pole by ID
   */
  async getById(id: string): Promise<PlantedPole | null> {
    const poleDoc = doc(this.firestore, this.PLANTED_POLES_COLLECTION, id);
    const snapshot = await getDoc(poleDoc);
    
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as PlantedPole;
    }
    
    return null;
  }
}
