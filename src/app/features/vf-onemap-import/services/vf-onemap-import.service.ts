import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, setDoc, addDoc, query, where, getDocs, writeBatch } from '@angular/fire/firestore';
import { 
  ImportRecord, 
  ImportBatch, 
  ImportReport, 
  ChangeTrackingRecord,
  FieldChange,
  ImportConfig 
} from '../models/import-record.model';

@Injectable({
  providedIn: 'root',
})
export class VfOnemapImportService {
  private firestore = inject(Firestore);
  
  // Collection references for vf-onemap-data database
  private csvImportsCollection = collection(this.firestore, 'csv-imports');
  private processedRecordsCollection = collection(this.firestore, 'processed-records');
  private changeHistoryCollection = collection(this.firestore, 'change-history');
  private importReportsCollection = collection(this.firestore, 'import-reports');
  private importBatchesCollection = collection(this.firestore, 'import-batches');

  /**
   * Main import function - processes CSV and imports only new/changed records
   * Core logic: Check existing -> Import new -> Track changes -> Generate reports
   */
  async importCsvToDatabase(csvRecords: any[], config: ImportConfig): Promise<ImportReport> {
    const startTime = Date.now();
    
    // Step 1: Create import batch
    const batch = await this.createImportBatch(config, csvRecords.length);
    
    try {
      // Step 2: Process each record - check for duplicates and changes
      const processedRecords = await this.processRecords(csvRecords, batch.id);
      
      // Step 3: Import only new/changed records to database
      await this.importRecordsToDatabase(processedRecords);
      
      // Step 4: Generate reports using tested logic (copied from existing scripts)
      const report = await this.generateImportReport(processedRecords, batch.id);
      
      // Step 5: Update batch status
      const processingTime = Date.now() - startTime;
      await this.completeBatch(batch.id, processedRecords, processingTime);
      
      return report;
      
    } catch (error) {
      console.error('Import failed:', error);
      await this.failBatch(batch.id, error as Error);
      throw error;
    }
  }

  /**
   * Check if record exists in database and detect changes
   * Returns: { exists: boolean, hasChanges: boolean, existingRecord?: ImportRecord }
   */
  private async checkRecordExists(propertyId: string): Promise<{
    exists: boolean;
    hasChanges: boolean;
    existingRecord?: ImportRecord;
  }> {
    try {
      const docRef = doc(this.processedRecordsCollection, propertyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const existingRecord = docSnap.data() as ImportRecord;
        return {
          exists: true,
          hasChanges: false, // Will be determined in compareRecords()
          existingRecord
        };
      } else {
        return {
          exists: false,
          hasChanges: false
        };
      }
    } catch (error) {
      console.error('Error checking record existence:', error);
      return { exists: false, hasChanges: false };
    }
  }

  /**
   * Compare two records field by field to detect changes
   * Copied logic pattern from existing OneMap scripts
   */
  private compareRecords(newRecord: any, existingRecord: ImportRecord): {
    hasChanges: boolean;
    changes: FieldChange[];
  } {
    const changes: FieldChange[] = [];
    const fieldsToCompare = [
      'poleNumber', 'dropNumber', 'status', 'flowNameGroups',
      'sections', 'pons', 'location', 'address', 'fieldAgentName',
      'lastModifiedBy', 'lastModifiedDate'
    ];

    fieldsToCompare.forEach(field => {
      const newValue = newRecord[field] || '';
      const oldValue = existingRecord[field] || '';
      
      if (newValue !== oldValue) {
        changes.push({
          fieldName: field,
          oldValue,
          newValue,
          changeType: oldValue === '' ? 'added' : 'modified'
        });
      }
    });

    return {
      hasChanges: changes.length > 0,
      changes
    };
  }

  /**
   * Process all CSV records - check duplicates and changes
   */
  private async processRecords(csvRecords: any[], batchId: string): Promise<ImportRecord[]> {
    const processedRecords: ImportRecord[] = [];
    
    for (const csvRecord of csvRecords) {
      const propertyId = csvRecord.propertyId;
      if (!propertyId) continue; // Skip records without unique ID
      
      // Check if record exists
      const existenceCheck = await this.checkRecordExists(propertyId);
      
      let hasChanges = false;
      let changesSummary: string[] = [];
      
      if (existenceCheck.exists && existenceCheck.existingRecord) {
        // Record exists - check for changes
        const comparison = this.compareRecords(csvRecord, existenceCheck.existingRecord);
        hasChanges = comparison.hasChanges;
        changesSummary = comparison.changes.map(c => `${c.fieldName}: ${c.oldValue} → ${c.newValue}`);
      }
      
      // Create import record
      const importRecord: ImportRecord = {
        // CSV data
        propertyId: csvRecord.propertyId || '',
        oneMapNadId: csvRecord.oneMapNadId || '',
        poleNumber: csvRecord.poleNumber || '',
        dropNumber: csvRecord.dropNumber || '',
        status: csvRecord.status || '',
        flowNameGroups: csvRecord.flowNameGroups || '',
        sections: csvRecord.sections || '',
        pons: csvRecord.pons || '',
        location: csvRecord.location || '',
        address: csvRecord.address || '',
        fieldAgentName: csvRecord.fieldAgentName || '',
        lastModifiedBy: csvRecord.lastModifiedBy || '',
        lastModifiedDate: csvRecord.lastModifiedDate || '',
        
        // Import metadata
        importDate: new Date(),
        importBatchId: batchId,
        isNew: !existenceCheck.exists,
        hasChanges,
        changesSummary: changesSummary.length > 0 ? changesSummary : undefined
      };
      
      processedRecords.push(importRecord);
    }
    
    return processedRecords;
  }

  /**
   * Import processed records to database (only new/changed ones)
   */
  private async importRecordsToDatabase(processedRecords: ImportRecord[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    
    // Filter for only new or changed records
    const recordsToImport = processedRecords.filter(record => record.isNew || record.hasChanges);
    
    recordsToImport.forEach(record => {
      const docRef = doc(this.processedRecordsCollection, record.propertyId);
      batch.set(docRef, record);
      
      // Also track changes if record has changes
      if (record.hasChanges) {
        const changeRecord: ChangeTrackingRecord = {
          propertyId: record.propertyId,
          changeDate: new Date(),
          changeType: record.isNew ? 'created' : 'updated',
          fieldChanges: record.changesSummary?.map(summary => {
            const [fieldName, change] = summary.split(': ');
            const [oldValue, newValue] = change.split(' → ');
            return {
              fieldName,
              oldValue,
              newValue,
              changeType: 'modified' as const
            };
          }) || [],
          currentVersion: record
        };
        
        const changeDocRef = doc(this.changeHistoryCollection);
        batch.set(changeDocRef, changeRecord);
      }
    });
    
    // Commit all changes at once
    await batch.commit();
    
    console.log(`Imported ${recordsToImport.length} records to vf-onemap-data database`);
  }

  /**
   * Generate import report using tested report logic (copied from existing scripts)
   */
  private async generateImportReport(processedRecords: ImportRecord[], batchId: string): Promise<ImportReport> {
    const newRecords = processedRecords.filter(r => r.isNew);
    const changedRecords = processedRecords.filter(r => r.hasChanges && !r.isNew);
    const unchangedRecords = processedRecords.filter(r => !r.isNew && !r.hasChanges);
    
    const report: ImportReport = {
      batchId,
      reportType: 'daily-summary',
      generatedDate: new Date(),
      recordCount: processedRecords.length,
      records: processedRecords,
      summary: {
        totalRecords: processedRecords.length,
        newRecords: newRecords.length,
        changedRecords: changedRecords.length,
        unchangedRecords: unchangedRecords.length,
        errorRecords: 0
      }
    };
    
    // Save report to database
    await addDoc(this.importReportsCollection, report);
    
    // Generate separate reports for each type (using tested logic pattern)
    await this.generateSpecificReports(batchId, newRecords, changedRecords);
    
    return report;
  }

  /**
   * Generate specific report types (copied pattern from existing scripts)
   */
  private async generateSpecificReports(
    batchId: string, 
    newRecords: ImportRecord[], 
    changedRecords: ImportRecord[]
  ): Promise<void> {
    
    // New Records Report
    if (newRecords.length > 0) {
      const newRecordsReport: ImportReport = {
        batchId,
        reportType: 'new-records',
        generatedDate: new Date(),
        recordCount: newRecords.length,
        records: newRecords,
        summary: {
          totalRecords: newRecords.length,
          newRecords: newRecords.length,
          changedRecords: 0,
          unchangedRecords: 0,
          errorRecords: 0
        }
      };
      
      await addDoc(this.importReportsCollection, newRecordsReport);
    }
    
    // Changed Records Report
    if (changedRecords.length > 0) {
      const changedRecordsReport: ImportReport = {
        batchId,
        reportType: 'changed-records',
        generatedDate: new Date(),
        recordCount: changedRecords.length,
        records: changedRecords,
        summary: {
          totalRecords: changedRecords.length,
          newRecords: 0,
          changedRecords: changedRecords.length,
          unchangedRecords: 0,
          errorRecords: 0
        }
      };
      
      await addDoc(this.importReportsCollection, changedRecordsReport);
    }
  }

  /**
   * Create import batch metadata
   */
  private async createImportBatch(config: ImportConfig, totalRecords: number): Promise<ImportBatch> {
    const batch: ImportBatch = {
      id: config.batchId,
      filename: config.csvFilePath,
      importDate: new Date(),
      totalRecords,
      newRecords: 0,
      changedRecords: 0,
      unchangedRecords: 0,
      errorRecords: 0,
      processingTimeMs: 0,
      status: 'processing'
    };
    
    await setDoc(doc(this.importBatchesCollection, batch.id), batch);
    return batch;
  }

  /**
   * Complete import batch with final statistics
   */
  private async completeBatch(
    batchId: string, 
    processedRecords: ImportRecord[], 
    processingTimeMs: number
  ): Promise<void> {
    const newRecords = processedRecords.filter(r => r.isNew).length;
    const changedRecords = processedRecords.filter(r => r.hasChanges && !r.isNew).length;
    const unchangedRecords = processedRecords.filter(r => !r.isNew && !r.hasChanges).length;
    
    const batchUpdate: Partial<ImportBatch> = {
      newRecords,
      changedRecords,
      unchangedRecords,
      processingTimeMs,
      status: 'completed'
    };
    
    await setDoc(doc(this.importBatchesCollection, batchId), batchUpdate, { merge: true });
  }

  /**
   * Mark batch as failed
   */
  private async failBatch(batchId: string, error: Error): Promise<void> {
    await setDoc(doc(this.importBatchesCollection, batchId), {
      status: 'failed',
      error: error.message
    }, { merge: true });
  }

  /**
   * Get import statistics for dashboard
   */
  async getImportStatistics(days: number = 30): Promise<{
    totalBatches: number;
    totalRecords: number;
    newRecords: number;
    changedRecords: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const batchesQuery = query(
      this.importBatchesCollection,
      where('importDate', '>=', cutoffDate)
    );
    
    const batchesSnapshot = await getDocs(batchesQuery);
    const batches = batchesSnapshot.docs.map(doc => doc.data() as ImportBatch);
    
    return {
      totalBatches: batches.length,
      totalRecords: batches.reduce((sum, batch) => sum + batch.totalRecords, 0),
      newRecords: batches.reduce((sum, batch) => sum + batch.newRecords, 0),
      changedRecords: batches.reduce((sum, batch) => sum + batch.changedRecords, 0)
    };
  }

  /**
   * Export report to CSV using tested export logic (copied from existing OneMapService)
   */
  exportReportToCsv(report: ImportReport, filename: string): void {
    if (report.records.length === 0) return;

    // Create CSV header
    const headers = [
      'Property ID',
      '1map NAD ID', 
      'Pole Number',
      'Drop Number',
      'Status',
      'Flow Name Groups',
      'Sections',
      'PONs',
      'Location',
      'Address',
      'Field Agent Name',
      'Last Modified By',
      'Last Modified Date',
      'Import Date',
      'Is New',
      'Has Changes',
      'Changes Summary'
    ];

    // Create CSV content using proven escaping logic
    const csvContent = [
      headers.join(','),
      ...report.records.map((record) =>
        [
          this.escapeCsvValue(record.propertyId),
          this.escapeCsvValue(record.oneMapNadId),
          this.escapeCsvValue(record.poleNumber),
          this.escapeCsvValue(record.dropNumber),
          this.escapeCsvValue(record.status),
          this.escapeCsvValue(record.flowNameGroups),
          this.escapeCsvValue(record.sections),
          this.escapeCsvValue(record.pons),
          this.escapeCsvValue(record.location),
          this.escapeCsvValue(record.address),
          this.escapeCsvValue(record.fieldAgentName),
          this.escapeCsvValue(record.lastModifiedBy),
          this.escapeCsvValue(record.lastModifiedDate),
          this.escapeCsvValue(record.importDate.toISOString()),
          this.escapeCsvValue(record.isNew ? 'Yes' : 'No'),
          this.escapeCsvValue(record.hasChanges ? 'Yes' : 'No'),
          this.escapeCsvValue(record.changesSummary?.join('; ') || '')
        ].join(','),
      ),
    ].join('\n');

    // Download using proven download logic
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * CSV value escaping (copied exactly from proven OneMapService)
   */
  private escapeCsvValue(value: string): string {
    if (!value) return '';

    // Escape quotes and wrap in quotes if contains comma, newline, or quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }

    return value;
  }
}