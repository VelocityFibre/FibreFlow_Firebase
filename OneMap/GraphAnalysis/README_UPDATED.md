# OneMap Graph Analysis System

*Last Updated: 2025-07-23*  
*Status: ✅ Integrated with CSV Processing Breakthrough*

## Overview

The Graph Analysis system provides relationship-aware duplicate detection and change tracking for OneMap data. It complements the CSV-first processing breakthrough with deeper insights into data relationships.

## 🚀 Integration with CSV Processing (NEW)

Our CSV processing breakthrough (100-1000x faster than Firebase) is the PRIMARY method. Graph analysis is used for:
- **Relationship validation** when CSV comparison finds anomalies
- **Complex duplicate detection** that simple field matching misses
- **Weekly quality checks** to understand data patterns
- **Payment verification** to catch agent conflicts

## Quick Start

### 1. Test with Sample Data
```bash
cd OneMap/GraphAnalysis
node quick-test.js
```

### 2. Analyze Real CSV
```bash
node quick-test.js "../downloads/your-file.csv"
```

### 3. Enhanced Daily Comparison
```bash
cd OneMap
node enhanced-daily-compare.js yesterday.csv today.csv
```

## Directory Structure

```
GraphAnalysis/
├── README.md                          # This file
├── docs/                              # NEW: Documentation
│   ├── INTEGRATION_WITH_CSV.md        # How to use with CSV workflow
│   ├── DAILY_COMPARISON_GUIDE.md      # Daily workflow enhancement
│   └── INTEGRATION_EXAMPLES.md        # Practical examples
├── processors/                        # Data processing
│   ├── extract-relationships.js       # Extract entities & relationships
│   ├── build-graph.js                 # Build graph structure
│   └── track-daily-changes.js         # Track changes over time
├── analyzers/                         # Analysis tools
│   ├── find-duplicates.js             # Duplicate detection
│   └── track-multi-day-changes.js     # Multi-day analysis
├── validators/                        # Data validation
├── data/                              # Generated data
│   ├── relationships/                 # Extracted relationships
│   ├── graphs/                        # Built graphs
│   └── indices/                       # Search indices
├── reports/                           # Generated reports
├── quick-test.js                      # Easy testing
├── integrate-with-onemap.js           # OneMap integration
└── test-graph-integration.js          # Integration tests
```

## When to Use Each Approach

| Task | CSV-Only | Graph-Enhanced | Performance |
|------|----------|---------------|-------------|
| Daily new records | ✅ | ❌ | 2 seconds |
| Field changes | ✅ | ❌ | 2 seconds |
| Pole conflicts | ❌ | ✅ | 10 seconds |
| Agent verification | ❌ | ✅ | 10 seconds |
| Quality checks | ❌ | ✅ | 15 seconds |

## Integration Examples

### 1. Enhanced CSV Comparison
```javascript
const { enhancedDailyCompare } = require('./enhanced-daily-compare');

// Combines fast CSV comparison with relationship validation
const results = await enhancedDailyCompare('yesterday.csv', 'today.csv');
```

### 2. Weekly Quality Check
```bash
# Your fast daily processing (keep this!)
node compare-split-csvs.js day1/ day2/

# Weekly relationship validation
cd GraphAnalysis
node quick-test.js ../downloads/latest.csv
```

### 3. Payment Verification
```bash
# Before processing payments
cd GraphAnalysis
node analyzers/find-duplicates.js
# Review reports/ for agent conflicts
```

## Key Insights from Graph Analysis

### 1. Relationship Understanding
- Which poles serve which addresses
- Which agents claim which poles
- How properties connect to infrastructure

### 2. Conflict Detection
- Poles appearing at multiple addresses
- Multiple agents claiming same pole
- Impossible relationships in data

### 3. Data Quality
- Missing relationships
- Inconsistent connections
- Evolution of relationships over time

## Performance Guidelines

- **Daily routine**: Use CSV-only (blazing fast)
- **Quality checks**: Add graph analysis weekly
- **Critical decisions**: Full graph analysis
- **Problem investigation**: Graphs show relationships

The CSV breakthrough remains the foundation - graphs add intelligence when needed!

## Related Documentation

- `../BREAKTHROUGH_NOTE_2025-07-23.md` - CSV processing breakthrough
- `../CSV_FIRST_ARCHITECTURE.md` - Primary processing approach
- `docs/INTEGRATION_WITH_CSV.md` - How to combine both systems
- `HOW_TO_TEST_AND_USE_GRAPH_ANALYSIS.md` - Original testing guide