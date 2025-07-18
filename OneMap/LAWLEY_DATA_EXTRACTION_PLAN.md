# Lawley Data Extraction Plan
Date: 2025-01-16

## Overview
Extract specific fields from Lawley Pole and Drop CSV files based on the prompt requirements, with proper transformations and relationship validation.

## User Requirements Summary

### Output Formats
- ✅ JSON file
- ✅ CSV file with only required fields
- ❌ Direct Firebase import (maybe later after validation)

### Data Sources
1. **Poles CSV**: `/home/ldp/Downloads/Lawley Pole (CSV).csv`
2. **Drops CSV**: `/home/ldp/Downloads/Lawley Drops (CSV).csv`

### Required Fields

#### Poles (7 fields + transformations)
- `label_1` → poleId (Pole ID - PRIMARY KEY)
- `dim1` → height (e.g., "7m")
- `dim2` → diameter (e.g., "140-160mm")
- `status` → status (Permission status)
- `lat` → latitude (Pole GPS location)
- `lon` → longitude (Pole GPS location)
- `pon_no` → ponNumber
- `zone_no` → zoneNumber

**Transformations**:
- Add `poleType`: "feeder" (140-160mm) or "distribution" (120-140mm)
- Add `connectedDrops`: [] (array of connected drop IDs)
- Add `dropCount`: 0 (will be updated during relationship validation)
- Extract numeric values from dimensions

#### Drops (9 fields + transformations)
- `label` → dropId (Drop ID - PRIMARY KEY)
- `strtfeat` → poleReference (Source pole ID - FOREIGN KEY)
- `endfeat` → ontReference (ONT reference - NULL for spares)
- `dim2` → cableLength (Distance from pole to house)
- `pon_no` → ponNumber
- `zone_no` → zoneNumber
- `lat` → latitude (Drop/house GPS location - often NULL)
- `lon` → longitude (Drop/house GPS location - often NULL)
- `datecrtd` → dateCreated
- `crtdby` → createdBy

**Transformations**:
- Add `isSpare`: true if endfeat is empty/NULL
- Extract numeric cable length (e.g., "40m" → 40)
- Parse and validate dates
- Validate pole reference exists

### Important Relationships & Rules
1. **Drops → Poles**: Many-to-one relationship via strtfeat → label_1
2. **Pole Capacity**: Each pole can have maximum 12 drops (physical limit)
3. **GPS Distinction**:
   - Pole lat/lon = physical pole location
   - Drop lat/lon = customer/house location (often NULL)
4. **PON/Zone**: Can be the same for multiple poles/drops

## Implementation Plan

### Phase 1: Create Extraction Scripts (Python)

#### 1. `extract_lawley_poles.py`
- Read Lawley Pole CSV
- Extract 7 required fields
- Apply transformations (pole type classification)
- Output: 
  - `output/lawley-poles-extracted.json`
  - `output/lawley-poles-extracted.csv`

#### 2. `extract_lawley_drops.py`
- Read Lawley Drops CSV
- Extract 9 required fields
- Apply transformations (spare detection, numeric parsing)
- Output:
  - `output/lawley-drops-extracted.json`
  - `output/lawley-drops-extracted.csv`

### Phase 2: Relationship Validation

#### 3. `validate_pole_drop_relationships.py`
- Load both extracted JSON files
- Validate all drop pole references exist
- Update pole `connectedDrops` arrays
- Update pole `dropCount` fields
- Check pole capacity limits (max 12 drops)
- Output:
  - `output/relationship-validation-report.json`
  - `output/poles-with-drops.json` (updated pole data)

### Phase 3: Documentation

#### 4. `LAWLEY_DATA_EXTRACTION.md`
- Complete documentation of the extraction process
- Field mappings and transformations
- Usage instructions
- Sample outputs

## File Structure
```
OneMap/
├── extract_lawley_poles.py
├── extract_lawley_drops.py
├── validate_pole_drop_relationships.py
├── LAWLEY_DATA_EXTRACTION_PLAN.md (this file)
├── LAWLEY_DATA_EXTRACTION.md (usage documentation)
└── output/
    ├── lawley-poles-extracted.json
    ├── lawley-poles-extracted.csv
    ├── lawley-drops-extracted.json
    ├── lawley-drops-extracted.csv
    ├── relationship-validation-report.json
    └── poles-with-drops.json
```

## Data Validation Rules

### Pole Validation
- Pole ID must start with "LAW.P."
- Diameter must be parseable for type classification
- GPS coordinates should be valid if present

### Drop Validation
- Drop ID must start with "DR"
- Pole reference (strtfeat) must match existing pole
- Date must be parseable
- Cable length should include "m" unit

### Relationship Validation
- Every drop must reference an existing pole
- No pole should have more than 12 drops
- Track orphaned drops (referencing non-existent poles)
- Report capacity warnings (poles approaching 12 drop limit)

## Expected Statistics
Based on prompt information:
- Total drops: ~23,708 (20,109 active + 3,599 spares)
- Total poles: ~4,471 (2,110 feeder + 2,361 distribution)
- PONs: 212 across 20 zones

## Success Criteria
1. All required fields extracted correctly
2. Transformations applied as specified
3. Relationships validated between poles and drops
4. Clear documentation and error reporting
5. Output files in both JSON and CSV formats
6. No data loss during extraction

## Next Steps
1. Review and approve this plan
2. Create extraction scripts following the plan
3. Test with sample data
4. Run full extraction
5. Validate outputs
6. Prepare for potential Firebase import