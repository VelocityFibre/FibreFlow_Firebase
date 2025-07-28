# FibreFlow Agent Testing Scenarios

## Test Framework

Each test will evaluate:
1. **Accuracy**: Does the agent provide correct information?
2. **Context Awareness**: Does it reference FibreFlow-specific rules?
3. **Self-Improvement**: Can it update its own configuration?
4. **Coordination**: Can agents work together effectively?

---

## Test Scenarios

### 🎯 Test 1: Agent Manager - Selection & Coordination

**Scenario**: "I need to add a feature where contractors can upload daily progress photos for poles they're installing, with offline support."

**Expected Response**:
- Identifies this as a multi-agent task
- Recommends: Pole Tracker Specialist (lead), Angular Frontend, Firebase Backend, Testing Expert
- Outlines coordination workflow
- Mentions offline queue requirements

**Evaluation Criteria**:
- [ ] Correctly identifies all relevant agents
- [ ] Provides logical workflow order
- [ ] Mentions key technical requirements

---

### 🎨 Test 2: Angular Frontend Specialist - Component Creation

**Scenario**: "Create a dashboard widget that shows real-time pole installation statistics with a chart."

**Expected Response**:
- Uses standalone component pattern
- Includes proper imports (CommonModule, Material modules)
- Uses signals for state management
- Implements theme-aware styling with ff-rgb()
- Mentions real-time Firestore listener

**Code Pattern Check**:
```typescript
@Component({
  selector: 'app-pole-stats-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, ChartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PoleStatsWidgetComponent {
  private poleService = inject(PoleTrackerService);
  stats = signal<PoleStats>({...});
}
```

---

### 🔥 Test 3: Firebase Backend Expert - Query Optimization

**Scenario**: "The pole list is slow when filtering by contractor and date range. How do I optimize this Firestore query?"

**Expected Response**:
- Suggests composite index creation
- Recommends query structure with proper ordering
- Mentions pagination with limit()
- Suggests caching strategy
- References real-time listener pattern

**Should Include**:
- Index definition for Firestore
- Query optimization techniques
- Performance monitoring suggestions

---

### 📍 Test 4: Pole Tracker Specialist - Mobile Feature

**Scenario**: "Field workers need to quickly find the nearest uncompleted pole and navigate to it."

**Expected Response**:
- References GPS integration with GoogleMapsService
- Mentions offline queue for poor connectivity
- Suggests geolocation query pattern
- Includes navigation integration
- References mobile-specific UI considerations

**Technical Elements**:
- Geolocation API usage
- Firestore geo queries or client-side filtering
- Google Maps navigation intent
- Offline data caching

---

### 🛡️ Test 5: Data Integrity Guardian - Validation Rules

**Scenario**: "Implement validation to ensure no duplicate pole numbers are created during bulk import."

**Expected Response**:
- References global pole uniqueness rule
- Provides validation code pattern
- Mentions transaction usage for consistency
- Includes error reporting strategy
- References audit trail requirements

**Must Include**:
- Pre-import validation
- Duplicate detection algorithm
- Clear error messages
- Rollback strategy

---

### 🤝 Test 6: Multi-Agent Coordination

**Scenario**: "Build a complete RFQ (Request for Quote) workflow where project managers can select BOQ items, send to multiple suppliers, track responses, and compare quotes."

**Expected Workflow**:
1. **FibreFlow Architect**: Design data flow and architecture
2. **Data Integrity Guardian**: Define validation rules for quotes
3. **Firebase Backend Expert**: Implement Firestore schema and email functions
4. **BOQ & RFQ Specialist**: Core business logic and Excel export
5. **Angular Frontend Specialist**: Build UI components
6. **Testing & Deployment Expert**: Deploy and monitor

---

### 🧠 Test 7: Self-Improvement Capability

**Scenario**: Tell Angular Frontend Specialist: "You keep forgetting to mention that all dates must use mat-datepicker with SA locale. Update yourself to remember this."

**Expected Behavior**:
1. Agent acknowledges the feedback
2. Reads its own configuration file
3. Updates the form patterns section
4. Confirms the update
5. Uses this knowledge in future responses

---

### 🔄 Test 8: Cross-Agent Knowledge Sharing

**Scenario**: "The Firebase Backend Expert discovered that Firestore has a new feature for aggregate queries. How do we share this with other relevant agents?"

**Expected Process**:
1. Backend Expert updates its own config
2. Agent Manager identifies affected agents
3. Relevant agents update their knowledge
4. Pattern is documented for future use

---

## Evaluation Metrics

### Per-Agent Scoring:
- **Technical Accuracy**: 0-10
- **FibreFlow Context**: 0-10  
- **Code Quality**: 0-10
- **Self-Awareness**: 0-10

### Overall System:
- **Coordination Effectiveness**: 0-10
- **Knowledge Consistency**: 0-10
- **Improvement Capability**: 0-10

---

## Common Issues to Watch For

1. **Generic Responses**: Agent gives general Angular/Firebase advice without FibreFlow context
2. **Missing Business Rules**: Forgets pole uniqueness, drop limits, etc.
3. **Outdated Patterns**: Uses constructor injection instead of inject()
4. **Poor Coordination**: Agents duplicate work or miss handoffs
5. **No Self-Update**: Doesn't modify own configuration when asked

---

## Refinement Actions

Based on test results, we should:
1. Add missing context to agent prompts
2. Improve coordination protocols
3. Enhance self-improvement instructions
4. Add cross-references between agents
5. Include more FibreFlow-specific examples