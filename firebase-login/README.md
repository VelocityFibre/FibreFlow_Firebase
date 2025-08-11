# Firebase Authentication Guide - Service Account Method

## Why Service Accounts Are Better

Service accounts are **MUCH MORE RELIABLE** than CI tokens because:
- ✅ **Never expire** - No more "credentials no longer valid" errors
- ✅ **No browser needed** - Works in any environment
- ✅ **No login prompts** - Fully automated
- ✅ **Works with automation** - CI/CD, cron jobs, scripts
- ✅ **Multiple environments** - Use different accounts for dev/staging/prod

## Current Setup

We already have a service account file:
```
fibreflow-service-account.json
```

## How to Use Service Account

### Method 1: Export Environment Variable (Temporary)
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./fibreflow-service-account.json"
firebase deploy --only hosting
```

### Method 2: Add to Your Shell Profile (Permanent)
Add this to `~/.bashrc` or `~/.zshrc`:
```bash
# Firebase Service Account
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/VF/Apps/FibreFlow/fibreflow-service-account.json"
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

### Method 3: Use the Deploy Script
```bash
./firebase-login/deploy-with-service-account.sh
```

## Quick Deploy Commands

### Deploy to Production
```bash
# Using service account
export GOOGLE_APPLICATION_CREDENTIALS="./fibreflow-service-account.json"
firebase deploy --only hosting
```

### Deploy Everything
```bash
# Deploy hosting, functions, firestore rules, etc.
export GOOGLE_APPLICATION_CREDENTIALS="./fibreflow-service-account.json"
firebase deploy
```

### Deploy to Preview Channel
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./fibreflow-service-account.json"
firebase hosting:channel:deploy preview-feature --expires 7d
```

## Common Issues & Solutions

### Issue: "Application Default Credentials are not available"
**Solution**: Make sure the path to service account is correct:
```bash
# Check if file exists
ls -la fibreflow-service-account.json

# Use full path if needed
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/fibreflow-service-account.json"
```

### Issue: "Permission denied" errors
**Solution**: Your service account might not have enough permissions. Check Firebase Console > Project Settings > Service Accounts

### Issue: Wrong project
**Solution**: Explicitly specify project:
```bash
firebase use fibreflow-73daf
firebase deploy --project fibreflow-73daf
```

## Security Notes

⚠️ **IMPORTANT**: 
- Keep `fibreflow-service-account.json` in `.gitignore`
- Never commit service account files to git
- Store backups securely
- Rotate keys periodically (every 6-12 months)

## Why CI Tokens Keep Failing

The Firebase CI token (`firebase login:ci`) fails because:
1. **OAuth changes** - Google tightened OAuth security
2. **Token rotation** - Tokens expire more frequently now
3. **Browser issues** - Popup blockers, cookies, multiple accounts
4. **Network restrictions** - VPNs, firewalls, corporate networks

## Best Practice: Always Use Service Accounts

For solo developers and small teams, service accounts are the way to go:
- No more authentication headaches
- Works every time
- Fully automated deployments
- No browser dependencies

## Creating a New Service Account (if needed)

1. Go to [Firebase Console](https://console.firebase.google.com/project/fibreflow-73daf/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Save the JSON file
4. Add to `.gitignore`
5. Use with `GOOGLE_APPLICATION_CREDENTIALS`