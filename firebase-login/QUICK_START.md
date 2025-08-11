# 🚀 Quick Start - Firebase Service Account

## One-Time Setup (2 minutes)
```bash
# Run the setup script
./firebase-login/setup-permanent-auth.sh

# Reload your shell
source ~/.bashrc  # or source ~/.zshrc
```

## That's it! Now just deploy:
```bash
# Option 1: Use the convenient alias
firebase-deploy

# Option 2: Use the script directly
./firebase-login/deploy-with-service-account.sh

# Option 3: Use Firebase CLI directly (it will auto-detect the service account)
firebase deploy --only hosting
```

## No More Login Issues! 🎉
- ✅ No more "credentials are no longer valid"
- ✅ No more browser popup failures
- ✅ No more CI token expiration
- ✅ Works every time!

## Common Commands
```bash
# Deploy hosting only (fastest)
firebase deploy --only hosting

# Deploy everything
firebase deploy

# Check which project you're on
firebase projects:list

# Switch projects
firebase use project-id
```