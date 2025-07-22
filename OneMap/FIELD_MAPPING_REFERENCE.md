# 1Map to FibreFlow Field Mapping Reference

*Created: 2025-07-21*  
*Based on actual database schemas*

## Mapping Overview

### Target Collections
1. **`planned-poles`** - For poles in planning/assignment stage
2. **`pole-trackers`** - For installed/active poles

### Decision Logic
```javascript
if (status.includes('Installed') || status.includes('Completed')) {
  → pole-trackers
} else {
  → planned-poles
}
```

## Detailed Field Mappings

### 1Map → planned-poles Collection

| 1Map Field | FibreFlow Field | Notes |
|------------|-----------------|-------|
| Property ID | propertyId | Unique identifier |
| Pole Number | clientPoleNumber | e.g., "LAW.P.B167" |
| Pole Permissions - Actual Device Location (Latitude) | plannedLocation.lat | GPS latitude |
| Pole Permissions - Actual Device Location (Longitude) | plannedLocation.lng | GPS longitude |
| Location Address | plannedLocation.address | Full address |
| Status | status | Mapped to FibreFlow statuses |
| Site | oneMapData.site | Store in metadata |
| PONs | oneMapData.pons | Network info |
| Field Agent Name (pole permission) | oneMapData.fieldAgent | Agent who got permission |
| lst_mod_dt | oneMapData.lastModified | Last update from 1Map |

**Status Mapping**:
- "Pole Permission: Approved" → "planned"
- "Home Sign Ups: Approved" → "assigned"
- "Installation Scheduled" → "in_progress"
- "Home Installation: Installed" → "installed"

### 1Map → pole-trackers Collection

| 1Map Field | FibreFlow Field | Notes |
|------------|-----------------|-------|
| Property ID | propertyId | Reference to 1Map |
| Pole Number | vfPoleId, poleNumber | Both fields use same value |
| PONs | pon | Network identifier |
| Sections | zone | Zone/section info |
| Location Address | location | Address string |
| Pole Permissions GPS | gpsCoordinates.lat/lng | Location object |
| date_status_changed | dateInstalled | Installation date |
| Field Agent Name | contractorName, workingTeam | Contractor info |
| Drop Number | connectedDrops[] | Array of drops |

**Fixed Values for pole-trackers**:
- maxCapacity: 12 (always)
- poleType: "unknown" (needs manual update)
- uploads: All false initially
- qualityChecked: false

### Fields NOT Mapped (Stored in metadata)

These 1Map fields are preserved in `oneMapData` object:
- 1map NAD ID
- Job ID
- Flow Name Groups (workflow history)
- All consent form fields
- Home sign-up details
- Installation specifics
- Quality metrics

### Missing Required Fields

These FibreFlow fields need to be populated separately:
1. **projectId** - Must lookup based on pole prefix
2. **contractorId** - Need contractor database
3. **poleType** - Not in 1Map data
4. **Height/diameter** - Physical specifications
5. **Upload photos** - Added post-import

## Data Validation Rules

### Before Sync
1. **Pole Number** - Must exist and be unique
2. **GPS Coordinates** - Valid South African coordinates
3. **Property ID** - Must be unique
4. **Status** - Must be valid 1Map status

### During Sync
1. **Project Lookup** - Match pole prefix to project
2. **Duplicate Check** - Prevent duplicate poles
3. **Drop Validation** - Max 12 drops per pole
4. **Data Types** - Convert strings to proper types

## Example Transformation

### Input (1Map CSV):
```json
{
  "Property ID": "249111",
  "Pole Number": "LAW.P.B167",
  "Status": "Pole Permission: Approved",
  "Site": "LAWLEY",
  "PONs": "C4P14",
  "Pole Permissions - Actual Device Location (Latitude)": "-26.370471",
  "Field Agent Name (pole permission)": "manuel"
}
```

### Output (planned-poles):
```json
{
  "propertyId": "249111",
  "clientPoleNumber": "LAW.P.B167",
  "plannedLocation": {
    "lat": -26.370471,
    "lng": 27.807768,
    "address": "74 MARKET STREET LAWLEY"
  },
  "projectId": "lawley-project-id",
  "projectCode": "LAW",
  "status": "planned",
  "oneMapData": {
    "site": "LAWLEY",
    "pons": "C4P14",
    "fieldAgent": "manuel"
  },
  "createdAt": "2025-07-21T08:00:00Z"
}
```

## Sync Workflow

1. **Read** from `onemap-processing-staging`
2. **Determine** target collection based on status
3. **Map** fields according to schema above
4. **Validate** required fields
5. **Check** for existing records
6. **Create/Update** in production
7. **Log** all changes

## Important Notes

1. **Incremental Updates** - Only sync changed fields
2. **Preserve User Data** - Never overwrite photos/notes
3. **Audit Trail** - Keep sync history
4. **Error Handling** - Skip invalid records
5. **Dry Run First** - Always test with --dry-run