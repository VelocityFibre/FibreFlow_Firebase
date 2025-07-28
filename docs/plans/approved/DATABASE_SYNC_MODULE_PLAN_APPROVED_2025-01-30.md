# Database Sync Module Plan - APPROVED
*Approved Date: 2025-01-30*

## Executive Summary

This plan outlines the development of a database synchronization module to sync pole and drop data from the vf-onemap-data staging database to the FibreFlow production database. The module will operate independently of existing CSV import workflows and provide controlled, human-reviewed synchronization with comprehensive conflict detection.

## Architecture Overview

```
OneMap CSVs → [Existing Import] → vf-onemap-data → [NEW SYNC MODULE] → FibreFlow Production
              (Already Working)    (Staging DB)     (What we're building)  (Live Operations)
```

## Key Requirements

### Sync Configuration
- **Frequency**: Daily (manual trigger available)
- **Direction**: One-way (staging → production only)
- **Initial Sync**: Full sync of all records
- **Subsequent Syncs**: Incremental (changes only)
- **Conflict Resolution**: Human-in-the-loop approval required

### Data Scope
- **Source**: vf-onemap-data Firebase project (staging)
- **Destination**: fibreflow-73daf Firebase project (production)
- **Records**: ~5,287 poles plus associated drops
- **Fields**: Sync essential fields only (not all 159)

## Technical Approach

### Phase 1: Foundation (Week 1)
1. Create sync module directory structure
2. Set up authentication between Firebase projects
3. Define field mapping configuration
4. Create data models for sync operations
5. Build validation rule engine

### Phase 2: Sync Engine (Week 2)
1. Implement database connection service
2. Build conflict detection system
3. Create approval workflow
4. Develop sync execution engine
5. Add incremental sync capability

### Phase 3: Monitoring & Reports (Week 3)
1. Create sync history tracking
2. Build report generation system
3. Implement sync status monitoring
4. Add performance optimization
5. Complete testing and documentation

## Field Mapping

### Essential Fields to Sync
```javascript
{
  // Identification
  "Pole Number": "poleNumber",           // Unique identifier
  "Drop Number": "dropNumber",           // For drop tracking
  
  // Location
  "Latitude": "location.latitude",
  "Longitude": "location.longitude", 
  "Location Address": "address",
  
  // Network Info
  "PONs": "ponNumber",
  "Sections": "zoneNumber",
  "Site": "projectName",
  
  // Status
  "Status": "importStatus",              // Original status
  "Flow Name Groups": "workflowGroup",
  
  // Relationships
  "Property ID": "propertyId",           // For cross-reference
  
  // Metadata
  "lst_mod_dt": "lastModifiedInOnemap", // Track source updates
  "date_status_changed": "statusChangeDate"
}
```

### Fields NOT Synced (Remain in Staging Only)
- Personal details (names, IDs, contacts)
- Survey responses
- Installation photos from OneMap
- Sales and marketing data
- Consent form data
- Technical specifications
- Audit trail from source systems

## Conflict Detection & Resolution

### Conflict Types
1. **Duplicate Pole Numbers**: Pole already exists in production
2. **Data Mismatches**: Different values for same pole
3. **Invalid Relationships**: Drops referencing non-existent poles
4. **Capacity Violations**: More than 12 drops per pole

### Resolution Process
1. Pre-sync validation runs automatically
2. Conflicts detected and categorized
3. Pre-sync report generated with all conflicts
4. Human operator reviews report
5. Operator approves/rejects each conflict
6. Approved changes execute
7. Post-sync report generated

## Sync Schedule & Process

### Daily Sync Schedule
- **2:00 AM**: Automatic sync initiation
- **2:05 AM**: Conflict detection complete
- **2:10 AM**: Pre-sync report available
- **Morning**: Human review and approval
- **Upon Approval**: Sync execution
- **Post-Sync**: Report generation

### Manual Sync
- Available through sync dashboard
- Same process as automated sync
- Useful for urgent updates

## Performance Considerations

### Firebase Costs
- **Initial Full Sync**: ~10,574 reads
- **Daily Incremental**: ~500-1,000 reads
- **Writes**: Only approved changes
- **Estimated Monthly Cost**: <$5 USD

### Optimization
- Batch operations for efficiency
- Index key fields for fast lookups
- Cache unchanged records
- Incremental sync after initial load

## Success Criteria

1. **Data Integrity**: No data loss or corruption
2. **Conflict Detection**: 100% of conflicts caught before sync
3. **Performance**: Daily sync completes in <10 minutes
4. **Reliability**: 99% success rate for approved syncs
5. **Auditability**: Complete history of all sync operations

## Risk Mitigation

1. **Data Loss**: Full backup before each sync
2. **Conflicts**: Human approval prevents bad data
3. **Performance**: Incremental sync reduces load
4. **Authentication**: Secure service accounts
5. **Monitoring**: Daily reports track health

## Timeline

**Total Duration**: 3 weeks

- **Week 1**: Foundation & Configuration
- **Week 2**: Core Sync Engine
- **Week 3**: Reporting & Testing

## Deliverables

1. **Sync Module**: Complete TypeScript/Node.js implementation
2. **Database Sync Agent**: Claude AI agent for sync operations
3. **Documentation**: Technical docs and user guide
4. **Reports**: Templates for pre/post sync reports
5. **Test Suite**: Comprehensive testing

## Future Enhancements (Not in Scope)

- Real-time synchronization
- Bidirectional sync
- Automated conflict resolution
- API integration with OneMap
- Mobile app for approvals

## Approval

This plan has been reviewed and approved for implementation.

**Approved by**: User  
**Date**: 2025-01-30  
**Status**: APPROVED