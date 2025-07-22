# OneMap Project Understanding - Version 2.0

*Last Updated: 2025-01-22*  
*Status: Clarification & Reorganization*

## 🎯 Project Goal

Track daily progress of fiber optic pole installations and home connections from OneMap data exports, with accurate reporting that avoids counting duplicates.

## 📊 Current Situation

### Data Reality
1. **OneMap provides daily CSV exports** containing:
   - All historical records (cumulative)
   - New records added that day
   - Each row has a unique Property ID (like a transaction ID)
   - Same physical location can have multiple rows over time

2. **Current Staging Database**:
   - Contains 8,944 records (mix of May and June data)
   - June 3rd data is already imported
   - June 5th data ready to import (6,039 records total, ~2,555 new)

### The Challenge
- **Property ID** = Unique per row (not useful for tracking changes)
- **Physical entities** we need to track:
  - **Poles** (identified by Pole Number when assigned)
  - **Drops** (customer connections, identified by Drop Number)
  - **Addresses** (physical locations, can have multiple poles)
- **Many records lack pole numbers** in early stages

## 🔄 Two-Process Approach (Simplified)

Based on our discussion, we need to split this into two separate processes:

### Process 1: Daily Import & Basic Change Detection
**Purpose**: Simple daily visibility
- Import new records (by Property ID)
- Detect what's new today
- Detect what's missing (was there yesterday, not today)
- Basic counts and statistics
- **NO complex logic** - just simple changes

### Process 2: First Instance Analysis & Progress Tracking
**Purpose**: Accurate progress metrics
- Track first occurrence of each status
- Handle records without pole numbers
- Cross-reference drops to poles
- Generate management reports
- **Complex logic** handled separately

## 📋 Implementation Plan

### Phase 1: Get Basic Daily Import Working (TODAY)
1. Import June 5th data to staging
2. Show what's new vs June 3rd
3. Flag any missing records
4. Simple report generation

### Phase 2: Build First Instance Tracking (TOMORROW)
1. Design separate tracking collections
2. Implement pole/drop/address hierarchy
3. Build cross-reference logic
4. Generate progress reports

## 🗂️ File Organization

### Documentation Structure
```
OneMap/
├── docs/
│   ├── PROJECT_UNDERSTANDING_V2.md (this file)
│   ├── ONEMAP_IMPORT_TRACKING_SYSTEM.md (original plan)
│   ├── ONEMAP_TRACKING_ASSUMPTIONS.md (tracking rules)
│   ├── VERIFICATION_METHODS.md (data quality)
│   └── COMPARISON_STRATEGY.md (technical approach)
│
├── scripts/
│   ├── Process 1 - Daily Import/
│   │   ├── daily-import-simple.js
│   │   └── detect-changes.js
│   │
│   └── Process 2 - Progress Analysis/
│       ├── first-instance-analyzer.js
│       └── progress-reporter.js
│
└── reports/
    ├── daily-changes/
    └── progress-tracking/
```

## 🔑 Key Decisions Made

1. **Split into 2 processes** - Don't mix simple import with complex analysis
2. **Property ID for daily changes** - Simple and reliable
3. **Hierarchy tracking for progress** - Pole → Drop → Address → Property
4. **Separate collections later** - For different milestone types
5. **Focus on visibility first** - Get data flowing, refine later

## ❓ Open Questions (To Clarify)

1. **Missing Records**: If records disappear from daily export, should we:
   - Mark them as inactive?
   - Delete from staging?
   - Keep but flag as missing?

2. **Historical Data**: Should we:
   - Keep all historical imports?
   - Only keep latest state?
   - Archive old imports?

3. **Reporting Frequency**: 
   - Daily reports only?
   - Weekly summaries?
   - Monthly trends?

## 🎯 Next Steps

1. **Confirm this understanding** is correct
2. **Decide on Process 1 or 2** to implement first
3. **Run June 5th import** using chosen approach
4. **Generate reports** to validate approach
5. **Iterate and improve** based on results

## 📝 Key Terminology

- **Property ID**: Unique identifier per CSV row (not per house)
- **Pole Number**: Identifier for physical pole (e.g., LAW.P.B167)
- **Drop Number**: Identifier for customer connection
- **First Instance**: First time a status appears for a tracking entity
- **Tracking Entity**: Pole, Drop, Address, or Property being tracked

---

*This document represents our current understanding of the OneMap import requirements. Please review and confirm before we proceed with implementation.*