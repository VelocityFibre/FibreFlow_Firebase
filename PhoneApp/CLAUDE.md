# FibreField - Native Mobile App Strategy

## Overview

This directory contains the planning and implementation for converting our browser-based PolePlantingApp into a native mobile application called **FibreField** using Ionic Framework.

## Why Native App?

### The Problem
Our field workers need to capture multiple high-resolution photos per pole while offline. Browser-based storage has severe limitations:
- **IndexedDB**: 50-100MB typical limit
- **6 photos per pole @ 2-3MB each** = 12-18MB per pole
- **Field workers capture 10-20 poles offline** = 120-360MB needed
- **Result**: Storage quota exceeded, data loss, frustrated field workers

### The Solution
Native mobile app with:
- **Unlimited file system storage** for photos
- **SQLite database** for structured data
- **Background sync** when connectivity returns
- **Native camera** access with compression options
- **Offline-first** architecture

## What We Want to Do

### Phase 1: Proof of Concept
1. Set up Ionic + Capacitor in a branch
2. Implement native photo capture and storage
3. Demonstrate offline capabilities
4. Show sync process

### Phase 2: Full Implementation
1. Convert all UI components to Ionic
2. Implement complete offline workflow
3. Add background sync service
4. Testing with field workers

### Phase 3: Deployment
1. App store preparation
2. Beta testing program
3. Training materials
4. Phased rollout

## Technical Approach

### Stack
- **Framework**: Ionic React (keeps our React knowledge)
- **Native Bridge**: Capacitor (modern, maintained by Ionic)
- **Storage**: SQLite + File System
- **Sync**: Background service with queue management

### Key Features
1. **Unlimited Photo Storage**: Native file system, not browser storage
2. **Reliable Offline Mode**: SQLite for data, files for photos
3. **Smart Sync**: Progressive upload, retry logic, conflict resolution
4. **Better UX**: Native UI components, smooth animations
5. **Enhanced Security**: Biometric auth, encrypted storage

## Benefits

### For Field Workers
- No more "storage full" errors
- Works reliably offline
- Faster photo capture
- Background sync (set and forget)

### For Management
- Reduced support tickets
- Better data quality
- Real-time sync status
- Native app analytics

### For Development
- Same React codebase
- Better debugging tools
- Native performance
- Platform-specific features when needed

## Project Structure
```
PhoneApp/
├── docs/                      # Documentation
│   ├── IONIC_INTEGRATION_ANALYSIS.md
│   └── ...
├── poc/                       # Proof of concept
│   └── fibrefield-ionic/      # FibreField Ionic app
└── CLAUDE.md                  # This file
```

## Quick Start

To work on the proof of concept:
```bash
cd PhoneApp/poc/fibrefield-ionic
npm install
ionic serve  # Web preview
ionic cap run android --livereload  # Android device
ionic cap run ios --livereload  # iOS device
```

## Key Decisions

1. **Ionic over React Native**: Better web compatibility, easier migration
2. **Capacitor over Cordova**: Modern, better maintained
3. **SQLite over Realm**: Simpler, well-tested
4. **File storage over base64**: 33% space savings

## Success Metrics

- [ ] Zero storage-related errors
- [ ] 100% offline capture success rate
- [ ] <2 min sync time for 20 poles
- [ ] Field worker satisfaction >90%

## References

- [Ionic Documentation](https://ionicframework.com/docs)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- Original app: `/PolePlantingApp`
- Main project: `/FibreFlow`