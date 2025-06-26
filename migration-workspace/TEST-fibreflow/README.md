# 🧪 TEST Environment - SAFE TO EXPERIMENT

This is your TEST environment. Feel free to:
- Run migrations multiple times
- Test different configurations  
- Delete and start over
- Make mistakes

## Quick Start
```bash
# 1. Copy migration tool here
cp -r ../../airtable-firebase-migrator ./migrator

# 2. Setup
cd migrator
npm install

# 3. Configure
cat > .env << EOF
FIREBASE_PROJECT_ID=fibreflow-test
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=appkYMgaK0cHVu4Zg
EOF

# 4. Add service account
# Save as: service-account.json
# From: https://console.firebase.google.com/project/fibreflow-test/settings/serviceaccounts/adminsdk

# 5. Test migration
npm run migrate -- --dry-run
```

## Firebase Console
https://console.firebase.google.com/project/fibreflow-test

## This is TEST - No risk to production!