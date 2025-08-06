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
import { PoleReport, PoleReportMetadata, PoleTimelineEvent, ConnectedDrop, AgentActivity, DataQualityIssue, GPSCoordinate, ConnectedProperty } from '../models/pole-report.model';
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
   * Get fresh report from Firebase by querying ALL records for the pole
   */
  private getFreshReport(poleNumber: string): Observable<PoleReport | null> {
    // Query all records for this pole number from Firebase
    const stagingCollection = collection(this.firestore, 'onemap-processing-staging');
    const poleQuery = query(stagingCollection, where('Pole Number', '==', poleNumber));

    return from(getDocs(poleQuery)).pipe(
      map((snapshot) => {
        if (snapshot.empty) {
          console.log(`No records found for pole ${poleNumber}`);
          return null;
        }

        // Get all records for this pole
        const poleRecords: any[] = [];
        snapshot.forEach(doc => {
          poleRecords.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Found ${poleRecords.length} records for pole ${poleNumber}`);

        // Generate consolidated report from all records
        return this.generateConsolidatedReport(poleNumber, poleRecords);
      }),
      catchError((error) => {
        console.error('Error fetching pole records from Firebase:', error);
        return of(null);
      }),
    );
  }

  /**
   * Generate consolidated report from multiple pole records
   */
  private generateConsolidatedReport(poleNumber: string, records: any[]): PoleReport {
    const summary = this.buildConsolidatedSummary(records);
    const timeline = this.buildConsolidatedTimeline(records);
    const drops = this.buildConsolidatedDrops(records);
    const agents = this.buildConsolidatedAgents(records);
    const properties = this.buildPropertiesData(records);

    return {
      poleNumber,
      generatedAt: new Date().toISOString(),
      dataSource: 'Firestore',
      version: 'current',
      summary,
      timeline,
      drops,
      agents,
      properties, // Add properties to the report
      dataQuality: this.assessDataQuality(records),
      gpsCoordinates: this.extractGPSCoordinates(records)
    };
  }

  /**
   * Build consolidated summary from all pole records
   */
  private buildConsolidatedSummary(records: any[]) {
    const addresses = [...new Set(records.map(r => r['Location Address']).filter(a => a))];
    const drops = [...new Set(records.map(r => r['Drop Number']).filter(d => d))];
    const properties = [...new Set(records.map(r => r['Property ID']).filter(p => p))];
    const statuses = [...new Set(records.map(r => r['Status']).filter(s => s))];

    // Build status counts
    const statusCounts: Record<string, number> = {};
    records.forEach(record => {
      const status = record['Status'];
      if (status) {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    });

    // Find date range from all records
    const dates = records
      .map(r => r['date_status_changed'] || r['_first_seen_date'] || r['_import_timestamp'])
      .filter(d => d)
      .map(d => {
        if (d.toDate && typeof d.toDate === 'function') {
          return d.toDate();
        }
        return new Date(d);
      })
      .filter(d => !isNaN(d.getTime()));

    const firstDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const lastDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;
    const timeSpan = firstDate && lastDate ? 
      Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      totalRecords: records.length,
      totalDrops: drops.length,
      totalProperties: properties.length,
      addresses,
      statusCounts,
      firstAppearance: firstDate ? firstDate.toISOString() : undefined,
      lastUpdate: lastDate ? lastDate.toISOString() : undefined,
      timeSpan
    };
  }

  /**
   * Build consolidated timeline from all records
   */
  private buildConsolidatedTimeline(records: any[]): PoleTimelineEvent[] {
    const timelineEvents: PoleTimelineEvent[] = [];

    records.forEach(record => {
      const statusDate = record['date_status_changed'] || 
                        record['_first_seen_date'] || 
                        record['_import_timestamp'];
      
      if (statusDate) {
        let eventDate: Date;
        if (statusDate.toDate && typeof statusDate.toDate === 'function') {
          eventDate = statusDate.toDate();
        } else {
          eventDate = new Date(statusDate);
        }

        if (!isNaN(eventDate.getTime())) {
          timelineEvents.push({
            date: eventDate.toISOString().split('T')[0],
            time: eventDate.toTimeString().split(' ')[0],
            status: record['Status'] || 'Unknown',
            propertyId: record['Property ID'],
            drop: record['Drop Number'],
            agent: record['Field Agent Name (pole permission)'] || 
                   record['Field Agent Name (Home Sign Ups)'] || 
                   record['Field Agent Name & Surname(sales)'] || 
                   'Unknown',
            workflow: record['Flow Name Groups'],
            importBatch: record['import_batch_id']
          });
        }
      }
    });

    // Sort by date/time
    return timelineEvents.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Build consolidated drops data
   */
  private buildConsolidatedDrops(records: any[]): ConnectedDrop[] {
    const dropMap = new Map<string, any>();

    records.forEach(record => {
      const dropNumber = record['Drop Number'];
      if (dropNumber) {
        if (!dropMap.has(dropNumber)) {
          dropMap.set(dropNumber, {
            dropNumber,
            records: [],
            properties: new Set(),
            agents: new Set(),
            statuses: new Set()
          });
        }

        const dropData = dropMap.get(dropNumber);
        dropData.records.push(record);
        if (record['Property ID']) dropData.properties.add(record['Property ID']);
        if (record['Field Agent Name (pole permission)']) dropData.agents.add(record['Field Agent Name (pole permission)']);
        if (record['Status']) dropData.statuses.add(record['Status']);
      }
    });

    return Array.from(dropMap.values()).map(dropData => {
      const dates = dropData.records
        .map((r: any) => r['date_status_changed'] || r['_first_seen_date'] || r['_import_timestamp'])
        .filter((d: any) => d)
        .map((d: any) => d.toDate ? d.toDate() : new Date(d))
        .filter((d: Date) => !isNaN(d.getTime()));

      const firstDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
      const lastDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

      return {
        dropNumber: dropData.dropNumber,
        firstConnected: firstDate.toISOString(),
        lastUpdated: lastDate.toISOString(),
        primaryAgent: Array.from(dropData.agents)[0] || 'Unknown',
        status: Array.from(dropData.statuses)[0] || 'Unknown',
        properties: dropData.properties.size
      };
    });
  }

  /**
   * Build consolidated agents data
   */
  private buildConsolidatedAgents(records: any[]): AgentActivity[] {
    const agentMap = new Map<string, any>();

    records.forEach(record => {
      const agent = record['Field Agent Name (pole permission)'] || 
                   record['Field Agent Name (Home Sign Ups)'] || 
                   record['Field Agent Name & Surname(sales)'];
      
      if (agent && agent !== 'Unknown') {
        if (!agentMap.has(agent)) {
          agentMap.set(agent, {
            agentName: agent,
            records: [],
            drops: new Set(),
            activities: 0
          });
        }

        const agentData = agentMap.get(agent);
        agentData.records.push(record);
        if (record['Drop Number']) agentData.drops.add(record['Drop Number']);
        agentData.activities++;
      }
    });

    return Array.from(agentMap.values()).map(agentData => {
      const dates = agentData.records
        .map((r: any) => r['date_status_changed'] || r['_first_seen_date'] || r['_import_timestamp'])
        .filter((d: any) => d)
        .map((d: any) => d.toDate ? d.toDate() : new Date(d))
        .filter((d: Date) => !isNaN(d.getTime()));

      const firstDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
      const lastDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

      return {
        agentId: agentData.agentName,
        agentName: agentData.agentName,
        firstSeen: firstDate.toISOString(),
        lastSeen: lastDate.toISOString(),
        dropsHandled: Array.from(agentData.drops),
        activityLevel: agentData.activities > 10 ? 'high' : agentData.activities > 5 ? 'medium' : 'low',
        totalActivities: agentData.activities
      };
    });
  }

  /**
   * Build properties data - key addition for one-to-many relationship
   */
  private buildPropertiesData(records: any[]) {
    const propertyMap = new Map<string, any>();

    records.forEach(record => {
      const propertyId = record['Property ID'];
      if (propertyId) {
        if (!propertyMap.has(propertyId)) {
          propertyMap.set(propertyId, {
            propertyId,
            address: record['Location Address'],
            drop: record['Drop Number'],
            status: record['Status'],
            agent: record['Field Agent Name (pole permission)'] || 
                   record['Field Agent Name (Home Sign Ups)'] || 
                   record['Field Agent Name & Surname(sales)'] || 
                   'Unknown',
            workflow: record['Flow Name Groups'],
            firstSeen: null,
            lastUpdated: null,
            records: []
          });
        }

        const propertyData = propertyMap.get(propertyId);
        propertyData.records.push(record);

        // Update dates
        const statusDate = record['date_status_changed'] || 
                          record['_first_seen_date'] || 
                          record['_import_timestamp'];
        
        if (statusDate) {
          const eventDate = statusDate.toDate ? statusDate.toDate() : new Date(statusDate);
          if (!isNaN(eventDate.getTime())) {
            if (!propertyData.firstSeen || eventDate < new Date(propertyData.firstSeen)) {
              propertyData.firstSeen = eventDate.toISOString();
            }
            if (!propertyData.lastUpdated || eventDate > new Date(propertyData.lastUpdated)) {
              propertyData.lastUpdated = eventDate.toISOString();
              // Update status to most recent
              propertyData.status = record['Status'];
            }
          }
        }
      }
    });

    return Array.from(propertyMap.values());
  }

  /**
   * Assess data quality issues
   */
  private assessDataQuality(records: any[]): DataQualityIssue[] {
    const issues: DataQualityIssue[] = [];

    // Check for missing pole numbers
    const missingPole = records.filter(r => !r['Pole Number']).length;
    if (missingPole > 0) {
      issues.push({
        type: 'missing_data',
        field: 'Pole Number',
        description: 'Records missing pole number',
        severity: 'high',
        affectedRecords: missingPole
      });
    }

    // Check for missing addresses
    const missingAddress = records.filter(r => !r['Location Address']).length;
    if (missingAddress > 0) {
      issues.push({
        type: 'missing_data',
        field: 'Location Address',
        description: 'Records missing location address',
        severity: 'medium',
        affectedRecords: missingAddress
      });
    }

    // Check for missing status
    const missingStatus = records.filter(r => !r['Status']).length;
    if (missingStatus > 0) {
      issues.push({
        type: 'missing_data',
        field: 'Status',
        description: 'Records missing status information',
        severity: 'high',
        affectedRecords: missingStatus
      });
    }

    return issues;
  }

  /**
   * Extract GPS coordinates if available
   */
  private extractGPSCoordinates(records: any[]): GPSCoordinate[] {
    const coordinates: GPSCoordinate[] = [];

    records.forEach(record => {
      const lat = record['GPS Latitude'] || record['Latitude'];
      const lng = record['GPS Longitude'] || record['Longitude'];
      
      if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
        coordinates.push({
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          accuracy: record['GPS Accuracy'] ? parseFloat(record['GPS Accuracy']) : undefined,
          timestamp: record['GPS Timestamp'] || record['_import_timestamp']?.toDate?.()?.toISOString()
        });
      }
    });

    return coordinates;
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
