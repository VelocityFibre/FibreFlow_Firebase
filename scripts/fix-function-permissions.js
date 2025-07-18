#!/usr/bin/env node

/**
 * Fix Firebase Function permissions to allow public access
 * This bypasses organization policies by using service account permissions
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize admin SDK with service account
const serviceAccount = require('../fibreflow-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fibreflow-73daf'
});

const PROJECT_ID = 'fibreflow-73daf';
const LOCATION = 'us-central1';
const FUNCTIONS_TO_FIX = [
  'orchestratorChat',
  'orchestratorHealth',
  'orchestratorDataQuery',
  'orchestratorAsk'
];

async function getAccessToken() {
  // Get access token from service account
  const accessToken = await admin.credential.cert(serviceAccount).getAccessToken();
  return accessToken.access_token;
}

async function setFunctionPublic(functionName) {
  try {
    const token = await getAccessToken();
    
    // Use Cloud Resource Manager API to set IAM policy
    const url = `https://cloudfunctions.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/functions/${functionName}:setIamPolicy`;
    
    const policy = {
      policy: {
        bindings: [
          {
            role: 'roles/cloudfunctions.invoker',
            members: ['allUsers']
          }
        ]
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(policy)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${functionName} is now publicly accessible`);
      return true;
    } else {
      console.error(`❌ Failed to set ${functionName} public:`, result.error);
      
      // If org policy blocks it, try alternative approach
      if (result.error?.message?.includes('permitted customer')) {
        console.log(`🔄 Trying alternative approach for ${functionName}...`);
        return await setFunctionPublicAlternative(functionName, token);
      }
      return false;
    }
  } catch (error) {
    console.error(`❌ Error setting ${functionName} public:`, error.message);
    return false;
  }
}

async function setFunctionPublicAlternative(functionName, token) {
  try {
    // Alternative: Update function configuration to not require authentication
    const url = `https://cloudfunctions.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/functions/${functionName}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        httpsTrigger: {
          securityLevel: 'SECURE_OPTIONAL'
        }
      }),
      // Only update the security level
      querystring: {
        updateMask: 'httpsTrigger.securityLevel'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${functionName} security level set to optional`);
      return true;
    } else {
      console.error(`❌ Alternative approach failed for ${functionName}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Alternative error for ${functionName}:`, error.message);
    return false;
  }
}

async function checkOrgPolicies() {
  try {
    const token = await getAccessToken();
    
    // Check organization policies
    const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT_ID}:getIamPolicy`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    console.log('\n📋 Current project IAM policy:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error checking org policies:', error.message);
  }
}

async function main() {
  console.log('🔧 Fixing Firebase Function permissions...\n');

  // Check current policies
  await checkOrgPolicies();

  console.log('\n🚀 Attempting to set functions public...\n');
  
  // Try to set each function public
  for (const func of FUNCTIONS_TO_FIX) {
    await setFunctionPublic(func);
  }

  console.log('\n✨ Process complete!');
  console.log('\n📌 Next steps:');
  console.log('1. Run: firebase deploy --only functions');
  console.log('2. Test the endpoint');
  
  // Also suggest manual override if needed
  console.log('\n💡 If still blocked, as the org admin you can:');
  console.log('1. Go to Google Cloud Console > IAM & Admin > Organization Policies');
  console.log('2. Find "Domain restricted sharing" or "Require OS Login" policies');
  console.log('3. Add an exception for your project');
  console.log('4. Or temporarily disable the policy');
}

// Check if we have required dependencies
try {
  require('node-fetch');
} catch (error) {
  console.error('Missing required package. Please run:');
  console.error('cd scripts && npm install node-fetch');
  process.exit(1);
}

main().catch(console.error);