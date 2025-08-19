# Pole Planting App

## Overview
This is a standalone React Progressive Web App (PWA) for field workers to capture pole planting data. It operates independently from the main FibreFlow Angular application.

## Important: Data Collection
**This app currently saves all data to the `pole-plantings-staging` collection in Firebase Firestore.**

### Firebase Collections Used:
- **Primary Collection**: `pole-plantings-staging` - All pole planting data is saved here
- **Storage Path**: `pole-plantings/` - Photos are uploaded to Firebase Storage under this path

## Architecture
- **Frontend**: React 19.1.1 with Vite
- **Backend**: Firebase (Firestore + Storage)
- **PWA**: Offline-capable with service worker
- **Authentication**: Currently disabled for development

## Features
- Offline data capture with local storage queue
- Photo capture (6 required photos per pole)
- GPS location tracking with accuracy
- Progressive photo upload (continues even if interrupted)
- Auto-save drafts
- Simple field-optimized UI

## Data Flow
1. Field worker captures pole data offline
2. Data saved to IndexedDB locally
3. When online, syncs to `pole-plantings-staging` collection
4. Admin verifies data at https://fibreflow-73daf.web.app/pole-planting/verification
5. Approved data moves to production `planted-poles` collection

## Development

### Prerequisites
- Node.js 20+
- npm or yarn

### Setup
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Deployment
The app is deployed to Firebase Hosting at:
- **Production**: https://fibreflow-73daf.web.app/pole-planting/
- **Direct URL**: https://fibreflow-73daf.web.app/pole-planting/index.html

## Configuration
Firebase configuration is in `src/firebaseConfig.js`. The app uses the same Firebase project as the main FibreFlow application.

## Photo Requirements
Each pole requires 6 photos:
1. **Before**: Site before installation
2. **Front**: Front view of pole
3. **Side**: Side angle view
4. **Depth**: Installation depth
5. **Concrete**: Base/foundation
6. **Compaction**: Ground compaction

## Offline Capabilities
- Works fully offline using service worker
- Queues data for sync when connection restored
- Photos compressed and stored locally
- Automatic retry on connection

## Security
- Firebase Storage rules allow photo uploads without authentication (development mode)
- Firestore rules currently allow writes to `pole-plantings-staging` collection
- TODO: Enable authentication for production use

## Known Issues
- Verification page currently reads from different collection (`staging-field-captures`)
- Need to update verification page to also read from `pole-plantings-staging`

## Future Improvements
- [ ] Add authentication requirement
- [ ] Unify data collection between React app and Angular app
- [ ] Add data validation before upload
- [ ] Implement conflict resolution for duplicate poles
