import * as admin from 'firebase-admin';
import { sql } from '../config/neon';

interface PoleSubmission {
  id: string;
  type: 'pole';
  data: {
    poleNumber: string;
    projectId: string;
    gps: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    photos: Array<{
      type: string;
      url: string;
      timestamp?: string;
    }>;
    contractorId?: string;
    notes?: string;
  };
  metadata: any;
}

interface ValidationResult {
  isValid: boolean;
  autoApprove: boolean;
  priority?: 'high' | 'normal' | 'low';
  score: number;
  checks: {
    [key: string]: {
      passed: boolean;
      message: string;
      severity: 'error' | 'warning' | 'info';
    };
  };
  errors?: string[];
  warnings?: string[];
  reviewReasons?: string[];
}

const POLE_NUMBER_REGEX = /^[A-Z]{3}\.P\.[A-Z]\d{3}$/;
const REQUIRED_PHOTOS = ['before', 'front', 'side', 'depth', 'concrete', 'compaction'];
const MAX_GPS_DEVIATION = 50; // meters

export async function validatePoleSubmission(submission: PoleSubmission): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    autoApprove: true,
    score: 100,
    checks: {},
    errors: [],
    warnings: [],
    reviewReasons: []
  };
  
  const { data } = submission;
  
  // 1. Validate pole number format
  if (!POLE_NUMBER_REGEX.test(data.poleNumber)) {
    result.checks.poleNumberFormat = {
      passed: false,
      message: `Invalid pole number format: ${data.poleNumber}`,
      severity: 'error'
    };
    result.isValid = false;
    result.errors.push('Invalid pole number format');
    result.score -= 30;
  } else {
    result.checks.poleNumberFormat = {
      passed: true,
      message: 'Pole number format is valid',
      severity: 'info'
    };
  }
  
  // 2. Check for duplicate pole numbers
  try {
    const duplicateCheck = await checkDuplicatePole(data.poleNumber);
    if (duplicateCheck.exists) {
      if (duplicateCheck.sameProject) {
        result.checks.duplicatePole = {
          passed: false,
          message: `Pole ${data.poleNumber} already exists in this project`,
          severity: 'error'
        };
        result.isValid = false;
        result.errors.push('Duplicate pole number in same project');
        result.score -= 40;
      } else {
        result.checks.duplicatePole = {
          passed: true,
          message: `Pole number exists in different project - manual review required`,
          severity: 'warning'
        };
        result.autoApprove = false;
        result.reviewReasons.push('Pole number exists in another project');
        result.warnings.push('Pole number used in different project');
        result.score -= 10;
      }
    } else {
      result.checks.duplicatePole = {
        passed: true,
        message: 'No duplicate pole number found',
        severity: 'info'
      };
    }
  } catch (error) {
    console.error('Duplicate check failed:', error);
    result.checks.duplicatePole = {
      passed: true,
      message: 'Duplicate check skipped due to error',
      severity: 'warning'
    };
  }
  
  // 3. Validate GPS coordinates
  const gpsValidation = await validateGPSLocation(data.gps, data.projectId, data.poleNumber);
  if (!gpsValidation.valid) {
    result.checks.gpsLocation = {
      passed: false,
      message: gpsValidation.message,
      severity: gpsValidation.severity as 'error' | 'warning'
    };
    
    if (gpsValidation.severity === 'error') {
      result.isValid = false;
      result.errors.push(gpsValidation.message);
      result.score -= 30;
    } else {
      result.autoApprove = false;
      result.reviewReasons.push(gpsValidation.message);
      result.warnings.push(gpsValidation.message);
      result.score -= 15;
    }
  } else {
    result.checks.gpsLocation = {
      passed: true,
      message: 'GPS location is valid',
      severity: 'info'
    };
  }
  
  // 4. Validate photos
  const photoValidation = validatePhotos(data.photos);
  if (!photoValidation.allRequired) {
    result.checks.requiredPhotos = {
      passed: false,
      message: `Missing required photos: ${photoValidation.missing.join(', ')}`,
      severity: 'error'
    };
    result.isValid = false;
    result.errors.push(`Missing ${photoValidation.missing.length} required photos`);
    result.score -= 20;
  } else {
    result.checks.requiredPhotos = {
      passed: true,
      message: 'All required photos present',
      severity: 'info'
    };
  }
  
  // 5. Validate contractor assignment
  if (data.contractorId) {
    const contractorValid = await validateContractor(data.contractorId, data.projectId);
    if (!contractorValid.valid) {
      result.checks.contractorAssignment = {
        passed: false,
        message: contractorValid.message,
        severity: 'warning'
      };
      result.autoApprove = false;
      result.reviewReasons.push(contractorValid.message);
      result.warnings.push(contractorValid.message);
      result.score -= 10;
    } else {
      result.checks.contractorAssignment = {
        passed: true,
        message: 'Contractor is assigned to project',
        severity: 'info'
      };
    }
  }
  
  // 6. Data quality score
  if (data.gps.accuracy && data.gps.accuracy > 15) {
    result.checks.gpsAccuracy = {
      passed: false,
      message: `GPS accuracy is ${data.gps.accuracy}m (>15m threshold)`,
      severity: 'warning'
    };
    result.warnings.push('Low GPS accuracy');
    result.score -= 5;
  }
  
  // Determine final status
  if (result.score < 60) {
    result.isValid = false;
  } else if (result.score < 80) {
    result.autoApprove = false;
    result.reviewReasons.push(`Low data quality score: ${result.score}`);
  }
  
  // Set priority based on score
  if (result.score >= 90) {
    result.priority = 'high';
  } else if (result.score >= 70) {
    result.priority = 'normal';
  } else {
    result.priority = 'low';
  }
  
  return result;
}

async function checkDuplicatePole(poleNumber: string): Promise<{
  exists: boolean;
  sameProject?: boolean;
  existingId?: string;
}> {
  // Check in Firebase first (recent data)
  const db = admin.firestore();
  const firebaseCheck = await db.collection('poles')
    .where('poleNumber', '==', poleNumber)
    .limit(1)
    .get();
  
  if (!firebaseCheck.empty) {
    const existing = firebaseCheck.docs[0].data();
    return {
      exists: true,
      sameProject: existing.projectId === poleNumber,
      existingId: firebaseCheck.docs[0].id
    };
  }
  
  // Check in Neon (historical data)
  try {
    const neonResult = await sql`
      SELECT id, project_id 
      FROM poles 
      WHERE pole_number = ${poleNumber}
      LIMIT 1
    `;
    
    if (neonResult.length > 0) {
      return {
        exists: true,
        sameProject: false, // Can't check without project ID
        existingId: neonResult[0].id
      };
    }
  } catch (error) {
    console.error('Neon query failed:', error);
  }
  
  return { exists: false };
}

async function validateGPSLocation(
  gps: { latitude: number; longitude: number },
  projectId: string,
  poleNumber: string
): Promise<{ valid: boolean; message: string; severity: string }> {
  try {
    // Get planned location from Neon
    const plannedLocation = await sql`
      SELECT 
        planned_latitude,
        planned_longitude,
        ST_Distance(
          ST_MakePoint(${gps.longitude}, ${gps.latitude})::geography,
          ST_MakePoint(planned_longitude, planned_latitude)::geography
        ) as distance_meters
      FROM planned_poles
      WHERE pole_number = ${poleNumber}
        AND project_id = ${projectId}
      LIMIT 1
    `;
    
    if (plannedLocation.length === 0) {
      // No planned location, just check if within project bounds
      return {
        valid: true,
        message: 'No planned location to compare',
        severity: 'info'
      };
    }
    
    const distance = plannedLocation[0].distance_meters;
    
    if (distance > MAX_GPS_DEVIATION * 2) {
      return {
        valid: false,
        message: `GPS location is ${Math.round(distance)}m from planned location (max ${MAX_GPS_DEVIATION * 2}m)`,
        severity: 'error'
      };
    } else if (distance > MAX_GPS_DEVIATION) {
      return {
        valid: true,
        message: `GPS location is ${Math.round(distance)}m from planned location - requires review`,
        severity: 'warning'
      };
    }
    
    return {
      valid: true,
      message: `GPS location is within ${Math.round(distance)}m of planned location`,
      severity: 'info'
    };
    
  } catch (error) {
    console.error('GPS validation error:', error);
    return {
      valid: true,
      message: 'GPS validation skipped due to error',
      severity: 'warning'
    };
  }
}

function validatePhotos(photos: Array<{ type: string; url: string }>): {
  allRequired: boolean;
  missing: string[];
  extra: string[];
} {
  const providedTypes = photos.map(p => p.type);
  const missing = REQUIRED_PHOTOS.filter(type => !providedTypes.includes(type));
  const extra = providedTypes.filter(type => !REQUIRED_PHOTOS.includes(type));
  
  return {
    allRequired: missing.length === 0,
    missing,
    extra
  };
}

async function validateContractor(contractorId: string, projectId: string): Promise<{
  valid: boolean;
  message: string;
}> {
  try {
    // Check if contractor is assigned to project
    const assignment = await sql`
      SELECT 1
      FROM project_contractors
      WHERE project_id = ${projectId}
        AND contractor_id = ${contractorId}
        AND status = 'active'
      LIMIT 1
    `;
    
    if (assignment.length === 0) {
      return {
        valid: false,
        message: 'Contractor not assigned to this project'
      };
    }
    
    return {
      valid: true,
      message: 'Contractor is assigned to project'
    };
    
  } catch (error) {
    console.error('Contractor validation error:', error);
    return {
      valid: true,
      message: 'Contractor validation skipped'
    };
  }
}