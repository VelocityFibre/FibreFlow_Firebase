# SPEC-DATA-001: Pole-Drop Data Integrity Rules

**Status**: APPROVED  
**Priority**: CRITICAL  
**Implementation**: REQUIRED IMMEDIATELY  
**Created**: 2025-07-15  

## Business Context

The fiber optic network has physical constraints that must be enforced in software:
- Each pole can physically support maximum 12 fiber drops
- Each pole needs a unique identifier for cross-system linking
- Each home/drop needs a unique identifier for service management

## Success Criteria

### Uniqueness Enforcement
- ✅ **Zero duplicate pole numbers** across all pole collections
- ✅ **Zero duplicate drop numbers** across all drop-related collections
- ✅ **Real-time validation** during data entry with immediate user feedback
- ✅ **Bulk import validation** with detailed error reporting for conflicts

### Relationship Integrity
- ✅ **Maximum 12 drops per pole** enforced at all data entry points
- ✅ **Pole-drop relationships** maintained consistently across all operations
- ✅ **Orphaned drop prevention** - drops must reference existing poles
- ✅ **Capacity warnings** when poles approach maximum (10+ drops)

### System Reliability
- ✅ **Cannot bypass validation** through any code path or user interface
- ✅ **Clear error messages** that guide users to correct solutions
- ✅ **Performance targets** - validation completes within 500ms
- ✅ **Backward compatibility** with existing data through migration scripts

## Technical Requirements

### Data Model Updates
```typescript
// Pole Model Enhancement
interface PoleTracker {
  poleNumber: string;        // UNIQUE GLOBALLY
  connectedDrops?: string[]; // Max 12 items
  dropCount?: number;        // Calculated field
  maxCapacity: number;       // Always 12
}

// Drop Model Enhancement  
interface HomeSignup {
  dropNumber: string;        // UNIQUE GLOBALLY
  connectedToPole: string;   // Foreign key to pole
  poleValidated?: boolean;   // Validation status
}
```

### Validation Layers
1. **Firestore Security Rules** - Server-side enforcement (cannot bypass)
2. **Service Layer Validation** - Application-level checks with clear errors  
3. **UI Prevention** - Real-time feedback during form entry
4. **Bulk Import Validation** - Pre-processing validation with detailed reports

### Implementation Locations
- `firestore.rules` - Add validation functions
- `src/app/core/services/` - Update all pole/drop services
- `src/app/core/models/` - Enhance type definitions
- `src/app/core/validators/` - Create validation utilities

## User Experience Requirements

### Form Validation
- Real-time pole number availability checking
- Auto-suggest available poles when creating drops
- Capacity indicator showing "8 of 12 drops" status
- Clear error messages: "Pole ABC123 already exists"

### Bulk Operations
- Pre-validation report before import: "Found 5 duplicate pole numbers"
- Progress indication during validation: "Checking 1,000 records..."
- Detailed error export: "Row 45: Drop DEF456 already exists"

### Error Recovery
- Suggested alternatives: "Pole ABC123 exists, try ABC124"
- Bulk fix options: "Auto-rename 12 conflicting poles?"
- Clear next steps: "Remove duplicates and re-upload"

## Monitoring & Maintenance

### Automated Alerts
- Poles approaching capacity (10+ drops)
- Failed validation attempts (potential data issues)
- Orphaned drops (reference non-existent poles)

### Data Health Dashboard
- Total poles with capacity status
- Validation error trends over time  
- Top error types and frequencies

## Integration Impact

### Affected Features
- **Pole Tracker** - Primary pole management with capacity display
- **Pole Analytics** - CSV import with validation pipeline
- **OneMap** - Home signup processing with drop validation
- **Future Features** - Any pole/drop related functionality

### Migration Strategy
1. **Audit Phase** - Identify existing violations in live data
2. **Warning Phase** - Log violations but allow operations
3. **Enforcement Phase** - Block new violations, require cleanup
4. **Full Compliance** - All data meets integrity rules

## Definition of Done

### Code Complete
- [ ] Firestore rules implement all validation functions
- [ ] All services enforce uniqueness and capacity rules  
- [ ] UI provides real-time validation feedback
- [ ] Bulk import includes comprehensive validation
- [ ] Migration scripts handle existing data conflicts

### Testing Complete
- [ ] Cannot create duplicate pole numbers through any path
- [ ] Cannot create duplicate drop numbers through any path
- [ ] Cannot exceed 12 drops per pole through any operation
- [ ] Error messages are clear and actionable
- [ ] Validation performance meets 500ms target

### Documentation Complete
- [ ] Updated API documentation with validation rules
- [ ] User guides for handling validation errors
- [ ] Admin procedures for data cleanup
- [ ] Developer guidelines for maintaining integrity

## Risk Mitigation

### Performance Risk
- **Concern**: Validation queries slow down operations
- **Mitigation**: Proper indexing + caching + async validation where possible

### Data Migration Risk  
- **Concern**: Existing violations prevent system upgrade
- **Mitigation**: Gradual enforcement + admin tools for cleanup

### User Experience Risk
- **Concern**: Strict validation frustrates users
- **Mitigation**: Clear messages + suggested fixes + auto-correction options

---

**Implementation Timeline**: Immediate (this week)  
**Validation**: Deploy to staging → Test all scenarios → Deploy to production  
**Success Measure**: Zero data integrity violations in production after implementation