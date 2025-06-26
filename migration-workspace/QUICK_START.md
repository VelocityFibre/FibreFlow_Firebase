# Quick Start Guide 🚀

## 1. First Time Setup (5 minutes)

```bash
# Navigate to TEST environment
cd migration-workspace/TEST-fibreflow

# Run automated setup
./setup.sh

# Enter migrator directory
cd migrator

# Add your Airtable API key
nano .env
# Replace YOUR_AIRTABLE_API_KEY_HERE with your actual key

# Add Firebase service account
# Download from Firebase Console and save as service-account.json

# Verify setup
node verify-setup.js
```

## 2. Test the Migration (2 minutes)

```bash
# Always start with dry run
npm run migrate -- --dry-run

# Check the output
ls -la output/
cat output/customers-sample.json
```

## 3. Migrate to TEST Firebase (10 minutes)

```bash
# Start with one table
npm run migrate customers

# Check Firebase Console
# https://console.firebase.google.com/project/fibreflow-test

# If good, migrate all tables
npm run migrate
```

## 4. When Ready for Production

```bash
# Go to PROD directory
cd ../../PROD-fibreflow

# Copy and setup (same as TEST but with PROD credentials)
cp -r ../TEST-fibreflow/migrator .
cd migrator

# Update .env for production
# Add production service-account.json

# ALWAYS dry-run first
npm run migrate -- --dry-run

# Migrate one table at a time
npm run migrate customers
# Verify in your LIVE app
# Continue with other tables...
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run migrate -- --dry-run` | Test without writing |
| `npm run migrate customers` | Migrate single table |
| `npm run migrate` | Migrate all tables |
| `npm run migrate -- --batch-size 10` | Small batches |
| `npm run validate customers` | Check mapping |

## Safety Rules

1. **TEST first, PROD later**
2. **Always use --dry-run initially**
3. **Check Firebase Console after each table**
4. **Keep both directories completely separate**

## Help

- Migration errors? Check `output/` folder
- Firebase issues? Verify service-account.json
- Duplicates? The tool prevents them automatically

---
Remember: You can't break anything in TEST! 🧪