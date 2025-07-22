# 1Map Mapping Review vs Live FibreFlow Database

*Created: 2025-07-21*  
*Based on actual FibreFlow pole-tracker.model.ts*

## 🔴 CRITICAL FINDINGS

### Collections Actually Used in FibreFlow:
1. **`pole-trackers`** - Main collection (NOT `pole-tracker` as I had)
2. **`planned-poles`** - For pre-imported poles ✅
3. **`home-signups`** - For drop connections
4. **`homes-connected`** - Connected homes
5. **`homes-activated`** - Activated homes

## Field Mapping Corrections Needed

### ✅ Correct Mappings (Match Live DB)

| 1Map Field | My Mapping | Live DB Field | Status |
|------------|------------|---------------|---------|
| Pole Number | poleNumber | poleNumber | ✅ Correct |
| PONs | pon | pon | ✅ Correct |
| Sections | zone | zone | ✅ Correct |
| Location Address | location | location | ✅ Correct |
| Drop Number | connectedDrops[] | connectedDrops[] | ✅ Correct |

### ❌ Incorrect/Missing Mappings

| 1Map Field | My Mapping | Should Be | Issue |
|------------|------------|-----------|--------|
| - | projectCode | projectCode | ❌ Missing - Extract from pole prefix |
| - | projectName | projectName | ❌ Missing - Need project lookup |
| - | vfPoleId | vfPoleId | ❌ Missing - Auto-generate |
| GPS coords | gpsCoordinates | location (string) | ⚠️ Wrong type - location is string not object |
| - | poleType | poleType (enum) | ❌ Missing - Default needed |
| - | uploads | uploads (object) | ❌ Missing structure |
| Field Agent | contractorName | contractorId + contractorName | ⚠️ Need ID lookup |

### 🔧 Required Field Structure for pole-trackers

```javascript
{
  // REQUIRED Core Identity
  vfPoleId: "LAW.P.A001",        // ❌ Not generating this!
  poleNumber: "LAW.P.A001",       // ✅ Have this
  projectId: "actual-project-id",  // ❌ Need real ID
  projectCode: "LAW",             // ❌ Extract from pole
  
  // REQUIRED Installation  
  dateInstalled: Timestamp,        // ✅ Have this
  location: "GPS string or address", // ⚠️ String not object!
  poleType: "wooden",             // ❌ Need default
  contractorId: "contractor-id",   // ❌ Need lookup
  workingTeam: "Team Name",       // ✅ Can use field agent
  
  // REQUIRED Capacity
  maxCapacity: 12,                // ✅ Setting this
  connectedDrops: [],             // ✅ Have this
  dropCount: 0,                   // ✅ Calculate this
  
  // REQUIRED Uploads Structure
  uploads: {                      // ❌ Missing!
    before: { uploaded: false },
    front: { uploaded: false },
    side: { uploaded: false },
    depth: { uploaded: false },
    concrete: { uploaded: false },
    compaction: { uploaded: false }
  },
  
  // REQUIRED Quality
  qualityChecked: false,          // ✅ Setting this
  
  // REQUIRED Timestamps
  createdAt: serverTimestamp(),   // ✅ Have this
  updatedAt: serverTimestamp()    // ✅ Have this
}
```

## 🛠️ Fixes Needed in sync-to-production.js

### 1. Fix GPS Location Field
```javascript
// WRONG - I had:
gpsCoordinates: {
  lat: data.gpsLatitude,
  lng: data.gpsLongitude
}

// CORRECT - Should be:
location: `${data.gpsLatitude},${data.gpsLongitude}` // String format
// OR
location: data.locationAddress // Use address if available
```

### 2. Generate vfPoleId
```javascript
// Need to call service method or generate:
vfPoleId: await this.generateVFPoleId(projectId)
// OR simpler:
vfPoleId: data.poleNumber // Use same as poleNumber
```

### 3. Extract projectCode
```javascript
projectCode: data.poleNumber?.split('.')[0] || 'LAW'
```

### 4. Set poleType Default
```javascript
poleType: 'wooden' // Or 'concrete' - need business rule
```

### 5. Contractor Lookup
```javascript
// Need to either:
// 1. Create contractor mapping table
// 2. Use field agent name as contractorName
// 3. Use default contractor ID
contractorId: 'default-contractor-id',
contractorName: data.fieldAgentPolePermission || 'Import Team'
```

## 📊 Data Integrity Rules to Enforce

From the actual code, these are CRITICAL:

1. **Pole Number Uniqueness** - Validated across BOTH collections
2. **Drop Number Uniqueness** - Across 3 collections!
3. **Max 12 Drops per Pole** - Physical limit
4. **Pole Must Exist** - Before assigning drops

## 🚨 Collection Name Issue

My script uses wrong collection name:
```javascript
// WRONG
const PRODUCTION_TRACKERS = 'pole-tracker';

// CORRECT 
const PRODUCTION_TRACKERS = 'pole-trackers'; // Note the 's'
```

## Recommended Next Steps

1. **Fix collection name** in sync script
2. **Add missing required fields**
3. **Fix location field type** (string not object)
4. **Add project lookup logic**
5. **Set proper defaults** for poleType
6. **Test with small batch** first

The mappings are mostly correct but missing some critical fields that FibreFlow requires!