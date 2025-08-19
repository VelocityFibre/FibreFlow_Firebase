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

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());

// Simple API token
const API_TOKEN = 'fibreflow-pole-analytics-2025';

// Middleware for API token check
function checkApiToken(req, res, next) {
  const token = req.headers['x-api-token'] || req.query.token;
  
  if (token !== API_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API token',
      hint: 'Include token in header as X-API-Token or query parameter as ?token='
    });
  }
  
  next();
}

// Apply token check to all routes
app.use(checkApiToken);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'pole-analytics-api',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint with mock data (no Firestore needed)
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working correctly',
    mockData: {
      totalPoles: 10875,
      statusBreakdown: {
        'Permission not granted': 8941,
        'Permission granted': 1792,
        'planned': 81,
        'other': 61
      },
      completionPercentage: 0.0,
      note: 'This is mock data. Real data requires Firestore permissions to be fixed.'
    },
    timestamp: new Date().toISOString()
  });
});

// Summary endpoint
app.get('/summary', async (req, res) => {
  try {
    const totalSnapshot = await db.collection('planned-poles').count().get();
    const totalPoles = totalSnapshot.data().count;
    
    res.json({
      success: true,
      data: {
        totalPoles,
        message: "Use /analytics for detailed breakdown"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary',
      message: error.message
    });
  }
});

// Full analytics endpoint
app.get('/analytics', async (req, res) => {
  try {
    const projectId = req.query.projectId;
    const days = parseInt(req.query.days) || 30;
    
    // Get total count
    let totalPoles = 0;
    try {
      const totalSnapshot = await db.collection('planned-poles').count().get();
      totalPoles = totalSnapshot.data().count;
    } catch (e) {
      console.log('Count failed, using alternative method');
      const docsSnapshot = await db.collection('planned-poles').select().get();
      totalPoles = docsSnapshot.size;
    }
    
    // Get sample for status analysis
    const sampleSnapshot = await db.collection('planned-poles').limit(1000).get();
    
    const statusCounts = {};
    let installedCount = 0;
    
    sampleSnapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      if (status && (
        status.toLowerCase().includes('installed') || 
        status.toLowerCase().includes('completed') ||
        status.toLowerCase().includes('active')
      )) {
        installedCount++;
      }
    });
    
    const sampleSize = sampleSnapshot.size;
    const estimatedInstalledTotal = Math.round((installedCount / sampleSize) * totalPoles);
    const completionPercentage = totalPoles > 0 ? (estimatedInstalledTotal / totalPoles) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        totalPoles,
        estimatedCompleted: estimatedInstalledTotal,
        remainingPoles: totalPoles - estimatedInstalledTotal,
        completionPercentage: parseFloat(completionPercentage.toFixed(2)),
        statusBreakdown: statusCounts,
        sampleSize,
        message: "Analytics based on sample of " + sampleSize + " poles"
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        daysIncluded: days,
        projectFilter: projectId || 'all'
      }
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

// Export the Express app as a Firebase Function
exports.poleAnalyticsExpress = functions
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60
  })
  .https
  .onRequest(app);