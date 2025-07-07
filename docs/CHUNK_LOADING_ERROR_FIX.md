# FibreFlow - Chunk Loading Error Fix Guide

## Problem Description
Users are experiencing "Failed to fetch dynamically imported module" errors when navigating to project details. The specific error mentions a chunk file (e.g., `chunk-MK6UFUOV.js`) that doesn't exist in the current deployment.

## Root Cause
The issue occurs when:
1. The service worker caches old chunk files from previous deployments
2. Angular generates new chunk names with each build (due to output hashing)
3. The cached HTML/JS references old chunks that no longer exist on the server

## Immediate Solutions

### For End Users
1. **Hard Refresh**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear Site Data**:
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Clear site data" under Storage
3. **Update Service Worker**:
   - DevTools > Application > Service Workers
   - Click "Update" or "skipWaiting"

### For Developers

#### Solution 1: Update Service Worker Version (Implemented)
The service worker cache version has been updated from `v2` to `v4` in `src/sw.js`:
```javascript
const CACHE_NAME = 'fibreflow-v4';
const RUNTIME_CACHE = 'fibreflow-runtime-v4';
```

This forces all clients to invalidate their old caches on the next deployment.

#### Solution 2: Service Worker Update Handler (Implemented)
A new service (`ServiceWorkerUpdateService`) has been added that:
- Automatically checks for updates every 30 minutes
- Checks when the tab becomes visible again
- Shows a snackbar notification when updates are available
- Allows users to reload and get the latest version

## Prevention Measures

### 1. Cache Busting Configuration
Angular is already configured with proper output hashing:
```json
"outputHashing": "all"
```

### 2. Service Worker Headers
The Firebase hosting configuration properly sets cache headers:
- JS/CSS files: `max-age=31536000, immutable` (cached forever due to hashing)
- index.html: `no-cache, no-store, must-revalidate` (always fresh)

### 3. Automatic Update Notifications
Users will now see a notification when a new version is available, preventing stale cache issues.

## Deployment Steps

1. **Build the application**:
   ```bash
   npm run build:prod
   ```

2. **Deploy to Firebase**:
   ```bash
   npm run deploy:hosting
   ```

3. **Verify deployment**:
   - Visit https://fibreflow-73daf.web.app in an incognito window
   - Check DevTools Network tab for any 404 errors
   - Navigate to project details to ensure chunks load correctly

## Monitoring

To check if users are experiencing this issue:
1. Check browser console for "Failed to fetch dynamically imported module" errors
2. Look for 404 errors in Network tab for chunk files
3. Check Sentry error reports for chunk loading failures

## Long-term Improvements

1. **Implement versioning strategy**: Include app version in localStorage and force reload on mismatch
2. **Add chunk retry logic**: Retry failed chunk loads with cache-busting query params
3. **Consider removing service worker**: If offline functionality isn't critical
4. **Implement chunk preloading**: Preload critical chunks to prevent lazy-loading failures

## Related Files
- `/src/sw.js` - Service Worker implementation
- `/src/app/core/services/service-worker-update.service.ts` - Update handler
- `/scripts/fix-chunk-error.js` - Diagnostic script
- `/firebase.json` - Hosting cache configuration