const admin = require('firebase-admin');

// Initialize Firebase Admin
// Note: You'll need to provide the service account key
// const serviceAccount = require('../functions/service-account-key.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://fibreflow-73daf.firebaseio.com"
// });

// For now, let's create a script that shows what needs to be done
console.log(`
To delete all KPIs for the louistest project, you need to:

1. Go to Firebase Console: https://console.firebase.google.com/project/fibreflow-73daf/firestore/data

2. Navigate to: projects > [louistest project ID] > daily-kpis

3. Delete all documents in the daily-kpis subcollection

Alternatively, you can run this script with Firebase Admin SDK:

const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteAllKPIsForLouistest() {
  // First find the louistest project
  const projectsSnapshot = await db.collection('projects')
    .where('name', '==', 'louistest')
    .limit(1)
    .get();

  if (projectsSnapshot.empty) {
    console.log('No louistest project found');
    return;
  }

  const projectId = projectsSnapshot.docs[0].id;
  console.log('Found louistest project:', projectId);

  // Get all KPIs for this project
  const kpisSnapshot = await db.collection('projects')
    .doc(projectId)
    .collection('daily-kpis')
    .get();

  console.log('Found', kpisSnapshot.size, 'KPIs to delete');

  // Delete each KPI
  const batch = db.batch();
  kpisSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log('All KPIs deleted successfully');
}

deleteAllKPIsForLouistest();
`);