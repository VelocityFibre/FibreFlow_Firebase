/**
 * Webhook-style API for pole analytics
 * This bypasses Firebase Functions authentication by using a simple token check
 */

const admin = require('firebase-admin');

// Ensure admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Simple token for API access (can be shared with Lew's team)
const API_TOKEN = 'fibreflow-pole-analytics-2025';

/**
 * Main webhook handler
 */
exports.webhook = async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Token');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Check API token
  const token = req.headers['x-api-token'] || req.query.token;
  if (token !== API_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API token',
      hint: 'Include token in header as X-API-Token or query parameter as ?token='
    });
  }

  try {
    const db = admin.firestore();
    const endpoint = req.query.endpoint || 'analytics';
    
    if (endpoint === 'summary') {
      // Simple summary endpoint
      const totalSnapshot = await db.collection('planned-poles').count().get();
      const totalPoles = totalSnapshot.data().count;
      
      return res.status(200).json({
        success: true,
        data: {
          totalPoles,
          message: "Use endpoint=analytics for detailed breakdown"
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Full analytics endpoint
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
    
    res.status(200).json({
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
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
};