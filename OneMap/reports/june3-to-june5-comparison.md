# CSV Comparison Report: June 3rd to June 5th 2025

## Overview
This report compares the CSV data from June 3rd, 2025 to June 5th, 2025 to track changes in the home sign-up and pole permission process.

## File Information
- **June 3rd File**: `Lawley June Week 1 03062025.csv`
  - Records: 3,487
  - Date: June 3, 2025
  
- **June 5th File**: `Lawley June  Week 1 05062025.csv`
  - Records: 6,039
  - Date: June 5, 2025
  
- **Net Increase**: +2,552 records (73.2% growth in 2 days)

## Key Findings

### 1. New Records Analysis (2,555 new property IDs)
The majority of new records are pole permissions and property sign-ups:

#### By Identifier Type:
- **Pole Numbers**: 913 new records (35.7%)
  - Examples: LAW.P.A692, LAW.P.A627, LAW.P.A628
  - All with status "Pole Permission: Approved"
  
- **Drop Numbers**: 67 new records (2.6%)
  - Examples: DR1752438, DR1752442, DR1752441
  - Status: "Home Sign Ups: Approved & Installation Scheduled"
  
- **GPS Only**: 1,575 new records (61.6%)
  - These have GPS coordinates but no pole/drop numbers yet
  - Most have no status (blank)

### 2. Status Changes
Only 1 status change was detected:
- Property 279830 (LAW.P.C463)
  - Changed from: "Pole Permission: Approved"
  - Changed to: "Home Sign Ups: Approved & Installation Scheduled"
  - Address: 30 LETSATSI STREET LAWLEY ESTATE

This suggests the workflow progression from pole permission to home sign-up scheduling.

### 3. Field Changes (18 records)
Most common changes:
- **date_status_changed**: 11 updates (timestamp formatting changes)
- **Drop Number**: 8 assignments (empty → assigned drop number)

Examples of drop number assignments:
- Property 284378 (LAW.P.C502): Assigned drop DR1750573
- Property 279313 (LAW.P.E419): Assigned drop DR1748591

### 4. Status Distribution in June 5th Data
```
Pole Permission: Approved:                       2,878 (47.6%)
No Status (blank):                              2,816 (46.6%)
Home Sign Ups: Approved & Installation Scheduled:  295 (4.9%)
Pole Permission: Declined:                          22 (0.4%)
Home Sign Ups: Declined:                           15 (0.2%)
Home Sign Ups: Approved & Installation Re-scheduled: 8 (0.1%)
Home Installation: Installed:                        4 (0.1%)
Home Installation: Declined:                         1 (0.0%)
```

### 5. Data Quality Issues

#### Ambiguous Matches (806 records)
Many pole numbers are associated with multiple property IDs, suggesting:
- Duplicate entries for same physical location
- Multiple properties sharing same pole
- Data entry inconsistencies

Examples:
- LAW.P.A886 appears for properties 248951 and 248942
- LAW.P.A860 appears for properties 248629 and 248632

## Workflow Insights

Based on the data changes, the typical workflow appears to be:

1. **Initial Entry**: Property created with GPS coordinates
2. **Pole Assignment**: Pole number assigned (LAW.P.XXX format)
3. **Permission Status**: "Pole Permission: Approved" or "Declined"
4. **Drop Assignment**: Drop number assigned (DRXXXXXXX format)
5. **Installation Scheduling**: Status changes to "Home Sign Ups: Approved & Installation Scheduled"
6. **Installation**: Final status "Home Installation: Installed"

## Recommendations

1. **Address Duplicates**: The 806 ambiguous matches need investigation to determine if they are true duplicates or valid multi-property poles.

2. **Track Workflow Progress**: Only 1 status change in 2 days seems low given 2,555 new records. Consider:
   - Are status updates being captured properly?
   - Is there a delay in status synchronization?

3. **GPS-Only Records**: 1,575 records (61.6% of new) have only GPS coordinates. These need:
   - Pole number assignment
   - Status determination
   - Field agent assignment

4. **Drop Number Assignment**: Only 8 drop numbers were assigned to existing records. This seems low compared to the volume of approved poles.

## Data Tracking Assumptions Validation

The tracking hierarchy (pole > drop > gps > address) works well:
- Pole numbers are the most reliable identifier when present
- Drop numbers are unique and good for tracking installations
- GPS coordinates help identify records without pole/drop assignments
- Multiple properties can share the same pole (validated by data)

## Next Steps

1. Analyze subsequent days (June 6th onward) to track:
   - How many GPS-only records get pole assignments
   - Status progression for the 2,878 approved poles
   - Installation completion rates

2. Create a daily tracking report showing:
   - New properties added
   - Status changes
   - Drop assignments
   - Installation completions

3. Investigate the duplicate pole numbers to establish data quality rules