import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Step, StepStatus, StepWithPhase } from '../models/step.model';
import { Phase } from '../models/phase.model';
import { PhaseService } from './phase.service';

@Injectable({
  providedIn: 'root',
})
export class StepService {
  private firestore = inject(Firestore);
  private phaseService = inject(PhaseService);
  private collectionName = 'steps';

  getStepsByProject(projectId: string): Observable<StepWithPhase[]> {
    const stepsCollection = collection(this.firestore, this.collectionName);
    const q = query(
      stepsCollection,
      where('projectId', '==', projectId),
      orderBy('phaseId'),
      orderBy('orderNo'),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        const steps = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Step,
        );

        return steps.map(
          (step) =>
            ({
              ...step,
              startDate: step.startDate
                ? step.startDate instanceof Timestamp
                  ? step.startDate.toDate()
                  : step.startDate
                : undefined,
              endDate: step.endDate
                ? step.endDate instanceof Timestamp
                  ? step.endDate.toDate()
                  : step.endDate
                : undefined,
              createdAt: step.createdAt
                ? step.createdAt instanceof Timestamp
                  ? step.createdAt.toDate()
                  : step.createdAt
                : undefined,
              updatedAt: step.updatedAt
                ? step.updatedAt instanceof Timestamp
                  ? step.updatedAt.toDate()
                  : step.updatedAt
                : undefined,
            }) as StepWithPhase,
        );
      }),
      catchError((error) => {
        console.error('Error fetching steps:', error);
        return of([]);
      }),
    );
  }

  getStepsByPhase(projectId: string, phaseId: string): Observable<Step[]> {
    const stepsCollection = collection(this.firestore, this.collectionName);
    const q = query(
      stepsCollection,
      where('projectId', '==', projectId),
      where('phaseId', '==', phaseId),
      orderBy('orderNo'),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              startDate: doc.data()['startDate']?.toDate(),
              endDate: doc.data()['endDate']?.toDate(),
              createdAt: doc.data()['createdAt']?.toDate(),
              updatedAt: doc.data()['updatedAt']?.toDate(),
            }) as Step,
        );
      }),
      catchError((error) => {
        console.error('Error fetching steps by phase:', error);
        return of([]);
      }),
    );
  }

  createStep(step: Omit<Step, 'id'>): Observable<string> {
    const stepsCollection = collection(this.firestore, this.collectionName);
    
    // Build stepData object, filtering out undefined values
    const stepData: any = {
      projectId: step.projectId,
      phaseId: step.phaseId,
      name: step.name,
      orderNo: step.orderNo,
      startDate: step.startDate ? Timestamp.fromDate(step.startDate) : null,
      endDate: step.endDate ? Timestamp.fromDate(step.endDate) : null,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
      progress: step.progress || 0,
      status: step.status || StepStatus.PENDING,
    };
    
    // Only add optional fields if they have values
    if (step.description && step.description.trim()) {
      stepData.description = step.description.trim();
    }
    if (step.estimatedDuration) {
      stepData.estimatedDuration = step.estimatedDuration;
    }
    if (step.deliverables && step.deliverables.length > 0) {
      stepData.deliverables = step.deliverables;
    }

    return from(addDoc(stepsCollection, stepData)).pipe(
      map((docRef) => docRef.id),
      catchError((error) => {
        console.error('Error creating step:', error);
        throw error;
      }),
    );
  }

  updateStep(stepId: string, updates: Partial<Step>): Observable<void> {
    const stepDoc = doc(this.firestore, this.collectionName, stepId);
    
    // Build updateData object, filtering out undefined values
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };
    
    // Only add fields that have values
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) {
      if (updates.description && updates.description.trim()) {
        updateData.description = updates.description.trim();
      }
    }
    if (updates.orderNo !== undefined) updateData.orderNo = updates.orderNo;
    if (updates.status) updateData.status = updates.status;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.estimatedDuration !== undefined) updateData.estimatedDuration = updates.estimatedDuration;
    if (updates.deliverables !== undefined) updateData.deliverables = updates.deliverables;
    if (updates.phaseId) updateData.phaseId = updates.phaseId;
    if (updates.projectId) updateData.projectId = updates.projectId;

    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(updates.startDate);
    }
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(updates.endDate);
    }

    return from(updateDoc(stepDoc, updateData)).pipe(
      catchError((error) => {
        console.error('Error updating step:', error);
        throw error;
      }),
    );
  }

  deleteStep(stepId: string): Observable<void> {
    const stepDoc = doc(this.firestore, this.collectionName, stepId);
    return from(deleteDoc(stepDoc)).pipe(
      catchError((error) => {
        console.error('Error deleting step:', error);
        throw error;
      }),
    );
  }

  updateStepStatus(stepId: string, status: StepStatus): Observable<void> {
    return this.updateStep(stepId, { status });
  }

  updateStepProgress(stepId: string, progress: number): Observable<void> {
    const updates: Partial<Step> = { progress };

    if (progress === 0) {
      updates.status = StepStatus.PENDING;
    } else if (progress === 100) {
      updates.status = StepStatus.COMPLETED;
      updates.actualDuration = undefined; // Will be calculated from dates
    } else {
      updates.status = StepStatus.IN_PROGRESS;
    }

    return this.updateStep(stepId, updates);
  }

  reorderSteps(projectId: string, phaseId: string, stepIds: string[]): Observable<void> {
    const batch = writeBatch(this.firestore);

    stepIds.forEach((stepId, index) => {
      const stepDoc = doc(this.firestore, this.collectionName, stepId);
      batch.update(stepDoc, {
        orderNo: index + 1,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    });

    return from(batch.commit()).pipe(
      catchError((error) => {
        console.error('Error reordering steps:', error);
        throw error;
      }),
    );
  }

  getStepCountByPhase(projectId: string): Observable<Map<string, number>> {
    return this.getStepsByProject(projectId).pipe(
      map((steps) => {
        const countMap = new Map<string, number>();
        steps.forEach((step) => {
          const count = countMap.get(step.phaseId) || 0;
          countMap.set(step.phaseId, count + 1);
        });
        return countMap;
      }),
    );
  }

  getStepProgressByPhase(projectId: string): Observable<Map<string, number>> {
    return this.getStepsByProject(projectId).pipe(
      map((steps) => {
        const progressMap = new Map<string, { total: number; completed: number }>();

        steps.forEach((step) => {
          const current = progressMap.get(step.phaseId) || { total: 0, completed: 0 };
          current.total += 100;
          current.completed += step.progress || 0;
          progressMap.set(step.phaseId, current);
        });

        const avgProgressMap = new Map<string, number>();
        progressMap.forEach((value, key) => {
          const avgProgress =
            value.total > 0 ? Math.round((value.completed / value.total) * 100) : 0;
          avgProgressMap.set(key, avgProgress);
        });

        return avgProgressMap;
      }),
    );
  }

  // Global methods for Steps management page
  getAllSteps(): Observable<StepWithPhase[]> {
    const stepsCollection = collection(this.firestore, this.collectionName);

    return from(getDocs(stepsCollection)).pipe(
      map((snapshot) => {
        const steps = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Step,
        );

        return steps.map(
          (step) =>
            ({
              ...step,
              startDate: step.startDate
                ? step.startDate instanceof Timestamp
                  ? step.startDate.toDate()
                  : step.startDate
                : undefined,
              endDate: step.endDate
                ? step.endDate instanceof Timestamp
                  ? step.endDate.toDate()
                  : step.endDate
                : undefined,
              createdAt: step.createdAt
                ? step.createdAt instanceof Timestamp
                  ? step.createdAt.toDate()
                  : step.createdAt
                : undefined,
              updatedAt: step.updatedAt
                ? step.updatedAt instanceof Timestamp
                  ? step.updatedAt.toDate()
                  : step.updatedAt
                : undefined,
            }) as StepWithPhase,
        );
      }),
      catchError((error) => {
        console.error('Error fetching all steps:', error);
        return of([]);
      }),
    );
  }

  getAllPhases(): Observable<Phase[]> {
    // This is a simplified version - in a real app you might want to
    // get phases from all projects, but for now we'll return an empty array
    // since phases are stored as subcollections under projects
    return of([]);
  }
}
