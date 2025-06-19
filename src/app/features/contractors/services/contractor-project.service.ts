import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  CollectionReference,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from, map, switchMap, combineLatest } from 'rxjs';
import {
  ContractorProject,
  ContractorProjectSummary,
  ContractorProjectStatus,
  TeamAllocation,
  MaterialRequirement,
  MaterialUsage,
  PaymentRecord,
  PhaseProgress,
  ContractorPaymentSummary,
  ContractorMaterialSummary,
} from '../models/contractor-project.model';
import { ProjectService } from '../../../core/services/project.service';
import { ContractorService } from './contractor.service';

@Injectable({
  providedIn: 'root',
})
export class ContractorProjectService {
  private firestore = inject(Firestore);
  private projectService = inject(ProjectService);
  private contractorService = inject(ContractorService);

  private collectionName = 'contractor-projects';

  // Get contractor projects collection reference
  private getCollection(): CollectionReference<ContractorProject> {
    return collection(
      this.firestore,
      this.collectionName,
    ) as CollectionReference<ContractorProject>;
  }

  // Create contractor-project relationship
  createContractorProject(
    contractorProject: Omit<ContractorProject, 'id' | 'createdAt' | 'updatedAt'>,
  ): Observable<ContractorProject> {
    const docRef = doc(this.getCollection());
    const newContractorProject: ContractorProject = {
      ...contractorProject,
      id: docRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      overallProgress: 0,
      totalPaymentRequested: 0,
      totalPaymentMade: 0,
      workProgress: {
        phaseProgress: [],
        totalTasksAssigned: 0,
        totalTasksCompleted: 0,
        totalTasksInProgress: 0,
        totalTasksDelayed: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        totalOvertimeHours: 0,
        qualityChecksPassed: 0,
        qualityChecksFailed: 0,
        reworkRequired: 0,
        dailyProgressReports: [],
      },
      performance: {
        qualityScore: 0,
        defectsReported: 0,
        defectsResolved: 0,
        customerComplaints: 0,
        onTimeCompletion: 0,
        averageDelayDays: 0,
        safetyIncidents: 0,
        safetyScore: 100,
        toolboxTalksAttended: 0,
        productivityScore: 0,
        averageTasksPerDay: 0,
        averageHoursPerTask: 0,
        costOverruns: 0,
        profitMargin: 0,
        overallRating: 0,
      },
    };

    return from(setDoc(docRef, newContractorProject)).pipe(map(() => newContractorProject));
  }

  // Get contractor-project by ID
  getContractorProject(id: string): Observable<ContractorProject | undefined> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return docData(docRef, { idField: 'id' }) as Observable<ContractorProject | undefined>;
  }

  // Get all contractor projects
  getAllContractorProjects(): Observable<ContractorProject[]> {
    return collectionData(this.getCollection(), { idField: 'id' }) as Observable<
      ContractorProject[]
    >;
  }

  // Get contractor projects by contractor ID
  getContractorProjectsByContractor(contractorId: string): Observable<ContractorProject[]> {
    const q = query(
      this.getCollection(),
      where('contractorId', '==', contractorId),
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<ContractorProject[]>;
  }

  // Get contractor projects by project ID
  getContractorProjectsByProject(projectId: string): Observable<ContractorProject[]> {
    const q = query(
      this.getCollection(),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<ContractorProject[]>;
  }

  // Get active contractor projects
  getActiveContractorProjects(): Observable<ContractorProject[]> {
    const q = query(
      this.getCollection(),
      where('status', '==', ContractorProjectStatus.ACTIVE),
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<ContractorProject[]>;
  }

  // Get contractor summary with projects
  getContractorSummary(contractorId: string): Observable<ContractorProjectSummary> {
    return combineLatest([
      this.contractorService.getContractor(contractorId),
      this.getContractorProjectsByContractor(contractorId),
    ]).pipe(
      map(([contractor, projects]) => {
        const activeProjects = projects.filter((p) => p.status === ContractorProjectStatus.ACTIVE);
        const completedProjects = projects.filter(
          (p) => p.status === ContractorProjectStatus.COMPLETED,
        );

        const summary: ContractorProjectSummary = {
          contractorId: contractor?.id || contractorId,
          contractorName: contractor?.companyName || 'Unknown',
          activeProjects: activeProjects.map((p) => ({
            projectId: p.projectId,
            projectName: p.projectName,
            projectCode: p.projectCode,
            status: p.status,
            progress: p.overallProgress,
            teamsAllocated: p.allocatedTeams.length,
            contractValue: p.contractValue,
            paymentProgress: (p.totalPaymentMade / p.contractValue) * 100,
          })),
          completedProjects: completedProjects.map((p) => ({
            projectId: p.projectId,
            projectName: p.projectName,
            projectCode: p.projectCode,
            status: p.status,
            progress: p.overallProgress,
            teamsAllocated: p.allocatedTeams.length,
            contractValue: p.contractValue,
            paymentProgress: (p.totalPaymentMade / p.contractValue) * 100,
          })),
          totalContractValue: projects.reduce((sum, p) => sum + p.contractValue, 0),
          totalPaymentsMade: projects.reduce((sum, p) => sum + p.totalPaymentMade, 0),
          overallPerformanceRating:
            projects.length > 0
              ? projects.reduce((sum, p) => sum + p.performance.overallRating, 0) / projects.length
              : 0,
        };

        return summary;
      }),
    );
  }

  // Get all contractor summaries
  getAllContractorSummaries(): Observable<ContractorProjectSummary[]> {
    return this.contractorService.getContractors().pipe(
      switchMap((contractors) => {
        const summaryObservables = contractors.map((contractor) =>
          this.getContractorSummary(contractor.id!),
        );
        return combineLatest(summaryObservables);
      }),
    );
  }

  // Update contractor project
  updateContractorProject(id: string, updates: Partial<ContractorProject>): Observable<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now(),
    };
    return from(updateDoc(docRef, updateData));
  }

  // Team Management Methods
  allocateTeam(contractorProjectId: string, team: TeamAllocation): Observable<void> {
    return this.getContractorProject(contractorProjectId).pipe(
      switchMap((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const allocatedTeams = [...(contractorProject.allocatedTeams || []), team];
        return this.updateContractorProject(contractorProjectId, { allocatedTeams });
      }),
    );
  }

  updateTeamAllocation(
    contractorProjectId: string,
    teamId: string,
    updates: Partial<TeamAllocation>,
  ): Observable<void> {
    return this.getContractorProject(contractorProjectId).pipe(
      switchMap((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const allocatedTeams = contractorProject.allocatedTeams.map((team) =>
          team.teamId === teamId ? { ...team, ...updates } : team,
        );
        return this.updateContractorProject(contractorProjectId, { allocatedTeams });
      }),
    );
  }

  releaseTeam(contractorProjectId: string, teamId: string): Observable<void> {
    return this.getContractorProject(contractorProjectId).pipe(
      switchMap((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const allocatedTeams = contractorProject.allocatedTeams.map((team) =>
          team.teamId === teamId
            ? { ...team, isActive: false, releaseDate: Timestamp.now() }
            : team,
        );
        return this.updateContractorProject(contractorProjectId, { allocatedTeams });
      }),
    );
  }

  // Material Management Methods
  addMaterialRequirement(
    contractorProjectId: string,
    requirement: MaterialRequirement,
  ): Observable<void> {
    return this.getContractorProject(contractorProjectId).pipe(
      switchMap((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const materialsNeeded = [...(contractorProject.materialsNeeded || []), requirement];
        return this.updateContractorProject(contractorProjectId, { materialsNeeded });
      }),
    );
  }

  recordMaterialUsage(contractorProjectId: string, usage: MaterialUsage): Observable<void> {
    return this.getContractorProject(contractorProjectId).pipe(
      switchMap((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const materialsUsed = [...(contractorProject.materialsUsed || []), usage];
        return this.updateContractorProject(contractorProjectId, { materialsUsed });
      }),
    );
  }

  getMaterialSummary(contractorProjectId: string): Observable<ContractorMaterialSummary> {
    return this.getContractorProject(contractorProjectId).pipe(
      map((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const totalMaterialsNeeded = contractorProject.materialsNeeded?.length || 0;
        const totalMaterialsUsed = contractorProject.materialsUsed?.length || 0;

        const totalUsedQuantity =
          contractorProject.materialsUsed?.reduce((sum, m) => sum + m.usedQuantity, 0) || 0;
        const totalWastageQuantity =
          contractorProject.materialsUsed?.reduce((sum, m) => sum + m.wastageQuantity, 0) || 0;

        const materialUtilizationRate =
          totalUsedQuantity > 0
            ? ((totalUsedQuantity - totalWastageQuantity) / totalUsedQuantity) * 100
            : 0;
        const wastagePercentage =
          totalUsedQuantity > 0 ? (totalWastageQuantity / totalUsedQuantity) * 100 : 0;

        const upcomingMaterialNeeds =
          contractorProject.materialsNeeded?.filter(
            (m) => m.allocationStatus !== 'complete' && m.requiredByDate > Timestamp.now(),
          ) || [];

        return {
          totalMaterialsNeeded,
          totalMaterialsUsed,
          materialUtilizationRate,
          wastagePercentage,
          upcomingMaterialNeeds,
        };
      }),
    );
  }

  // Payment Management Methods
  addPaymentRequest(contractorProjectId: string, payment: PaymentRecord): Observable<void> {
    return this.getContractorProject(contractorProjectId).pipe(
      switchMap((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const payments = [...(contractorProject.payments || []), payment];
        const totalPaymentRequested =
          contractorProject.totalPaymentRequested + payment.requestedAmount;

        return this.updateContractorProject(contractorProjectId, {
          payments,
          totalPaymentRequested,
        });
      }),
    );
  }

  updatePaymentRecord(
    contractorProjectId: string,
    paymentId: string,
    updates: Partial<PaymentRecord>,
  ): Observable<void> {
    return this.getContractorProject(contractorProjectId).pipe(
      switchMap((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const payments = contractorProject.payments.map((payment) =>
          payment.id === paymentId ? { ...payment, ...updates } : payment,
        );

        // Recalculate total payment made if payment status changed
        let totalPaymentMade = contractorProject.totalPaymentMade;
        if (updates.paymentStatus === 'paid' && updates.netPaymentAmount) {
          totalPaymentMade =
            contractorProject.payments
              .filter((p) => p.paymentStatus === 'paid')
              .reduce((sum, p) => sum + (p.netPaymentAmount || 0), 0) + updates.netPaymentAmount;
        }

        return this.updateContractorProject(contractorProjectId, {
          payments,
          totalPaymentMade,
        });
      }),
    );
  }

  getPaymentSummary(contractorProjectId: string): Observable<ContractorPaymentSummary> {
    return this.getContractorProject(contractorProjectId).pipe(
      map((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const pendingPayments =
          contractorProject.payments?.filter(
            (p) => p.paymentStatus === 'not_paid' || p.paymentStatus === 'processing',
          ) || [];

        const totalApproved =
          contractorProject.payments
            ?.filter((p) => p.approvalStatus === 'approved')
            .reduce((sum, p) => sum + (p.approvedAmount || 0), 0) || 0;

        return {
          totalContractValue: contractorProject.contractValue,
          totalRequested: contractorProject.totalPaymentRequested,
          totalApproved,
          totalPaid: contractorProject.totalPaymentMade,
          totalRetention: contractorProject.retentionAmount,
          pendingPayments,
          upcomingMilestones: [], // TODO: Implement milestone tracking
        };
      }),
    );
  }

  // Work Progress Methods
  updatePhaseProgress(contractorProjectId: string, phaseProgress: PhaseProgress): Observable<void> {
    return this.getContractorProject(contractorProjectId).pipe(
      switchMap((contractorProject) => {
        if (!contractorProject) throw new Error('Contractor project not found');

        const workProgress = { ...contractorProject.workProgress };
        const existingIndex = workProgress.phaseProgress.findIndex(
          (p) => p.phaseId === phaseProgress.phaseId,
        );

        if (existingIndex >= 0) {
          workProgress.phaseProgress[existingIndex] = phaseProgress;
        } else {
          workProgress.phaseProgress.push(phaseProgress);
        }

        // Calculate overall progress
        const overallProgress =
          workProgress.phaseProgress.reduce((sum, p) => sum + p.progress, 0) /
          (workProgress.phaseProgress.length || 1);

        return this.updateContractorProject(contractorProjectId, {
          workProgress,
          overallProgress,
        });
      }),
    );
  }

  // Delete contractor project
  deleteContractorProject(id: string): Observable<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return from(deleteDoc(docRef));
  }
}
