# Field Worker Testing Guide

## Overview
This guide explains how to test the field worker (technician) restrictions in FibreFlow while in development mode with authentication disabled.

## How Field Worker Restrictions Work

When a user has the "technician" role:
1. They can ONLY access the `/offline-pole-capture` page
2. The sidebar navigation is completely hidden
3. Browser navigation controls are disabled (back button, keyboard shortcuts)
4. All other routes redirect back to `/offline-pole-capture`
5. They can only log out using the logout button

## Testing in Development Mode

### Method 1: Change the Default Dev Role (Recommended)

1. Open `/src/app/core/services/auth.service.ts`
2. Find line 38: `private DEV_USER_ROLE: UserProfile['userGroup'] = 'admin';`
3. Change it to: `private DEV_USER_ROLE: UserProfile['userGroup'] = 'technician';`
4. Save the file and refresh the browser
5. You should now be restricted to the offline-pole-capture page only

### Method 2: Use Browser Console (Quick Testing)

1. Open the browser developer console (F12)
2. Run the following command:
   ```javascript
   // Get the auth service instance
   const injector = ng.getInjector();
   const authService = injector.get(ng.core.AuthService);
   
   // Switch to technician role
   authService.switchDevRole('technician');
   ```
3. The page will reload and you'll be restricted as a field worker

### Method 3: Temporary Testing Button

You can temporarily add a role switcher button to test different roles:

1. In any component template, add:
   ```html
   <!-- Dev Mode Role Switcher -->
   <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
     <button mat-raised-button color="warn" (click)="switchToFieldWorker()">
       Test as Field Worker
     </button>
     <button mat-raised-button color="primary" (click)="switchToAdmin()">
       Test as Admin
     </button>
   </div>
   ```

2. In the component TypeScript:
   ```typescript
   authService = inject(AuthService);
   
   switchToFieldWorker() {
     (this.authService as any).switchDevRole('technician');
   }
   
   switchToAdmin() {
     (this.authService as any).switchDevRole('admin');
   }
   ```

## What to Test

### As a Field Worker (technician):

1. **Navigation Restrictions**:
   - ✅ Should auto-redirect to `/offline-pole-capture`
   - ✅ Sidebar should be completely hidden
   - ✅ Back button should not work
   - ✅ Manually typing other URLs should redirect back
   - ✅ Browser refresh should keep you on offline-pole-capture

2. **UI Elements**:
   - ✅ Should see "Offline Pole Capture" in the header
   - ✅ No menu button visible
   - ✅ Only logout button available
   - ✅ No back button in the offline capture page

3. **Keyboard Shortcuts** (should be disabled):
   - Alt+Left (back)
   - Alt+Right (forward)
   - F5 (refresh - should still work but stay on same page)

### As Other Roles:

1. Switch back to 'admin' or other roles
2. Verify full navigation is restored
3. Sidebar should be visible
4. All routes should be accessible

## Console Messages

When testing, you'll see helpful console messages:

- On app load: `🔐 Auth Service initialized in MOCK MODE - Logged in as technician`
- When switching roles: `🔄 Switching dev user role from admin to technician`
- Navigation blocks: `🚫 Field worker attempting to navigate to: /dashboard`

## Troubleshooting

### Issue: Changes not taking effect
- Make sure to refresh the browser after changing DEV_USER_ROLE
- Clear browser cache if needed (Ctrl+Shift+R)

### Issue: Can still see navigation
- Check browser console for the current role
- Ensure the auth service is using the mock user (USE_REAL_AUTH = false)

### Issue: Getting logged out
- This is expected behavior when switching roles
- The page reload is intentional to ensure all guards re-evaluate

## Production Behavior

In production with real authentication:
1. Users will sign in with Google
2. Their role will be determined from the Firestore `users` collection
3. Field workers (technicians) will have the same restrictions
4. No role switching will be available

## Security Note

The role switching functionality is ONLY available in development mode. In production:
- Real authentication is enforced
- User roles come from the database
- No client-side role manipulation is possible
- All restrictions are enforced server-side as well