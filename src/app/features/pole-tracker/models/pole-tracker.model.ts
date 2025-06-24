import { Timestamp } from '@angular/fire/firestore';

export interface PoleTracker {
  // Core Identity
  id?: string;
  vfPoleId: string; // Auto-generated: "LAW.P.A001"
  projectId: string;
  projectCode: string; // From project
  projectName?: string; // For display
  
  // Alternative ID if pole number not found
  alternativePoleId?: string;
  groupNumber?: string; // If poles are grouped
  
  // Installation Details
  dateInstalled: Timestamp | Date;
  location: string; // GPS coordinates or address
  poleType: PoleType;
  contractorId: string;
  contractorName?: string; // For display
  workingTeam: string;
  
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
  COMPOSITE = 'composite'
}

export enum UploadType {
  BEFORE = 'before',
  FRONT = 'front',
  SIDE = 'side',
  DEPTH = 'depth',
  CONCRETE = 'concrete',
  COMPACTION = 'compaction'
}

// Helper type for display
export interface PoleTrackerListItem extends PoleTracker {
  uploadProgress: number; // 0-100 percentage of uploads completed
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
}