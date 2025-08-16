const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { neon } = require('@neondatabase/serverless');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Neon connection
const connectionString = process.env.NEON_CONNECTION_STRING || 
                        functions.config().neon?.connection_string ||
                        'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

// Sync field captures to Neon every 5 minutes
exports.syncFieldCapturesToNeon = functions
  .runWith({
    memory: '512MB',
    timeoutSeconds: 300
  })
  .pubsub.schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('Starting Neon sync for field captures...');
    
    try {
      // Get pending sync items
      const pendingSnapshot = await db.collection('neon_sync_queue')
        .where('action', 'in', ['sync_pole', 'sync_batch'])
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get();
      
      console.log(`Found ${pendingSnapshot.size} items to sync`);
      
      for (const queueDoc of pendingSnapshot.docs) {
        const queueItem = queueDoc.data();
        
        try {
          if (queueItem.action === 'sync_pole') {
            await syncSinglePole(queueItem.documentId);
          } else if (queueItem.action === 'sync_batch') {
            await syncBatch(queueItem.batchId);
          }
          
          // Mark as processed
          await queueDoc.ref.delete();
          
        } catch (error) {
          console.error(`Error syncing ${queueItem.documentId}:`, error);
          
          // Update error count
          const errorCount = (queueItem.errorCount || 0) + 1;
          
          if (errorCount >= 3) {
            // Move to dead letter queue
            await db.collection('sync_dead_letter_queue').add({
              ...queueItem,
              lastError: error.message,
              movedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await queueDoc.ref.delete();
          } else {
            // Retry later
            await queueDoc.ref.update({
              errorCount,
              lastError: error.message,
              lastAttempt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }
      
      console.log('Neon sync completed');
      return null;
      
    } catch (error) {
      console.error('Sync worker error:', error);
      throw error;
    }
  });

async function syncSinglePole(documentId) {
  // Get pole data from Firebase
  const poleDoc = await db.collection('field_pole_captures').doc(documentId).get();
  
  if (!poleDoc.exists) {
    throw new Error(`Document ${documentId} not found`);
  }
  
  const data = poleDoc.data();
  
  // Insert into Neon staging table
  const result = await sql`
    INSERT INTO staging_poles (
      submission_id,
      pole_number,
      project_id,
      gps_latitude,
      gps_longitude,
      gps_accuracy,
      status,
      contractor_id,
      notes,
      photo_urls,
      device_id,
      offline_created_at,
      api_key,
      validation_status
    ) VALUES (
      ${data.submissionId},
      ${data.pole.poleNumber},
      ${data.pole.projectId},
      ${data.pole.gps.latitude},
      ${data.pole.gps.longitude},
      ${data.pole.gps.accuracy},
      ${data.pole.status},
      ${data.pole.contractorId},
      ${data.pole.notes},
      ${JSON.stringify(data.photos)},
      ${data.deviceId},
      ${data.metadata.offlineCreatedAt || new Date()},
      ${data.metadata.apiKey},
      'pending'
    )
    ON CONFLICT (submission_id) DO UPDATE
    SET 
      gps_latitude = EXCLUDED.gps_latitude,
      gps_longitude = EXCLUDED.gps_longitude,
      photo_urls = EXCLUDED.photo_urls,
      notes = EXCLUDED.notes
    RETURNING id
  `;
  
  if (result.length > 0) {
    // Update Firebase doc with Neon ID
    await poleDoc.ref.update({
      'neonSync.status': 'synced',
      'neonSync.syncedAt': admin.firestore.FieldValue.serverTimestamp(),
      'neonSync.neonId': result[0].id
    });
    
    console.log(`Synced pole ${data.pole.poleNumber} to Neon with ID ${result[0].id}`);
  }
}

async function syncBatch(batchId) {
  // Get all poles in batch
  const batchSnapshot = await db.collection('field_pole_captures')
    .where('batchId', '==', batchId)
    .where('neonSync.status', '==', 'pending')
    .get();
  
  console.log(`Syncing batch ${batchId} with ${batchSnapshot.size} poles`);
  
  for (const doc of batchSnapshot.docs) {
    await syncSinglePole(doc.id);
  }
}