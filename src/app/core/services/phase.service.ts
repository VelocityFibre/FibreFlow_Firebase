import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  // query,
  // orderBy,
  collectionData,
  docData,
  CollectionReference,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable, from, map, switchMap, combineLatest, of, firstValueFrom } from 'rxjs';
import {
  Phase,
  PhaseStatus,
  PhaseTemplate,
  PhaseNotification,
  DEFAULT_PHASES,
  DependencyType,
} from '../models/phase.model';
import { Auth } from '@angular/fire/auth';
import { StaffService } from '../../features/staff/services/staff.service';
@Injectable({
  providedIn: 'root',
})
export class PhaseService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private staffService = inject(StaffService);

  // Get all phases for a project
  getProjectPhases(projectId: string): Observable<Phase[]> {
    const phasesRef = collection(
      this.firestore,
      `projects/${projectId}/phases`,
    ) as CollectionReference<Phase>;

    return collectionData(phasesRef, { idField: 'id' }).pipe(
      map(phases => {
        // Sort phases by orderNo
        return phases.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));
      }),
      switchMap((phases) => {
        // Populate user details for assigned phases
        if (phases.length === 0) {
          return of([]);
        }

        const phaseObservables = phases.map((phase) => {
          // If phase already has assignedToDetails from the database, use that
          if (phase.assignedToDetails) {
            return of(phase);
          }
          // Otherwise, fetch staff details if assigned
          if (phase.assignedTo) {
            return this.staffService.getStaffById(phase.assignedTo).pipe(
              map((staffMember) => ({
                ...phase,
                assignedToDetails: staffMember
                  ? {
                      id: staffMember.id!,
                      name: staffMember.name,
                      email: staffMember.email,
                      avatar: staffMember.photoUrl || undefined,
                      role: staffMember.primaryGroup,
                    }
                  : undefined,
              })),
            );
          }
          return of(phase);
        });

        return combineLatest(phaseObservables);
      }),
    );
  }

  // Alias for getProjectPhases for consistency with other services
  getByProject(projectId: string): Observable<Phase[]> {
    return this.getProjectPhases(projectId);
  }

  // Get single phase
  getPhase(projectId: string, phaseId: string): Observable<Phase | undefined> {
    const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
    return docData(phaseRef, { idField: 'id' }) as Observable<Phase | undefined>;
  }

  // Create phases for a new project
  async createProjectPhases(projectId: string, _createTasks: boolean = true): Promise<void> {
    // _createTasks parameter kept for backwards compatibility but not used
    // Tasks creation is now handled separately to avoid circular dependency
    console.log(`PhaseService: Creating phases for project ${projectId}`);
    console.log(`PhaseService: Number of default phases: ${DEFAULT_PHASES.length}`);
    
    const batch = writeBatch(this.firestore);
    const phaseMap = new Map<string, string>(); // Map template phase IDs to actual Firestore IDs
    const phasesToCreate: Array<{ ref: any; data: any; template: any; index: number }> = [];

    // First, create all phase references and map IDs
    DEFAULT_PHASES.forEach((template, index) => {
      const phaseRef = doc(collection(this.firestore, `projects/${projectId}/phases`));
      const phaseId = phaseRef.id;
      
      // Map the template's logical ID to the actual Firestore ID
      const templateId = template.name.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '-');
      phaseMap.set(templateId, phaseId);
      
      phasesToCreate.push({ ref: phaseRef, data: null, template, index });
    });

    // Now create phase data with proper dependency references
    phasesToCreate.forEach(({ ref, template, index }) => {
      const phaseData = {
        name: template.name,
        description: template.description,
        orderNo: template.orderNo,
        status: PhaseStatus.PENDING,
        dependencies: (template.defaultDependencies || []).map((dep: any) => {
          const mappedId = phaseMap.get(dep.phaseId);
          if (mappedId) {
            return {
              phaseId: mappedId,
              type: dep.type,
            };
          }
          return null;
        }).filter((dep: any) => dep !== null),
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      console.log(`PhaseService: Creating phase ${index + 1}/${DEFAULT_PHASES.length}: ${template.name}`);
      batch.set(ref, phaseData);
    });

    try {
      await batch.commit();
      console.log(`PhaseService: Successfully created ${phasesToCreate.length} phases for project ${projectId}`);
    } catch (error) {
      console.error(`PhaseService: Error creating phases for project ${projectId}:`, error);
      throw error;
    }

    // Tasks creation removed - handled separately to avoid circular dependency
  }

  // Map template dependencies to actual phase IDs
  private mapTemplateDependencies(dependencies: any[], currentIndex: number): any[] {
    return dependencies
      .map((dep) => {
        // Map phase names to indices for default phases
        const phaseIndexMap: Record<string, number> = {
          planning: 0,
          'initiate-project': 1,
          'work-in-progress': 2,
          handover: 3,
          'handover-complete': 4,
          'final-acceptance': 5,
        };

        const depIndex = phaseIndexMap[dep.phaseId];
        if (depIndex !== undefined && depIndex < currentIndex) {
          return {
            phaseId: DEFAULT_PHASES[depIndex].name.toLowerCase().replace(/\s+/g, '-'),
            type: dep.type,
          };
        }
        return null;
      })
      .filter((dep) => dep !== null);
  }

  // Update phase status
  async updatePhaseStatus(
    projectId: string,
    phaseId: string,
    status: PhaseStatus,
    blockedReason?: string,
  ): Promise<void> {
    const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === PhaseStatus.COMPLETED) {
      updateData.completedAt = serverTimestamp();
      // Check and update dependent phases
      await this.checkAndUpdateDependentPhases(projectId, phaseId);
    }

    if (status === PhaseStatus.BLOCKED && blockedReason) {
      updateData.blockedReason = blockedReason;
    } else if (status !== PhaseStatus.BLOCKED) {
      updateData.blockedReason = null;
    }

    await updateDoc(phaseRef, updateData);
  }

  // Assign phase to a staff member
  async assignPhase(projectId: string, phaseId: string, staffId: string | null): Promise<void> {
    try {
      const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
      const updateData: any = {
        assignedTo: staffId,
        updatedAt: serverTimestamp(),
      };

      if (staffId) {
        // Get staff details using firstValueFrom for better async handling
        try {
          const staffMember = await firstValueFrom(this.staffService.getStaffById(staffId));
          if (staffMember) {
            updateData.assignedToDetails = {
              id: staffMember.id!,
              name: staffMember.name,
              email: staffMember.email,
              role: staffMember.primaryGroup,
            };
            // Add avatar only if it exists
            if (staffMember.photoUrl) {
              updateData.assignedToDetails.avatar = staffMember.photoUrl;
            }
          }
        } catch (staffError) {
          console.error('Error fetching staff member:', staffError);
          // Continue with assignment even if staff details fetch fails
        }
      } else {
        // Unassigning - remove staff details
        updateData.assignedToDetails = null;
      }

      await updateDoc(phaseRef, updateData);
      console.log('Phase assigned successfully:', { projectId, phaseId, staffId });
    } catch (error) {
      console.error('Error assigning phase:', error);
      throw error;
    }
  }

  // Check and update phases that depend on this phase
  private async checkAndUpdateDependentPhases(
    projectId: string,
    completedPhaseId: string,
  ): Promise<void> {
    const phases = await this.getProjectPhases(projectId)
      .pipe(map((phases) => phases))
      .toPromise();
    if (!phases) return;

    const batch = writeBatch(this.firestore);

    phases.forEach((phase) => {
      if (phase.dependencies) {
        const finishToStartDeps = phase.dependencies.filter(
          (dep) => dep.phaseId === completedPhaseId && dep.type === DependencyType.FINISH_TO_START,
        );

        if (finishToStartDeps.length > 0 && phase.status === PhaseStatus.BLOCKED) {
          // Check if all dependencies are met
          const allDependenciesMet = phase.dependencies.every((dep) => {
            const depPhase = phases.find((p) => p.id === dep.phaseId);
            return !depPhase || depPhase.status === PhaseStatus.COMPLETED;
          });

          if (allDependenciesMet) {
            const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phase.id}`);
            batch.update(phaseRef, {
              status: PhaseStatus.PENDING,
              blockedReason: null,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
    });

    await batch.commit();
  }

  // Unassign phase
  async unassignPhase(projectId: string, phaseId: string): Promise<void> {
    const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
    await updateDoc(phaseRef, {
      assignedTo: null,
      updatedAt: serverTimestamp(),
    });
  }

  // Update phase dates
  async updatePhaseDates(
    projectId: string,
    phaseId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<void> {
    const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (startDate) updateData.startDate = Timestamp.fromDate(startDate);
    if (endDate) updateData.endDate = Timestamp.fromDate(endDate);

    await updateDoc(phaseRef, updateData);
  }

  // Get phases assigned to a user
  getUserPhases(_userId: string): Observable<any[]> {
    // This would need to query across all projects - implement based on your needs
    // For now, returning empty array
    return of([]);
  }

  // Create phase notification
  private async createPhaseNotification(notification: PhaseNotification): Promise<void> {
    const notificationsRef = collection(this.firestore, 'notifications');
    await setDoc(doc(notificationsRef), notification);
  }

  // Check if phase can be started based on dependencies
  canStartPhase(phase: Phase, allPhases: Phase[]): boolean {
    if (!phase.dependencies || phase.dependencies.length === 0) {
      return true;
    }

    return phase.dependencies.every((dep) => {
      const dependentPhase = allPhases.find((p) => p.id === dep.phaseId);
      if (!dependentPhase) return true;

      switch (dep.type) {
        case DependencyType.FINISH_TO_START:
          return dependentPhase.status === PhaseStatus.COMPLETED;
        case DependencyType.START_TO_START:
          return (
            dependentPhase.status === PhaseStatus.ACTIVE ||
            dependentPhase.status === PhaseStatus.COMPLETED
          );
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

    const completedPhases = phases.filter((p) => p.status === PhaseStatus.COMPLETED).length;
    return Math.round((completedPhases / phases.length) * 100);
  }

  // Update all project phases (used by phase management dialog)
  async updateProjectPhases(projectId: string, phases: any[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    // Get existing phases to delete any that were removed
    const existingPhasesSnapshot = await this.getProjectPhases(projectId)
      .pipe(map((phases) => phases))
      .toPromise();

    const existingPhaseIds = existingPhasesSnapshot?.map((p) => p.id) || [];
    const updatedPhaseIds = phases.filter((p) => p.id).map((p) => p.id);

    // Delete removed phases
    existingPhaseIds.forEach((id) => {
      if (!updatedPhaseIds.includes(id)) {
        const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${id}`);
        batch.delete(phaseRef);
      }
    });

    // Create temporary ID mapping for new phases
    const tempIdMap = new Map<string, string>();

    // First pass: create/update phases without dependencies
    phases.forEach((phase, _index) => {
      if (!phase.id || phase.id.startsWith('temp-')) {
        // New phase
        const phaseRef = doc(collection(this.firestore, `projects/${projectId}/phases`));
        const newId = phaseRef.id;

        if (phase.id) {
          tempIdMap.set(phase.id, newId);
        }

        batch.set(phaseRef, {
          name: phase.name,
          description: phase.description,
          orderNo: phase.orderNo,
          status: phase.status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Existing phase
        const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phase.id}`);
        batch.update(phaseRef, {
          name: phase.name,
          description: phase.description,
          orderNo: phase.orderNo,
          status: phase.status,
          updatedAt: serverTimestamp(),
        });
      }
    });

    // Commit first batch
    await batch.commit();

    // Second pass: update dependencies with correct IDs
    const depBatch = writeBatch(this.firestore);

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const phaseId = phase.id?.startsWith('temp-') ? tempIdMap.get(phase.id) : phase.id;

      if (phaseId && phase.dependencies && phase.dependencies.length > 0) {
        const dependencies = phase.dependencies
          .map((dep: any) => {
            let depPhaseId = dep.phaseId;

            // Map temporary IDs to real IDs
            if (dep.phaseId.startsWith('temp-')) {
              const tempIndex = parseInt(dep.phaseId.split('-')[1]);
              const targetPhase = phases[tempIndex];
              depPhaseId = targetPhase.id?.startsWith('temp-')
                ? tempIdMap.get(targetPhase.id)
                : targetPhase.id;
            }

            return {
              phaseId: depPhaseId,
              type: dep.type,
            };
          })
          .filter((dep: any) => dep.phaseId); // Filter out any invalid dependencies

        const phaseRef = doc(this.firestore, `projects/${projectId}/phases/${phaseId}`);
        depBatch.update(phaseRef, {
          dependencies,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await depBatch.commit();
  }

  // Phase Template Management
  getPhaseTemplates(): Observable<PhaseTemplate[]> {
    const templatesRef = collection(
      this.firestore,
      'phaseTemplates',
    ) as CollectionReference<PhaseTemplate>;
    // Query removed - using templatesRef directly with collectionData
    // const templatesQuery = query(templatesRef, orderBy('orderNo'));

    return collectionData(templatesRef, { idField: 'id' }).pipe(
      map((templates) => {
        // If no templates exist, return DEFAULT_PHASES
        if (templates.length === 0) {
          return DEFAULT_PHASES.map((template, index) => ({
            ...template,
            id: `default-${index}`,
          }));
        }
        return templates;
      }),
    );
  }

  // Create phase template
  createPhaseTemplate(template: Omit<PhaseTemplate, 'id'>): Observable<void> {
    const templatesRef = collection(this.firestore, 'phaseTemplates');
    const newTemplate = {
      ...template,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(setDoc(doc(templatesRef), newTemplate));
  }

  // Update phase template
  updatePhaseTemplate(templateId: string, updates: Partial<PhaseTemplate>): Observable<void> {
    const templateRef = doc(this.firestore, 'phaseTemplates', templateId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    return from(updateDoc(templateRef, updateData));
  }

  // Delete phase template
  deletePhaseTemplate(templateId: string): Observable<void> {
    const templateRef = doc(this.firestore, 'phaseTemplates', templateId);
    return from(deleteDoc(templateRef));
  }

  // Check and create phases if missing for a project
  async ensureProjectHasPhases(projectId: string): Promise<void> {
    try {
      const phases = await firstValueFrom(this.getProjectPhases(projectId));
      if (!phases || phases.length === 0) {
        console.log(`PhaseService: No phases found for project ${projectId}, creating default phases...`);
        await this.createProjectPhases(projectId, true);
      }
    } catch (error) {
      console.error(`PhaseService: Error ensuring phases for project ${projectId}:`, error);
    }
  }

  // Initialize default phase templates (run once on first app load)
  async initializeDefaultTemplates(): Promise<void> {
    const templates = await firstValueFrom(this.getPhaseTemplates());

    if (templates.length === 0 || templates.every((t) => t.id?.startsWith('default-'))) {
      const batch = writeBatch(this.firestore);

      DEFAULT_PHASES.forEach((template) => {
        const templateRef = doc(collection(this.firestore, 'phaseTemplates'));
        batch.set(templateRef, {
          ...template,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    }
  }
}
