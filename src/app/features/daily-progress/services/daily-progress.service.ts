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
  QueryConstraint,
  Timestamp,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, from, map, switchMap } from 'rxjs';
import {
  DailyProgress,
  DailyProgressFilter,
  DailyProgressSummary,
  ProgressComment,
} from '../models/daily-progress.model';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class DailyProgressService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private collectionName = 'dailyProgress';

  getAll(filter?: DailyProgressFilter): Observable<DailyProgress[]> {
    const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

    if (filter) {
      if (filter.projectId) {
        constraints.push(where('projectId', '==', filter.projectId));
      }
      if (filter.phaseId) {
        constraints.push(where('phaseId', '==', filter.phaseId));
      }
      if (filter.taskId) {
        constraints.push(where('taskId', '==', filter.taskId));
      }
      if (filter.staffId) {
        constraints.push(where('staffIds', 'array-contains', filter.staffId));
      }
      if (filter.contractorId) {
        constraints.push(where('contractorId', '==', filter.contractorId));
      }
      if (filter.status) {
        constraints.push(where('status', '==', filter.status));
      }
      if (filter.dateFrom) {
        constraints.push(where('date', '>=', Timestamp.fromDate(filter.dateFrom)));
      }
      if (filter.dateTo) {
        constraints.push(where('date', '<=', Timestamp.fromDate(filter.dateTo)));
      }
    }

    const q = query(collection(this.firestore, this.collectionName), ...constraints);
    return collectionData(q, { idField: 'id' }) as Observable<DailyProgress[]>;
  }

  getById(id: string): Observable<DailyProgress | undefined> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return docData(docRef, { idField: 'id' }) as Observable<DailyProgress | undefined>;
  }

  getByProject(projectId: string): Observable<DailyProgress[]> {
    const q = query(
      collection(this.firestore, this.collectionName),
      where('projectId', '==', projectId),
      orderBy('date', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<DailyProgress[]>;
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<DailyProgress[]> {
    const q = query(
      collection(this.firestore, this.collectionName),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<DailyProgress[]>;
  }

  getTodayProgress(): Observable<DailyProgress[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getByDateRange(today, tomorrow);
  }

  create(progress: Omit<DailyProgress, 'id'>): Observable<string> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const newProgress = {
      ...progress,
      submittedBy: user?.uid || 'unknown',
      submittedByName: user?.displayName || user?.email || 'Unknown',
      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    return from(addDoc(collection(this.firestore, this.collectionName), newProgress)).pipe(
      map((docRef) => docRef.id),
    );
  }

  update(id: string, progress: Partial<DailyProgress>): Observable<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const updateData = {
      ...progress,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(docRef, updateData));
  }

  delete(id: string): Observable<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return from(deleteDoc(docRef));
  }

  submitForApproval(id: string): Observable<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const updateData = {
      status: 'submitted',
      submittedBy: user?.uid || 'unknown',
      submittedByName: user?.displayName || user?.email || 'Unknown',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = doc(this.firestore, this.collectionName, id);
    return from(updateDoc(docRef, updateData));
  }

  approve(id: string): Observable<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const updateData = {
      status: 'approved',
      approvedBy: user?.uid || 'unknown',
      approvedByName: user?.displayName || user?.email || 'Unknown',
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = doc(this.firestore, this.collectionName, id);
    return from(updateDoc(docRef, updateData));
  }

  addComment(progressId: string, commentText: string): Observable<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    return this.getById(progressId).pipe(
      switchMap((progress) => {
        if (!progress) throw new Error('Progress not found');

        const newComment: ProgressComment = {
          id: Date.now().toString(),
          text: commentText,
          authorId: user?.uid || 'unknown',
          authorName: user?.displayName || user?.email || 'Unknown',
          createdAt: new Date(),
        };

        const comments = progress.comments || [];
        comments.push(newComment);

        return this.update(progressId, { comments });
      }),
    );
  }

  getProjectSummary(
    projectId: string,
    startDate?: Date,
    endDate?: Date,
  ): Observable<DailyProgressSummary> {
    const constraints: QueryConstraint[] = [
      where('projectId', '==', projectId),
      where('status', '==', 'approved'),
    ];

    if (startDate) {
      constraints.push(where('date', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      constraints.push(where('date', '<=', Timestamp.fromDate(endDate)));
    }

    const q = query(collection(this.firestore, this.collectionName), ...constraints);
    return collectionData(q, { idField: 'id' }).pipe(
      map((progressList) => {
        const totalHours = progressList.reduce(
          (sum, p) => sum + ((p as any)['hoursWorked'] || 0),
          0,
        );
        const uniqueDates = new Set(
          progressList.map((p) => {
            const date = (p as any)['date'];
            return date instanceof Date ? date.toDateString() : new Date(date).toDateString();
          }),
        );
        const issuesCount = progressList.filter((p) => (p as any)['issuesEncountered']).length;

        const dates = progressList.map((p) => {
          const date = (p as any)['date'];
          return date instanceof Date ? date : new Date(date);
        });
        const periodStart =
          dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
        const periodEnd =
          dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date();

        return {
          projectId,
          projectName: progressList[0] ? (progressList[0] as any)['projectName'] || '' : '',
          totalHours,
          totalDays: uniqueDates.size,
          completedTasks: progressList.filter((p) => (p as any)['taskId']).length,
          issuesCount,
          periodStart,
          periodEnd,
        };
      }),
    );
  }
}
