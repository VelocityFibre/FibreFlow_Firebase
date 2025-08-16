// Import specific models for Excel data processing

export interface PoleImportData {
  label_1: string;        // Pole number
  status: string;         // Permission status
  latitude: number;
  longitude: number;
  pon_no?: string;
  zone_no?: string;
  created_date?: string;
  pole_number?: string;   // Alternative pole number field
}

export interface DropImportData {
  drop_number: string;    // Drop number (alias for label)
  label?: string;         // Drop number
  pole_number: string;    // Connected pole (alias for strtfeat)
  strtfeat?: string;      // Connected pole
  endfeat?: string;       // ONT reference
  pon?: string;
  zone?: string;
  premises_id?: string;
  address?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  distance_to_pole?: number;
}

export interface FibreImportData {
  segment_id: string;     // Segment identifier (alias for cable_id)
  from_point: string;     // Start point
  to_point: string;       // End point
  distance: number;       // Distance (alias for length_m)
  length_m?: number;      // Cable length in meters (optional)
  route_id?: string;
  fibre_type?: string;    // Fibre type (alias for type)
  type?: string;
  cable_id?: string;
  // Additional fields from actual Excel format
  contractor?: string;    // Contractor name
  completed?: string;     // Completion status
  date_completed?: string; // Completion date
  pon_no?: string;        // PON number
  zone_no?: string;       // Zone number
  cable_size?: string;    // Cable size (e.g., "96")
  layer?: string;         // Layer information
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

export interface ValidationError {
  row: number;
  sheet: string;
  error: string;
  data: any;
}

export interface ValidationWarning {
  row: number;
  sheet: string;
  warning: string;
  data: any;
}

export interface ExcelParseResult {
  poles: PoleImportData[];
  drops: DropImportData[];
  fibre: FibreImportData[];
  errors: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    sheets: string[];
  };
}

export interface ExcelParseError {
  row: number;
  sheet: string;
  error: string;
  data?: any;
}