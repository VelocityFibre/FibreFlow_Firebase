const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const { getStorage, ref, getDownloadURL } = require('firebase/storage');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const firebaseConfig = {
  apiKey: 'AIzaSyD5iG5pNX0ElTHV1Vp7BhKHvO9RGzRzRCM',
  authDomain: 'fibreflow-73daf.firebaseapp.com',
  projectId: 'fibreflow-73daf',
  storageBucket: 'fibreflow-73daf.appspot.com',
  messagingSenderId: '729020567841',
  appId: '1:729020567841:web:8b3a77031b9b2b3b2c77c6'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Download image
async function downloadImage(url, filename, folder) {
  const localPath = path.join(folder, filename);
  
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(localPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(localPath);
      });
    }).on('error', (err) => {
      fs.unlink(localPath).catch(() => {});
      reject(err);
    });
  });
}

// Download images in batch
async function downloadImagesBatch(startIndex = 0, count = 10) {
  console.log(`📥 Downloading ${count} images starting from index ${startIndex}...\n`);
  
  try {
    // Get all images
    const q = query(
      collection(db, 'uploaded-images'),
      where('uploadedBy', '==', 'ettienejvr@gmail.com')
    );
    
    const snapshot = await getDocs(q);
    const images = [];
    snapshot.forEach(doc => {
      images.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Found ${images.length} total images\n`);
    
    // Create local folder
    const folder = './ettiene-images';
    await fs.mkdir(folder, { recursive: true });
    
    // Download requested batch
    const endIndex = Math.min(startIndex + count, images.length);
    let successCount = 0;
    
    for (let i = startIndex; i < endIndex; i++) {
      const image = images[i];
      console.log(`[${i + 1}/${images.length}] Downloading ${image.fileName}...`);
      
      try {
        // Get URL
        let imageUrl = image.firebaseStorageUrl || image.url;
        if (!imageUrl && image.storagePath) {
          const storageRef = ref(storage, image.storagePath);
          imageUrl = await getDownloadURL(storageRef);
        }
        
        // Download
        await downloadImage(imageUrl, image.fileName, folder);
        console.log(`   ✅ Downloaded successfully`);
        successCount++;
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Downloaded ${successCount} out of ${count} images`);
    console.log(`📁 Images saved to: ${path.resolve(folder)}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get parameters from command line
const startIndex = parseInt(process.argv[2] || '0');
const count = parseInt(process.argv[3] || '10');

downloadImagesBatch(startIndex, count);