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
    
    // Handle Firebase URLs that might need token
    const finalUrl = url.includes('firebasestorage.googleapis.com') && !url.includes('token=') 
      ? url + (url.includes('?') ? '&' : '?') + 'alt=media'
      : url;
    
    https.get(finalUrl, (response) => {
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

// Extract GPS with timeout
async function extractGPSWithTimeout(imageUrl, fileName, timeout = 10000) {
  return Promise.race([
    extractGPS(imageUrl, fileName),
    new Promise((resolve) => setTimeout(() => resolve(null), timeout))
  ]);
}

// Extract GPS
async function extractGPS(imageUrl, fileName) {
  try {
    const localPath = await downloadImage(imageUrl, fileName);
    
    const exifData = await exifr.parse(localPath, {
      gps: true,
      pick: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude']
    });
    
    await fs.unlink(localPath).catch(() => {});
    
    if (exifData && (exifData.latitude || exifData.longitude)) {
      return {
        latitude: exifData.latitude,
        longitude: exifData.longitude
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Main processing
async function processAllPhotos() {
  console.log('🚀 PROCESSING ALL 278 PHOTOS - EXTRACTING GPS DATA...\n');
  
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
    
    console.log(`✅ Found ${images.length} images to process\n`);
    console.log('⏳ This will take a few minutes...\n');
    
    const results = [];
    let gpsCount = 0;
    let processedCount = 0;
    
    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, Math.min(i + batchSize, images.length));
      
      const batchPromises = batch.map(async (image) => {
        const index = images.indexOf(image) + 1;
        console.log(`[${index}/${images.length}] Processing ${image.fileName}...`);
        
        let imageUrl = image.firebaseStorageUrl || image.url;
        
        if (!imageUrl && image.storagePath) {
          try {
            const storageRef = ref(storage, image.storagePath);
            imageUrl = await getDownloadURL(storageRef);
          } catch (e) {
            console.log(`   ❌ Could not get URL`);
            return null;
          }
        }
        
        const gpsData = await extractGPSWithTimeout(imageUrl, image.fileName);
        
        if (gpsData) {
          console.log(`   ✅ GPS: ${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`);
          gpsCount++;
        } else {
          console.log(`   ⚠️  No GPS data`);
        }
        
        processedCount++;
        
        return {
          fileName: image.fileName,
          site: image.site || 'Lawley General',
          project: image.project || 'General',
          uploadDate: image.uploadedAt?.toDate() || new Date(),
          latitude: gpsData?.latitude || '',
          longitude: gpsData?.longitude || '',
          coordinates: gpsData ? `${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}` : '',
          gpsStatus: gpsData ? 'Found' : 'Not Found',
          imageUrl: imageUrl
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null));
      
      console.log(`\n📊 Progress: ${processedCount}/${images.length} processed, ${gpsCount} with GPS\n`);
    }
    
    // Generate Excel
    console.log('\n📊 Generating Excel report...');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GPS Data Extracted');
    
    worksheet.columns = [
      { header: 'File Name', key: 'fileName', width: 40 },
      { header: 'Site', key: 'site', width: 20 },
      { header: 'Project', key: 'project', width: 20 },
      { header: 'Upload Date', key: 'uploadDate', width: 20 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'GPS Coordinates', key: 'coordinates', width: 25 },
      { header: 'GPS Status', key: 'gpsStatus', width: 12 }
    ];
    
    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    
    // Add data
    results.forEach(row => {
      const excelRow = worksheet.addRow(row);
      if (row.gpsStatus === 'Found') {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFFCC' }
        };
      }
    });
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 30 }
    ];
    
    summarySheet.addRows([
      { metric: 'Total Images Processed', value: results.length },
      { metric: 'Images with GPS', value: gpsCount },
      { metric: 'Images without GPS', value: results.length - gpsCount },
      { metric: 'GPS Success Rate', value: `${(gpsCount/results.length*100).toFixed(1)}%` },
      { metric: 'Processing Date', value: new Date().toLocaleString() }
    ]);
    
    summarySheet.getRow(1).font = { bold: true };
    
    // Save Excel
    const fileName = `ettiene-complete-gps-data-${new Date().toISOString().split('T')[0]}.xlsx`;
    await workbook.xlsx.writeFile(`./reports/${fileName}`);
    
    console.log(`\n✅ COMPLETE! Processed ${results.length} images`);
    console.log(`📍 GPS found in ${gpsCount} photos (${(gpsCount/results.length*100).toFixed(1)}%)`);
    console.log(`📊 Excel saved: ./reports/${fileName}`);
    
    // Cleanup
    await fs.rmdir('./temp', { recursive: true }).catch(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

processAllPhotos();