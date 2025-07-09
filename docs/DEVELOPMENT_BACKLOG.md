# FibreFlow Development Backlog

*Created: 2025-01-09*  
*Purpose: Centralized tracking for development tasks, bugs, and feature requests*

## How to Use This File

1. **Add new items** under the appropriate status section
2. **Move items** between sections as work progresses
3. **Update regularly** during development
4. **Reference in commits** using item IDs (e.g., "Implements DEV-001")

## Task Format

```markdown
### DEV-XXX: Task Title
- **Type**: Feature | Bug | Enhancement | Tech Debt
- **Priority**: Critical | High | Medium | Low
- **Component**: Which part of the system
- **Effort**: Hours or days estimate
- **Added**: Date added
- **Details**: Brief description
- **Notes**: Implementation notes, blockers, etc.
```

---

## 🚨 Critical / In Progress

### DEV-001: BOQ Zero Quantity Filter
- **Type**: Enhancement
- **Priority**: High
- **Component**: Projects / BOQ
- **Effort**: 2 hours
- **Added**: 2025-01-09
- **Details**: Add filter to hide BOQ items where required quantity = 0
- **Notes**: Implementation plan in `docs/BOQ_FILTER_PLAN.md`. Third attempt - previous implementations were lost.

---

## 📋 Backlog (Ready to Start)

### DEV-002: Stock Allocation Dialog
- **Type**: Feature
- **Priority**: Medium
- **Component**: BOQ / Stock
- **Effort**: 4 hours
- **Added**: 2025-01-09
- **Details**: Implement stock allocation dialog (currently shows "coming soon")
- **Notes**: See TODO in `project-boq.component.ts` line 729

### DEV-003: Firebase Functions TypeScript Strict Mode
- **Type**: Tech Debt
- **Priority**: Low
- **Component**: Functions
- **Effort**: 2 hours
- **Added**: 2025-01-09
- **Details**: Enable strict mode in functions/tsconfig.json
- **Notes**: Currently disabled, should be enabled for better type safety

---

## 🔍 Under Investigation

### DEV-004: Material Theme Custom Colors
- **Type**: Enhancement
- **Priority**: Medium
- **Component**: Theme System
- **Effort**: Unknown
- **Added**: 2025-01-09
- **Details**: Replace default Azure/Blue palettes with custom FibreFlow colors
- **Notes**: See TODO in `docs/THEME_SYSTEM.md`

---

## ✅ Completed (Last 30 Days)

### DEV-000: Development Backlog System
- **Type**: Enhancement
- **Priority**: High
- **Component**: Documentation
- **Effort**: 1 hour
- **Added**: 2025-01-09
- **Completed**: 2025-01-09
- **Details**: Created this backlog system for tracking development tasks

---

## 💡 Ideas / Future Enhancements

- Print styles for reports
- High contrast accessibility mode
- Theme preview functionality
- Offline sync improvements
- Performance monitoring dashboard
- Bulk operations for various modules
- Advanced search with filters
- Keyboard shortcuts system
- Export templates customization
- Multi-language support

---

## 📊 Statistics

- **Total Active**: 3
- **Critical**: 0
- **High Priority**: 1
- **In Progress**: 1
- **Completed This Month**: 1

---

## Integration with jj (Jujutsu)

When working on a task:
```bash
# Start work
jj describe -m "DEV-001: Working on BOQ zero quantity filter"

# When done
deploy "DEV-001: Added BOQ zero quantity filter with persistence"
```

## Quick Commands

```bash
# View this file
cat docs/DEVELOPMENT_BACKLOG.md

# Edit this file
code docs/DEVELOPMENT_BACKLOG.md

# Search for a task
grep -n "DEV-" docs/DEVELOPMENT_BACKLOG.md

# Count active tasks
grep -c "^### DEV-" docs/DEVELOPMENT_BACKLOG.md
```