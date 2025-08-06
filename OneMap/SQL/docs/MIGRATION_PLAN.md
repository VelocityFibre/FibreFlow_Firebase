# OneMap CSV to SQL Migration Plan
*Date: 2025/08/06*

## Executive Summary
Migrate from in-memory CSV processing to SQLite-based analytics to solve memory issues, improve performance, and eliminate manual Excel-to-CSV conversion risks.

## Current Problems

### 1. Memory Limitations
- JavaScript crashes processing 50,000+ records
- Firebase imports fail with large status updates
- Browser tabs freeze during processing

### 2. Data Corruption Risks
- Manual Excel → CSV conversion
- Date formatting issues (serial numbers)
- Loss of precision in numbers
- Special characters corrupted
- Leading zeros stripped

### 3. Performance Issues
- Full dataset loaded into memory
- No query optimization
- Slow aggregations (minutes vs milliseconds)
- No indexing capabilities

### 4. Limited Analytics
- Basic JavaScript array operations
- No complex joins or aggregations
- Difficult time-series analysis
- No ad-hoc querying

## Solution: SQLite + Excel Direct Import

### Why SQLite?
1. **Zero Infrastructure** - File-based, no server needed
2. **Production Ready** - Handles millions of records
3. **Fast Queries** - Proper indexing and optimization
4. **Standard SQL** - Portable knowledge
5. **Perfect Fit** - Ideal for analytical workloads

### Why Direct Excel Import?
1. **No Conversion** - Eliminates CSV risks
2. **Data Integrity** - Preserves all data types
3. **Multi-sheet Support** - Process all data
4. **Automation Ready** - Script the entire flow

## Migration Strategy

### Phase 1: Foundation (Week 1) ✅
- [x] Create SQLite schema design
- [x] Build Excel import functionality
- [x] Implement basic analytics queries
- [x] Create CLI interface
- [x] Test with sample data

### Phase 2: Data Migration (Week 2)
- [ ] Import historical OneMap Excel files
- [ ] Validate data integrity
- [ ] Compare results with existing CSV analysis
- [ ] Document any discrepancies
- [ ] Create data quality reports

### Phase 3: Analytics Development (Week 3)
- [ ] Port existing CSV analytics to SQL
- [ ] Create new analytical capabilities
- [ ] Build report templates
- [ ] Implement export functionality
- [ ] Performance optimization

### Phase 4: Integration (Week 4)
- [ ] Create API endpoints for FibreFlow
- [ ] Build dashboard UI components
- [ ] Implement automated imports
- [ ] Set up scheduled reports
- [ ] User training documentation

### Phase 5: Production Rollout (Week 5)
- [ ] Final testing and validation
- [ ] Backup existing data
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Gather user feedback

## Technical Architecture

### Data Flow
```
OneMap Excel Export
    ↓
SQLite Importer (Node.js)
    ↓
SQLite Database (indexed)
    ↓
Analytics Engine (SQL)
    ↓
Export (Excel/CSV/JSON)
    ↓
FibreFlow Dashboard (optional)
```

### Database Schema
```sql
-- Core tables
status_changes     # All status change records
pole_capacity      # Track drops per pole
import_batches     # Import history

-- Analytics views
first_approvals    # First approval per pole
agent_performance  # Agent metrics
daily_activity     # Time-series data
```

## Migration Checklist

### Pre-Migration
- [ ] Backup all existing CSV files
- [ ] Document current analytics queries
- [ ] List all report requirements
- [ ] Get sample Excel files from OneMap

### During Migration
- [ ] Import all historical data
- [ ] Validate row counts match
- [ ] Verify date integrity
- [ ] Check numeric precision
- [ ] Test all analytics queries

### Post-Migration
- [ ] Compare reports with CSV version
- [ ] Performance benchmarks
- [ ] User acceptance testing
- [ ] Documentation complete
- [ ] Training provided

## Risk Mitigation

### Data Loss Prevention
1. Keep all original Excel files
2. Never delete CSV backups
3. Version control SQL scripts
4. Regular database backups
5. Test imports thoroughly

### Rollback Plan
1. Original CSV process remains available
2. All data preserved in multiple formats
3. Can revert to CSV if needed
4. No breaking changes to FibreFlow

## Success Metrics

### Performance
- ✅ Import 50,000 records without crashes
- ✅ Query response < 100ms
- ✅ Report generation < 10 seconds
- ✅ Handle 500,000+ records

### Data Quality
- ✅ Zero data loss during migration
- ✅ All dates correctly preserved
- ✅ Numeric precision maintained
- ✅ Special characters intact

### User Experience
- ✅ Faster report generation
- ✅ More analytical capabilities
- ✅ Ad-hoc query support
- ✅ Automated imports

## Next Steps

1. **Immediate** (Today)
   - Get Excel file from OneMap
   - Test import with real data
   - Validate column mappings

2. **This Week**
   - Import all August data
   - Create standard reports
   - Compare with CSV results

3. **Next Week**
   - Build integration API
   - Create UI components
   - Deploy to test environment

## Conclusion
This migration will solve current memory and performance issues while providing a robust foundation for future analytics growth. The direct Excel import eliminates manual conversion risks, and SQLite provides enterprise-grade query capabilities with zero infrastructure overhead.