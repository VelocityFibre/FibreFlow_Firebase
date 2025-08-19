const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize admin SDK - let Firebase handle the credentials
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

const app = express();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());

// API token for simple authentication
const API_TOKEN = 'fibreflow-pole-analytics-2025';

// Middleware to check API token
function checkApiToken(req, res, next) {
  const token = req.headers['x-api-token'] || req.query.token;
  
  if (token !== API_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API token'
    });
  }
  
  next();
}

// Apply token check to all routes
app.use(checkApiToken);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'pole-analytics-working',
    timestamp: new Date().toISOString(),
    adminInitialized: admin.apps.length > 0
  });
});

// Test Firestore access
app.get('/test-firestore', async (req, res) => {
  try {
    console.log('Testing Firestore access...');
    
    // Try to get Firestore instance
    const db = admin.firestore();
    console.log('Firestore instance obtained');
    
    // Try to access a collection
    const testCollection = db.collection('test-access');
    console.log('Collection reference obtained');
    
    // Try to write a test document
    const testDoc = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Testing Firestore access from pole analytics'
    };
    
    const writeResult = await testCollection.add(testDoc);
    console.log('Write successful:', writeResult.id);
    
    // Try to read it back
    const readResult = await testCollection.doc(writeResult.id).get();
    console.log('Read successful:', readResult.exists);
    
    // Clean up - delete test document
    await testCollection.doc(writeResult.id).delete();
    console.log('Cleanup successful');
    
    res.json({
      success: true,
      message: 'Firestore access working!',
      operations: {
        write: 'success',
        read: 'success',
        delete: 'success'
      }
    });
    
  } catch (error) {
    console.error('Firestore test error:', error);
    res.status(500).json({
      success: false,
      error: 'Firestore access failed',
      message: error.message,
      code: error.code,
      details: error.details || 'No additional details'
    });
  }
});

// Get pole data with better error handling
app.get('/poles', async (req, res) => {
  try {
    console.log('Accessing poles data...');
    const db = admin.firestore();
    
    // First, let's check what collections we can see
    const collections = await db.listCollections();
    console.log('Available collections:', collections.map(c => c.id));
    
    // Try different collection names
    const collectionNames = ['planned-poles', 'plannedPoles', 'poles'];
    let polesCollection = null;
    let collectionName = null;
    
    for (const name of collectionNames) {
      try {
        const testQuery = await db.collection(name).limit(1).get();
        if (testQuery.size >= 0) { // Even empty collections return size 0
          polesCollection = db.collection(name);
          collectionName = name;
          console.log(`Found collection: ${name}`);
          break;
        }
      } catch (e) {
        console.log(`Collection ${name} not accessible`);
      }
    }
    
    if (!polesCollection) {
      return res.status(404).json({
        success: false,
        error: 'No poles collection found',
        availableCollections: collections.map(c => c.id)
      });
    }
    
    // Get count
    const countSnapshot = await polesCollection.count().get();
    const totalPoles = countSnapshot.data().count;
    
    // Get sample data
    const sampleSnapshot = await polesCollection.limit(10).get();
    const sampleData = sampleSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      collectionName,
      totalPoles,
      sampleSize: sampleData.length,
      sampleData
    });
    
  } catch (error) {
    console.error('Poles access error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to access poles data',
      message: error.message,
      code: error.code
    });
  }
});

// Export as Firebase Function
exports.poleAnalyticsWorking = functions
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60
  })
  .https
  .onRequest(app);