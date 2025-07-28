# OneMap Data Agent Test Scenarios

## Test Framework for OneMap Agent

### Test 1: CSV Processing Scenario
**Input**: "I have a new CSV file with 50,000 pole permission records from Lawley. How do I process it?"

**Expected Response**:
- Check file size and suggest splitting if needed
- Validate CSV format and encoding
- Run duplicate detection
- Generate import summary
- Provide specific commands

**Evaluation Criteria**:
- [ ] Mentions file splitting for large files
- [ ] Includes validation steps
- [ ] References GPS duplicate detection
- [ ] Provides actual script commands
- [ ] Considers authentication setup

---

### Test 2: Report Generation
**Input**: "Generate a daily report comparing yesterday's and today's pole permissions"

**Expected Response**:
- Use enhanced-daily-compare.js
- Show summary statistics
- Highlight new permissions
- Identify duplicate claims
- Format for stakeholders

**Should Include**:
- Total records processed
- New vs existing records
- Agent performance metrics
- Data quality indicators
- Actionable insights

---

### Test 3: Data Validation & Transformation
**Input**: "We have records with missing GPS coordinates and agent names. How do we handle this?"

**Expected Response**:
- Quantify the issue (63% missing agents)
- Provide validation strategy
- Suggest data enrichment approach
- Map to FibreFlow schema
- Handle edge cases

**Must Address**:
- GPS validation rules
- Agent name resolution
- Default values strategy
- Tracking hierarchy usage
- Quality thresholds

---

### Test 4: Database Sync Scenario
**Input**: "Ready to sync 1,000 validated records from staging to production FibreFlow"

**Expected Response**:
- Pre-sync validation checklist
- Schema mapping details
- Batch processing approach
- Error handling strategy
- Rollback procedures

**Technical Requirements**:
- Use service account auth
- Map OneMap → FibreFlow fields
- Respect pole uniqueness
- Update payment status
- Generate sync report

---

### Test 5: Duplicate Detection
**Input**: "We found the same pole LAW.P.B167 at 5 different addresses. How do we resolve this?"

**Expected Response**:
- GPS-based analysis (10m radius)
- Temporal analysis (earliest claim)
- Agent verification process
- Business rule application
- Resolution documentation

**Should Cover**:
- GPS proximity checking
- Date/time precedence
- Agent credibility factors
- Payment implications
- Audit trail requirements

---

### Test 6: Complex Multi-Step Workflow
**Input**: "New batch arrived: Import CSV, detect duplicates, generate reports, and sync approved records"

**Expected Workflow**:
```bash
# 1. Import to staging
node process-1map-sync-simple.js "lawley_july_28.csv"

# 2. Run duplicate detection
python3 analyze_gps_duplicates.py

# 3. Generate reports
node GraphAnalysis/enhanced-daily-compare.js

# 4. Sync approved records
node sync-to-production.js --batch="july_28"

# 5. Update payment status
node update-payment-status.js --batch="july_28"
```

---

## Common Edge Cases to Test

1. **Corrupted CSV files**
   - Encoding issues (non-UTF8)
   - Missing columns
   - Malformed data

2. **GPS edge cases**
   - Invalid coordinates (0,0)
   - Coordinates outside project area
   - Missing GPS data

3. **Agent conflicts**
   - Multiple agents claiming same pole
   - Agent name variations
   - Missing agent data

4. **Sync failures**
   - Network interruptions
   - Authentication expiry
   - Schema mismatches

5. **Business rule violations**
   - Duplicate pole numbers
   - Payment already processed
   - Invalid workflow progression

---

## Performance Benchmarks

- CSV Processing: 10,000 records/minute
- Duplicate Detection: 5,000 comparisons/second
- Report Generation: < 30 seconds
- Database Sync: 1,000 records/minute
- Memory Usage: < 1GB for 100k records

---

## Expected Improvements

Based on testing, we expect to enhance:
1. Error message clarity
2. Progress indicators for long operations
3. Batch size optimization
4. Caching strategies
5. Parallel processing options