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

// Enable CORS and JSON parsing
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// API key middleware
const API_KEYS = [
  'dev-api-key-12345',
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  'fibreflow-api-key-2025-prod-001',
  'fibreflow-api-key-2025-ext-001'
].filter(Boolean);

function checkApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid API key required'
      }
    });
  }
  
  req.apiKey = apiKey;
  next();
}

app.use(checkApiKey);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'staging-api',
    timestamp: new Date().toISOString()
  });
});

// POST /api/v1/submit/pole
app.post('/api/v1/submit/pole', async (req, res) => {
  try {
    const { data, metadata = {} } = req.body;
    
    // Basic validation
    if (!data || !data.poleNumber || !data.gps) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: poleNumber, gps'
        }
      });
    }
    
    // Create staging document
    const submissionId = `stg_pole_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stagingDoc = {
      id: submissionId,
      type: 'pole',
      status: 'pending_validation',
      data: {
        ...data,
        submittedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      metadata: {
        ...metadata,
        apiKey: req.apiKey,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      },
      validation: {
        validated: false,
        validatedAt: null,
        validatedBy: null,
        autoApprove: false
      }
    };
    
    // Save to staging collection
    await db.collection('staging_submissions').doc(submissionId).set(stagingDoc);
    
    res.status(201).json({
      success: true,
      data: {
        submissionId,
        status: 'pending_validation',
        message: 'Pole data submitted for validation'
      }
    });
    
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBMISSION_ERROR',
        message: 'Failed to submit pole data'
      }
    });
  }
});

// GET /api/v1/status/:submissionId
app.get('/api/v1/status/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const doc = await db.collection('staging_submissions').doc(submissionId).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Submission not found'
        }
      });
    }
    
    const submission = doc.data();
    
    res.json({
      success: true,
      data: {
        submissionId,
        status: submission.status,
        type: submission.type,
        submittedAt: submission.metadata.submittedAt,
        validation: submission.validation
      }
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to check submission status'
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

exports.stagingAPI = functions.https.onRequest(app);