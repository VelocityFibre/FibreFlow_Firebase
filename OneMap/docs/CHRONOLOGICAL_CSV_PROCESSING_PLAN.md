# Chronological CSV Processing Plan

*Created: 2025-07-22*

## Overview
Process all OneMap CSV files chronologically to track daily changes and build a complete history of property status progression.

## CSV Files Available (Chronological Order)

### May 2025
1. **May 22** - Lawley May Week 3 22052025 - First Report.csv (2.3MB)
2. **May 23** - Lawley May Week 3 23052025.csv (2.3MB)
3. **May 26** - Lawley May Week 4 26052025.csv (2.3MB)
4. **May 27** - Lawley May Week 4 27052025.csv (2.3MB)
5. **May 29** - Lawley May Week 4 29052025.csv (3.3MB)
6. **May 30** - Lawley May Week 4 30052025.csv (4.6MB)

### June 2025
7. **June 2** - Lawley June Week 1 02062025.csv (8.2MB)
8. **June 3** - Lawley June Week 1 03062025.csv (9.5MB)
9. **June 5** - Lawley June Week 1 05062025.csv (17.1MB)
10. **June 10** - Lawley June Week 2 10062025.csv (21.5MB)
11. **June 11** - Lawley June Week 2 11062025.csv (22.1MB)
12. **June 12** - Lawley June Week 2 12062025.csv (22.4MB)
13. **June 17** - Lawley June Week 3 17062025.csv (22.8MB)
14. **June 18** - Lawley June Week 3 18062025.csv (23.0MB)
15. **June 19** - Lawley June Week 3 19062025.csv (23.0MB)
16. **June 24** - Lawley June Week 4 24062025.csv (23.0MB)
17. **June 25** - Lawley June Week 4 25062025.csv (23.0MB)
18. **June 26** - Lawley June Week 4 26062025.csv (23.0MB)

### July 2025
19. **July 1** - Lawley July Week 1 01072025.csv (23.0MB)
20. **July 2** - Lawley July Week 1 02072025.csv (24.5MB)
21. **July 3** - Lawley July Week 1 03072025.csv (26.2MB)
22. **July 7** - Lawley July Week 2 07072025.csv (29.1MB)
23. **July 8** - Lawley July Week 2 08072025.csv (30.2MB)
24. **July 11** - Lawley July Week 2 11072025.csv (55KB - anomaly?)
25. **July 14** - Lawley July Week 3 14072025.csv (31.1MB)

## Processing Strategy (CSV-First Approach)

### Phase 1: Initial Setup
1. Start with May 22 as baseline (first file)
2. Process each subsequent file chronologically
3. Track changes between consecutive dates
4. Build cumulative history

### Phase 2: Daily Processing Steps

For each CSV file:

```javascript
// 1. Load current CSV
const currentCSV = parseCSV(currentDate);

// 2. If first file (May 22)
if (isFirstFile) {
  // Initialize tracking with all records
  const baseline = {
    date: 'May 22',
    records: currentCSV,
    propertyIds: new Set(currentCSV.map(r => r['Property ID']))
  };
  saveBaseline(baseline);
}

// 3. For subsequent files
else {
  // Load previous processed data
  const previousData = loadPreviousData();
  
  // Compare and find:
  const changes = {
    new: [],        // Property IDs not in previous
    changed: [],    // Different status/data
    unchanged: [],  // Same as previous
    missing: []     // In previous but not current
  };
  
  // Track milestone progressions
  const milestones = trackMilestoneProgress(previousData, currentCSV);
  
  // Save results
  saveChangeReport(currentDate, changes, milestones);
  saveCumulativeData(currentDate, currentCSV);
}
```

## Implementation Plan

### Step 1: Create Processing Script
```bash
node process-csvs-chronologically.js \
  --start "May 22" \
  --end "July 14" \
  --output reports/chronological/
```

### Step 2: Process Each Date
The script will:
1. Read CSV for current date
2. Compare with previous date's data
3. Generate change report
4. Update cumulative tracking
5. Move to next date

### Step 3: Output Structure
```
reports/chronological/
├── baseline/
│   └── 2025-05-22_baseline.json
├── daily/
│   ├── 2025-05-23_changes.json
│   ├── 2025-05-26_changes.json
│   └── ... (one per date)
├── cumulative/
│   ├── 2025-05-23_cumulative.json
│   └── ... (running totals)
└── summary/
    ├── may_2025_summary.md
    ├── june_2025_summary.md
    └── july_2025_summary.md
```

## Expected Insights

### 1. Growth Tracking
- Daily new properties added
- Growth rate over time
- Peak activity periods

### 2. Workflow Progress
- How long from "Permission" to "Planted"
- Average time to "Home Sign Up"
- Installation completion rates

### 3. Data Quality
- When missing data appears/disappears
- Agent assignment patterns
- Address standardization issues

### 4. Milestone Achievements
Track first instances of:
- Pole Permission: Approved
- Pole Permission: Planted
- Home Sign Ups: Approved
- Home Installation: Installed

## Benefits of This Approach

1. **No Firebase Needed** - All processing done locally
2. **Complete History** - See exact progression day by day
3. **Fast Processing** - Each comparison takes seconds
4. **Reproducible** - Can re-run anytime with same results
5. **Audit Trail** - Know exactly what changed when

## Final Output

After processing all files:

### 1. Master Timeline
```json
{
  "2025-05-22": { "total": 746, "new": 746, "milestones": {...} },
  "2025-05-23": { "total": 748, "new": 2, "changed": 5, "milestones": {...} },
  // ... continuing for each date
}
```

### 2. Property History
```json
{
  "propertyId": "12345",
  "firstSeen": "2025-05-22",
  "history": [
    { "date": "2025-05-22", "status": "Pole Permission: Approved" },
    { "date": "2025-06-10", "status": "Home Sign Ups: Approved" },
    // ... complete history
  ]
}
```

### 3. Analytics Dashboard Data
- Total properties over time
- Daily growth rates
- Milestone progression charts
- Agent performance metrics

## Next Steps

1. **Implement `process-csvs-chronologically.js`**
2. **Run initial processing** (est. 5-10 minutes total)
3. **Review change reports** for data quality issues
4. **Generate visualization data** for dashboards
5. **Import final clean data** to Firebase (optional)

## Command to Start

```bash
# Process just May first as a test
node process-csvs-chronologically.js \
  --start "2025-05-22" \
  --end "2025-05-30" \
  --output reports/chronological/may/

# If successful, process all
node process-csvs-chronologically.js \
  --start "2025-05-22" \
  --end "2025-07-14" \
  --output reports/chronological/all/
```

This approach gives us complete visibility into the data evolution without any Firebase complexity!