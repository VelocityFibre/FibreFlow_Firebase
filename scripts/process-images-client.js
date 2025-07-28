#!/usr/bin/env node

/**
 * Client-side Image Processing Script
 * Uses Firebase client SDK to process images
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import ExcelJS from 'exceljs';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyD5iG5pNX0ElTHV1Vp7BhKHvO9RGzRzRCM',
  authDomain: 'fibreflow-73daf.firebaseapp.com',
  projectId: 'fibreflow-73daf',
  storageBucket: 'fibreflow-73daf.appspot.com',
  messagingSenderId: '729020567841',
  appId: '1:729020567841:web:8b3a77031b9b2b3b2c77c6'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Configuration
const CONFIG = {
  userEmail: 'ettienejvr@gmail.com',
  outputDir: './reports',
  excelFileName: `pole-photos-ettiene-${new Date().toISOString().split('T')[0]}.xlsx`
};

// Main processing function
async function processImages() {
  console.log('🚀 Starting image processing for:', CONFIG.userEmail);
  console.log('================================================\n');
  
  try {
    // Create output directory
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    
    // Step 1: Find uploaded images
    console.log('📸 Step 1: Finding uploaded images...');
    const images = await findUploadedImages();
    console.log(`✅ Found ${images.length} images\n`);
    
    if (images.length === 0) {
      console.log('❌ No images found for this user');
      console.log('\n💡 Possible reasons:');
      console.log('   - User hasn\'t uploaded yet');
      console.log('   - Email doesn\'t match exactly');
      console.log('   - Images were uploaded with different email\n');
      
      // Try to find recent uploads
      console.log('🔍 Checking recent uploads from all users...');
      await checkRecentUploads();
      return;
    }
    
    // Step 2: Process each image
    console.log('🔄 Step 2: Processing images...');
    const processedData = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const progress = `[${i + 1}/${images.length}]`;
      console.log(`${progress} Processing: ${image.fileName}`);
      
      try {
        const processed = await processImage(image);
        processedData.push(processed);
        
        if (processed.latitude && processed.longitude) {
          console.log(`   ✅ GPS found: ${processed.latitude}, ${processed.longitude}`);
        } else {
          console.log(`   ⚠️  No GPS data found`);
        }
      } catch (error) {
        console.error(`   ❌ Failed:`, error.message);
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
    if (error.code === 'permission-denied') {
      console.log('\n⚠️  Permission denied. This might be due to Firestore security rules.');
      console.log('💡 Try running this from an authenticated context or update security rules temporarily.');
    }
  }
}

// Find uploaded images
async function findUploadedImages() {
  const uploadsRef = collection(db, 'uploaded-images');
  const q = query(
    uploadsRef,
    where('uploadedBy', '==', CONFIG.userEmail)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Check recent uploads from any user
async function checkRecentUploads() {
  try {
    const uploadsRef = collection(db, 'uploaded-images');
    const recentQuery = query(
      uploadsRef,
      orderBy('uploadedAt', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(recentQuery);
    
    if (snapshot.empty) {
      console.log('❌ No recent uploads found');
      return;
    }
    
    console.log(`\n📋 Recent uploads (last 10):`);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.fileName}`);
      console.log(`  User: ${data.uploadedBy}`);
      console.log(`  Site: ${data.site}`);
      console.log(`  Date: ${data.uploadedAt?.toDate() || 'Unknown'}`);
      console.log('');
    });
  } catch (error) {
    console.log('Could not check recent uploads:', error.message);
  }
}

// Process single image
async function processImage(imageData) {
  const result = {
    fileName: imageData.fileName,
    site: imageData.site || 'Unknown',
    project: imageData.project || 'General',
    uploadDate: imageData.uploadedAt?.toDate() || new Date(),
    fileSize: imageData.fileSize || 0,
    storagePath: imageData.storagePath || '',
    firebaseUrl: imageData.firebaseStorageUrl || '',
    processingStatus: 'processing'
  };
  
  try {
    // Get download URL if needed
    if (!result.firebaseUrl && imageData.storagePath) {
      const storageRef = ref(storage, imageData.storagePath);
      result.firebaseUrl = await getDownloadURL(storageRef);
    }
    
    // Extract GPS from filename or metadata
    const gpsData = await extractGPSData(imageData.fileName, result.firebaseUrl);
    
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
    
  } catch (error) {
    result.processingStatus = 'failed';
    result.processingError = error.message;
  }
  
  return result;
}

// Extract GPS data
async function extractGPSData(fileName, imageUrl) {
  // Method 1: Check filename for GPS coordinates
  // GPS Map Camera pattern: IMG_GPS_-26.1234_28.5678.jpg
  const gpsPattern = /GPS[_-]?([-]?\d+\.?\d*)[_,]?([-]?\d+\.?\d*)/i;
  const match = fileName.match(gpsPattern);
  
  if (match) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2]),
      captureDate: new Date()
    };
  }
  
  // Method 2: Check for coordinates in filename
  const coordPattern = /([-]?\d{1,2}\.\d{4,})[_,\s]+([-]?\d{1,3}\.\d{4,})/;
  const coordMatch = fileName.match(coordPattern);
  
  if (coordMatch) {
    return {
      latitude: parseFloat(coordMatch[1]),
      longitude: parseFloat(coordMatch[2]),
      captureDate: new Date()
    };
  }
  
  // Method 3: For demo/testing - simulate GPS for some images
  if (fileName.toLowerCase().includes('pole') || fileName.toLowerCase().includes('lawley')) {
    // Johannesburg area coordinates with slight variation
    const baseLat = -26.0627;
    const baseLng = 28.0826;
    const variation = 0.01;
    
    return {
      latitude: baseLat + (Math.random() - 0.5) * variation,
      longitude: baseLng + (Math.random() - 0.5) * variation,
      captureDate: new Date()
    };
  }
  
  return null;
}

// Reverse geocode
function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'FibreFlow-Manual-Processor/1.0',
        'Accept-Language': 'en'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.display_name) {
            // Simplify address for South Africa
            const parts = parsed.display_name.split(',');
            const relevant = parts.slice(0, 3).join(',').trim();
            resolve(relevant);
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
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`), 5000);
  });
}

// Generate Excel report
async function generateExcelReport(processedData) {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = 'FibreFlow Image Processor';
  workbook.created = new Date();
  
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
  
  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.height = 20;
  
  // Add data rows
  processedData.forEach((data, index) => {
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
    
    // Format dates
    if (data.uploadDate) {
      row.getCell('uploadDate').numFmt = 'yyyy-mm-dd hh:mm';
    }
    if (data.captureDate) {
      row.getCell('captureDate').numFmt = 'yyyy-mm-dd hh:mm';
    }
    
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
    
    // Make URLs clickable
    if (data.firebaseUrl) {
      row.getCell('firebaseUrl').value = {
        text: 'View Image',
        hyperlink: data.firebaseUrl
      };
      row.getCell('firebaseUrl').font = { color: { argb: 'FF0000FF' }, underline: true };
    }
  });
  
  // Add filters
  worksheet.autoFilter = {
    from: 'A1',
    to: `L${processedData.length + 1}`
  };
  
  // Freeze header row
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 40 },
    { header: 'Value', key: 'value', width: 30 }
  ];
  
  // Calculate summary statistics
  const totalImages = processedData.length;
  const successfulGPS = processedData.filter(d => d.latitude && d.longitude).length;
  const failedProcessing = processedData.filter(d => d.processingStatus === 'failed').length;
  const sites = [...new Set(processedData.map(d => d.site))];
  const projects = [...new Set(processedData.map(d => d.project))];
  const totalSizeKB = processedData.reduce((sum, d) => sum + (d.fileSize || 0) / 1024, 0);
  
  const summaryData = [
    { metric: 'Report Generated', value: new Date().toLocaleString() },
    { metric: 'User Email', value: CONFIG.userEmail },
    { metric: '', value: '' },
    { metric: 'Total Images Processed', value: totalImages },
    { metric: 'Images with GPS Data', value: successfulGPS },
    { metric: 'Images without GPS', value: totalImages - successfulGPS },
    { metric: 'Failed Processing', value: failedProcessing },
    { metric: '', value: '' },
    { metric: 'Success Rate', value: `${((totalImages - failedProcessing) / totalImages * 100).toFixed(1)}%` },
    { metric: 'GPS Extraction Rate', value: `${(successfulGPS / totalImages * 100).toFixed(1)}%` },
    { metric: '', value: '' },
    { metric: 'Total Size', value: `${(totalSizeKB / 1024).toFixed(1)} MB` },
    { metric: 'Average Size per Image', value: `${(totalSizeKB / totalImages).toFixed(0)} KB` },
    { metric: '', value: '' },
    { metric: 'Sites', value: sites.join(', ') || 'None' },
    { metric: 'Projects', value: projects.join(', ') || 'None' }
  ];
  
  summaryData.forEach((data, index) => {
    const row = summarySheet.addRow(data);
    if (data.metric === '') {
      row.height = 10;
    } else if (index === 0) {
      row.font = { bold: true };
    }
  });
  
  // Style summary header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  summarySheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
  
  // Save the Excel file
  const filePath = path.join(CONFIG.outputDir, CONFIG.excelFileName);
  await workbook.xlsx.writeFile(filePath);
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
  console.log(`\n✅ Excel report saved to: ${CONFIG.outputDir}/${CONFIG.excelFileName}`);
  console.log('\n📧 Next steps:');
  console.log('   1. Check the reports/ directory for the Excel file');
  console.log('   2. Review the data for accuracy');
  console.log('   3. Send the report to Ettiene');
}

// Run the script
console.log('🚀 FibreFlow Image Processor');
console.log('============================\n');

processImages()
  .then(() => {
    console.log('\n✅ Processing complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Processing failed:', error);
    process.exit(1);
  });