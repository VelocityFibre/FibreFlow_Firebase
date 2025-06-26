# Migration Workspace - CLEARLY SEPARATED

## Directory Structure
```
migration-workspace/
├── TEST-fibreflow/          🧪 SAFE TO EXPERIMENT
│   ├── migrator/           (Complete migration tool)
│   ├── service-account.json
│   └── .env
│
└── PROD-fibreflow/         🚨 PRODUCTION - BE CAREFUL!
    ├── migrator/           (Complete migration tool)  
    ├── service-account.json
    └── .env
```

## Setup Instructions

### 1. TEST Environment Setup
```bash
cd TEST-fibreflow
cp -r ../../airtable-firebase-migrator ./migrator
cd migrator

# Create TEST .env file
echo "FIREBASE_PROJECT_ID=fibreflow-test" > .env
echo "AIRTABLE_API_KEY=your_key" >> .env

# Add TEST service account
# Download from: Firebase Console > fibreflow-test > Service Accounts
```

### 2. PROD Environment Setup (When Ready)
```bash
cd PROD-fibreflow
cp -r ../../airtable-firebase-migrator ./migrator
cd migrator

# Create PROD .env file
echo "FIREBASE_PROJECT_ID=fibreflow-prod" > .env
echo "AIRTABLE_API_KEY=your_key" >> .env

# Add PROD service account
# Download from: Firebase Console > fibreflow-prod > Service Accounts
```

## Usage

### Always Test First:
```bash
cd migration-workspace/TEST-fibreflow/migrator
npm install
npm run migrate -- --dry-run
```

### Production (After Testing):
```bash
cd migration-workspace/PROD-fibreflow/migrator
npm install
# Triple check you're in PROD directory!
pwd  # Should show: /migration-workspace/PROD-fibreflow/migrator
npm run migrate -- --dry-run  # Always dry-run first!
```

## Visual Indicators

- **TEST-fibreflow/** = Yellow/Green in terminal = SAFE
- **PROD-fibreflow/** = Red in terminal = DANGER

## Safety Rules

1. NEVER copy service-account.json between directories
2. Each directory has its OWN .env file
3. Can't accidentally use wrong Firebase project
4. Clear visual separation

## Benefits

✅ Impossible to mix up environments
✅ Each has its own configuration
✅ Can delete TEST directory when done
✅ Clear folder names
✅ Separate git repos if needed