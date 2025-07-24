/**
 * Pole Report Model
 * Represents the complete timeline and status data for a pole
 */

export interface PoleReport {
  poleNumber: string;
  generatedAt: Date | string;
  dataSource: 'CSV' | 'Firestore';
  version: 'current' | 'previous';
  
  summary: {
    totalRecords: number;
    totalDrops: number;
    addresses: string[];
    statusCounts: Record<string, number>;
    firstAppearance?: string;
    lastUpdate?: string;
    timeSpan?: number; // days
  };
  
  timeline: PoleTimelineEvent[];
  drops: ConnectedDrop[];
  agents: AgentActivity[];
  
  dataQuality?: DataQualityIssue[];
  gpsCoordinates?: GPSCoordinate[];
}

export interface PoleTimelineEvent {
  date: string;
  time?: string;
  status: string;
  previousStatus?: string;
  propertyId?: string;
  drop?: string;
  agent?: string;
  workflow?: string;
  importBatch?: string;
}

export interface ConnectedDrop {
  dropNumber: string;
  firstConnected: string;
  lastUpdated: string;
  primaryAgent?: string;
  status: string;
  properties: number;
}

export interface AgentActivity {
  agentId: string;
  agentName?: string;
  firstSeen: string;
  lastSeen: string;
  dropsHandled: string[];
  activityLevel: 'high' | 'medium' | 'low';
  totalActivities: number;
}

export interface DataQualityIssue {
  type: 'missing_data' | 'invalid_format' | 'duplicate' | 'conflict';
  field: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  affectedRecords: number;
}

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface PoleReportMetadata {
  poleNumber: string;
  generatedAt: Date;
  reportPath: string;
  version: string;
  dataSource: string;
}

export interface BatchProcessingSummary {
  processedAt: string;
  duration: number; // seconds
  stats: {
    totalPoles: number;
    reportsGenerated: number;
    reportsFailed: number;
    successRate: number; // percentage
  };
}