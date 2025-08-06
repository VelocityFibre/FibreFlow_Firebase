const { initializeApp } = require('firebase/app');
const { getStorage, ref, getDownloadURL, getMetadata } = require('firebase/storage');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "296054249427",
  appId: "1:296054249427:web:2f0d6482daa6beb0624126"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Files to download from csv-uploads folder
const augustFiles = [
  '1754294879962_Lawley August Week 1 01082025.csv',
  '1754294986426_Lawley August Week 1 02082025.csv',
  '1754295169323_Lawley August Week 1 03082025.csv',
  '1754374822777_Lawley August Week 1 04082025.csv'
];

const downloadPath = path.join(__dirname, '../downloads/august-2025');

async function downloadFile(fileName) {
  try {
    console.log(`\n📥 Downloading ${fileName}...`);
    
    // Get reference to the file in csv-uploads folder
    const fileRef = ref(storage, `csv-uploads/${fileName}`);
    
    // Get metadata first
    const metadata = await getMetadata(fileRef);
    console.log(`   Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Created: ${metadata.timeCreated}`);
    
    // Get download URL
    const url = await getDownloadURL(fileRef);
    
    // Download the file
    const filePath = path.join(downloadPath, fileName);
    const file = fs.createWriteStream(filePath);
    
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let downloaded = 0;
        const total = parseInt(response.headers['content-length'], 10);
        
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          const percent = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\r   Progress: ${percent}%`);
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`\n   ✅ Downloaded to: ${filePath}`);
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file on error
        console.error(`\n   ❌ Error downloading ${fileName}:`, err.message);
        reject(err);
      });
    });
    
  } catch (error) {
    console.error(`❌ Error with ${fileName}:`, error.message);
  }
}

async function downloadAllFiles() {
  console.log('🚀 Starting download of August 2025 OneMap files from csv-uploads folder...');
  console.log(`📁 Destination: ${downloadPath}\n`);
  
  // Ensure directory exists
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }
  
  // Download each file
  let successCount = 0;
  for (const fileName of augustFiles) {
    try {
      await downloadFile(fileName);
      successCount++;
    } catch (error) {
      console.error(`Failed to download ${fileName}`);
    }
  }
  
  console.log(`\n✅ Download complete! Successfully downloaded ${successCount}/${augustFiles.length} files`);
  
  // List downloaded files
  console.log('\n📋 Downloaded files:');
  const files = fs.readdirSync(downloadPath);
  files.forEach(file => {
    const stats = fs.statSync(path.join(downloadPath, file));
    console.log(`   - ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  });
  
  if (files.length === 0) {
    console.log('   No files downloaded - check if files exist in csv-uploads folder');
  }
}

// Run the download
downloadAllFiles().catch(console.error);