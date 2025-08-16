const { exec } = require('child_process');
const path = require('path');

// Set up environment
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '..', 'fibreflow-service-account.json');

const PROJECT_ID = 'fibreflow-73daf';
const APIS = [
  'cloudfunctions.googleapis.com',
  'cloudbuild.googleapis.com', 
  'artifactregistry.googleapis.com',
  'cloudscheduler.googleapis.com',
  'cloudbilling.googleapis.com',
  'firebaseextensions.googleapis.com',
  'storage.googleapis.com',
  'logging.googleapis.com',
  'pubsub.googleapis.com'
];

console.log('🔧 Enabling required Google Cloud APIs...\n');

// Try using Firebase CLI to enable APIs
const enableCommand = `firebase projects:apis:enable ${APIS.join(' ')} --project ${PROJECT_ID}`;

console.log('Running command:', enableCommand);
console.log('\nThis may take a few moments...\n');

exec(enableCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
    console.log('\n❌ Failed to enable APIs automatically.');
    console.log('\n📋 Please run this command manually:');
    console.log('=====================================\n');
    console.log(`gcloud services enable ${APIS.join(' ')} --project=${PROJECT_ID}`);
    console.log('\n=====================================');
    return;
  }
  
  if (stderr) {
    console.error('Warning:', stderr);
  }
  
  console.log(stdout);
  console.log('\n✅ APIs enabled successfully!');
  console.log('\nYou can now deploy with:');
  console.log('firebase deploy --only functions:neonReadAPI');
});