import { Timestamp } from '@angular/fire/firestore';
import { StatusHistoryEntry } from './pole-tracker.model';

export type PoleType = 'wooden' | 'concrete' | 'steel' | 'composite';

// Export status types for use in services
export type PoleStatus =
  | 'planned'
  | 'assigned'
  | 'in_progress'
  | 'installed'
  | 'verified'
  | 'rejected'
  | 'cancelled';

/**
 * PlannedPole represents a pole that needs to be installed
 * This data comes from client CSV/Excel import
 */
export interface PlannedPole {
  id: string;
  clientPoleNumber: string; // From client import (e.g., "P001")
  plannedLocation: {
    lat: number;
    lng: number;
    address?: string; // Reverse geocoded or provided
  };
  projectId: string;
  projectCode?: string;
  projectName?: string;
  assignedContractorId?: string;
  assignedContractorName?: string;
  assignedTeamId?: string;
  assignedTeamName?: string;
  importBatchId: string;
  importDate: Timestamp | Date;
  notes?: string;
  status: PlannedPoleStatus;
  statusHistory?: StatusHistoryEntry[]; // Complete history of status changes
  metadata?: {
    importedBy: string;
    importedByName?: string;
    importFileName: string;
    rowNumber: number;
    originalData?: Record<string, any>; // Store original CSV row
  };
  // Link to actual installation when completed
  installationId?: string;
  installedDate?: Timestamp | Date;
  // Scheduling
  scheduledDate?: Timestamp | Date;
  priority?: 'high' | 'medium' | 'low';
}

export enum PlannedPoleStatus {
  PLANNED = 'planned',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  INSTALLED = 'installed',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/**
 * Enhanced PoleInstallation for mobile capture
 * Extends the existing PoleTracker model with mobile-specific features
 */
export interface PoleInstallation {
  id: string;
  plannedPoleId: string; // Links to PlannedPole
  vfPoleId: string; // Auto-generated VF ID

  // Location validation
  actualLocation: {
    lat: number;
    lng: number;
    accuracy: number; // GPS accuracy in meters
    captureTime: Timestamp | Date;
    method: LocationCaptureMethod;
  };
  locationDeviation: number; // Distance from planned location (meters)
  locationValid: boolean; // If within acceptable range

  // Installation details (from existing model)
  projectId: string;
  projectCode?: string;
  projectName?: string;
  contractorId: string;
  contractorName?: string;
  teamId: string;
  teamName?: string;
  installedBy: string; // User ID who captured
  installedByName?: string;
  installationDate: Timestamp | Date;
  poleType: PoleType;

  // Photos with enhanced metadata
  photos: {
    before: PhotoData;
    front: PhotoData;
    side: PhotoData;
    depth: PhotoData;
    concrete: PhotoData;
    compaction: PhotoData;
  };

  // Verification tracking
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedByName?: string;
  verificationDate?: Timestamp | Date;
  verificationNotes?: string;
  rejectionReason?: string;

  // Offline sync tracking
  createdOffline?: boolean;
  syncedAt?: Timestamp | Date;
  syncStatus?: SyncStatus;
  syncError?: string;

  // Quality metrics
  qualityScore?: number; // 0-100 based on photos, location, etc.
  completionTime?: number; // Minutes taken to complete

  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
  updatedBy: string;
}

export interface PhotoData {
  url?: string;
  thumbnailUrl?: string;
  fileName?: string;
  timestamp?: Timestamp | Date;
  uploaded: boolean;
  gpsLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  deviceInfo?: string;
  size?: number; // File size in bytes
  mimeType?: string;
  // Validation
  valid?: boolean;
  validationMessage?: string;
  // EXIF data
  exifData?: {
    make?: string;
    model?: string;
    orientation?: number;
    dateTime?: string;
    gps?: any;
  };
}

export type LocationCaptureMethod = 'gps' | 'manual' | 'offline' | 'network';

export enum LocationCaptureMethodEnum {
  GPS = 'gps',
  MANUAL = 'manual',
  OFFLINE = 'offline',
  NETWORK = 'network',
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVIEW = 'needs_review',
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CONFLICT = 'conflict',
}

/**
 * Import batch tracking
 */
export interface PoleImportBatch {
  id: string;
  fileName: string;
  projectId: string;
  projectName?: string;
  totalPoles: number;
  validPoles: number;
  invalidPoles: number;
  duplicatePoles: number;
  importedBy: string;
  importedByName?: string;
  importDate: Timestamp | Date;
  status: ImportStatus;
  errors?: ImportError[];
  mapping?: ImportMapping;
}

export interface ImportError {
  row: number;
  poleNumber: string;
  error: string;
  field?: string;
}

export interface ImportBatch {
  id: string;
  projectId: string;
  fileName: string;
  importedBy: string;
  importDate: Timestamp | Date;
  totalPoles: number;
  successCount: number;
  errorCount: number;
  status: 'processing' | 'completed' | 'failed' | 'partial';
  errors: string[];
  importedByName?: string;
  notes?: string;
}

export interface ImportMapping {
  poleNumberColumn: string;
  latitudeColumn: string;
  longitudeColumn: string;
  notesColumn?: string;
  contractorColumn?: string;
  teamColumn?: string;
  addressColumn?: string;
}

export enum ImportStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

/**
 * Offline queue for mobile sync
 */
export interface OfflineQueueItem {
  id: string;
  type: 'installation' | 'photo' | 'verification';
  action: 'create' | 'update' | 'delete';
  entityId: string;
  data: any;
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  priority: number;
}

/**
 * Mobile session tracking
 */
export interface MobileSession {
  id: string;
  userId: string;
  contractorId: string;
  teamId?: string;
  startTime: Timestamp | Date;
  endTime?: Timestamp | Date;
  polesVisited: number;
  polesInstalled: number;
  photosCaptures: number;
  totalDistance?: number; // km traveled
  batteryStart?: number;
  batteryEnd?: number;
  dataUsage?: number; // MB used
  offlineTime?: number; // Minutes offline
}

/**
 * Map view filters
 */
export interface MapViewFilter {
  projectId?: string;
  contractorId?: string;
  teamId?: string;
  status?: PlannedPoleStatus[];
  assignedToMe?: boolean;
  nearbyRadius?: number; // km
  dateRange?: {
    start: Date;
    end: Date;
  };
  hideCompleted?: boolean;
  showOnlyPriority?: boolean;
}

/**
 * Pole statistics for dashboard
 */
export interface MobilePoleStats {
  plannedPoles: number;
  assignedPoles: number;
  inProgressPoles: number;
  installedPoles: number;
  verifiedPoles: number;
  rejectedPoles: number;
  todayInstallations: number;
  weekInstallations: number;
  averageDeviationMeters: number;
  averageCompletionMinutes: number;
  photoCompletionRate: number; // percentage
  verificationPassRate: number; // percentage
}
