import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Contractor, ContractorStatus } from '../models/contractor.model';

@Injectable({
  providedIn: 'root'
})
export class ContractorService {
  private firestore = inject(Firestore);
  private contractorsCollection = collection(this.firestore, 'contractors');

  // Get all contractors
  getContractors(): Observable<Contractor[]> {
    const q = query(
      this.contractorsCollection,
      orderBy('createdAt', 'desc')
    );
    
    return collectionData(q, { idField: 'id' }) as Observable<Contractor[]>;
  }

  // Get active contractors only
  getActiveContractors(): Observable<Contractor[]> {
    const q = query(
      this.contractorsCollection,
      where('status', '==', 'active'),
      orderBy('companyName')
    );
    
    return collectionData(q, { idField: 'id' }) as Observable<Contractor[]>;
  }

  // Get single contractor by ID
  getContractor(id: string): Observable<Contractor | null> {
    const contractorDoc = doc(this.firestore, 'contractors', id);
    return docData(contractorDoc, { idField: 'id' }) as Observable<Contractor>;
  }

  // Create new contractor
  async createContractor(contractor: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newContractor = {
      ...contractor,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(this.contractorsCollection, newContractor);
    return docRef.id;
  }

  // Update contractor
  async updateContractor(id: string, updates: Partial<Contractor>): Promise<void> {
    const contractorDoc = doc(this.firestore, 'contractors', id);
    
    // Remove id from updates if present
    const { id: _, ...updateData } = updates;
    
    await updateDoc(contractorDoc, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  }

  // Update contractor status
  async updateContractorStatus(
    id: string, 
    status: ContractorStatus, 
    suspensionReason?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'suspended' && suspensionReason) {
      updates.suspensionReason = suspensionReason;
    } else if (status === 'active') {
      updates.suspensionReason = null;
    }
    
    const contractorDoc = doc(this.firestore, 'contractors', id);
    await updateDoc(contractorDoc, updates);
  }

  // Delete contractor (soft delete by changing status)
  async deleteContractor(id: string): Promise<void> {
    await this.updateContractorStatus(id, 'blacklisted', 'Deleted by user');
  }

  // Search contractors
  searchContractors(searchTerm: string): Observable<Contractor[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - consider using Algolia or ElasticSearch for production
    const q = query(
      this.contractorsCollection,
      orderBy('companyName')
    );
    
    return collectionData(q, { idField: 'id' }).pipe(
      map((contractors: any[]) => 
        contractors.filter(contractor => 
          contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contractor.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contractor.primaryContact?.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    ) as Observable<Contractor[]>;
  }

  // Get contractors by service type
  getContractorsByService(service: string): Observable<Contractor[]> {
    const q = query(
      this.contractorsCollection,
      where('capabilities.services', 'array-contains', service),
      where('status', '==', 'active'),
      orderBy('companyName')
    );
    
    return collectionData(q, { idField: 'id' }) as Observable<Contractor[]>;
  }

  // Check if registration number exists
  async checkRegistrationExists(registrationNumber: string, excludeId?: string): Promise<boolean> {
    const q = query(
      this.contractorsCollection,
      where('registrationNumber', '==', registrationNumber)
    );
    
    const snapshot = await getDocs(q);
    
    if (excludeId) {
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !snapshot.empty;
  }

  // Approve contractor
  async approveContractor(id: string, approverId: string): Promise<void> {
    const contractorDoc = doc(this.firestore, 'contractors', id);
    
    await updateDoc(contractorDoc, {
      status: 'active',
      onboardingStatus: 'approved',
      approvedBy: approverId,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // Reject contractor
  async rejectContractor(id: string, reason: string): Promise<void> {
    const contractorDoc = doc(this.firestore, 'contractors', id);
    
    await updateDoc(contractorDoc, {
      status: 'pending_approval',
      onboardingStatus: 'rejected',
      suspensionReason: reason,
      updatedAt: serverTimestamp()
    });
  }
}

// Import getDocs for the checkRegistrationExists method
import { getDocs } from '@angular/fire/firestore';