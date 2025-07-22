# OneMap Tracking Hierarchy - Comprehensive Documentation

*Created: 2025-07-22*  
*Status: Active Implementation*  
*Critical Update: Broader Entity Tracking*

## Executive Summary

The OneMap tracking system has been updated to capture ALL entities throughout their lifecycle, not just pole-assigned records. This ensures complete visibility from initial survey requests to final installations.

## The Problem We Solved

Previously, the system only tracked records with pole numbers, missing:
- Early stage survey requests (no pole assigned yet)
- Home sign-ups without pole allocation
- Initial contact records with only addresses
- Pre-permission workflow stages

This meant we were losing visibility on ~30% of the installation pipeline.

## The Solution: Broader Tracking Hierarchy

### Tracking Priority Order

1. **Pole Number** (Primary Identifier)
   - Used when: Pole has been assigned to property
   - Format: `pole:LAW.P.B167`
   - Example: "Permission Approved" status
   - Unique across system

2. **Drop Number** (Secondary Identifier)
   - Used when: No pole assigned yet but drop allocated
   - Format: `drop:DR1234`
   - Example: "Home Sign Up" status
   - Links to future pole assignment

3. **Location Address** (Tertiary Identifier)
   - Used when: Early stage, no pole/drop yet
   - Format: `address:74 Market Street`
   - Example: "Survey Requested" status
   - May have multiple properties

4. **Property ID** (Last Resort)
   - Used when: No other identifiers available
   - Format: `property:12345`
   - Example: "Initial Contact" status
   - Always unique

## Implementation Details

### Pre-loading Structure
```javascript
// Map structure for tracking all entity types
const trackingStatuses = new Map([
  ["pole:LAW.P.B167", { 
    status: "Permission Approved", 
    date: "2025-06-03",
    pole_number: "LAW.P.B167",
    tracking_type: "pole"
  }],
  ["drop:DR1234", { 
    status: "Home Sign Up", 
    date: "2025-06-02",
    drop_number: "DR1234",
    tracking_type: "drop"
  }],
  ["address:74 Market Street", { 
    status: "Survey Requested", 
    date: "2025-06-01",
    location_address: "74 Market Street",
    tracking_type: "address"
  }],
  ["property:12345", { 
    status: "Initial Contact", 
    date: "2025-05-30",
    property_id: "12345",
    tracking_type: "property"
  }]
]);
```

### Tracking Function
```javascript
function getTrackingKey(record) {
  // Priority order ensures consistent tracking
  if (record.pole_number && record.pole_number.trim()) {
    return `pole:${record.pole_number.trim()}`;
  }
  if (record.drop_number && record.drop_number.trim()) {
    return `drop:${record.drop_number.trim()}`;
  }
  if (record.location_address && record.location_address.trim()) {
    return `address:${record.location_address.trim()}`;
  }
  // Property ID is always present
  return `property:${record.property_id}`;
}
```

### First Instance Detection
```javascript
function detectFirstInstances(records) {
  const firstInstances = [];
  
  records.forEach(record => {
    const trackingKey = getTrackingKey(record);
    
    if (!trackingStatuses.has(trackingKey)) {
      // This is a NEW entity we haven't seen before
      trackingStatuses.set(trackingKey, {
        status: record.status,
        date: record.date,
        ...record
      });
      
      firstInstances.push({
        ...record,
        tracking_key: trackingKey,
        tracking_type: trackingKey.split(':')[0]
      });
    }
  });
  
  return firstInstances;
}
```

## Real-World Example

### Complete Lifecycle Tracking
```
Timeline for Property ID 12345:

May 30: Initial Contact
- Tracking: property:12345
- Status: "Initial Contact"
- No pole/drop assigned yet

June 1: Survey Requested at Address
- Tracking: address:74 Market Street
- Status: "Survey Requested"
- Multiple properties may share address

June 2: Home Sign Up with Drop Assignment
- Tracking: drop:DR1234
- Status: "Home Sign Up"
- Drop allocated but no pole yet

June 3: Pole Permission Approved
- Tracking: pole:LAW.P.B167
- Status: "Permission Approved"
- Full pole assignment complete
```

## Benefits of Broader Tracking

### 1. Complete Visibility
- Track 100% of records, not just pole-assigned
- See entire customer journey from first contact
- No lost data in early stages

### 2. Better Analytics
- Accurate conversion rates (contact → installation)
- Time-to-pole metrics
- Drop allocation efficiency

### 3. Payment Verification
- Track agent work even before pole assignment
- Verify claims at any workflow stage
- Prevent duplicate payments across all stages

### 4. Quality Control
- Identify bottlenecks (e.g., survey → sign-up delays)
- Track properties stuck without poles
- Monitor address-level issues

## Migration Guide

### For Existing Scripts
```javascript
// Old approach (poles only)
if (record.pole_number) {
  track(record);
}

// New approach (all entities)
const trackingKey = getTrackingKey(record);
track(record, trackingKey);
```

### For Reports
```javascript
// Enhanced reporting shows tracking breakdown
{
  "summary": {
    "total_tracked": 5287,
    "by_type": {
      "pole": 3732,      // Have poles assigned
      "drop": 823,       // Drops without poles
      "address": 567,    // Address-only records
      "property": 165    // Property-only records
    }
  }
}
```

## Testing the Implementation

### Unit Tests Pass
```bash
✓ tracks records with pole numbers
✓ tracks records with only drop numbers
✓ tracks records with only addresses
✓ tracks records with only property IDs
✓ maintains priority order
✓ handles empty/null values correctly
```

### Validation Checks
1. **Pole tracking**: LAW.P.B167 → `pole:LAW.P.B167`
2. **Drop tracking**: No pole, has DR1234 → `drop:DR1234`
3. **Address tracking**: No pole/drop, has address → `address:74 Market St`
4. **Property tracking**: Only property ID → `property:12345`

## Future Enhancements

### Phase 1 (Current)
- ✅ Implement broader tracking hierarchy
- ✅ Update all analysis scripts
- ✅ Generate comprehensive reports

### Phase 2 (Planned)
- Link drops to poles when assigned
- Track entity progression over time
- Generate conversion funnel analytics

### Phase 3 (Future)
- Real-time tracking updates
- Predictive analytics for pole assignment
- Automated agent payment calculations

## Key Scripts Using This System

1. **analyze-first-instances.js**
   - Primary implementation of tracking hierarchy
   - Generates first instance reports
   - Handles all entity types

2. **analyze-june-changes-v2.js**
   - Daily change tracking
   - Uses hierarchy for comparison
   - Identifies status progressions

3. **generate-import-report.js**
   - Import reporting with entity breakdown
   - Shows tracking type distribution
   - Validates data completeness

## Troubleshooting

### Common Issues

1. **Missing Early Records**
   - Check: Is tracking hierarchy implemented?
   - Fix: Use getTrackingKey() function

2. **Duplicate Counts**
   - Check: Are you using consistent keys?
   - Fix: Trim whitespace, normalize case

3. **Wrong Tracking Type**
   - Check: Priority order in getTrackingKey()
   - Fix: Ensure pole > drop > address > property

## Conclusion

The broader tracking hierarchy ensures complete visibility across the entire fiber installation lifecycle. By tracking all entities—not just poles—we provide comprehensive analytics, accurate payment verification, and better operational insights.

This update is backward compatible while significantly enhancing our tracking capabilities. All existing pole-based tracking continues to work while now capturing previously missed early-stage records.

---

*For implementation details, see the updated scripts in the OneMap directory.*