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