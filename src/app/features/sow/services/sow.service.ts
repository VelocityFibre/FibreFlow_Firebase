import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { 
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from '@angular/fire/firestore';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { EntityType } from '../../../core/models/audit-log.model';
import { SOWData } from '../models/sow.model';

@Injectable({ providedIn: 'root' })
export class SowService extends BaseFirestoreService<SOWData> {
  
  protected collectionName = 'sows';
  
  protected getEntityType(): EntityType {
    return 'sow';
  }
  
  /**
   * Create a new SOW
   */
  async createSOW(sowData: Omit<SOWData, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(this.firestore, this.collectionName), {
        ...sowData,
        createdAt: serverTimestamp(),
        createdBy: 'current-user', // TODO: Get from auth service
        version: sowData.version || 1
      });
      
      return docRef.id;
      
    } catch (error) {
      console.error('Error creating SOW:', error);
      throw error;
    }
  }
  
  /**
   * Get SOW by project ID
   */
  getByProject(projectId: string): Observable<SOWData | null> {
    const q = query(
      collection(this.firestore, this.collectionName),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    
    return this.getWithQuery([
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    ]).pipe(
      map((sows: SOWData[]) => sows.length > 0 ? sows[0] : null)
    );
  }
  
  /**
   * Update SOW
   */
  async updateSOW(sowId: string, updates: Partial<SOWData>): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, sowId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }
}