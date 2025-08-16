# Validation Workflow System

This system manages the flow of data from staging to production databases.

## Workflow Overview

```
External App → Staging API → Staging DB → Validation → Production DBs
                                  ↓
                           Admin Review UI
```

## Validation States

1. **pending_validation** - Newly submitted, awaiting processing
2. **auto_validating** - Being processed by automatic validation
3. **requires_review** - Needs manual admin review
4. **approved** - Validated and ready for production
5. **rejected** - Failed validation, won't be moved to production
6. **processing** - Being moved to production databases
7. **completed** - Successfully moved to production
8. **error** - Error during processing

## Automatic Validation Rules

### Pole Data
- ✅ Pole number format matches pattern
- ✅ GPS coordinates within project boundaries
- ✅ All required photos present
- ✅ No duplicate pole numbers in production
- ✅ Contractor is assigned to project

### SOW Data
- ✅ All line items have valid materials
- ✅ Quantities are positive numbers
- ✅ Pricing calculations are correct
- ✅ Project reference exists

## Manual Review Triggers

Data requires manual review when:
- GPS location >50m from planned location
- Duplicate pole number with different GPS
- Missing required photos
- Contractor not assigned to project
- SOW total exceeds threshold
- Data quality score <80%

## Cloud Functions

### processValidationQueue
Runs every 5 minutes to process pending validations.

### moveToProduction
Moves approved data from staging to production databases.

### cleanupStaging
Removes old completed/rejected staging records.

## Admin Interface

Access validation queue at:
`https://fibreflow.web.app/admin/validation-queue`

Features:
- View pending validations
- Approve/reject with reasons
- Edit data before approval
- Bulk operations
- Audit trail