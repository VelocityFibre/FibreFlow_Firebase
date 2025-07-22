# OneMap Processing Database Options

*Created: 2025-07-21*

## Overview

We need a separate processing database to:
1. Import 1Map CSV data safely
2. Process and validate before touching live FibreFlow
3. Handle schema changes without affecting production
4. Generate change reports
5. Only sync approved changes to live database

## Option 1: SQLite (Local Processing) ✅ RECOMMENDED

### Pros
- Completely isolated from production
- No Firebase quotas/costs
- Fast local processing
- Easy schema changes
- Perfect for CSV data
- Can run complex SQL queries

### Cons
- Need to manage local file
- No real-time sync
- Manual backup needed

### Implementation
```bash
# Create SQLite database locally
OneMap/processing-db/onemap-processing.db
```

## Option 2: Separate Firebase Project

### Pros
- Complete isolation
- Same tools/APIs
- Cloud-based
- Real-time capabilities

### Cons
- Need new Firebase project
- Additional costs
- More complex setup
- Overkill for processing

### Implementation
```
Project: fibreflow-onemap-staging
Database: Firestore in staging project
```

## Option 3: PostgreSQL (Local/Docker)

### Pros
- Full SQL capabilities
- Complex queries
- Data integrity
- Professional grade

### Cons
- Requires PostgreSQL setup
- More complex than needed
- Overhead for simple sync

## Option 4: Simple JSON Files

### Pros
- Simplest approach
- No database needed
- Version control friendly
- Easy to inspect

### Cons
- Limited query capability
- Memory constraints for large files
- No concurrent access

### Implementation
```
OneMap/processing-data/
├── imports/
│   ├── 2025-07-21_001.json
│   └── 2025-07-21_002.json
└── staging/
    └── current-staging.json
```

## Recommendation: Start with SQLite

1. **Immediate Benefits**
   - Works offline
   - No setup required
   - Perfect for CSV processing
   - Can migrate later if needed

2. **Simple Workflow**
   ```
   CSV → SQLite → Validate → Report → Approve → Sync to Firebase
   ```

3. **Future Migration Path**
   - SQLite → PostgreSQL (if need more power)
   - SQLite → Firebase (if need cloud processing)

## Next Steps

Would you like me to:
1. Set up SQLite processing database?
2. Create a separate Firebase project?
3. Use simple JSON file approach?
4. Set up PostgreSQL?

The SQLite approach seems best for your use case - completely isolated, no risk to production, and perfect for CSV processing. What do you think?