#!/usr/bin/env node

/**
 * Enhanced Photo Tracking Functions
 * Tracks both summary statistics and detailed per-pole photo information
 */

const fs = require('fs');
const path = require('path');

// Enhanced Photo Tracking with Per-Pole Details
function trackPhotoDetailsPerPole(records, csvFileName, allHeaders, allValues) {
  const photoMetrics = {
    totalRecords: 0,
    withPhotos: 0,
    completed: 0,
    completedWithPhotos: 0,
    inProgress: 0,
    inProgressWithPhotos: 0
  };

  // Per-pole tracking
  const polePhotoDetails = [];
  const missingPhotoCritical = []; // Completed installations without photos
  const missingPhotoWarning = []; // In-progress without photos

  // Find photo field index
  const photoFieldIndex = allHeaders.findIndex(h => h.includes('Photo of Property'));
  
  records.forEach((record, index) => {
    photoMetrics.totalRecords++;
    
    const propertyId = record['Property ID'] || '';
    const poleNumber = record['Pole Number'] || '';
    const dropNumber = record['Drop Number'] || '';
    const status = record['Status Update'] || record['Status'] || '';
    const address = record['Location Address'] || '';
    const agent = record['Field Agent Name (pole permission)'] || record['Field Agent Name (Home Sign Ups)'] || '';
    
    const photoId = photoFieldIndex >= 0 && allValues[index] && 
                   allValues[index][photoFieldIndex] || '';
    const hasPhoto = photoId && photoId.trim() !== '';
    
    if (hasPhoto) photoMetrics.withPhotos++;
    
    // Track per-pole details
    const poleDetail = {
      propertyId,
      poleNumber: poleNumber || 'NO_POLE',
      dropNumber: dropNumber || 'NO_DROP',
      status,
      address: address.substring(0, 50), // Truncate for readability
      agent,
      photoId: hasPhoto ? photoId : null,
      hasPhoto,
      stage: determineStage(status)
    };
    
    polePhotoDetails.push(poleDetail);
    
    // Track critical missing photos
    if (status.includes('Installed')) {
      photoMetrics.completed++;
      if (hasPhoto) {
        photoMetrics.completedWithPhotos++;
      } else {
        missingPhotoCritical.push(poleDetail);
      }
    } else if (status.includes('In Progress')) {
      photoMetrics.inProgress++;
      if (hasPhoto) {
        photoMetrics.inProgressWithPhotos++;
      } else {
        missingPhotoWarning.push(poleDetail);
      }
    }
  });

  // Calculate percentages
  const photoPercentage = ((photoMetrics.withPhotos / photoMetrics.totalRecords) * 100).toFixed(1);
  const completedPhotoPercentage = photoMetrics.completed > 0 ? 
    ((photoMetrics.completedWithPhotos / photoMetrics.completed) * 100).toFixed(1) : '0.0';
  const inProgressPhotoPercentage = photoMetrics.inProgress > 0 ? 
    ((photoMetrics.inProgressWithPhotos / photoMetrics.inProgress) * 100).toFixed(1) : '0.0';

  return {
    summary: {
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
    },
    poleDetails: polePhotoDetails,
    missingPhotoCritical,
    missingPhotoWarning
  };
}

function determineStage(status) {
  if (status.includes('Pole Permission')) return 'Planning';
  if (status.includes('Home Sign Ups')) return 'Sign-up';
  if (status.includes('Installation Scheduled')) return 'Scheduled';
  if (status.includes('In Progress')) return 'Installation';
  if (status.includes('Installed') || status.includes('Complete')) return 'Completed';
  return 'Unknown';
}

function logDetailedPhotoReport(photoData, csvFileName) {
  const reportsDir = path.join(__dirname, '../../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // 1. Update summary log (existing)
  const logFile = path.join(reportsDir, 'quality-log.csv');
  if (!fs.existsSync(logFile)) {
    const header = 'Date,Time,File,Total Records,With Photos,Photo %,Completed,Completed w/Photos,Completed Photo %,In Progress,In Progress w/Photos,In Progress Photo %\n';
    fs.writeFileSync(logFile, header);
  }
  
  const summary = photoData.summary;
  const row = `${summary.date},${summary.time},${summary.fileName},${summary.totalRecords},${summary.withPhotos},${summary.photoPercentage},${summary.completed},${summary.completedWithPhotos},${summary.completedPhotoPercentage},${summary.inProgress},${summary.inProgressWithPhotos},${summary.inProgressPhotoPercentage}\n`;
  fs.appendFileSync(logFile, row);

  // 2. Create detailed per-pole report
  const detailFile = path.join(reportsDir, `photo-details-${summary.date}-${Date.now()}.csv`);
  const detailHeader = 'Property ID,Pole Number,Drop Number,Status,Stage,Has Photo,Photo ID,Address,Agent\n';
  const detailRows = photoData.poleDetails.map(d => 
    `${d.propertyId},${d.poleNumber},${d.dropNumber},"${d.status}",${d.stage},${d.hasPhoto ? 'YES' : 'NO'},${d.photoId || 'MISSING'},"${d.address}","${d.agent}"`
  ).join('\n');
  
  fs.writeFileSync(detailFile, detailHeader + detailRows);

  // 3. Create critical missing photos report
  if (photoData.missingPhotoCritical.length > 0) {
    const criticalFile = path.join(reportsDir, `critical-missing-photos-${summary.date}.csv`);
    const criticalHeader = 'Property ID,Pole Number,Drop Number,Status,Address,Agent,Action Required\n';
    const criticalRows = photoData.missingPhotoCritical.map(d => 
      `${d.propertyId},${d.poleNumber},${d.dropNumber},"${d.status}","${d.address}","${d.agent}","URGENT: Get photo for completed installation"`
    ).join('\n');
    
    fs.writeFileSync(criticalFile, criticalHeader + criticalRows);
  }

  return {
    summaryLog: logFile,
    detailReport: detailFile,
    criticalReport: photoData.missingPhotoCritical.length > 0 ? 
      path.join(reportsDir, `critical-missing-photos-${summary.date}.csv`) : null
  };
}

function displayPhotoResults(photoData) {
  const summary = photoData.summary;
  
  console.log(`\n📸 Photo Tracking Results:`);
  console.log(`   📷 Overall photo coverage: ${summary.photoPercentage}%`);
  console.log(`   ✅ Completed installations: ${summary.completedPhotoPercentage}% have photos`);
  console.log(`   🔄 In-progress installations: ${summary.inProgressPhotoPercentage}% have photos`);
  
  // Show critical issues
  if (photoData.missingPhotoCritical.length > 0) {
    console.log(`\n   🚨 CRITICAL: ${photoData.missingPhotoCritical.length} completed installations missing photos!`);
    console.log(`   Missing photos for poles:`);
    photoData.missingPhotoCritical.slice(0, 5).forEach(d => {
      console.log(`     - ${d.poleNumber || d.dropNumber} at ${d.address}`);
    });
    if (photoData.missingPhotoCritical.length > 5) {
      console.log(`     ... and ${photoData.missingPhotoCritical.length - 5} more`);
    }
  }
  
  // Show warnings
  if (photoData.missingPhotoWarning.length > 10) {
    console.log(`\n   ⚠️  WARNING: ${photoData.missingPhotoWarning.length} in-progress installations without photos`);
  }
  
  // Summary by pole
  const polesWithPhotos = photoData.poleDetails.filter(d => d.poleNumber !== 'NO_POLE' && d.hasPhoto).length;
  const totalPoles = photoData.poleDetails.filter(d => d.poleNumber !== 'NO_POLE').length;
  if (totalPoles > 0) {
    console.log(`\n   📊 Poles with photos: ${polesWithPhotos}/${totalPoles} (${((polesWithPhotos/totalPoles)*100).toFixed(1)}%)`);
  }
}

// Export functions for use in import script
module.exports = {
  trackPhotoDetailsPerPole,
  logDetailedPhotoReport,
  displayPhotoResults
};