/**
 * Open API endpoints for pole analytics - no authentication required
 * These functions are designed to be publicly accessible
 */

const admin = require('firebase-admin');

// Ensure admin is initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

/**
 * Open pole analytics endpoint
 * URL: /poleAnalyticsOpen
 */
exports.handler = async (req, res) => {
  // Enable CORS for all origins
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('Pole analytics open endpoint called');
    
    const db = admin.firestore();
    const projectId = req.query.projectId;
    const days = parseInt(req.query.days) || 30;
    
    // Simple test response first
    const testResponse = {
      success: true,
      message: 'Pole Analytics API is working',
      timestamp: new Date().toISOString(),
      queryParams: {
        projectId: projectId || 'all',
        days: days
      }
    };

    // Try to get pole count
    try {
      const polesCollection = db.collection('planned-poles');
      const snapshot = await polesCollection.limit(10).get();
      
      testResponse.sampleData = {
        documentsFound: snapshot.size,
        collectionAccess: 'successful'
      };

      // Try to get total count
      const countSnapshot = await polesCollection.count().get();
      testResponse.totalPoles = countSnapshot.data().count;
      
    } catch (dbError) {
      console.error('Database access error:', dbError);
      testResponse.dbError = dbError.message;
      testResponse.dbAccessNote = 'Database access failed - check Firestore permissions';
    }

    res.status(200).json(testResponse);

  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};