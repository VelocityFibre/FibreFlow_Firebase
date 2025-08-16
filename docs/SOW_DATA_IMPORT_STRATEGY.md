# SOW Data Import Strategy

## Executive Summary
Based on our analysis and discussion, we've decided to use **Neon as the primary data store for SOW data**, with the Firebase app displaying this data through direct queries. This approach leverages Neon's strength for bulk data operations while maintaining Firebase's real-time capabilities for project-specific features.

## Architecture Decision: Neon-First Approach

### Why This Architecture?
1. **SOW = Static Infrastructure Data**
   - One-time import during project setup
   - Rarely changes after initial import
   - No need for real-time sync overhead

2. **Status Updates Flow Through OneMap**
   - 1MapData → Excel → OneMap → Neon
   - Firebase app displays the latest from Neon
   - No duplicate data storage needed

3. **Mixed Data Sources Are Fine**
   - Some fields from Neon (SOW data)
   - Some fields from Firebase (project metadata)
   - Modern apps commonly use multiple data sources

4. **Direct Updates When Needed**
   - Can update Neon directly from Firebase app
   - No complex sync logic required
   - Changes immediately visible

## Current Situation
- Lawley Poles.xlsx not parsing correctly (0 poles imported)
- Lawley Drops.xlsx working (23,708 drops imported)
- Drops reference poles via `strtfeat` field (e.g., "LAW.P.A002")
- Validation fails because drops reference non-existent poles

## Revised Import Process: Single File Sequential Import

### New Import Workflow
1. **File-by-File Import**
   - Process one file at a time
   - Clear instructions for each file type
   - Validation after each import
   - Confirmation before proceeding

2. **Import Order with Validation**
   ```
   Poles.xlsx → Validate → Confirm → 
   Drops.xlsx → Validate → Confirm → 
   Fibre.xlsx → Validate → Confirm → 
   Final Review → Accept → Write to Neon
   ```

3. **Data Requirements Per File**
   - **Poles**: ID, GPS coordinates, status
   - **Drops**: ID, pole reference, address
   - **Fibre**: Segment ID, endpoints, distance

4. **Validation Checks**
   - File format correctness
   - Required fields present
   - Reference integrity
   - No duplicate records

5. **Final Write Protection**
   - All files must pass validation
   - User must explicitly accept
   - Prevents duplicate/corrupted writes
   - Transaction-based import

## Benefits of This Approach

### 1. Data Integrity
- Single source of truth (Neon)
- No sync conflicts
- Consistent data state

### 2. Performance
- Neon optimized for large datasets
- No Firebase document limits
- Efficient queries

### 3. Simplicity
- No complex sync logic
- Direct queries
- Clear data flow

### 4. Flexibility
- Can query Neon directly
- Can update from app
- Can run analytics

## Implementation Details

### Data Flow
```
Excel Files → SOW Import Wizard → Validation → Neon Database
                                                      ↓
Firebase App ← Display Components ← Query Service ← Neon
```

### Query Pattern
```typescript
// In Firebase app service
getSOWData(projectId: string) {
  return this.neonService.query(`
    SELECT * FROM sow_poles 
    WHERE project_id = $1
  `, [projectId]);
}
```

### Update Pattern
```typescript
// Direct update to Neon
updatePoleStatus(poleId: string, status: string) {
  return this.neonService.execute(`
    UPDATE sow_poles 
    SET status = $2, updated_at = NOW()
    WHERE id = $1
  `, [poleId, status]);
}
```

## Migration Plan

### Phase 1: Update Import Process
1. Convert to single-file import
2. Add file-specific validation
3. Implement confirmation steps
4. Add final acceptance step

### Phase 2: Neon Integration
1. Create Neon schema
2. Set up connection service
3. Implement import to Neon
4. Add query methods

### Phase 3: Display Integration
1. Update components to query Neon
2. Handle loading states
3. Cache for performance
4. Test thoroughly

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Network latency to Neon | Implement caching layer |
| Query complexity | Create optimized views |
| Connection failures | Retry logic and fallbacks |
| Data corruption | Transaction-based imports |

## Conclusion

This Neon-first approach provides the best balance of:
- **Simplicity**: No complex sync logic
- **Performance**: Optimized for large datasets
- **Flexibility**: Direct queries and updates
- **Reliability**: Single source of truth

The Firebase app remains the primary interface, but leverages Neon's strengths for data storage and analytics. This architecture supports the natural data flow from OneMap while providing a solid foundation for future growth.