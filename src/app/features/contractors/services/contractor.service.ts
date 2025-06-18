import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc as _deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { take } from 'rxjs/operators';
import { Contractor, ContractorStatus, ContractorTeam } from '../models/contractor.model';

@Injectable({
  providedIn: 'root',
})
export class ContractorService {
  private firestore = inject(Firestore);
  private contractorsCollection = collection(this.firestore, 'contractors');

  // Get all contractors
  getContractors(): Observable<Contractor[]> {
    const q = query(this.contractorsCollection, orderBy('createdAt', 'desc'));

    return collectionData(q, { idField: 'id' }) as Observable<Contractor[]>;
  }

  // Get active contractors only
  getActiveContractors(): Observable<Contractor[]> {
    const q = query(
      this.contractorsCollection,
      where('status', '==', 'active'),
      orderBy('companyName'),
    );

    return collectionData(q, { idField: 'id' }) as Observable<Contractor[]>;
  }

  // Get single contractor by ID
  getContractor(id: string): Observable<Contractor | null> {
    const contractorDoc = doc(this.firestore, 'contractors', id);
    return docData(contractorDoc, { idField: 'id' }) as Observable<Contractor>;
  }

  // Create new contractor
  async createContractor(
    contractor: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const newContractor = {
      ...contractor,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
      updatedAt: serverTimestamp(),
    });
  }

  // Update contractor status
  async updateContractorStatus(
    id: string,
    status: ContractorStatus,
    suspensionReason?: string,
  ): Promise<void> {
    const updates: any = {
      status,
      updatedAt: serverTimestamp(),
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
    const q = query(this.contractorsCollection, orderBy('companyName'));

    return collectionData(q, { idField: 'id' }).pipe(
      map((contractors: any[]) =>
        contractors.filter(
          (contractor) =>
            contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contractor.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contractor.primaryContact?.name.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      ),
    ) as Observable<Contractor[]>;
  }

  // Get contractors by service type
  getContractorsByService(service: string): Observable<Contractor[]> {
    const q = query(
      this.contractorsCollection,
      where('capabilities.services', 'array-contains', service),
      where('status', '==', 'active'),
      orderBy('companyName'),
    );

    return collectionData(q, { idField: 'id' }) as Observable<Contractor[]>;
  }

  // Check if registration number exists
  async checkRegistrationExists(registrationNumber: string, excludeId?: string): Promise<boolean> {
    const q = query(
      this.contractorsCollection,
      where('registrationNumber', '==', registrationNumber),
    );

    const snapshot = await getDocs(q);

    if (excludeId) {
      return snapshot.docs.some((doc) => doc.id !== excludeId);
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
      updatedAt: serverTimestamp(),
    });
  }

  // Reject contractor
  async rejectContractor(id: string, reason: string): Promise<void> {
    const contractorDoc = doc(this.firestore, 'contractors', id);

    await updateDoc(contractorDoc, {
      status: 'pending_approval',
      onboardingStatus: 'rejected',
      suspensionReason: reason,
      updatedAt: serverTimestamp(),
    });
  }

  // Project-related methods

  // Update contractor project information
  async updateContractorProjects(
    contractorId: string,
    projectId: string,
    action: 'add' | 'complete',
    contractValue?: number,
  ): Promise<void> {
    const contractor = await this.getContractor(contractorId).pipe(take(1)).toPromise();
    if (!contractor) throw new Error('Contractor not found');

    const projects = contractor.projects || {
      activeProjectIds: [],
      completedProjectIds: [],
      totalProjectsCount: 0,
      currentContractValue: 0,
      totalContractValue: 0,
    };

    if (action === 'add') {
      // Add to active projects
      if (!projects.activeProjectIds.includes(projectId)) {
        projects.activeProjectIds.push(projectId);
        projects.totalProjectsCount++;
        if (contractValue) {
          projects.currentContractValue += contractValue;
          projects.totalContractValue += contractValue;
        }
      }
    } else if (action === 'complete') {
      // Move from active to completed
      const index = projects.activeProjectIds.indexOf(projectId);
      if (index > -1) {
        projects.activeProjectIds.splice(index, 1);
        if (!projects.completedProjectIds.includes(projectId)) {
          projects.completedProjectIds.push(projectId);
        }
        // Update current contract value (subtract completed project value)
        // Note: In a real scenario, we'd need to fetch the project value
      }
    }

    const contractorDoc = doc(this.firestore, 'contractors', contractorId);
    await updateDoc(contractorDoc, {
      projects,
      updatedAt: serverTimestamp(),
    });
  }

  // Get contractors with projects
  getContractorsWithProjects(): Observable<Contractor[]> {
    const q = query(
      this.contractorsCollection,
      where('projects.totalProjectsCount', '>', 0),
      orderBy('projects.totalProjectsCount', 'desc'),
    );

    return collectionData(q, { idField: 'id' }) as Observable<Contractor[]>;
  }

  // Get available contractors for a project
  getAvailableContractors(requiredServices: string[]): Observable<Contractor[]> {
    // Get active contractors that have all required services
    const q = query(
      this.contractorsCollection,
      where('status', '==', 'active'),
      where('capabilities.services', 'array-contains-any', requiredServices),
      orderBy('companyName'),
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((contractors: any[]) =>
        // Further filter to ensure all required services are present
        contractors.filter((contractor) =>
          requiredServices.every((service) => contractor.capabilities?.services?.includes(service)),
        ),
      ),
    ) as Observable<Contractor[]>;
  }

  // Add team to contractor
  async addTeamToContractor(contractorId: string, team: ContractorTeam): Promise<void> {
    const contractor = await this.getContractor(contractorId).pipe(take(1)).toPromise();
    if (!contractor) throw new Error('Contractor not found');

    const teams = contractor.teams || [];
    const teamWithId = {
      ...team,
      id: doc(collection(this.firestore, 'temp')).id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    teams.push(teamWithId);

    const contractorDoc = doc(this.firestore, 'contractors', contractorId);
    await updateDoc(contractorDoc, {
      teams,
      updatedAt: serverTimestamp(),
    });
  }

  // Update contractor team
  async updateContractorTeam(
    contractorId: string,
    teamId: string,
    updates: Partial<ContractorTeam>,
  ): Promise<void> {
    const contractor = await this.getContractor(contractorId).pipe(take(1)).toPromise();
    if (!contractor) throw new Error('Contractor not found');

    const teams = contractor.teams || [];
    const teamIndex = teams.findIndex((t) => t.id === teamId);

    if (teamIndex === -1) throw new Error('Team not found');

    teams[teamIndex] = {
      ...teams[teamIndex],
      ...updates,
      updatedAt: serverTimestamp(),
    };

    const contractorDoc = doc(this.firestore, 'contractors', contractorId);
    await updateDoc(contractorDoc, {
      teams,
      updatedAt: serverTimestamp(),
    });
  }

  // Get contractor teams
  getContractorTeams(contractorId: string): Observable<ContractorTeam[]> {
    return this.getContractor(contractorId).pipe(map((contractor) => contractor?.teams || []));
  }

  // Get available teams for a contractor
  getAvailableTeams(contractorId: string): Observable<ContractorTeam[]> {
    return this.getContractorTeams(contractorId).pipe(
      map((teams) =>
        teams.filter(
          (team) =>
            team.isActive &&
            (!team.currentProjectId ||
              (team.availableFrom && team.availableFrom <= serverTimestamp())),
        ),
      ),
    );
  }
}
