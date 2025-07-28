#!/usr/bin/env node

/**
 * Manual Image Processing Script for Ettiene's Upload
 * Processes uploaded images, extracts GPS data, and generates Excel report
 */

const admin = require('firebase-admin');
const ExcelJS = require('exceljs');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'fibreflow-73daf.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Configuration
const CONFIG = {
  userEmail: 'ettienejvr@gmail.com',
  outputDir: './reports',
  excelFileName: `pole-photos-ettiene-${new Date().toISOString().split('T')[0]}.xlsx`
};

// Main processing function
async function processEttieneImages() {
  console.log('🚀 Starting image processing for:', CONFIG.userEmail);
  console.log('================================================\n');
  
  try {
    // Create output directory
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    
    // Step 1: Find all uploaded images
    console.log('📸 Step 1: Finding uploaded images...');
    const images = await findUploadedImages();
    console.log(`✅ Found ${images.length} images\n`);
    
    if (images.length === 0) {
      console.log('❌ No images found for this user');
      return;
    }
    
    // Step 2: Process each image
    console.log('🔄 Step 2: Processing images...');
    const processedData = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`Processing ${i + 1}/${images.length}: ${image.fileName}`);
      
      try {
        const processed = await processImage(image);
        processedData.push(processed);
      } catch (error) {
        console.error(`❌ Failed to process ${image.fileName}:`, error.message);
        processedData.push({
          ...image,
          processingStatus: 'failed',
          processingError: error.message
        });
      }
    }
    
    console.log(`\n✅ Processed ${processedData.length} images\n`);
    
    // Step 3: Generate Excel report
    console.log('📊 Step 3: Generating Excel report...');
    await generateExcelReport(processedData);
    console.log(`✅ Excel report saved: ${CONFIG.outputDir}/${CONFIG.excelFileName}\n`);
    
    // Step 4: Summary
    printSummary(processedData);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Find uploaded images by user
async function findUploadedImages() {
  const snapshot = await db.collection('uploaded-images')
    .where('uploadedBy', '==', CONFIG.userEmail)
    .orderBy('uploadedAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt?.toDate() || new Date()
  }));
}

// Process single image
async function processImage(imageData) {
  const result = {
    fileName: imageData.fileName,
    site: imageData.site || 'Unknown',
    project: imageData.project || 'General',
    uploadDate: imageData.uploadedAt,
    fileSize: imageData.fileSize || 0,
    storagePath: imageData.storagePath || '',
    firebaseUrl: imageData.firebaseStorageUrl || '',
    processingStatus: 'processing'
  };
  
  try {
    // Get download URL if not already present
    if (!result.firebaseUrl && imageData.storagePath) {
      const file = bucket.file(imageData.storagePath);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      });
      result.firebaseUrl = url;
    }
    
    // Extract GPS data (simplified for manual processing)
    const gpsData = extractGPSFromFileName(imageData.fileName);
    if (gpsData) {
      result.latitude = gpsData.latitude;
      result.longitude = gpsData.longitude;
      result.captureDate = gpsData.captureDate;
      
      // Reverse geocode
      if (gpsData.latitude && gpsData.longitude) {
        result.address = await reverseGeocode(gpsData.latitude, gpsData.longitude);
      }
    }
    
    result.processingStatus = 'completed';
    
    // Update in Firestore
    await db.collection('uploaded-images').doc(imageData.id).update({
      processed: true,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      gpsData: gpsData || null,
      address: result.address || null
    });
    
  } catch (error) {
    result.processingStatus = 'failed';
    result.processingError = error.message;
  }
  
  return result;
}

// Extract GPS from filename patterns (simplified)
function extractGPSFromFileName(fileName) {
  // Check for GPS Map Camera pattern in filename
  // Example: IMG_20250125_GPS_-26.0627_28.0826.jpg
  const gpsPattern = /GPS[_-]?([-]?\d+\.?\d*)[_,]?([-]?\d+\.?\d*)/i;
  const match = fileName.match(gpsPattern);
  
  if (match) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2]),
      captureDate: new Date() // Could extract from filename if pattern exists
    };
  }
  
  // Check for coordinate pattern in filename
  const coordPattern = /([-]?\d{1,2}\.\d{4,})[_,\s]+([-]?\d{1,3}\.\d{4,})/;
  const coordMatch = fileName.match(coordPattern);
  
  if (coordMatch) {
    return {
      latitude: parseFloat(coordMatch[1]),
      longitude: parseFloat(coordMatch[2]),
      captureDate: new Date()
    };
  }
  
  // No GPS found in filename
  return null;
}

// Reverse geocode coordinates
async function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'FibreFlow-Manual-Processor/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.display_name || `${lat}, ${lng}`);
        } catch (error) {
          resolve(`${lat}, ${lng}`);
        }
      });
    }).on('error', () => {
      resolve(`${lat}, ${lng}`);
    });
  });
}

// Generate Excel report
async function generateExcelReport(processedData) {
  const workbook = new ExcelJS.Workbook();
  
  // Main data sheet
  const worksheet = workbook.addWorksheet('Pole Photos Data');
  
  worksheet.columns = [
    { header: 'File Name', key: 'fileName', width: 40 },
    { header: 'Site', key: 'site', width: 20 },
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Upload Date', key: 'uploadDate', width: 20 },
    { header: 'Capture Date', key: 'captureDate', width: 20 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 },
    { header: 'Address', key: 'address', width: 50 },
    { header: 'File Size (KB)', key: 'fileSize', width: 15 },
    { header: 'Processing Status', key: 'processingStatus', width: 15 },
    { header: 'Error', key: 'processingError', width: 30 },
    { header: 'Image URL', key: 'firebaseUrl', width: 60 }
  ];
  
  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
  
  // Add data
  processedData.forEach((data) => {
    const row = worksheet.addRow({
      fileName: data.fileName,
      site: data.site,
      project: data.project,
      uploadDate: data.uploadDate,
      captureDate: data.captureDate || '',
      latitude: data.latitude || '',
      longitude: data.longitude || '',
      address: data.address || '',
      fileSize: Math.round(data.fileSize / 1024),
      processingStatus: data.processingStatus,
      processingError: data.processingError || '',
      firebaseUrl: data.firebaseUrl
    });
    
    // Color coding
    if (data.processingStatus === 'failed') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFCCCC' }
      };
    } else if (data.latitude && data.longitude) {
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
    to: `L${processedData.length + 1}`
  };
  
  // Freeze header
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  
  const totalImages = processedData.length;
  const successfulGPS = processedData.filter(d => d.latitude && d.longitude).length;
  const failedProcessing = processedData.filter(d => d.processingStatus === 'failed').length;
  const sites = [...new Set(processedData.map(d => d.site))];
  const projects = [...new Set(processedData.map(d => d.project))];
  
  summarySheet.addRows([
    { metric: 'User Email', value: CONFIG.userEmail },
    { metric: 'Processing Date', value: new Date().toLocaleDateString() },
    { metric: 'Total Images Processed', value: totalImages },
    { metric: 'Images with GPS Data', value: successfulGPS },
    { metric: 'Images without GPS', value: totalImages - successfulGPS },
    { metric: 'Failed Processing', value: failedProcessing },
    { metric: 'Success Rate', value: `${((totalImages - failedProcessing) / totalImages * 100).toFixed(1)}%` },
    { metric: 'GPS Extraction Rate', value: `${(successfulGPS / totalImages * 100).toFixed(1)}%` },
    { metric: 'Sites', value: sites.join(', ') },
    { metric: 'Projects', value: projects.join(', ') }
  ]);
  
  summarySheet.getRow(1).font = { bold: true };
  
  // Save file
  await workbook.xlsx.writeFile(path.join(CONFIG.outputDir, CONFIG.excelFileName));
}

// Print summary
function printSummary(processedData) {
  const totalImages = processedData.length;
  const successfulGPS = processedData.filter(d => d.latitude && d.longitude).length;
  const failedProcessing = processedData.filter(d => d.processingStatus === 'failed').length;
  
  console.log('📈 PROCESSING SUMMARY');
  console.log('====================');
  console.log(`Total Images: ${totalImages}`);
  console.log(`With GPS: ${successfulGPS} (${(successfulGPS / totalImages * 100).toFixed(1)}%)`);
  console.log(`Without GPS: ${totalImages - successfulGPS}`);
  console.log(`Failed: ${failedProcessing}`);
  console.log(`\n✅ Report saved to: ${CONFIG.outputDir}/${CONFIG.excelFileName}`);
  console.log('\n📧 You can now send this report to Ettiene!');
}

// Run the script
processEttieneImages().catch(console.error);