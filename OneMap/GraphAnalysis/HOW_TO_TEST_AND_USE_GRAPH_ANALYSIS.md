# How to Test and Use Graph Analysis for OneMap

## 🚀 Quick Start - Testing the System

### Option 1: Quick Test (Recommended First)

```bash
# Navigate to GraphAnalysis directory
cd OneMap/GraphAnalysis

# Run the test with your smallest CSV file
node test-graph-integration.js ../downloads/test-10-records.csv

# Or with a real CSV
node test-graph-integration.js "../downloads/june3.csv"
```

### Option 2: Step-by-Step Manual Process

```bash
# 1. Extract relationships from CSV
node processors/extract-relationships.js "../downloads/june3.csv"

# 2. Build the graph
node processors/build-graph.js

# 3. Find duplicates
node analyzers/find-duplicates.js

# 4. Check the reports
ls -la reports/
cat reports/duplicate_summary_*.md
```

### Option 3: Use in Your Existing Scripts

Add this to your existing OneMap processing scripts:

```javascript
// In your existing script (e.g., process-1map-sync-simple.js)
const { extractRelationships, findDuplicatesInCSV } = require('./GraphAnalysis/integrate-with-onemap');

// After your normal CSV processing
const duplicates = await findDuplicatesInCSV(csvPath);
console.log('Found duplicates:', duplicates);
```

## 📊 What You'll See

### 1. Relationship Extraction Output
```
Processing CSV: ../downloads/june3.csv
✅ Relationship extraction complete!
📊 Statistics:
   - Rows processed: 5287
   - Nodes extracted: 3732
   - Edges extracted: 8932
📁 Output saved to: data/relationships/import_2025-01-23T10-30-00.json
🔍 Session ID: import_2025-01-23T10-30-00
```

### 2. Graph Building Output
```
🔨 Building graph in fresh mode...
📁 Found 1 relationship files

✅ Merged: import_2025-01-23T10-30-00.json
   - New/Updated nodes: 3732
   - New/Updated edges: 8932

📊 Calculating graph statistics...

✅ Graph build complete!
📈 Graph Statistics:
   - Total Nodes: 3732
   - Total Edges: 8932
   - Node Types: { pole: 1244, drop: 1244, address: 1244 }
   - Edge Types: { serves: 1244, located_at: 2488, assigned_to: 1244 }
   - Connected Components: 234
   - Average Degree: 4.78
   - Max Drops per Pole: 3

⚠️  WARNING: 2 poles exceed 12-drop capacity!
   - LAW.P.B167: 14 drops
   - LAW.P.B223: 13 drops

📁 Graph saved to: data/graphs/onemap_graph_2025-01-23T10-30-00.json
🔗 Latest link: onemap_graph_latest.json
```

### 3. Duplicate Analysis Output
```
🔍 Searching for duplicates using graph analysis...

📊 POLE duplicates: 23 groups
   Group 1: 3 duplicates
     - LAW.P.B167 (5 updates)
     - LAW.P.B167 (2 updates)
     - LAW.P.B167 (1 updates)
     Reasons: Exact key match, Share 3 drops

📊 DROP duplicates: 45 groups
   Group 1: 2 duplicates
     - DR1234 (3 updates)
     - DR1234 (1 updates)
     Reasons: Exact key match, Share 1 addresses

📊 ADDRESS duplicates: 12 groups
   Group 1: 2 duplicates
     - 74 Market St (3 updates)
     - 74 Market St (1 updates)
     Reasons: Exact key match

📝 Generating report...

✅ Analysis complete!
📊 Detailed report: reports/duplicate_analysis_2025-01-23T10-30-00.json
📄 Summary report: reports/duplicate_summary_2025-01-23T10-30-00.md
```

## 🎯 Real-World Use Cases

### 1. Daily Import Validation
```bash
# Before importing today's CSV
cd OneMap/GraphAnalysis

# Check existing data for duplicates
node analyzers/find-duplicates.js

# Process new CSV and check for conflicts
node processors/extract-relationships.js "../downloads/Lawley July Week 3 16072025.csv"
node processors/build-graph.js incremental  # Add to existing graph
node analyzers/find-duplicates.js

# Review results
cat reports/duplicate_summary_*.md
```

### 2. Pole Capacity Check
```bash
# The system automatically flags poles with >12 drops
# Look for warnings in the graph building output
# Or check the detailed report:
grep -A5 "polesExceedingCapacity" reports/duplicate_analysis_*.json
```

### 3. Find Orphaned Drops
```bash
# Run the integration example which includes orphan detection
node integrate-with-onemap.js
```

### 4. Historical Analysis
```bash
# Process multiple CSVs to see evolution
for csv in ../downloads/*.csv; do
  echo "Processing $csv"
  node processors/extract-relationships.js "$csv"
done

# Build complete graph
node processors/build-graph.js fresh

# Analyze
node analyzers/find-duplicates.js
```

## 📁 Understanding the Output

### Reports Directory Structure
```
reports/
├── duplicate_analysis_2025-01-23T10-30-00.json  # Detailed JSON data
└── duplicate_summary_2025-01-23T10-30-00.md    # Human-readable summary
```

### Sample Summary Report
```markdown
# Duplicate Analysis Report

Generated: 2025-01-23T10:30:00Z
Graph ID: onemap_graph_2025-01-23T10-30-00

## Summary

- Total Nodes: 3732
- Total Edges: 8932
- Duplicate Groups Found:
  - Poles: 23
  - Drops: 45
  - Addresses: 12
  - Properties: 8
- Total Duplicate Nodes: 88

## ⚠️ Violations

### Poles Exceeding 12-Drop Capacity

- **LAW.P.B167**: 14 drops
- **LAW.P.B223**: 13 drops

## Recommendations

- **pole**: Merge duplicate pole records, keeping earliest entry
- **capacity**: 2 poles exceed 12-drop limit. Redistribute drops
```

## 🛠️ Integration with Existing Workflows

### Simple Integration
```javascript
// Add to your existing process-1map-sync-simple.js
const { findDuplicatesInCSV } = require('./GraphAnalysis/integrate-with-onemap');

// After processing CSV
const duplicates = await findDuplicatesInCSV(csvPath);
if (duplicates.poles.length > 0) {
  console.warn(`Found ${duplicates.poles.length} duplicate pole groups!`);
}
```

### Advanced Integration
```javascript
// Full integration with validation
const { EnhancedOneMapProcessor } = require('./GraphAnalysis/integrate-with-onemap');

const processor = new EnhancedOneMapProcessor();
const result = await processor.processWithGraphAnalysis(
  csvPath,
  { incremental: true }
);

if (!result.validationResults.valid) {
  console.error('Validation failed:', result.validationResults.issues);
}
```

## ⚡ Performance Tips

- **Small CSV (< 10K rows)**: Process directly
- **Medium CSV (10K-50K rows)**: Use incremental mode
- **Large CSV (> 50K rows)**: Process in batches
- **Memory issues**: Increase Node heap size
  ```bash
  node --max-old-space-size=4096 processors/extract-relationships.js
  ```

## 🐛 Common Issues

### "No such file or directory"
- Make sure you're in the `GraphAnalysis` directory
- Use proper quotes around file paths with spaces

### "Out of memory"
- Process smaller batches
- Or increase Node memory (see above)

### "No duplicates found" (but you know there are some)
- Check the similarity threshold in `find-duplicates.js`
- Lower from 0.7 to 0.6 for more sensitive detection

## 📈 Next Steps

1. **Test with your real data** - Start with a small CSV
2. **Review the reports** - Understand what duplicates exist
3. **Integrate gradually** - Add to existing scripts bit by bit
4. **Customize rules** - Adjust thresholds and add validations as needed