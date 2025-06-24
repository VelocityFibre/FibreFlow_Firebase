# FibreFlow Cloud Functions - Comprehensive Audit Trail

This directory contains Cloud Functions that automatically track ALL changes to your Firestore database.

## How it Works

1. **Automatic Tracking**: Every create, update, and delete operation in tracked collections is automatically logged
2. **Zero Client Code Changes**: No need to modify any existing services
3. **Displays in App**: Audit logs appear in your existing audit trail page at `/audit-trail`
4. **User Attribution**: Attempts to extract user info from document fields (updatedBy, createdBy, etc.)

## Setup Instructions

1. **Install dependencies**:
   ```bash
   cd functions
   npm install
   ```

2. **Deploy the functions**:
   ```bash
   firebase deploy --only functions
   ```

3. **Test the deployment**:
   - Visit: https://us-central1-fibreflow-73daf.cloudfunctions.net/testAuditSystem
   - This creates a test audit log entry
   - Check your audit trail page to see it

## Tracked Collections

The following collections are automatically tracked:
- projects
- tasks
- clients
- suppliers
- contractors
- staff
- stock & stockMovements
- materials
- boq & boqItems
- quotes & rfqs
- phases
- steps
- roles
- emailLogs
- contractor-projects
- daily-progress & daily-kpis

## Adding More Collections

To track additional collections, edit `index.js`:

1. Add the collection name to `TRACKED_COLLECTIONS` array
2. Add mapping to `COLLECTION_TO_ENTITY_MAP` object
3. Redeploy functions

## Important Notes

- Cloud Functions have a cold start delay (first invocation may take 1-2 seconds)
- Audit logs created by functions will have `metadata.cloudFunction = true`
- The system uses `eventId` to prevent duplicate logs
- Failed operations are not tracked (only successful writes)

## Cost Considerations

Each Firestore write triggers a function invocation. With high-volume operations:
- Consider implementing sampling (e.g., only log 10% of reads)
- Monitor your Firebase billing
- Use Firebase's budget alerts

## Viewing Logs

All audit logs (both client-side and Cloud Function generated) appear in:
- **Your App**: https://fibreflow-73daf.web.app/audit-trail
- **Firebase Console**: Firestore > audit-logs collection