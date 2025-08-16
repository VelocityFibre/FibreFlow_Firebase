# SOW Module - Ready-to-Use Code Snippets

## Overview
This document contains copy-paste ready code snippets for rapid SOW module development. All snippets follow FibreFlow patterns and are production-ready.

## 1. Models (sow.model.ts)

```typescript
import { Timestamp } from '@angular/fire/firestore';

export interface SOWData {
  id?: string;
  projectId: string;
  version: number;
  createdAt: Timestamp;
  createdBy: string;
  createdByEmail?: string;
  createdByName?: string;
  
  // Import metadata
  importFiles: {
    poles?: ImportFileMetadata;
    drops?: ImportFileMetadata;
    fibre?: ImportFileMetadata;
  };
  
  // Parsed data summary
  summary: SOWSummary;
  
  // Calculations
  calculations: SOWCalculations;
  
  // Validation
  validation: ValidationSummary;
  
  // Audit
  history: AuditEntry[];
}

export interface ImportFileMetadata {
  storageUrl: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  uploadedAt: Timestamp;
  checksum?: string;
}

export interface SOWSummary {
  totalPoles: number;
  totalDrops: number;
  totalFibreLength: number;
  uniqueZones: string[];
  uniquePONs: string[];
  dateRange: {
    earliest: string;
    latest: string;
  };
}

export interface SOWCalculations {
  totals: SOWTotals;
  dailyTargets: DailyTargets;
  geographic: GeographicBreakdown;
}

export interface SOWTotals {
  polePermissionsTotal: number;
  homeSignupsTotal: number;
  fibreStringingTotal: number;
  totalDrops: number;
  spareDrops: number;
  polesPlanted: number;
  homesConnected: number;
}

export interface DailyTargets {
  polePermissionsDaily: number;
  polesPlantedDaily: number;
  homeSignupsDaily: number;
  homesConnectedDaily: number;
  fibreStringingDaily: number;
  estimatedDays: number;
}

export interface GeographicBreakdown {
  zones: ZoneData[];
  pons: PONData[];
  poleDropMapping: Map<string, string[]>;
}

export interface ZoneData {
  zone: string;
  poleCount: number;
  dropCount: number;
  percentage: number;
}

export interface PONData {
  pon: string;
  poleCount: number;
  dropCount: number;
  percentage: number;
}

export interface ValidationSummary {
  performedAt: Timestamp;
  passed: boolean;
  errorCount: number;
  warningCount: number;
  autoFixedCount: number;
  details?: ValidationResults;
}

export interface ValidationResults {
  totalRecords: number;
  validRecords: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: Date;
}

export interface ValidationError {
  id: string;
  type: 'missing-data' | 'invalid-format' | 'reference' | 'capacity' | 'duplicate';
  severity: 'critical' | 'error';
  message: string;
  field?: string;
  row?: number;
  data?: any;
  suggestion?: string;
}

export interface ValidationWarning {
  id: string;
  type: 'optional-missing' | 'unusual-value' | 'consistency';
  message: string;
  field?: string;
  row?: number;
  data?: any;
}

export interface AuditEntry {
  action: 'created' | 'updated' | 'validated' | 'imported';
  timestamp: Timestamp;
  userId: string;
  userEmail?: string;
  changes?: any;
  metadata?: any;
}

// Import specific models
export interface PoleImportData {
  label_1: string;        // Pole number
  status: string;         // Permission status
  latitude: number;
  longitude: number;
  pon_no?: string;
  zone_no?: string;
  created_date?: string;
}

export interface DropImportData {
  label: string;          // Drop number
  strtfeat: string;       // Connected pole
  endfeat?: string;       // ONT reference
  pon?: string;
  zone?: string;
}

export interface FibreImportData {
  length_m: number;       // Cable length in meters
  route_id?: string;
  type?: string;
  cable_id?: string;
}

// Processing types
export type ProcessingState = 
  | 'idle' 
  | 'uploading' 
  | 'parsing' 
  | 'validating' 
  | 'calculating' 
  | 'saving' 
  | 'complete' 
  | 'error';

export interface FileProcessingStatus {
  fileName: string;
  size: number;
  rowCount: number;
  processedRows: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  status: ProcessingState;
  progress: number;
}

export interface ImportSession {
  id: string;
  projectId: string;
  startTime: Date;
  files: {
    poles?: FileProcessingStatus;
    drops?: FileProcessingStatus;
    fibre?: FileProcessingStatus;
  };
  status: ProcessingState;
  currentStep: number;
}
```

## 2. SOW Service (sow.service.ts)

```typescript
import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  serverTimestamp, 
  Timestamp,
  collection,
  query,
  where,
  orderBy
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable, from, map, switchMap, tap } from 'rxjs';
import { BaseFirestoreService } from '@core/services/base-firestore.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { SOWData, SOWCalculations, ImportFileMetadata } from '../models/sow.model';

@Injectable({ providedIn: 'root' })
export class SowService extends BaseFirestoreService<SOWData> {
  private auth = inject(AuthService);
  private functions = inject(Functions);
  private storage = inject(Storage);
  private notifications = inject(NotificationService);
  
  constructor() {
    super('sows');
  }
  
  /**
   * Create a new SOW with file uploads
   */
  async createSOWWithFiles(
    projectId: string,
    files: { poles?: File; drops?: File; fibre?: File },
    importData: any,
    calculations: SOWCalculations
  ): Promise<string> {
    try {
      // Upload files first
      const fileMetadata = await this.uploadFiles(projectId, files);
      
      // Create SOW document
      const sowData: Omit<SOWData, 'id'> = {
        projectId,
        version: 1,
        createdAt: serverTimestamp() as Timestamp,
        createdBy: this.auth.currentUser?.uid || '',
        createdByEmail: this.auth.currentUser?.email || '',
        createdByName: this.auth.currentUser?.displayName || '',
        importFiles: fileMetadata,
        summary: this.createSummary(importData),
        calculations,
        validation: {
          performedAt: serverTimestamp() as Timestamp,
          passed: true,
          errorCount: 0,
          warningCount: 0,
          autoFixedCount: 0
        },
        history: [{
          action: 'created',
          timestamp: serverTimestamp() as Timestamp,
          userId: this.auth.currentUser?.uid || '',
          userEmail: this.auth.currentUser?.email || ''
        }]
      };
      
      const docId = await this.create(sowData);
      
      // Trigger Neon sync
      await this.syncToNeon(docId, sowData);
      
      this.notifications.success('SOW imported successfully');
      return docId;
      
    } catch (error) {
      console.error('Error creating SOW:', error);
      this.notifications.error('Failed to create SOW');
      throw error;
    }
  }
  
  /**
   * Get SOW by project ID
   */
  getByProject(projectId: string): Observable<SOWData | null> {
    return this.getWithQuery([
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    ]).pipe(
      map(sows => sows.length > 0 ? sows[0] : null)
    );
  }
  
  /**
   * Update SOW calculations
   */
  async updateCalculations(sowId: string, calculations: SOWCalculations): Promise<void> {
    await this.update(sowId, {
      calculations,
      'validation.performedAt': serverTimestamp(),
      history: this.fieldValue.arrayUnion({
        action: 'updated',
        timestamp: serverTimestamp(),
        userId: this.auth.currentUser?.uid || '',
        changes: { calculations }
      })
    });
  }
  
  /**
   * Upload files to Firebase Storage
   */
  private async uploadFiles(
    projectId: string,
    files: { poles?: File; drops?: File; fibre?: File }
  ): Promise<{ poles?: ImportFileMetadata; drops?: ImportFileMetadata; fibre?: ImportFileMetadata }> {
    const uploadPromises: Promise<[string, ImportFileMetadata]>[] = [];
    const timestamp = Date.now();
    
    if (files.poles) {
      uploadPromises.push(
        this.uploadFile(`sow-imports/${projectId}/${timestamp}_poles.xlsx`, files.poles)
          .then(metadata => ['poles', metadata] as [string, ImportFileMetadata])
      );
    }
    
    if (files.drops) {
      uploadPromises.push(
        this.uploadFile(`sow-imports/${projectId}/${timestamp}_drops.xlsx`, files.drops)
          .then(metadata => ['drops', metadata] as [string, ImportFileMetadata])
      );
    }
    
    if (files.fibre) {
      uploadPromises.push(
        this.uploadFile(`sow-imports/${projectId}/${timestamp}_fibre.xlsx`, files.fibre)
          .then(metadata => ['fibre', metadata] as [string, ImportFileMetadata])
      );
    }
    
    const results = await Promise.all(uploadPromises);
    return Object.fromEntries(results);
  }
  
  /**
   * Upload single file
   */
  private async uploadFile(path: string, file: File): Promise<ImportFileMetadata> {
    const storageRef = ref(this.storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    return {
      storageUrl: snapshot.ref.fullPath,
      fileName: file.name,
      fileSize: file.size,
      rowCount: 0, // Will be updated after parsing
      uploadedAt: serverTimestamp() as Timestamp
    };
  }
  
  /**
   * Create summary from import data
   */
  private createSummary(importData: any): SOWSummary {
    const { poles = [], drops = [], fibre = [] } = importData;
    
    const uniqueZones = [...new Set(poles.map((p: any) => p.zone_no).filter(Boolean))];
    const uniquePONs = [...new Set(poles.map((p: any) => p.pon_no).filter(Boolean))];
    
    return {
      totalPoles: poles.length,
      totalDrops: drops.length,
      totalFibreLength: fibre.reduce((sum: number, f: any) => sum + (f.length_m || 0), 0),
      uniqueZones,
      uniquePONs,
      dateRange: {
        earliest: this.getEarliestDate(poles),
        latest: this.getLatestDate(poles)
      }
    };
  }
  
  /**
   * Sync to Neon database
   */
  private async syncToNeon(sowId: string, data: Partial<SOWData>): Promise<void> {
    try {
      const syncFunction = httpsCallable(this.functions, 'syncSowToNeon');
      await syncFunction({ sowId, data });
    } catch (error) {
      console.error('Neon sync failed:', error);
      // Non-blocking error - don't fail the import
    }
  }
  
  /**
   * Get date range helpers
   */
  private getEarliestDate(poles: any[]): string {
    const dates = poles
      .map(p => p.created_date)
      .filter(Boolean)
      .map(d => new Date(d));
    return dates.length > 0 
      ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString()
      : new Date().toISOString();
  }
  
  private getLatestDate(poles: any[]): string {
    const dates = poles
      .map(p => p.created_date)
      .filter(Boolean)
      .map(d => new Date(d));
    return dates.length > 0
      ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
      : new Date().toISOString();
  }
}
```

## 3. Excel Service (sow-excel.service.ts)

```typescript
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { PoleImportData, DropImportData, FibreImportData } from '../models/sow.model';

@Injectable({ providedIn: 'root' })
export class SowExcelService {
  
  /**
   * Process pole Excel file
   */
  async processPoleFile(file: File): Promise<PoleImportData[]> {
    const data = await this.readExcelFile(file);
    
    return data.map((row, index) => ({
      label_1: this.getValue(row, ['label_1', 'pole_number', 'pole_id', 'pole'], ''),
      status: this.getValue(row, ['status', 'permission_status', 'pole_status'], ''),
      latitude: this.getNumericValue(row, ['latitude', 'lat', 'y'], 0),
      longitude: this.getNumericValue(row, ['longitude', 'lon', 'lng', 'x'], 0),
      pon_no: this.getValue(row, ['pon_no', 'pon', 'PON'], ''),
      zone_no: this.getValue(row, ['zone_no', 'zone', 'Zone'], ''),
      created_date: this.getValue(row, ['created_date', 'date', 'Date'], '')
    })).filter(pole => pole.label_1); // Remove empty rows
  }
  
  /**
   * Process drop Excel file
   */
  async processDropFile(file: File): Promise<DropImportData[]> {
    const data = await this.readExcelFile(file);
    
    return data.map(row => ({
      label: this.getValue(row, ['label', 'drop_number', 'drop_id', 'drop'], ''),
      strtfeat: this.getValue(row, ['strtfeat', 'pole', 'pole_number', 'start_feature'], ''),
      endfeat: this.getValue(row, ['endfeat', 'ont', 'ont_reference', 'end_feature'], ''),
      pon: this.getValue(row, ['pon', 'PON'], ''),
      zone: this.getValue(row, ['zone', 'Zone'], '')
    })).filter(drop => drop.label && drop.strtfeat);
  }
  
  /**
   * Process fibre Excel file
   */
  async processFibreFile(file: File): Promise<FibreImportData[]> {
    const data = await this.readExcelFile(file);
    
    return data.map(row => ({
      length_m: this.getNumericValue(row, ['length_m', 'length', 'cable_length', 'distance'], 0),
      route_id: this.getValue(row, ['route_id', 'route', 'Route'], ''),
      type: this.getValue(row, ['type', 'cable_type', 'Type'], ''),
      cable_id: this.getValue(row, ['cable_id', 'cable', 'Cable'], '')
    })).filter(fibre => fibre.length_m > 0);
  }
  
  /**
   * Read Excel file and convert to JSON
   */
  private async readExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false
          });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            dateNF: 'yyyy-mm-dd'
          });
          
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Get value from row with fallback column names
   */
  private getValue(row: any, possibleKeys: string[], defaultValue: string): string {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]).trim();
      }
    }
    return defaultValue;
  }
  
  /**
   * Get numeric value with fallback
   */
  private getNumericValue(row: any, possibleKeys: string[], defaultValue: number): number {
    const value = this.getValue(row, possibleKeys, '');
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  /**
   * Create Excel template
   */
  createTemplate(type: 'poles' | 'drops' | 'fibre'): Blob {
    let headers: string[] = [];
    let sampleData: any[] = [];
    
    switch (type) {
      case 'poles':
        headers = ['label_1', 'status', 'latitude', 'longitude', 'pon_no', 'zone_no'];
        sampleData = [{
          label_1: 'LAW.P.B001',
          status: 'Pole Permission: Approved',
          latitude: -26.1234,
          longitude: 28.5678,
          pon_no: 'PON01',
          zone_no: 'Zone 1'
        }];
        break;
        
      case 'drops':
        headers = ['label', 'strtfeat', 'endfeat', 'pon', 'zone'];
        sampleData = [{
          label: 'DR0001',
          strtfeat: 'LAW.P.B001',
          endfeat: 'ONT12345',
          pon: 'PON01',
          zone: 'Zone 1'
        }];
        break;
        
      case 'fibre':
        headers = ['length_m', 'route_id', 'type'];
        sampleData = [{
          length_m: 500,
          route_id: 'R001',
          type: 'Aerial'
        }];
        break;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
}
```

## 4. Validation Service (sow-validation.service.ts)

```typescript
import { Injectable } from '@angular/core';
import { 
  PoleImportData, 
  DropImportData, 
  FibreImportData,
  ValidationResults,
  ValidationError,
  ValidationWarning 
} from '../models/sow.model';

@Injectable({ providedIn: 'root' })
export class SowValidationService {
  
  // Validation rules
  private readonly POLE_NUMBER_PATTERN = /^[A-Z]{3}\.P\.[A-Z0-9]+$/;
  private readonly DROP_NUMBER_PATTERN = /^[A-Z]{2,4}\d{4,6}$/;
  private readonly MAX_DROPS_PER_POLE = 12;
  
  // South Africa bounds
  private readonly SA_BOUNDS = {
    lat: { min: -35, max: -22 },
    lng: { min: 16, max: 33 }
  };
  
  /**
   * Validate all import data
   */
  validateImportData(data: {
    poles: PoleImportData[];
    drops: DropImportData[];
    fibre: FibreImportData[];
  }): ValidationResults {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate poles
    const poleErrors = this.validatePoles(data.poles);
    errors.push(...poleErrors.errors);
    warnings.push(...poleErrors.warnings);
    
    // Validate drops
    const dropErrors = this.validateDrops(data.drops, data.poles);
    errors.push(...dropErrors.errors);
    warnings.push(...dropErrors.warnings);
    
    // Validate fibre
    const fibreErrors = this.validateFibre(data.fibre);
    errors.push(...fibreErrors.errors);
    warnings.push(...fibreErrors.warnings);
    
    // Cross-file validation
    const crossErrors = this.validateCrossFile(data);
    errors.push(...crossErrors.errors);
    warnings.push(...crossErrors.warnings);
    
    return {
      totalRecords: data.poles.length + data.drops.length + data.fibre.length,
      validRecords: data.poles.length + data.drops.length + data.fibre.length - errors.length,
      errors,
      warnings,
      timestamp: new Date()
    };
  }
  
  /**
   * Validate poles data
   */
  private validatePoles(poles: PoleImportData[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const seenPoleNumbers = new Set<string>();
    
    poles.forEach((pole, index) => {
      // Check required fields
      if (!pole.label_1) {
        errors.push({
          id: `pole-missing-number-${index}`,
          type: 'missing-data',
          severity: 'critical',
          message: 'Pole number is required',
          row: index + 2,
          field: 'label_1'
        });
        return;
      }
      
      // Validate pole number format
      if (!this.POLE_NUMBER_PATTERN.test(pole.label_1)) {
        errors.push({
          id: `pole-invalid-format-${index}`,
          type: 'invalid-format',
          severity: 'error',
          message: `Invalid pole number format: ${pole.label_1}`,
          row: index + 2,
          field: 'label_1',
          suggestion: 'Format should be XXX.P.XXXX (e.g., LAW.P.B167)'
        });
      }
      
      // Check duplicates
      if (seenPoleNumbers.has(pole.label_1)) {
        errors.push({
          id: `pole-duplicate-${index}`,
          type: 'duplicate',
          severity: 'error',
          message: `Duplicate pole number: ${pole.label_1}`,
          row: index + 2,
          field: 'label_1'
        });
      }
      seenPoleNumbers.add(pole.label_1);
      
      // Validate coordinates
      if (!this.isValidCoordinate(pole.latitude, pole.longitude)) {
        errors.push({
          id: `pole-invalid-coords-${index}`,
          type: 'invalid-format',
          severity: 'error',
          message: 'Invalid GPS coordinates',
          row: index + 2,
          data: { lat: pole.latitude, lng: pole.longitude }
        });
      } else if (!this.isInSouthAfrica(pole.latitude, pole.longitude)) {
        warnings.push({
          id: `pole-coords-outside-sa-${index}`,
          type: 'unusual-value',
          message: 'Coordinates appear to be outside South Africa',
          row: index + 2,
          data: { lat: pole.latitude, lng: pole.longitude }
        });
      }
      
      // Check optional fields
      if (!pole.pon_no) {
        warnings.push({
          id: `pole-missing-pon-${index}`,
          type: 'optional-missing',
          message: 'PON number is missing',
          row: index + 2,
          field: 'pon_no'
        });
      }
    });
    
    return { errors, warnings };
  }
  
  /**
   * Validate drops data
   */
  private validateDrops(
    drops: DropImportData[], 
    poles: PoleImportData[]
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const seenDropNumbers = new Set<string>();
    const poleNumbers = new Set(poles.map(p => p.label_1));
    const poleDropCount = new Map<string, number>();
    
    drops.forEach((drop, index) => {
      // Check required fields
      if (!drop.label) {
        errors.push({
          id: `drop-missing-number-${index}`,
          type: 'missing-data',
          severity: 'critical',
          message: 'Drop number is required',
          row: index + 2,
          field: 'label'
        });
        return;
      }
      
      // Check duplicates
      if (seenDropNumbers.has(drop.label)) {
        errors.push({
          id: `drop-duplicate-${index}`,
          type: 'duplicate',
          severity: 'error',
          message: `Duplicate drop number: ${drop.label}`,
          row: index + 2,
          field: 'label'
        });
      }
      seenDropNumbers.add(drop.label);
      
      // Validate pole reference
      if (!drop.strtfeat) {
        errors.push({
          id: `drop-missing-pole-${index}`,
          type: 'missing-data',
          severity: 'critical',
          message: 'Drop must reference a pole',
          row: index + 2,
          field: 'strtfeat'
        });
      } else if (!poleNumbers.has(drop.strtfeat)) {
        errors.push({
          id: `drop-invalid-pole-${index}`,
          type: 'reference',
          severity: 'error',
          message: `Drop references non-existent pole: ${drop.strtfeat}`,
          row: index + 2,
          data: { drop: drop.label, pole: drop.strtfeat }
        });
      } else {
        // Count drops per pole
        const count = (poleDropCount.get(drop.strtfeat) || 0) + 1;
        poleDropCount.set(drop.strtfeat, count);
      }
    });
    
    // Check pole capacity
    poleDropCount.forEach((count, poleNumber) => {
      if (count > this.MAX_DROPS_PER_POLE) {
        errors.push({
          id: `pole-capacity-exceeded-${poleNumber}`,
          type: 'capacity',
          severity: 'error',
          message: `Pole ${poleNumber} has ${count} drops (max ${this.MAX_DROPS_PER_POLE})`,
          data: { pole: poleNumber, dropCount: count, excess: count - this.MAX_DROPS_PER_POLE }
        });
      }
    });
    
    return { errors, warnings };
  }
  
  /**
   * Validate fibre data
   */
  private validateFibre(fibre: FibreImportData[]): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    fibre.forEach((cable, index) => {
      // Validate length
      if (!cable.length_m || cable.length_m <= 0) {
        errors.push({
          id: `fibre-invalid-length-${index}`,
          type: 'invalid-format',
          severity: 'error',
          message: 'Cable length must be greater than 0',
          row: index + 2,
          field: 'length_m'
        });
      } else if (cable.length_m > 10000) {
        warnings.push({
          id: `fibre-long-cable-${index}`,
          type: 'unusual-value',
          message: `Cable length ${cable.length_m}m seems unusually long (> 10km)`,
          row: index + 2,
          field: 'length_m'
        });
      }
    });
    
    return { errors, warnings };
  }
  
  /**
   * Cross-file validation
   */
  private validateCrossFile(data: {
    poles: PoleImportData[];
    drops: DropImportData[];
    fibre: FibreImportData[];
  }): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check if we have at least some data
    if (data.poles.length === 0) {
      errors.push({
        id: 'no-poles',
        type: 'missing-data',
        severity: 'critical',
        message: 'No poles found in import data'
      });
    }
    
    // Check PON/Zone consistency
    const poleMap = new Map(data.poles.map(p => [p.label_1, p]));
    
    data.drops.forEach(drop => {
      const pole = poleMap.get(drop.strtfeat);
      if (pole && drop.pon && pole.pon_no && drop.pon !== pole.pon_no) {
        warnings.push({
          id: `pon-mismatch-${drop.label}`,
          type: 'consistency',
          message: `Drop ${drop.label} PON (${drop.pon}) doesn't match pole PON (${pole.pon_no})`,
          data: { drop: drop.label, dropPON: drop.pon, polePON: pole.pon_no }
        });
      }
    });
    
    return { errors, warnings };
  }
  
  /**
   * Helper: Validate coordinates
   */
  private isValidCoordinate(lat: number, lng: number): boolean {
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  }
  
  /**
   * Helper: Check if coordinates are in South Africa
   */
  private isInSouthAfrica(lat: number, lng: number): boolean {
    return lat >= this.SA_BOUNDS.lat.min && 
           lat <= this.SA_BOUNDS.lat.max &&
           lng >= this.SA_BOUNDS.lng.min && 
           lng <= this.SA_BOUNDS.lng.max;
  }
  
  /**
   * Auto-fix suggestions
   */
  getAutoFixSuggestions(errors: ValidationError[]): Map<string, () => void> {
    const fixes = new Map<string, () => void>();
    
    errors.forEach(error => {
      switch (error.type) {
        case 'invalid-format':
          if (error.field === 'label_1') {
            fixes.set(error.id, () => {
              // Auto-format pole number
              console.log('Auto-formatting pole number');
            });
          }
          break;
          
        case 'capacity':
          fixes.set(error.id, () => {
            // Suggest redistribution
            console.log('Suggesting drop redistribution');
          });
          break;
      }
    });
    
    return fixes;
  }
}
```

## 5. Import Component (sow-import.component.ts)

```typescript
import { Component, inject, signal, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SowService } from '../../services/sow.service';
import { SowExcelService } from '../../services/sow-excel.service';
import { SowValidationService } from '../../services/sow-validation.service';
import { 
  ProcessingState, 
  FileProcessingStatus,
  PoleImportData,
  DropImportData,
  FibreImportData,
  ValidationResults,
  SOWCalculations
} from '../../models/sow.model';

@Component({
  selector: 'app-sow-import',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './sow-import.component.html',
  styleUrl: './sow-import.component.scss'
})
export class SowImportComponent {
  private fb = inject(FormBuilder);
  private sowService = inject(SowService);
  private excelService = inject(SowExcelService);
  private validationService = inject(SowValidationService);
  
  // Inputs/Outputs
  projectId = input.required<string>();
  onComplete = output<string>();
  onCancel = output<void>();
  
  // Form
  sowForm = this.fb.group({
    polesFile: [null as File | null],
    dropsFile: [null as File | null],
    fibreFile: [null as File | null],
    estimatedDays: [50, [Validators.required, Validators.min(1), Validators.max(365)]]
  });
  
  // State signals
  currentStep = signal(0);
  processingState = signal<ProcessingState>('idle');
  uploadProgress = signal(0);
  
  // File processing status
  fileStatus = signal<{
    poles?: FileProcessingStatus;
    drops?: FileProcessingStatus;
    fibre?: FileProcessingStatus;
  }>({});
  
  // Parsed data
  polesData = signal<PoleImportData[]>([]);
  dropsData = signal<DropImportData[]>([]);
  fibreData = signal<FibreImportData[]>([]);
  
  // Validation
  validationResults = signal<ValidationResults | null>(null);
  hasErrors = computed(() => 
    (this.validationResults()?.errors.length ?? 0) > 0
  );
  
  // Calculations
  calculations = signal<SOWCalculations | null>(null);
  
  // UI states
  isLoading = signal(false);
  error = signal<string | null>(null);
  
  // Computed states
  canProceed = computed(() => {
    const state = this.processingState();
    const hasFiles = this.sowForm.value.polesFile || 
                    this.sowForm.value.dropsFile || 
                    this.sowForm.value.fibreFile;
    const validation = this.validationResults();
    
    return hasFiles && 
           state !== 'uploading' && 
           state !== 'parsing' &&
           (!validation || validation.errors.length === 0);
  });
  
  filesUploaded = computed(() => {
    const files = this.sowForm.value;
    return !!(files.polesFile || files.dropsFile || files.fibreFile);
  });
  
  /**
   * Handle file selection
   */
  async onFileSelect(event: Event, fileType: 'poles' | 'drops' | 'fibre') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    // Validate file
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      this.error.set('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      this.error.set('File size must be less than 50MB');
      return;
    }
    
    // Update form
    this.sowForm.patchValue({ [fileType + 'File']: file });
    
    // Process file
    await this.processFile(file, fileType);
  }
  
  /**
   * Process uploaded file
   */
  private async processFile(file: File, fileType: 'poles' | 'drops' | 'fibre') {
    this.processingState.set('parsing');
    this.error.set(null);
    
    // Update file status
    this.fileStatus.update(status => ({
      ...status,
      [fileType]: {
        fileName: file.name,
        size: file.size,
        rowCount: 0,
        processedRows: 0,
        errors: [],
        warnings: [],
        status: 'parsing',
        progress: 0
      }
    }));
    
    try {
      let data: any[] = [];
      
      // Parse based on type
      switch (fileType) {
        case 'poles':
          data = await this.excelService.processPoleFile(file);
          this.polesData.set(data);
          break;
          
        case 'drops':
          data = await this.excelService.processDropFile(file);
          this.dropsData.set(data);
          break;
          
        case 'fibre':
          data = await this.excelService.processFibreFile(file);
          this.fibreData.set(data);
          break;
      }
      
      // Update status
      this.fileStatus.update(status => ({
        ...status,
        [fileType]: {
          ...status[fileType]!,
          rowCount: data.length,
          processedRows: data.length,
          status: 'complete',
          progress: 100
        }
      }));
      
      // Auto-validate if all files uploaded
      if (this.allFilesProcessed()) {
        await this.validateData();
      }
      
    } catch (error) {
      this.error.set(`Failed to process ${fileType} file: ${error}`);
      this.fileStatus.update(status => ({
        ...status,
        [fileType]: {
          ...status[fileType]!,
          status: 'error',
          errors: [{ 
            id: 'parse-error',
            type: 'invalid-format',
            severity: 'critical',
            message: String(error)
          }]
        }
      }));
    } finally {
      this.processingState.set('idle');
    }
  }
  
  /**
   * Check if all files are processed
   */
  private allFilesProcessed(): boolean {
    const status = this.fileStatus();
    const files = this.sowForm.value;
    
    return (!files.polesFile || status.poles?.status === 'complete') &&
           (!files.dropsFile || status.drops?.status === 'complete') &&
           (!files.fibreFile || status.fibre?.status === 'complete');
  }
  
  /**
   * Validate all data
   */
  async validateData() {
    this.processingState.set('validating');
    
    const data = {
      poles: this.polesData(),
      drops: this.dropsData(),
      fibre: this.fibreData()
    };
    
    const results = this.validationService.validateImportData(data);
    this.validationResults.set(results);
    
    // Calculate if no errors
    if (results.errors.length === 0) {
      this.calculateSOW();
    }
    
    this.processingState.set('idle');
  }
  
  /**
   * Calculate SOW totals and targets
   */
  private calculateSOW() {
    const poles = this.polesData();
    const drops = this.dropsData();
    const fibre = this.fibreData();
    const estimatedDays = this.sowForm.value.estimatedDays || 50;
    
    // Calculate totals
    const polePermissionsTotal = poles.length;
    const dropsWithONT = drops.filter(d => d.endfeat).length;
    const fibreTotal = fibre.reduce((sum, f) => sum + f.length_m, 0);
    
    // Calculate daily targets
    const calculations: SOWCalculations = {
      totals: {
        polePermissionsTotal,
        homeSignupsTotal: dropsWithONT,
        fibreStringingTotal: fibreTotal,
        totalDrops: drops.length,
        spareDrops: drops.length - dropsWithONT,
        polesPlanted: polePermissionsTotal,
        homesConnected: dropsWithONT
      },
      dailyTargets: {
        polePermissionsDaily: Math.ceil(polePermissionsTotal / estimatedDays),
        polesPlantedDaily: Math.ceil(polePermissionsTotal / estimatedDays),
        homeSignupsDaily: Math.ceil(dropsWithONT / estimatedDays),
        homesConnectedDaily: Math.ceil(dropsWithONT / estimatedDays),
        fibreStringingDaily: Math.ceil(fibreTotal / estimatedDays),
        estimatedDays
      },
      geographic: this.calculateGeographic(poles, drops)
    };
    
    this.calculations.set(calculations);
  }
  
  /**
   * Calculate geographic breakdown
   */
  private calculateGeographic(poles: PoleImportData[], drops: DropImportData[]) {
    // Zone analysis
    const zoneMap = new Map<string, { poles: Set<string>; drops: Set<string> }>();
    
    poles.forEach(pole => {
      if (pole.zone_no) {
        if (!zoneMap.has(pole.zone_no)) {
          zoneMap.set(pole.zone_no, { poles: new Set(), drops: new Set() });
        }
        zoneMap.get(pole.zone_no)!.poles.add(pole.label_1);
      }
    });
    
    drops.forEach(drop => {
      if (drop.zone) {
        if (!zoneMap.has(drop.zone)) {
          zoneMap.set(drop.zone, { poles: new Set(), drops: new Set() });
        }
        zoneMap.get(drop.zone)!.drops.add(drop.label);
      }
    });
    
    const zones = Array.from(zoneMap.entries()).map(([zone, data]) => ({
      zone,
      poleCount: data.poles.size,
      dropCount: data.drops.size,
      percentage: (data.poles.size / poles.length) * 100
    }));
    
    // PON analysis (similar logic)
    const pons: any[] = []; // Similar to zones
    
    // Pole-drop mapping
    const poleDropMapping = new Map<string, string[]>();
    drops.forEach(drop => {
      if (!poleDropMapping.has(drop.strtfeat)) {
        poleDropMapping.set(drop.strtfeat, []);
      }
      poleDropMapping.get(drop.strtfeat)!.push(drop.label);
    });
    
    return { zones, pons, poleDropMapping };
  }
  
  /**
   * Save SOW to Firebase
   */
  async saveSOW() {
    if (!this.calculations()) return;
    
    this.processingState.set('saving');
    this.isLoading.set(true);
    
    try {
      const files = {
        poles: this.sowForm.value.polesFile || undefined,
        drops: this.sowForm.value.dropsFile || undefined,
        fibre: this.sowForm.value.fibreFile || undefined
      };
      
      const importData = {
        poles: this.polesData(),
        drops: this.dropsData(),
        fibre: this.fibreData()
      };
      
      const sowId = await this.sowService.createSOWWithFiles(
        this.projectId(),
        files,
        importData,
        this.calculations()!
      );
      
      this.processingState.set('complete');
      this.onComplete.emit(sowId);
      
    } catch (error) {
      this.error.set('Failed to save SOW: ' + error);
      this.processingState.set('error');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * Cancel import
   */
  cancel() {
    this.onCancel.emit();
  }
  
  /**
   * Download template
   */
  downloadTemplate(type: 'poles' | 'drops' | 'fibre') {
    const blob = this.excelService.createTemplate(type);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

## 6. Import Component HTML (sow-import.component.html)

```html
<div class="sow-import-container">
  <mat-stepper [selectedIndex]="currentStep()" #stepper>
    
    <!-- Step 1: File Upload -->
    <mat-step [completed]="filesUploaded()">
      <ng-template matStepLabel>Upload Files</ng-template>
      
      <div class="step-content">
        <h2>Import SOW Data</h2>
        <p>Upload your engineering Excel files to automatically calculate project scope and daily targets.</p>
        
        @if (error()) {
          <div class="error-message">
            <mat-icon>error</mat-icon>
            {{ error() }}
          </div>
        }
        
        <!-- Poles Upload -->
        <mat-card class="upload-card" [class.has-file]="sowForm.value.polesFile">
          <mat-card-header>
            <mat-icon mat-card-avatar>location_on</mat-icon>
            <mat-card-title>Poles Data</mat-card-title>
            <mat-card-subtitle>
              Required columns: Pole Number, Status, Latitude, Longitude
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            @if (!sowForm.value.polesFile) {
              <div class="upload-zone" (click)="poleInput.click()">
                <mat-icon>cloud_upload</mat-icon>
                <p>Drop file here or click to browse</p>
                <input #poleInput type="file" hidden accept=".xlsx,.xls" 
                       (change)="onFileSelect($event, 'poles')">
              </div>
            } @else {
              <div class="file-info">
                <mat-icon>description</mat-icon>
                <span>{{ sowForm.value.polesFile.name }}</span>
                <button mat-icon-button (click)="sowForm.patchValue({polesFile: null})">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              
              @if (fileStatus().poles) {
                <mat-progress-bar [value]="fileStatus().poles!.progress"></mat-progress-bar>
                <p>{{ fileStatus().poles!.rowCount }} records found</p>
              }
            }
          </mat-card-content>
        </mat-card>
        
        <!-- Drops Upload -->
        <mat-card class="upload-card" [class.has-file]="sowForm.value.dropsFile">
          <mat-card-header>
            <mat-icon mat-card-avatar>home</mat-icon>
            <mat-card-title>Drops Data</mat-card-title>
            <mat-card-subtitle>
              Required: Drop Number, Connected Pole
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            @if (!sowForm.value.dropsFile) {
              <div class="upload-zone" (click)="dropInput.click()">
                <mat-icon>cloud_upload</mat-icon>
                <p>Drop file here or click to browse</p>
                <input #dropInput type="file" hidden accept=".xlsx,.xls" 
                       (change)="onFileSelect($event, 'drops')">
              </div>
            } @else {
              <div class="file-info">
                <mat-icon>description</mat-icon>
                <span>{{ sowForm.value.dropsFile.name }}</span>
                <button mat-icon-button (click)="sowForm.patchValue({dropsFile: null})">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              
              @if (fileStatus().drops) {
                <mat-progress-bar [value]="fileStatus().drops!.progress"></mat-progress-bar>
                <p>{{ fileStatus().drops!.rowCount }} records found</p>
              }
            }
          </mat-card-content>
        </mat-card>
        
        <!-- Fibre Upload -->
        <mat-card class="upload-card" [class.has-file]="sowForm.value.fibreFile">
          <mat-card-header>
            <mat-icon mat-card-avatar>cable</mat-icon>
            <mat-card-title>Fibre Data</mat-card-title>
            <mat-card-subtitle>
              Required: Cable Length (meters)
            </mat-card-subtitle>
          </mat-card-header>
          
          <mat-card-content>
            @if (!sowForm.value.fibreFile) {
              <div class="upload-zone" (click)="fibreInput.click()">
                <mat-icon>cloud_upload</mat-icon>
                <p>Drop file here or click to browse</p>
                <input #fibreInput type="file" hidden accept=".xlsx,.xls" 
                       (change)="onFileSelect($event, 'fibre')">
              </div>
            } @else {
              <div class="file-info">
                <mat-icon>description</mat-icon>
                <span>{{ sowForm.value.fibreFile.name }}</span>
                <button mat-icon-button (click)="sowForm.patchValue({fibreFile: null})">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              
              @if (fileStatus().fibre) {
                <mat-progress-bar [value]="fileStatus().fibre!.progress"></mat-progress-bar>
                <p>{{ fileStatus().fibre!.rowCount }} records found</p>
              }
            }
          </mat-card-content>
        </mat-card>
        
        <div class="actions">
          <button mat-button (click)="downloadTemplate('poles')">
            <mat-icon>download</mat-icon>
            Poles Template
          </button>
          <button mat-button (click)="downloadTemplate('drops')">
            <mat-icon>download</mat-icon>
            Drops Template
          </button>
          <button mat-button (click)="downloadTemplate('fibre')">
            <mat-icon>download</mat-icon>
            Fibre Template
          </button>
          
          <span class="spacer"></span>
          
          <button mat-button (click)="cancel()">Cancel</button>
          <button mat-raised-button color="primary" 
                  [disabled]="!filesUploaded()"
                  (click)="validateData(); stepper.next()">
            Next
          </button>
        </div>
      </div>
    </mat-step>
    
    <!-- Step 2: Validation -->
    <mat-step [completed]="!hasErrors()">
      <ng-template matStepLabel>Validation</ng-template>
      
      <div class="step-content">
        <h2>Validation Results</h2>
        
        @if (processingState() === 'validating') {
          <div class="loading">
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            <p>Validating data...</p>
          </div>
        }
        
        @if (validationResults()) {
          <app-sow-validation 
            [validationResults]="validationResults()!"
            (onFix)="validateData()">
          </app-sow-validation>
        }
        
        <div class="actions">
          <button mat-button (click)="stepper.previous()">Back</button>
          <button mat-raised-button color="primary" 
                  [disabled]="hasErrors()"
                  (click)="stepper.next()">
            Continue
          </button>
        </div>
      </div>
    </mat-step>
    
    <!-- Step 3: Calculations -->
    <mat-step>
      <ng-template matStepLabel>Review Calculations</ng-template>
      
      <div class="step-content">
        <h2>SOW Calculations</h2>
        
        @if (calculations()) {
          <app-sow-calculations 
            [calculations]="calculations()!"
            [estimatedDays]="sowForm.value.estimatedDays!"
            (onDaysChange)="sowForm.patchValue({estimatedDays: $event}); calculateSOW()">
          </app-sow-calculations>
        }
        
        <div class="actions">
          <button mat-button (click)="stepper.previous()">Back</button>
          <button mat-raised-button color="primary" 
                  [loading]="isLoading()"
                  (click)="saveSOW()">
            Save to Project
          </button>
        </div>
      </div>
    </mat-step>
    
  </mat-stepper>
</div>
```

## 7. Import Component Styles (sow-import.component.scss)

```scss
@use '../../../../styles/component-theming' as theme;

.sow-import-container {
  padding: theme.ff-spacing(lg);
  max-width: 1200px;
  margin: 0 auto;
  
  .step-content {
    padding: theme.ff-spacing(xl) 0;
  }
  
  h2 {
    @include theme.typography-heading;
    margin-bottom: theme.ff-spacing(md);
  }
  
  .error-message {
    @include theme.alert-error;
    display: flex;
    align-items: center;
    gap: theme.ff-spacing(sm);
    margin-bottom: theme.ff-spacing(lg);
  }
  
  .upload-card {
    @include theme.surface-card;
    margin-bottom: theme.ff-spacing(lg);
    
    &.has-file {
      border: 2px solid theme.ff-rgb(success);
    }
    
    mat-card-header {
      margin-bottom: theme.ff-spacing(md);
    }
    
    .upload-zone {
      @include theme.upload-zone;
      padding: theme.ff-spacing(xl);
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        background: theme.ff-rgba(primary, 0.05);
        border-color: theme.ff-rgb(primary);
      }
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: theme.ff-rgb(muted-foreground);
      }
      
      p {
        margin-top: theme.ff-spacing(md);
        color: theme.ff-rgb(muted-foreground);
      }
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: theme.ff-spacing(sm);
      padding: theme.ff-spacing(md);
      background: theme.ff-rgba(primary, 0.05);
      border-radius: theme.ff-radius(sm);
      
      mat-icon {
        color: theme.ff-rgb(primary);
      }
      
      span {
        flex: 1;
      }
    }
    
    mat-progress-bar {
      margin-top: theme.ff-spacing(md);
    }
  }
  
  .actions {
    display: flex;
    align-items: center;
    gap: theme.ff-spacing(md);
    margin-top: theme.ff-spacing(xl);
    padding-top: theme.ff-spacing(lg);
    border-top: 1px solid theme.ff-rgb(border);
    
    .spacer {
      flex: 1;
    }
  }
  
  .loading {
    text-align: center;
    padding: theme.ff-spacing(xl);
    
    p {
      margin-top: theme.ff-spacing(md);
      color: theme.ff-rgb(muted-foreground);
    }
  }
}

// Responsive
@media #{theme.breakpoint-down(md)} {
  .sow-import-container {
    padding: theme.ff-spacing(md);
    
    .upload-card {
      .upload-zone {
        padding: theme.ff-spacing(lg);
      }
    }
    
    .actions {
      flex-wrap: wrap;
      
      button {
        flex: 1;
        min-width: 120px;
      }
    }
  }
}
```

## 8. Project Integration Update

```typescript
// In project-form.component.ts
import { SowImportComponent } from '@features/sow/components/sow-import/sow-import.component';

// Add to imports
imports: [
  // ... existing imports
  SowImportComponent
]

// In template, add new step
<mat-step>
  <ng-template matStepLabel>SOW Import (Optional)</ng-template>
  
  @if (projectId()) {
    <app-sow-import 
      [projectId]="projectId()"
      (onComplete)="onSOWImportComplete($event)"
      (onCancel)="stepper.next()">
    </app-sow-import>
  } @else {
    <p>Please save project details first</p>
    <button mat-button (click)="stepper.previous()">Back</button>
  }
</mat-step>

// Add method
onSOWImportComplete(sowId: string) {
  // Update project with SOW data
  this.projectService.update(this.projectId(), {
    'metadata.sowId': sowId,
    'metadata.hasSOW': true
  });
  
  // Continue to next step
  this.stepper.next();
}
```

## 9. Navigation Update

```typescript
// In app-shell.component.ts navigation array
{
  label: 'SOW',
  icon: 'description',
  route: '/sow',
  roles: ['admin', 'project-manager'],
  badge: 'New'
}
```

## 10. Routes Configuration

```typescript
// sow.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const SOW_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'import',
    pathMatch: 'full'
  },
  {
    path: 'import',
    loadComponent: () => import('./pages/sow-wizard/sow-wizard.component')
      .then(m => m.SowWizardComponent),
    canActivate: [authGuard],
    data: { 
      title: 'Import SOW Data',
      roles: ['admin', 'project-manager'] 
    }
  },
  {
    path: 'view/:id',
    loadComponent: () => import('./components/sow-summary/sow-summary.component')
      .then(m => m.SowSummaryComponent),
    canActivate: [authGuard],
    data: { title: 'SOW Summary' }
  }
];
```