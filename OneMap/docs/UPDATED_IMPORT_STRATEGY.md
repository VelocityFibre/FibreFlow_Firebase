# Updated OneMap Import Strategy

*Updated: 2025-07-22*  
*Based on: Performance analysis and lessons learned*

## New Strategy: CSV-First Processing

### Overview
Process all data locally in CSV format BEFORE touching Firebase. This approach is 100-1000x faster and more reliable.

## Workflow Phases

### Phase 1: Local CSV Processing
1. **Load CSVs** into memory
2. **Compare** multiple CSV files locally
3. **Deduplicate** by Property ID
4. **Track changes** between dates
5. **Generate reports** locally
6. **Create final dataset** for import

### Phase 2: Single Firebase Import
1. **Import once** with clean, deduplicated data
2. **Use Property ID** as document ID
3. **Include metadata** (_source, _status, import_date)
4. **No queries during import** - just write operations

## Implementation Plan

### Daily Import Process
```bash
# 1. Download new CSV
download_latest_csv.sh

# 2. Compare with previous
node compare-csvs-locally.js \
  --previous yesterday.csv \
  --current today.csv \
  --output changes.csv

# 3. Import only changes
node import-changes-to-firebase.js \
  --input changes.csv \
  --collection onemap-data
```

### Benefits Over Previous Approach
| Aspect | Old (Firebase-heavy) | New (CSV-first) |
|--------|---------------------|-----------------|
| Speed | 10-30 minutes | 3-5 seconds |
| Reliability | Frequent timeouts | Always completes |
| Complexity | High (retry logic) | Low (simple loops) |
| Duplicates | Common | Impossible |
| Debugging | Difficult | Easy |

## Scripts to Create

### 1. `compare-csvs-advanced.js`
- Compare multiple CSV files
- Track changes over time
- Generate change summaries
- Output clean datasets

### 2. `import-clean-data.js`
- Import pre-processed CSV to Firebase
- Use Property ID as doc ID
- Add import metadata
- Simple batch writes (no queries)

### 3. `generate-change-reports.js`
- Analyze changes between dates
- Track workflow progression
- Count first instances only
- Export analysis results

## Data Structure

### CSV Processing Output
```javascript
{
  "property_id": "123456",
  "current_data": { /* latest CSV row */ },
  "previous_data": { /* previous CSV row */ },
  "_source": "June 5",
  "_status": "changed", // new|changed|unchanged|deleted
  "_import_date": "2025-07-22",
  "_changes": {
    "status": "old → new",
    "pole": "old → new"
  }
}
```

### Firebase Document
```javascript
// Document ID: property_id (enforces uniqueness)
{
  property_id: "123456",
  current_data: { /* latest record */ },
  history: [
    {
      date: "June 3",
      source: "june3.csv",
      data: { /* snapshot */ }
    },
    {
      date: "June 5", 
      source: "june5.csv",
      data: { /* snapshot */ },
      changes: { /* what changed */ }
    }
  ],
  first_seen: "June 3",
  last_updated: "June 5",
  tracking_key: "pole", // pole|drop|address|property
  tracking_value: "LAW.P.B167"
}
```

## Migration Path

### From Current Messy Staging
1. Export all staging data to CSV
2. Deduplicate locally by Property ID
3. Re-import to new clean collection
4. Delete old staging collection

### OR Start Fresh (Recommended)
1. Use `combined_june3_june5.csv` already generated
2. Import to new collection with proper structure
3. Implement new workflow going forward

## Performance Expectations

### Local CSV Processing
- 10,000 records: ~1 second
- 100,000 records: ~5 seconds
- 1,000,000 records: ~30 seconds

### Firebase Import (Write-only)
- 1,000 records: ~10 seconds
- 10,000 records: ~2 minutes
- No timeout risk with proper batching

## Key Principles

1. **Process locally** - All heavy lifting in CSV
2. **Import once** - Clean data to Firebase
3. **No queries during import** - Write-only operations
4. **Property ID as doc ID** - Enforces uniqueness
5. **Track history in document** - Not by duplicating

## Success Metrics

- ✅ No timeouts
- ✅ No duplicates
- ✅ Processing time < 1 minute
- ✅ 100% data accuracy
- ✅ Easy troubleshooting

## Next Steps

1. Implement `compare-csvs-advanced.js`
2. Create `import-clean-data.js`
3. Test with June 3-5 data
4. Document standard operating procedure
5. Train team on new approach