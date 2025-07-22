# OneMap GraphRag Implementation

This folder contains the Graph RAG implementation for enhancing OneMap's relationship-based queries and network analysis capabilities.

## Overview

Graph RAG transforms OneMap from a CSV processor into an intelligent network understanding system by representing fiber optic infrastructure as a knowledge graph with entities (poles, drops, properties) and their relationships.

## Folder Structure

```
GraphRag/
├── README.md                 # This file
├── ontology/                 # Domain-specific relationship definitions
├── implementation/           # Code for graph database integration
├── queries/                  # Common graph queries for OneMap
├── migration/                # Scripts to migrate existing data
├── evaluation/               # Performance testing and validation
└── examples/                 # Sample implementations and demos
```

## Key Concepts

### Entities
- **Pole**: Physical infrastructure (LAW.P.B167)
- **Drop**: Service connections from poles
- **Property**: Customer premises  
- **Address**: Geographic locations

### Relationships
- **SERVES**: Pole → Drop (max 12 per pole)
- **CONNECTS_TO**: Drop → Property (1:1)
- **LOCATED_AT**: Property → Address

## Quick Start

1. **Review Analysis**: Read `../GRAPH_RAG_ANALYSIS.md` for full context
2. **Check Ontology**: See `ontology/onemap-ontology.json` for relationship definitions
3. **Run Examples**: Execute sample queries in `examples/`
4. **Test Performance**: Use evaluation scripts to compare with Firebase queries

## Implementation Status

- [ ] Ontology definition
- [ ] Graph database setup
- [ ] Data migration scripts
- [ ] Query implementation
- [ ] Performance evaluation
- [ ] Integration with existing OneMap

## Related Documentation

- `../GRAPH_RAG_ANALYSIS.md` - Detailed analysis and strategy
- `../ONEMAP_IMPORT_TRACKING_SYSTEM.md` - Current system architecture
- `../CLAUDE.md` - Overall tracking hierarchy context