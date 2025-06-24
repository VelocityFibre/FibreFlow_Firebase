const { Storage } = require('@google-cloud/storage');

// Initialize storage with Application Default Credentials
// This will use your gcloud auth or the credentials of the environment
const storage = new Storage({
  projectId: 'fibreflow-73daf'
});

const bucketName = 'fibreflow-73daf.firebasestorage.app';

// CORS configuration
const corsConfiguration = [
  {
    origin: [
      'https://fibreflow-73daf.web.app',
      'https://fibreflow-73daf.firebaseapp.com', 
      'http://localhost:4200',
      'http://localhost:4300'
    ],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    maxAgeSeconds: 3600,
    responseHeader: [
      'Content-Type',
      'Authorization', 
      'Content-Length',
      'User-Agent',
      'x-goog-resumable',
      'x-goog-acl',
      'x-firebase-storage-version',
      'x-goog-upload-content-type',
      'x-goog-upload-protocol',
      'x-goog-upload-command',
      'x-goog-upload-header-content-length',
      'x-goog-upload-header-content-type',
      'x-goog-upload-offset',
      'x-goog-upload-chunk-granularity',
      'x-goog-upload-status'
    ]
  }
];

async function setCorsConfiguration() {
  try {
    const bucket = storage.bucket(bucketName);
    
    console.log('Setting CORS configuration for bucket:', bucketName);
    console.log('\nThis uses Application Default Credentials.');
    console.log('Make sure you are authenticated with: firebase login');
    
    await bucket.setCorsConfiguration(corsConfiguration);
    
    console.log('\n✅ CORS configuration applied successfully!');
    console.log('\nAllowed origins:');
    corsConfiguration[0].origin.forEach(origin => console.log(`  - ${origin}`));
    
    // Verify the configuration
    const [metadata] = await bucket.getMetadata();
    console.log('\nCurrent CORS configuration:');
    console.log(JSON.stringify(metadata.cors, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error setting CORS configuration:', error.message);
    console.error('\nPossible solutions:');
    console.error('1. Run: firebase login');
    console.error('2. Ensure you have Storage Admin role in IAM');
    console.error('3. Use Google Cloud Shell instead');
    process.exit(1);
  }
}

setCorsConfiguration();