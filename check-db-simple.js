console.log(`
===========================================
Checking Firestore Database for Meetings
===========================================

To check what meetings are currently in your database:

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your FibreFlow project (fibreflow-73daf)
3. Click on "Firestore Database" in the left menu
4. Look for the "meetings" collection

If the collection exists:
- Click on it to see all documents
- Each document represents a meeting
- You can see the fields like title, dateTime, participants, etc.

If the collection doesn't exist:
- It means no meetings have been synced yet
- The database is empty

Based on our previous attempts:
- The sync function has been failing due to CORS issues
- No meetings have been successfully stored yet
- The meetings collection is likely empty or doesn't exist

Once you click "Sync Meetings" in the app and it succeeds,
the meetings will appear in this collection.
`);