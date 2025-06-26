# Airtable to Firebase Migration Plan

## Overview
This document outlines the comprehensive strategy for migrating data from Airtable to Firebase, creating a data transformation pipeline, and implementing PowerBI integration for the FibreFlow application.

## Current State Analysis
- **FibreFlow**: Angular + Firebase native application
- **Airtable**: External data source (needs integration)
- **PowerBI**: Not currently integrated
- **API Layer**: Basic Cloud Functions exist, no formal REST API

## Migration Architecture

```
Airtable → Migration Tool → Firebase → Cloud Functions API → PowerBI
                                   ↓
                             FibreFlow App
```

## Phase 1: Airtable to Firebase Migration Strategy

### 1.1 Data Assessment
- **Inventory Airtable Tables**
  - ✓ Customers (Complete schema available)
  - ✓ Projects (Complete schema available)
  - ⚠️ Daily Tracker (Schema needed - Priority 1)
  - ⚠️ Staff (Schema needed - Priority 1)
  - ⚠️ Contractors (Schema needed - Priority 1)
  - ⚠️ SHEQ (Schema needed - Priority 2)
  - ⚠️ Issues and Risks (Schema needed - Priority 2)
  - ⚠️ Contacts (Schema needed - Priority 2)
  - ⚠️ Provinces (Schema needed - Priority 3)
  - ⚠️ Weekly Reports (Schema needed - Priority 3)

### 1.2 Migration Tool Development
```typescript
// Migration tool structure
interface MigrationConfig {
  airtableBase: string; // appkYMgaK0cHVu4Zg
  airtableApiKey: string;
  firebaseProject: string;
  mappings: TableMapping[];
  batchSize: number; // Default 100 records
  retryConfig: RetryConfig;
}

interface TableMapping {
  airtableTable: string;
  airtableTableId: string;
  firebaseCollection: string;
  fieldMappings: FieldMapping[];
  transformations?: DataTransformation[];
  relationships?: RelationshipMapping[];
}

interface FieldMapping {
  airtableField: string;
  airtableFieldId: string;
  firebaseField: string;
  dataType: 'text' | 'number' | 'date' | 'array' | 'object' | 'boolean';
  transform?: (value: any) => any;
}

interface RelationshipMapping {
  type: 'one-to-many' | 'many-to-many';
  airtableField: string;
  targetCollection: string;
  denormalize?: boolean;
}
```

### 1.3 Implementation Steps
1. **Create Migration CLI Tool**
   ```bash
   # Project structure
   airtable-firebase-migrator/
   ├── src/
   │   ├── config/
   │   │   ├── airtable.config.ts
   │   │   ├── firebase.config.ts
   │   │   └── mappings/
   │   │       ├── customers.mapping.ts
   │   │       ├── projects.mapping.ts
   │   │       └── index.ts
   │   ├── services/
   │   │   ├── airtable.service.ts
   │   │   ├── firebase.service.ts
   │   │   └── transformation.service.ts
   │   ├── models/
   │   │   └── types.ts
   │   └── cli.ts
   ├── package.json
   └── tsconfig.json
   ```

2. **Data Validation**
   ```typescript
   // Validation rules example
   const projectValidation = {
     'Project Name': { required: true, type: 'string' },
     'Start Date': { required: true, type: 'date', format: 'ISO8601' },
     'Total Homes PO': { required: false, type: 'number', min: 0 },
     'Status': { 
       required: true, 
       type: 'enum',
       values: ['Not Started', 'In Progress', 'Completed', 'On Hold']
     }
   };
   ```

3. **Incremental Migration**
   - Support for delta updates using Airtable's modified time
   - Checkpoint system for resumable migrations
   - Conflict resolution using last-write-wins or merge strategies

### 1.4 Specific Field Mappings (Based on Complete Schema)

#### Customers Collection Mapping
```typescript
const customersMapping: TableMapping = {
  airtableTable: 'Customers',
  airtableTableId: 'tblBgVlK9uNmh71TV',
  firebaseCollection: 'customers',
  fieldMappings: [
    {
      airtableField: 'Client Name',
      airtableFieldId: 'fldAb7I9YEr6TOM9v',
      firebaseField: 'name',
      dataType: 'text'
    },
    {
      airtableField: 'Client Type',
      airtableFieldId: 'fldEmBJuxYviRaYJY',
      firebaseField: 'type',
      dataType: 'text',
      transform: (value) => value?.toLowerCase().replace(/\s+/g, '_')
    },
    {
      airtableField: 'Contact Information',
      airtableFieldId: 'fldpble83gk8cEESr',
      firebaseField: 'contactInfo',
      dataType: 'object',
      transform: (value) => parseContactInfo(value) // Parse multiline text into structured object
    },
    {
      airtableField: 'SLA Terms',
      airtableFieldId: 'fldyBkc5LOlURma8y',
      firebaseField: 'slaTerms',
      dataType: 'text'
    },
    {
      airtableField: 'Total Projects',
      airtableFieldId: 'fldL4yq41QPoGAbAa',
      firebaseField: 'stats.totalProjects',
      dataType: 'number'
    },
    {
      airtableField: 'Active Projects',
      airtableFieldId: 'fldL5a9V8xKIzvBmT',
      firebaseField: 'stats.activeProjects',
      dataType: 'number'
    }
  ],
  relationships: [
    {
      type: 'one-to-many',
      airtableField: 'Assigned Projects',
      airtableFieldId: 'fldKwyqnFSN9XtnZF',
      targetCollection: 'projects',
      denormalize: true
    },
    {
      type: 'one-to-many',
      airtableField: 'WIP Projects',
      airtableFieldId: 'fld1HKan24bNxYZLs',
      targetCollection: 'projects',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'Contacts',
      airtableFieldId: 'fld1ON92phAwKc35O',
      targetCollection: 'contacts',
      denormalize: true
    }
  ],
  skipFields: [
    'Client Summary', // AI-generated field
    'Next Action Recommendation' // AI-generated field
  ]
};
```

#### Projects Collection Mapping
```typescript
const projectsMapping: TableMapping = {
  airtableTable: 'Projects',
  airtableTableId: 'tblXq0RpqQRAjoIe0',
  firebaseCollection: 'projects',
  fieldMappings: [
    // Basic Info
    {
      airtableField: 'Project Name',
      airtableFieldId: 'fldCkRSwvmtDoYoo1',
      firebaseField: 'name',
      dataType: 'text'
    },
    {
      airtableField: 'Status',
      airtableFieldId: 'fldOh9EEk8AngwLpD',
      firebaseField: 'status',
      dataType: 'text'
    },
    {
      airtableField: 'Region',
      airtableFieldId: 'fldKLLcreL05pDooH',
      firebaseField: 'region',
      dataType: 'text'
    },
    // Dates
    {
      airtableField: 'Start Date',
      airtableFieldId: 'flddF1Vtt1c2HO9hU',
      firebaseField: 'startDate',
      dataType: 'date',
      transform: (value) => value ? new Date(value).toISOString() : null
    },
    {
      airtableField: 'Project Duration Mths',
      airtableFieldId: 'fldvGJJhCBxdUCIea',
      firebaseField: 'durationMonths',
      dataType: 'number'
    },
    // BOQ Metrics
    {
      airtableField: 'Total Homes PO',
      airtableFieldId: 'fldWFeOQ4TN4zEyb5',
      firebaseField: 'boq.totalHomes',
      dataType: 'number'
    },
    {
      airtableField: 'Pole Permissions BOQ',
      airtableFieldId: 'fldf4Tf7eHuTD0FfM',
      firebaseField: 'boq.polePermissions',
      dataType: 'number'
    },
    {
      airtableField: 'Trenching BOQ',
      airtableFieldId: 'fldQHVENBnhiuO3rA',
      firebaseField: 'boq.trenching',
      dataType: 'number'
    },
    // Progress Metrics (from rollups)
    {
      airtableField: 'Permissions Complete',
      airtableFieldId: 'fldPS9N80WKQqxNOL',
      firebaseField: 'progress.permissions.complete',
      dataType: 'number'
    },
    {
      airtableField: 'Permissions Missing',
      airtableFieldId: 'fldC4dsE9kUwFb3bv',
      firebaseField: 'progress.permissions.missing',
      dataType: 'number'
    },
    {
      airtableField: 'Permissions Declined',
      airtableFieldId: 'fldiYsOFJIhyE5KCz',
      firebaseField: 'progress.permissions.declined',
      dataType: 'number'
    },
    {
      airtableField: 'Poles Planted',
      airtableFieldId: 'fldXuBW2xuKKHp2nl',
      firebaseField: 'progress.poles.planted',
      dataType: 'number'
    },
    {
      airtableField: 'Home Sign-ups',
      airtableFieldId: 'fldOS96iGowvx9RPJ',
      firebaseField: 'progress.homes.signups',
      dataType: 'number'
    },
    {
      airtableField: 'Home Drops',
      airtableFieldId: 'fldk1VygAlA74lpud',
      firebaseField: 'progress.homes.drops',
      dataType: 'number'
    },
    {
      airtableField: 'Homes Connected',
      airtableFieldId: 'fldG6IwUcf709xGcY',
      firebaseField: 'progress.homes.connected',
      dataType: 'number'
    },
    {
      airtableField: 'Trenching Complete',
      airtableFieldId: 'fldi7Awbd60IAtbqs',
      firebaseField: 'progress.trenching.complete',
      dataType: 'number'
    },
    // Stringing data
    {
      airtableField: 'Stringing 24F',
      airtableFieldId: 'fld3Qtkwd7pvABrKu',
      firebaseField: 'boq.stringing.24F',
      dataType: 'number',
      transform: (value) => parseInt(value) || 0
    },
    {
      airtableField: '24F Complete',
      airtableFieldId: 'fld3s771MBp8XcE5l',
      firebaseField: 'progress.stringing.24F',
      dataType: 'number'
    },
    // SHEQ Status
    {
      airtableField: 'SHEQ Status',
      airtableFieldId: 'fldVLnn1pLHjg5OSq',
      firebaseField: 'sheqStatus',
      dataType: 'text'
    }
  ],
  relationships: [
    {
      type: 'many-to-one',
      airtableField: 'Customer',
      airtableFieldId: 'fldStpnIz7Pvh6kZX',
      targetCollection: 'customers',
      denormalize: true
    },
    {
      type: 'many-to-one',
      airtableField: 'Province',
      airtableFieldId: 'fldQql48fTLQLOIa2',
      targetCollection: 'provinces',
      denormalize: true
    },
    {
      type: 'many-to-one',
      airtableField: 'Regional PM',
      airtableFieldId: 'fldZeRzHNh8V2tHnK',
      targetCollection: 'staff',
      denormalize: true
    },
    {
      type: 'many-to-one',
      airtableField: 'Project Manager',
      airtableFieldId: 'fldf4LJWp8NUwKXi3',
      targetCollection: 'staff',
      denormalize: true
    },
    {
      type: 'one-to-many',
      airtableField: 'Daily Reports',
      airtableFieldId: 'fldth1h3fv5ojX0mw',
      targetCollection: 'dailyProgress',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'Contractors',
      airtableFieldId: 'fldbfMftxixp3LtZV',
      targetCollection: 'contractors',
      denormalize: true
    }
  ],
  calculatedFields: [
    // These formula fields will be calculated in Firebase
    { name: 'endDate', formula: 'startDate + durationMonths' },
    { name: 'permissionsPercentage', formula: 'permissions.complete / permissions.boq' },
    { name: 'polesPercentage', formula: 'poles.planted / poles.boq' },
    { name: 'homesSignupPercentage', formula: 'homes.signups / homes.total' },
    { name: 'stringingPercentage', formula: 'stringing.complete / stringing.boq' }
  ],
  skipFields: [
    'AI Summary', // AI-generated field
    'Next Steps Recommendation', // AI-generated field
    'Auto Project Status' // Formula field
  ]
};
```

#### Daily Tracker Collection Mapping
```typescript
const dailyTrackerMapping: TableMapping = {
  airtableTable: 'Daily Tracker',
  airtableTableId: 'tblkw4um87urFNtrd',
  firebaseCollection: 'dailyProgress',
  fieldMappings: [
    {
      airtableField: 'Date',
      airtableFieldId: 'fldTGwYfWdD0MBaVE',
      firebaseField: 'date',
      dataType: 'date',
      transform: (value) => value ? new Date(value).toISOString() : null
    },
    {
      airtableField: 'Weather Conditions',
      airtableFieldId: 'fldJXflsKxEUwMOxg',
      firebaseField: 'weatherConditions',
      dataType: 'text'
    },
    // Progress metrics
    {
      airtableField: 'Permissions Complete',
      airtableFieldId: 'fldLsGXmOvpUWJu6o',
      firebaseField: 'progress.permissions.complete',
      dataType: 'number'
    },
    {
      airtableField: 'Permissions Missing',
      airtableFieldId: 'fldfUgzaJXJgQFrQC',
      firebaseField: 'progress.permissions.missing',
      dataType: 'number'
    },
    {
      airtableField: 'Permissions Declined',
      airtableFieldId: 'fldm0Wr4rkz9Y7uOa',
      firebaseField: 'progress.permissions.declined',
      dataType: 'number'
    },
    {
      airtableField: 'Poles Planted Today',
      airtableFieldId: 'fld8p5CJsZFo9vSaO',
      firebaseField: 'progress.poles.plantedToday',
      dataType: 'number'
    },
    {
      airtableField: 'Home Sign-Ups',
      airtableFieldId: 'fldWxUKfv2BQJJbvD',
      firebaseField: 'progress.homes.signups',
      dataType: 'number'
    },
    {
      airtableField: 'Home Drops',
      airtableFieldId: 'fldgLhKYYGKRv0hGl',
      firebaseField: 'progress.homes.drops',
      dataType: 'number'
    },
    {
      airtableField: 'Homes Connected',
      airtableFieldId: 'fld6ZIEkD8ghSNrCN',
      firebaseField: 'progress.homes.connected',
      dataType: 'number'
    },
    // Stringing progress
    {
      airtableField: '24F Complete',
      airtableFieldId: 'fldOk5PJoJUVFvluf',
      firebaseField: 'progress.stringing.24F',
      dataType: 'number'
    },
    {
      airtableField: '48F Complete',
      airtableFieldId: 'fldWB9GWxQCr50Ysb',
      firebaseField: 'progress.stringing.48F',
      dataType: 'number'
    },
    {
      airtableField: '96F Complete',
      airtableFieldId: 'fldOxFwYVsQHfRQP5',
      firebaseField: 'progress.stringing.96F',
      dataType: 'number'
    },
    {
      airtableField: '144F Complete',
      airtableFieldId: 'fldEON6Nk3z0O5FQR',
      firebaseField: 'progress.stringing.144F',
      dataType: 'number'
    },
    {
      airtableField: '288F Complete',
      airtableFieldId: 'fldRxAzCaWx1gnHWK',
      firebaseField: 'progress.stringing.288F',
      dataType: 'number'
    },
    {
      airtableField: 'Trenching',
      airtableFieldId: 'fldBKPOb8ckrp3xnf',
      firebaseField: 'progress.trenching',
      dataType: 'number'
    },
    // Teams on site
    {
      airtableField: 'Teams on Site',
      airtableFieldId: 'fldGauvQayMOcgx2e',
      firebaseField: 'teamsOnSite',
      dataType: 'number'
    },
    {
      airtableField: 'People',
      airtableFieldId: 'fldqxUrBr2vUDy9Uo',
      firebaseField: 'peopleCount',
      dataType: 'number'
    },
    // Comments and issues
    {
      airtableField: 'Comments',
      airtableFieldId: 'fldjQRVXi59T09Nbc',
      firebaseField: 'comments',
      dataType: 'text'
    },
    {
      airtableField: 'Health and Safety Issues',
      airtableFieldId: 'fldgSWJOdAT5YdKa4',
      firebaseField: 'healthSafetyIssues',
      dataType: 'text'
    }
  ],
  relationships: [
    {
      type: 'many-to-one',
      airtableField: 'Project',
      airtableFieldId: 'fldq5kUpEu8P0sSFA',
      targetCollection: 'projects',
      denormalize: true
    },
    {
      type: 'many-to-one',
      airtableField: 'Contractor',
      airtableFieldId: 'fld7e5LIBKxXkqOdg',
      targetCollection: 'contractors',
      denormalize: true
    }
  ],
  // Store as subcollection under projects
  subcollectionOf: 'projects'
};
```

#### Staff Collection Mapping
```typescript
const staffMapping: TableMapping = {
  airtableTable: 'Staff',
  airtableTableId: 'tblJKVbss1eljnAWB',
  firebaseCollection: 'staff',
  fieldMappings: [
    {
      airtableField: 'Name',
      airtableFieldId: 'fldSJvRE40J8xJGBH',
      firebaseField: 'name',
      dataType: 'text'
    },
    {
      airtableField: 'Position',
      airtableFieldId: 'fldYz6RlV2bvOQNdF',
      firebaseField: 'position',
      dataType: 'text'
    },
    {
      airtableField: 'Email',
      airtableFieldId: 'fldwwxddxGUEwfqT2',
      firebaseField: 'email',
      dataType: 'text'
    },
    {
      airtableField: 'Phone',
      airtableFieldId: 'fld0M13KQ0BfGYzX7',
      firebaseField: 'phone',
      dataType: 'text'
    },
    {
      airtableField: 'Department',
      airtableFieldId: 'fldZLgA5pJoqcqGH8',
      firebaseField: 'department',
      dataType: 'text'
    },
    {
      airtableField: 'Status',
      airtableFieldId: 'fldOgbQEa3bSFaJCL',
      firebaseField: 'status',
      dataType: 'text'
    },
    {
      airtableField: 'Region',
      airtableFieldId: 'fldgjcUw0LuSR9QyJ',
      firebaseField: 'region',
      dataType: 'text'
    },
    {
      airtableField: 'Start Date',
      airtableFieldId: 'fldWnOuT4ZNUvQBOY',
      firebaseField: 'startDate',
      dataType: 'date',
      transform: (value) => value ? new Date(value).toISOString() : null
    }
  ],
  relationships: [
    {
      type: 'one-to-many',
      airtableField: 'Assigned Projects',
      airtableFieldId: 'fldqvdRXGT08c6xaS',
      targetCollection: 'projects',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'Contacts',
      airtableFieldId: 'fldPCy9e5lkT3fh5E',
      targetCollection: 'contacts',
      denormalize: false
    }
  ]
};
```

#### Contractors Collection Mapping
```typescript
const contractorsMapping: TableMapping = {
  airtableTable: 'Contractors',
  airtableTableId: 'tbl4UwjKR0VcrXYdS',
  firebaseCollection: 'contractors',
  fieldMappings: [
    {
      airtableField: 'Company Registered Name',
      airtableFieldId: 'fldCqPiXC6mT2IY6M',
      firebaseField: 'companyName',
      dataType: 'text'
    },
    {
      airtableField: 'Trading Name',
      airtableFieldId: 'fldHAoO06CgqIUfD7',
      firebaseField: 'tradingName',
      dataType: 'text'
    },
    {
      airtableField: 'Registration Number',
      airtableFieldId: 'fldgKbzZ8pFGQsEqZ',
      firebaseField: 'registrationNumber',
      dataType: 'text'
    },
    {
      airtableField: 'VAT Number',
      airtableFieldId: 'fldMHt49YV6Y0MJU1',
      firebaseField: 'vatNumber',
      dataType: 'text'
    },
    {
      airtableField: 'BEE Level',
      airtableFieldId: 'fld40DbgFoEsE4Vls',
      firebaseField: 'beeLevel',
      dataType: 'text'
    },
    {
      airtableField: 'Status',
      airtableFieldId: 'fldJ6tQm5xCEjT8Jf',
      firebaseField: 'status',
      dataType: 'text'
    },
    {
      airtableField: 'Contractor Type',
      airtableFieldId: 'fldJoRKQQCJA44bD5',
      firebaseField: 'type',
      dataType: 'text'
    },
    {
      airtableField: 'Services Offered',
      airtableFieldId: 'fldYLxBvH8dD3fkTx',
      firebaseField: 'servicesOffered',
      dataType: 'array',
      transform: (value) => value ? value.split(',').map(s => s.trim()) : []
    },
    {
      airtableField: 'Banking Details',
      airtableFieldId: 'fldXdMJTqU1g12tWD',
      firebaseField: 'bankingDetails',
      dataType: 'object',
      transform: (value) => parseBankingDetails(value)
    },
    {
      airtableField: 'Physical Address',
      airtableFieldId: 'fldBEGJdH7hSWhfBP',
      firebaseField: 'physicalAddress',
      dataType: 'text'
    },
    {
      airtableField: 'Rating',
      airtableFieldId: 'fldBtMsX3U0FwsBdS',
      firebaseField: 'rating',
      dataType: 'number'
    }
  ],
  relationships: [
    {
      type: 'many-to-one',
      airtableField: 'Province',
      airtableFieldId: 'fldzUIb9wGyFqhJjv',
      targetCollection: 'provinces',
      denormalize: true
    },
    {
      type: 'many-to-many',
      airtableField: 'Region(s) of Operation',
      airtableFieldId: 'fldJjhHwONhNnJNKA',
      targetCollection: 'provinces',
      denormalize: true
    },
    {
      type: 'many-to-one',
      airtableField: 'Main Contact',
      airtableFieldId: 'fldCOCXXRAx7VFOYa',
      targetCollection: 'contacts',
      denormalize: true
    },
    {
      type: 'one-to-many',
      airtableField: 'Projects',
      airtableFieldId: 'fldIY0d9bLkrGdGiN',
      targetCollection: 'projects',
      denormalize: false
    },
    {
      type: 'one-to-many',
      airtableField: 'SHEQ',
      airtableFieldId: 'fldEjZn8lN0Lq4YdG',
      targetCollection: 'sheq',
      denormalize: false
    }
  ]
};
```

## Phase 2: Data Transformation Pipeline Architecture

### 2.1 Pipeline Components

```typescript
// Pipeline architecture
interface DataPipeline {
  source: DataSource;
  transformations: Transformation[];
  destination: DataDestination;
  schedule?: CronSchedule;
}

interface Transformation {
  type: 'map' | 'filter' | 'aggregate' | 'join';
  config: TransformConfig;
}
```

### 2.2 Cloud Functions Implementation

```javascript
// functions/src/data-pipeline/index.js
exports.runDataPipeline = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    // 1. Fetch from Airtable
    // 2. Apply transformations
    // 3. Update Firebase
    // 4. Trigger PowerBI refresh
  });

exports.transformAirtableData = functions.https
  .onCall(async (data, context) => {
    // On-demand transformation endpoint
  });
```

### 2.3 Transformation Features
- **Field Mapping**: Rename, restructure fields
- **Data Enrichment**: Add calculated fields
- **Aggregations**: Summary statistics
- **Data Cleansing**: Validation, normalization
- **Relationship Resolution**: Convert Airtable links to Firebase references

## Phase 3: Unified PowerBI Integration Solution

### 3.1 API Layer Design

```typescript
// Cloud Functions REST API
interface ApiEndpoints {
  '/api/v1/collections/:collection': 'GET', // List documents
  '/api/v1/collections/:collection/:id': 'GET', // Get document
  '/api/v1/reports/daily-progress': 'GET', // Aggregated data
  '/api/v1/reports/contractor-summary': 'GET', // Summary reports
}
```

### 3.2 PowerBI Connector Implementation

1. **Custom Web Connector**
   ```javascript
   // functions/src/powerbi/connector.js
   exports.powerBiConnector = functions.https
     .onRequest(async (req, res) => {
       // Authentication
       // Data formatting for PowerBI
       // Pagination support
     });
   ```

2. **Data Models for PowerBI**
   - Flattened views of nested data
   - Pre-aggregated datasets
   - Real-time vs batch data options

### 3.3 Security & Authentication
- API key authentication
- OAuth 2.0 integration
- Row-level security mapping
- Rate limiting

### 2.4 Firebase Schema Design

```typescript
// Firebase Collections Structure
interface FirebaseSchema {
  // Main Collections
  customers: {
    [customerId: string]: {
      name: string;
      type: 'fno' | 'municipality' | 'private';
      contactInfo: {
        address: string;
        phone?: string;
        email?: string;
      };
      slaTerms: string;
      stats: {
        totalProjects: number;
        activeProjects: number;
      };
      createdAt: Timestamp;
      updatedAt: Timestamp;
      airtableId: string; // For reference
    }
  };
  
  projects: {
    [projectId: string]: {
      name: string;
      customerId: string;
      customerName: string; // Denormalized
      status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
      region: string;
      province: {
        id: string;
        name: string; // Denormalized
      };
      dates: {
        start: Timestamp;
        durationMonths: number;
        end: Timestamp; // Calculated
      };
      team: {
        regionalPM: {
          id: string;
          name: string; // Denormalized
        };
        projectManager: {
          id: string;
          name: string; // Denormalized
        };
      };
      boq: {
        totalHomes: number;
        polePermissions: number;
        trenching: number;
        stringing: {
          '24F': number;
          '48F': number;
          '96F': number;
          '144F': number;
          '288F': number;
          total: number; // Calculated
        };
      };
      progress: {
        permissions: {
          complete: number;
          missing: number;
          declined: number;
          percentage: number; // Calculated
        };
        poles: {
          planted: number;
          percentage: number; // Calculated
        };
        homes: {
          signups: number;
          drops: number;
          connected: number;
          signupPercentage: number; // Calculated
        };
        stringing: {
          '24F': number;
          '48F': number;
          '96F': number;
          '144F': number;
          '288F': number;
          total: number; // Calculated
          percentage: number; // Calculated
        };
        trenching: {
          complete: number;
          percentage: number; // Calculated
        };
      };
      contractors: [
        {
          id: string;
          name: string; // Denormalized
        }
      ];
      sheqStatus: 'pass' | 'fail' | 'pending';
      createdAt: Timestamp;
      updatedAt: Timestamp;
      airtableId: string;
    }
  };
  
  // Subcollection under projects
  'projects/{projectId}/dailyProgress': {
    [progressId: string]: {
      date: Timestamp;
      contractorId: string;
      contractorName: string; // Denormalized
      weatherConditions: string;
      progress: {
        permissions: {
          complete: number;
          missing: number;
          declined: number;
        };
        poles: {
          plantedToday: number;
        };
        homes: {
          signups: number;
          drops: number;
          connected: number;
        };
        stringing: {
          '24F': number;
          '48F': number;
          '96F': number;
          '144F': number;
          '288F': number;
        };
        trenching: number;
      };
      teams: {
        onSite: number;
        peopleCount: number;
      };
      comments: string;
      healthSafetyIssues: string;
      createdAt: Timestamp;
      airtableId: string;
    }
  };
  
  staff: {
    [staffId: string]: {
      name: string;
      position: string;
      email: string;
      phone: string;
      department: string;
      status: 'active' | 'inactive';
      region: string;
      startDate: Timestamp;
      projectIds: string[]; // References
      createdAt: Timestamp;
      updatedAt: Timestamp;
      airtableId: string;
    }
  };
  
  contractors: {
    [contractorId: string]: {
      companyName: string;
      tradingName: string;
      registrationNumber: string;
      vatNumber: string;
      beeLevel: string;
      status: 'active' | 'inactive' | 'suspended';
      type: string;
      servicesOffered: string[];
      bankingDetails: {
        bankName: string;
        accountName: string;
        accountNumber: string;
        branchCode: string;
      };
      physicalAddress: string;
      province: {
        id: string;
        name: string; // Denormalized
      };
      operatingRegions: string[];
      mainContact: {
        id: string;
        name: string; // Denormalized
        phone: string; // Denormalized
        email: string; // Denormalized
      };
      rating: number;
      projectIds: string[]; // References
      createdAt: Timestamp;
      updatedAt: Timestamp;
      airtableId: string;
    }
  };
}
```

### 2.5 Sample Migration Script with Real Mappings

```typescript
// src/migration/migrate-customers.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Airtable from 'airtable';

const app = initializeApp({
  credential: cert('./service-account.json')
});

const db = getFirestore();
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base('appkYMgaK0cHVu4Zg');

export async function migrateCustomers() {
  const batch = db.batch();
  let processedCount = 0;
  
  await base('Customers').select({
    pageSize: 100
  }).eachPage(async (records, fetchNextPage) => {
    for (const record of records) {
      const customerId = db.collection('customers').doc().id;
      const customerRef = db.collection('customers').doc(customerId);
      
      const customerData = {
        name: record.get('Client Name') || '',
        type: (record.get('Client Type') || '').toLowerCase().replace(/\s+/g, '_'),
        contactInfo: parseContactInfo(record.get('Contact Information')),
        slaTerms: record.get('SLA Terms') || '',
        stats: {
          totalProjects: record.get('Total Projects') || 0,
          activeProjects: record.get('Active Projects') || 0
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        airtableId: record.id
      };
      
      batch.set(customerRef, customerData);
      processedCount++;
      
      // Commit batch every 500 documents
      if (processedCount % 500 === 0) {
        await batch.commit();
        console.log(`Processed ${processedCount} customers...`);
      }
    }
    
    fetchNextPage();
  });
  
  // Commit remaining documents
  await batch.commit();
  console.log(`Migration complete! Total customers: ${processedCount}`);
}

function parseContactInfo(text: string): any {
  // Parse multiline text into structured object
  const lines = (text || '').split('\n');
  const info: any = { address: '' };
  
  lines.forEach(line => {
    if (line.includes('@')) {
      info.email = line.trim();
    } else if (line.match(/\(\d{3}\)\s*\d{3}-\d{4}/)) {
      info.phone = line.trim();
    } else {
      info.address += line + '\n';
    }
  });
  
  info.address = info.address.trim();
  return info;
}
```

## Implementation Roadmap

### Week 1-2: Foundation
- [ ] Gather missing Airtable schema information (Priority 1 tables)
- [ ] Set up migration tool repository
- [ ] Create TypeScript project structure
- [ ] Implement Airtable and Firebase service classes
- [ ] Design comprehensive Firebase schema based on all tables

### Week 3-4: Migration Tool
- [ ] Build field mapping configurations for known tables
- [ ] Implement data transformation functions
- [ ] Create validation framework with error reporting
- [ ] Add relationship resolution logic
- [ ] Test with Customers and Projects tables

### Week 5-6: API Development
- [ ] Design RESTful API structure
- [ ] Implement Cloud Functions endpoints
- [ ] Add authentication layer
- [ ] Create API documentation

### Week 7-8: PowerBI Integration
- [ ] Build PowerBI connector
- [ ] Create data models
- [ ] Implement refresh logic
- [ ] Test end-to-end flow

## Technical Considerations

### Performance Optimization
- Batch processing for large datasets
- Caching strategies
- Indexed queries
- Pagination for API responses

### Error Handling
- Comprehensive logging
- Retry mechanisms
- Dead letter queues
- Monitoring alerts

### Data Consistency
- Transaction support
- Atomic operations
- Eventual consistency handling
- Conflict resolution

## Testing Strategy

### Unit Tests
- Transformation functions
- API endpoints
- Data validation

### Integration Tests
- Airtable to Firebase flow
- API to PowerBI connection
- End-to-end data pipeline

### Performance Tests
- Load testing
- Scalability verification
- Query optimization

## Monitoring & Maintenance

### Metrics to Track
- Migration success rate
- API response times
- Data freshness
- Error rates

### Alerting
- Failed migrations
- API downtime
- Data anomalies
- Performance degradation

## Security Considerations

### Data Protection
- Encryption in transit
- Encryption at rest
- PII handling
- GDPR compliance

### Access Control
- Role-based permissions
- API key management
- Audit logging
- Security monitoring

## Key Decision Points

### 1. Schema Design Decisions
- **Denormalization Strategy**: How much data to duplicate for performance
- **Subcollections vs Top-level**: Daily progress as subcollection or separate
- **Aggregation Storage**: Pre-compute metrics or calculate on-demand

### 2. Migration Approach
- **Big Bang vs Incremental**: Migrate all at once or table by table
- **Dual Write Period**: Keep both systems in sync temporarily
- **Rollback Strategy**: How to revert if issues arise

### 3. API Design for PowerBI
- **REST vs GraphQL**: Which API style for PowerBI consumption
- **Data Format**: JSON structure optimized for PowerBI
- **Caching Strategy**: Redis, Firestore, or Cloud CDN

## Cost Estimation

### Firebase Costs (Monthly Estimate)
- **Firestore**: 
  - 50K daily progress records × 30 days = 1.5M reads/month
  - 10K updates/day × 30 = 300K writes/month
  - Estimated: $500-800/month
- **Cloud Functions**:
  - API calls: 100K/month
  - Migration runs: 24/day
  - Estimated: $200-300/month
- **Storage**: 10GB estimated = $2/month

### Development Resources
- **Initial Development**: 160-200 hours
- **Testing & QA**: 40-60 hours
- **Documentation**: 20 hours
- **Total Estimate**: 220-280 hours × $150/hour = $33,000-42,000

## Success Criteria
- ✓ All Airtable data migrated successfully
- ✓ Zero data loss during migration
- ✓ API response time < 200ms
- ✓ PowerBI dashboards updating hourly
- ✓ 99.9% uptime for API layer
- ✓ Automated error recovery

## Next Steps

### Immediate Actions Required

1. **Gather Missing Schema Information**
   - Use Airtable API to fetch schema for Priority 1 tables:
     ```bash
     # Example API call to get table schema
     curl https://api.airtable.com/v0/meta/bases/appkYMgaK0cHVu4Zg/tables \
       -H "Authorization: Bearer YOUR_API_TOKEN"
     ```
   - Document Daily Tracker, Staff, and Contractors table schemas
   - Update AIRTABLE_API_SCHEMA.md with complete information

2. **Firebase Schema Design**
   ```typescript
   // Proposed Firebase collections structure
   firestore:
     customers/
       {customerId}/
         - name: string
         - type: string
         - contactInfo: object
         - projects: array<projectRef>
         - metadata: object
     
     projects/
       {projectId}/
         - name: string
         - customerId: string
         - status: string
         - dates: { start: timestamp, end: timestamp }
         - metrics: {
             permissions: { boq: number, complete: number },
             poles: { boq: number, planted: number },
             stringing: { [type]: { boq: number, complete: number } },
             homes: { total: number, signups: number, drops: number }
           }
         - team: { regionalPM: staffRef, projectManager: staffRef }
     
     dailyProgress/
       {projectId}/
         {date}/
           - all daily metrics
     
     staff/
       {staffId}/
         - name, role, contact, projects
   ```

3. **Migration Tool MVP**
   - Start with Customers table (simpler structure)
   - Implement basic ETL without relationships
   - Add relationship resolution once working
   - Progress to Projects table with full complexity

4. **Review and Approve**
   - Technical review of proposed architecture
   - Confirm Firebase schema meets app requirements
   - Approve migration approach and timeline