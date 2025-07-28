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

// Download image to temp directory
async function downloadImage(url, filename) {
  const tempPath = path.join('./temp', filename);
  await fs.mkdir('./temp', { recursive: true });
  
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(tempPath);
    
    https.get(url, (response) => {
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

// Extract comprehensive EXIF data
async function extractPhotoData(imageUrl, fileName) {
  try {
    console.log(`   📸 Downloading ${fileName}...`);
    const localPath = await downloadImage(imageUrl, fileName);
    
    console.log(`   🔍 Extracting EXIF data...`);
    
    // Extract all possible EXIF data
    const fullExif = await exifr.parse(localPath, {
      // GPS data
      gps: true,
      
      // Include all EXIF data
      ifd0: true,
      ifd1: true,
      exif: true,
      interop: true,
      
      // Specific tags to ensure we get
      pick: [
        'latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'GPSAltitude',
        'DateTimeOriginal', 'CreateDate', 'ModifyDate',
        'Make', 'Model', 'Software',
        'ImageDescription', 'Artist', 'Copyright',
        'ExposureTime', 'FNumber', 'ISO', 'FocalLength',
        'LensModel', 'Flash',
        'ImageWidth', 'ImageHeight', 'Orientation',
        'XResolution', 'YResolution',
        'GPSDateStamp', 'GPSTimeStamp', 'GPSSpeed',
        'GPSImgDirection', 'GPSDestBearing'
      ]
    });
    
    // Clean up temp file
    await fs.unlink(localPath);
    
    // Process the data
    const result = {
      // GPS Data
      latitude: fullExif?.latitude || null,
      longitude: fullExif?.longitude || null,
      altitude: fullExif?.GPSAltitude || null,
      gpsDate: fullExif?.GPSDateStamp || null,
      gpsTime: fullExif?.GPSTimeStamp || null,
      
      // Date/Time
      captureDate: fullExif?.DateTimeOriginal || fullExif?.CreateDate || null,
      
      // Camera Info
      cameraMake: fullExif?.Make || null,
      cameraModel: fullExif?.Model || null,
      software: fullExif?.Software || null,
      
      // Photo Settings
      exposureTime: fullExif?.ExposureTime || null,
      fNumber: fullExif?.FNumber || null,
      iso: fullExif?.ISO || null,
      focalLength: fullExif?.FocalLength || null,
      flash: fullExif?.Flash || null,
      
      // Image Properties
      width: fullExif?.ImageWidth || null,
      height: fullExif?.ImageHeight || null,
      orientation: fullExif?.Orientation || null,
      
      // Other
      description: fullExif?.ImageDescription || null,
      artist: fullExif?.Artist || null,
      copyright: fullExif?.Copyright || null
    };
    
    if (result.latitude && result.longitude) {
      console.log(`   ✅ GPS found: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
      
      // Get address from coordinates
      result.address = await reverseGeocode(result.latitude, result.longitude);
      console.log(`   📍 Address: ${result.address}`);
    } else {
      console.log(`   ⚠️  No GPS data found in EXIF`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

// Reverse geocode to get address
async function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'FibreFlow-GPS-Extractor/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.display_name) {
            resolve(parsed.display_name);
          } else {
            resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
        } catch (error) {
          resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      });
    }).on('error', () => {
      resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    });
    
    // Timeout
    setTimeout(() => resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`), 5000);
  });
}

// Main processing function
async function processEttienesPhotos() {
  console.log('🚀 Extracting ALL data from Ettiene\'s photos...');
  console.log('================================================\n');
  
  try {
    // Get Ettiene's images
    const q = query(
      collection(db, 'uploaded-images'),
      where('uploadedBy', '==', 'ettienejvr@gmail.com')
    );
    
    const snapshot = await getDocs(q);
    console.log(`✅ Found ${snapshot.size} images to process\n`);
    
    const images = [];
    snapshot.forEach(doc => {
      images.push({ id: doc.id, ...doc.data() });
    });
    
    // Process only first 10 for testing (remove this limit for full processing)
    const processLimit = 10; // CHANGE TO images.length for all images
    console.log(`⚠️  Processing first ${processLimit} images as a test...\n`);
    
    const processedData = [];
    let gpsCount = 0;
    
    for (let i = 0; i < Math.min(processLimit, images.length); i++) {
      const image = images[i];
      console.log(`[${i + 1}/${processLimit}] Processing: ${image.fileName}`);
      
      let imageUrl = image.firebaseStorageUrl || image.url;
      
      // Get download URL if needed
      if (!imageUrl && image.storagePath) {
        const storageRef = ref(storage, image.storagePath);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      // Extract all EXIF data
      const photoData = await extractPhotoData(imageUrl, image.fileName);
      
      if (photoData?.latitude) {
        gpsCount++;
      }
      
      processedData.push({
        // Basic info
        fileName: image.fileName,
        site: image.site || 'Unknown',
        project: image.project || 'General',
        uploadDate: image.uploadedAt?.toDate() || new Date(),
        fileSize: Math.round((image.fileSize || 0) / 1024),
        
        // GPS & Location
        latitude: photoData?.latitude || '',
        longitude: photoData?.longitude || '',
        altitude: photoData?.altitude || '',
        address: photoData?.address || '',
        gpsStatus: photoData?.latitude ? 'Found' : 'Not Found',
        
        // Date/Time
        captureDate: photoData?.captureDate || '',
        
        // Camera Info
        cameraMake: photoData?.cameraMake || '',
        cameraModel: photoData?.cameraModel || '',
        
        // Photo Details
        width: photoData?.width || '',
        height: photoData?.height || '',
        
        // URL
        imageUrl: imageUrl
      });
      
      console.log(''); // Empty line between images
    }
    
    console.log(`\n✅ Processing complete!`);
    console.log(`📍 GPS found in ${gpsCount} of ${processLimit} photos (${(gpsCount/processLimit*100).toFixed(1)}%)\n`);
    
    // Generate Excel
    console.log('📊 Generating comprehensive Excel report...');
    await generateExcelReport(processedData, gpsCount, processLimit);
    
    // Clean up
    try {
      await fs.rmdir('./temp', { recursive: true });
    } catch (e) {}
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Generate Excel with all data
async function generateExcelReport(data, gpsCount, totalProcessed) {
  const workbook = new ExcelJS.Workbook();
  
  // Main data sheet
  const worksheet = workbook.addWorksheet('Photo Data with GPS & Address');
  
  worksheet.columns = [
    { header: 'File Name', key: 'fileName', width: 40 },
    { header: 'Site', key: 'site', width: 20 },
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Upload Date', key: 'uploadDate', width: 20 },
    { header: 'Capture Date', key: 'captureDate', width: 20 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 },
    { header: 'Altitude (m)', key: 'altitude', width: 12 },
    { header: 'Address', key: 'address', width: 60 },
    { header: 'GPS Status', key: 'gpsStatus', width: 12 },
    { header: 'Camera Make', key: 'cameraMake', width: 15 },
    { header: 'Camera Model', key: 'cameraModel', width: 20 },
    { header: 'Width', key: 'width', width: 10 },
    { header: 'Height', key: 'height', width: 10 },
    { header: 'File Size (KB)', key: 'fileSize', width: 12 },
    { header: 'Image URL', key: 'imageUrl', width: 80 }
  ];
  
  // Style header
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).height = 20;
  
  // Add data
  data.forEach(item => {
    const row = worksheet.addRow(item);
    
    // Format dates
    if (item.uploadDate instanceof Date) {
      row.getCell('uploadDate').numFmt = 'yyyy-mm-dd hh:mm';
    }
    if (item.captureDate instanceof Date) {
      row.getCell('captureDate').numFmt = 'yyyy-mm-dd hh:mm';
    }
    
    // Highlight rows with GPS
    if (item.gpsStatus === 'Found') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCFFCC' }
      };
    }
    
    // Make URL clickable
    if (item.imageUrl) {
      row.getCell('imageUrl').value = {
        text: 'View Image',
        hyperlink: item.imageUrl
      };
      row.getCell('imageUrl').font = { color: { argb: 'FF0000FF' }, underline: true };
    }
  });
  
  // Add filters
  worksheet.autoFilter = {
    from: 'A1',
    to: `P${data.length + 1}`
  };
  
  // Freeze header
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 40 },
    { header: 'Value', key: 'value', width: 50 }
  ];
  
  const summaryData = [
    { metric: 'Report Generated', value: new Date().toLocaleString() },
    { metric: 'User', value: 'ettienejvr@gmail.com' },
    { metric: '', value: '' },
    { metric: 'Images Processed', value: totalProcessed },
    { metric: 'Images with GPS Data', value: gpsCount },
    { metric: 'Images without GPS', value: totalProcessed - gpsCount },
    { metric: 'GPS Success Rate', value: `${(gpsCount/totalProcessed*100).toFixed(1)}%` },
    { metric: '', value: '' },
    { metric: 'Note', value: 'This is a test run with first 10 images only' },
    { metric: 'Full Processing', value: 'Change processLimit to images.length in script' }
  ];
  
  summaryData.forEach(item => {
    const row = summarySheet.addRow(item);
    if (!item.metric) row.height = 10;
  });
  
  summarySheet.getRow(1).font = { bold: true };
  
  // GPS-only sheet
  const gpsSheet = workbook.addWorksheet('GPS Coordinates Only');
  gpsSheet.columns = [
    { header: 'File Name', key: 'fileName', width: 40 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 },
    { header: 'Address', key: 'address', width: 80 }
  ];
  
  const gpsData = data.filter(d => d.gpsStatus === 'Found');
  gpsData.forEach(item => {
    gpsSheet.addRow({
      fileName: item.fileName,
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address
    });
  });
  
  gpsSheet.getRow(1).font = { bold: true };
  
  // Save
  const fileName = `ettiene-photos-complete-data-${new Date().toISOString().split('T')[0]}.xlsx`;
  await workbook.xlsx.writeFile(`./reports/${fileName}`);
  
  console.log(`✅ Excel saved: ./reports/${fileName}`);
  console.log(`📁 Location: ${path.resolve('./reports', fileName)}`);
}

// Run the process
processEttienesPhotos().catch(console.error);