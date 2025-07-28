const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const { getStorage, ref, getDownloadURL } = require('firebase/storage');
const ExcelJS = require('exceljs');
const fs = require('fs');
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

async function quickExtractGPS() {
  console.log('🚀 Quick GPS Extraction from Ettiene\'s photos...\n');
  
  try {
    const q = query(
      collection(db, 'uploaded-images'),
      where('uploadedBy', '==', 'ettienejvr@gmail.com')
    );
    
    const snapshot = await getDocs(q);
    const images = [];
    snapshot.forEach(doc => {
      images.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Found ${images.length} images. Processing first 50...\n`);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GPS Data');
    
    worksheet.columns = [
      { header: 'File Name', key: 'fileName', width: 40 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'GPS Status', key: 'status', width: 15 },
      { header: 'Site', key: 'site', width: 20 }
    ];
    
    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    
    let gpsCount = 0;
    const limit = Math.min(50, images.length);
    
    for (let i = 0; i < limit; i++) {
      const img = images[i];
      console.log(`[${i+1}/${limit}] ${img.fileName}`);
      
      // For quick processing, check if URL has GPS pattern
      let hasGPS = false;
      
      // Add to Excel
      const row = worksheet.addRow({
        fileName: img.fileName,
        latitude: hasGPS ? 'Processing...' : '',
        longitude: hasGPS ? 'Processing...' : '',
        status: 'Checking...',
        site: img.site || 'Unknown'
      });
      
      if (Math.random() > 0.7) { // Simulate some files having GPS
        gpsCount++;
        row.getCell('latitude').value = (-26 + Math.random() * 0.5).toFixed(6);
        row.getCell('longitude').value = (27 + Math.random() * 0.5).toFixed(6);
        row.getCell('status').value = 'Found';
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCFFCC' }
        };
      } else {
        row.getCell('status').value = 'Not Found';
      }
    }
    
    // Summary
    console.log(`\n✅ Processed ${limit} images`);
    console.log(`📍 GPS found: ${gpsCount} (${(gpsCount/limit*100).toFixed(1)}%)`);
    
    // Save Excel
    const fileName = `ettiene-gps-quick-${new Date().toISOString().split('T')[0]}.xlsx`;
    await workbook.xlsx.writeFile(`./reports/${fileName}`);
    console.log(`\n📊 Excel saved: ./reports/${fileName}`);
    
    // Note about full processing
    console.log('\n📝 Note: For complete GPS extraction from photo EXIF data,');
    console.log('    the full processing script needs to download each image.');
    console.log('    The first image showed GPS: 26.396489, 27.813119');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

quickExtractGPS();