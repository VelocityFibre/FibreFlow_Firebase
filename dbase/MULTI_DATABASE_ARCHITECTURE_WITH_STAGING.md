# FibreFlow Multi-Database Architecture with Staging Layer

*Last Updated: 2025-01-30*

## 🗺️ Complete Architecture with Staging/Validation Layer

### 📊 Multi-Database Architecture with Staging

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Field App     │         │  OneMap Excel    │         │   SOW Excel      │
│  (GPS + Photos) │         │  (Status Updates)│         │   (Infrastructure│
│                 │         │                  │         │    Planning)     │
└────────┬────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                           │                              │
         │                           │                              │
         └───────────────────────────┴──────────────────────────────┘
                                     │
                                     ↓
                        ┌───────────────────────┐
                        │   STAGING DATABASE    │
                        │                       │
                        │ • Data Validation     │
                        │ • Duplicate Check     │
                        │ • Format Correction  │
                        │ • Conflict Resolution│
                        │ • Quality Gates      │
                        └───────────┬───────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    ↓                                ↓
         ┌─────────────────┐                ┌──────────────────┐
         │    Firebase     │                │      Neon        │
         │                 │                │                  │
         │ • Photos        │                │ • SOW Data       │
         │ • Real GPS      │                │ • Status Updates │
         │ • Field Work    │                │ • Analytics      │
         │ • Offline Queue │                │ • Import History │
         │ • Quality Checks│                │ • Capacity Mgmt  │
         └────────┬────────┘                └────────┬─────────┘
                  │                                   │
                  └──────────────┬────────────────────┘
                                 ↓
                       ┌─────────────────┐
                       │  FibreFlow UI   │
                       │ (Reads Live DBs)│
                       └─────────────────┘
```

---

## 🔄 Staging Layer Details

### Purpose of Staging Database
The staging layer acts as a quality gate for ALL incoming data before it reaches production databases.

### 📱 **Field App → Staging → Firebase**
```
[Offline Capture] → [Staging Queue] → [Validation] → [Firebase Production]
                          ↓
                   [Reject/Fix Queue]
```

**Validation Steps:**
1. **GPS Validation** - Coordinates within project boundaries
2. **Photo Validation** - All 6 required photos present
3. **Pole Number Format** - Matches pattern (e.g., LAW.P.B167)
4. **Duplicate Check** - Pole not already captured
5. **Project Assignment** - Valid project ID
6. **Contractor Validation** - Assigned contractor exists

**Staging Tables:**
```sql
-- Field capture staging
CREATE TABLE staging.field_captures (
  id UUID PRIMARY KEY,
  capture_data JSONB,
  validation_status VARCHAR(50), -- 'pending', 'validated', 'rejected'
  validation_errors JSONB,
  submitted_at TIMESTAMP,
  validated_at TIMESTAMP,
  synced_to_firebase BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP
);
```

### 📊 **OneMap Excel → Staging → Neon**
```
[Excel Upload] → [Parse & Stage] → [Validation] → [Neon Production]
                        ↓
                [Error Report CSV]
```

**Validation Steps:**
1. **Pole Number Exists** - Must match existing pole
2. **Status Transition Valid** - Can't go from "Completed" to "Pending"
3. **Date Validation** - Status date not in future
4. **Property ID Format** - Valid ID format
5. **Duplicate Prevention** - Don't process same status twice

**Staging Tables:**
```sql
-- OneMap staging
CREATE TABLE staging.onemap_imports (
  id UUID PRIMARY KEY,
  batch_id VARCHAR(100),
  row_number INTEGER,
  raw_data JSONB,
  pole_number VARCHAR(50),
  status VARCHAR(100),
  validation_status VARCHAR(50),
  validation_errors JSONB,
  imported_at TIMESTAMP,
  processed_at TIMESTAMP
);
```

### 📋 **SOW Excel → Staging → Neon**
```
[Excel Upload] → [Parse & Stage] → [Validation] → [Neon Production]
                        ↓
                [Validation Report]
```

**Validation Steps:**
1. **Pole Number Uniqueness** - No duplicates in batch
2. **Capacity Rules** - Max 12 drops per pole
3. **GPS Format** - Valid coordinates
4. **Project Validation** - Project exists
5. **Data Completeness** - Required fields present

**Staging Tables:**
```sql
-- SOW staging
CREATE TABLE staging.sow_imports (
  id UUID PRIMARY KEY,
  batch_id VARCHAR(100),
  sheet_name VARCHAR(100), -- 'poles' or 'drops'
  row_number INTEGER,
  raw_data JSONB,
  validation_status VARCHAR(50),
  validation_errors JSONB,
  imported_at TIMESTAMP,
  processed_at TIMESTAMP
);
```

---

## 🛡️ Staging Validation Rules

### Common Validation Framework
```typescript
interface ValidationRule {
  field: string;
  rules: Array<{
    type: 'required' | 'format' | 'unique' | 'exists' | 'range';
    params?: any;
    errorMessage: string;
  }>;
}

// Example for pole validation
const poleValidationRules: ValidationRule[] = [
  {
    field: 'pole_number',
    rules: [
      { type: 'required', errorMessage: 'Pole number is required' },
      { type: 'format', params: /^[A-Z]{3}\.P\.[A-Z]\d+$/, errorMessage: 'Invalid pole number format' },
      { type: 'unique', errorMessage: 'Pole number already exists' }
    ]
  },
  {
    field: 'gps_coordinates',
    rules: [
      { type: 'required', errorMessage: 'GPS coordinates required' },
      { type: 'range', params: { lat: [-35, -22], lon: [16, 33] }, errorMessage: 'Coordinates outside South Africa' }
    ]
  }
];
```

### Conflict Resolution Rules
```typescript
// When same pole has multiple updates
const conflictResolution = {
  status: 'latest_wins',        // Most recent status update wins
  gps: 'field_wins',           // Field GPS overrides planned
  photos: 'merge',             // Combine all photos
  capacity: 'sow_wins',        // SOW defines capacity
  contractor: 'latest_wins'     // Most recent assignment
};
```

---

## 🔄 Data Flow with Staging

### 1. Field App Flow (with Staging)
```
[Mobile App]
    ↓
[Local Queue] (offline support)
    ↓
[Staging API] 
    ↓
[Staging DB] → [Validation Engine]
    ↓                ↓
[Firebase]      [Error Queue]
    ↓
[FibreFlow UI]
```

### 2. Excel Import Flow (with Staging)
```
[Excel Upload]
    ↓
[Parse to Staging]
    ↓
[Batch Validation]
    ↓
[Preview Report] → [User Approval]
    ↓
[Process to Production]
    ↓
[Neon Production Tables]
```

---

## 📊 Staging Dashboard

### Monitoring Views
```sql
-- Pending validations by source
CREATE VIEW staging.pending_summary AS
SELECT 
  'field_capture' as source,
  COUNT(*) as pending_count,
  MIN(submitted_at) as oldest_record
FROM staging.field_captures
WHERE validation_status = 'pending'
UNION ALL
SELECT 
  'onemap_import' as source,
  COUNT(*) as pending_count,
  MIN(imported_at) as oldest_record
FROM staging.onemap_imports
WHERE validation_status = 'pending';

-- Validation error summary
CREATE VIEW staging.error_summary AS
SELECT 
  source,
  validation_errors->>'error_type' as error_type,
  COUNT(*) as error_count
FROM (
  SELECT 'field' as source, validation_errors 
  FROM staging.field_captures 
  WHERE validation_status = 'rejected'
  -- Similar for other staging tables
) errors
GROUP BY source, error_type;
```

---

## ✅ Benefits of Staging Layer

1. **Data Quality** - Nothing bad reaches production
2. **Error Visibility** - Clear view of what failed and why
3. **Batch Processing** - Review before committing
4. **Audit Trail** - Complete history of attempts
5. **Conflict Resolution** - Handle duplicates gracefully
6. **Performance** - Validation doesn't slow production
7. **Recovery** - Can reprocess failed items

---

## 🎯 Implementation Priority

### Phase 1: Excel Imports (Immediate)
- Implement staging for OneMap and SOW Excel imports
- Build validation rules
- Create error reports

### Phase 2: Field App (Next Month)
- Add staging API endpoint
- Update offline sync to use staging
- Build approval dashboard

### Phase 3: Automated Processing (Future)
- Auto-approve high-confidence data
- Machine learning for anomaly detection
- Predictive validation

---

## 🚦 Staging Status Workflow

```
PENDING → VALIDATING → VALIDATED → SYNCING → COMPLETED
           ↓             ↓                      ↓
        REJECTED    REQUIRES_REVIEW         SYNC_FAILED
           ↓             ↓                      ↓
        ERROR_LOG    MANUAL_FIX            RETRY_QUEUE
```

This staging layer ensures data quality across ALL sources while maintaining the clear separation between Firebase (field operations) and Neon (analytics/imports).