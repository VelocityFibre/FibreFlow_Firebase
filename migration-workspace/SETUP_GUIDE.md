# FibreFlow Migration Setup Guide

## Overview
This guide walks you through setting up and running the Airtable to Firebase migration safely.

## Directory Structure
```
migration-workspace/
├── TEST-fibreflow/     🧪 Safe testing environment
└── PROD-fibreflow/     🚨 Production (only after testing)
```

## Step 1: Set Up TEST Environment

### 1.1 Navigate to TEST directory
```bash
cd migration-workspace/TEST-fibreflow
```

### 1.2 Run setup script
```bash
./setup.sh
```

### 1.3 Configure Airtable API
Edit `.env` file in the migrator directory:
```bash
cd migrator
nano .env  # or use your preferred editor
```

Replace `YOUR_AIRTABLE_API_KEY_HERE` with your actual key from:
https://airtable.com/create/tokens

### 1.4 Add Firebase Service Account

1. Go to Firebase Console: https://console.firebase.google.com
2. Create a TEST project called `fibreflow-test`
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Save as `service-account.json` in the `migrator` directory

### 1.5 Verify Setup
```bash
node verify-setup.js
```

You should see all green checkmarks.

## Step 2: Test Migration

### 2.1 Dry Run First
Always start with a dry run:
```bash
npm run migrate -- --dry-run
```

This will:
- Read from Airtable
- Transform data
- Save sample JSON files
- NOT write to Firebase

### 2.2 Check Output
Review the generated files in `output/` directory:
```bash
ls -la output/
cat output/customers-sample.json
```

### 2.3 Migrate One Table
Start with the simplest table:
```bash
npm run migrate customers
```

### 2.4 Verify in Firebase Console
1. Open https://console.firebase.google.com/project/fibreflow-test
2. Go to Firestore Database
3. Check the `customers` collection
4. Verify data looks correct

## Step 3: Full TEST Migration

Once comfortable, migrate all tables:
```bash
npm run migrate
```

Order of migration:
1. staff
2. contractors
3. customers
4. projects
5. daily-tracker

## Step 4: Validate TEST Data

### 4.1 Check Record Counts
```bash
npm run validate customers
```

### 4.2 Test Your App
Point your app to TEST Firebase and verify:
- Data displays correctly
- Relationships work
- No errors in console

## Step 5: Production Migration (When Ready)

### 5.1 Set Up PROD Directory
```bash
cd ../../PROD-fibreflow
cp -r ../TEST-fibreflow/migrator .
cd migrator
```

### 5.2 Update Configuration
Edit `.env`:
```
FIREBASE_PROJECT_ID=fibreflow-prod  # Your REAL project ID
```

### 5.3 Add PRODUCTION Service Account
⚠️ Be very careful - this is your live database!

### 5.4 Final Dry Run
```bash
npm run migrate -- --dry-run
```

### 5.5 Production Migration
One table at a time:
```bash
npm run migrate customers
# Check your live app
npm run migrate projects
# Check again
# Continue...
```

## Safety Checklist

Before Production:
- [ ] Tested everything in TEST environment
- [ ] Backed up production Firebase
- [ ] Scheduled during low-traffic time
- [ ] Have rollback plan ready
- [ ] Team is aware of migration

## Troubleshooting

### "Cannot find module" error
```bash
npm install
```

### "Service account not found"
Make sure `service-account.json` is in the migrator directory

### "API key invalid"
Check your Airtable API key in `.env`

### Data not appearing
1. Check Firebase Console for the correct project
2. Verify no errors in migration output
3. Check correct collection names

## Emergency Contacts

If something goes wrong:
- Firebase Support: https://firebase.google.com/support
- Your team lead: _____________

## Remember

1. **Always test first** in TEST-fibreflow
2. **Never rush** production migration
3. **Verify each step** before proceeding
4. **Keep backups** of everything

Good luck! 🚀