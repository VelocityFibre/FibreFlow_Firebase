# 🔧 Update Your Firebase Configuration

**Firebase Account**: `louis@velocityfibreapp.com` (Google Workspace)  
**Project ID**: `fibreflow-73daf`

## 1. Copy your Firebase config from the console

## 2. Update these files:

### src/environments/environment.ts
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

### src/environments/environment.prod.ts
```typescript
export const environment = {
  production: true,
  firebase: {
    // Same config as above
  }
};
```

### .firebaserc
```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

## 3. Then run these commands:

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase (use louis@velocityfibreapp.com)
firebase login

# Initialize (if needed)
firebase init
# Select: Hosting
# Public directory: dist/fibreflow/browser
# Single-page app: Yes
# Overwrite index.html: No

# Build your app
ng build

# Deploy!
firebase deploy
```

Your app will be live at: https://YOUR_PROJECT_ID.web.app