# Hidden Pages Configuration

## Overview
This document describes how to hide specific pages/routes in FibreFlow for demos or other purposes.

## Configuration File
The demo configuration is managed in `/src/app/config/demo.config.ts`

## How to Hide Pages

### 1. Enable Demo Mode
Set `isDemo: true` in the configuration file:

```typescript
export const demoConfig = {
  isDemo: true, // Set to false after demo
  hiddenRoutes: [
    // ... routes to hide
  ]
};
```

### 2. Currently Hidden Routes
The following routes are configured to be hidden when demo mode is enabled:
- `/phases` - Project phases management
- `/steps` - Steps management
- `/tasks` - Task management
- `/daily-progress` - Daily progress tracking
- `/materials` - Materials management
- `/stock` - Stock management
- `/stock/allocations` - Stock allocations
- `/stock-analysis` - Stock analysis
- `/attendance` - Attendance tracking
- `/performance` - Performance metrics
- `/supplier-portal` - Supplier portal

### 3. How It Works
When demo mode is enabled:
- **Routes are filtered** - Hidden routes are removed from the Angular router configuration
- **Navigation links are hidden** - Menu items for hidden routes are filtered out of the sidebar
- **Direct URL access is blocked** - Users cannot access hidden pages by typing the URL

## Restoring Hidden Pages

To restore all hidden pages after the demo:

1. Open `/src/app/config/demo.config.ts`
2. Change `isDemo: false`
3. Save the file
4. The application will automatically show all pages again

## Adding/Removing Pages from Hidden List

To modify which pages are hidden:

1. Open `/src/app/config/demo.config.ts`
2. Add or remove routes from the `hiddenRoutes` array
3. Use the route path (e.g., `/phases`, `/tasks`)
4. Save the file

## Implementation Details

### Files Modified
1. **`/src/app/config/demo.config.ts`** - Central configuration file
2. **`/src/app/app.routes.ts`** - Route filtering logic
3. **`/src/app/layout/app-shell/app-shell.component.ts`** - Navigation menu filtering

### Technical Approach
- Routes are dynamically filtered based on the demo configuration
- Navigation items check against the hidden routes list
- No permanent changes to code - just a configuration toggle