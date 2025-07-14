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
  Timestamp,
  QueryConstraint,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { take } from 'rxjs/operators';
import { Contractor, ContractorStatus, ContractorTeam } from '../models/contractor.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { EntityType } from '../../../core/models/audit-log.model';

@Injectable({
  providedIn: 'root',
})
export class ContractorService extends BaseFirestoreService<Contractor> {
  protected override firestore = inject(Firestore); // Still needed for some specialized operations
  protected collectionName = 'contractors';

  protected getEntityType(): EntityType {
    return 'contractor';
  }

  // Get all contractors
  getContractors(): Observable<Contractor[]> {
    return this.getWithQuery([orderBy('createdAt', 'desc')]);
  }

  // Get active contractors only
  getActiveContractors(): Observable<Contractor[]> {
    return this.getWithQuery([
      where('status', '==', 'active'),
      orderBy('companyName'),
    ]);
  }

  // Get single contractor by ID
  getContractor(id: string): Observable<Contractor | undefined> {
    return this.getById(id);
  }

  // Create new contractor
  async createContractor(
    contractor: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    return this.create(contractor);
  }

  // Update contractor
  async updateContractor(id: string, updates: Partial<Contractor>): Promise<void> {
    // Remove id from updates if present
    const { id: _, ...updateData } = updates;
    return this.update(id, updateData);
  }

  // Update contractor status
  async updateContractorStatus(
    id: string,
    status: ContractorStatus,
    suspensionReason?: string,
  ): Promise<void> {
    const updates: Partial<Contractor> = {
      status,
    };

    if (status === 'suspended' && suspensionReason) {
      updates.suspensionReason = suspensionReason;
    } else if (status === 'active') {
      updates.suspensionReason = undefined;
    }

    return this.update(id, updates);
  }

  // Delete contractor (soft delete by changing status)
  async deleteContractor(id: string): Promise<void> {
    await this.updateContractorStatus(id, 'blacklisted', 'Deleted by user');
  }

  // Hard delete contractor (if needed)
  async hardDeleteContractor(id: string): Promise<void> {
    return this.delete(id);
  }

  // Search contractors
  searchContractors(searchTerm: string): Observable<Contractor[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation - consider using Algolia or ElasticSearch for production
    return this.getWithQuery([orderBy('companyName')]).pipe(
      map((contractors) =>
        contractors.filter(
          (contractor) =>
            contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contractor.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contractor.primaryContact?.name.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      ),
    );
  }

  // Get contractors by service type
  getContractorsByService(service: string): Observable<Contractor[]> {
    return this.getWithQuery([
      where('capabilities.services', 'array-contains', service),
      where('status', '==', 'active'),
      orderBy('companyName'),
    ]);
  }

  // Check if registration number exists
  async checkRegistrationExists(registrationNumber: string, excludeId?: string): Promise<boolean> {
    const contractors = await this.getWithQuery([
      where('registrationNumber', '==', registrationNumber),
    ]).pipe(take(1)).toPromise() || [];

    if (excludeId) {
      return contractors.some((contractor: Contractor) => contractor.id !== excludeId);
    }

    return contractors.length > 0;
  }

  // Approve contractor
  async approveContractor(id: string, approverId: string): Promise<void> {
    return this.update(id, {
      status: 'active',
      onboardingStatus: 'approved',
      approvedBy: approverId,
      approvedAt: serverTimestamp() as any, // Cast for Timestamp compatibility
    });
  }

  // Reject contractor
  async rejectContractor(id: string, reason: string): Promise<void> {
    return this.update(id, {
      status: 'pending_approval',
      onboardingStatus: 'rejected',
      suspensionReason: reason,
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
    const contractor = await this.getById(contractorId).pipe(take(1)).toPromise();
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

    return this.update(contractorId, { projects });
  }

  // Get contractors with projects
  getContractorsWithProjects(): Observable<Contractor[]> {
    return this.getWithQuery([
      where('projects.totalProjectsCount', '>', 0),
      orderBy('projects.totalProjectsCount', 'desc'),
    ]);
  }

  // Get available contractors for a project
  getAvailableContractors(requiredServices: string[]): Observable<Contractor[]> {
    // Get active contractors that have all required services
    return this.getWithQuery([
      where('status', '==', 'active'),
      where('capabilities.services', 'array-contains-any', requiredServices),
      orderBy('companyName'),
    ]).pipe(
      map((contractors) =>
        // Further filter to ensure all required services are present
        contractors.filter((contractor) =>
          requiredServices.every((service: string) =>
            contractor.capabilities?.services?.includes(service as any),
          ),
        ),
      ),
    );
  }

  // Add team to contractor
  async addTeamToContractor(contractorId: string, team: ContractorTeam): Promise<void> {
    const contractor = await this.getById(contractorId).pipe(take(1)).toPromise();
    if (!contractor) throw new Error('Contractor not found');

    const teams = contractor.teams || [];
    const teamWithId = {
      ...team,
      id: doc(collection(this.firestore, 'temp')).id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    teams.push(teamWithId);

    return this.update(contractorId, { teams });
  }

  // Update contractor team
  async updateContractorTeam(
    contractorId: string,
    teamId: string,
    updates: Partial<ContractorTeam>,
  ): Promise<void> {
    const contractor = await this.getById(contractorId).pipe(take(1)).toPromise();
    if (!contractor) throw new Error('Contractor not found');

    const teams = contractor.teams || [];
    const teamIndex = teams.findIndex((t: ContractorTeam) => t.id === teamId);

    if (teamIndex === -1) throw new Error('Team not found');

    teams[teamIndex] = {
      ...teams[teamIndex],
      ...updates,
      updatedAt: serverTimestamp(),
    };

    return this.update(contractorId, { teams });
  }

  // Get contractor teams
  getContractorTeams(contractorId: string): Observable<ContractorTeam[]> {
    return this.getById(contractorId).pipe(
      map((contractor) => contractor?.teams || [])
    );
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
