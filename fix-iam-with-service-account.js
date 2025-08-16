const { exec } = require('child_process');
const path = require('path');

// Set up environment with service account
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'fibreflow-service-account.json');

console.log('Setting IAM policy for offlineFieldAppAPI...');

const command = `gcloud functions add-iam-policy-binding offlineFieldAppAPI \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --region=us-central1 \
  --project=fibreflow-73daf \
  --format=json`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
    console.error('Stderr:', stderr);
    
    // If gcloud fails, try using the REST API directly
    console.log('\nTrying alternative method...');
    
    const https = require('https');
    const fs = require('fs');
    
    const serviceAccount = JSON.parse(fs.readFileSync('./fibreflow-service-account.json', 'utf8'));
    
    // Use the service account to authenticate
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    auth.getAccessToken().then(token => {
      console.log('Got access token, setting IAM policy...');
      
      const options = {
        hostname: 'cloudfunctions.googleapis.com',
        path: '/v1/projects/fibreflow-73daf/locations/us-central1/functions/offlineFieldAppAPI:setIamPolicy',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const policyData = {
        policy: {
          bindings: [{
            role: 'roles/cloudfunctions.invoker',
            members: ['allUsers']
          }]
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Success! API is now publicly accessible');
          } else {
            console.log('Response:', data);
          }
        });
      });
      
      req.on('error', console.error);
      req.write(JSON.stringify(policyData));
      req.end();
    }).catch(console.error);
    
  } else {
    console.log('✅ Success!', stdout);
  }
});