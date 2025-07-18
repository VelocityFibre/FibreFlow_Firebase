const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Test function to verify database access
exports.testAgentDatabase = functions.https.onCall(async (data) => {
  try {
    console.log('Testing agent database access...');
    
    // Test 1: Can we access Firestore?
    const db = admin.firestore();
    console.log('Firestore initialized');
    
    // Test 2: Can we query projects?
    const projectsSnapshot = await db.collection('projects').limit(5).get();
    console.log(`Found ${projectsSnapshot.size} projects`);
    
    // Test 3: Look for Law-001 specifically
    const lawleySnapshot = await db.collection('projects')
      .where('projectCode', '==', 'Law-001')
      .limit(1)
      .get();
    
    let lawleyData = null;
    if (!lawleySnapshot.empty) {
      const project = lawleySnapshot.docs[0].data();
      const projectId = lawleySnapshot.docs[0].id;
      
      // Get pole count
      const polesSnapshot = await db.collection('planned-poles')
        .where('projectId', '==', projectId)
        .get();
      
      lawleyData = {
        projectId,
        projectName: project.name,
        projectCode: 'Law-001',
        poleCount: polesSnapshot.size
      };
    }
    
    // Test 4: Check if Anthropic API key exists
    const hasApiKey = !!(functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY);
    
    return {
      success: true,
      tests: {
        firestoreAccess: true,
        projectsFound: projectsSnapshot.size,
        lawleyProject: lawleyData,
        anthropicApiKey: hasApiKey
      }
    };
    
  } catch (error) {
    console.error('Test database error:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
});