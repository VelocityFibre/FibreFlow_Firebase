# OneMap Data Tracking - Current Assumptions Document

*Created: 2025-01-22*  
*Status: Working Assumptions for Implementation*

## Understanding of OneMap Data

### 1. Data Structure Reality
- **Property ID** = Unique event/transaction ID (not useful for change tracking)
- **Pole Number** = Unique identifier for poles (when assigned)
- **Drop Number** = Unique identifier for customer connections
- **GPS Coordinates** = Should be unique but reliability uncertain
- **Address** = NOT unique (multiple poles per address due to density)

### 2. The Tracking Challenge
- One address can have multiple poles (density issue)
- Early records have no pole number assigned
- No single field reliably links records across time
- Property ID is unique per row (no updates, only new records)

### 3. Business Priority
**"Wat die csv's aanbetref verstaan ek dat ons net wil sien wat verander het van gister na vandag"**
- Primary goal: Track daily changes and progress
- Reporting is more important than perfect record linking
- Accept some ambiguity in exchange for progress visibility

## Recommended Tracking Approach

### Best Available Identifier Hierarchy
```
1. IF Pole Number exists → Track by Pole Number (most reliable)
2. ELSE IF Drop Number exists → Track by Drop Number  
3. ELSE IF GPS looks valid → Track by GPS (rounded to ~10m accuracy)
4. ELSE → Track by Address + Status combination (accept some ambiguity)
```

### Daily Import Process
1. Skip duplicate Property IDs from previous imports
2. Find best available identifier for each record
3. Match against yesterday's data using identifier
4. Log all field changes found
5. Flag ambiguous matches for review
6. Generate comprehensive change report

### Expected Change Types
- New poles assigned to addresses
- Status changes (Pending → Approved)
- Agent changes
- Drop additions
- GPS coordinate updates
- Any other field modifications

### Change Report Structure
```
DAILY CHANGE REPORT - [Date]
================================

NEW RECORDS: X
- New Poles Assigned: X
- New Permissions Requested: X  
- New Drops Connected: X

STATUS CHANGES: X
- Permissions Approved: X
- Installations Completed: X

DETAILED CHANGES:
[Specific field-level changes]

AMBIGUOUS MATCHES: X
[Records requiring manual review]
```

### Implementation Notes
1. **Tracking Key Format**: "type:value" (e.g., "pole:LAW.P.B167", "gps:-26.123,28.456")
2. **Confidence Scoring**: Rate match confidence (0-1) based on identifier type
3. **Progressive Enhancement**: Tracking improves as more poles get assigned
4. **Transparency**: Always flag uncertain matches

### Accepted Limitations
- ~90% accuracy expected (not 100%)
- Some records may have ambiguous matches
- GPS reliability issues may cause false changes
- Early-stage records harder to track

### Benefits of This Approach
1. Provides daily progress visibility
2. Captures majority of changes
3. Improves over time
4. Practical and implementable
5. Focuses on business value over perfection

---

*This document represents our current working assumptions for tracking OneMap data changes. It acknowledges the data constraints while providing a practical solution for daily progress monitoring.*