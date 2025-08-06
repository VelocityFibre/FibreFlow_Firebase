# Daily Validation Report - 2025-08-06

**Generated**: 2025-08-06T15:31:40.113Z
**System**: DuckDB Comprehensive Validation Framework

## 📊 Executive Summary

- **Validation Score**: 0.0%
- **Critical Issues**: 3
- **Warnings**: 3
- **Passed Checks**: 0

## 1️⃣ Excel Import Validation

## 2️⃣ Business Logic Validation

### ❌ Critical Issues

**Workflow Violations**
- 776 installations without Home Sign Up approval
- Sample affected records:
  - Property 353314
  - Property 435363
  - Property 368813

**Backwards Progressions**
- 46 properties moved backwards in workflow
- Sample affected records:
  - Property 342119
  - Property 245463
  - Property 348207

**Pole Capacity Exceeded**
- 19 poles have more than 12 drops
- Sample affected records:
  - Property N/A
  - Property N/A
  - Property N/A

### ⚠️ Warnings

**Missing Required Fields**
- 733 installations missing pole/drop numbers

**Agent Name Inconsistency**
- 654 variations in agent naming

## 3️⃣ Statistical Anomaly Detection

### ⚠️ Warnings

**Address Anomalies**
- 6 addresses with suspicious property counts

## 🎯 Recommendations

1. **Immediate Action Required**: Address all critical issues before next import
2. **Data Correction**: Review and correct identified data quality issues
3. **Process Review**: Investigate root causes of validation failures
4. **Warning Review**: Analyze warning patterns for systemic issues
5. **Training**: Consider agent training for consistency
6. **Continuous Monitoring**: Run validation daily after each import
7. **Baseline Update**: Review statistical baselines weekly
