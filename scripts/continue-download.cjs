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

async function downloadImage(url, filename, folder) {
  const localPath = path.join(folder, filename);
  
  // Skip if exists
  try {
    await fs.access(localPath);
    return 'skipped';
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

async function continueDownload() {
  console.log('📥 CONTINUING DOWNLOAD OF REMAINING IMAGES\n');
  
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
    
    console.log(`📷 Total images: ${images.length}`);
    
    const folder = './ettiene-images';
    
    // Check existing files
    const existingFiles = await fs.readdir(folder);
    const jpgFiles = existingFiles.filter(f => f.endsWith('.JPG'));
    console.log(`✅ Already downloaded: ${jpgFiles.length}`);
    console.log(`⏳ Remaining: ${images.length - jpgFiles.length}\n`);
    
    let downloaded = 0;
    let skipped = jpgFiles.length;
    let failed = 0;
    
    // Process one by one
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      process.stdout.write(`[${i + 1}/${images.length}] ${image.fileName}... `);
      
      try {
        // Get URL
        let imageUrl = image.firebaseStorageUrl || image.url;
        if (!imageUrl && image.storagePath) {
          const storageRef = ref(storage, image.storagePath);
          imageUrl = await getDownloadURL(storageRef);
        }
        
        // Download
        const result = await downloadImage(imageUrl, image.fileName, folder);
        
        switch(result) {
          case 'success':
            console.log('✅');
            downloaded++;
            break;
          case 'skipped':
            console.log('⏭️');
            break;
          case 'timeout':
            console.log('⏱️ Timeout');
            failed++;
            break;
          default:
            console.log('❌');
            failed++;
        }
        
        // Progress update every 10 files
        if ((i + 1) % 10 === 0 || i === images.length - 1) {
          console.log(`Progress: ${downloaded + skipped}/${i + 1} (${failed} failed)`);
        }
        
      } catch (error) {
        console.log('❌ Error');
        failed++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 DOWNLOAD COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Newly downloaded: ${downloaded}`);
    console.log(`⏭️ Already had: ${skipped - jpgFiles.length}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📁 Total files: ${downloaded + skipped}`);
    console.log(`📍 Location: ${path.resolve(folder)}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

continueDownload();