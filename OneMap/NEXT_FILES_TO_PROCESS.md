# OneMap - Next Files to Process

## Current Status
- **Last Processed**: June 22, 2025 (with data quality issues)
- **Location**: All files in `downloads/Lawley Raw Stats/`

## Next Files in Chronological Order

### June Week 4 (Missing from processing)
1. ⭐ **June 23** - `Lawley June Week 4 23062025.csv` (21MB)
2. **June 24** - `Mohadin June Week 4 24062025.csv` (26MB) - Note: Mohadin, not Lawley
3. **June 26** - `Lawley June Week 4 26062025.csv` (24MB)
4. **June 27** - `Lawley June Week 4 27062025.csv` (25MB)
5. **June 30** - `Lawley June Week 4 30062025.csv` (21MB) ← You asked about this one

### July Week 1
6. **July 1** - `Lawley July Week 1 01072025.csv` (23MB)
7. **July 2** - `Lawley July Week 1 02072025.csv` (24MB)
8. **July 3** - `Lawley July Week 1 03072025.csv` (26MB)
9. **July 4** - `Lawly July Week 1 04072025.csv` (26MB) - Note: Typo "Lawly"

### July Week 2
10. **July 7** - `Lawley July Week 2 07072025.csv` (29MB)
11. **July 8** - `Lawley July Week 2 08072025.csv` (30MB)
12. **July 11** - `Lawley July Week 2 11072025.csv` (55KB) - Very small file!

### July Week 3
13. **July 14** - `Lawley July Week 3 14072025.csv` (31MB)
14. **July 15** - `Lawley July Week 3 15072025.csv` (31MB)
15. **July 16** - `Lawley July Week 3 16072025.csv` (31MB)
16. **July 17** - `Lawley July Week 3 17072025.csv` (32MB)
17. **July 18** - `Lawley July Week 3 18072025.csv` (32MB)

## Quick Process Command

To process the next file (June 23):
```bash
cd OneMap && node scripts/bulk-import-onemap.js "downloads/Lawley Raw Stats/Lawley June Week 4 23062025.csv"
```

## Notes
- Missing: June 25, 28, 29 (probably no data those days)
- Missing: July 5, 6, 9, 10, 12, 13 (probably no data those days)
- Special: June 24 is Mohadin project (different area)
- Warning: July 11 file is unusually small (55KB vs typical 20-30MB)

---
*Updated: 2025-01-31*