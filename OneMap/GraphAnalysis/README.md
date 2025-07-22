# OneMap Graph Analysis Module

## Overview

This module adds graph-based analysis capabilities to the OneMap CSV processing system, enabling advanced duplicate detection, relationship tracking, and complex querying.

## Directory Structure

```
GraphAnalysis/
├── data/                    # Generated graph data (git-ignored)
│   ├── relationships/      # Individual relationship JSON files
│   ├── graphs/            # Complete graph structures
│   └── indices/           # Quick lookup indices
├── processors/            # Graph processing scripts
├── analyzers/             # Analysis and query tools
├── validators/            # Graph-based validation
└── reports/              # Analysis reports output
```

## Quick Start

1. **Extract relationships from CSV**:
   ```bash
   node processors/extract-relationships.js ../downloads/your-csv.csv
   ```

2. **Build graph from relationships**:
   ```bash
   node processors/build-graph.js
   ```

3. **Run duplicate analysis**:
   ```bash
   node analyzers/find-duplicates.js
   ```

4. **Validate pole capacity**:
   ```bash
   node validators/validate-pole-capacity.js
   ```

## Core Concepts

### Nodes
- **Pole**: Physical pole with unique ID (e.g., LAW.P.B167)
- **Drop**: Service drop connection (e.g., Drop1234)
- **Address**: Physical location (e.g., 74 Market St)
- **Property**: Property identifier

### Edges (Relationships)
- **serves**: Pole serves Drop
- **located_at**: Entity located at Address
- **evolves_to**: Entity evolution over time
- **assigned_to**: Drop assigned to Pole

### Graph Benefits
1. Track entity relationships across CSV imports
2. Detect duplicates using relationship patterns
3. Validate business rules (12 drops per pole)
4. Enable complex multi-hop queries

## Integration with OneMap

This module enhances existing OneMap processing without replacing it:
- Runs alongside CSV import for relationship extraction
- Provides additional validation layer
- Generates enhanced reports with relationship insights

## Performance

Designed for efficiency:
- Processes 10,000 records in <5 seconds
- Uses JSON for fast read/write
- Incremental updates for daily processing
- Memory-efficient streaming where possible