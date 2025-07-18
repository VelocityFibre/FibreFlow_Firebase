# SPEC-ANALYTICS-001: Pole Permission Analytics Module

**Specification ID**: SPEC-ANALYTICS-001  
**Domain**: Analytics  
**Created**: 2025-07-15  
**Status**: Draft  
**Priority**: High  

## Intent & Business Need

### What We Want to Achieve
Create a comprehensive pole permission analytics platform that transforms raw OneMap CSV data into actionable insights for project management, field operations, and performance tracking.

### Why This Matters
- **Field Operations**: Track pole approval workflows and identify bottlenecks
- **Project Management**: Understand timeline patterns and resource allocation  
- **Data Quality**: Ensure agent assignments and status changes are accurate
- **Performance Analytics**: Measure field agent productivity and project velocity
- **Future Scalability**: Prepare for API-based real-time data processing

## Success Criteria

### Functional Requirements
1. **Data Processing**
   - ✅ Parse CSV with 17-column schema (5,287+ records)
   - ✅ Filter for "Pole Permission: Approved" status
   - ✅ Handle mixed date formats (ISO + JavaScript)
   - ✅ Remove duplicates by pole number (keep earliest)

2. **Analysis Capabilities**
   - ✅ Generate complete dataset reports (3,732 unique poles)
   - ✅ Create monthly breakdowns (Apr-Jul 2025)
   - ✅ Produce weekly analysis (weeks ending Sunday)
   - ✅ Support custom date range filtering

3. **Quality Control**
   - ✅ Identify missing pole numbers
   - ✅ Validate agent name vs email alignment
   - ✅ Track duplicate entries removed
   - ✅ Generate processing summary statistics

4. **User Experience**
   - ✅ Multi-step wizard interface
   - ✅ Progress indicators for processing
   - ✅ Multiple export formats (Excel with sheets)
   - ✅ Error handling and validation feedback

### Technical Requirements
1. **Architecture**
   - ✅ Data source abstraction (CSV → API migration path)
   - ✅ Service-based processing pipeline
   - ✅ Component-based UI with Material Design
   - ✅ Signal-based state management

2. **Performance**
   - ✅ Process 5,287 records within 10 seconds
   - ✅ Memory-efficient large dataset handling
   - ✅ Progressive loading for better UX

3. **Integration**
   - ✅ Connect with pole-tracker for validation
   - ✅ Link to contractor assignments
   - ✅ Audit trail integration for changes

## Data Schema

### Input Data (17 Columns)
```
1. Property ID
2. 1map NAD ID
3. Pole Number
4. Drop Number
5. Stand Number
6. Status
7. Flow Name Groups
8. Site
9. Sections
10. PONs
11. Location Address
12. Latitude
13. Longitude
14. Field Agent Name (pole permission)
15. Latitude & Longitude
16. lst_mod_by
17. lst_mod_dt
```

### Processing Logic
1. **Filter**: Flow Name Groups contains "Pole Permission: Approved"
2. **Exclude**: "Home Sign Ups" without "Pole Permission: Approved"
3. **Deduplicate**: By pole number, keep earliest lst_mod_dt
4. **Validate**: Agent alignment and data quality

### Output Reports
- **Primary**: All_First_Status_Changes (3,732 entries)
- **Monthly**: First_Status_Changes_YYYY-MM
- **Weekly**: Week_Ending_YYYY-MM-DD
- **Quality**: Duplicate_Poles_Removed, No_Pole_Allocated, Agent_Data_Mismatches

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Create module structure and routing
- [ ] Implement data source abstraction layer
- [ ] Build CSV data source implementation
- [ ] Create basic UI components

### Phase 2: Processing Engine (Week 2)
- [ ] Implement pole data filtering logic
- [ ] Build duplicate removal algorithm
- [ ] Create agent validation system
- [ ] Add date parsing utilities

### Phase 3: Analytics & Reports (Week 3)
- [ ] Implement time-based analysis
- [ ] Create report generation system
- [ ] Build Excel export functionality
- [ ] Add processing statistics

### Phase 4: UI & UX (Week 4)
- [ ] Complete wizard interface
- [ ] Add progress indicators
- [ ] Implement error handling
- [ ] Create responsive design

### Phase 5: Integration & Testing (Week 5)
- [ ] Connect with existing systems
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation completion

## Test Scenarios

### Data Processing Tests
1. **Large Dataset**: Process 15,496 records, expect 5,287 filtered
2. **Duplicate Handling**: Verify 1,555 duplicates removed correctly
3. **Date Parsing**: Handle mixed ISO and JavaScript date formats
4. **Agent Validation**: Detect mismatched agent assignments

### Analysis Tests
1. **Monthly Breakdown**: Verify Apr (116), May (896), Jun (1,814), Jul (906)
2. **Weekly Analysis**: Confirm peak week June 1-8 (1,237 entries)
3. **Custom Range**: Test user-defined date filtering
4. **Quality Reports**: Validate quality control sheet accuracy

### Integration Tests
1. **CSV Upload**: Test file validation and parsing
2. **Export Function**: Verify Excel generation with multiple sheets
3. **Error Handling**: Test malformed data scenarios
4. **Performance**: Confirm sub-10-second processing

## Future Considerations

### API Migration (Phase 6)
- [ ] Implement ApiPoleDataSource
- [ ] Add real-time data processing
- [ ] Enable server-side filtering
- [ ] Maintain backward compatibility

### Advanced Features
- [ ] Automated scheduling
- [ ] Alert system for anomalies
- [ ] Dashboard integration
- [ ] Historical trend analysis

## Dependencies

### Internal
- Pole Tracker module (validation)
- Contractor module (agent data)
- Audit Trail (change tracking)
- Theme System (UI consistency)

### External
- OneMap CSV data format
- Excel export libraries
- Date parsing utilities
- Chart visualization (future)

## Success Metrics

### Quantitative
- Processing time < 10 seconds
- Data accuracy > 95%
- User completion rate > 90%
- Error rate < 1%

### Qualitative
- Intuitive user experience
- Clear error messages
- Comprehensive reports
- Future-proof architecture