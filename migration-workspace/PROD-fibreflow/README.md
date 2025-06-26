# 🚨 PRODUCTION Environment - BE VERY CAREFUL!

## ⚠️ WARNING ⚠️
This directory is for PRODUCTION migration.
Any changes here will affect your LIVE APPLICATION!

## Pre-flight Checklist
- [ ] Have you tested everything in TEST-fibreflow?
- [ ] Do you have a backup of production data?
- [ ] Is this outside of peak usage hours?
- [ ] Do you have a rollback plan?

## Setup (Only After Testing)
```bash
# 1. Copy migration tool
cp -r ../../airtable-firebase-migrator ./migrator

# 2. Setup
cd migrator
npm install

# 3. Configure for PRODUCTION
cat > .env << EOF
FIREBASE_PROJECT_ID=fibreflow-prod
AIRTABLE_API_KEY=your_airtable_key
AIRTABLE_BASE_ID=appkYMgaK0cHVu4Zg
EOF

# 4. Add PRODUCTION service account
# ⚠️ This is your PRODUCTION credentials!
# Save as: service-account.json
# From: https://console.firebase.google.com/project/fibreflow-prod/settings/serviceaccounts/adminsdk

# 5. ALWAYS dry-run first!
npm run migrate -- --dry-run

# 6. When ready for real migration
npm run migrate customers  # One table at a time
```

## Firebase Console (PRODUCTION)
https://console.firebase.google.com/project/fibreflow-prod

## Emergency Contacts
- Technical Lead: ___________
- Database Admin: ___________

## Remember
- This is PRODUCTION
- Real users depend on this data
- Test everything in TEST first
- Go slow, verify each step