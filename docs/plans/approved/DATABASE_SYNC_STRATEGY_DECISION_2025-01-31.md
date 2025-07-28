# Database Sync Strategy Decision - January 31, 2025

## 🎯 EXECUTIVE DECISION

**RECOMMENDATION: DO NOT SYNC ONEMAP HISTORICAL DATA TO PRODUCTION**

## 📋 Decision Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **OneMap Historical Data** | Keep in staging only | Purpose mismatch with production needs |
| **Production Database** | Active projects only | Maintain performance and focus |
| **Sync Module** | Selective use only | Use for specific active poles when needed |
| **Reporting** | Query staging directly | Keep historical data accessible |

## 📊 Impact Analysis

### Current Database Status
- **Production**: 7,247 `planned-poles` records (active work)
- **Staging**: ~12,000+ OneMap records (historical data)
- **Potential impact**: Would double production size if synced

### Performance Implications
- **Cost**: Higher Firestore read charges
- **Speed**: Slower queries on larger collections
- **Maintenance**: More complex data management
- **Scalability**: Limited future growth

## 🏗️ Approved Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   OneMap CSVs   │───▶│ vf-onemap-data  │
│  (Daily exports)│    │   (Staging)     │
└─────────────────┘    │                 │
                       │ ✅ Historical   │
                       │ ✅ Reporting    │
                       │ ✅ Analytics    │
                       │ ✅ Audit trail  │
                       └─────────┬───────┘
                                 │
                          [Selective sync]
                          [Only when needed]
                                 │
                                 ▼
                       ┌─────────────────┐
                       │ fibreflow-73daf │
                       │  (Production)   │
                       │                 │
                       │ ✅ Active work  │
                       │ ✅ Fast queries │
                       │ ✅ Lean & focused│
                       └─────────────────┘
```

## 📝 Implementation Guidelines

### 1. Staging Database Usage
- **Purpose**: Data warehouse for all OneMap historical data
- **Use cases**: Reporting, analytics, audit trails, historical lookups
- **Maintenance**: Regular imports from OneMap CSVs
- **Access**: Direct queries for reports and analysis

### 2. Production Database Policy
- **Purpose**: Active project management only
- **Criteria for inclusion**: Only poles part of current FibreFlow projects
- **Size management**: Keep lean and focused
- **Performance**: Optimize for operational queries

### 3. Selective Sync Criteria
Sync poles to production ONLY when:
- Part of an active FibreFlow project
- Require real-time status tracking
- Need integration with current workflows
- Specifically requested by operations team

### 4. Reporting Strategy
- **Historical reports**: Query staging database directly
- **Operational reports**: Use production database
- **Combined reports**: Query both databases as needed
- **Future**: Implement BigQuery for advanced analytics

## 🔧 Technical Implementation

### Approved Scripts Usage
```bash
# FOR HISTORICAL DATA (Staging)
cd OneMap/scripts/firebase-import/
node bulk-import-with-history.js "filename.csv"

# FOR SELECTIVE SYNC (Production) - Only when needed
cd sync/scripts/
node create-pre-sync-report.js 50    # Small batches
node sync-with-status-history.js     # After manual approval
```

### Query Patterns
```javascript
// Historical data from staging
const historicalData = await stagingDb
  .collection('vf-onemap-processed-records')
  .where('dateRange', '>=', startDate)
  .get();

// Active work from production  
const activeWork = await productionDb
  .collection('planned-poles')
  .where('status', 'in', ['active', 'in_progress'])
  .get();
```

## 📈 Benefits of This Strategy

1. **Performance**: Production database stays fast and responsive
2. **Cost efficiency**: Lower Firestore read costs
3. **Data integrity**: Clear separation of concerns
4. **Scalability**: Can handle future growth without bloat
5. **Flexibility**: Historical data still accessible when needed

## 🎯 Success Metrics

- **Production database size**: Maintain under 10,000 active records
- **Query performance**: Sub-second response times
- **Cost control**: Minimize Firestore usage charges
- **Data accessibility**: Historical data available within 3 seconds

## 📅 Review Schedule

| Period | Review Focus | Action Items |
|--------|-------------|--------------|
| **Monthly** | Database sizes | Monitor growth patterns |
| **Quarterly** | Performance metrics | Optimize slow queries |
| **Bi-annually** | Strategy effectiveness | Assess if approach still valid |

## 🚨 Exception Process

If OneMap data sync to production becomes necessary:

1. **Document business justification**
2. **Define specific scope** (which poles, time period)
3. **Assess performance impact**
4. **Get stakeholder approval**
5. **Implement selective sync**
6. **Monitor results**

## 📋 Action Items

### Immediate (Next 48 hours)
- [x] Document decision in key locations
- [x] Update sync module documentation
- [x] Communicate to relevant teams

### Short Term (Next 2 weeks)
- [ ] Create staging database reporting tools
- [ ] Implement selective sync procedures
- [ ] Train team on new strategy

### Medium Term (Next month)
- [ ] Set up BigQuery integration for advanced analytics
- [ ] Optimize staging database queries
- [ ] Create automated reporting dashboards

---

**Decision Authority**: System Architecture Team  
**Implementation Date**: 2025-01-31  
**Next Review**: 2025-02-28  
**Status**: ✅ APPROVED AND DOCUMENTED