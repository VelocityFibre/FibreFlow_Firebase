# SOW Excel Data Analysis

## Excel Files Provided
1. **Lawley Poles.xlsx** - Contains pole infrastructure data
2. **Lawley Drops.xlsx** - Contains home/premises connection data  
3. **Fibre.xlsx** - Contains fiber cable routing data

## Current Data Extraction

### From Lawley Drops.xlsx
Currently extracting:
- `label` → drop_number
- `type` → status  
- `strtfeat` → address
- `endfeat` → pole_number (if contains "P.")
- `dim1/dim2` → distance_to_pole (if numeric)

Additional fields available but not extracted:
- `subtyp` - Subtype classification
- `spec` - Specification details
- `cblcpty` - Cable capacity
- `conntr` - Contractor assignment
- `ntwrkptn` - Network pattern
- `cmpownr` - Component owner

### From Lawley Poles.xlsx
Currently attempting to extract:
- `label` or `label_1` → pole number
- GPS coordinates from numeric columns
- Status information
- PON/Zone numbers

**Issue**: The pole sheet is not being detected correctly, resulting in 0 poles imported.

### From Fibre.xlsx
Currently extracting:
- `label` → segment_id
- `cable size` → fibre_type
- `length` → distance
- `Contractor` → contractor
- `Complete` → completion status
- `Date Comp` → completion date

## Recommendations for Enhanced Data Extraction

### 1. Drop Data Enhancements
Add these fields to the DropImportData model:
```typescript
interface ExtendedDropImportData extends DropImportData {
  subtype?: string;          // From 'subtyp' column
  specification?: string;    // From 'spec' column  
  cableCapacity?: string;    // From 'cblcpty' column
  contractor?: string;       // From 'conntr' column
  networkPattern?: string;   // From 'ntwrkptn' column
  componentOwner?: string;   // From 'cmpownr' column
}
```

### 2. Pole Detection Fix
The pole sheet detection is failing because:
- Headers might not match expected patterns
- Sheet might have a different structure than anticipated
- Need to examine actual header names from console logs

### 3. Data Relationships
- Drops reference poles via `endfeat` field
- Without poles, drops cannot be properly linked
- This creates validation errors as drops reference non-existent poles

### 4. Additional Processing Suggestions
- Extract contractor information for resource planning
- Use cable capacity data for network capacity calculations
- Track component ownership for maintenance responsibility
- Use network pattern for routing optimization

## Next Steps
1. Fix pole sheet detection by examining actual headers
2. Extend data models to capture additional fields
3. Update validation to handle missing pole references gracefully
4. Consider storing extended data for future analytics