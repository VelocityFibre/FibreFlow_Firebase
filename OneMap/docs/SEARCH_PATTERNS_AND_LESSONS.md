# Search Patterns and Lessons Learned
**Created**: 2025-07-23
**Purpose**: Document effective search strategies for OneMap data analysis

## 🎯 Key Lessons from Pole Permission Search

### 1. **Use Existing Processed Data First**
**Pattern**: Don't re-analyze raw CSVs when processed summaries exist

**Example**: 
- ❌ **Inefficient**: Parse 16,000+ raw CSV records looking for patterns
- ✅ **Efficient**: Use pre-split data in `split_data/` folders that already categorize records

**Why It Works**: 
- Your scripts already do the heavy lifting (split-csv-by-pole.js)
- Summary files like `permission_records_analysis.txt` give instant answers
- 1000x faster than re-processing

### 2. **Follow the Data Flow**
**Pattern**: Understand how data is processed and where outputs land

```
Raw CSV → split-csv-by-pole.js → split_data/YYYY-MM-DD/
                                    ├── permission_records.csv (no poles)
                                    ├── pole_records.csv (has poles)
                                    ├── permission_records_analysis.txt
                                    └── pole_records_analysis.txt
```

**Lesson**: Always check for analysis.txt files first - they contain pre-computed answers

### 3. **Cross-Reference Multiple Sources**
**Pattern**: Verify findings across different analysis outputs

**Example Search Strategy**:
1. Check split analysis files for counts
2. Verify with Python analysis scripts
3. Cross-check with timeline.json for historical view
4. Validate against report files

**Why**: Catches discrepancies and builds confidence in findings

### 4. **Understand Business Workflow Before Data**
**Pattern**: Map statuses to business processes to identify what's normal vs problematic

**OneMap Workflow Discovered**:
```
No Pole Number Statuses (Expected):
- "Home Sign Ups: *"
- "Home Installation: *"
- Empty status records

Has Pole Number Statuses (Expected):
- "Pole Permission: Approved"
- "Pole Permission: *"
```

**Lesson**: Missing data might be normal workflow, not a data quality issue

### 5. **Look for Analysis Scripts Before Writing New Ones**
**Pattern**: Check what analysis has already been done

**Found in OneMap**:
- `analyze_drops.py` - Pole capacity analysis
- `process-split-chronologically.js` - Timeline analysis
- `compare-split-csvs.js` - Daily comparisons

**Lesson**: Reuse existing analysis tools - they've already solved common questions

## 📋 Search Checklist for Future Analysis

### Before Starting Any Search:
- [ ] Check `docs/` for existing analysis documentation
- [ ] Look for `*_analysis.txt` summary files
- [ ] Check for existing Python/JS analysis scripts
- [ ] Review folder structure for pre-processed data

### Search Priority Order:
1. **Summary files** (`*_analysis.txt`, `*.json` reports)
2. **Documentation** (`docs/`, `reports/`, README files)
3. **Analysis scripts** (`analyze_*.py`, `*-report.js`)
4. **Processed data** (`split_data/`, `exports/`)
5. **Raw data** (original CSVs - last resort)

### Key Directories to Check:
```
OneMap/
├── docs/           # Documentation and guides
├── reports/        # Generated analysis reports
├── split_data/     # Pre-processed, categorized data
├── scripts/        # Processing and analysis tools
├── Analysis/       # Python analysis scripts
└── exports/        # Export summaries
```

## 🔍 Effective Search Queries

### Finding Status Patterns:
```bash
# In split_data folders
grep -i "permission" *_analysis.txt
grep "Status:" *_analysis.txt | sort | uniq -c

# In Python scripts
grep -r "status" Analysis/*.py
```

### Finding Data Relationships:
```bash
# Look for join/merge operations
grep -r "merge\|join\|relationship" scripts/
```

### Finding Business Logic:
```bash
# Search for workflow or business terms
grep -ri "workflow\|approval\|process" docs/
```

## 💡 Meta-Learning: Document As You Discover

### Pattern Recognition:
When you discover a pattern (like "all approved permissions have poles"), immediately:
1. Document the finding
2. Note how you verified it
3. Save the verification method for reuse

### Create Analysis Trails:
```
Question → Search Method → Files Checked → Finding → Verification → Documentation
```

### Example Trail from Today:
```
Q: "Do we have pole permissions with no pole numbers?"
↓
Method: Check pre-split data files
↓
Files: split_data/2025-07-21/*_analysis.txt
↓
Finding: 5,791 records without poles, but none are "Pole Permission: Approved"
↓
Verification: Cross-checked with analyze_drops.py output
↓
Documentation: This file + updated reports
```

## 🚀 Speed Optimization Tips

### Fastest to Slowest Search Methods:
1. **Memory/Documentation** (0 seconds) - Check CLAUDE.md, docs/
2. **Summary Files** (1-2 seconds) - Pre-computed analysis
3. **Grep Searches** (5-10 seconds) - Text pattern matching
4. **Script Execution** (30-60 seconds) - Run analysis scripts
5. **Raw Data Processing** (5-10 minutes) - Parse CSVs from scratch

### Time-Saving Rule:
**"Read before you run, search before you script"**

## 📝 Future Improvements

### Suggested Enhancements:
1. Create a `QUICK_ANSWERS.md` with common questions pre-answered
2. Add more descriptive filenames (e.g., `pole_permissions_without_poles_analysis.txt`)
3. Generate a searchable index of all findings
4. Add timestamps to all analysis files

### Documentation Pattern:
Every major analysis should produce:
- Summary statistics file
- Detailed findings report
- How-to-reproduce guide
- Lessons learned notes

---

*Remember: The best analysis is the one you don't have to do twice. Document everything!*