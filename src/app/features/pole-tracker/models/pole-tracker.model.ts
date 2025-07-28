import { Timestamp } from '@angular/fire/firestore';

// Status History tracking for poles
export interface StatusHistoryEntry {
  status: string; // The status value (e.g., "Pole Permission: Approved")
  changedAt: Timestamp | Date; // When the status changed
  changedBy?: string; // User ID who made the change
  changedByName?: string; // Display name of the user
  source?: string; // Source of the change (e.g., "OneMap Import", "Manual Update")
  importBatchId?: string; // If from import, which batch
  notes?: string; // Any additional notes about the change
  previousStatus?: string; // What the status was before this change
}

export interface PoleTracker {
  // Core Identity
  id?: string;
  vfPoleId: string; // Auto-generated: "LAW.P.A001"
  projectId: string;
  projectCode: string; // From project
  projectName?: string; // For display

  // Pole Identification (Data Integrity Rules: SPEC-DATA-001)
  poleNumber: string; // Physical pole number - MUST be globally unique
  alternativePoleId?: string; // Alternative ID if pole number not found
  groupNumber?: string; // If poles are grouped

  // Drop Relationship Management (Max 12 drops per pole)
  connectedDrops?: string[]; // Array of drop numbers connected to this pole
  dropCount?: number; // Calculated field: connectedDrops.length
  maxCapacity: number; // Always 12 (physical cable limit)

  // Status Management (From OneMap and other sources)
  status?: string; // Current status (e.g., "Pole Permission: Approved", "Construction: In Progress")
  statusHistory?: StatusHistoryEntry[]; // Complete history of status changes

  // Network Details
  pon?: string; // PON (Passive Optical Network) identifier
  zone?: string; // Zone/Area designation
  distributionFeeder?: string; // Distribution or Feeder type

  // Installation Details
  dateInstalled: Timestamp | Date;
  location: string; // GPS coordinates or address
  poleType: PoleType;
  contractorId: string;
  contractorName?: string; // For display
  workingTeam: string;
  ratePaid?: number; // Rate paid to contractor for this pole installation

  // Image Uploads (6 types)
  uploads: {
    before: ImageUpload;
    front: ImageUpload;
    side: ImageUpload;
    depth: ImageUpload;
    concrete: ImageUpload;
    compaction: ImageUpload;
  };

  // Quality Check
  qualityChecked: boolean;
  qualityCheckedBy?: string;
  qualityCheckedByName?: string; // For display
  qualityCheckDate?: Timestamp | Date;
  qualityCheckNotes?: string;

  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
  createdByName?: string;
  updatedBy: string;
  updatedByName?: string;
}

export interface ImageUpload {
  url?: string;
  thumbnailUrl?: string;
  fileName?: string;
  uploadedAt?: Timestamp | Date;
  uploaded: boolean;
  approved?: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp | Date;
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  originalSize: number; // in bytes
  compressedSize?: number; // in bytes after compression
  width?: number;
  height?: number;
  gps?: GPSCoordinates;
  mimeType: string;
}

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export enum PoleType {
  WOODEN = 'wooden',
  CONCRETE = 'concrete',
  STEEL = 'steel',
  COMPOSITE = 'composite',
}

export enum UploadType {
  BEFORE = 'before',
  FRONT = 'front',
  SIDE = 'side',
  DEPTH = 'depth',
  CONCRETE = 'concrete',
  COMPACTION = 'compaction',
}

// Helper type for display
export interface PoleTrackerListItem extends PoleTracker {
  uploadProgress: number; // 0-100 percentage of uploads completed
  uploadedCount: number; // Count of uploaded photos (0-6)
  allUploadsComplete: boolean;
}

// Filter interface for searching/filtering
export interface PoleTrackerFilter {
  projectId?: string;
  contractorId?: string;
  workingTeam?: string;
  poleType?: PoleType;
  dateFrom?: Date;
  dateTo?: Date;
  qualityChecked?: boolean;
  uploadStatus?: 'complete' | 'incomplete' | 'all';
}

// Statistics interface for progress tracking
export interface PoleTrackerStats {
  totalPoles: number;
  installedPoles: number;
  qualityCheckedPoles: number;
  polesWithAllUploads: number;
  polesByType: {
    [key in PoleType]?: number;
  };
  polesByContractor: {
    [contractorId: string]: {
      name: string;
      count: number;
    };
  };
  installationProgress: number; // percentage

  // Drop Capacity Statistics (Data Integrity)
  poleCapacityStats: {
    totalDrops: number;
    polesAtCapacity: number; // Poles with 12 drops
    polesNearCapacity: number; // Poles with 10+ drops
    averageDropsPerPole: number;
    capacityUtilization: number; // percentage
  };
}

// Home/Drop models for data integrity
export interface HomeSignup {
  id?: string;
  dropNumber: string; // MUST be globally unique
  connectedToPole: string; // Foreign key to PoleTracker.poleNumber
  address: string;
  status: string;
  poleValidated?: boolean; // Validation status
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface HomesConnected {
  id?: string;
  dropNumber: string; // MUST be globally unique
  connectedToPole: string; // Foreign key to PoleTracker.poleNumber
  address: string;
  connectionDate: Timestamp | Date;
  status: string;
  poleValidated?: boolean; // Validation status
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface HomesActivated {
  id?: string;
  dropNumber: string; // MUST be globally unique
  connectedToPole: string; // Foreign key to PoleTracker.poleNumber
  address: string;
  activationDate: Timestamp | Date;
  status: string;
  poleValidated?: boolean; // Validation status
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
