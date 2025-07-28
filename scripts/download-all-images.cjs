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

// Download single image
async function downloadImage(url, filename, folder) {
  const localPath = path.join(folder, filename);
  
  // Skip if already exists
  try {
    await fs.access(localPath);
    return { success: true, skipped: true };
  } catch {}
  
  return new Promise((resolve) => {
    const file = require('fs').createWriteStream(localPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        resolve({ success: false, error: `HTTP ${response.statusCode}` });
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve({ success: true, skipped: false });
      });
    }).on('error', (err) => {
      fs.unlink(localPath).catch(() => {});
      resolve({ success: false, error: err.message });
    });
  });
}

// Main download function
async function downloadAllImages() {
  console.log('📥 DOWNLOADING ALL IMAGES FROM ETTIENE\n');
  
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
    
    console.log(`📷 Found ${images.length} total images\n`);
    
    // Create folder
    const folder = './ettiene-images';
    await fs.mkdir(folder, { recursive: true });
    
    // Track progress
    let downloaded = 0;
    let skipped = 0;
    let failed = 0;
    const batchSize = 20;
    
    // Save image metadata
    const metadata = [];
    
    // Process in batches
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, Math.min(i + batchSize, images.length));
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(images.length / batchSize);
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} images)`);
      
      // Process batch in parallel
      const promises = batch.map(async (image, idx) => {
        const imageNum = i + idx + 1;
        
        try {
          // Get URL
          let imageUrl = image.firebaseStorageUrl || image.url;
          if (!imageUrl && image.storagePath) {
            const storageRef = ref(storage, image.storagePath);
            imageUrl = await getDownloadURL(storageRef);
          }
          
          // Download
          process.stdout.write(`[${imageNum}/${images.length}] ${image.fileName}... `);
          const result = await downloadImage(imageUrl, image.fileName, folder);
          
          if (result.success) {
            if (result.skipped) {
              console.log('⏭️  Skipped (exists)');
              skipped++;
            } else {
              console.log('✅ Downloaded');
              downloaded++;
            }
            
            // Save metadata
            metadata.push({
              index: imageNum,
              fileName: image.fileName,
              uploadDate: image.uploadedAt?.toDate() || new Date(),
              site: image.site || 'Lawley General',
              project: image.project || 'General'
            });
          } else {
            console.log(`❌ Failed: ${result.error}`);
            failed++;
          }
          
        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
          failed++;
        }
      });
      
      await Promise.all(promises);
      
      console.log(`Batch complete: ${downloaded + skipped} successful`);
      
      // Small pause between batches
      if (i + batchSize < images.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Save metadata for processing later
    await fs.writeFile(
      path.join(folder, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 DOWNLOAD COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Downloaded: ${downloaded}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📁 Total files: ${downloaded + skipped}`);
    console.log(`📍 Location: ${path.resolve(folder)}`);
    console.log('\n🎯 Next step: Run processing script to extract GPS data');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

downloadAllImages();