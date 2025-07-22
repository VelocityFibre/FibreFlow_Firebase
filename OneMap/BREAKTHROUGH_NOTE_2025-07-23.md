# OneMap Processing Breakthrough - 2025-07-23

## What Changed Today

We discovered CSV-first processing is 100-1000x faster than Firebase. Created 4 scripts that process 60 days of data in <2 minutes:

1. **split-csv-by-pole.js** - Separates permissions from poles
2. **compare-split-csvs.js** - Finds changes between dates  
3. **process-split-chronologically.js** - Automates timeline analysis
4. **fix-csv-parsing.js** - Handles CSV data quality

## Key Insights

- **Property ID is just a row number** - not meaningful for tracking
- **Permissions (no pole) vs Poles (has pole number)** - critical distinction
- **CSV processing beats database queries** - by orders of magnitude
- **The 116 scripts were learning iterations** - not mess, but evolution

## Going Forward

**Use the 4 CSV scripts for all processing.** The other scripts remain available if needed but are essentially deprecated by this superior approach.

No need for massive reorganization - this note captures the paradigm shift. Future developers should start with the CSV approach.

## Performance Comparison

- **Old way**: Complex Firebase queries, hours for large datasets
- **New way**: Simple CSV operations, minutes for months of data

This is the way.