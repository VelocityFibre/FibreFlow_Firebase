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

const DOWNLOAD_DIR = '/home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene';

async function downloadImage(url, filename) {
  const localPath = path.join(DOWNLOAD_DIR, filename);
  
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(localPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function downloadFast() {
  console.log('🚀 FAST DOWNLOAD - NO PAUSES\n');
  
  // Get all images
  const q = query(
    collection(db, 'uploaded-images'),
    where('uploadedBy', '==', 'ettienejvr@gmail.com')
  );
  
  const snapshot = await getDocs(q);
  const allImages = [];
  snapshot.forEach(doc => {
    allImages.push({ id: doc.id, ...doc.data() });
  });
  
  // Get existing
  const existing = await fs.readdir(DOWNLOAD_DIR);
  const existingSet = new Set(existing.filter(f => f.endsWith('.JPG')));
  
  console.log(`Total: ${allImages.length}`);
  console.log(`Have: ${existingSet.size}`);
  console.log(`Need: ${allImages.length - existingSet.size}\n`);
  
  let count = existingSet.size;
  let downloaded = 0;
  let failed = 0;
  
  // Download missing ones FAST - no pause!
  for (const image of allImages) {
    if (existingSet.has(image.fileName)) continue;
    
    count++;
    process.stdout.write(`[${count}/${allImages.length}] ${image.fileName}... `);
    
    try {
      // Get URL
      let imageUrl = image.firebaseStorageUrl || image.url;
      if (!imageUrl && image.storagePath) {
        const storageRef = ref(storage, image.storagePath);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      // Download - NO PAUSE!
      await downloadImage(imageUrl, image.fileName);
      console.log('✅');
      downloaded++;
      
    } catch (error) {
      console.log('❌');
      failed++;
    }
  }
  
  // Final count
  const finalFiles = await fs.readdir(DOWNLOAD_DIR);
  const finalCount = finalFiles.filter(f => f.endsWith('.JPG')).length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Downloaded: ${downloaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Total: ${finalCount}/${allImages.length}`);
  
  if (finalCount === allImages.length) {
    console.log('\n🎉 ALL IMAGES DOWNLOADED!');
  }
}

downloadFast();