# 1Map Data Change Analysis - Factual Report (2025-07-21)

**Analysis Date**: July 21, 2025  
**Data Period**: May 22 - May 26, 2025  
**Source**: 1Map CSV Exports

---

## Data Files Analyzed

| File Name | Date | Record Count |
|-----------|------|--------------|
| Lawley May Week 3 22052025 - First Report.csv | May 22, 2025 | 746 |
| Lawley May Week 3 23052025.csv | May 23, 2025 | 746 |
| Lawley May Week 4 26052025.csv | May 26, 2025 | 752 |

---

## Record Count Changes

### May 22 to May 23 (1 day)
- Records on May 22: 746
- Records on May 23: 746
- Net change: 0

### May 22 to May 26 (4 days)
- Records on May 22: 746
- Records on May 26: 752
- Net change: +6

### Property ID Analysis
- New Property IDs added: 7
- Property IDs removed: 1
- Net Property ID change: +6

---

## New Records Added (May 26)

| Property ID | Status | Address | Pole Number | Time Added |
|-------------|--------|---------|-------------|------------|
| 270902 | (blank) | 6892 LAWLEY ESTATE LENASIA 1824 GT 79800008 JHB | (none) | 15:15:54 |
| 270903 | (blank) | 644 BARRACUDA ROAD LAWLEY LENASIA 1824 GT 79800121 JHB | (none) | 15:15:55 |
| 270904 | (blank) | 7886 THIRD AVENUE LAWLEY ESTATE LENASIA 1824 GT 79800121 JHB | (none) | 15:15:55 |
| 270905 | (blank) | 7888 THIRD AVENUE LAWLEY ESTATE LENASIA 1824 GT 79800121 JHB | (none) | 15:15:58 |
| 270906 | (blank) | 7886 THIRD AVENUE LAWLEY ESTATE LENASIA 1824 GT 79800121 JHB | (none) | 15:15:57 |
| 270907 | (blank) | 7923 LAWLEY ESTATE LENASIA 1824 GT 79800121 JHB | (none) | 15:15:56 |
| 270908 | (blank) | 7891 LAWLEY ESTATE LENASIA 1824 GT 79800121 JHB | (none) | 15:15:56 |

All 7 records have GPS coordinates.

---

## Records Removed

| Property ID | Previous Status | Address |
|-------------|-----------------|---------|
| 259462 | Home Sign Ups: Declined | ANGLER STREET OPEN SPACE 364 WESTONARIA 1779 GT 79800121 JHB |

---

## Status Changes

### Status Field Changes (May 22 → May 26)
- Properties with "Missing" status on May 22: 182
- Properties with "Missing" status on May 26: 0
- Properties with blank/empty status on May 22: 0
- Properties with blank/empty status on May 26: 189

### Status Change Details
- 182 records changed from "Missing" to blank/empty
- No other status changes detected

---

## Status Distribution

### May 22 Status Count
| Status | Count |
|--------|-------|
| Pole Permission: Approved | 475 |
| Missing | 182 |
| Home Sign Ups: Approved & Installation Scheduled | 73 |
| Home Sign Ups: Declined | 10 |
| Home Installation: Installed | 3 |
| Home Sign Ups: Approved & Installation Re-scheduled | 2 |
| Home Installation: Declined | 1 |

### May 26 Status Count
| Status | Count |
|--------|-------|
| Pole Permission: Approved | 475 |
| Blank/Empty | 189 |
| Home Sign Ups: Approved & Installation Scheduled | 73 |
| Home Sign Ups: Declined | 9 |
| Home Installation: Installed | 3 |
| Home Sign Ups: Approved & Installation Re-scheduled | 2 |
| Home Installation: Declined | 1 |

---

## Field Changes

### Pole Number Assignments
- New pole numbers assigned between May 22-26: 0
- Records with pole numbers on May 22: 543
- Records with pole numbers on May 26: 543

### Field Agent Changes
- Field agent assignment changes detected: 0

---

## Data Import to FibreFlow

### Import Statistics
- Total records in staging: 746
- Records with pole numbers: 543
- Records without pole numbers: 203
- Records synced to production: 545
- Records exported for field work: 182

### Production Sync Results
| Collection | Count |
|------------|-------|
| planned-poles | 541 |
| pole-trackers | 4 |
| Total | 545 |

---

## Technical Notes

1. **CSV Format**: Files use semicolon (;) delimiter
2. **Character Encoding**: Files contain BOM (Byte Order Mark) requiring special handling
3. **Property ID Column**: First column with BOM character (﻿Property ID)
4. **Total Columns**: 122 fields per record

---

**End of Factual Report**