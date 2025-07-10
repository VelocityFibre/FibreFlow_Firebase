# OneMap Development Notes

## Session Summary - 2025-01-09

### What We Discovered
1. **The "duplicate" problem wasn't duplicates** - it was workflow tracking
2. **Real issue**: 1,811 poles appearing at multiple physical locations
3. **Normal behavior**: Multiple entries per property showing status progression

### Key Decisions Made
1. **First principles approach**: One pole = one location
2. **Focus on true duplicates only**: Different addresses, not different statuses
3. **antiHall validation**: Every analysis includes validation proof

### Scripts Created
1. `analyze_and_export_complete.py` - Main tool combining everything
2. `identify_true_duplicates.py` - Simple duplicate checker
3. `export_pole_conflicts.py` - Detailed exports
4. All scripts implement antiHall validation

### Context Updates
- Updated `CLAUDE.md` with script references
- Created `README.md` for module overview
- Added `CONTEXT_REFERENCE.md` for quick reference

### What Field Teams Need
- `field_verification_priority.csv` - Just the high priority poles
- Simple checklist format
- Space to record verified location

### Pending Items
1. Client clarification on "1 KWENA STREET" (662 entries)
2. Field verification of 1,811 pole conflicts
3. Angular module development (after verification)

### Lessons Learned
- Always validate assumptions with data
- Understand workflow before calling it duplicates
- Simple exports work better for field teams
- Document context immediately

---

## For Next Session
1. Check if field verification started
2. Run exports if not done yet
3. Plan Angular module based on verification results
4. Update CLAUDE.md with any new findings

---

## Session Summary - 2025-07-10

### Business Context Clarified
- **Client Challenge**: Agents claim payment for pole permissions
- **Problem**: Multiple agents claiming same pole = duplicate payments
- **Solution**: GPS-based verification (addresses unreliable in informal settlements)

### Major Pivot
- **From**: General duplicate analysis
- **To**: Specific payment verification system
- **Key Insight**: Ignore addresses, use GPS coordinates only

### Analysis Results
1. **Total poles with permissions**: 3,749
2. **Poles with payment conflicts**: 998 (26.6%)
3. **HIGH RISK** (multiple agents): 873 poles
4. **MEDIUM RISK** (same agent multiple times): 125 poles
5. **Agent contact coverage**: 100%

### Key Scripts Created
1. `analyze_gps_duplicates.py` - Core GPS-based analysis
2. `create_complete_agent_report.py` - Shows ALL agents per pole
3. `extract_first_permissions_complete.py` - Baseline data
4. `validate_payment_analysis.py` - antiHall verification

### Reports Generated
- `complete_agent_followup.csv` - All agents with dates sorted
- `agent_followup_expanded.csv` - Side-by-side view (up to 5 agents)
- `first_pole_permissions_complete.csv` - Original claims only
- `same_agent_duplicates.csv` - Self-duplicate analysis
- `VALIDATION_SUMMARY.md` - Data integrity proof

### Shared with Colleague
- Branch: `feature/onemap-payment-verification`
- Used jj workflow (no code loss)
- Ready for payment verification calls
- Can be integrated into FibreFlow later

### Key Findings
1. **itumeleng** has most conflicts (172 poles)
2. **LAW.P.B341** worst case (5 different agents)
3. Most conflicts are 2 agents (730 poles)
4. GPS variance typically < 50m for true duplicates

### antiHall Implementation
- Every number verified against source data
- GPS calculations validated (Haversine formula)
- No assumptions or extrapolations
- Complete audit trail maintained

### Next Steps
1. Colleague reviews 873 high-risk conflicts
2. Contact agents for verification
3. Implement payment holds
4. Plan FibreFlow integration