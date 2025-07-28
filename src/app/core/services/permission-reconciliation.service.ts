/**
 * @fileoverview Permission Reconciliation Service
 * @description Handles linking pole permissions to pole assignments
 * @created 2025-07-23
 */

import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import { Observable, from, map, catchError } from 'rxjs';

import {
  PermissionToAssignment,
  PermissionConflict,
  ReconciliationReport,
  ReconciliationConfig,
  MatchCandidate,
  LinkingStatus,
  LinkingMethod,
  ConflictDetails,
  ConflictAction,
  ConflictType,
  ResolutionStatus,
  MatchReason,
  LinkingStatusSummary,
  ManualLinkRequest,
  BulkProcessingResult,
} from '../models/permission-assignment.model';

// Assuming these interfaces exist from the OneMap system
interface OneMapRecord {
  id: string;
  propertyId: string;
  oneMapNadId: string;
  poleNumber?: string;
  locationAddress: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  fieldAgentPolePermission: string;
  status: string;
  lastModifiedDate: string;
}

interface PlannedPole {
  id: string;
  propertyId?: string;
  clientPoleNumber: string;
  plannedLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  assignedContractorId?: string;
  oneMapData?: {
    nadId?: string;
    fieldAgent?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PermissionReconciliationService {
  private firestore = inject(Firestore);

  // Default configuration
  private defaultConfig: ReconciliationConfig = {
    autoLinkConfidenceThreshold: 0.9,
    gpsProximityMeters: 100,
    locationMismatchMeters: 200,
    agentNameSimilarityThreshold: 0.8,
    maxRecordsPerRun: 1000,
    enableAutoLinking: true,
    notifyOnConflicts: true,
    conflictEscalationThreshold: 0.3,
  };

  /**
   * Run daily reconciliation process
   */
  runDailyReconciliation(config?: Partial<ReconciliationConfig>): Observable<ReconciliationReport> {
    const effectiveConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    return from(this.performReconciliation(effectiveConfig, startTime));
  }

  /**
   * Get linking status summary for dashboard
   */
  getLinkingStatusSummary(): Observable<LinkingStatusSummary> {
    return from(this.calculateStatusSummary());
  }

  /**
   * Manually create a link between permission and assignment
   */
  createManualLink(request: ManualLinkRequest): Observable<PermissionToAssignment> {
    return from(this.processManualLink(request));
  }

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(): Observable<PermissionConflict[]> {
    const conflictsRef = collection(this.firestore, 'permission-conflicts');
    const q = query(
      conflictsRef,
      where('resolution.status', '==', ResolutionStatus.PENDING),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as PermissionConflict,
        ),
      ),
    );
  }

  /**
   * Get recent reconciliation reports
   */
  getRecentReports(limitCount: number = 10): Observable<ReconciliationReport[]> {
    const reportsRef = collection(this.firestore, 'reconciliation-reports');
    const q = query(reportsRef, orderBy('processedDate', 'desc'), limit(limitCount));

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as ReconciliationReport,
        ),
      ),
    );
  }

  /**
   * Core reconciliation logic
   */
  private async performReconciliation(
    config: ReconciliationConfig,
    startTime: number,
  ): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      processedDate: Timestamp.now(),
      permissionsProcessed: 0,
      newLinks: 0,
      conflicts: 0,
      duplicates: 0,
      processingTimeMs: 0,
      details: {
        autoLinked: [],
        conflictsFound: [],
        duplicatePoles: [],
      },
      createdAt: Timestamp.now(),
    };

    try {
      // 1. Get unlinked permissions
      const unlinkedPermissions = await this.getUnlinkedPermissions(config.maxRecordsPerRun);

      // 2. Get recent pole assignments (last 30 days)
      const recentAssignments = await this.getRecentPoleAssignments();

      // 3. Process each unlinked permission
      for (const permission of unlinkedPermissions) {
        const matches = await this.findPotentialMatches(permission, recentAssignments, config);

        if (matches.length === 1 && matches[0].confidence >= config.autoLinkConfidenceThreshold) {
          // High confidence auto-link
          if (config.enableAutoLinking) {
            const linkId = await this.createLink(permission, matches[0], LinkingMethod.AUTO);
            report.newLinks++;
            report.details!.autoLinked.push(linkId);
          }
        } else if (matches.length > 1) {
          // Multiple matches - create conflict
          const conflictId = await this.createConflict(permission, matches);
          report.conflicts++;
          report.details!.conflictsFound.push(conflictId);
        } else if (
          matches.length === 1 &&
          matches[0].confidence < config.autoLinkConfidenceThreshold
        ) {
          // Low confidence - create conflict for manual review
          const conflictId = await this.createConflict(permission, matches);
          report.conflicts++;
          report.details!.conflictsFound.push(conflictId);
        }

        report.permissionsProcessed++;
      }

      // 4. Detect duplicate pole assignments
      const duplicatePoles = await this.detectDuplicatePoles();
      report.duplicates = duplicatePoles.length;
      report.details!.duplicatePoles = duplicatePoles;

      // 5. Calculate processing time
      report.processingTimeMs = Date.now() - startTime;

      // 6. Save report
      await addDoc(collection(this.firestore, 'reconciliation-reports'), report);

      return report;
    } catch (error) {
      console.error('Reconciliation failed:', error);
      report.processingTimeMs = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Get permissions that haven't been linked to pole assignments
   */
  private async getUnlinkedPermissions(maxRecords: number): Promise<OneMapRecord[]> {
    // Get all permissions from OneMap staging
    const permissionsRef = collection(this.firestore, 'onemap-processing-staging');
    const permissionsQuery = query(
      permissionsRef,
      where('status', '==', 'Pole Permission: Approved'),
      limit(maxRecords),
    );

    const permissionsSnapshot = await getDocs(permissionsQuery);
    const allPermissions = permissionsSnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as OneMapRecord,
    );

    // Get already linked permission IDs
    const linksRef = collection(this.firestore, 'permission-assignments');
    const linksSnapshot = await getDocs(linksRef);
    const linkedPermissionIds = new Set(
      linksSnapshot.docs.map((doc) => doc.data()['permissionId']),
    );

    // Return only unlinked permissions
    return allPermissions.filter((permission) => !linkedPermissionIds.has(permission.id));
  }

  /**
   * Get recent pole assignments that might match permissions
   */
  private async getRecentPoleAssignments(): Promise<PlannedPole[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const assignmentsRef = collection(this.firestore, 'planned-poles');
    const assignmentsQuery = query(
      assignmentsRef,
      where('importDate', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('importDate', 'desc'),
      limit(2000),
    );

    const snapshot = await getDocs(assignmentsQuery);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as PlannedPole,
    );
  }

  /**
   * Find potential matches between permission and assignments
   */
  private async findPotentialMatches(
    permission: OneMapRecord,
    assignments: PlannedPole[],
    config: ReconciliationConfig,
  ): Promise<MatchCandidate[]> {
    const candidates: MatchCandidate[] = [];

    for (const assignment of assignments) {
      const candidate: MatchCandidate = {
        assignmentId: assignment.id,
        confidence: 0,
        matchReasons: [],
        potentialConflicts: [],
      };

      // Property ID exact match (highest confidence)
      if (permission.propertyId && assignment.propertyId === permission.propertyId) {
        candidate.confidence += 0.5;
        candidate.matchReasons.push(MatchReason.PROPERTY_ID_MATCH);
      }

      // OneMap NAD ID match
      if (permission.oneMapNadId && assignment.oneMapData?.nadId === permission.oneMapNadId) {
        candidate.confidence += 0.4;
        candidate.matchReasons.push(MatchReason.ONE_MAP_NAD_MATCH);
      }

      // GPS proximity match
      if (
        permission.gpsLatitude &&
        permission.gpsLongitude &&
        assignment.plannedLocation.lat &&
        assignment.plannedLocation.lng
      ) {
        const distance = this.calculateGPSDistance(
          permission.gpsLatitude,
          permission.gpsLongitude,
          assignment.plannedLocation.lat,
          assignment.plannedLocation.lng,
        );

        if (distance <= config.gpsProximityMeters) {
          candidate.confidence += 0.3;
          candidate.matchReasons.push(MatchReason.GPS_PROXIMITY);
        } else if (distance > config.locationMismatchMeters) {
          candidate.potentialConflicts.push(`GPS distance: ${Math.round(distance)}m`);
        }
      }

      // Agent name similarity
      if (permission.fieldAgentPolePermission && assignment.oneMapData?.fieldAgent) {
        const similarity = this.calculateNameSimilarity(
          permission.fieldAgentPolePermission,
          assignment.oneMapData.fieldAgent,
        );

        if (similarity >= config.agentNameSimilarityThreshold) {
          candidate.confidence += 0.2;
          candidate.matchReasons.push(MatchReason.AGENT_NAME_SIMILAR);
        } else if (similarity < 0.5) {
          candidate.potentialConflicts.push(
            `Agent mismatch: ${permission.fieldAgentPolePermission} vs ${assignment.oneMapData.fieldAgent}`,
          );
        }
      }

      // Address similarity
      if (permission.locationAddress && assignment.plannedLocation.address) {
        const addressSimilarity = this.calculateAddressSimilarity(
          permission.locationAddress,
          assignment.plannedLocation.address,
        );

        if (addressSimilarity > 0.8) {
          candidate.confidence += 0.1;
          candidate.matchReasons.push(MatchReason.ADDRESS_SIMILAR);
        }
      }

      // Only consider candidates with some confidence
      if (candidate.confidence > 0.3) {
        candidates.push(candidate);
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Create a permission-assignment link
   */
  private async createLink(
    permission: OneMapRecord,
    match: MatchCandidate,
    method: LinkingMethod,
  ): Promise<string> {
    // Get assignment details
    const assignmentDoc = await doc(this.firestore, 'planned-poles', match.assignmentId);
    const assignmentSnapshot = await getDocs(
      query(
        collection(this.firestore, 'planned-poles'),
        where('__name__', '==', match.assignmentId),
      ),
    );

    if (assignmentSnapshot.empty) {
      throw new Error(`Assignment ${match.assignmentId} not found`);
    }

    const assignment = assignmentSnapshot.docs[0].data() as PlannedPole;

    const linkDoc: Omit<PermissionToAssignment, 'id'> = {
      permissionId: permission.id,
      assignmentId: match.assignmentId,
      propertyId: permission.propertyId,
      oneMapNadId: permission.oneMapNadId,
      poleNumber: assignment.clientPoleNumber,

      permissionLocation: {
        address: permission.locationAddress,
        gpsLatitude: permission.gpsLatitude,
        gpsLongitude: permission.gpsLongitude,
      },

      assignmentLocation: {
        address: assignment.plannedLocation.address || '',
        gpsLatitude: assignment.plannedLocation.lat,
        gpsLongitude: assignment.plannedLocation.lng,
      },

      permissionAgent: {
        name: permission.fieldAgentPolePermission,
      },

      assignmentAgent: {
        name: assignment.oneMapData?.fieldAgent || '',
        contractorId: assignment.assignedContractorId,
      },

      linkingStatus: LinkingStatus.LINKED,
      linkingMethod: method,
      linkedDate: Timestamp.now(),

      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Check for conflicts
    const conflictDetails = this.analyzeConflicts(linkDoc);
    if (this.hasSignificantConflicts(conflictDetails)) {
      linkDoc.linkingStatus = LinkingStatus.CONFLICT;
      linkDoc.conflicts = conflictDetails;
    }

    const docRef = await addDoc(collection(this.firestore, 'permission-assignments'), linkDoc);
    return docRef.id;
  }

  /**
   * Create a conflict record for manual resolution
   */
  private async createConflict(
    permission: OneMapRecord,
    matches: MatchCandidate[],
  ): Promise<string> {
    const conflictType =
      matches.length > 1 ? ConflictType.MULTIPLE_MATCHES : ConflictType.AGENT_MISMATCH;

    const conflictDoc: Omit<PermissionConflict, 'id'> = {
      permissionAssignmentId: '', // Will be updated if/when link is created
      conflictType,

      details: {
        agentNameMismatch: matches.some((m) =>
          m.potentialConflicts.some((c) => c.includes('Agent mismatch')),
        ),
        locationMismatch: matches.some((m) =>
          m.potentialConflicts.some((c) => c.includes('GPS distance')),
        ),
        duplicatePoleAssignment: matches.length > 1,

        permissionAgentName: permission.fieldAgentPolePermission,
        permissionAddress: permission.locationAddress,

        suggestedAction:
          matches.length > 1 ? ConflictAction.REVIEW_MANUALLY : ConflictAction.AUTO_LINK,
        confidence: matches.length > 0 ? matches[0].confidence : 0,
      },

      resolution: {
        status: ResolutionStatus.PENDING,
      },

      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(this.firestore, 'permission-conflicts'), conflictDoc);
    return docRef.id;
  }

  /**
   * Detect duplicate pole assignments
   */
  private async detectDuplicatePoles(): Promise<string[]> {
    const linksRef = collection(this.firestore, 'permission-assignments');
    const snapshot = await getDocs(linksRef);

    const poleAssignments = new Map<string, number>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as PermissionToAssignment;
      if (data.poleNumber) {
        poleAssignments.set(data.poleNumber, (poleAssignments.get(data.poleNumber) || 0) + 1);
      }
    });

    return Array.from(poleAssignments.entries())
      .filter(([, count]) => count > 1)
      .map(([poleNumber]) => poleNumber);
  }

  /**
   * Calculate status summary
   */
  private async calculateStatusSummary(): Promise<LinkingStatusSummary> {
    // Get all permission assignments
    const linksRef = collection(this.firestore, 'permission-assignments');
    const linksSnapshot = await getDocs(linksRef);
    const links = linksSnapshot.docs.map((doc) => doc.data() as PermissionToAssignment);

    // Get all permissions
    const permissionsRef = collection(this.firestore, 'onemap-processing-staging');
    const permissionsQuery = query(
      permissionsRef,
      where('status', '==', 'Pole Permission: Approved'),
    );
    const permissionsSnapshot = await getDocs(permissionsQuery);
    const totalPermissions = permissionsSnapshot.size;

    // Calculate counts
    const linkedCount = links.filter((l) => l.linkingStatus === LinkingStatus.LINKED).length;
    const conflictCount = links.filter((l) => l.linkingStatus === LinkingStatus.CONFLICT).length;
    const duplicateCount = links.filter(
      (l) => l.linkingStatus === LinkingStatus.DUPLICATE_POLE,
    ).length;
    const pendingCount = totalPermissions - linkedCount - conflictCount - duplicateCount;

    // Get last reconciliation date
    const reportsRef = collection(this.firestore, 'reconciliation-reports');
    const recentReportQuery = query(reportsRef, orderBy('processedDate', 'desc'), limit(1));
    const recentReportSnapshot = await getDocs(recentReportQuery);
    const lastReport = recentReportSnapshot.docs[0]?.data() as ReconciliationReport;

    return {
      totalPermissions,
      linkedCount,
      conflictCount,
      duplicateCount,
      pendingCount,

      linkingRate: totalPermissions > 0 ? (linkedCount / totalPermissions) * 100 : 0,
      conflictRate: totalPermissions > 0 ? (conflictCount / totalPermissions) * 100 : 0,

      lastReconciledAt: lastReport?.processedDate,
      nextReconciliationAt: lastReport?.processedDate
        ? new Date(lastReport.processedDate.toDate().getTime() + 24 * 60 * 60 * 1000)
        : undefined,
    };
  }

  /**
   * Process manual link request
   */
  private async processManualLink(request: ManualLinkRequest): Promise<PermissionToAssignment> {
    // Implementation for manual linking
    // This would create a link with MANUAL method and proper audit trail
    throw new Error('Manual linking not yet implemented');
  }

  /**
   * Analyze conflicts in a link
   */
  private analyzeConflicts(link: Omit<PermissionToAssignment, 'id'>): ConflictDetails {
    const conflict: ConflictDetails = {
      agentNameMismatch: false,
      locationMismatch: false,
      duplicatePoleAssignment: false,
      permissionAgentName: link.permissionAgent.name,
      assignmentAgentName: link.assignmentAgent?.name,
      permissionAddress: link.permissionLocation.address,
      assignmentAddress: link.assignmentLocation?.address,
      suggestedAction: ConflictAction.AUTO_LINK,
      confidence: 1.0,
    };

    // Agent name mismatch
    if (link.permissionAgent.name !== link.assignmentAgent?.name) {
      const similarity = this.calculateNameSimilarity(
        link.permissionAgent.name,
        link.assignmentAgent?.name || '',
      );

      if (similarity < 0.7) {
        conflict.agentNameMismatch = true;
        conflict.suggestedAction = ConflictAction.REVIEW_MANUALLY;
        conflict.confidence -= 0.3;
      }
    }

    // Location mismatch (GPS distance > 200m)
    if (link.permissionLocation.gpsLatitude && link.assignmentLocation?.gpsLatitude) {
      const distance = this.calculateGPSDistance(
        link.permissionLocation.gpsLatitude,
        link.permissionLocation.gpsLongitude!,
        link.assignmentLocation.gpsLatitude,
        link.assignmentLocation.gpsLongitude!,
      );

      if (distance > 200) {
        conflict.locationMismatch = true;
        conflict.distanceMeters = distance;
        conflict.suggestedAction = ConflictAction.REVIEW_MANUALLY;
        conflict.confidence -= 0.4;
      }
    }

    return conflict;
  }

  /**
   * Check if conflicts are significant enough to require manual review
   */
  private hasSignificantConflicts(conflicts: ConflictDetails): boolean {
    return (
      conflicts.agentNameMismatch ||
      conflicts.locationMismatch ||
      conflicts.duplicatePoleAssignment ||
      conflicts.confidence < 0.5
    );
  }

  /**
   * Calculate GPS distance between two points (Haversine formula)
   */
  private calculateGPSDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Calculate name similarity using Levenshtein distance
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;

    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  /**
   * Calculate address similarity
   */
  private calculateAddressSimilarity(addr1: string, addr2: string): number {
    if (!addr1 || !addr2) return 0;

    // Normalize addresses
    const normalize = (addr: string) =>
      addr
        .toLowerCase()
        .replace(/\b(street|st|road|rd|avenue|ave)\b/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

    const n1 = normalize(addr1);
    const n2 = normalize(addr2);

    return this.calculateNameSimilarity(n1, n2);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
