# Fireflies Sync Script Instructions

## Setup (One-time)

1. **Get Firebase Service Account Key**:
   - Go to Firebase Console: https://console.firebase.google.com/project/fibreflow-73daf/settings/serviceaccounts/adminsdk
   - Click "Generate new private key"
   - Save the downloaded JSON file as `functions/serviceAccountKey.json`

2. **Install Dependencies**:
   ```bash
   cd scripts
   npm init -y
   npm install firebase-admin node-fetch
   ```

## Usage

Run the sync script from the project root:

```bash
# Sync last 30 days (default)
node scripts/sync-fireflies.js

# Sync last 7 days
node scripts/sync-fireflies.js 7

# Sync last 60 days
node scripts/sync-fireflies.js 60
```

## What it does

1. Fetches meetings from Fireflies API for the specified period
2. For each meeting:
   - Checks if it already exists in Firebase (by firefliesId)
   - Creates new meetings or updates existing ones
   - Extracts and saves action items with priority
   - Saves meeting insights and summaries
3. Shows progress and summary statistics

## Troubleshooting

- **"Cannot find module '../functions/serviceAccountKey.json'"**: Download the service account key from Firebase Console
- **"Fireflies API error"**: Check if the API key is correct in the script
- **"Permission denied"**: Ensure the service account has proper Firestore permissions

## Alternative: Use npm script

Add to package.json:
```json
"scripts": {
  "sync:meetings": "node scripts/sync-fireflies.js"
}
```

Then run:
```bash
npm run sync:meetings
```