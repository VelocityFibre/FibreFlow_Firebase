# OneMap Context Reference Card

## antiHall Principles Applied
✅ **Every claim is validated with actual data**
✅ **No assumptions - data drives conclusions**  
✅ **Export validation proof with every analysis**

## Context Engineering Applied
✅ **Follows OneMap/CLAUDE.md principles**
✅ **First principles: One pole = One location**
✅ **Clear distinction: Workflow updates vs Location conflicts**

## How We Apply These Principles

### 1. In Analysis Scripts
```python
# antiHall: Validate before claiming
actual_count = len(conflicts)
print(f"✓ Verified: {actual_count} poles at multiple locations")

# Context: Understand the domain
# Multiple entries at SAME address = Normal workflow
# Same pole at DIFFERENT addresses = Problem
```

### 2. In Reports
- Show exact numbers with evidence
- Distinguish workflow from duplicates
- Provide validation proof files

### 3. In Exports
- Only export TRUE conflicts (different locations)
- Include status to help identify correct location
- Simple format for field verification

## Quick Validation Checklist
Before any claim about the data:
- [ ] Count it in the actual data
- [ ] Show examples as proof
- [ ] Save validation evidence
- [ ] Reference source data

## Key Context Points
1. **Workflow Tracking**: Multiple entries per property are NORMAL
2. **Flow Name Groups**: Contains cumulative history
3. **True Duplicates**: Only poles at multiple physical locations
4. **Data Quality**: 63% missing field agents, needs improvement

---
*Always refer to OneMap/CLAUDE.md for complete context*