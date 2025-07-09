# OneMap Project Development Plan

## 📋 Code & Scripts Evaluation

### ✅ Scripts Following CLAUDE.md Principles

1. **validate_analysis.py** ✓
   - Implements antiHall validation
   - Verifies claims with actual data
   - No assumptions made

2. **reanalyze_with_workflow.py** ✓
   - Correctly understands workflow vs duplicates
   - Identifies true issues (pole conflicts)
   - First principles approach

3. **filter_essential_columns.py** ✓
   - Reduces complexity (157 → 17 columns)
   - Keeps only necessary data
   - Follows "start simple" principle

4. **split_large_csv.py** ✓
   - Handles large data pragmatically
   - Multiple splitting strategies
   - Well-documented

### ⚠️ Scripts Needing Updates

1. **analyze_duplicates.py**
   - Original analysis assumes duplicates are bad
   - Needs update to understand workflow tracking
   - Should focus on pole conflicts only

## 🎯 OneMap Module Development Plan

### Phase 1: Data Validation & Cleanup (Week 1)

#### 1.1 Pole Conflict Resolution Tool
```python
# pole_conflict_resolver.py
class PoleConflictResolver:
    def export_conflicts(self):
        """Export all poles at multiple locations for field verification"""
        
    def create_pole_registry(self):
        """Authoritative pole location database"""
        
    def validate_pole_assignment(self, pole, address):
        """Check if pole-address combination is valid"""
```

**Deliverables**:
- CSV export of 1,811 pole conflicts
- Field verification checklist
- Pole registry schema

#### 1.2 Address Anomaly Investigation
```python
# address_analyzer.py
class AddressAnalyzer:
    def analyze_high_volume_addresses(self):
        """Investigate addresses like '1 KWENA STREET'"""
        
    def detect_data_entry_patterns(self):
        """Find if certain addresses are default entries"""
```

**Deliverables**:
- Report on high-volume addresses
- Data entry pattern analysis
- Recommendations for client

### Phase 2: OneMap Angular Module (Week 2-3)

#### 2.1 Module Structure
```
src/app/features/onemap/
├── components/
│   ├── import-wizard/          # CSV import with validation
│   ├── conflict-resolver/      # Pole conflict UI
│   ├── workflow-viewer/        # View status progression
│   └── pole-registry/          # Manage pole locations
├── services/
│   ├── onemap.service.ts       # Main service
│   ├── pole-validation.service.ts
│   └── workflow-tracker.service.ts
├── models/
│   ├── pole-location.model.ts
│   ├── workflow-update.model.ts
│   └── import-result.model.ts
└── onemap-routing.module.ts
```

#### 2.2 Core Features

**Import Wizard**:
- Upload CSV files
- Auto-detect duplicates vs workflow
- Validate pole locations
- Show import preview

**Conflict Resolution Dashboard**:
- List all pole conflicts
- Map view of conflicting locations
- Bulk resolution tools
- Export for field verification

**Workflow Viewer**:
- Show property lifecycle
- Timeline of status changes
- Current status summary

### Phase 3: Firebase Integration (Week 3-4)

#### 3.1 Firestore Collections
```typescript
// Collections structure
collections:
  - pole_registry/
    - {poleId}: {
        poleNumber: string,
        verifiedLocation: string,
        coordinates: GeoPoint,
        verifiedBy: string,
        verifiedDate: Timestamp
      }
  
  - workflow_updates/
    - {propertyId}/
      - updates/
        - {updateId}: {
            status: string,
            flowHistory: string,
            timestamp: Timestamp,
            fieldAgent: string
          }
  
  - import_logs/
    - {importId}: {
        filename: string,
        importDate: Timestamp,
        recordsProcessed: number,
        conflictsFound: number
      }
```

#### 3.2 Cloud Functions
```typescript
// Validation function
export const validatePoleLocation = functions.https.onCall(async (data) => {
  const { poleNumber, address, coordinates } = data;
  
  // Check if pole exists at different location
  const existingPole = await getPoleLocation(poleNumber);
  if (existingPole && existingPole.address !== address) {
    return { valid: false, conflict: existingPole };
  }
  
  return { valid: true };
});
```

### Phase 4: Real-time Prevention (Week 4-5)

#### 4.1 Mobile App Integration
- Real-time pole validation
- GPS coordinate capture
- Offline conflict detection
- Sync when online

#### 4.2 Validation Rules
```typescript
const VALIDATION_RULES = {
  pole: {
    oneLocationOnly: true,
    requiredFields: ['number', 'coordinates'],
    namingPattern: /^LAW\.P\.[A-Z]\d{3}$/
  },
  workflow: {
    allowedTransitions: [
      ['Pole Permission: Approved', 'Home Sign Ups: Approved'],
      ['Home Sign Ups: Approved', 'Home Installation: In Progress'],
      ['Home Installation: In Progress', 'Home Installation: Installed']
    ]
  }
};
```

## 📊 Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Pole Conflicts | 1,811 | < 50 | 4 weeks |
| Missing Agent Names | 63% | < 5% | 2 weeks |
| "1 KWENA" Updates | 662 | Verified | 1 week |
| Real-time Validation | 0% | 100% | 5 weeks |

## 🚀 Implementation Timeline

### Week 1: Foundation
- [ ] Get client feedback on "1 KWENA STREET"
- [ ] Export pole conflicts for field team
- [ ] Create pole registry design
- [ ] Update analysis scripts

### Week 2: Angular Module
- [ ] Scaffold OneMap module
- [ ] Create import wizard component
- [ ] Build conflict resolver UI
- [ ] Integrate with FibreFlow theme

### Week 3: Backend Integration
- [ ] Set up Firestore collections
- [ ] Create validation functions
- [ ] Import historical data
- [ ] Test with sample data

### Week 4: Validation & Prevention
- [ ] Implement real-time checks
- [ ] Add GPS validation
- [ ] Create field agent training
- [ ] Deploy to staging

### Week 5: Production & Monitoring
- [ ] Deploy to production
- [ ] Monitor conflict reduction
- [ ] Gather user feedback
- [ ] Iterate based on usage

## 📝 Development Principles

1. **Start Simple**: Import → Validate → Prevent
2. **Data First**: Clean existing data before adding features
3. **User Focus**: Field agents need simple, clear tools
4. **Incremental**: Deploy validation before prevention
5. **Measurable**: Track conflict reduction weekly

## 🔄 Daily Workflow

```bash
# Morning: Check metrics
npm run onemap:metrics

# Development
npm run dev:onemap

# Testing with real data
npm run onemap:validate sample.csv

# Deploy
deploy "OneMap: Added pole validation"
```

## 📚 Documentation Requirements

1. **Field Agent Guide**: How to verify pole locations
2. **Data Import Guide**: For data managers
3. **API Documentation**: For integration
4. **Troubleshooting**: Common issues and fixes

---

*Last Updated: 2025-01-09*
*Status: Awaiting client feedback before implementation*