/**
 * @fileoverview Models for Permission-Assignment Reconnection System
 * @description Tracks progression from pole permissions to pole assignments
 * @created 2025-07-23
 */

import { Timestamp } from '@angular/fire/firestore';

/**
 * Core interface linking permission records to pole assignments
 */
export interface PermissionToAssignment {
  // Unique identifier
  id: string;

  // Linking identifiers
  permissionId: string; // Reference to original permission record
  assignmentId?: string; // Reference to pole assignment (when available)

  // Core business data
  propertyId: string; // Business identifier
  oneMapNadId: string; // OneMap reference
  poleNumber?: string; // Assigned pole number (null initially)

  // Location matching
  permissionLocation: LocationData;
  assignmentLocation?: LocationData;

  // Agent tracking
  permissionAgent: AgentData;
  assignmentAgent?: AgentData;

  // Workflow status
  linkingStatus: LinkingStatus;

  // Conflict detection
  conflicts?: ConflictDetails;

  // Linking metadata
  linkedDate?: Timestamp | Date;
  linkedBy?: string; // User who confirmed the link
  linkingMethod: LinkingMethod;

  // Audit trail
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  reconciledAt?: Timestamp | Date;
}

/**
 * Location data for permission and assignment stages
 */
export interface LocationData {
  address: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

/**
 * Agent information for permission and assignment stages
 */
export interface AgentData {
  name: string;
  id?: string;
  paymentDate?: Timestamp | Date;
  paymentAmount?: number;
  contractorId?: string;
}

/**
 * Status of the permission-assignment linking
 */
export enum LinkingStatus {
  PERMISSION_ONLY = 'PERMISSION_ONLY', // Permission exists, no pole assigned
  LINKED = 'LINKED', // Successfully linked
  CONFLICT = 'CONFLICT', // Agent or location mismatch
  DUPLICATE_POLE = 'DUPLICATE_POLE', // Pole assigned to multiple permissions
}

/**
 * Method used to create the link
 */
export enum LinkingMethod {
  AUTO = 'AUTO', // Automatically linked by exact match
  MANUAL = 'MANUAL', // Manually confirmed by user
  GPS_MATCH = 'GPS_MATCH', // Linked based on GPS proximity
}

/**
 * Detailed conflict information
 */
export interface ConflictDetails {
  agentNameMismatch: boolean;
  locationMismatch: boolean;
  duplicatePoleAssignment: boolean;
  distanceMeters?: number;

  // Detailed conflict info
  permissionAgentName: string;
  assignmentAgentName?: string;
  permissionAddress: string;
  assignmentAddress?: string;

  // Resolution suggestions
  suggestedAction: ConflictAction;
  confidence: number; // 0-1 confidence score
}

/**
 * Suggested actions for conflict resolution
 */
export enum ConflictAction {
  REVIEW_MANUALLY = 'REVIEW_MANUALLY',
  AUTO_LINK = 'AUTO_LINK',
  SPLIT_ASSIGNMENT = 'SPLIT_ASSIGNMENT',
}

/**
 * Conflict record for tracking resolution
 */
export interface PermissionConflict {
  id: string;
  permissionAssignmentId: string;
  conflictType: ConflictType;

  details: ConflictDetails;

  resolution: {
    status: ResolutionStatus;
    resolvedBy?: string;
    resolvedAt?: Timestamp | Date;
    action?: ConflictAction;
    notes?: string;
  };

  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Types of conflicts that can occur
 */
export enum ConflictType {
  AGENT_MISMATCH = 'AGENT_MISMATCH',
  LOCATION_MISMATCH = 'LOCATION_MISMATCH',
  DUPLICATE_POLE = 'DUPLICATE_POLE',
  MULTIPLE_MATCHES = 'MULTIPLE_MATCHES',
}

/**
 * Status of conflict resolution
 */
export enum ResolutionStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

/**
 * Daily reconciliation report
 */
export interface ReconciliationReport {
  id?: string;
  processedDate: Timestamp | Date;
  permissionsProcessed: number;
  newLinks: number;
  conflicts: number;
  duplicates: number;
  processingTimeMs: number;

  details?: {
    autoLinked: string[]; // IDs of auto-linked records
    conflictsFound: string[]; // IDs of conflict records
    duplicatePoles: string[]; // Pole numbers with duplicates
  };

  createdAt: Timestamp | Date;
}

/**
 * Match candidate for linking permissions to assignments
 */
export interface MatchCandidate {
  assignmentId: string;
  confidence: number; // 0-1 score
  matchReasons: MatchReason[];
  potentialConflicts: string[];
}

/**
 * Reasons why a match was suggested
 */
export enum MatchReason {
  PROPERTY_ID_MATCH = 'PROPERTY_ID_MATCH',
  GPS_PROXIMITY = 'GPS_PROXIMITY',
  AGENT_NAME_SIMILAR = 'AGENT_NAME_SIMILAR',
  ADDRESS_SIMILAR = 'ADDRESS_SIMILAR',
  ONE_MAP_NAD_MATCH = 'ONE_MAP_NAD_MATCH',
}

/**
 * Configuration for the reconciliation process
 */
export interface ReconciliationConfig {
  // Matching thresholds
  autoLinkConfidenceThreshold: number; // Default: 0.9
  gpsProximityMeters: number; // Default: 100
  locationMismatchMeters: number; // Default: 200
  agentNameSimilarityThreshold: number; // Default: 0.8

  // Processing limits
  maxRecordsPerRun: number; // Default: 1000
  enableAutoLinking: boolean; // Default: true

  // Notification settings
  notifyOnConflicts: boolean; // Default: true
  conflictEscalationThreshold: number; // Default: 0.3 confidence
}

/**
 * Status summary for dashboard display
 */
export interface LinkingStatusSummary {
  totalPermissions: number;
  linkedCount: number;
  conflictCount: number;
  duplicateCount: number;
  pendingCount: number;

  linkingRate: number; // Percentage successfully linked
  conflictRate: number; // Percentage with conflicts

  lastReconciledAt?: Timestamp | Date;
  nextReconciliationAt?: Timestamp | Date;
}

/**
 * Manual linking request from UI
 */
export interface ManualLinkRequest {
  permissionId: string;
  assignmentId?: string;
  confirmedBy: string;
  notes?: string;
  overrideConflicts: boolean;
}

/**
 * Bulk processing result
 */
export interface BulkProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  warnings: number;

  errors: {
    recordId: string;
    error: string;
    severity: 'ERROR' | 'WARNING';
  }[];

  processingTimeMs: number;
}
