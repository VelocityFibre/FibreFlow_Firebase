# Column Optimization Guide for OneMap

## Summary: Column Filtering is HIGHLY Beneficial

Removing non-essential columns provides massive benefits:
- **88% reduction** in file size and tokens
- **10x fewer files** to process (15 vs 146)
- **Faster analysis** with all essential data preserved

## Lawley Project Results

### Before Filtering:
- 157 columns
- 11.8M tokens
- Would need 146 files of 100 rows each for AI analysis

### After Filtering (17 essential columns):
- 1.4M tokens (88% reduction!)
- Only 15 files of 1,000 rows each
- Each file ~94K tokens (fits in AI context)

### Essential Columns for Duplicate Detection:

```python
CORE_FIELDS = [
    'Property ID',          # Unique identifier
    'Location Address',     # Primary duplicate key
    'Stand Number',         # Secondary duplicate key
    'Status',              # Workflow stage
    'Pole Number',         # Infrastructure tracking
]

TRACKING_FIELDS = [
    'Survey Date',         # When recorded
    'Field Agent Name',    # Who recorded
    'Latitude',           # GPS validation
    'Longitude',          # GPS validation
]

NETWORK_FIELDS = [
    'Flow Name Groups',    # Network topology
    'Sections',           # Area grouping
    'PONs',              # Network segment
    'Drop Number',        # Connection point
]

AUDIT_FIELDS = [
    'Last Modified Pole Permissions By',
    'Last Modified Pole Permissions Date',
    'Last Modified Home Sign Ups By',
    'Last Modified Home Sign Ups Date',
]
```

## Implementation Strategy

### 1. Pre-Processing Pipeline
```python
def optimize_csv_for_analysis(input_file):
    # Step 1: Filter columns
    filtered_file = filter_essential_columns(input_file)
    
    # Step 2: Split into manageable chunks
    chunks = split_csv(filtered_file, rows=1000)
    
    # Step 3: Process chunks in parallel
    results = parallel_process(chunks)
    
    return merge_results(results)
```

### 2. Dynamic Column Selection
```typescript
interface AnalysisProfile {
  name: string;
  requiredColumns: string[];
  optionalColumns: string[];
}

const ANALYSIS_PROFILES = {
  duplicateDetection: {
    name: 'Duplicate Detection',
    requiredColumns: ['Property ID', 'Location Address', 'Status'],
    optionalColumns: ['Stand Number', 'Pole Number', 'Survey Date']
  },
  networkAnalysis: {
    name: 'Network Analysis',
    requiredColumns: ['PONs', 'Sections', 'Flow Name Groups'],
    optionalColumns: ['Drop Number', 'Pole Number']
  },
  fieldAgentPerformance: {
    name: 'Agent Performance',
    requiredColumns: ['Field Agent Name', 'Survey Date', 'Status'],
    optionalColumns: ['Location Address', 'Property ID']
  }
};
```

### 3. Benefits Comparison

| Approach | Files | Tokens/File | Total Time | Accuracy |
|----------|-------|-------------|------------|----------|
| All Columns | 146 | 80K | Hours | Same |
| Essential Only | 15 | 94K | Minutes | Same |
| Smart Filter | 5-10 | 100-200K | Minutes | Better |

## Best Practices

1. **Always Filter First**
   - Remove columns with <10% data
   - Keep only what's needed for analysis
   - Document removed columns

2. **Profile Your Data**
   ```bash
   python3 filter_essential_columns.py --analyze
   ```

3. **Create Analysis Templates**
   - Duplicate detection: 10-15 columns
   - Status tracking: 5-8 columns
   - Full audit: 20-25 columns

4. **Version Control**
   - Keep original file untouched
   - Name filtered files clearly
   - Track column mappings

## OneMap Integration

```typescript
class CSVOptimizer {
  async processLargeCSV(file: File, analysisType: string) {
    // 1. Detect columns
    const columns = await this.detectColumns(file);
    
    // 2. Get profile
    const profile = ANALYSIS_PROFILES[analysisType];
    
    // 3. Filter columns
    const filtered = await this.filterColumns(file, profile.requiredColumns);
    
    // 4. Estimate tokens
    const tokensPerRow = profile.requiredColumns.length * 50;
    const optimalChunkSize = Math.floor(100000 / tokensPerRow);
    
    // 5. Split and process
    return this.splitAndProcess(filtered, optimalChunkSize);
  }
}
```

## Conclusion

Column filtering is **essential** for large CSV processing:
- Reduces tokens by 80-90%
- Enables larger chunk processing
- Maintains all necessary data
- Dramatically improves performance

Always filter before splitting!