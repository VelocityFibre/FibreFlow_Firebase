# OneMap Data Verification Methods

## 1. Simple Manual Verification

### A. Spot Check Method
```bash
# Pick 5 random Property IDs from June 3rd
# Look them up in June 5th file
# Verify the data matches exactly

# Example:
grep "248629" june3.csv
grep "248629" june5.csv
# Should show identical records
```

### B. Count Verification
```bash
# Count unique Property IDs
cut -d';' -f1 june3.csv | sort -u | wc -l
cut -d';' -f1 june5.csv | sort -u | wc -l

# Count poles
cut -d';' -f9 june3.csv | grep -v "^$" | sort -u | wc -l
cut -d';' -f9 june5.csv | grep -v "^$" | sort -u | wc -l
```

### C. Checksum Verification
Create checksums of our findings:
- Total unique Property IDs
- Total unique Pole Numbers
- Count of each status type

## 2. Automated Verification Script

```javascript
// verify-onemap-analysis.js
const verifyAnalysis = async () => {
  // 1. Load both CSVs
  const june3 = await loadCSV('june3.csv');
  const june5 = await loadCSV('june5.csv');
  
  // 2. Create verification report
  const verification = {
    june3_property_ids: new Set(june3.map(r => r.property_id)).size,
    june5_property_ids: new Set(june5.map(r => r.property_id)).size,
    overlapping_ids: june3.filter(r => june5.some(j5 => j5.property_id === r.property_id)).length,
    unique_poles_june3: new Set(june3.map(r => r.pole_number).filter(Boolean)).size,
    unique_poles_june5: new Set(june5.map(r => r.pole_number).filter(Boolean)).size,
  };
  
  // 3. Save verification report
  fs.writeFileSync('verification-report.json', JSON.stringify(verification, null, 2));
};
```

## 3. Database Verification

After importing to staging:
```sql
-- Count records by import batch
SELECT import_batch_id, COUNT(*) 
FROM onemap_staging 
GROUP BY import_batch_id;

-- Verify no duplicate Property IDs
SELECT property_id, COUNT(*) as count 
FROM onemap_staging 
GROUP BY property_id 
HAVING COUNT(*) > 1;
```

## 4. Business Logic Verification

### Key Metrics to Track:
1. **Poles per day**: Should be 200-400 (not 2000+)
2. **Drops per pole**: Maximum 12 (physical limit)
3. **Status progression**: Should follow logical order
4. **GPS coordinates**: Should be in Lawley area bounds

### Red Flags:
- Same pole with conflicting statuses
- Poles with >12 drops
- GPS coordinates outside expected area
- Approval dates before request dates