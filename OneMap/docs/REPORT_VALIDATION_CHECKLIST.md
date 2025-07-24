# Report Validation Checklist

*Version 1.0 - 2025-07-24*

## Pre-Generation Checklist

### Data Source Validation
- [ ] CSV file exists and is readable
- [ ] File encoding is UTF-8
- [ ] Delimiter is correct (semicolon `;`)
- [ ] Required columns present:
  - [ ] Pole Number
  - [ ] Drop Number
  - [ ] Status
- [ ] No obvious data corruption

### Script Validation
- [ ] Using standardized report generator
- [ ] Script version is current
- [ ] All dependencies installed
- [ ] Test mode runs successfully

## During Generation Checklist

### Processing Validation
- [ ] Row count matches source file
- [ ] Validation errors < 1% of total
- [ ] No memory/performance issues
- [ ] Progress indicators working

### Calculation Validation
- [ ] Unique values counted (not records)
- [ ] Average calculations verified
- [ ] Percentages sum to 100%
- [ ] No impossible values (>12 drops)

## Post-Generation Checklist

### Report Content Validation
- [ ] All sections present:
  - [ ] Executive Summary
  - [ ] Key Metrics
  - [ ] Distribution Table
  - [ ] Capacity Analysis
  - [ ] Data Quality Issues
- [ ] Numbers are reasonable
- [ ] Formatting is correct

### Cross-Verification
- [ ] Spot check 5 specific poles:
  - [ ] LAW.P.A788 drop count
  - [ ] Highest capacity pole
  - [ ] Random pole 1
  - [ ] Random pole 2
  - [ ] Random pole 3
- [ ] Total records match source
- [ ] Status breakdown sums correctly

### Quality Assurance
- [ ] Validation log created
- [ ] No calculation errors reported
- [ ] Report saved to correct location
- [ ] Filename follows convention

## Approval Process

### Level 1: Automated Checks ✅
- Validation script passes
- Cross-verification successful
- No errors in log

### Level 2: Manual Review 👀
- Numbers seem reasonable
- Trends match expectations
- No obvious anomalies

### Level 3: Sign-off 📝
- Report reviewed by: _______________
- Date: _______________
- Approved: [ ] Yes [ ] No
- Comments: _______________

## Red Flags 🚩

**Stop and investigate if:**
- Average drops per pole > 5
- Any pole shows > 12 drops
- Unique poles > total records
- Duplicate drops > 10% of total
- Status percentages don't match previous reports
- Validation errors during generation

## Corrective Actions

### If validation fails:
1. Check source data integrity
2. Verify script is up to date
3. Review error logs
4. Run test suite
5. Regenerate with verbose logging

### If numbers seem wrong:
1. Compare with previous reports
2. Spot check raw data
3. Run independent verification
4. Check for script updates
5. Consult with team

## Archive Requirements

When report is approved:
1. Save to `Reports/poles/` directory
2. Include validation log
3. Archive source CSV file
4. Document any anomalies
5. Update report index

---

*This checklist ensures all pole status reports are accurate and validated before distribution.*