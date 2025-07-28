import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import exifr from 'exifr';

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

async function downloadImage(url, filename) {
  const tempPath = path.join('./temp', filename);
  await fs.mkdir('./temp', { recursive: true });
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tempPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(tempPath);
      });
    }).on('error', (err) => {
      fs.unlink(tempPath);
      reject(err);
    });
  });
}

async function extractGPSFromPhoto(imageUrl, fileName) {
  try {
    console.log(`📸 Downloading ${fileName}...`);
    const localPath = await downloadImage(imageUrl, fileName);
    
    console.log(`🔍 Extracting EXIF data...`);
    const exifData = await exifr.parse(localPath, {
      gps: true,
      pick: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'DateTimeOriginal']
    });
    
    // Clean up temp file
    await fs.unlink(localPath);
    
    if (exifData && (exifData.latitude || exifData.longitude)) {
      console.log(`✅ GPS found: ${exifData.latitude}, ${exifData.longitude}`);
      return {
        latitude: exifData.latitude,
        longitude: exifData.longitude,
        captureDate: exifData.DateTimeOriginal || null
      };
    }
    
    console.log(`⚠️  No GPS data in EXIF`);
    return null;
  } catch (error) {
    console.error(`❌ Error processing ${fileName}:`, error.message);
    return null;
  }
}

async function processEttienesPhotos() {
  console.log('🚀 Starting REAL GPS extraction from photos...');
  console.log('================================================\n');
  
  try {
    // Get Ettiene's images
    const q = query(
      collection(db, 'uploaded-images'),
      where('uploadedBy', '==', 'ettienejvr@gmail.com')
    );
    
    const snapshot = await getDocs(q);
    console.log(`✅ Found ${snapshot.size} images\n`);
    
    const images = [];
    snapshot.forEach(doc => {
      images.push({ id: doc.id, ...doc.data() });
    });
    
    // Process images and extract EXIF GPS
    const processedData = [];
    let gpsCount = 0;
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`\n[${i + 1}/${images.length}] Processing: ${image.fileName}`);
      
      let imageUrl = image.firebaseStorageUrl || image.url;
      
      // Get download URL if needed
      if (!imageUrl && image.storagePath) {
        const storageRef = ref(storage, image.storagePath);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      // Extract GPS from actual photo EXIF
      const gpsData = await extractGPSFromPhoto(imageUrl, image.fileName);
      
      if (gpsData) {
        gpsCount++;
      }
      
      processedData.push({
        fileName: image.fileName,
        site: image.site || 'Unknown',
        project: image.project || 'General',
        uploadDate: image.uploadedAt?.toDate() || new Date(),
        captureDate: gpsData?.captureDate || null,
        latitude: gpsData?.latitude || '',
        longitude: gpsData?.longitude || '',
        address: gpsData ? `${gpsData.latitude}, ${gpsData.longitude}` : '',
        fileSize: Math.round((image.fileSize || 0) / 1024),
        gpsStatus: gpsData ? 'Found' : 'Not Found',
        imageUrl: imageUrl
      });
      
      // Process in batches to avoid overwhelming
      if (i % 10 === 0) {
        console.log(`\n📊 Progress: ${gpsCount} GPS coordinates found so far...`);
      }
    }
    
    console.log(`\n✅ Processing complete!`);
    console.log(`📍 GPS found in ${gpsCount} of ${images.length} photos (${(gpsCount/images.length*100).toFixed(1)}%)\n`);
    
    // Generate Excel
    console.log('📊 Generating Excel report...');
    await generateExcelReport(processedData, gpsCount);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function generateExcelReport(data, gpsCount) {
  const workbook = new ExcelJS.Workbook();
  
  // Main sheet
  const worksheet = workbook.addWorksheet('Pole Photos with GPS');
  
  worksheet.columns = [
    { header: 'File Name', key: 'fileName', width: 40 },
    { header: 'Site', key: 'site', width: 20 },
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Upload Date', key: 'uploadDate', width: 20 },
    { header: 'Capture Date', key: 'captureDate', width: 20 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 },
    { header: 'GPS Coordinates', key: 'address', width: 30 },
    { header: 'File Size (KB)', key: 'fileSize', width: 15 },
    { header: 'GPS Status', key: 'gpsStatus', width: 15 },
    { header: 'Image URL', key: 'imageUrl', width: 80 }
  ];
  
  // Style header
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  
  // Add data
  data.forEach(item => {
    const row = worksheet.addRow(item);
    
    // Highlight rows with GPS
    if (item.gpsStatus === 'Found') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCFFCC' }
      };
    }
  });
  
  // Add filters
  worksheet.autoFilter = {
    from: 'A1',
    to: `K${data.length + 1}`
  };
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 40 },
    { header: 'Value', key: 'value', width: 30 }
  ];
  
  summarySheet.addRows([
    { metric: 'Report Date', value: new Date().toLocaleString() },
    { metric: 'User', value: 'ettienejvr@gmail.com' },
    { metric: '', value: '' },
    { metric: 'Total Images', value: data.length },
    { metric: 'Images with GPS (from EXIF)', value: gpsCount },
    { metric: 'Images without GPS', value: data.length - gpsCount },
    { metric: 'GPS Success Rate', value: `${(gpsCount/data.length*100).toFixed(1)}%` },
    { metric: '', value: '' },
    { metric: 'Site', value: data[0]?.site || 'Unknown' },
    { metric: 'Project', value: data[0]?.project || 'General' }
  ]);
  
  summarySheet.getRow(1).font = { bold: true };
  
  // Save
  const fileName = `ettiene-photos-with-gps-${new Date().toISOString().split('T')[0]}.xlsx`;
  await workbook.xlsx.writeFile(`./reports/${fileName}`);
  
  console.log(`✅ Excel saved: ./reports/${fileName}`);
  
  // Clean up temp directory
  try {
    await fs.rmdir('./temp', { recursive: true });
  } catch (e) {}
}

// Install required package first
console.log('📦 Installing EXIF reader package...');
await import('child_process').then(({ exec }) => {
  exec('npm install exifr', (error) => {
    if (error) {
      console.error('Failed to install exifr:', error);
      return;
    }
    console.log('✅ Package installed, starting processing...\n');
    processEttienesPhotos();
  });
});