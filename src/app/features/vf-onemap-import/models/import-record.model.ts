export interface ImportRecord {
  // Core data (matches OneMap CSV structure)
  propertyId: string;
  oneMapNadId: string;
  poleNumber: string;
  dropNumber: string;
  status: string;
  flowNameGroups: string;
  sections: string;
  pons: string;
  location: string;
  address: string;
  fieldAgentName: string;
  lastModifiedBy: string;
  lastModifiedDate: string;

  // Import metadata
  importDate: Date;
  importBatchId: string;
  isNew: boolean; // true if first time seeing this record
  hasChanges: boolean; // true if data changed from previous import
  changesSummary?: string[]; // List of fields that changed
}

export interface ImportBatch {
  id: string;
  filename: string;
  importDate: Date;
  totalRecords: number;
  newRecords: number;
  changedRecords: number;
  unchangedRecords: number;
  errorRecords: number;
  processingTimeMs: number;
  status: 'processing' | 'completed' | 'failed';
}

export interface ImportReport {
  batchId: string;
  reportType: 'daily-summary' | 'new-records' | 'changed-records' | 'errors';
  generatedDate: Date;
  recordCount: number;
  records: ImportRecord[];
  summary: {
    totalRecords: number;
    newRecords: number;
    changedRecords: number;
    unchangedRecords: number;
    errorRecords: number;
  };
}

export interface ChangeTrackingRecord {
  propertyId: string;
  changeDate: Date;
  changeType: 'created' | 'updated';
  fieldChanges: FieldChange[];
  previousVersion?: ImportRecord;
  currentVersion: ImportRecord;
}

export interface FieldChange {
  fieldName: string;
  oldValue: string;
  newValue: string;
  changeType: 'added' | 'modified' | 'removed';
}

export interface ImportConfig {
  csvFilePath: string;
  batchId: string;
  enableDuplicateCheck: boolean;
  enableChangeTracking: boolean;
  generateReports: boolean;
}
