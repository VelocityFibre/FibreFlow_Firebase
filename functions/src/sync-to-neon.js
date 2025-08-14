const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Pool } = require('pg');
const { logger } = require('firebase-functions/v2');

// Initialize Neon connection pool
const pool = new Pool({
  host: functions.config().neon?.host || process.env.NEON_HOST,
  database: functions.config().neon?.database || process.env.NEON_DATABASE,
  user: functions.config().neon?.user || process.env.NEON_USER,
  password: functions.config().neon?.password || process.env.NEON_PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  },
  max: 3, // Keep pool small for Functions
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Collections to sync
const SYNC_COLLECTIONS = [
  'status_changes',
  'projects',
  'planned-poles',
  'pole-installations',
  'contractors',
  'staff',
  'daily-kpis',
  'dailyProgress',
  'meetings',
  'action-items',
  'boqItems',
  'stockItems',
  'stockMovements'
];

// Helper function to safely extract document data
function extractDocumentData(snapshot) {
  if (!snapshot.exists) {
    return null;
  }
  
  const data = snapshot.data();
  const extracted = {};
  
  // Convert Firestore timestamps to ISO strings
  Object.keys(data).forEach(key => {
    if (data[key] && typeof data[key].toDate === 'function') {
      extracted[key] = data[key].toDate().toISOString();
    } else if (data[key] !== undefined) {
      extracted[key] = data[key];
    }
  });
  
  return extracted;
}

// Generic sync function for all collections
const syncToNeon = functions.firestore
  .document('{collection}/{documentId}')
  .onWrite(async (change, context) => {
    const { collection, documentId } = context.params;
    
    // Only sync specified collections
    if (!SYNC_COLLECTIONS.includes(collection)) {
      return null;
    }
    
    const client = await pool.connect();
    
    try {
      // Determine operation type
      let operation = 'update';
      if (!change.before.exists && change.after.exists) {
        operation = 'create';
      } else if (change.before.exists && !change.after.exists) {
        operation = 'delete';
      }
      
      // Extract data
      const data = extractDocumentData(change.after);
      const previousData = extractDocumentData(change.before);
      
      // Insert event into Neon
      const query = `
        INSERT INTO firebase_events (
          collection,
          document_id,
          operation,
          data,
          previous_data,
          timestamp,
          sync_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        ON CONFLICT (collection, document_id, timestamp) DO NOTHING
      `;
      
      const timestamp = context.timestamp;
      
      await client.query(query, [
        collection,
        documentId,
        operation,
        JSON.stringify(data),
        JSON.stringify(previousData),
        timestamp
      ]);
      
      console.log(`Synced ${collection}/${documentId} - ${operation}`);
      
      // For delete operations, also update the latest state
      if (operation === 'delete') {
        await client.query(`
          UPDATE firebase_current_state 
          SET deleted = true, 
              deleted_at = CURRENT_TIMESTAMP,
              data = $3
          WHERE collection = $1 AND document_id = $2
        `, [collection, documentId, JSON.stringify(previousData)]);
      } else {
        // Upsert current state for quick lookups
        await client.query(`
          INSERT INTO firebase_current_state (
            collection,
            document_id,
            data,
            last_updated
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (collection, document_id) 
          DO UPDATE SET 
            data = EXCLUDED.data,
            last_updated = CURRENT_TIMESTAMP,
            deleted = false,
            deleted_at = null
        `, [collection, documentId, JSON.stringify(data)]);
      }
      
      return null;
    } catch (error) {
      console.error('Sync to Neon failed:', error);
      
      // Store failed sync for retry
      try {
        await client.query(`
          INSERT INTO sync_failures (
            collection,
            document_id,
            operation,
            error_message,
            retry_count,
            created_at
          ) VALUES ($1, $2, $3, $4, 0, CURRENT_TIMESTAMP)
        `, [
          collection,
          documentId,
          change.after.exists ? 'write' : 'delete',
          error instanceof Error ? error.message : 'Unknown error'
        ]);
      } catch (failureError) {
        console.error('Failed to log sync failure:', failureError);
      }
      
      throw error;
    } finally {
      client.release();
    }
  });

// Scheduled function to retry failed syncs
const retryFailedSyncs = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const client = await pool.connect();
    
    try {
      // Get failed syncs to retry
      const result = await client.query(`
        SELECT * FROM sync_failures 
        WHERE retry_count < 3 
        AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at ASC
        LIMIT 100
      `);
      
      for (const failure of result.rows) {
        try {
          // Attempt to get current data from Firestore
          const db = admin.firestore();
          const doc = await db.collection(failure.collection).doc(failure.document_id).get();
          
          if (doc.exists || failure.operation === 'delete') {
            const data = extractDocumentData(doc);
            
            // Retry the sync
            await client.query(`
              INSERT INTO firebase_events (
                collection,
                document_id,
                operation,
                data,
                timestamp,
                sync_timestamp
              ) VALUES ($1, $2, $3, $4, NOW(), CURRENT_TIMESTAMP)
            `, [
              failure.collection,
              failure.document_id,
              doc.exists ? 'update' : 'delete',
              JSON.stringify(data)
            ]);
            
            // Remove from failures
            await client.query(
              'DELETE FROM sync_failures WHERE id = $1',
              [failure.id]
            );
            
            console.log(`Successfully retried sync for ${failure.collection}/${failure.document_id}`);
          }
        } catch (retryError) {
          // Increment retry count
          await client.query(
            'UPDATE sync_failures SET retry_count = retry_count + 1 WHERE id = $1',
            [failure.id]
          );
          console.error(`Retry failed for ${failure.collection}/${failure.document_id}:`, retryError);
        }
      }
    } catch (error) {
      console.error('Failed to process sync retries:', error);
    } finally {
      client.release();
    }
  });

// Health check endpoint
const syncHealthCheck = functions.https.onRequest(async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Check sync status
    const result = await client.query(`
      SELECT 
        collection,
        COUNT(*) as total_events,
        MAX(sync_timestamp) as last_sync,
        COUNT(DISTINCT document_id) as unique_documents
      FROM firebase_events
      WHERE sync_timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY collection
      ORDER BY collection
    `);
    
    // Check failures
    const failures = await client.query(`
      SELECT 
        collection,
        COUNT(*) as failure_count,
        MAX(created_at) as last_failure
      FROM sync_failures
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY collection
    `);
    
    res.json({
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      collections: result.rows,
      failures: failures.rows,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
});

module.exports = {
  syncToNeon,
  retryFailedSyncs,
  syncHealthCheck
};