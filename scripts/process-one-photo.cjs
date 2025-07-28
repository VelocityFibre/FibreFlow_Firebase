const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const { getStorage, ref, getDownloadURL } = require('firebase/storage');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const exifr = require('exifr');

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
async function downloadImage(url, filename) {
  const tempPath = path.join('./temp', filename);
  await fs.mkdir('./temp', { recursive: true });
  
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(tempPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(tempPath);
      });
    }).on('error', (err) => {
      fs.unlink(tempPath).catch(() => {});
      reject(err);
    });
  });
}

// Process single photo
async function processOnePhoto(photoIndex = 0) {
  console.log('🔍 Processing single photo...\n');
  
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
    
    if (photoIndex >= images.length) {
      console.log('❌ Photo index out of range');
      return;
    }
    
    const image = images[photoIndex];
    console.log(`Processing photo ${photoIndex + 1}/${images.length}: ${image.fileName}`);
    
    // Get download URL
    let imageUrl = image.firebaseStorageUrl || image.url;
    
    if (!imageUrl && image.storagePath) {
      try {
        const storageRef = ref(storage, image.storagePath);
        imageUrl = await getDownloadURL(storageRef);
      } catch (e) {
        console.log('❌ Could not get download URL');
        return;
      }
    }
    
    console.log('✅ Got download URL');
    console.log('📥 Downloading image...');
    
    // Download the image
    const localPath = await downloadImage(imageUrl, image.fileName);
    console.log('✅ Downloaded to:', localPath);
    
    // Extract ALL EXIF data
    console.log('🔍 Extracting ALL EXIF data...');
    const exifData = await exifr.parse(localPath);
    
    console.log('\n📷 EXIF Data:');
    console.log(JSON.stringify(exifData, null, 2));
    
    if (exifData && (exifData.latitude || exifData.longitude)) {
      console.log('\n✅ GPS FOUND!');
      console.log(`📍 Latitude: ${exifData.latitude}`);
      console.log(`📍 Longitude: ${exifData.longitude}`);
      console.log(`📍 Coordinates: ${exifData.latitude}, ${exifData.longitude}`);
    } else {
      console.log('\n⚠️ No GPS data in this photo');
    }
    
    // Cleanup
    await fs.unlink(localPath).catch(() => {});
    
    // Create comprehensive report
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Photo Data');
    
    worksheet.columns = [
      { header: 'File Name', key: 'fileName', width: 40 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'Address', key: 'address', width: 60 },
      { header: 'Date Taken', key: 'dateTaken', width: 20 },
      { header: 'Camera Make', key: 'make', width: 15 },
      { header: 'Camera Model', key: 'model', width: 20 },
      { header: 'All EXIF Data', key: 'allData', width: 100 }
    ];
    
    // Look for address in various EXIF fields
    const address = exifData?.ImageDescription || 
                   exifData?.UserComment || 
                   exifData?.Artist ||
                   exifData?.Copyright ||
                   exifData?.XPComment ||
                   exifData?.XPSubject ||
                   exifData?.XPKeywords ||
                   'Not found in EXIF';
    
    worksheet.addRow({
      fileName: image.fileName,
      latitude: exifData?.latitude || 'Not found',
      longitude: exifData?.longitude || 'Not found',
      address: address,
      dateTaken: exifData?.DateTimeOriginal || exifData?.CreateDate || 'Not found',
      make: exifData?.Make || 'Not found',
      model: exifData?.Model || 'Not found',
      allData: JSON.stringify(exifData, null, 2)
    });
    
    const fileName = `single-photo-${photoIndex + 1}-gps.xlsx`;
    await workbook.xlsx.writeFile(`./reports/${fileName}`);
    
    console.log(`\n📊 Report saved: ./reports/${fileName}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get photo index from command line (default 0)
const photoIndex = parseInt(process.argv[2] || '0');
processOnePhoto(photoIndex);