# Graph RAG Analysis for OneMap Enhancement

*Last Updated: 2025-07-23*

## Executive Summary

Graph RAG (Retrieval-Augmented Generation with Knowledge Graphs) offers a significant enhancement to OneMap's data processing capabilities by transforming relationship-based queries from complex multi-step operations into single, intelligent graph traversals.

## Current OneMap vs Graph RAG Approach

### Current OneMap Architecture
```
CSV Input → Data Cleaning → Firebase Collections → Manual Relationship Logic
```

### Proposed Graph RAG Architecture
```
CSV Input → Data Cleaning → Graph + Firebase → Intelligent Relationship Queries
```

## The Core Problem Graph RAG Solves

### Current Challenge: Complex Relationship Queries
When asking "Show me everything affected if Pole LAW.P.B167 goes down":

**Current Firebase Approach** (4-6 queries):
1. Query poles collection for "LAW.P.B167"
2. Get array of drop references from pole document
3. Query drops collection for each drop ID
4. Query properties collection for each property ID
5. Manual code to assemble relationships
6. Calculate impact in application logic

**Graph RAG Approach** (1 query):
```cypher
MATCH (p:Pole {id: 'LAW.P.B167'})-[:SERVES]->(d:Drop)-[:CONNECTS_TO]->(prop:Property)
RETURN p, d, prop, COUNT(*) as impact_count
```

## Key Benefits for OneMap

### 1. **Intelligent Duplicate Detection**
Current: Text-based comparison
Graph RAG: Relationship-based detection
```
Same pole + same address + same timeframe = likely duplicate
Multiple drops at exact coordinates = investigate
Property ID change but address same = tracked update
```

### 2. **Built-in Constraint Enforcement**
Current: Manual validation in code
Graph RAG: Database-level relationship rules
```
- Maximum 12 drops per pole (enforced automatically)
- One drop per property relationship (prevented at DB level)
- Orphaned drops detection (automatic queries)
```

### 3. **Multi-Hop Impact Analysis**
```
Question: "Which customers are affected by pole maintenance?"
Graph Query: MATCH (p:Pole)-[:SERVES*1..3]->(customer) WHERE p.id = 'LAW.P.B167'
Result: Instant network impact visualization
```

### 4. **Pattern Detection**
- Network topology analysis
- Capacity planning insights  
- Infrastructure vulnerability assessment
- Anomaly detection in relationships

## Implementation Strategy

### Phase 1: Hybrid Approach (Recommended)
**Keep Firebase for:**
- User interface data
- Real-time updates
- Authentication
- File storage
- Simple CRUD operations

**Add Graph Layer for:**
- Relationship analysis
- Complex queries
- Validation rules
- Impact analysis
- Network topology

### Phase 2: Graph Enhancement
```javascript
// Dual-write approach
async function createPole(poleData) {
  // Firebase for UI (existing functionality)
  const firebaseDoc = await addDoc(collection(db, 'poles'), poleData);
  
  // Graph for relationships (new capability)
  await graph.createNode('Pole', {
    firebase_id: firebaseDoc.id,
    pole_number: poleData.pole_number,
    status: poleData.status,
    location: poleData.location
  });
}
```

## OneMap Ontology Definition

### Entities
```typescript
interface OneMapOntology {
  entities: {
    Pole: {
      id: string;           // LAW.P.B167
      status: PermissionStatus;
      location: GeoPoint;
      installed_date?: Date;
    }
    Drop: {
      id: string;           // DR1234
      pole_ref: string;     // Reference to serving pole
      address: string;      // Service address
      status: ConnectionStatus;
    }
    Property: {
      id: string;           // Property ID
      drop_ref: string;     // Connected drop
      owner: string;
      address: string;
    }
    Address: {
      id: string;
      street: string;
      suburb: string;
      coordinates: GeoPoint;
    }
  }
}
```

### Relationships
```typescript
relationships: {
  SERVES: {
    from: 'Pole',
    to: 'Drop',
    constraints: { max_cardinality: 12 }
  },
  CONNECTS_TO: {
    from: 'Drop', 
    to: 'Property',
    constraints: { max_cardinality: 1 }
  },
  LOCATED_AT: {
    from: 'Property',
    to: 'Address',
    constraints: { max_cardinality: 1 }
  }
}
```

## Specific OneMap Use Cases

### 1. **Network Impact Analysis**
```cypher
// Find all affected customers for maintenance
MATCH (p:Pole {id: $pole_id})-[:SERVES]->(d:Drop)-[:CONNECTS_TO]->(prop:Property)
RETURN p.id as pole, COUNT(d) as drops_affected, COLLECT(prop.owner) as customers
```

### 2. **Capacity Planning**
```cypher
// Find poles approaching capacity
MATCH (p:Pole)-[r:SERVES]->(d:Drop)
WITH p, COUNT(r) as drop_count
WHERE drop_count > 10
RETURN p.id, drop_count, (12 - drop_count) as remaining_capacity
```

### 3. **Orphaned Infrastructure Detection**
```cypher
// Find drops not connected to active poles
MATCH (d:Drop) 
WHERE NOT (d)-[:SERVED_BY]->(:Pole {status: 'active'})
RETURN d.id, d.address
```

### 4. **Geographic Clustering**
```cypher
// Find poles serving properties in same area
MATCH (p:Pole)-[:SERVES]->(d:Drop)-[:CONNECTS_TO]->(prop:Property)-[:LOCATED_AT]->(addr:Address)
WHERE addr.suburb = $suburb
RETURN p.id, COUNT(prop) as properties_served
ORDER BY properties_served DESC
```

## Technical Implementation Path

### Option A: Neo4j Integration
- Industry standard graph database
- Cypher query language
- Excellent visualization tools
- Firebase + Neo4j dual-write

### Option B: Firebase + Graph Logic Layer
- Keep existing Firebase
- Add graph relationship tracking
- Implement graph traversal algorithms
- Lower complexity, reduced power

### Option C: Graph-Native Replacement
- Replace Firebase collections with graph structure
- Full graph database implementation
- Maximum query power
- Higher implementation complexity

## Performance Considerations

### Current OneMap Scale
- ~5,000 poles tracked
- ~30,000 drops managed
- Growing 20% annually

### Graph RAG Benefits at Scale
- **Current**: O(n) queries for relationship traversal
- **Graph RAG**: O(1) relationship queries regardless of scale
- **50K+ poles**: Graph approach maintains performance

## ROI Analysis

### Development Investment
- **Time**: 4-6 weeks for hybrid implementation
- **Complexity**: Medium (adding layer, not replacing)
- **Risk**: Low (Firebase remains unchanged)

### Operational Benefits
- **Query Performance**: 10x faster relationship queries
- **Data Quality**: Automatic constraint enforcement
- **Analysis Capability**: Network topology insights
- **Scalability**: Handles growth without performance degradation

## Recommendation

**Implement Phase 1 Hybrid Approach**:
1. Keep existing OneMap Firebase functionality
2. Add graph layer for relationship queries
3. Dual-write approach for new data
4. Migrate analytics to graph queries
5. Evaluate Phase 2 based on results

This approach minimizes risk while providing immediate benefits for complex relationship analysis that OneMap increasingly requires.

## Next Steps

1. **Technical Proof of Concept**: Build small graph representation of sample OneMap data
2. **Performance Testing**: Compare query performance on relationship-heavy operations  
3. **Integration Planning**: Design dual-write architecture
4. **Migration Strategy**: Plan gradual transition of analytics queries

The Graph RAG approach transforms OneMap from a "smart data processor" into an "intelligent network understanding system" - exactly what's needed as the fiber network grows in complexity.