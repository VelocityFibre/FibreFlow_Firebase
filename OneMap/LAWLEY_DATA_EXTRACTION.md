# Lawley Data Extraction Documentation

Date Created: 2025-01-16

## Overview

This suite of Python scripts extracts specific fields from Lawley Pole and Drop CSV files, applies transformations, and validates relationships between poles and drops.

## Scripts

### 1. `extract_lawley_poles.py`
Extracts pole data from the Lawley Pole CSV file.

**Input**: `/home/ldp/Downloads/Lawley Pole (CSV).csv`  
**Output**: 
- `output/lawley-poles-extracted.json`
- `output/lawley-poles-extracted.csv`

**Fields Extracted**:
- `poleId` (from label_1) - Pole identifier
- `height` (from dim1) - Pole height (e.g., "7m")
- `diameter` (from dim2) - Pole diameter (e.g., "140-160mm")
- `status` - Permission status
- `latitude` (from lat) - Pole GPS latitude
- `longitude` (from lon) - Pole GPS longitude
- `ponNumber` (from pon_no) - PON identifier
- `zoneNumber` (from zone_no) - Zone identifier

**Transformations Applied**:
- `poleType` - Classified as "feeder" (140-160mm) or "distribution" (120-140mm)
- `heightNumeric` - Numeric value extracted from height
- `connectedDrops` - Empty array (populated by validation script)
- `dropCount` - Set to 0 (updated by validation script)

### 2. `extract_lawley_drops.py`
Extracts drop cable data from the Lawley Drops CSV file.

**Input**: `/home/ldp/Downloads/Lawley Drops (CSV).csv`  
**Output**:
- `output/lawley-drops-extracted.json`
- `output/lawley-drops-extracted.csv`

**Fields Extracted**:
- `dropId` (from label) - Drop identifier
- `poleReference` (from strtfeat) - Reference to connected pole
- `ontReference` (from endfeat) - ONT reference (NULL for spares)
- `cableLength` (from dim2) - Cable length (e.g., "40m")
- `ponNumber` (from pon_no) - PON identifier
- `zoneNumber` (from zone_no) - Zone identifier
- `latitude` (from lat) - Drop/house GPS latitude
- `longitude` (from lon) - Drop/house GPS longitude
- `dateCreated` (from datecrtd) - Creation timestamp
- `createdBy` (from crtdby) - Creator identifier

**Transformations Applied**:
- `isSpare` - TRUE if endfeat is empty (spare drop)
- `cableLengthNumeric` - Numeric value extracted from cable length
- Date parsing to ISO format

### 3. `validate_pole_drop_relationships.py`
Validates relationships between poles and drops.

**Input**:
- `output/lawley-poles-extracted.json`
- `output/lawley-drops-extracted.json`

**Output**:
- `output/relationship-validation-report.json`
- `output/poles-with-drops.json`

**Validations Performed**:
- Verifies all drop pole references exist
- Checks pole capacity limits (max 12 drops per pole)
- Identifies orphaned drops (referencing non-existent poles)
- Updates pole records with connected drops
- Calculates drop counts per pole

## Usage

### Step 1: Extract Pole Data
```bash
cd /home/ldp/VF/Apps/FibreFlow/OneMap
python3 extract_lawley_poles.py
```

Expected output:
```
Starting Lawley Poles extraction...
Found X columns in CSV
Valid poles extracted: Y
Pole Types:
  - Feeder poles: A
  - Distribution poles: B
```

### Step 2: Extract Drop Data
```bash
python3 extract_lawley_drops.py
```

Expected output:
```
Starting Lawley Drops extraction...
Valid drops extracted: Y
Drop Types:
  - Active drops: A
  - Spare drops: B
Unique poles referenced: C
```

### Step 3: Validate Relationships
```bash
python3 validate_pole_drop_relationships.py
```

Expected output:
```
Starting Pole-Drop Relationship Validation...
Poles with drops: X
Orphaned drops: Y
Poles at/over capacity: Z
```

## Output Files

### JSON Format
The JSON files contain:
- `extractionDate` - When the extraction was performed
- `sourceFile` - Original CSV file path
- `statistics` - Summary statistics
- `poles`/`drops` - Array of extracted records
- `errors` - Any extraction errors encountered

### CSV Format
Simple flat file format with headers matching the JSON field names.

### Validation Report
The validation report includes:
- Overall statistics
- List of orphaned drops
- Capacity warnings and errors
- Top poles by drop count
- Summary by pole type

## Data Integrity Rules

1. **Pole Number Uniqueness**: Each pole ID must be unique
2. **Drop Number Uniqueness**: Each drop ID must be unique
3. **Pole Capacity**: Maximum 12 drops per pole (physical cable limit)
4. **Relationship Integrity**: Every drop must reference an existing pole
5. **GPS Distinction**:
   - Pole GPS = Physical pole location
   - Drop GPS = Customer/house location (often NULL)

## Transformations Applied

### Pole Type Classification
- Diameter "140-160mm" → Type: "feeder"
- Diameter "120-140mm" → Type: "distribution"
- Other → Type: "unknown"

### Spare Drop Detection
- If `endfeat` (ONT reference) is empty → `isSpare: true`
- Otherwise → `isSpare: false`

### Numeric Extraction
- "7m" → 7.0
- "40m" → 40.0
- "140-160mm" → Kept as string (used for classification)

## Error Handling

The scripts handle:
- Missing input files
- Malformed CSV data
- Invalid field values
- Missing required fields
- Data type conversions

All errors are logged and included in the output JSON files.

## Expected Data Volumes

Based on the prompt specifications:
- Poles: ~4,471 (2,110 feeder + 2,361 distribution)
- Drops: ~23,708 (20,109 active + 3,599 spares)
- PONs: 212 across 20 zones

## Notes

1. The scripts preserve all original data in JSON format for reference
2. GPS coordinates are often NULL in drop data (this is expected)
3. PON and Zone numbers can be the same for multiple poles/drops
4. The validation script must be run after both extraction scripts
5. All scripts use Python 3 standard library (no external dependencies)

## Troubleshooting

### "File not found" Error
- Ensure CSV files are in `/home/ldp/Downloads/`
- Check file names match exactly (including spaces)

### "Insufficient columns" Error
- CSV may have different delimiter
- Check if CSV is properly formatted

### High Number of Orphaned Drops
- Pole CSV may be incomplete
- Check pole ID format consistency between files

### Capacity Warnings
- Normal if poles have many drops
- Review poles exceeding 12 drops for data accuracy