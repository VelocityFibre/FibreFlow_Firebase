# Change Detection System Explained

*Created: 2025-07-21*

## How Change Detection Works

### Current Implementation

1. **Hash-Based Detection**
   ```javascript
   // For each record, we calculate an MD5 hash
   const hash = crypto.createHash('md5')
     .update(JSON.stringify(record))
     .digest('hex');
   ```

2. **Comparison Process**
   - First import: All records marked as "new"
   - Subsequent imports: Compare hashes
   - If hash changed: Record marked as "updated"
   - If hash same: Record marked as "unchanged"

### Example Scenario

#### Day 1 Import:
```
Property 249111:
- Status: "Pole Permission: Approved"
- Hash: "abc123..."
- Result: NEW RECORD
```

#### Day 2 Import:
```
Property 249111:
- Status: "Home Sign Ups: Approved" ← Changed!
- Hash: "def456..." ← Different!
- Result: UPDATED RECORD
```

### What Triggers "Updated" Status?

ANY change in the record:
- Status changes
- Field agent assignments
- GPS coordinate updates
- New installation data
- Even timestamp changes

### Current Storage

Each record in staging has:
```javascript
{
  // 1Map data
  propertyId: "249111",
  status: "Pole Permission: Approved",
  
  // Change tracking
  _meta: {
    importId: "IMP_2025-07-21_xxx",
    createdAt: Timestamp,
    updatedAt: Timestamp,
    hash: "abc123...",
    previousHash: "xyz789...",
    changeHistory: [
      {
        date: "2025-07-21",
        changes: ["status", "fieldAgent"]
      }
    ]
  }
}
```

## Future Enhancements

### Field-Level Change Detection
Instead of just "record changed", track:
- WHAT fields changed
- Previous vs new values
- Who made the change
- When it changed

### Smart Change Detection
- Ignore irrelevant changes (like timestamps)
- Focus on business-critical fields
- Configurable change rules

### Change Categories
- **Critical**: Pole/drop assignments
- **Important**: Status changes
- **Minor**: Agent notes
- **Ignore**: System timestamps