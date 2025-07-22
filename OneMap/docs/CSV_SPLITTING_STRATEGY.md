# CSV Splitting Strategy - Permissions vs Pole Numbers

*Created: 2025-07-23*

## The Problem
Currently, records are mixed:
- Some have pole numbers (e.g., "LAW.P.B167")
- Some don't have pole numbers yet (early stage permissions)
- This makes tracking complex

## The Solution: Split Processing

### 1. **Pole-Numbered Records** (Has Pole Number)
Records where `Pole Number` field is NOT empty:
- Example: Property at "74 Market St" assigned to pole "LAW.P.B167"
- These are ready for installation tracking
- Can track by pole number

### 2. **Permission Records** (No Pole Number)
Records where `Pole Number` field IS empty:
- Example: Property at "74 Market St" with permission but no pole assigned
- These are early stage approvals
- Must track by Property ID or Address

## Benefits of Splitting

### Simpler Processing
```javascript
// Instead of complex logic:
if (record['Pole Number']) {
  // track by pole
} else if (record['Drop Number']) {
  // track by drop
} else {
  // track by address
}

// We have two simple flows:
// File 1: pole_records.csv - Always has pole numbers
// File 2: permission_records.csv - Never has pole numbers
```

### Cleaner Analysis
- **Pole Records**: Can analyze pole capacity, drops per pole
- **Permission Records**: Can track approval pipeline, conversion rates

### Better Change Tracking
- **Pole Records**: Track installation progress
- **Permission Records**: Track when they get assigned poles

## Implementation Approach

### Step 1: Split Each CSV
```javascript
function splitCSV(records) {
  const poleRecords = [];
  const permissionRecords = [];
  
  records.forEach(record => {
    if (record['Pole Number'] && record['Pole Number'].trim()) {
      poleRecords.push(record);
    } else {
      permissionRecords.push(record);
    }
  });
  
  return {
    poleRecords,      // Has pole numbers
    permissionRecords // No pole numbers (yet)
  };
}
```

### Step 2: Process Separately

#### For Pole Records:
- Track by Pole Number as primary key
- Monitor installation progress
- Check pole capacity (max 12 drops)
- Detect pole conflicts

#### For Permission Records:
- Track by Property ID as primary key
- Monitor approval pipeline
- Track conversion to pole assignment
- Identify bottlenecks

### Step 3: Cross-Reference
Track when permissions become pole assignments:
```javascript
// Day 1: Permission only
permissionRecords: [
  { propertyId: "12345", status: "Permission Approved", poleNumber: "" }
]

// Day 5: Now has pole
poleRecords: [
  { propertyId: "12345", status: "Permission Approved", poleNumber: "LAW.P.B167" }
]

// Analysis: Property 12345 got pole assignment between Day 1-5
```

## File Structure After Split

```
data/
├── 2025-05-22/
│   ├── original.csv
│   ├── pole_records.csv      # 500 records with poles
│   └── permission_records.csv # 246 records without poles
├── 2025-05-23/
│   ├── original.csv
│   ├── pole_records.csv      # 520 records
│   └── permission_records.csv # 226 records
└── ...
```

## Tracking Logic Simplified

### For Pole Records:
```javascript
// Simple - always use pole number
const trackingKey = record['Pole Number'];
```

### For Permission Records:
```javascript
// Simple - always use property ID
const trackingKey = record['Property ID'];
```

## Analytics Benefits

### 1. Pole Utilization
- Which poles are at capacity?
- Average drops per pole
- Geographic distribution

### 2. Permission Pipeline
- How many permissions pending pole assignment?
- Average time to pole assignment
- Conversion rates

### 3. Clear Metrics
- Total permissions (all records)
- Assigned poles (pole records only)
- Pending assignments (permission records only)

## Next Steps

1. Create `split-csv-files.js` script
2. Process all existing CSVs to split them
3. Analyze pole records separately
4. Analyze permission records separately
5. Create cross-reference reports

This makes everything MUCH simpler!