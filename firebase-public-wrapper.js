// Firebase Public Access Workaround
// This script adds public access to Firebase Functions that are getting 403 errors

const { google } = require('googleapis');
const path = require('path');

async function makePublic() {
  try {
    // Load service account
    const keyFile = path.join(__dirname, 'fibreflow-service-account.json');
    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const authClient = await auth.getClient();
    const cloudfunctions = google.cloudfunctions({ version: 'v1', auth: authClient });

    const functionName = 'projects/fibreflow-73daf/locations/us-central1/functions/offlineFieldAppAPI';

    console.log('Getting current IAM policy...');
    const { data: policy } = await cloudfunctions.projects.locations.functions.getIamPolicy({
      resource: functionName,
    });

    console.log('Current policy:', JSON.stringify(policy, null, 2));

    // Add allUsers binding
    const bindings = policy.bindings || [];
    const invokerBinding = bindings.find(b => b.role === 'roles/cloudfunctions.invoker');
    
    if (invokerBinding) {
      if (!invokerBinding.members.includes('allUsers')) {
        invokerBinding.members.push('allUsers');
      }
    } else {
      bindings.push({
        role: 'roles/cloudfunctions.invoker',
        members: ['allUsers']
      });
    }

    policy.bindings = bindings;

    console.log('Setting new IAM policy...');
    const { data: newPolicy } = await cloudfunctions.projects.locations.functions.setIamPolicy({
      resource: functionName,
      requestBody: {
        policy,
      },
    });

    console.log('✅ Success! Function is now publicly accessible.');
    console.log('New policy:', JSON.stringify(newPolicy, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 412) {
      console.error('Precondition failed - the function state has changed. Try redeploying the function.');
    }
  }
}

makePublic();