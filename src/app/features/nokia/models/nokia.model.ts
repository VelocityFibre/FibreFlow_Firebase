// Nokia Network Equipment Data Models

export interface NokiaData {
  id: number;
  project_id?: string;
  drop_number: string;
  serial_number: string;
  olt_address?: string;
  ont_rx_signal_dbm?: number;
  link_budget_ont_olt_db?: number;
  olt_rx_signal_dbm?: number;
  link_budget_olt_ont_db?: number;
  current_ont_rx?: number;
  status?: string;
  team?: string;
  latitude?: number;
  longitude?: number;
  measurement_timestamp?: number;
  measurement_date?: Date;
  import_batch_id: string;
  imported_at: Date;
  updated_at: Date;
}

export interface NokiaImportData {
  'Drop Number': string;
  'Serial Number': string;
  'Timestamp': number;
  'OLT Address': string;
  'ONT Rx SIG (dBm)': string;
  'Link Budget ONT->OLT (dB)': string;
  'OLT Rx SIG (dBm)': string;
  'Link Budget OLT->ONT (dB)': string;
  'Status': string;
  'Latitude': number;
  'Longitude': number;
  'Current ONT RX': number;
  'Team': string;
  'Date': string;
}

export interface NokiaSummary {
  totalEquipment: number;
  activeEquipment: number;
  inactiveEquipment: number;
  totalTeams: number;
  avgSignalStrength: number;
  lastMeasurement: Date | null;
}

export interface NokiaTeamSummary {
  team: string;
  equipmentCount: number;
  activeCount: number;
  avgSignalStrength: number;
  avgCurrentRx: number;
  lastMeasurement: Date | null;
}

export interface NokiaSignalQuality {
  excellent: number;  // > -15 dBm
  good: number;       // -15 to -20 dBm
  fair: number;       // -20 to -25 dBm
  poor: number;       // < -25 dBm
}

export interface NokiaImportBatch {
  id: string;
  filename: string;
  recordCount: number;
  validRecords: number;
  errorRecords: number;
  importedAt: Date;
  status: 'processing' | 'completed' | 'failed';
  errors?: string[];
}

export interface NokiaFilterOptions {
  projectId?: string;
  status?: string;
  team?: string;
  dateFrom?: Date;
  dateTo?: Date;
  signalQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}

// Signal quality thresholds based on telecom standards
export const SIGNAL_QUALITY_THRESHOLDS = {
  excellent: -15,
  good: -20,
  fair: -25
};

export function getSignalQuality(signalDbm: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (signalDbm > SIGNAL_QUALITY_THRESHOLDS.excellent) return 'excellent';
  if (signalDbm > SIGNAL_QUALITY_THRESHOLDS.good) return 'good';
  if (signalDbm > SIGNAL_QUALITY_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

export function getSignalQualityColor(quality: string): string {
  switch (quality) {
    case 'excellent': return '#4caf50'; // Green
    case 'good': return '#8bc34a';      // Light green
    case 'fair': return '#ff9800';      // Orange
    case 'poor': return '#f44336';      // Red
    default: return '#9e9e9e';          // Grey
  }
}

// Convert Excel timestamp to JavaScript Date
export function convertExcelTimestamp(excelTimestamp: number): Date {
  // Excel timestamps are days since 1900-01-01 (with 1900 leap year bug)
  const excelEpoch = new Date(1900, 0, 1);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const adjustedTimestamp = excelTimestamp - 2; // Adjust for Excel leap year bug
  return new Date(excelEpoch.getTime() + adjustedTimestamp * millisecondsPerDay);
}

// Parse signal strength strings to numbers
export function parseSignalStrength(signalStr: string): number | null {
  if (!signalStr || signalStr === '' || signalStr === 'NULL') return null;
  const parsed = parseFloat(signalStr);
  return isNaN(parsed) ? null : parsed;
}