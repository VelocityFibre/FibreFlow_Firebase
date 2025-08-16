import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { 
  PoleImportData, 
  DropImportData, 
  FibreImportData 
} from '../models/sow-import.model';
import { SOWData } from '../models/sow.model';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: 'critical' | 'error' | 'warning';
  field: string;
  message: string;
  row?: number;
  data?: any;
}

export interface ValidationWarning {
  type: 'warning' | 'info';
  field: string;
  message: string;
  row?: number;
  data?: any;
}

export interface ValidationSummary {
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  warningRecords: number;
  criticalErrors: number;
  duplicateRecords: number;
}

@Injectable({
  providedIn: 'root'
})
export class SOWValidationService {

  /**
   * Comprehensive validation of SOW import data
   */
  validateImportData(data: {
    poles: PoleImportData[];
    drops: DropImportData[];
    fibre: FibreImportData[];
  }): Observable<ValidationResult> {
    
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        totalRecords: data.poles.length + data.drops.length + data.fibre.length,
        validRecords: 0,
        errorRecords: 0,
        warningRecords: 0,
        criticalErrors: 0,
        duplicateRecords: 0
      }
    };

    // Validate poles
    this.validatePoles(data.poles, result);
    
    // Validate drops
    this.validateDrops(data.drops, result);
    
    // Validate fibre data
    this.validateFibre(data.fibre, result);
    
    // Cross-validation between data types
    this.validateRelationships(data, result);
    
    // Calculate final summary
    this.calculateSummary(result);
    
    // Log validation results for debugging
    console.log('Validation Result:', {
      isValid: result.isValid,
      totalErrors: result.errors.length,
      totalWarnings: result.warnings.length,
      criticalErrors: result.summary.criticalErrors,
      errors: result.errors.slice(0, 5), // First 5 errors
      warnings: result.warnings.slice(0, 5) // First 5 warnings
    });
    
    return of(result);
  }

  private validatePoles(poles: PoleImportData[], result: ValidationResult): void {
    const poleNumbers = new Set<string>();
    
    poles.forEach((pole, index) => {
      const rowNumber = index + 2; // Account for header row
      
      // Required field validation
      if (!pole.label_1 || pole.label_1.trim() === '') {
        result.errors.push({
          type: 'critical',
          field: 'label_1',
          message: 'Pole number is required',
          row: rowNumber,
          data: pole
        });
      }
      
      // Pole number format validation
      if (pole.label_1 && !this.isValidPoleNumber(pole.label_1)) {
        result.errors.push({
          type: 'error',
          field: 'label_1',
          message: 'Invalid pole number format. Expected format: XXX.P.XXXX',
          row: rowNumber,
          data: pole
        });
      }
      
      // Duplicate pole number check
      if (pole.label_1) {
        if (poleNumbers.has(pole.label_1)) {
          result.errors.push({
            type: 'critical',
            field: 'label_1',
            message: `Duplicate pole number: ${pole.label_1}`,
            row: rowNumber,
            data: pole
          });
          result.summary.duplicateRecords++;
        } else {
          poleNumbers.add(pole.label_1);
        }
      }
      
      // GPS coordinates validation
      if (pole.latitude === 0 || pole.longitude === 0) {
        result.warnings.push({
          type: 'warning',
          field: 'coordinates',
          message: 'GPS coordinates are missing or zero',
          row: rowNumber,
          data: pole
        });
      }
      
      if (pole.latitude && (pole.latitude < -90 || pole.latitude > 90)) {
        result.errors.push({
          type: 'error',
          field: 'latitude',
          message: 'Latitude must be between -90 and 90',
          row: rowNumber,
          data: pole
        });
      }
      
      if (pole.longitude && (pole.longitude < -180 || pole.longitude > 180)) {
        result.errors.push({
          type: 'error',
          field: 'longitude',
          message: 'Longitude must be between -180 and 180',
          row: rowNumber,
          data: pole
        });
      }
      
      // Status validation
      if (pole.status && !this.isValidPoleStatus(pole.status)) {
        result.warnings.push({
          type: 'warning',
          field: 'status',
          message: `Unknown pole status: ${pole.status}`,
          row: rowNumber,
          data: pole
        });
      }
    });
  }

  private validateDrops(drops: DropImportData[], result: ValidationResult): void {
    const dropNumbers = new Set<string>();
    
    drops.forEach((drop, index) => {
      const rowNumber = index + 2; // Account for header row
      
      // Required field validation
      if (!drop.drop_number || drop.drop_number.trim() === '') {
        result.errors.push({
          type: 'critical',
          field: 'drop_number',
          message: 'Drop number is required',
          row: rowNumber,
          data: drop
        });
      }
      
      // Duplicate drop number check
      if (drop.drop_number) {
        if (dropNumbers.has(drop.drop_number)) {
          result.errors.push({
            type: 'critical',
            field: 'drop_number',
            message: `Duplicate drop number: ${drop.drop_number}`,
            row: rowNumber,
            data: drop
          });
          result.summary.duplicateRecords++;
        } else {
          dropNumbers.add(drop.drop_number);
        }
      }
      
      // Pole reference validation
      if (!drop.pole_number || drop.pole_number.trim() === '') {
        result.warnings.push({
          type: 'warning',
          field: 'pole_number',
          message: 'Drop is not assigned to a pole',
          row: rowNumber,
          data: drop
        });
      }
      
      // Address validation
      if (!drop.address || drop.address.trim() === '') {
        result.warnings.push({
          type: 'warning',
          field: 'address',
          message: 'Address is missing',
          row: rowNumber,
          data: drop
        });
      }
      
      // Distance validation
      if (drop.distance_to_pole && drop.distance_to_pole > 200) {
        result.warnings.push({
          type: 'warning',
          field: 'distance_to_pole',
          message: `Distance to pole is very high: ${drop.distance_to_pole}m`,
          row: rowNumber,
          data: drop
        });
      }
      
      // Status validation
      if (drop.status && !this.isValidDropStatus(drop.status)) {
        result.warnings.push({
          type: 'warning',
          field: 'status',
          message: `Unknown drop status: ${drop.status}`,
          row: rowNumber,
          data: drop
        });
      }
    });
  }

  private validateFibre(fibre: FibreImportData[], result: ValidationResult): void {
    fibre.forEach((segment, index) => {
      const rowNumber = index + 2;
      
      // Required fields
      if (!segment.from_point || segment.from_point.trim() === '') {
        result.errors.push({
          type: 'error',
          field: 'from_point',
          message: 'From point is required',
          row: rowNumber,
          data: segment
        });
      }
      
      if (!segment.to_point || segment.to_point.trim() === '') {
        result.errors.push({
          type: 'error',
          field: 'to_point',
          message: 'To point is required',
          row: rowNumber,
          data: segment
        });
      }
      
      // Distance validation
      if (segment.distance <= 0) {
        result.errors.push({
          type: 'error',
          field: 'distance',
          message: 'Distance must be greater than 0',
          row: rowNumber,
          data: segment
        });
      }
      
      if (segment.distance > 10000) {
        result.warnings.push({
          type: 'warning',
          field: 'distance',
          message: `Very long fibre segment: ${segment.distance}m`,
          row: rowNumber,
          data: segment
        });
      }
      
      // Fibre type validation
      if (segment.fibre_type && !this.isValidFibreType(segment.fibre_type)) {
        result.warnings.push({
          type: 'warning',
          field: 'fibre_type',
          message: `Unknown fibre type: ${segment.fibre_type}`,
          row: rowNumber,
          data: segment
        });
      }
    });
  }

  private validateRelationships(data: {
    poles: PoleImportData[];
    drops: DropImportData[];
    fibre: FibreImportData[];
  }, result: ValidationResult): void {
    
    const poleNumbers = new Set(data.poles.map(p => p.label_1));
    
    // Check if drops reference existing poles
    data.drops.forEach((drop, index) => {
      if (drop.pole_number && !poleNumbers.has(drop.pole_number)) {
        result.warnings.push({
          type: 'warning',
          field: 'pole_number',
          message: `Drop references unknown pole: ${drop.pole_number}`,
          row: index + 2,
          data: drop
        });
      }
    });
    
    // Check pole capacity (max 12 drops per pole)
    const dropsPerPole = new Map<string, number>();
    data.drops.forEach(drop => {
      if (drop.pole_number) {
        dropsPerPole.set(drop.pole_number, (dropsPerPole.get(drop.pole_number) || 0) + 1);
      }
    });
    
    dropsPerPole.forEach((count, poleNumber) => {
      if (count > 12) {
        result.errors.push({
          type: 'error',
          field: 'pole_capacity',
          message: `Pole ${poleNumber} has ${count} drops (max 12 allowed)`,
          data: { poleNumber, dropCount: count }
        });
      }
    });
  }

  private calculateSummary(result: ValidationResult): void {
    result.summary.criticalErrors = result.errors.filter(e => e.type === 'critical').length;
    result.summary.errorRecords = result.errors.length;
    result.summary.warningRecords = result.warnings.length;
    result.summary.validRecords = result.summary.totalRecords - result.summary.errorRecords;
    
    // Consider warnings as errors if they are significant (like no poles)
    const hasCriticalWarnings = result.warnings.some(w => 
      w.message.includes('Drop references unknown pole') || 
      w.message.includes('not assigned to a pole')
    );
    
    result.isValid = result.summary.criticalErrors === 0 && result.summary.errorRecords === 0 && !hasCriticalWarnings;
  }

  // Helper validation methods
  private isValidPoleNumber(poleNumber: string): boolean {
    // Format: XXX.P.XXXX (e.g., LAW.P.B001)
    const poleRegex = /^[A-Z]{2,4}\.P\.[A-Z][0-9]{3,4}$/;
    return poleRegex.test(poleNumber);
  }

  private isValidPoleStatus(status: string): boolean {
    const validStatuses = [
      'Pole Permission: Approved',
      'Pole Permission: Pending',
      'Pole Permission: Rejected',
      'Pole Installation: Complete',
      'Pole Installation: In Progress',
      'Pole Installation: Scheduled'
    ];
    return validStatuses.includes(status);
  }

  private isValidDropStatus(status: string): boolean {
    const validStatuses = [
      'Home Sign Ups: Approved & Installation Scheduled',
      'Home Sign Ups: Declined',
      'Home Installation: In Progress',
      'Home Installation: Installed',
      'Home Installation: Cancelled'
    ];
    return validStatuses.includes(status);
  }

  private isValidFibreType(fibreType: string): boolean {
    const validTypes = [
      '96 Core',
      '48 Core',
      '24 Core',
      '12 Core',
      '6 Core',
      'Single Mode',
      'Multi Mode'
    ];
    return validTypes.some(type => fibreType.includes(type));
  }

  /**
   * Validate individual SOW data before saving
   */
  validateSOWData(sowData: SOWData): Observable<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        totalRecords: 1,
        validRecords: 0,
        errorRecords: 0,
        warningRecords: 0,
        criticalErrors: 0,
        duplicateRecords: 0
      }
    };

    // Project ID validation
    if (!sowData.projectId || sowData.projectId.trim() === '') {
      result.errors.push({
        type: 'critical',
        field: 'projectId',
        message: 'Project ID is required'
      });
    }

    // Version validation
    if (sowData.version < 1) {
      result.errors.push({
        type: 'error',
        field: 'version',
        message: 'Version must be greater than 0'
      });
    }

    // Data completeness check
    if (!sowData.poles || sowData.poles.length === 0) {
      result.warnings.push({
        type: 'warning',
        field: 'poles',
        message: 'No pole data provided'
      });
    }

    this.calculateSummary(result);
    return of(result);
  }
}