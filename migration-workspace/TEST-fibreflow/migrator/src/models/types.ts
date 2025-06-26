export interface MigrationConfig {
  airtableBase: string;
  airtableApiKey: string;
  firebaseProject: string;
  firebaseServiceAccountPath: string;
  mappings: Map<string, TableMapping>;
  batchSize: number;
  retryConfig: RetryConfig;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

export interface TableMapping {
  airtableTable: string;
  airtableTableId: string;
  firebaseCollection: string;
  fieldMappings: FieldMapping[];
  relationships?: RelationshipMapping[];
  calculatedFields?: CalculatedField[];
  skipFields?: string[];
  subcollectionOf?: string;
}

export interface FieldMapping {
  airtableField: string;
  airtableFieldId: string;
  firebaseField: string;
  dataType: DataType;
  transform?: (value: any) => any;
  required?: boolean;
  defaultValue?: any;
}

export type DataType = 'text' | 'number' | 'date' | 'array' | 'object' | 'boolean' | 'timestamp';

export interface RelationshipMapping {
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  airtableField: string;
  airtableFieldId: string;
  targetCollection: string;
  denormalize?: boolean;
  denormalizedFields?: string[];
}

export interface CalculatedField {
  name: string;
  formula: string;
  dependencies: string[];
  calculate: (record: any) => any;
}

export interface MigrationResult {
  success: boolean;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: MigrationError[];
  duration: number;
}

export interface MigrationError {
  recordId: string;
  field?: string;
  error: string;
  timestamp: Date;
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

export interface FirebaseDocument {
  [key: string]: any;
  airtableId: string;
  createdAt: any; // Can be Date or Timestamp
  updatedAt: any; // Can be Date or Timestamp
}