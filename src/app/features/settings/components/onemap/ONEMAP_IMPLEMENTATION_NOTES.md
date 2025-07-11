# OneMap Implementation Notes

*Last Updated: 2025-01-11*  
*Status: Deployed and Production Ready*

## Overview

OneMap data processing module implemented under Settings section for processing home sign-up CSV data according to specific business requirements. The module distinguishes between new signups and existing signups based on first approval dates.

## Implementation Details

### Column Requirements (Exact Order)
The system expects CSV files with these 13 columns in exact order:

1. Property ID
2. 1map NAD ID  
3. Pole Number
4. Drop Number
5. Status
6. Flow Name Groups
7. Sections
8. PONs
9. Location
10. Address
11. Field Agent Name (Home Sign Ups)
12. Last Modified Home Sign Ups By
13. Last Modified Home Sign Ups Date

### Processing Logic

#### Step 1: Initial Data Filtering
- Filter records where Status = "Home Sign Ups: Approved & Installation Scheduled"
- Exclude records where Status contains "Pole Permissions"

#### Step 2: Data Quality Control
**2a. Handle Missing Drop Numbers:**
- Identify and move ALL rows without a Drop Number to "No_Drop_Allocated" sheet
- Continue processing with remaining rows that have Drop Numbers

**2b. Handle Duplicate Drop Numbers:**
- For rows with duplicate Drop Numbers, compare "Last Modified Home Sign Ups Date"
- Keep only the row with the earliest date for each Drop Number
- Move newer duplicates to "Duplicate_Drops_Removed" sheet

#### Step 3: First Approval Date Analysis
- From the remaining clean data, for each unique Drop Number, identify the earliest "Last Modified Home Sign Ups Date"
- This becomes the "first approval date" for that Drop

#### Step 4: Date-Based Sheet Creation
Based on user-specified date range (default: June 26 - July 9, 2025):

**Sheet 1: "FirstEntry_StartDate-EndDate"**
- Include ALL rows for Drops whose first approval date falls within the date range
- These represent new home signups during the target window

**Sheet 2: "Duplicates_PreWindow"**  
- Include ALL rows for Drops whose first approval date is before StartDate
- These represent existing signups that were approved prior to the target window

## Business Logic Summary

The goal is to distinguish between:
- **New signups**: Drops with their first approval during the specified window
- **Existing signups**: Drops that were already approved before the window  
- **Data quality issues**: Missing drop numbers and duplicate entries

## Output Reports

### Primary Analysis Sheets
- **"FirstEntry_StartDate-EndDate"** - New signups in target window
- **"Duplicates_PreWindow"** - Existing signups from before target window

### Data Quality Control Sheets  
- **"No_Drop_Allocated"** - Records missing drop numbers
- **"Duplicate_Drops_Removed"** - Duplicate drop number entries removed

## Technical Implementation

### Files Modified
- `src/app/features/settings/services/onemap.service.ts` - Core processing logic
- `src/app/features/settings/models/onemap.model.ts` - Data models  
- `src/app/features/settings/components/onemap/onemap.ts` - UI component
- `src/app/features/settings/components/onemap/onemap.html` - Template
- `src/app/features/settings/components/onemap/onemap.scss` - Styling

### Key Features
- CSV file validation with helpful error messages
- Real-time processing with progress indicator
- Date range configuration with defaults
- Individual CSV export for each report type
- Proper column ordering in all exports

## Deployment Information

- **Status**: Deployed to production
- **URL**: https://fibreflow-73daf.web.app
- **Access**: Settings → OneMap
- **Last Deploy**: 2025-01-11

## Important Notes

- All sheets contain only the 13 specified columns in the exact order listed
- Processing sequence ensures clean data for date analysis  
- Each Drop Number appears in only one primary analysis sheet based on its first approval date
- System validates CSV format and provides clear error messages for incorrect files
- Default date range set to June 26 - July 9, 2025 but user configurable

## Usage Instructions

1. Navigate to Settings → OneMap
2. Upload CSV file with the 13 required columns
3. Configure date range (or use defaults)  
4. Click "Process Data" 
5. Download individual reports as needed

## Error Handling

- Clear validation messages for missing columns
- Helpful guidance for correct file format
- Distinguishes between infrastructure files (pole data) and sign-up files
- Graceful handling of empty or malformed CSV files

---

*End of Implementation Notes*