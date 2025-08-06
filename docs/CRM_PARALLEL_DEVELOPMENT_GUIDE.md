# CRM Module Parallel Development Guide

*Last Updated: 2025-01-30*

## Overview

This guide enables a second developer to work on the CRM module independently without interfering with ongoing FibreFlow development. We'll use Git worktrees, Firebase preview channels, and clear module boundaries.

## Setup Architecture

### Development Structure
```
VF/Apps/
├── FibreFlow/              # Your main development (DO NOT TOUCH)
├── FibreFlow-CRM/          # CRM developer's worktree
└── FibreFlow-Shared/       # Shared resources (optional)
```

## Step-by-Step Setup for CRM Developer

### 1. Initial Setup

#### A. Clone and Create Worktree
```bash
# CRM developer runs these commands:
cd ~/VF/Apps

# Clone the repository (if not already done)
git clone https://github.com/your-org/fibreflow.git FibreFlow-CRM-temp
cd FibreFlow-CRM-temp

# Create a new branch for CRM development
git checkout -b feature/crm-module

# Set up worktree (better approach)
cd ~/VF/Apps
git -C FibreFlow worktree add ../FibreFlow-CRM feature/crm-module

# Navigate to CRM worktree
cd FibreFlow-CRM
```

#### B. Install Dependencies
```bash
# Use exact Node version
nvm use 20.19.2

# Install dependencies
npm install

# Verify build works
npm run build
```

### 2. Firebase Preview Channel Setup

#### A. Create Preview Channel (CRM Developer)
```bash
# Login to Firebase
firebase login

# Create a preview channel for CRM development
firebase hosting:channel:create crm-dev --expires 30d

# Deploy to preview channel
firebase deploy --only hosting:channel:crm-dev
```

This creates a separate URL like: `https://fibreflow-73daf--crm-dev-xxxxx.web.app`

#### B. Environment Configuration
```bash
# Create local environment file
cp .env.local.example .env.local

# Add CRM-specific configs
echo "PREVIEW_CHANNEL=crm-dev" >> .env.local
echo "DEV_NAME=CRM_Developer" >> .env.local
```

### 3. Module Structure

#### A. Create CRM Module Directory
```bash
# Create CRM feature module
mkdir -p src/app/features/crm
cd src/app/features/crm

# Create standard structure
mkdir -p {components,pages,services,models,guards,pipes}

# Create module routes
touch crm.routes.ts
```

#### B. CRM Module Structure
```
src/app/features/crm/
├── components/
│   ├── client-360-view/
│   ├── interaction-timeline/
│   ├── opportunity-pipeline/
│   └── activity-tracker/
├── pages/
│   ├── crm-dashboard/
│   ├── client-detail/
│   └── pipeline-view/
├── services/
│   ├── crm.service.ts
│   ├── interaction.service.ts
│   └── opportunity.service.ts
├── models/
│   ├── crm.model.ts
│   ├── interaction.model.ts
│   └── opportunity.model.ts
└── crm.routes.ts
```

### 4. Database Collections (Isolated)

#### A. CRM-Specific Collections
```typescript
// Use prefixed collections during development
const CRM_COLLECTIONS = {
  interactions: 'crm_interactions',      // Temporary during dev
  opportunities: 'crm_opportunities',    // Temporary during dev
  activities: 'crm_activities',          // Temporary during dev
  // Will migrate to subcollections under 'clients' later
};
```

#### B. Firestore Rules (Add to existing)
```javascript
// In firestore.rules
match /crm_{document=**} {
  allow read, write: if request.auth != null 
    && request.auth.token.email.matches('.*@crm-dev.*');
}
```

### 5. Routing Setup

#### A. CRM Routes (crm.routes.ts)
```typescript
import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const CRM_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/crm-dashboard/crm-dashboard.component')
      .then(m => m.CrmDashboardComponent),
    canActivate: [authGuard],
    data: { title: 'CRM Dashboard' }
  },
  {
    path: 'clients/:id',
    loadComponent: () => import('./pages/client-detail/client-detail.component')
      .then(m => m.ClientDetailComponent),
    canActivate: [authGuard],
    data: { title: 'Client 360° View' }
  },
  {
    path: 'pipeline',
    loadComponent: () => import('./pages/pipeline-view/pipeline-view.component')
      .then(m => m.PipelineViewComponent),
    canActivate: [authGuard],
    data: { title: 'Sales Pipeline' }
  }
];
```

#### B. Add to Main Routes
```typescript
// In app.routes.ts - CRM developer adds:
{
  path: 'crm',
  loadChildren: () => import('./features/crm/crm.routes').then(m => m.CRM_ROUTES),
  canActivate: [authGuard],
  data: { 
    title: 'CRM',
    featureFlag: 'crm_enabled'  // Feature flag for easy on/off
  }
},
```

### 6. Development Workflow

#### A. Daily Workflow (CRM Developer)
```bash
# Start of day
cd ~/VF/Apps/FibreFlow-CRM
git pull origin main
git merge main  # Keep up with main branch

# During development
npm run build  # Test builds frequently
firebase deploy --only hosting:channel:crm-dev  # Deploy to preview

# End of day
git add .
git commit -m "CRM: [feature description]"
git push origin feature/crm-module
```

#### B. Testing Preview Channel
```bash
# Get preview URL
firebase hosting:channel:list

# Test at: https://fibreflow-73daf--crm-dev-xxxxx.web.app/crm
```

### 7. Integration Points & Boundaries

#### A. Shared Services (READ-ONLY)
```typescript
// CRM developer can READ from these services
import { ClientService } from '@core/services/client.service';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';

// But should NOT modify core services
```

#### B. Create CRM-Specific Services
```typescript
// crm.service.ts
import { Injectable, inject } from '@angular/core';
import { ClientService } from '@core/services/client.service';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private clientService = inject(ClientService);
  
  // CRM-specific methods here
  async getClientWithCrmData(clientId: string) {
    const client = await this.clientService.getById(clientId);
    const crmData = await this.getCrmData(clientId);
    return { ...client, crmData };
  }
}
```

### 8. Communication Protocol

#### A. File Ownership
```yaml
# .github/CODEOWNERS
# Main FibreFlow development
/src/app/core/ @main-developer
/src/app/features/projects/ @main-developer
/src/app/features/stock/ @main-developer

# CRM Module
/src/app/features/crm/ @crm-developer
/docs/crm/ @crm-developer
```

#### B. Merge Strategy
1. CRM developer works on `feature/crm-module` branch
2. Creates PR when ready for review
3. Main developer reviews and merges
4. No direct commits to main branch

### 9. Deployment Strategy

#### A. Preview Channels (During Development)
```bash
# CRM Developer deploys to:
firebase deploy --only hosting:channel:crm-dev

# Main developer deploys to:
firebase deploy --only hosting  # Production
# or
firebase deploy --only hosting:channel:main-dev  # Preview
```

#### B. Feature Flag Control
```typescript
// In app.config.ts
export const FEATURE_FLAGS = {
  crm_enabled: false,  // Turn on when ready
  crm_beta: true,      // Beta features
};
```

### 10. Best Practices for Parallel Development

#### A. Code Standards
- Prefix all CRM commits with "CRM: "
- Use CRM-specific branch names: `feature/crm-*`
- Document all integration points
- Write self-contained components

#### B. Testing
- Test on preview channel first
- Don't test on production
- Use feature flags for gradual rollout
- Create CRM-specific test data

#### C. Communication
- Daily standup (even if async)
- Document blockers immediately
- Use PR descriptions extensively
- Tag relevant developer in comments

## Common Scenarios

### Scenario 1: Need to Modify Core Service
```bash
# CRM developer:
1. Create issue describing need
2. Propose change in PR
3. Wait for main developer approval
4. Or create CRM-specific wrapper service
```

### Scenario 2: Database Schema Conflicts
```bash
# Use namespaced collections during development
crm_* collections for development
Then migrate to proper structure during integration
```

### Scenario 3: Route Conflicts
```bash
# All CRM routes under /crm/*
# No top-level routes without approval
```

## Integration Checklist

When ready to merge CRM module:

- [ ] All CRM routes under `/crm`
- [ ] No modifications to core services
- [ ] All CRM collections properly namespaced
- [ ] Feature flags implemented
- [ ] Documentation complete
- [ ] Preview channel tested
- [ ] PR created with full description
- [ ] Code review completed
- [ ] Merge conflicts resolved

## Quick Start Commands

```bash
# For CRM Developer - Initial Setup
cd ~/VF/Apps
git -C FibreFlow worktree add ../FibreFlow-CRM feature/crm-module
cd FibreFlow-CRM
npm install
firebase hosting:channel:create crm-dev --expires 30d

# Daily Development
cd ~/VF/Apps/FibreFlow-CRM
git pull origin main
git merge main
# ... develop ...
firebase deploy --only hosting:channel:crm-dev

# View preview
echo "Preview URL: https://fibreflow-73daf--crm-dev-xxxxx.web.app"
```

## Support & Questions

- Main Developer: @main-dev (Slack/Email)
- CRM Developer: @crm-dev (Slack/Email)
- Emergency: Create issue with `urgent` label

---

Remember: The goal is zero conflicts and smooth integration!