# Firebase Multi-Site Hosting Setup Guide

## Prerequisites
Before using the worktree deployment system, you need to create the Firebase hosting sites.

## Step 1: Create Firebase Hosting Sites

Run these commands in your main FibreFlow directory:

```bash
# Add hosting sites to your Firebase project
firebase hosting:sites:create fibreflow-boq
firebase hosting:sites:create fibreflow-rfq
firebase hosting:sites:create fibreflow-tasks
firebase hosting:sites:create fibreflow-reports
firebase hosting:sites:create fibreflow-hotfix
firebase hosting:sites:create fibreflow-perf
```

## Step 2: Apply Hosting Targets

```bash
# Link the sites to deployment targets
firebase target:apply hosting main fibreflow-73daf
firebase target:apply hosting boq fibreflow-boq
firebase target:apply hosting rfq fibreflow-rfq
firebase target:apply hosting tasks fibreflow-tasks
firebase target:apply hosting reports fibreflow-reports
firebase target:apply hosting hotfix fibreflow-hotfix
firebase target:apply hosting perf fibreflow-perf
```

## Step 3: Test Deployment

From any worktree:
```bash
# Quick test
npm run deploy:boq   # Deploys BOQ worktree to fibreflow-boq.web.app
```

## Deployment URLs

After setup, your sites will be available at:

- **Production**: https://fibreflow-73daf.web.app (or your custom domain)
- **BOQ Preview**: https://fibreflow-boq.web.app
- **RFQ Preview**: https://fibreflow-rfq.web.app
- **Tasks Preview**: https://fibreflow-tasks.web.app
- **Reports Preview**: https://fibreflow-reports.web.app
- **Hotfix Testing**: https://fibreflow-hotfix.web.app
- **Performance**: https://fibreflow-perf.web.app

## Quick Deployment Commands

From the appropriate worktree directory:

```bash
# Deploy to production (from main worktree only!)
npm run deploy:main

# Deploy feature previews (from respective worktrees)
npm run deploy:boq
npm run deploy:rfq
npm run deploy:tasks

# Check which worktree you're in
npm run worktree:status
```

## Important Notes

1. **Production Safety**: Only deploy to `main` from the main worktree after thorough testing
2. **Preview URLs**: Share feature-specific URLs with stakeholders for testing
3. **Same Database**: All deployments use the same Firestore database (be careful with data changes)
4. **Authentication**: Users need to authenticate on each preview domain separately

## Troubleshooting

### "Site not found" Error
Make sure you've created the hosting site first:
```bash
firebase hosting:sites:create fibreflow-[name]
```

### "Target not found" Error
Apply the target first:
```bash
firebase target:apply hosting [target] [site-name]
```

### Build Errors
Ensure you're in the correct worktree and dependencies are installed:
```bash
cd ~/VF/Apps/FibreFlow-[feature]
npm install
```