# Authentication Development Mode

*Last Updated: 2025-01-30*

## Overview

FibreFlow has a built-in authentication toggle that allows switching between real Google authentication and mock authentication for development purposes.

## Current Status: DEVELOPMENT MODE ACTIVE

🚨 **Authentication is currently DISABLED for development**

Users are automatically logged in without requiring Gmail authentication. This eliminates the frustration of constant re-authentication during development and deployments.

## Mock Authentication Details

When `USE_REAL_AUTH = false`:

**Mock User Profile:**
- **Email:** `dev@test.com`
- **Display Name:** `Dev User` 
- **Role:** `admin`
- **UID:** `dev-user`
- **Status:** Always active and logged in

**Behavior:**
- No login page required
- Automatic admin access to all features
- No re-authentication after page refresh
- No re-authentication after deployments
- Logout button doesn't actually log out (stays logged in)

## How It Works

The authentication system is controlled by a single flag in the AuthService:

**File:** `src/app/core/services/auth.service.ts`
```typescript
// Current setting for development
private USE_REAL_AUTH = false; // Mock auth mode

// For production
private USE_REAL_AUTH = true;  // Google auth mode
```

## Switching Between Modes

### To DISABLE Authentication (Current State)
```typescript
// In src/app/core/services/auth.service.ts
private USE_REAL_AUTH = false;
```
Then redeploy: `firebase deploy --only hosting`

### To ENABLE Google Authentication
```typescript
// In src/app/core/services/auth.service.ts  
private USE_REAL_AUTH = true;
```
Then redeploy: `firebase deploy --only hosting`

## Real Authentication Mode

When `USE_REAL_AUTH = true`:

**Features:**
- Google sign-in popup required
- User profiles stored in Firestore `users` collection
- Role-based access control
- Proper logout functionality
- Session persistence

**Default Role:** New users get `client` role by default
**Admin Access:** Manually update user document in Firestore to set `userGroup: 'admin'`

## Security Considerations

### Development Mode (Current)
- ⚠️ **Not secure** - anyone can access as admin
- ✅ **Good for development** - no authentication friction
- ✅ **Good for testing** - full feature access
- ❌ **Never use in production**

### Production Mode
- ✅ **Secure** - requires Google authentication
- ✅ **Role-based access** - proper user management
- ✅ **Audit trail** - real user information in logs
- ❌ **Authentication friction** - users must sign in

## Deployment Instructions

### Quick Switch to Production Auth
1. Edit `src/app/core/services/auth.service.ts`
2. Change `USE_REAL_AUTH = false` to `USE_REAL_AUTH = true`
3. Build and deploy: `npm run build && firebase deploy --only hosting`
4. Test Google authentication flow
5. Update user roles in Firestore Console as needed

### Emergency Disable Auth
If authentication is causing issues in production:
1. Change `USE_REAL_AUTH = true` to `USE_REAL_AUTH = false`
2. Deploy immediately: `firebase deploy --only hosting`
3. All users will have admin access (temporary measure only!)

## File Locations

**Primary Configuration:**
- `src/app/core/services/auth.service.ts` - Main authentication service

**Related Files:**
- `src/app/core/guards/auth.guard.ts` - Route protection
- `src/app/features/auth/login/login.component.ts` - Login page
- `src/app/core/models/user-profile.ts` - User model

## Testing Authentication

### Test Mock Mode (Current)
1. Visit https://fibreflow-73daf.web.app
2. Should automatically redirect to dashboard
3. Check sidebar - should show "Dev User" profile
4. All features should be accessible

### Test Real Auth Mode
1. Set `USE_REAL_AUTH = true` and deploy
2. Visit site - should redirect to login
3. Click "Sign in with Google"
4. Complete Google authentication
5. Should create user profile in Firestore
6. Check sidebar for real user profile

## Troubleshooting

### Users Still See Login Page
- Check `USE_REAL_AUTH` is set to `false`
- Verify deployment completed successfully
- Clear browser cache and cookies
- Check browser console for errors

### Authentication Not Working in Real Mode
- Verify Firebase project configuration
- Check Google authentication is enabled in Firebase Console
- Verify domain is authorized in Google Cloud Console
- Check browser console for authentication errors

## Change History

- **2025-01-30:** Disabled authentication for development mode
- **2025-07-21:** Initial Google authentication setup
- **Original:** Mock authentication system created

---

## Quick Reference

```bash
# Current live URL (mock auth active)
https://fibreflow-73daf.web.app

# To switch to production auth
# 1. Edit auth.service.ts: USE_REAL_AUTH = true
# 2. Deploy
firebase deploy --only hosting

# To switch back to development auth  
# 1. Edit auth.service.ts: USE_REAL_AUTH = false
# 2. Deploy
firebase deploy --only hosting
```