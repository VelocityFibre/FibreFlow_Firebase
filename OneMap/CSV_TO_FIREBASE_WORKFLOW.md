# CSV to Firebase Import Workflow Guide

*Last Updated: 2025-01-16*  
*Tested with: Lawley Project (4,468 poles, 23,708 drops)*

## Overview

This guide documents the complete workflow for extracting data from CSV files and importing them to Firebase Firestore for use in the FibreFlow pole tracker UI.

## Prerequisites

- Python 3.x installed
- Node.js installed
- Firebase Admin SDK credentials (`~/.config/gcloud/application_default_credentials.json`)
- Access to FibreFlow Firebase project

## Complete Workflow

### Step 1: CSV Data Extraction

Use the Python extraction scripts in the `OneMap/` directory:

```bash
# Extract poles data
python extract_lawley_poles.py

# Extract drops data
python extract_lawley_drops.py

# Validate and link drops to poles
python validate_pole_drop_relationships.py
```

**Output files**:
- `output/lawley-poles-extracted.json`
- `output/lawley-drops-extracted.json`
- `output/poles-with-drops.json`

### Step 2: Data Validation

Run the validation script to ensure data integrity:

```bash
# Validate extraction results with antiHall
python validate_extraction_results.py
```

This will verify:
- All statistics are accurate
- No data was lost during extraction
- Relationships are properly established
- GPS coverage is correct

### Step 3: CRITICAL - Field Mapping for UI Compatibility

**⚠️ MOST IMPORTANT STEP - This is where we initially had issues!**

The pole tracker UI expects specific fields. During import, ensure ALL these fields are present:

```javascript
// Required fields structure for pole-tracker UI
{
  // Core Identity
  id: docRef.id,                      // Firestore document ID
  vfPoleId: poleNumber,               // Use poleNumber or generate unique
  projectId: "firebase-project-id",    // Get from projects collection
  projectCode: "LAW-001",             // Project code
  poleNumber: "LAW.P.A001",           // From CSV
  
  // Required UI Fields (MUST include these!)
  maxCapacity: 12,                    // Always 12 for poles
  contractorId: null,                 // Or specific contractor ID
  contractorName: null,               // Or contractor name
  workingTeam: "Import Team",         // Default team name
  dateInstalled: Timestamp.now(),     // Installation date
  
  // Upload Tracking Structure (required by UI)
  uploads: {
    before: { uploaded: false },
    front: { uploaded: false },
    side: { uploaded: false },
    depth: { uploaded: false },
    concrete: { uploaded: false },
    compaction: { uploaded: false }
  },
  
  // Quality Tracking
  qualityChecked: false,
  qualityCheckedBy: null,
  qualityCheckedByName: null,
  qualityCheckDate: null,
  qualityCheckNotes: null,
  
  // Timestamps (required)
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: "import-script",
  updatedBy: "import-script",
  
  // Data from CSV extraction
  poleType: "feeder",                 // or "distribution"
  location: {
    latitude: -26.123456,
    longitude: 27.123456
  },
  height: "7m",
  diameter: "140-160mm",
  connectedDrops: ["DR001", "DR002"], // Array of drop IDs
  dropCount: 2,                       // Number of connected drops
  ponNumber: "7",
  zoneNumber: "1",
  status: "planned"                   // or other status
}
```

### Step 4: Firebase Import

Use the Node.js import scripts:

```bash
# For initial import
node import-lawley-to-firebase.js

# For resumed/partial imports
node import-remaining-lawley-data.js

# To check import status
node check-firebase-import-status.js
```

**Important Notes**:
- Import to `planned-poles` collection for planned/future poles
- Import to `pole-trackers` collection for installed poles
- Use batch operations (max 500 per batch)
- Handle batch commit properly by creating new batch after commit

### Step 5: Verification

1. **Check Firebase Console**:
   ```bash
   node check-firebase-import-status.js
   ```

2. **Test simple query**:
   ```bash
   node test-pole-data.js
   ```

3. **Check in UI**:
   - Go to https://fibreflow-73daf.web.app/pole-tracker
   - Select the project from dropdown
   - Verify poles are visible

### Step 6: Create Firestore Indexes (if needed)

If you get index errors, create composite indexes:

1. Go to Firebase Console > Firestore > Indexes
2. Create index for `planned-poles`:
   - Field 1: `projectId` (Ascending)
   - Field 2: `poleNumber` (Ascending)

Or add to `firestore.indexes.json`:
```json
{
  "collectionGroup": "planned-poles",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "projectId", "order": "ASCENDING" },
    { "fieldPath": "poleNumber", "order": "ASCENDING" }
  ]
}
```

## Common Issues and Solutions

### Issue 1: Poles not showing in UI
**Cause**: Missing required fields that UI expects  
**Solution**: Ensure ALL fields listed in Step 3 are included during import

### Issue 2: "Cannot modify a WriteBatch that has been committed"
**Cause**: Reusing batch object after commit  
**Solution**: Create new batch after each commit:
```javascript
await batch.commit();
batch = db.batch(); // Create new batch
batchCount = 0;
```

### Issue 3: Query requires an index
**Cause**: Firestore needs composite index for complex queries  
**Solution**: Create index in Firebase Console or remove ordering temporarily

### Issue 4: Wrong collection name
**Cause**: UI reads from different collection than where data was imported  
**Solution**: Check pole-tracker service for collection names, import to correct collection

## File Structure

```
OneMap/
├── CSV_TO_FIREBASE_WORKFLOW.md (this file)
├── extract_lawley_poles.py
├── extract_lawley_drops.py
├── validate_pole_drop_relationships.py
├── validate_extraction_results.py
├── import-lawley-to-firebase.js
├── import-remaining-lawley-data.js
├── check-firebase-import-status.js
├── test-pole-data.js
├── output/
│   ├── lawley-poles-extracted.json
│   ├── lawley-drops-extracted.json
│   └── poles-with-drops.json
└── logs/
    └── extraction_report_YYYY-MM-DD.md
```

## Key Lessons Learned

1. **Map ALL UI fields during import** - Don't wait until after import
2. **Check collection names** - Ensure importing to correct collection
3. **Validate relationships** - Drops must reference valid poles
4. **Use proper field names** - UI expects specific field names
5. **Include metadata** - Timestamps, IDs, and status fields are required

## Quick Checklist for Future Imports

- [ ] Extract data from CSV files using Python scripts
- [ ] Validate extraction with antiHall pattern
- [ ] Map ALL required UI fields (see Step 3)
- [ ] Get project ID from Firebase
- [ ] Import with proper batch handling
- [ ] Verify in Firebase Console
- [ ] Test in pole tracker UI
- [ ] Create indexes if needed

## Success Metrics

For Lawley project import:
- ✅ 4,468 poles imported successfully
- ✅ 23,708 drops imported and linked
- ✅ 100% data integrity validated
- ✅ All poles visible in UI
- ✅ No post-import fixes needed (when done correctly)

---

**Remember**: The key to success is ensuring ALL UI-required fields are included during the initial import!