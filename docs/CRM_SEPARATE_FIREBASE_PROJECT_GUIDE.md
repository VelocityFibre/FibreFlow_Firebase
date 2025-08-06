# CRM Separate Firebase Project Setup Guide

*Last Updated: 2025-01-30*

## Overview

This guide helps set up a completely separate Firebase project for the CRM module that will handle thousands of MDUs (Multi-Dwelling Units) with different body corporates and HOAs. This is a separate product with its own user base and infrastructure.

## Architecture Overview

```
Firebase Projects:
├── fibreflow-73daf (FibreFlow - Internal Operations)
│   └── For: VelocityFibre staff, contractors, operations
│
└── velocityfibre-crm (NEW - CRM for MDUs/HOAs)
    └── For: Body corporates, HOAs, property managers, residents
```

## Step 1: Create New Firebase Project

### A. Firebase Console Setup
```bash
# 1. Go to Firebase Console
https://console.firebase.google.com

# 2. Click "Add Project"
Project Name: velocityfibre-crm
Project ID: velocityfibre-crm (or similar)

# 3. Configure project settings:
- Enable Google Analytics (optional)
- Select region: europe-west1 (or preferred)
- Choose Blaze plan (Pay as you go)
```

### B. Enable Required Services
In Firebase Console for the new project:
1. **Authentication** → Enable Sign-in methods:
   - Email/Password
   - Google
   - Phone (for residents)

2. **Firestore Database** → Create Database:
   - Start in production mode
   - Choose region: same as project

3. **Storage** → Get Started:
   - Start in production mode
   - Same region

4. **Hosting** → Get Started:
   - Set up hosting

## Step 2: Local Development Setup

### A. Create New Angular Project
```bash
# Create separate directory
mkdir -p ~/VF/Apps/VelocityFibre-CRM
cd ~/VF/Apps/VelocityFibre-CRM

# Create new Angular project
npx @angular/cli@20 new velocityfibre-crm --routing --style=scss --standalone

# Navigate to project
cd velocityfibre-crm
```

### B. Add Firebase to Project
```bash
# Add AngularFire
ng add @angular/fire

# When prompted:
# - Select the NEW Firebase project (velocityfibre-crm)
# - Select features: Authentication, Firestore, Storage, Hosting
# - Create new Firebase app: Yes
# - Name: VelocityFibre CRM Web
```

### C. Environment Configuration
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  firebase: {
    apiKey: "NEW-PROJECT-API-KEY",
    authDomain: "velocityfibre-crm.firebaseapp.com",
    projectId: "velocityfibre-crm",
    storageBucket: "velocityfibre-crm.appspot.com",
    messagingSenderId: "NEW-SENDER-ID",
    appId: "NEW-APP-ID"
  },
  // Integration with FibreFlow
  fibreflowApi: "https://us-central1-fibreflow-73daf.cloudfunctions.net/api"
};
```

## Step 3: Multi-Tenant Architecture

### A. Database Structure for MDUs
```typescript
// Firestore Collections Structure
interface FirestoreSchema {
  // Top-level collections
  mdus: MDU[];                    // Multi-Dwelling Units
  bodyCorporates: BodyCorp[];     // HOAs/Body Corps
  residents: Resident[];          // Individual residents
  units: Unit[];                  // Individual units/apartments
  
  // Subcollections
  'mdus/{mduId}/units': Unit[];
  'mdus/{mduId}/tickets': Ticket[];
  'mdus/{mduId}/announcements': Announcement[];
  'bodyCorporates/{corpId}/mdus': string[];  // MDU IDs
  'residents/{residentId}/units': string[];  // Unit IDs
}

// Example MDU structure
interface MDU {
  id: string;
  name: string;                   // e.g., "Sandton Heights"
  bodyCorpId: string;             // Link to body corporate
  address: Address;
  totalUnits: number;
  activeUnits: number;
  fibreflowProjectId?: string;    // Link to FibreFlow project
  status: 'planning' | 'installation' | 'active' | 'maintenance';
}
```

### B. Security Rules for Multi-Tenancy
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Body Corporate admins can only see their MDUs
    match /mdus/{mduId} {
      allow read: if request.auth != null && 
        (isBodyCorpAdmin(resource.data.bodyCorpId) || 
         isResident(mduId));
      allow write: if request.auth != null && 
        isBodyCorpAdmin(resource.data.bodyCorpId);
    }
    
    // Residents can only see their own data
    match /residents/{residentId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == residentId;
    }
    
    function isBodyCorpAdmin(corpId) {
      return get(/databases/$(database)/documents/bodyCorporates/$(corpId))
        .data.admins.hasAny([request.auth.uid]);
    }
    
    function isResident(mduId) {
      return exists(/databases/$(database)/documents/mdus/$(mduId)/residents/$(request.auth.uid));
    }
  }
}
```

## Step 4: Integration Strategy with FibreFlow

### A. Cloud Functions for API Communication
```typescript
// functions/src/index.ts (in CRM project)
import * as functions from 'firebase-functions';
import axios from 'axios';

// Sync MDU data from FibreFlow
export const syncMDUFromFibreFlow = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth || !isAdmin(context.auth.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  
  const { projectId } = data;
  
  // Call FibreFlow API (with service account auth)
  const response = await axios.get(
    `https://us-central1-fibreflow-73daf.cloudfunctions.net/api/projects/${projectId}`,
    {
      headers: {
        'Authorization': `Bearer ${await getServiceAccountToken()}`
      }
    }
  );
  
  // Create/update MDU in CRM
  const mduData = transformProjectToMDU(response.data);
  await admin.firestore().collection('mdus').doc(mduData.id).set(mduData);
  
  return { success: true, mduId: mduData.id };
});
```

### B. FibreFlow API Endpoints (Add to FibreFlow)
```typescript
// In FibreFlow functions/src/crm-integration.ts
export const getCRMProjectData = functions.https.onRequest(async (req, res) => {
  // Verify service account
  const auth = await verifyServiceAccount(req);
  if (!auth) {
    res.status(401).send('Unauthorized');
    return;
  }
  
  const { projectId } = req.params;
  const project = await getProject(projectId);
  
  // Return sanitized data for CRM
  res.json({
    id: project.id,
    name: project.name,
    location: project.location,
    totalUnits: project.units,
    status: project.status,
    // Don't include sensitive operational data
  });
});
```

## Step 5: Development Workflow

### A. Repository Structure
```bash
# Create new GitHub repository
GitHub: velocityfibre-crm (separate from fibreflow)

# Initial setup
git init
git remote add origin https://github.com/your-org/velocityfibre-crm.git
git add .
git commit -m "Initial CRM setup"
git push -u origin main
```

### B. Development Commands
```bash
# Local development
npm start  # Runs on http://localhost:4200

# Build
npm run build

# Deploy to Firebase
firebase deploy

# Deploy hosting only
firebase deploy --only hosting

# Deploy functions
firebase deploy --only functions
```

## Step 6: Authentication Strategy

### A. Separate User Bases
```typescript
// CRM User Types
enum UserRole {
  SUPER_ADMIN = 'super_admin',        // VelocityFibre CRM admins
  BODY_CORP_ADMIN = 'body_corp_admin', // HOA administrators  
  PROPERTY_MANAGER = 'property_manager',
  RESIDENT = 'resident',              // End users
  GUEST = 'guest'                     // Temporary access
}

// User document structure
interface CRMUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  bodyCorpIds?: string[];  // Which body corps they manage
  mduIds?: string[];       // Which MDUs they can access
  unitIds?: string[];      // Which units they own/rent
}
```

### B. Registration Flow
```typescript
// Different registration paths
// 1. Body Corp Admin - Invited by VelocityFibre
// 2. Property Manager - Invited by Body Corp
// 3. Resident - Self-registration with unit code
```

## Step 7: Deployment & Domains

### A. Custom Domain Setup
```bash
# In Firebase Console > Hosting
Add custom domain: crm.velocityfibre.com
# or
Add custom domain: portal.velocityfibre.com
```

### B. Environment Separation
```typescript
// Different environments
const ENVIRONMENTS = {
  development: 'http://localhost:4200',
  staging: 'https://velocityfibre-crm-staging.web.app',
  production: 'https://crm.velocityfibre.com'
};
```

## Step 8: Data Sync Considerations

### A. What to Sync from FibreFlow
- Basic project information (name, location, status)
- Installation progress updates
- Service availability status
- NOT operational details or internal data

### B. What to Sync to FibreFlow
- New sign-ups from residents
- Service requests that need technical attention
- Aggregated usage statistics
- NOT personal resident information

### C. Sync Methods
1. **Real-time webhooks** (for critical updates)
2. **Scheduled functions** (for batch updates)
3. **Manual triggers** (for one-time syncs)
4. **API polling** (for non-critical data)

## Quick Reference Commands

```bash
# Initial Setup (One time)
cd ~/VF/Apps
npx @angular/cli@20 new VelocityFibre-CRM --routing --style=scss --standalone
cd VelocityFibre-CRM
ng add @angular/fire

# Daily Development
cd ~/VF/Apps/VelocityFibre-CRM
npm start

# Deployment
npm run build
firebase deploy

# View projects
firebase projects:list

# Switch between projects
firebase use velocityfibre-crm  # CRM project
firebase use fibreflow-73daf    # FibreFlow project
```

## Important Notes

1. **Complete Separation**: This is a separate product, not a module
2. **Different User Base**: MDUs, HOAs, residents vs internal staff
3. **Different Security**: Public-facing vs internal operations
4. **Limited Integration**: Only sync what's necessary
5. **Scalability**: Design for thousands of MDUs from the start

## Next Steps

1. Create Firebase project in console
2. Set up Angular application
3. Design MDU data model
4. Implement multi-tenant security
5. Build registration flows
6. Create integration APIs
7. Deploy to staging environment

---

This creates a completely separate CRM system that can scale to thousands of MDUs while maintaining clean separation from the operational FibreFlow system.