const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
const db = admin.firestore();
const storage = admin.storage();

// Enable CORS and JSON parsing
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' })); // Larger limit for photo data

// Field app specific API keys
const FIELD_API_KEYS = [
  'field-app-dev-key-2025',
  'field-app-prod-key-2025-001',
  process.env.FIELD_API_KEY_1,
  process.env.FIELD_API_KEY_2
].filter(Boolean);

// Middleware for field app authentication
function authenticateFieldApp(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const deviceId = req.headers['x-device-id'];
  
  if (!apiKey || !FIELD_API_KEYS.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid field app API key required'
      }
    });
  }
  
  if (!deviceId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_DEVICE_ID',
        message: 'X-Device-ID header required for field apps'
      }
    });
  }
  
  req.apiKey = apiKey;
  req.deviceId = deviceId;
  next();
}

app.use(authenticateFieldApp);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'offline-field-app-api',
    timestamp: new Date().toISOString(),
    deviceId: req.deviceId
  });
});

// POST /api/v1/poles/capture - Single pole capture
app.post('/api/v1/poles/capture', async (req, res) => {
  try {
    const { pole, photos, offline_created_at } = req.body;
    
    // Validate required fields
    if (!pole || !pole.poleNumber || !pole.gps) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: pole.poleNumber, pole.gps'
        }
      });
    }
    
    const submissionId = `field_${req.deviceId}_${Date.now()}`;
    
    // Save to Firebase (atomic operation)
    const poleDoc = {
      submissionId,
      deviceId: req.deviceId,
      pole: {
        poleNumber: pole.poleNumber,
        projectId: pole.projectId || null,
        gps: {
          latitude: pole.gps.latitude,
          longitude: pole.gps.longitude,
          accuracy: pole.gps.accuracy || null,
          capturedAt: pole.gps.timestamp || offline_created_at
        },
        status: pole.status || 'captured',
        contractorId: pole.contractorId || null,
        notes: pole.notes || null
      },
      photos: photos || {},
      metadata: {
        apiKey: req.apiKey,
        deviceId: req.deviceId,
        offlineCreatedAt: offline_created_at || null,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        appVersion: req.headers['x-app-version'] || null
      },
      validation: {
        status: 'pending',
        autoValidation: null,
        manualReview: false
      },
      neonSync: {
        status: 'pending',
        syncedAt: null,
        neonId: null
      }
    };
    
    // Save to Firebase
    await db.collection('field_pole_captures').doc(submissionId).set(poleDoc);
    
    // Queue for Neon sync
    await db.collection('neon_sync_queue').add({
      collection: 'field_pole_captures',
      documentId: submissionId,
      action: 'sync_pole',
      priority: 'normal',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(201).json({
      success: true,
      data: {
        submissionId,
        status: 'captured',
        message: 'Pole captured successfully'
      }
    });
    
  } catch (error) {
    console.error('Capture error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CAPTURE_ERROR',
        message: 'Failed to capture pole data'
      }
    });
  }
});

// POST /api/v1/poles/batch - Batch sync for offline data
app.post('/api/v1/poles/batch', async (req, res) => {
  try {
    const { poles, syncBatchId } = req.body;
    
    if (!Array.isArray(poles) || poles.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BATCH',
          message: 'Poles array required'
        }
      });
    }
    
    if (poles.length > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BATCH_TOO_LARGE',
          message: 'Maximum 100 poles per batch'
        }
      });
    }
    
    const batchId = syncBatchId || `batch_${req.deviceId}_${Date.now()}`;
    const results = {
      successful: [],
      failed: []
    };
    
    // Process each pole
    const batch = db.batch();
    
    for (const [index, poleData] of poles.entries()) {
      try {
        const submissionId = `field_${req.deviceId}_${Date.now()}_${index}`;
        const docRef = db.collection('field_pole_captures').doc(submissionId);
        
        batch.set(docRef, {
          submissionId,
          deviceId: req.deviceId,
          batchId,
          pole: poleData.pole,
          photos: poleData.photos || {},
          metadata: {
            ...poleData.metadata,
            deviceId: req.deviceId,
            batchId,
            syncedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          validation: {
            status: 'pending',
            autoValidation: null
          },
          neonSync: {
            status: 'pending',
            syncedAt: null
          }
        });
        
        results.successful.push({
          index,
          submissionId,
          poleNumber: poleData.pole.poleNumber
        });
        
      } catch (error) {
        results.failed.push({
          index,
          poleNumber: poleData.pole?.poleNumber || 'unknown',
          error: error.message
        });
      }
    }
    
    // Commit batch
    if (results.successful.length > 0) {
      await batch.commit();
      
      // Queue batch for Neon sync
      await db.collection('neon_sync_queue').add({
        collection: 'field_pole_captures',
        batchId,
        action: 'sync_batch',
        documentCount: results.successful.length,
        priority: 'high',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.status(207).json({ // 207 Multi-Status
      success: results.failed.length === 0,
      data: {
        batchId,
        total: poles.length,
        successful: results.successful.length,
        failed: results.failed.length,
        results
      }
    });
    
  } catch (error) {
    console.error('Batch sync error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_ERROR',
        message: 'Failed to sync batch'
      }
    });
  }
});

// POST /api/v1/photos/upload - Upload photo and get URL
app.post('/api/v1/photos/upload', async (req, res) => {
  try {
    const { poleNumber, photoType, photoData, mimeType } = req.body;
    
    if (!poleNumber || !photoType || !photoData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PHOTO_DATA',
          message: 'Required: poleNumber, photoType, photoData'
        }
      });
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(photoData, 'base64');
    
    // Create filename
    const timestamp = Date.now();
    const filename = `poles/${poleNumber}/${photoType}_${timestamp}.jpg`;
    
    // Upload to Firebase Storage
    const bucket = storage.bucket();
    const file = bucket.file(filename);
    
    await file.save(buffer, {
      metadata: {
        contentType: mimeType || 'image/jpeg',
        metadata: {
          poleNumber,
          photoType,
          deviceId: req.deviceId,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    // Make file publicly accessible
    await file.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    
    res.json({
      success: true,
      data: {
        url: publicUrl,
        path: filename,
        photoType
      }
    });
    
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Failed to upload photo'
      }
    });
  }
});

// GET /api/v1/poles/status/:submissionId - Check submission status
app.get('/api/v1/poles/status/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const doc = await db.collection('field_pole_captures').doc(submissionId).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Submission not found'
        }
      });
    }
    
    const data = doc.data();
    
    res.json({
      success: true,
      data: {
        submissionId,
        poleNumber: data.pole.poleNumber,
        validationStatus: data.validation.status,
        neonSyncStatus: data.neonSync.status,
        capturedAt: data.metadata.offlineCreatedAt || data.metadata.syncedAt,
        deviceId: data.deviceId
      }
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to check status'
      }
    });
  }
});

// GET /api/v1/sync/pending - Get pending sync count for device
app.get('/api/v1/sync/pending', async (req, res) => {
  try {
    const pendingCount = await db.collection('field_pole_captures')
      .where('deviceId', '==', req.deviceId)
      .where('neonSync.status', '==', 'pending')
      .count()
      .get();
    
    res.json({
      success: true,
      data: {
        deviceId: req.deviceId,
        pendingCount: pendingCount.data().count,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Pending check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PENDING_ERROR',
        message: 'Failed to check pending syncs'
      }
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

exports.offlineFieldAppAPI = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300,
    invoker: 'public'
  })
  .https.onRequest(app);