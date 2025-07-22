# OneMap Script Inventory & Analysis

*Date: 2025-01-23*  
*Total Scripts: 116 JavaScript files*

## Script Organization by Purpose

### 🎯 Core Import/Sync Scripts (Priority 1)
These are the essential scripts for the import workflow:

1. **`process-1map-sync-simple.js`** - Primary CSV to staging import
2. **`sync-to-production.js`** - Staging to production sync
3. **`complete-import-batch.js`** - Resume incomplete imports
4. **`daily-import-simple.js`** - V2 Process 1 implementation

### 📊 Analysis Scripts (Priority 2)
Scripts for analyzing imported data:

1. **`analyze-first-instances.js`** - Track first occurrence of statuses
2. **`analyze-staging-sources.js`** - Analyze data sources in staging
3. **`daily-change-tracker.js`** - Track daily changes
4. **June Analysis Series**:
   - `analyze-june-changes.js` (+ v2, detailed)
   - `analyze-june-duplicates.js` (+ v2)
   - `analyze-june3-to-june5-changes.js`

### 🔍 Status Check Scripts (Too Many!)
Multiple scripts checking various statuses:

- `check-import-progress.js`
- `check-staging-count.js`
- `check-sync-status.js`
- `check-final-production-status.js`
- `check-june5-import-status.js`
- `quick-staging-check.js`
- `staging-summary.js`

**Problem**: Overlapping functionality, unclear which to use when.

### 📝 Report Generation Scripts
- `generate-import-report.js`
- `generate-full-import-report.js`
- `generate-quick-report.js`
- `generate-june3-report.js`
- `create-full-june2-report.js`

### 🔧 Utility Scripts
- `split-csv-by-pole.js` - Split large CSVs
- `fix-csv-parsing.js` - Handle CSV parsing issues
- `cleanup-staging.js` - Database maintenance
- `download-from-gdrive.js` - Download source files

### 🧪 Test Scripts
- `test-small-sync.js`
- `test-updated-sync.js`
- `test-tracking-hierarchy.js`

## Redundancy Analysis

### Import Scripts (Need Consolidation)
- `import-csv-efficient.js`
- `import-onemap-daily.js`
- `import-onemap-optimized.js`
- `import-june5-simple.js`
- `import-june5-new-only.js`
- `process-1map-sync-simple.js` ✅ (Keep this one)
- `daily-import-simple.js` ✅ (Keep for V2)

**Recommendation**: Keep only the marked scripts, archive others.

### June-Specific Scripts (Historical)
Over 20 scripts specifically for June data analysis. These should be moved to an archive folder as they're historical analyses.

### Verification Scripts (Overlap)
- `verify-june5-status.js`
- `verify-june5-complete.js`
- `verify-staging-vs-csv.js`
- `verify-missing-flags.js`

**Recommendation**: Create one unified verification script.

## Recommended Script Structure

```
OneMap/
├── scripts/
│   ├── core/                    # Essential scripts only
│   │   ├── import-daily.js      # Consolidated daily import
│   │   ├── sync-production.js   # Production sync
│   │   └── complete-batch.js    # Batch completion
│   │
│   ├── analysis/                # Analysis tools
│   │   ├── first-instances.js   # Progress tracking
│   │   ├── daily-changes.js     # Change detection
│   │   └── data-quality.js      # Quality checks
│   │
│   ├── reports/                 # Report generation
│   │   ├── daily-report.js      # Standard daily
│   │   └── progress-report.js   # Progress tracking
│   │
│   ├── utilities/               # Helper scripts
│   │   ├── csv-splitter.js      # Split large files
│   │   ├── cleanup.js           # Database maintenance
│   │   └── download.js          # File downloads
│   │
│   └── archive/                 # Historical/deprecated
│       └── june-2025/           # June-specific analyses
```

## Scripts to Deprecate

### Redundant Import Scripts
- All `import-*.js` except core ones
- Multiple `process-*.js` variants
- June-specific import scripts

### Overlapping Check Scripts
- Consolidate all `check-*.js` into one status script
- Remove single-purpose verification scripts

### Historical Analysis
- Move all June-specific scripts to archive
- Keep only generalizable analysis tools

## Action Items

1. **Immediate**: Create `scripts/archive/` and move historical scripts
2. **Short-term**: Consolidate import scripts to 2-3 core scripts
3. **Medium-term**: Reorganize into proposed structure
4. **Long-term**: Create unified CLI tool for all operations

## Key Scripts for Daily Use

Based on V2 plan, these should be the primary scripts:

### Process 1 (Daily Import)
```bash
node scripts/core/import-daily.js [csv-file]
```

### Process 2 (Progress Analysis)
```bash
node scripts/analysis/first-instances.js
node scripts/reports/progress-report.js
```

### Production Sync
```bash
node scripts/core/sync-production.js --dry-run
node scripts/core/sync-production.js
```

## Conclusion

The OneMap module has 116 scripts, but only needs about 10-15 core scripts. The rest are iterations, experiments, or historical analyses that should be archived. Implementing the V2 simplified approach requires consolidating functionality and creating clear, single-purpose scripts.