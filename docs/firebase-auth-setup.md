# Firebase Authentication & Deployment Setup

This document outlines the permanent authentication setup for Firebase CI/CD operations in the FibreFlow project.

## Overview

As a sole developer, you need a permanent authentication solution that doesn't require repeated logins. This setup uses Firebase CI tokens which never expire until manually revoked.

## Initial Setup (One-Time Only)

### 1. Generate Firebase CI Token

```bash
firebase login:ci
```

This will:
- Open a browser window for Google authentication
- Generate a permanent CI token after successful login
- Display the token in the terminal

### 2. Store Token Securely

The token is stored in `.env.local` file:
```bash
# .env.local
FIREBASE_TOKEN=1//03X2MV4w-sN5cCgYIARAAGAMSNwF-L9IrdsfmP0MzDG1GhFrSz4oaUiYOw0yEuAuRGnmADAl0vzkO9pSfXbwtu8D3s4MSiNwruh4
```

**Security Notes:**
- `.env.local` is gitignored - never commit this file
- Token works indefinitely until revoked
- Keep this file backed up securely

### 3. Deployment Script

A deployment script (`deploy.sh`) automatically loads the token:

```bash
#!/bin/bash
# Load token from .env.local file
if [ -f .env.local ]; then
    export $(grep FIREBASE_TOKEN .env.local | xargs)
fi

# Check if token is set
if [ -z "$FIREBASE_TOKEN" ]; then
    echo "Error: FIREBASE_TOKEN not found in .env.local"
    exit 1
fi
```

## Usage

### Deploy to Preview Channel
```bash
./deploy.sh preview feature-name 7d
```
- `feature-name`: Name of the preview channel
- `7d`: Expiration time (7 days)

### Deploy to Production
```bash
./deploy.sh prod
```

### Manual Deployment (if needed)
```bash
# Set token for current session
export FIREBASE_TOKEN="your-token-here"

# Deploy
firebase deploy --token "$FIREBASE_TOKEN"
```

## Alternative Authentication Methods

### 1. Service Account (Organization Restricted)
If your organization allows service account key creation:
1. Go to Firebase Console > Project Settings > Service Accounts
2. Generate new private key
3. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
   ```

### 2. Application Default Credentials
For local development with Google Cloud SDK:
```bash
gcloud auth application-default login
```

### 3. Regular Firebase Login
For interactive sessions:
```bash
firebase login
```

## Troubleshooting

### Token Expired or Invalid
1. Generate new token: `firebase login:ci`
2. Update `.env.local` with new token
3. Restart terminal or run: `source ~/.bashrc`

### Authentication Errors
```bash
# Check current authentication
firebase login:list

# Re-authenticate if needed
firebase login --reauth
```

### Organization Policy Restrictions
If service account key creation is restricted:
- Use Firebase CI token method (recommended)
- Contact organization admin for policy exceptions
- Use Application Default Credentials as fallback

## Token Management

### Revoke Token (if compromised)
```bash
firebase logout --token "your-token-here"
```

### Generate New Token
```bash
firebase login:ci
```

### Environment Variable Setup
Add to `~/.bashrc` or `~/.zshrc` for permanent access:
```bash
# Firebase CI Token
export FIREBASE_TOKEN="your-token-here"
```

## Security Best Practices

1. **Never commit tokens** - Always use `.env.local` or environment variables
2. **Rotate tokens periodically** - Generate new tokens every 6-12 months
3. **Use different tokens** for different environments (dev/staging/prod)
4. **Restrict token permissions** if using service accounts
5. **Monitor usage** in Firebase Console for unusual activity

## Quick Reference

| Command | Purpose |
|---------|---------|
| `firebase login:ci` | Generate permanent CI token |
| `./deploy.sh preview name 7d` | Deploy to preview channel |
| `./deploy.sh prod` | Deploy to production |
| `firebase projects:list` | Test authentication |
| `firebase logout --token TOKEN` | Revoke specific token |

## Related Files

- `.env.local` - Token storage (gitignored)
- `deploy.sh` - Automated deployment script
- `.gitignore` - Ensures `.env.local` is not committed
- `claude.md` - Project documentation with auth section