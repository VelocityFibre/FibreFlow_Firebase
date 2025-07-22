// Add this to your functions/index.js file

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const db = admin.firestore();

// API endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'OneMap Staging API',
    version: '1.0',
    documentation: 'https://github.com/yourusername/onemap-api-docs',
    endpoints: [
      'GET /summary - Overview statistics',
      'GET /records - List records (paginated)',
      'GET /records/:id - Get specific record',
      'POST /search - Search records',
      'GET /duplicates - Duplicate analysis',
      'GET /quality - Data quality report'
    ]
  });
});

// Summary endpoint
app.get('/summary', async (req, res) => {
  try {
    const snapshot = await db.collection('onemap-staging').get();
    const records = snapshot.docs.map(doc => doc.data());
    
    res.json({
      totalRecords: records.length,
      withPoles: records.filter(r => r.poleNumber).length,
      withAgents: records.filter(r => r.fieldAgent).length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export the API
exports.onemapStagingAPI = functions.https.onRequest(app);