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
  limit,
  Timestamp,
  DocumentReference,
  CollectionReference,
} from '@angular/fire/firestore';
import { Observable, from, map, catchError } from 'rxjs';
import { DailyKPIs } from '../models/daily-kpis.model';
import { handleError } from '../../../core/utils/error-handling';

@Injectable({
  providedIn: 'root',
})
export class DailyKpisService {
  private firestore = inject(Firestore);

  /**
   * Get the daily KPIs subcollection for a specific project
   */
  private getKpisCollection(projectId: string): CollectionReference {
    return collection(this.firestore, 'projects', projectId, 'daily-kpis');
  }

  /**
   * Create a new daily KPI entry for a project
   */
  createKPI(projectId: string, kpiData: Omit<DailyKPIs, 'id'>): Observable<string> {
    const kpisCollection = this.getKpisCollection(projectId);

    const firestoreData = {
      ...kpiData,
      date: Timestamp.fromDate(new Date(kpiData.date)),
      submittedAt: Timestamp.fromDate(new Date(kpiData.submittedAt)),
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    return from(addDoc(kpisCollection, firestoreData)).pipe(
      map((docRef: DocumentReference) => docRef.id),
      catchError(handleError('createKPI', '')),
    );
  }

  /**
   * Update an existing daily KPI entry
   */
  updateKPI(projectId: string, kpiId: string, updates: Partial<DailyKPIs>): Observable<any> {
    const kpiDocRef = doc(this.firestore, 'projects', projectId, 'daily-kpis', kpiId);

    const firestoreUpdates = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
      ...(updates.date && { date: Timestamp.fromDate(new Date(updates.date)) }),
      ...(updates.submittedAt && {
        submittedAt: Timestamp.fromDate(new Date(updates.submittedAt)),
      }),
    };

    return from(updateDoc(kpiDocRef, firestoreUpdates)).pipe(catchError(handleError('updateKPI')));
  }

  /**
   * Get all daily KPIs for a project
   */
  getKPIsByProject(projectId: string): Observable<DailyKPIs[]> {
    const kpisCollection = this.getKpisCollection(projectId);
    const q = query(kpisCollection, orderBy('date', 'desc'));

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data['date']?.toDate() || new Date(),
            submittedAt: data['submittedAt']?.toDate() || new Date(),
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
          } as DailyKPIs;
        }),
      ),
      catchError(handleError('getKPIsByProject', [])),
    );
  }

  /**
   * Get daily KPIs for a specific date and project
   */
  getKPIsByProjectAndDate(projectId: string, date: Date): Observable<DailyKPIs[]> {
    const kpisCollection = this.getKpisCollection(projectId);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      kpisCollection,
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('date', 'desc'),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data['date']?.toDate() || new Date(),
            submittedAt: data['submittedAt']?.toDate() || new Date(),
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
          } as DailyKPIs;
        }),
      ),
      catchError(handleError('getKPIsByProjectAndDate', [])),
    );
  }

  /**
   * Get a specific daily KPI entry
   */
  getKPI(projectId: string, kpiId: string): Observable<DailyKPIs | null> {
    const kpiDocRef = doc(this.firestore, 'projects', projectId, 'daily-kpis', kpiId);

    return from(getDoc(kpiDocRef)).pipe(
      map((doc) => {
        if (!doc.exists()) return null;

        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data['date']?.toDate() || new Date(),
          submittedAt: data['submittedAt']?.toDate() || new Date(),
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate() || new Date(),
        } as DailyKPIs;
      }),
      catchError(handleError('getKPI', null)),
    );
  }

  /**
   * Delete a daily KPI entry
   */
  deleteKPI(projectId: string, kpiId: string): Observable<any> {
    const kpiDocRef = doc(this.firestore, 'projects', projectId, 'daily-kpis', kpiId);

    return from(deleteDoc(kpiDocRef)).pipe(catchError(handleError('deleteKPI')));
  }

  /**
   * Get the previous day's KPIs for copying totals
   */
  getPreviousDayKPIs(projectId: string, currentDate: Date): Observable<DailyKPIs | null> {
    const previousDay = new Date(currentDate);
    previousDay.setDate(previousDay.getDate() - 1);

    return this.getKPIsByProjectAndDate(projectId, previousDay).pipe(
      map((kpis) => (kpis.length > 0 ? kpis[0] : null)),
      catchError(handleError('getPreviousDayKPIs', null)),
    );
  }

  /**
   * Get the latest KPI entry for a project
   */
  getLatestByProject(projectId: string): Observable<DailyKPIs> {
    const kpisCollection = this.getKpisCollection(projectId);
    const q = query(kpisCollection, orderBy('date', 'desc'), limit(1));

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        if (snapshot.empty) {
          // Return empty KPI with all zeros
          return {
            projectId,
            date: new Date(),
            permissionsTotal: 0,
            missingStatusTotal: 0,
            polesPlantedTotal: 0,
            homeSignupsTotal: 0,
            homeDropsTotal: 0,
            homesConnectedTotal: 0,
            trenchingTotal: 0,
            stringing24Total: 0,
            stringing48Total: 0,
            stringing96Total: 0,
            stringing144Total: 0,
            stringing288Total: 0,
          } as DailyKPIs;
        }
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data['date']?.toDate() || new Date(),
          submittedAt: data['submittedAt']?.toDate() || new Date(),
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate() || new Date(),
        } as DailyKPIs;
      }),
      catchError(handleError('getLatestByProject', {} as DailyKPIs)),
    );
  }

  /**
   * Get KPIs for a specific project with a limit
   */
  getKPIsForProject(projectId: string, limitCount: number = 10): Observable<DailyKPIs[]> {
    const kpisCollection = this.getKpisCollection(projectId);
    const q = query(kpisCollection, orderBy('date', 'desc'), limit(limitCount));

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data['date']?.toDate() || new Date(),
            submittedAt: data['submittedAt']?.toDate() || new Date(),
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
          } as DailyKPIs;
        }),
      ),
      catchError(handleError('getKPIsForProject', [])),
    );
  }

  /**
   * Get daily KPIs for a date range and project
   */
  getKPIsByProjectAndDateRange(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Observable<DailyKPIs[]> {
    const kpisCollection = this.getKpisCollection(projectId);
    const startOfRange = new Date(startDate);
    startOfRange.setHours(0, 0, 0, 0);
    const endOfRange = new Date(endDate);
    endOfRange.setHours(23, 59, 59, 999);

    const q = query(
      kpisCollection,
      where('date', '>=', Timestamp.fromDate(startOfRange)),
      where('date', '<=', Timestamp.fromDate(endOfRange)),
      orderBy('date', 'desc'),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data['date']?.toDate() || new Date(),
            submittedAt: data['submittedAt']?.toDate() || new Date(),
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
          } as DailyKPIs;
        }),
      ),
      catchError(handleError('getKPIsByProjectAndDateRange', [])),
    );
  }

  /**
   * Alias for getKPIsByProjectAndDateRange for weekly report generator
   */
  getKPIsForDateRange(projectId: string, startDate: Date, endDate: Date): Observable<DailyKPIs[]> {
    return this.getKPIsByProjectAndDateRange(projectId, startDate, endDate);
  }
}
