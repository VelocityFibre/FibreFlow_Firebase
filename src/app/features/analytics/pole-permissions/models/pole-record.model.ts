/**
 * Represents a raw pole record from OneMap CSV
 * All fields match the exact column names from the CSV
 */
export interface PoleRecord {
  // Primary identifiers
  'Property ID': string;
  '1map NAD ID': string;
  'Pole Number': string;
  'Drop Number': string;
  'Stand Number': string;

  // Status and workflow
  Status: string;
  'Flow Name Groups': string;

  // Location information
  Site: string;
  Sections: string;
  PONs: string;
  'Location Address': string;
  Latitude: string;
  Longitude: string;
  'Latitude & Longitude': string;

  // Agent and tracking
  'Field Agent Name (pole permission)': string;
  lst_mod_by: string;
  lst_mod_dt: string;
}

/**
 * Represents a parsed pole record with normalized data types
 */
export interface ParsedPoleRecord
  extends Omit<PoleRecord, 'lst_mod_dt' | 'Latitude' | 'Longitude'> {
  lst_mod_dt: Date;
  latitude: number | null;
  longitude: number | null;
  parsedDate: Date;
  agentEmail: string;
  agentName: string;
}

/**
 * Analysis status types
 */
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Time period options for analysis
 */
export type TimePeriod = 'complete' | 'monthly' | 'weekly' | 'custom';

/**
 * Agent validation result
 */
export interface AgentValidation {
  poleNumber: string;
  fieldAgentName: string;
  lstModBy: string;
  isValid: boolean;
  mismatchReason?: string;
}
