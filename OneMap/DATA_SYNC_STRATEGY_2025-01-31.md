# OneMap Data Sync Strategy - January 31, 2025

## 🎯 Executive Summary

**Recommendation: DO NOT sync OneMap historical data to production FibreFlow database**

Keep staging (vf-onemap-data) as the data warehouse for historical records.
Only sync specific poles to production when they become part of active projects.

## 📊 Current Status

### Database Sizes
- **Production `planned-poles`**: 7,247 records
- **Staging ready to sync**: ~5,000 records with pole numbers  
- **Total if synced**: ~12,000+ records (would double production size)

### Data Overview
- **What it is**: Historical OneMap home sign-ups and pole permissions
- **Source**: Daily CSV exports from client's field system
- **Time period**: May-June 2025 (Lawley project)
- **Purpose**: Track completed permissions, not active work

## 🚫 Why NOT to Sync

### 1. Purpose Mismatch
- **OneMap data**: Historical tracking and audit trail
- **FibreFlow**: Active project management only
- These are "completed" records, not current work

### 2. Performance Impact
- Would double the planned-poles collection size
- Firestore charges per document read
- Larger collections = slower queries = higher costs
- Production app doesn't need historical data

### 3. Data Quality Issues  
- Many records missing pole numbers
- Duplicate entries for workflow tracking
- Not all data relevant to active operations

## ✅ Recommended Architecture

```
OneMap CSVs 
    ↓
vf-onemap-data (Staging)
├── Historical records ✅
├── Reporting/Analytics ✅  
├── Audit trail ✅
├── 12,000+ records
└── Complete data warehouse

    ↓ [Selective sync only when needed]
    
fibreflow-73daf (Production)
├── Active projects only ✅
├── Current work ✅
├── Fast queries ✅
└── 7,247 records (stays lean)
```

## 📋 Implementation Strategy

### 1. Keep Staging as Data Warehouse
- All OneMap historical data stays in vf-onemap-data
- Use for reporting, analytics, and audit trails
- Query directly when historical data needed

### 2. Selective Sync Criteria
Only sync poles that are:
- Part of active FibreFlow projects
- Need real-time tracking
- Have active work assignments
- Specifically requested by operations team

### 3. Reporting Architecture
```javascript
// Reports query staging directly
const historicalData = await stagingDb
  .collection('vf-onemap-processed-records')
  .where('dateRange', '>=', startDate)
  .get();

// Production stays focused on active work
const activeWork = await productionDb
  .collection('planned-poles')
  .where('status', 'in', ['active', 'in_progress'])
  .get();
```

### 4. Future BigQuery Integration
- Set up BigQuery for advanced analytics
- Export staging data to BigQuery for reporting
- Keep production Firestore lean

## 🔧 How to Implement Selective Sync

If specific poles need to be in production:

```javascript
// Example: Sync only specific project poles
const selectiveSyncPoles = async (projectName) => {
  const poles = await stagingDb
    .collection('vf-onemap-processed-records')
    .where('site', '==', projectName)
    .where('status', '==', 'Pole Permission: Approved')
    .where('poleNumber', '!=', '')
    .get();
    
  // Sync only these specific poles
  await syncToProduction(poles);
};
```

## 📈 Benefits of This Strategy

1. **Performance**: Production database stays fast
2. **Cost**: Lower Firestore read costs
3. **Clarity**: Clear separation of historical vs active data
4. **Flexibility**: Can still access historical data when needed
5. **Scalability**: Production won't bloat with historical records

## 🚨 Action Items

1. **Immediate**: Stop the bulk sync process
2. **Short term**: Create reporting tools that query staging
3. **Medium term**: Implement selective sync for active projects
4. **Long term**: Set up BigQuery for historical analytics

## 📊 Decision Matrix

| Factor | Sync All | Keep in Staging |
|--------|----------|-----------------|
| Performance | ❌ Slower | ✅ Fast |
| Cost | ❌ Higher | ✅ Lower |
| Data Access | ✅ Single DB | ⚠️ Two DBs |
| Maintenance | ❌ Complex | ✅ Simple |
| Scalability | ❌ Limited | ✅ Excellent |

**Clear Winner: Keep in Staging**

---

*Decision Date: 2025-01-31*
*Decided By: System Architecture Review*
*Next Review: When active project needs arise*