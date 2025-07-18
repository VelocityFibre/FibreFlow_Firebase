#!/usr/bin/env node

/**
 * Make Firebase Functions publicly accessible
 * This sets the IAM policy to allow allUsers to invoke the functions
 */

const admin = require('firebase-admin');
const { google } = require('googleapis');

// Initialize admin SDK
const serviceAccount = require('../fibreflow-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

// List of functions to make public
const ORCHESTRATOR_FUNCTIONS = [
  'orchestratorChat',
  'orchestratorDataQuery',
  'orchestratorHealth',
  'orchestratorAsk',
  'testOrchestrator',
  'claudeChat',
  'searchPatterns',
  'storePattern',
  'searchContext',
  'getConversations'
];

async function makeFunctionsPublic() {
  try {
    console.log('🔓 Making Firebase Functions publicly accessible...\n');

    // Get auth client
    const auth = new google.auth.GoogleAuth({
      keyFile: './fibreflow-service-account.json',
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const authClient = await auth.getClient();
    const projectId = 'fibreflow-73daf';
    const location = 'us-central1';

    // Cloud Functions API
    const cloudfunctions = google.cloudfunctions({
      version: 'v1',
      auth: authClient
    });

    for (const functionName of ORCHESTRATOR_FUNCTIONS) {
      try {
        const name = `projects/${projectId}/locations/${location}/functions/${functionName}`;
        
        console.log(`Setting public access for: ${functionName}`);
        
        // Set IAM policy to allow allUsers
        await cloudfunctions.projects.locations.functions.setIamPolicy({
          resource: name,
          requestBody: {
            policy: {
              bindings: [
                {
                  role: 'roles/cloudfunctions.invoker',
                  members: ['allUsers']
                }
              ]
            }
          }
        });

        console.log(`✅ ${functionName} is now publicly accessible`);
      } catch (error) {
        console.error(`❌ Failed to set policy for ${functionName}:`, error.message);
      }
    }

    console.log('\n✨ All orchestrator functions should now be publicly accessible!');
    console.log('\nTest with:');
    console.log('curl https://us-central1-fibreflow-73daf.cloudfunctions.net/testOrchestrator');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check if we have the required dependencies
try {
  require('googleapis');
} catch (error) {
  console.error('Missing required package. Please run:');
  console.error('npm install googleapis');
  process.exit(1);
}

makeFunctionsPublic();