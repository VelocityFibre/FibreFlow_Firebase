import { Timestamp } from '@angular/fire/firestore';

export interface PlantedPole {
  id?: string;
  
  // Core pole identification
  poleNumber: string;
  projectId: string;
  
  // Location data (actual vs planned)
  actualGpsLocation: {
    latitude: number;
    longitude: number;
  };
  plannedGpsLocation?: {
    latitude: number;
    longitude: number;
  };
  gpsAccuracy: number;
  locationVariance?: number; // Distance between planned and actual
  
  // Installation details
  plantedDate: Date | Timestamp;
  plantedBy: string;
  verifiedBy?: string;
  verifiedDate?: Date | Timestamp;
  
  // Status tracking
  status: 'planted' | 'verified' | 'rejected' | 'needs-correction';
  verificationStatus: 'pending' | 'approved' | 'rejected';
  
  // Photo documentation
  photoUrls: {
    before?: string;
    front?: string;
    side?: string;
    depth?: string;
    concrete?: string;
    compaction?: string;
  };
  photoCount: number;
  
  // Quality control
  qualityScore?: number; // 0-100
  qualityNotes?: string;
  
  // Field notes and observations
  notes?: string;
  installationNotes?: string;
  
  // Relationships
  originalPlannedId?: string; // Reference to planned-poles
  stagingId?: string; // Reference to staging-field-captures
  
  // Metadata
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  deviceId?: string;
  
  // Audit trail
  approvedBy?: string;
  approvedAt?: Date | Timestamp;
  rejectedBy?: string;
  rejectedAt?: Date | Timestamp;
  rejectionReason?: string;
}

export interface PlantedPoleVerificationRequest {
  poleId: string;
  action: 'approve' | 'reject';
  notes?: string;
  verifiedBy: string;
}

export interface PlantedPoleBulkVerification {
  poleIds: string[];
  action: 'approve' | 'reject';
  notes?: string;
  verifiedBy: string;
}

export interface PlantedPoleStats {
  totalPlanted: number;
  pendingVerification: number;
  approved: number;
  rejected: number;
  averageQualityScore: number;
  completionRate: number;
}
