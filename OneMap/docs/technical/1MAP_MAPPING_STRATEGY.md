# 1Map Field Mapping Strategy

*Created: 2025-07-21*

## Chosen Approach: Map at Sync Time

### Data Flow
```
1Map CSV 
  ↓ (raw import)
Processing DB (stores original 1Map structure)
  ↓ (mapping + validation)
Production DB (FibreFlow structure)
```

## Benefits of This Approach

1. **Preserve Original Data**
   - Keep all 122 1Map columns as-is
   - Can always refer back to original
   - Handle 1Map schema changes gracefully

2. **Flexible Mapping**
   - Adjust mappings without re-importing
   - Test different mapping strategies
   - Handle FibreFlow schema updates

3. **Better Change Detection**
   - Compare raw 1Map data between imports
   - Detect real changes vs mapping changes
   - Track field-level modifications

4. **Audit Trail**
   - See exactly what 1Map sent
   - Track transformation history
   - Debug mapping issues easily

## Implementation Plan

### Phase 1: Raw Import (DONE ✅)
- Import all 1Map fields to `onemap-processing-staging`
- Store original field names and values
- No transformation, just clean empty values

### Phase 2: Sync Script with Mapping (TODO)
Create sync script that:
1. Reads from `onemap-processing-staging`
2. Maps to FibreFlow schema
3. Validates against requirements
4. Writes to production collections

### Mapping Examples

#### 1Map → pole-trackers
```javascript
// 1Map fields → FibreFlow pole-trackers
{
  // From 1Map
  'Property ID': '249111',
  'Pole Number': 'LAW.P.B167',
  'PONs': 'C4P14',
  'Site': 'LAWLEY',
  
  // Maps to
  vfPoleId: 'LAW.P.B167',
  poleNumber: 'LAW.P.B167',
  pon: 'C4P14',
  projectCode: 'LAW'
}
```

#### 1Map → planned-poles
```javascript
// 1Map fields → FibreFlow planned-poles  
{
  // From 1Map
  'Property ID': '249111',
  'Pole Number': 'LAW.P.B167',
  'Pole Permissions - Actual Device Location (Latitude)': -26.370471,
  'Pole Permissions - Actual Device Location (Longitude)': 27.807768,
  
  // Maps to
  clientPoleNumber: 'LAW.P.B167',
  plannedLocation: {
    lat: -26.370471,
    lng: 27.807768
  }
}
```

## Sync Decision Logic

### Which Collection?
- If pole has installation data → `pole-trackers`
- If pole is planned only → `planned-poles`
- Based on Status field from 1Map

### Field Mapping Rules
1. **Required Fields First** - Ensure all required FibreFlow fields
2. **Data Type Conversion** - Timestamps, coordinates, etc.
3. **Validation** - Pole number uniqueness, drop limits
4. **Defaults** - Set required defaults if missing

## Next Steps

1. ✅ Keep current raw import as-is
2. ⏳ Build mapping configuration
3. ⏳ Create sync script with transformations
4. ⏳ Test with sample data
5. ⏳ Deploy to production

This approach gives us maximum flexibility while maintaining data integrity!