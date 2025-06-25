# FibreFlow Git Worktrees - Production Management Guide 🌳

## Quick Reference for Claude Code

When working on any FibreFlow task, check this table first:

| If you're working on... | Use this worktree | Path |
|------------------------|-------------------|------|
| **LIVE BUGS/HOTFIXES** | FibreFlow-Hotfix | `../FibreFlow-Hotfix` |
| BOQ, Materials, Stock | FibreFlow-BOQ | `../FibreFlow-BOQ` |
| Suppliers, RFQ, Emails | FibreFlow-RFQ | `../FibreFlow-RFQ` |
| Contractors, Payments | FibreFlow-Contractors | `../FibreFlow-Contractors` |
| Projects, Phases, Tasks | FibreFlow-Projects | `../FibreFlow-Projects` |
| Dashboard, Reports | FibreFlow-Reports | `../FibreFlow-Reports` |
| Performance Issues | FibreFlow-Perf | `../FibreFlow-Perf` |

## Production Deployment Strategy

### 1. Main Branch (PRODUCTION - LIVE USERS)
```bash
cd ~/VF/Apps/FibreFlow
# This is your LIVE app - be careful!
# Only merged, tested code goes here
firebase deploy --only hosting:main --project production
```

### 2. Hotfix Branch (EMERGENCY FIXES)
```bash
cd ~/VF/Apps/FibreFlow-Hotfix
# For urgent production fixes
# Test quickly, merge to master, deploy
git checkout -b hotfix/stock-calculation-error
# Fix bug...
firebase deploy --only hosting:hotfix --project staging
# If good, merge to master and deploy to production
```

### 3. Feature Branches (SAFE DEVELOPMENT)
```bash
cd ~/VF/Apps/FibreFlow-BOQ
# Develop new features without affecting production
# Take your time, test thoroughly
firebase deploy --only hosting:boq-preview --project staging
# Share preview link with stakeholders
```

## For Claude Code - Module Lookup

### How to determine which worktree to use:

1. **Check the module path**:
   - `src/app/modules/boq/*` → Use BOQ worktree
   - `src/app/modules/suppliers/*` → Use RFQ worktree
   - `src/app/modules/contractors/*` → Use Contractors worktree

2. **Check the feature type**:
   - Bug fix for live app? → Use Hotfix worktree
   - New feature? → Use appropriate feature worktree
   - Performance issue? → Use Perf worktree

3. **When in doubt, check this mapping**:

```typescript
const WORKTREE_MODULE_MAP = {
  'FibreFlow-BOQ': [
    'boq', 'boq-management', 'materials', 'stock', 
    'stock-movements', 'mpms'
  ],
  'FibreFlow-RFQ': [
    'suppliers', 'quotes', 'emails', 'rfq',
    'procurement', 'supplier-portal'
  ],
  'FibreFlow-Contractors': [
    'contractors', 'staff', 'payments', 
    'attendance', 'performance-metrics'
  ],
  'FibreFlow-Projects': [
    'projects', 'phases', 'steps', 'tasks',
    'sow', 'project-templates'
  ],
  'FibreFlow-Reports': [
    'dashboard', 'analytics', 'reports',
    'daily-progress', 'kpis'
  ]
};
```

## Simplified Workflow Commands

### Setup (One Time)
```bash
# Create essential worktrees
git worktree add ../FibreFlow-Hotfix master  # For emergency fixes
git worktree add ../FibreFlow-BOQ feature/boq-management
git worktree add ../FibreFlow-RFQ feature/rfq-system

# Install dependencies in each
cd ../FibreFlow-Hotfix && npm install
cd ../FibreFlow-BOQ && npm install
cd ../FibreFlow-RFQ && npm install
```

### Daily Development
```bash
# Morning standup - check what's where
git worktree list

# Work on BOQ feature
cd ~/VF/Apps/FibreFlow-BOQ
claude-code "Continue BOQ allocation feature"

# Emergency bug reported!
cd ~/VF/Apps/FibreFlow-Hotfix
git pull origin master
claude-code "Fix critical stock calculation bug"
# Fix, test, deploy immediately

# Back to feature work
cd ~/VF/Apps/FibreFlow-BOQ
# Continue where you left off
```

## Benefits Once Live

1. **Zero Downtime**: Fix bugs without stopping feature development
2. **Safe Testing**: Test major changes in isolation
3. **Quick Rollback**: Each worktree is independent
4. **Clear History**: No mixed commits between fixes and features
5. **Stakeholder Previews**: Show specific features without affecting production

## For Future Claude Sessions

When starting any task, Claude should:
1. Read this file to identify the correct worktree
2. Navigate to that worktree directory
3. Work only within that context
4. Update this file if creating new worktrees

## Current Status Tracker

| Worktree | Last Updated | Current Task | Deploy URL |
|----------|--------------|--------------|------------|
| Main | 2025-06-25 | Production | fibreflow.web.app |
| Hotfix | Ready | Awaiting issues | - |
| BOQ | Active | Stock allocations | fibreflow-boq.web.app |
| RFQ | Active | Email automation | fibreflow-rfq.web.app |

---

**For Claude**: Always check this file first. If unsure which worktree to use, ask the user to clarify which module or feature they're working on.