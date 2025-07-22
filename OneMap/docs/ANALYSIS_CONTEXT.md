# OneMap Data Analysis Context

## Verified Facts (No Assumptions)

### Dataset Overview
- **File**: Lawley_Project_Louis.csv
- **Total Records**: 14,579
- **Date Range**: 2025-05-30 to 2025-07-09
- **Columns**: 141 fields including Property ID, Status, Location Address, Pole Number, etc.

### Key Findings (Factual Only)

#### A. Scale of Duplication:
- **14,579** total records
- **0** duplicate Property IDs (each entry has unique ID)
- **3,391** duplicate addresses (same physical location text)
- **355** unique poles at just ONE address (1 KWENA STREET)
- **2,901** entries created within same minute

#### B. Status Distribution (Actual Count):
```
Pole Permission: Approved: 5,156
Home Sign Ups: Approved & Installation Scheduled: 4,585
No Status: 3,472
Home Installation: In Progress: 1,064
Home Sign Ups: Declined: 240
Home Sign Ups: Approved & Installation Re-scheduled: 28
Pole Permission: Declined: 23
Home Sign Ups: Declined Changed to Approved: 6
Home Installation: Installed: 4
Home Installation: Declined: 1
```

#### C. Observed Patterns:
1. **Address "1 KWENA STREET"**:
   - Has 662 total entries
   - Has 355 unique pole numbers
   - Worked on by 14 different field agents
   - Spans from 2025-05-30 to 2025-07-09

2. **Time Patterns**:
   - 2,901 entries have identical timestamps (0 seconds apart)
   - 35,414 same-day duplicate entries exist
   - Some entries have empty field agent names

3. **Data Structure**:
   - Each record has unique Property ID
   - Same address can have multiple Property IDs
   - Same address can have multiple poles
   - Different statuses represent different workflow stages

## Questions Requiring Clarification

1. **Business Context**:
   - What is the normal number of poles per residential address?
   - Is "1 KWENA STREET" a single residence or a complex?
   - Are multiple Property IDs per address expected?

2. **Workflow Understanding**:
   - Should pole permission, sign-up, and installation be separate records?
   - Can one address legitimately have 355 poles?
   - What constitutes a "duplicate" in this business context?

3. **Data Quality**:
   - Are the 2,901 same-timestamp entries from bulk import?
   - Why do some entries lack field agent names?
   - Is the address field standardized?

## antiHall Validation Rules

1. **DO NOT ASSUME**:
   - That multiple entries = errors
   - That 355 poles at one address is wrong
   - The business rules without confirmation

2. **VERIFY BEFORE STATING**:
   - Check actual data before making claims
   - Use exact counts from analysis
   - Quote specific examples

3. **ASK BEFORE CONCLUDING**:
   - Is this pattern expected?
   - What's the business context?
   - What defines "duplicate" here?