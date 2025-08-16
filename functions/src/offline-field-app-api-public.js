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

// Enable CORS and JSON parsing - ALLOW ALL ORIGINS FOR PUBLIC ACCESS
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

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
    service: 'offline-field-app-api-public',
    timestamp: new Date().toISOString(),
    deviceId: req.deviceId,
    publicAccess: true
  });
});

// Copy all the routes from the original file
// ... (routes would be copied here)

// Export as a PUBLIC function with explicit CORS handling
exports.offlineFieldAppAPIPublic = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 540,
    // Explicitly allow unauthenticated access
    invoker: 'allUsers'
  })
  .https
  .onRequest((req, res) => {
    // Add CORS headers explicitly
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Device-ID');
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    return app(req, res);
  });