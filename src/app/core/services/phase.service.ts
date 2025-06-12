import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  collectionData,
  docData,
  CollectionReference,
  Timestamp,
  serverTimestamp,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, from, map, switchMap, combineLatest, of } from 'rxjs';
import { Phase, PhaseStatus, PhaseTemplate, PhaseNotification, DEFAULT_PHASES, DependencyType } from '../models/phase.model';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class PhaseService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  // Get all phases for a project
  getProjectPhases(projectId: string): Observable<Phase[]> {
    const phasesRef = collection(this.firestore, `projects/${projectId}/phases`) as CollectionReference<Phase>;
    const phasesQuery = query(phasesRef, orderBy('orderNo'));
    
    return collectionData(phasesRef, { idField: 'id' }).pipe(
      switchMap(phases => {
        // Populate user details for assigned phases
        if (phases.length === 0) {
          return of([]);
        }
        
        const phaseObservables = phases.map(phase => {
          if (phase.assignedTo) {
            return this.getUserDetails(phase.assignedTo).pipe(
              map(userDetails => ({
                ...phase,
                assignedToDetails: userDetails
              }))
            );
          }
          return of(phase);
        });
        
        return combineLatest(phaseObservables);
      })
    );
  }

  // Get single phase
  getPhase(projectId: string, phaseId: string): Observable<Phase | undefined> {
    const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
    return docData(phaseRef, { idField: 'id' }) as Observable<Phase | undefined>;
  }

  // Create phases for a new project
  async createProjectPhases(projectId: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    
    DEFAULT_PHASES.forEach((template, index) => {
      const phaseRef = doc(collection(this.firestore, `projects/${projectId}/phases`));
      const phase: Phase = {
        name: template.name,
        description: template.description,
        orderNo: template.orderNo,
        status: PhaseStatus.PENDING,
        dependencies: this.mapTemplateDependencies(template.defaultDependencies || [], index),
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };
      
      batch.set(phaseRef, phase);
    });
    
    await batch.commit();
  }

  // Map template dependencies to actual phase IDs
  private mapTemplateDependencies(dependencies: any[], currentIndex: number): any[] {
    return dependencies.map(dep => {
      // Map phase names to indices for default phases
      const phaseIndexMap: Record<string, number> = {
        'planning': 0,
        'initiate-project': 1,
        'work-in-progress': 2,
        'handover': 3,
        'handover-complete': 4,
        'final-acceptance': 5
      };
      
      const depIndex = phaseIndexMap[dep.phaseId];
      if (depIndex !== undefined && depIndex < currentIndex) {
        return {
          phaseId: DEFAULT_PHASES[depIndex].name.toLowerCase().replace(/\s+/g, '-'),
          type: dep.type
        };
      }
      return null;
    }).filter(dep => dep !== null);
  }

  // Update phase status
  async updatePhaseStatus(projectId: string, phaseId: string, status: PhaseStatus): Promise<void> {
    const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === PhaseStatus.COMPLETED) {
      updateData.completedAt = serverTimestamp();
      // Check and update dependent phases
      await this.checkAndUpdateDependentPhases(projectId, phaseId);
    }
    
    await updateDoc(phaseRef, updateData);
  }

  // Check and update phases that depend on this phase
  private async checkAndUpdateDependentPhases(projectId: string, completedPhaseId: string): Promise<void> {
    const phases = await this.getProjectPhases(projectId).pipe(map(phases => phases)).toPromise();
    if (!phases) return;
    
    const batch = writeBatch(this.firestore);
    
    phases.forEach(phase => {
      if (phase.dependencies) {
        const finishToStartDeps = phase.dependencies.filter(
          dep => dep.phaseId === completedPhaseId && dep.type === DependencyType.FINISH_TO_START
        );
        
        if (finishToStartDeps.length > 0 && phase.status === PhaseStatus.BLOCKED) {
          // Check if all dependencies are met
          const allDependenciesMet = phase.dependencies.every(dep => {
            const depPhase = phases.find(p => p.id === dep.phaseId);
            return !depPhase || depPhase.status === PhaseStatus.COMPLETED;
          });
          
          if (allDependenciesMet) {
            const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phase.id}`);
            batch.update(phaseRef, {
              status: PhaseStatus.PENDING,
              blockedReason: null,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
    });
    
    await batch.commit();
  }

  // Assign phase to user
  async assignPhase(projectId: string, phaseId: string, userId: string): Promise<void> {
    const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
    await updateDoc(phaseRef, {
      assignedTo: userId,
      updatedAt: serverTimestamp()
    });
    
    // Create notification
    await this.createPhaseNotification({
      type: 'phase_assigned',
      phaseId,
      projectId,
      userId,
      message: 'You have been assigned to a new phase',
      read: false,
      createdAt: serverTimestamp() as Timestamp
    });
  }

  // Unassign phase
  async unassignPhase(projectId: string, phaseId: string): Promise<void> {
    const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
    await updateDoc(phaseRef, {
      assignedTo: null,
      updatedAt: serverTimestamp()
    });
  }

  // Update phase dates
  async updatePhaseDates(projectId: string, phaseId: string, startDate?: Date, endDate?: Date): Promise<void> {
    const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
    const updateData: any = {
      updatedAt: serverTimestamp()
    };
    
    if (startDate) updateData.startDate = Timestamp.fromDate(startDate);
    if (endDate) updateData.endDate = Timestamp.fromDate(endDate);
    
    await updateDoc(phaseRef, updateData);
  }

  // Get phases assigned to a user
  getUserPhases(userId: string): Observable<any[]> {
    // This would need to query across all projects - implement based on your needs
    // For now, returning empty array
    return of([]);
  }

  // Create phase notification
  private async createPhaseNotification(notification: PhaseNotification): Promise<void> {
    const notificationsRef = collection(this.firestore, 'notifications');
    await setDoc(doc(notificationsRef), notification);
  }

  // Get user details (mock for now - replace with actual user service)
  private getUserDetails(userId: string): Observable<any> {
    // This should connect to your actual user service
    return of({
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '/placeholder-user.jpg',
      role: 'Project Manager'
    });
  }

  // Check if phase can be started based on dependencies
  canStartPhase(phase: Phase, allPhases: Phase[]): boolean {
    if (!phase.dependencies || phase.dependencies.length === 0) {
      return true;
    }
    
    return phase.dependencies.every(dep => {
      const dependentPhase = allPhases.find(p => p.id === dep.phaseId);
      if (!dependentPhase) return true;
      
      switch (dep.type) {
        case DependencyType.FINISH_TO_START:
          return dependentPhase.status === PhaseStatus.COMPLETED;
        case DependencyType.START_TO_START:
          return dependentPhase.status === PhaseStatus.ACTIVE || 
                 dependentPhase.status === PhaseStatus.COMPLETED;
        case DependencyType.FINISH_TO_FINISH:
          // Can start anytime, but can't finish until dependency finishes
          return true;
        default:
          return true;
      }
    });
  }

  // Calculate overall project progress based on phases
  calculateProjectProgress(phases: Phase[]): number {
    if (phases.length === 0) return 0;
    
    const completedPhases = phases.filter(p => p.status === PhaseStatus.COMPLETED).length;
    return Math.round((completedPhases / phases.length) * 100);
  }
}