import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, from, of, catchError, map, switchMap } from 'rxjs';
import { PoleReport, PoleReportMetadata } from '../models/pole-report.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PoleAnalyticsService {
  private firestore = inject(Firestore);
  private http = inject(HttpClient);

  // Updated to match batch processor collection paths
  private readonly REPORTS_BASE = 'analytics/pole-reports';
  private readonly SUMMARY_COLLECTION = 'analytics/pole-reports-summary';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly CACHE_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  // In-memory cache for performance
  private reportCache = new Map<string, { report: PoleReport; timestamp: number }>();

  constructor() {
    // Initialize cache cleanup
    setInterval(() => this.cleanupCache(), this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Get pole report with caching
   */
  getPoleReport(poleNumber: string): Observable<PoleReport | null> {
    // Try to get from Firebase cache first
    return from(this.getCachedReport(poleNumber)).pipe(
      switchMap((cached) => {
        if (cached && this.isRecentEnough(cached)) {
          return of(cached);
        }
        // If not cached or outdated, get fresh report
        return this.getFreshReport(poleNumber);
      }),
      catchError((error) => {
        console.error('Error getting pole report:', error);
        return of(null);
      }),
    );
  }

  /**
   * Get multiple pole reports
   */
  getPoleReports(poleNumbers: string[]): Observable<PoleReport[]> {
    const reportPromises = poleNumbers.map((pole) => this.getPoleReport(pole).toPromise());

    return from(Promise.all(reportPromises)).pipe(
      map((reports) => reports.filter((r) => r !== null) as PoleReport[]),
    );
  }

  /**
   * Get pole report metadata from summary collection
   */
  getPoleReportMetadata(poleNumber: string): Observable<PoleReportMetadata | null> {
    const docRef = doc(this.firestore, this.SUMMARY_COLLECTION, poleNumber);
    return from(getDoc(docRef)).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          return {
            poleNumber: data['poleNumber'],
            generatedAt: data['lastGenerated'],
            dataSource: data['dataSource'],
            version: 'current',
            totalRecords: data['totalRecords'],
            totalDrops: data['totalDrops'],
            totalAgents: data['totalAgents'],
            status: data['status'],
          } as PoleReportMetadata;
        }
        return null;
      }),
    );
  }

  /**
   * Get list of available pole reports from summary collection
   */
  getAvailablePoleReports(limitCount: number = 100): Observable<PoleReportMetadata[]> {
    const q = query(
      collection(this.firestore, this.SUMMARY_COLLECTION),
      orderBy('updatedAt', 'desc'),
      limit(limitCount),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        const reports: PoleReportMetadata[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          reports.push({
            poleNumber: data['poleNumber'],
            generatedAt: data['lastGenerated'],
            dataSource: data['dataSource'],
            version: 'current',
            totalRecords: data['totalRecords'],
            totalDrops: data['totalDrops'],
            totalAgents: data['totalAgents'],
            status: data['status'],
          } as PoleReportMetadata);
        });
        return reports;
      }),
    );
  }

  /**
   * Save pole report with proper versioning
   */
  async savePoleReport(poleNumber: string, report: PoleReport): Promise<void> {
    // Get current report if exists
    const currentRef = doc(this.firestore, this.REPORTS_BASE, poleNumber, 'current');
    const previousRef = doc(this.firestore, this.REPORTS_BASE, poleNumber, 'previous');

    const currentDoc = await getDoc(currentRef);

    // Move current to previous if exists
    if (currentDoc.exists()) {
      await setDoc(previousRef, {
        ...currentDoc.data(),
        version: 'previous',
        archivedAt: new Date(),
      });
    }

    // Save new report as current
    await setDoc(currentRef, {
      ...report,
      version: 'current',
      savedAt: new Date(),
    });

    // Update summary collection
    await setDoc(doc(this.firestore, this.SUMMARY_COLLECTION, poleNumber), {
      poleNumber,
      lastGenerated: report.generatedAt,
      dataSource: report.dataSource,
      totalRecords: report.summary.totalRecords,
      totalDrops: report.summary.totalDrops,
      totalAgents: report.agents.length,
      status: 'available',
      updatedAt: new Date(),
    });

    // Update in-memory cache
    this.reportCache.set(poleNumber, {
      report,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached report from Firebase
   */
  private async getCachedReport(poleNumber: string): Promise<PoleReport | null> {
    try {
      // Check in-memory cache first
      const cached = this.reportCache.get(poleNumber);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.report;
      }

      // Get from Firebase
      const docRef = doc(this.firestore, this.REPORTS_BASE, poleNumber, 'current');
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const report = snapshot.data() as PoleReport;

        // Update in-memory cache
        this.reportCache.set(poleNumber, {
          report,
          timestamp: Date.now(),
        });

        return report;
      }
      return null;
    } catch (error) {
      console.error('Error getting cached report:', error);
      return null;
    }
  }

  /**
   * Get fresh report (would typically call backend or process from CSV)
   */
  private getFreshReport(poleNumber: string): Observable<PoleReport | null> {
    // For now, this reads from the generated JSON files
    // In production, this would call a Cloud Function or backend API
    const reportUrl = `/assets/pole-reports/pole_report_${poleNumber.replace(/\./g, '_')}.json`;

    return this.http.get<PoleReport>(reportUrl).pipe(
      catchError(() => {
        // If file doesn't exist, return null
        return of(null);
      }),
    );
  }

  /**
   * Check if cached report is recent enough
   */
  private isRecentEnough(report: PoleReport): boolean {
    if (!report.generatedAt) return false;

    const reportDate = new Date(report.generatedAt);
    const now = new Date();
    const age = now.getTime() - reportDate.getTime();

    return age < this.CACHE_DURATION;
  }

  /**
   * Search poles by various criteria
   */
  searchPoles(criteria: {
    status?: string;
    agent?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Observable<PoleReportMetadata[]> {
    // This would be implemented based on your search requirements
    // For now, returns all available reports
    return this.getAvailablePoleReports();
  }

  /**
   * Get available reports for dashboard
   */
  getAvailableReportsForDashboard(): Observable<any[]> {
    return this.getAvailablePoleReports(50).pipe(
      map((reports) =>
        reports.map((r) => ({
          poleNumber: r.poleNumber,
          lastGenerated: r.generatedAt,
          version: r.version || 'current',
          totalRecords: r.totalRecords || 0,
          totalDrops: r.totalDrops || 0,
          totalAgents: r.totalAgents || 0,
          dataSource: r.dataSource || 'CSV',
          status: r.status || 'available',
        })),
      ),
    );
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expiredEntries: string[] = [];

    this.reportCache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_DURATION) {
        expiredEntries.push(key);
      }
    });

    expiredEntries.forEach((key) => this.reportCache.delete(key));

    if (expiredEntries.length > 0) {
      console.log(`Cleaned up ${expiredEntries.length} expired cache entries`);
    }
  }
}
