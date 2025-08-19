const admin = require('firebase-admin');

// Initialize admin with explicit project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

/**
 * Public API endpoint for pole analytics
 * This is a simplified version that's guaranteed to work publicly
 */
exports.poleAnalyticsPublic = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const db = admin.firestore();
    
    // Get query parameters
    const projectId = req.query.projectId;
    const days = parseInt(req.query.days) || 30;
    
    // Get total count - use a simple query instead of count
    let totalPoles = 0;
    try {
      const totalSnapshot = await db.collection('planned-poles').count().get();
      totalPoles = totalSnapshot.data().count;
    } catch (countError) {
      console.log('Count failed, trying alternative method');
      // If count fails, try getting docs
      const docsSnapshot = await db.collection('planned-poles').select().get();
      totalPoles = docsSnapshot.size;
    }
    
    // Get a sample of poles to analyze statuses
    const sampleSnapshot = await db.collection('planned-poles').limit(1000).get();
    
    // Count statuses
    const statusCounts = {};
    let installedCount = 0;
    
    sampleSnapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Check if this is considered "installed" based on the status text
      if (status && (
        status.toLowerCase().includes('installed') || 
        status.toLowerCase().includes('completed') ||
        status.toLowerCase().includes('active')
      )) {
        installedCount++;
      }
    });
    
    // Calculate completion percentage based on sample
    const sampleSize = sampleSnapshot.size;
    const estimatedInstalledTotal = Math.round((installedCount / sampleSize) * totalPoles);
    const completionPercentage = totalPoles > 0 ? (estimatedInstalledTotal / totalPoles) * 100 : 0;
    
    // Prepare response
    const response = {
      success: true,
      data: {
        totalPoles,
        estimatedCompleted: estimatedInstalledTotal,
        remainingPoles: totalPoles - estimatedInstalledTotal,
        completionPercentage: parseFloat(completionPercentage.toFixed(2)),
        statusBreakdown: statusCounts,
        sampleSize,
        message: "Note: Status values in the database are different from expected enum values"
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        daysIncluded: days,
        projectFilter: projectId || 'all'
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Pole analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pole analytics',
      message: error.message || 'Unknown error'
    });
  }
};

/**
 * Simple summary endpoint
 */
exports.poleAnalyticsSummaryPublic = async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const db = admin.firestore();
    
    // Get total count
    const totalSnapshot = await db.collection('planned-poles').count().get();
    const totalPoles = totalSnapshot.data().count;
    
    res.status(200).json({
      success: true,
      data: {
        totalPoles,
        message: "Detailed analytics available at /poleAnalyticsPublic endpoint"
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary',
      message: error.message || 'Unknown error'
    });
  }
};