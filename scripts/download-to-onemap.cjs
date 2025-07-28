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

// Proper location in OneMap directory
const DOWNLOAD_DIR = '/home/ldp/VF/Apps/FibreFlow/OneMap/uploaded-images/ettiene';

async function downloadImage(url, filename) {
  const localPath = path.join(DOWNLOAD_DIR, filename);
  
  // Check if exists
  try {
    const stat = await fs.stat(localPath);
    if (stat.size > 1000) return 'exists';
  } catch {}
  
  return new Promise((resolve) => {
    const file = require('fs').createWriteStream(localPath);
    const timeout = setTimeout(() => {
      file.destroy();
      resolve('timeout');
    }, 30000);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        clearTimeout(timeout);
        resolve('failed');
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        clearTimeout(timeout);
        file.close();
        resolve('success');
      });
    }).on('error', () => {
      clearTimeout(timeout);
      fs.unlink(localPath).catch(() => {});
      resolve('error');
    });
  });
}

async function downloadToOneMap() {
  console.log('📥 DOWNLOADING ETTIENE\'S IMAGES TO ONEMAP DIRECTORY\n');
  console.log(`📁 Target directory: ${DOWNLOAD_DIR}\n`);
  
  try {
    // Ensure directory exists
    await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
    
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
    
    console.log(`📷 Total images to download: ${allImages.length}`);
    
    // Check existing
    const existing = await fs.readdir(DOWNLOAD_DIR);
    const existingJpgs = existing.filter(f => f.endsWith('.JPG'));
    console.log(`✅ Already have: ${existingJpgs.length}`);
    console.log(`⏳ Need to download: ${allImages.length - existingJpgs.length}\n`);
    
    let downloaded = 0;
    let skipped = 0;
    let failed = 0;
    
    // Process all images
    for (let i = 0; i < allImages.length; i++) {
      const image = allImages[i];
      
      process.stdout.write(`[${i + 1}/${allImages.length}] ${image.fileName}... `);
      
      try {
        // Get URL
        let imageUrl = image.firebaseStorageUrl || image.url;
        if (!imageUrl && image.storagePath) {
          const storageRef = ref(storage, image.storagePath);
          imageUrl = await getDownloadURL(storageRef);
        }
        
        // Download
        const result = await downloadImage(imageUrl, image.fileName);
        
        switch(result) {
          case 'success':
            console.log('✅');
            downloaded++;
            break;
          case 'exists':
            console.log('⏭️');
            skipped++;
            break;
          case 'timeout':
            console.log('⏱️');
            failed++;
            break;
          default:
            console.log('❌');
            failed++;
        }
        
        // Progress every 20
        if ((i + 1) % 20 === 0) {
          console.log(`Progress: ${downloaded + skipped}/${i + 1}`);
        }
        
      } catch (error) {
        console.log('❌');
        failed++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 DOWNLOAD COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Downloaded: ${downloaded}`);
    console.log(`⏭️  Already had: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📁 Total files: ${downloaded + skipped}/${allImages.length}`);
    console.log(`📍 Location: ${DOWNLOAD_DIR}`);
    
    if (failed > 0) {
      console.log('\n⚠️  Run again to retry failed downloads');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

downloadToOneMap();