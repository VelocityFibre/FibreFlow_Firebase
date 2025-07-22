# Graph-Based Daily CSV Comparison Guide

*Date: 2025-07-23*

## The Challenge
Daily CSV files contain cumulative data (all historical records + new ones). You need to find what actually changed between days, not just what's different.

## How Graph Analysis Enhances Your CSV Comparison

### Your Current CSV Approach (Fast & Simple)
```bash
# Split by status
node split-csv-by-pole.js day1.csv
node split-csv-by-pole.js day2.csv

# Compare
node compare-split-csvs.js day1/ day2/
```

### Enhanced with Graph Analysis (Relationship-Aware)
The graph system adds understanding of **relationships** between entities:
- Which poles serve which addresses
- Which properties connect to which drops
- How entities relate over time

## Integration Approach

### Option 1: Lightweight Integration (Recommended)
Use graphs only for duplicate detection and relationship validation:

```javascript
// In your compare-split-csvs.js, add:
const { GraphBuilder } = require('./GraphAnalysis/graph/GraphBuilder');
const { DuplicateFinder } = require('./GraphAnalysis/analyzers/DuplicateFinder');

async function compareWithGraphValidation(csv1Path, csv2Path) {
  // Your existing CSV comparison
  const day1Records = parseCSV(csv1Path);
  const day2Records = parseCSV(csv2Path);
  
  // Find new records (your existing logic)
  const newRecords = findNewRecords(day1Records, day2Records);
  
  // NEW: Build graph to understand relationships
  const graph = new GraphBuilder();
  
  // Add only new records to graph
  for (const record of newRecords) {
    const entities = extractEntities(record);
    graph.addEntities(entities);
    graph.addRelationships(entities);
  }
  
  // Check for relationship conflicts
  const finder = new DuplicateFinder(graph);
  const conflicts = finder.findDuplicates();
  
  if (conflicts.poles.length > 0) {
    console.warn('⚠️  New records create pole conflicts!');
    // Handle appropriately
  }
  
  return { newRecords, conflicts };
}
```

### Option 2: Full Graph-Based Tracking
Build complete graphs for each day and compare:

```javascript
// New script: graph-daily-compare.js
const { GraphBuilder } = require('./GraphAnalysis/graph/GraphBuilder');
const { GraphComparator } = require('./GraphAnalysis/analyzers/GraphComparator');

async function compareDaily(day1Path, day2Path) {
  // Build graph for each day
  const graph1 = await buildDailyGraph(day1Path);
  const graph2 = await buildDailyGraph(day2Path);
  
  // Compare graphs
  const comparator = new GraphComparator();
  const changes = comparator.compare(graph1, graph2);
  
  return {
    newEntities: changes.added,
    removedEntities: changes.removed,
    changedRelationships: changes.modified
  };
}
```

## Practical Daily Workflow

### Morning Process (with Graph Enhancement)
```bash
# 1. Download today's CSV
node download-from-gdrive.js

# 2. Clean if needed
node fix-csv-parsing.js today.csv

# 3. Split by status (your existing approach)
node split-csv-by-pole.js today.csv

# 4. NEW: Quick graph validation
cd GraphAnalysis
node quick-test.js ../today.csv
# This shows relationship issues immediately

# 5. Compare with yesterday (your existing script)
node compare-split-csvs.js yesterday/ today/

# 6. NEW: Validate new records don't create conflicts
node validate-new-records.js yesterday.csv today.csv
```

## When to Use Graph Analysis

### Use Graphs When:
- You need to understand relationships (which pole serves which address)
- Detecting complex duplicates (same entity, different representations)
- Tracking entity lifecycle (how a property moves through statuses)
- Finding data quality issues (impossible relationships)

### Stick to CSV-Only When:
- Simple new record detection
- Basic field changes
- Performance is critical (graphs add ~10-20% overhead)
- Relationships don't matter for the analysis

## Example: Combining Both Approaches

```javascript
// enhanced-daily-processor.js
async function processDailyWithGraphs(yesterdayPath, todayPath) {
  console.log('Step 1: Fast CSV comparison...');
  const csvChanges = await compareCSVs(yesterdayPath, todayPath);
  
  console.log('Step 2: Graph validation for new records...');
  const graphValidation = await validateWithGraph(csvChanges.newRecords);
  
  console.log('Step 3: Generate enhanced report...');
  const report = {
    summary: csvChanges.summary,
    newRecords: csvChanges.newRecords,
    potentialIssues: graphValidation.conflicts,
    relationshipWarnings: graphValidation.warnings
  };
  
  return report;
}
```

## Performance Considerations

- CSV-only comparison: ~1-2 seconds for 10,000 records
- Graph building: ~5-10 seconds for 10,000 records
- Graph comparison: ~2-3 seconds
- Total with graphs: ~10-15 seconds (still very fast!)

## Recommendation

Start with your existing CSV approach (it's blazing fast!) and add graph analysis only for:
1. Weekly quality checks
2. When you see anomalies
3. Before major data decisions
4. To understand relationship patterns

The graph system is a powerful complement to your CSV processing, not a replacement. Use it when you need deeper insights into relationships and data quality.