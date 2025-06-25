# Preview Deployment Guide

## Overview
This guide explains how to deploy to a preview URL without affecting the production site at https://fibreflow-73daf.web.app

## Method 1: Firebase Hosting Channels (Recommended)

Firebase Hosting Channels create temporary preview URLs that expire after a set time.

### Quick Deploy
```bash
# Build and deploy to a preview channel
npm run build
firebase hosting:channel:deploy preview --expires 7d
```

This creates a URL like: `https://fibreflow-73daf--preview-abc123.web.app`

### Custom Channel Names
```bash
# Deploy with feature-specific channel name
firebase hosting:channel:deploy task-management --expires 30d
# Creates: https://fibreflow-73daf--task-management-xyz789.web.app
```

## Method 2: Separate Firebase Hosting Site

### One-Time Setup
1. Go to Firebase Console > Hosting
2. Add a new site: `fibreflow-preview` 
3. Update `.firebaserc`:
```json
{
  "projects": {
    "default": "fibreflow-73daf"
  },
  "targets": {
    "fibreflow-73daf": {
      "hosting": {
        "production": ["fibreflow-73daf"],
        "preview": ["fibreflow-preview"]
      }
    }
  }
}
```

### Deploy to Preview Site
```bash
npm run build
firebase deploy --only hosting:preview
```

## Method 3: Using Worktrees (Safest)

### Setup
```bash
# Create a preview worktree
cd ~/VF/Apps/FibreFlow
git worktree add ../FibreFlow-Preview feature/task-management

# Switch to preview worktree
cd ../FibreFlow-Preview
npm install
```

### Deploy from Worktree
```bash
# In the worktree directory
npm run build
firebase hosting:channel:deploy preview --expires 30d
```

## Deployment Scripts

### Use the Preview Script
```bash
./scripts/deploy-preview.sh
```

### Add to package.json
```json
"scripts": {
  "deploy:preview": "npm run build && firebase hosting:channel:deploy preview --expires 7d",
  "deploy:prod": "npm run build && firebase deploy --only hosting:production"
}
```

## Preview URLs Summary

| Method | URL Format | Expires | Best For |
|--------|-----------|---------|----------|
| Hosting Channels | `https://fibreflow-73daf--{channel}-{hash}.web.app` | Configurable | Testing features |
| Separate Site | `https://fibreflow-preview.web.app` | Never | Staging environment |
| Production | `https://fibreflow-73daf.web.app` | Never | Live users |

## Safety Checks

1. **Always verify** you're not in production before deploying
2. **Use worktrees** for feature development
3. **Test locally** first with `ng serve`
4. **Check the URL** after deployment to ensure it's preview

## Example Workflow

```bash
# 1. Create feature worktree
git worktree add ../FibreFlow-TaskMgmt feature/task-management
cd ../FibreFlow-TaskMgmt

# 2. Make changes and test locally
ng serve --port 4203

# 3. Deploy to preview
firebase hosting:channel:deploy task-mgmt --expires 14d

# 4. Share preview URL for testing
# https://fibreflow-73daf--task-mgmt-abc123.web.app

# 5. After approval, merge and deploy to production
git checkout main
git merge feature/task-management
npm run deploy
```

## Important Notes

- Preview channels automatically expire
- Each deployment creates a new URL
- Production remains untouched
- All preview sites use the same Firebase backend
- Preview URLs are publicly accessible (use with caution)