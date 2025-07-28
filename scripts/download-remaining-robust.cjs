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

async function downloadSingleImage(url, filename) {
  const localPath = path.join(DOWNLOAD_DIR, filename);
  
  return new Promise((resolve) => {
    const file = require('fs').createWriteStream(localPath);
    let downloaded = false;
    
    const timeout = setTimeout(() => {
      if (!downloaded) {
        file.destroy();
        fs.unlink(localPath).catch(() => {});
        resolve('timeout');
      }
    }, 20000); // 20 second timeout
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        clearTimeout(timeout);
        file.destroy();
        resolve('failed');
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        downloaded = true;
        clearTimeout(timeout);
        file.close();
        resolve('success');
      });
      
      file.on('error', () => {
        clearTimeout(timeout);
        fs.unlink(localPath).catch(() => {});
        resolve('error');
      });
    }).on('error', () => {
      clearTimeout(timeout);
      fs.unlink(localPath).catch(() => {});
      resolve('error');
    });
  });
}

async function getMissingImages() {
  // Get all images from Firebase
  const q = query(
    collection(db, 'uploaded-images'),
    where('uploadedBy', '==', 'ettienejvr@gmail.com')
  );
  
  const snapshot = await getDocs(q);
  const allImages = [];
  snapshot.forEach(doc => {
    allImages.push({ id: doc.id, ...doc.data() });
  });
  
  // Get existing files
  const existing = await fs.readdir(DOWNLOAD_DIR);
  const existingSet = new Set(existing.filter(f => f.endsWith('.JPG')));
  
  // Find missing
  const missing = allImages.filter(img => !existingSet.has(img.fileName));
  
  return { allImages, missing, existingCount: existingSet.size };
}

async function downloadRemainingImages() {
  console.log('📥 ROBUST DOWNLOAD - REMAINING IMAGES\n');
  console.log(`📁 Directory: ${DOWNLOAD_DIR}\n`);
  
  try {
    const { allImages, missing, existingCount } = await getMissingImages();
    
    console.log(`📊 Status:`);
    console.log(`   Total needed: ${allImages.length}`);
    console.log(`   Already have: ${existingCount}`);
    console.log(`   Still missing: ${missing.length}\n`);
    
    if (missing.length === 0) {
      console.log('✅ All images downloaded!');
      return;
    }
    
    let downloaded = 0;
    let failed = 0;
    const startTime = Date.now();
    
    // Process missing images
    for (let i = 0; i < missing.length; i++) {
      const image = missing[i];
      const currentTotal = existingCount + downloaded;
      
      console.log(`[${currentTotal + 1}/${allImages.length}] ${image.fileName}...`);
      
      try {
        // Get URL
        let imageUrl = image.firebaseStorageUrl || image.url;
        if (!imageUrl && image.storagePath) {
          const storageRef = ref(storage, image.storagePath);
          imageUrl = await getDownloadURL(storageRef);
        }
        
        // Download
        const result = await downloadSingleImage(imageUrl, image.fileName);
        
        if (result === 'success') {
          console.log('   ✅ Downloaded');
          downloaded++;
        } else if (result === 'timeout') {
          console.log('   ⏱️ Timeout - will retry later');
          failed++;
        } else {
          console.log('   ❌ Failed');
          failed++;
        }
        
        // Progress update
        if ((i + 1) % 10 === 0) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const rate = downloaded / elapsed;
          const remaining = missing.length - i - 1;
          const eta = Math.round(remaining / rate);
          console.log(`\n📊 Progress: ${currentTotal + 1}/${allImages.length}`);
          console.log(`   Speed: ${rate.toFixed(1)} images/sec`);
          console.log(`   ETA: ${Math.floor(eta / 60)}m ${eta % 60}s\n`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failed++;
      }
      
      // Small pause to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final check
    const { missing: stillMissing } = await getMissingImages();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DOWNLOAD SESSION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Downloaded this session: ${downloaded}`);
    console.log(`❌ Failed this session: ${failed}`);
    console.log(`📁 Total images now: ${allImages.length - stillMissing.length}/${allImages.length}`);
    
    if (stillMissing.length > 0) {
      console.log(`\n⚠️  Still missing ${stillMissing.length} images`);
      console.log('Run this script again to retry failed downloads');
    } else {
      console.log('\n🎉 ALL 278 IMAGES SUCCESSFULLY DOWNLOADED!');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

downloadRemainingImages();