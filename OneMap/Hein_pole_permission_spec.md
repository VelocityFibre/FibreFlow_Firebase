# Data Processing Instructions for Pole Permissions

## Column Selection
*Focus only on these columns in this exact order:*
1. Property ID
2. 1map NAD ID
3. Pole Number
4. Drop Number
5. Stand Number
6. Status
7. Flow Name Groups
8. Site
9. Sections
10. PONs
11. Location Address
12. Latitude
13. Longitude Field Agent Name (pole permission)
14. Latitude Longitude
15. Last Modified Pole Permissions
16. Last Modified Pole Permissions Date

## Processing Steps

### Processing Flow Overview
1. *Filter* → Keep only approved pole permissions (exclude home signups)
2. *Clean* → Remove records with missing pole numbers → Handle duplicate pole numbers  
3. *Analyze* → Find first approval date per Pole from clean data
4. *Separate* → Split by date window + create quality control sheets

### Step 1: Initial Data Filtering
- *Filter records where:* Flow Name Groups contains "Pole Permission: Approved"
- *Exclude records where:* Flow Name Groups contains "Home Sign Ups"

### Step 2: Data Quality Control
*Process in this order:*

*2a. Handle Missing Pole Numbers:*
- Identify and move ALL rows without a Pole Number to sheet "No_Pole_Allocated"
- Continue processing with remaining rows that have Pole Numbers

*2b. Handle Duplicate Pole Numbers:*
- For rows with duplicate Pole Numbers, compare "Last Modified Pole Permissions Date"
- Keep only the row with the earliest date for each Pole Number
- Move newer duplicates to sheet "Duplicate_Poles_Removed"

### Step 3: First Approval Date Analysis
- From the remaining clean data, for each unique Pole Number, identify the earliest "Last Modified Pole Permissions Date"
- This becomes the "first approval date" for that Pole

### Step 4: Date-Based Sheet Creation
*Date Range Parameters:*
- Start Date: 26 June 2025
- End Date: 9 July 2025 (inclusive)

*Create two main sheets:*

#### Sheet 1: "FirstEntry_StartDate-EndDate"
- Include ALL rows for Poles whose first approval date falls within the date range (Start Date - End Date)
- These represent new pole permissions during the target window

#### Sheet 2: "Duplicates_PreWindow" 
- Include ALL rows for Poles whose first approval date is before the Start Date
- These represent existing pole permissions that were approved prior to the target window

## Business Logic Summary
The goal is to distinguish between:
- *New pole permissions:* Poles with their first approval during the specified window (Start Date to End Date)
- *Existing pole permissions:* Poles that were already approved before the Start Date
- *Data quality issues:* Missing pole numbers and duplicate entries

## Expected Output Summary
*Primary Analysis Sheets:*
- "FirstEntry_StartDate-EndDate" (new pole permissions in target window)
- "Duplicates_PreWindow" (existing pole permissions from before Start Date)

*Data Quality Control Sheets:*
- "No_Pole_Allocated" (records missing pole numbers)
- "Duplicate_Poles_Removed" (duplicate pole number entries removed)

*Important Notes:*
- All sheets contain only the 16 specified columns in the exact order listed
- Processing sequence ensures clean data for date analysis
- Each Pole Number appears in only one primary analysis sheet based on its first approval date

---

*Document received from Hein with specification on 2025/07/23*