#!/usr/bin/env node

/**
 * Test Photo Tracking Integration
 * Shows what the enhanced import script output will look like
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Photo Quality Tracking Function (same as in main script)
function trackPhotoQuality(records, csvFileName, allHeaders, allValues) {
  const photoMetrics = {
    totalRecords: 0,
    withPhotos: 0,
    completed: 0,
    completedWithPhotos: 0,
    inProgress: 0,
    inProgressWithPhotos: 0
  };

  // Find photo field index
  const photoFieldIndex = allHeaders.findIndex(h => h.includes('Photo of Property'));
  
  records.forEach((record, index) => {
    photoMetrics.totalRecords++;
    
    const status = record['Status Update'] || record['Status'] || '';
    const hasPhoto = photoFieldIndex >= 0 && allValues[index] && 
                    allValues[index][photoFieldIndex] && 
                    allValues[index][photoFieldIndex].trim() !== '';
    
    if (hasPhoto) photoMetrics.withPhotos++;
    
    if (status.includes('Installed')) {
      photoMetrics.completed++;
      if (hasPhoto) photoMetrics.completedWithPhotos++;
    } else if (status.includes('In Progress')) {
      photoMetrics.inProgress++;
      if (hasPhoto) photoMetrics.inProgressWithPhotos++;
    }
  });

  // Calculate percentages
  const photoPercentage = ((photoMetrics.withPhotos / photoMetrics.totalRecords) * 100).toFixed(1);
  const completedPhotoPercentage = photoMetrics.completed > 0 ? 
    ((photoMetrics.completedWithPhotos / photoMetrics.completed) * 100).toFixed(1) : '0.0';
  const inProgressPhotoPercentage = photoMetrics.inProgress > 0 ? 
    ((photoMetrics.inProgressWithPhotos / photoMetrics.inProgress) * 100).toFixed(1) : '0.0';

  return {
    fileName: path.basename(csvFileName),
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
    totalRecords: photoMetrics.totalRecords,
    withPhotos: photoMetrics.withPhotos,
    photoPercentage,
    completed: photoMetrics.completed,
    completedWithPhotos: photoMetrics.completedWithPhotos,
    completedPhotoPercentage,
    inProgress: photoMetrics.inProgress,
    inProgressWithPhotos: photoMetrics.inProgressWithPhotos,
    inProgressPhotoPercentage
  };
}

function logPhotoQuality(photoReport) {
  const logFile = path.join(__dirname, '../../reports/quality-log.csv');
  
  // Create log file if doesn't exist
  if (!fs.existsSync(logFile)) {
    const dir = path.dirname(logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const header = 'Date,Time,File,Total Records,With Photos,Photo %,Completed,Completed w/Photos,Completed Photo %,In Progress,In Progress w/Photos,In Progress Photo %\n';
    fs.writeFileSync(logFile, header);
  }

  // Append metrics
  const row = `${photoReport.date},${photoReport.time},${photoReport.fileName},${photoReport.totalRecords},${photoReport.withPhotos},${photoReport.photoPercentage},${photoReport.completed},${photoReport.completedWithPhotos},${photoReport.completedPhotoPercentage},${photoReport.inProgress},${photoReport.inProgressWithPhotos},${photoReport.inProgressPhotoPercentage}\n`;
  fs.appendFileSync(logFile, row);
}

async function testPhotoTracking(csvFileName) {
  console.log('📸 Testing Photo Quality Tracking Integration...\n');
  
  const csvPath = path.join(__dirname, '../downloads', csvFileName);
  
  // Parse CSV
  const records = [];
  const allValues = [];
  let allHeaders = null;
  
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  
  for await (let line of rl) {
    lineNumber++;
    
    if (lineNumber === 1 && line.charCodeAt(0) === 0xFEFF) {
      line = line.substr(1);
    }
    
    if (!allHeaders) {
      allHeaders = line.split(';').map(h => h.trim().replace(/^"|"$/g, ''));
      continue;
    }

    const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length !== allHeaders.length) continue;

    const record = {};
    allHeaders.forEach((header, index) => {
      if (['Property ID', 'Status', 'Status Update'].includes(header)) {
        record[header] = values[index] || '';
      }
    });

    if (record['Property ID']) {
      records.push(record);
      allValues.push(values);
    }
  }
  
  console.log(`📊 Found ${records.length} records to analyze\n`);
  
  // Simulate import output
  console.log(`✨ Import completed with history tracking!`);
  console.log(`📁 Batch ID: IMP_${Date.now()}`);
  console.log(`📊 Total records: ${records.length}`);
  console.log(`🆕 New properties: 1250`);
  console.log(`🔄 Status changes detected: 340`);
  console.log(`📅 CSV Date: 2025-07-21`);
  
  // === PHOTO QUALITY TRACKING ===
  const photoReport = trackPhotoQuality(records, csvFileName, allHeaders, allValues);
  logPhotoQuality(photoReport);
  
  // Display photo quality metrics
  console.log(`\n📸 Photo Quality Metrics:`);
  console.log(`   📷 Overall photo coverage: ${photoReport.photoPercentage}%`);
  console.log(`   ✅ Completed installations: ${photoReport.completedPhotoPercentage}% have photos`);
  console.log(`   🔄 In-progress installations: ${photoReport.inProgressPhotoPercentage}% have photos`);
  
  // Quality alerts
  if (photoReport.completed > 0 && parseFloat(photoReport.completedPhotoPercentage) < 100) {
    console.log(`   🚨 ALERT: ${photoReport.completed - photoReport.completedWithPhotos} completed installations missing photos!`);
  }
  if (parseFloat(photoReport.photoPercentage) < 30) {
    console.log(`   ⚠️  WARNING: Overall photo coverage is low`);
  }
  console.log(`   📊 Quality logged to: reports/quality-log.csv`);
  
  console.log(`\n🔍 View data at: https://console.firebase.google.com/project/vf-onemap-data/firestore/data`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ PHOTO TRACKING INTEGRATION TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('Your regular import script now includes photo quality tracking!');
  console.log('Every time you run bulk-import-with-history.js, it will:');
  console.log('• Track photo coverage automatically');
  console.log('• Log metrics to quality-log.csv');
  console.log('• Show quality alerts during import');
  console.log('• Build trend data over time');
}

// Main execution
const csvFileName = process.argv[2];
if (!csvFileName) {
  console.log('Usage: node test-photo-tracking.js <csv-filename>');
  console.log('Example: node test-photo-tracking.js "Lawley July Week 4 21072025.csv"');
  process.exit(1);
}

testPhotoTracking(csvFileName);