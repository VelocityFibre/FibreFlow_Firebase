# OneMap Development Roadmap

## 🎯 MVP Focus: Pole Conflict Resolution

### What We're Building
A simple tool to identify and resolve the 1,811 pole location conflicts.

### What We're NOT Building (Yet)
- Complex workflow management
- Real-time mobile apps
- Advanced analytics

## Phase 1: Quick Win Tools (This Week)

### 1. Pole Conflict Exporter
```bash
python3 export_pole_conflicts.py
# Output: pole_conflicts.csv with columns:
# - Pole Number
# - Address 1, Address 2, ... Address N
# - GPS Coordinates (if available)
# - Last Updated
# - Field Agent
```

### 2. Simple Web View
```typescript
// One component to start
@Component({
  selector: 'app-pole-conflicts',
  template: `
    <mat-table [dataSource]="conflicts">
      <!-- Show pole conflicts -->
    </mat-table>
    <button mat-raised-button (click)="export()">
      Export for Field Team
    </button>
  `
})
```

### 3. Basic Validation Service
```typescript
// Just check if pole already exists somewhere else
validatePole(poleNumber: string, address: string): Observable<boolean> {
  return this.checkPoleLocation(poleNumber, address);
}
```

## Phase 2: Integration (Next Week)

### 1. Add to Existing Pole Tracker
- Extend current pole module
- Add "Verify Location" button
- Show conflict warnings

### 2. Import with Validation
- Use existing import patterns
- Add pole conflict check
- Generate conflict report

## Phase 3: Prevention (Week 3)

### 1. Form Validation
- Check pole number on entry
- Warn if already exists elsewhere
- Require override reason

### 2. Bulk Operations
- Reassign poles in bulk
- Update multiple locations
- Generate audit trail

## 🏃‍♂️ Sprint 1 Tasks (Next 5 Days)

### Day 1-2: Data Preparation
```python
# Create these scripts
1. export_pole_conflicts.py      # Export conflicts
2. generate_field_checklist.py   # Field verification list
3. prepare_import_data.py        # Clean data for import
```

### Day 3-4: Basic UI
```bash
# Generate components
ng g c features/onemap/components/pole-conflicts
ng g s features/onemap/services/pole-validation
ng g interface features/onemap/models/pole-conflict
```

### Day 5: Testing & Deployment
- Import test data
- Verify conflict detection
- Deploy to staging

## 📊 Success Criteria for Sprint 1

1. **Export Working**: Field team has list of conflicts ✓
2. **UI Visible**: Can see conflicts in FibreFlow ✓
3. **Validation Active**: Warns on duplicate poles ✓

## 🚫 What We're Postponing

1. **Complex Features**:
   - Workflow visualization
   - Historical analysis
   - Predictive analytics

2. **Mobile App**:
   - Focus on web first
   - Mobile can come later

3. **Automation**:
   - Manual resolution first
   - Automate once patterns clear

## 📝 Key Decisions Needed

1. **From Client**:
   - Is "1 KWENA STREET" a complex or data entry error?
   - Can poles be reassigned new numbers?
   - Who has authority to resolve conflicts?

2. **Technical**:
   - Extend Pole Tracker or new module?
   - Store in existing collections or new?
   - How to handle historical data?

## 🔄 Daily Standup Questions

1. **What conflicts were resolved yesterday?**
2. **What's blocking resolution today?**
3. **Do we need field verification?**

## 📈 Metrics to Track

| Day | Conflicts Remaining | Resolved | Verified |
|-----|-------------------|----------|----------|
| 1   | 1,811            | 0        | 0        |
| 5   | Target: 1,500    | 311      | 100      |
| 10  | Target: 1,000    | 811      | 500      |
| 20  | Target: 100      | 1,711    | 1,500    |

## 🚀 Getting Started Tomorrow

```bash
# 1. Create export script
cd OneMap
touch export_pole_conflicts.py

# 2. Test with sample data
python3 export_pole_conflicts.py --limit 100

# 3. Share with field team
# Get feedback on format

# 4. Start Angular component
ng g c features/onemap/components/pole-conflicts --standalone
```

---

**Remember**: We're solving ONE problem - pole location conflicts. Everything else can wait.