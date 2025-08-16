# OneMap Integration Strategy

## Overview
OneMap is the external system that provides daily status updates for fiber optic infrastructure. It serves as the bridge between field data collection (1MapData) and our analytics platform (Neon).

## Data Flow Architecture

### Daily Update Flow
```
1MapData (Field Collection)
    ↓ Export
Excel Files (Daily Snapshots)
    ↓ Process
OneMap (Processing System)
    ↓ Import
Neon Database (Analytics & Storage)
    ↓ Query
Firebase App (Display & Interaction)
```

## Strategic Role in FibreFlow

### 1. Status Update Provider
- **Primary Function**: Deliver daily infrastructure status changes
- **Update Types**: Pole status, installation progress, completion states
- **Frequency**: Daily automated updates
- **Data Volume**: Thousands of status changes per day

### 2. Not for Initial Data
- **SOW Import**: Separate one-time process
- **OneMap Focus**: Ongoing operational updates only
- **Clear Separation**: Setup data vs. operational data

## Integration Architecture

### Data Store Decision
After careful analysis, we decided:
- **Neon**: Primary storage for all infrastructure data
- **OneMap**: Updates flow directly to Neon
- **Firebase**: Queries Neon to display current state
- **No Sync**: Eliminates complexity of dual storage

### Why This Architecture?
1. **Single Source of Truth**: Neon holds authoritative data
2. **Natural Flow**: Matches existing OneMap → Neon pipeline
3. **Performance**: PostgreSQL optimized for status queries
4. **Simplicity**: No Firebase-Neon synchronization needed

## Status Update Categories

### Infrastructure Status
- Planning → Approved
- Approved → In Progress
- In Progress → Installed
- Installed → Commissioned
- Various failure/hold states

### Home Connection Status
- Sign Up Requested
- Approved for Installation
- Installation Scheduled
- Installation In Progress
- Installation Complete

### Quality/Compliance Status
- Inspection Pending
- Inspection Passed
- Inspection Failed
- Remediation Required

## Display Strategy in Firebase App

### Query Pattern
```typescript
// Get current status from Neon
getCurrentStatus(poleId: string) {
  return this.neonService.query(`
    SELECT status, updated_at, updated_by
    FROM infrastructure_status
    WHERE pole_id = $1
    ORDER BY updated_at DESC
    LIMIT 1
  `, [poleId]);
}

// Get status history
getStatusHistory(poleId: string) {
  return this.neonService.query(`
    SELECT status, updated_at, notes
    FROM status_history
    WHERE pole_id = $1
    ORDER BY updated_at DESC
  `, [poleId]);
}
```

### Caching Strategy
- Cache current status for 5 minutes
- Invalidate on user action
- Background refresh every hour
- Show loading states during queries

## Benefits of OneMap Integration

### 1. Automated Updates
- No manual data entry
- Reduced errors
- Consistent timing
- Audit trail

### 2. Real-World Accuracy
- Field-verified data
- GPS coordinates
- Photo evidence
- Inspector notes

### 3. Historical Tracking
- Complete status history
- Trend analysis
- Performance metrics
- Compliance reporting

## Implementation Considerations

### Data Validation
- Verify pole IDs exist
- Check status transitions are valid
- Flag anomalies for review
- Maintain data integrity

### Performance Optimization
- Index status fields
- Partition by date if needed
- Optimize common queries
- Monitor query performance

### Error Handling
- Log failed updates
- Retry mechanism
- Alert on critical failures
- Manual override capability

## Future Enhancements

### 1. Real-time Updates
- WebSocket connection to Neon
- Push notifications on status change
- Live dashboard updates
- Instant alerts

### 2. Predictive Analytics
- Status change patterns
- Completion predictions
- Resource optimization
- Bottleneck identification

### 3. Integration Expansion
- Direct API integration
- Bi-directional updates
- Mobile app updates
- Third-party webhooks

## Relationship with SOW Module

### Clear Separation
- **SOW**: Initial infrastructure definition (one-time)
- **OneMap**: Ongoing status updates (daily)
- **No Overlap**: Different data, different timing

### Data Lifecycle
1. SOW defines what exists (poles, drops, fiber)
2. OneMap tracks current state
3. Firebase app shows both together
4. Users see complete picture

## Conclusion

The OneMap integration provides critical real-time status updates that keep FibreFlow data current with field reality. By flowing updates through Neon and displaying in Firebase, we maintain a simple, performant architecture that scales with the business.

This strategy ensures accurate status tracking while avoiding the complexity of multi-database synchronization. The clear separation between initial SOW data and ongoing OneMap updates creates a maintainable system that serves both operational and analytical needs.