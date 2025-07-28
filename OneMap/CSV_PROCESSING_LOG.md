# OneMap CSV Processing Log

## ✅ Completed Imports (With History Tracking)

| Date | CSV File | Import Date | Records | New Props | Status Changes |
|------|----------|-------------|---------|-----------|----------------|
| May 22, 2025 | Lawley May Week 3 22052025 - First Report.csv | 2025-01-29 | 746 | 746 | 0 |
| May 23, 2025 | Lawley May Week 3 23052025.csv | 2025-01-29 | 746 | 0 | 0 |
| May 26, 2025 | Lawley May Week 4 26052025.csv | 2025-01-29 | 752 | 6 | 0 |
| May 27, 2025 | Lawley May Week 4 27052025.csv | 2025-01-29 | 753 | 1 | 0 |
| May 29, 2025 | Lawley May Week 4 29052025.csv | 2025-01-29 | 1008 | 255 | 0 |
| May 30, 2025 | Lawley May Week 4 30052025.csv | 2025-01-29 | 1292 | 284 | 0 |
| June 2, 2025 | Lawley June Week 1 02062025.csv | 2025-01-29 | 2743 | 1454 | 0 |
| June 3, 2025 | Lawley June Week 1 03062025.csv | 2025-01-29 | 3487 | 747 | 0 |
| June 5, 2025 | Lawley June Week 1 05062025.csv | 2025-01-29 | 6039 | 2555 | 1 |
| June 6, 2025 | Lawley June Week 1 06062025.csv | 2025-01-29 | 6039 | 0 | 0 |
| June 9, 2025 | Lawley June Week 2 09062025.csv | 2025-01-29 | 6484 | 318 | 1 |
| June 10, 2025 | Lawley June Week 2 10062025.csv | 2025-01-29 | 6697 | 214 | 0 |
| June 11, 2025 | Lawley June Week 2 11062025.csv | 2025-01-29 | 7947 | 723 | 0 |
| June 12, 2025 | Lawley June Week 2 12062025.csv | 2025-01-29 | 8496 | 549 | 0 |
| June 13, 2025 | Lawley June Week 2 13062025.csv | 2025-01-29 | 8844 | 348 | 1 |
| June 16, 2025 | Lawley June Week 3 16062025.csv | 2025-01-29 | 8850 | 6 | 0 |
| June 17, 2025 | Lawley June Week 3 17062025.csv | 2025-01-29 | 8850 | 0 | 0 |
| June 18, 2025 | Lawley June Week 3 18062025.csv | 2025-01-29 | 9278 | 428 | 0 |
| June 19, 2025 | Lawley June Week 3 19062025.csv | 2025-01-29 | 9315 | 35 | 0 |
| June 20, 2025 | Lawley June Week 3 20062025.csv | 2025-01-29 | TBD | TBD | TBD |
| June 22, 2025 | Lawley June Week 3 22062025.csv | 2025-07-24 | 9315* | 1152** | 32*** |
| June 23, 2025 | Lawley June Week 4 23062025.csv | 2025-01-31 | 12667 | TBD | TBD |
| June 26, 2025 | Lawley June Week 4 26062025.csv | 2025-01-31 | 17108 | 4494* | TBD |
| June 27, 2025 | Lawley June Week 4 27062025.csv | 2025-01-31 | 17653 | 229 | TBD |
| June 30, 2025 | Lawley June Week 4 30062025.csv | 2025-01-31 | 7744 | TBD* | TBD |
| July 1, 2025 | Lawley July Week 1 01072025.csv | 2025-01-31 | 9045 | TBD | TBD |
| July 2, 2025 | Lawley July Week 1 02072025.csv | 2025-01-31 | 9911 | 888* | TBD |
| July 3, 2025 | Lawley July Week 1 03072025.csv | 2025-01-31 | 11156 | 1247* | TBD |
| July 7, 2025 | Lawley July Week 2 07072025.csv | 2025-01-31 | 13141 | 1966* | TBD |

## 🚧 In Progress - June Week 3

### ⚠️ June 22 Data Quality Issues
* **Total records in file**: 11,443 (54% valid, 46% invalid due to CSV corruption)
** **New properties**: Only from 6,223 valid records processed
*** **Status changes**: 24 progressed to "Home Installation: In Progress"

**Note**: June 22 file had severe data quality issues with 5,220 records (46%) skipped due to:
- Field shifts/column misalignment
- Legal text appearing in GPS coordinate fields
- Timestamps in pole number fields
- CSV structure corruption

## 📊 Final Summary
- **Total Files Processed**: 6 files 
- **Total Unique Properties**: 1,292
- **Properties with Status History**: 1,252
- **Total New Properties Added**: 1,292 (cumulative)
- **Total Status Changes**: 0 (properties maintained consistent status)
- **Date Range**: May 22-30, 2025
- **Last Update**: 2025-01-29

## 📈 Import Progression
- May 22: Started with 746 properties
- May 23: No new properties (same 746)
- May 26: Added 6 new properties (752 total)
- May 27: Added 1 new property (753 total)
- May 29: Added 255 new properties (1,008 total)
- May 30: Added 284 new properties (1,292 total)

## 🔍 Key Findings
1. **Consistent Status**: Properties maintained their status across all daily exports
2. **Growth Pattern**: Significant growth on May 29 (+255) and May 30 (+284)
3. **Status History**: Now tracking for all 1,252 properties
4. **Data Quality**: 100% GPS coverage, 27 poles serving multiple properties

## 🎯 Next Steps
- Wait for new CSV files with actual status progressions
- Monitor for workflow changes (e.g., "Survey Requested" → "Pole Permission Approved")
- Status history system ready to capture all future changes

---

*Note: All imports completed with enhanced history tracking*
*Import Script: bulk-import-history-fast.js*
*Report Script: generate-report-with-history.js*