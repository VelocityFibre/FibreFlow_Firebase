# Graph-Based Analysis Integration Plan for OneMap

*Created: 2025-01-23*

## Overview

This document outlines the integration of graph-based techniques into the OneMap CSV processing system to improve duplicate detection, relationship tracking, and complex querying capabilities.

## Problem Statement

Current OneMap processing handles CSV data linearly, missing important relationships between:
- Poles and their drops (1:12 relationship)
- Addresses and their evolution to pole assignments
- Properties tracked across multiple stages
- Duplicate entries across different time periods

## Solution: Lightweight Graph Layer

Instead of replacing our existing system, we'll add a graph analysis layer that:
1. Extracts relationships during CSV processing
2. Stores them as JSON graph structures
3. Enables advanced querying and validation

## Architecture

### Directory Structure
```
OneMap/
├── GraphAnalysis/              # New graph analysis module
│   ├── data/                   # Generated graph data
│   │   ├── relationships/      # JSON relationship files
│   │   ├── graphs/            # Complete graph structures
│   │   └── indices/           # Quick lookup indices
│   ├── processors/            # Graph processing scripts
│   ├── analyzers/             # Analysis tools
│   ├── validators/            # Graph-based validation
│   └── reports/               # Graph analysis reports
```

### Core Components

1. **Relationship Extractor**
   - Processes CSV data to identify relationships
   - Creates node and edge structures
   - Maintains relationship history

2. **Graph Builder**
   - Assembles individual relationships into connected graphs
   - Handles incremental updates from daily CSVs
   - Manages graph versioning

3. **Graph Analyzer**
   - Duplicate detection using relationship patterns
   - Capacity validation (pole drop limits)
   - Complex query support

4. **Graph Validator**
   - Enforces business rules using graph structure
   - Identifies orphaned entities
   - Validates relationship integrity

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Create directory structure
- Build relationship extractor
- Generate first JSON relationship files
- Test with existing CSV data

### Phase 2: Graph Building (Week 2)
- Implement graph assembly from relationships
- Add incremental update capability
- Create graph persistence layer
- Build basic visualization

### Phase 3: Analysis Tools (Week 3)
- Implement duplicate detection algorithm
- Add capacity validation
- Create relationship queries
- Build reporting tools

### Phase 4: Integration (Week 4)
- Connect to existing OneMap workflows
- Add graph validation to imports
- Create unified reporting
- Performance optimization

## Data Structures

### Node Structure
```json
{
  "id": "unique_identifier",
  "type": "pole|drop|address|property",
  "attributes": {
    "poleNumber": "LAW.P.B167",
    "address": "74 Market St",
    "timestamp": "2025-01-23T10:00:00Z",
    "source": "CSV_2025_01_23"
  },
  "metadata": {
    "firstSeen": "2025-01-20",
    "lastUpdated": "2025-01-23",
    "updateCount": 3
  }
}
```

### Edge Structure
```json
{
  "id": "edge_unique_id",
  "type": "serves|located_at|evolves_to|assigned_to",
  "source": "node_id_1",
  "target": "node_id_2",
  "attributes": {
    "createdDate": "2025-01-23",
    "confidence": 0.95,
    "source": "CSV_import"
  }
}
```

### Graph Structure
```json
{
  "graphId": "onemap_graph_2025_01_23",
  "version": "1.0",
  "created": "2025-01-23T10:00:00Z",
  "nodes": [],
  "edges": [],
  "statistics": {
    "nodeCount": 5287,
    "edgeCount": 8932,
    "components": 234
  }
}
```

## Key Benefits

1. **Duplicate Detection**
   - Track same pole across multiple CSV imports
   - Identify merged/split entities
   - Maintain accurate counts

2. **Relationship Validation**
   - Enforce 12-drop pole limit
   - Validate pole-drop assignments
   - Ensure data integrity

3. **Complex Queries**
   - "Find all drops without pole assignments"
   - "Show pole assignment progression over time"
   - "Identify contractor performance patterns"

4. **Historical Tracking**
   - See entity evolution
   - Track relationship changes
   - Audit data lineage

## Integration Points

### With Existing OneMap
- Enhance `process-1map-sync-simple.js` with relationship extraction
- Add graph validation to `import-csv-efficient.js`
- Extend reporting in `generate-import-report.js`

### With Planned Analytics
- Provide graph data to pole analytics module
- Enable multi-hop queries
- Support complex aggregations

## Success Metrics

- Reduce duplicate entries by 90%
- Validate 100% of pole-drop relationships
- Enable 10+ new analytical queries
- Maintain <5 second processing time for 10k records

## Next Steps

1. Create GraphAnalysis directory structure
2. Build relationship extractor prototype
3. Test with sample CSV data
4. Generate first relationship JSON files
5. Document findings and iterate