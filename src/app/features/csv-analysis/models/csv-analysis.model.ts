export interface CsvRecord {
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
}

export interface CsvAnalysisResult {
  // Original 4 report types from proven logic
  firstEntryRecords: CsvRecord[];
  duplicatesPreWindow: CsvRecord[];
  noDropAllocated: CsvRecord[];
  duplicateDropsRemoved: CsvRecord[];
  
  // Additional analysis metrics
  totalRecords: number;
  processingDate: Date;
  dataQualityScore: number;
  validationErrors: string[];
}

export interface CsvAnalysisConfig {
  startDate: Date;
  endDate: Date;
  filename: string;
}

export interface CsvValidationResult {
  valid: boolean;
  missingColumns: string[];
  totalRows: number;
  validRows: number;
  errors: ValidationError[];
}

export interface ValidationError {
  row: number;
  column: string;
  error: string;
  value: string;
}

export interface CsvAnalysisReport {
  reportType: 'first-entry' | 'duplicates-pre-window' | 'no-drop-allocated' | 'duplicate-drops-removed';
  filename: string;
  recordCount: number;
  generatedDate: Date;
  records: CsvRecord[];
}