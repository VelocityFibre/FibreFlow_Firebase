# Logo Update Required

## Action Needed
Please add the new Velocity Fibre logo file to the public directory:

**File name**: `velocity-fibre-logo-new.png` (or `.svg` if available)
**Location**: `/public/velocity-fibre-logo-new.png`

## Logo Description
The new logo features:
- A modern gradient V shape (blue to purple/red gradient)
- "VELOCITY" text in dark blue/navy
- "FIBRE" text in gray below
- Clean, professional design

## Current Implementation
The application has been updated to reference the new logo in:
1. **App Shell** (main navigation sidebar): `/src/app/layout/app-shell/app-shell.component.ts`
2. **Login Page**: `/src/app/features/auth/login/login.component.html`

## Backup
The original logo has been backed up to:
`/public/logo-backups/velocity-fibre-logo-original-20250113.jpeg`

## Notes
- The logo container is styled to accommodate various logo dimensions
- Background is white with padding for contrast against dark sidebar
- Maximum height is set to 120px to fit within the sidebar header

Once you add the new logo file, the application will automatically display it.