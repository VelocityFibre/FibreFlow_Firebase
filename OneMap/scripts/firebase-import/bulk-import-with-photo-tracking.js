#!/usr/bin/env node

/**
 * Enhanced OneMap CSV Import with Status History Tracking + Photo Quality Tracking
 * Preserves complete status change history AND tracks photo quality metrics
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

// Key fields we care about
const KEY_FIELDS = [
  'Property ID', '1map NAD ID', 'Status', 'Flow Name Groups',
  'Site', 'Sections', 'PONs', 'Location Address',
  'Pole Number', 'Drop Number', 'Stand Number',
  'Field Agent Name (pole permission)', 'Last Modified Pole Permissions Date',
  'Latitude', 'Longitude', 'Status Update',
  'Photo of Property' // Add photo field
];

// Photo Quality Tracking Class
class PhotoQualityTracker {
  constructor() {
    this.logFile = path.join(__dirname, '../../reports/quality-log.csv');
    this.metrics = {
      totalRecords: 0,
      withPhotos: 0,
      completed: 0,
      completedWithPhotos: 0,
      inProgress: 0,
      inProgressWithPhotos: 0
    };
  }

  trackRecord(record) {
    this.metrics.totalRecords++;
    
    const status = record['Status Update'] || record['Status'] || '';
    const hasPhoto = record['Photo of Property'] && record['Photo of Property'].trim() !== '';
    
    if (hasPhoto) {
      this.metrics.withPhotos++;
    }
    
    if (status.includes('Installed')) {
      this.metrics.completed++;
      if (hasPhoto) this.metrics.completedWithPhotos++;
    } else if (status.includes('In Progress')) {
      this.metrics.inProgress++;
      if (hasPhoto) this.metrics.inProgressWithPhotos++;
    }
  }

  generateReport(fileName) {
    const photoPercentage = ((this.metrics.withPhotos / this.metrics.totalRecords) * 100).toFixed(1);
    const completedPhotoPercentage = this.metrics.completed > 0 ? 
      ((this.metrics.completedWithPhotos / this.metrics.completed) * 100).toFixed(1) : '0.0';
    const inProgressPhotoPercentage = this.metrics.inProgress > 0 ? 
      ((this.metrics.inProgressWithPhotos / this.metrics.inProgress) * 100).toFixed(1) : '0.0';

    return {
      fileName: path.basename(fileName),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      totalRecords: this.metrics.totalRecords,
      withPhotos: this.metrics.withPhotos,
      photoPercentage,
      completed: this.metrics.completed,
      completedWithPhotos: this.metrics.completedWithPhotos,
      completedPhotoPercentage,
      inProgress: this.metrics.inProgress,
      inProgressWithPhotos: this.metrics.inProgressWithPhotos,
      inProgressPhotoPercentage
    };
  }

  logToCSV(report) {
    // Create log file if doesn't exist
    if (!fs.existsSync(this.logFile)) {
      const dir = path.dirname(this.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const header = 'Date,Time,File,Total Records,With Photos,Photo %,Completed,Completed w/Photos,Completed Photo %,In Progress,In Progress w/Photos,In Progress Photo %\n';
      fs.writeFileSync(this.logFile, header);
    }

    // Append metrics
    const row = `${report.date},${report.time},${report.fileName},${report.totalRecords},${report.withPhotos},${report.photoPercentage},${report.completed},${report.completedWithPhotos},${report.completedPhotoPercentage},${report.inProgress},${report.inProgressWithPhotos},${report.inProgressPhotoPercentage}\n`;
    fs.appendFileSync(this.logFile, row);
  }

  displayResults(report) {
    console.log('\n📸 PHOTO QUALITY METRICS');
    console.log('='.repeat(50));
    console.log(`📊 Total Records: ${report.totalRecords}`);
    console.log(`📷 With Photos: ${report.withPhotos} (${report.photoPercentage}%)`);
    console.log(`✅ Completed: ${report.completed} (${report.completedPhotoPercentage}% have photos)`);
    console.log(`🔄 In Progress: ${report.inProgress} (${report.inProgressPhotoPercentage}% have photos)`);
    
    // Quality alerts
    if (report.completed > 0 && parseFloat(report.completedPhotoPercentage) < 100) {
      console.log(`🚨 ALERT: ${report.completed - report.completedWithPhotos} completed installations missing photos!`);
    }
    
    if (parseFloat(report.photoPercentage) < 30) {
      console.log(`⚠️  WARNING: Overall photo coverage is low (${report.photoPercentage}%)`);
    }
    
    console.log(`📁 Quality log updated: ${this.logFile}`);
  }
}

async function parseCSVWithPhotoTracking(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    const photoTracker = new PhotoQualityTracker();
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers = null;
    let lineNumber = 0;

    rl.on('line', (line) => {
      lineNumber++;
      
      // Skip BOM if present
      if (lineNumber === 1 && line.charCodeAt(0) === 0xFEFF) {
        line = line.substr(1);
      }
      
      if (!headers) {
        headers = line.split(';').map(h => h.trim().replace(/^"|"$/g, ''));
        return;
      }

      const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length !== headers.length) {
        return; // Skip malformed rows
      }

      const record = {};
      headers.forEach((header, index) => {
        if (KEY_FIELDS.includes(header)) {
          record[header] = values[index] || '';
        }
      });

      // Track photo data
      if (headers.includes('Photo of Property')) {
        record['Photo of Property'] = values[headers.indexOf('Photo of Property')] || '';
      }

      if (record['Property ID']) {
        records.push(record);
        photoTracker.trackRecord(record);
      }
    });

    rl.on('close', () => {
      resolve({ records, photoTracker });
    });

    rl.on('error', reject);
  });
}

async function importCSVWithHistoryAndPhotos(csvFileName) {
  try {
    console.log('🚀 Enhanced import with status history + photo quality tracking...\n');
    
    const csvPath = path.join(__dirname, '../downloads', csvFileName);
    const { records, photoTracker } = await parseCSVWithPhotoTracking(csvPath);
    
    console.log(`📊 Found ${records.length} records to import\n`);
    
    const batchSize = 500;
    const importBatchId = `IMP_${Date.now()}`;
    const importDate = new Date().toISOString();
    let processed = 0;
    let statusChanges = 0;
    let newRecords = 0;
    
    // Extract date from filename (e.g., "26052025" -> "2025-05-26")
    const dateMatch = csvFileName.match(/(\d{2})(\d{2})(\d{4})/);
    const csvDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : importDate.split('T')[0];
    
    // Process all records in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = db.batch();
      const chunk = records.slice(i, i + batchSize);
      
      for (const record of chunk) {
        const propertyId = record['Property ID'];
        const docRef = db.collection('vf-onemap-processed-records').doc(propertyId);
        
        // Get existing record to check for status changes
        const existingDoc = await docRef.get();
        const existingData = existingDoc.exists ? existingDoc.data() : null;
        
        // Get current status from CSV
        const currentStatus = record['Status Update'] || record['Status'] || '';
        const currentAgent = record['Field Agent Name (pole permission)'] || '';
        const hasPhoto = record['Photo of Property'] && record['Photo of Property'].trim() !== '';
        
        // Build status history entry
        const statusEntry = {
          date: csvDate,
          status: currentStatus,
          agent: currentAgent,
          hasPhoto: hasPhoto,
          photoId: record['Photo of Property'] || '',
          batchId: importBatchId,
          fileName: csvFileName,
          timestamp: importDate
        };
        
        let statusHistory = [];
        let isStatusChange = false;
        
        if (existingData) {
          // Preserve existing history
          statusHistory = existingData.statusHistory || [];
          
          // Check if status actually changed
          if (existingData.currentStatus !== currentStatus && currentStatus) {
            statusHistory.push(statusEntry);
            isStatusChange = true;
            statusChanges++;
          }
        } else {
          // New record - add initial status to history
          if (currentStatus) {
            statusHistory = [statusEntry];
          }
          newRecords++;
        }
        
        const cleanRecord = {
          // Core fields
          propertyId: propertyId,
          'Property ID': propertyId,
          onemapNadId: record['1map NAD ID'] || '',
          
          // Current status (latest)
          currentStatus: currentStatus,
          currentAgent: currentAgent,
          
          // Photo tracking
          hasPhoto: hasPhoto,
          photoId: record['Photo of Property'] || '',
          
          // Status history array (now includes photo data)
          statusHistory: statusHistory,
          
          // Other fields
          'Status Update': currentStatus,
          flowNameGroups: record['Flow Name Groups'] || '',
          site: record['Site'] || '',
          sections: record['Sections'] || '',
          pons: record['PONs'] || '',
          locationAddress: record['Location Address'] || '',
          'Location Address': record['Location Address'] || '',
          poleNumber: record['Pole Number'] || '',
          'Pole Number': record['Pole Number'] || '',
          dropNumber: record['Drop Number'] || '',
          'Drop Number': record['Drop Number'] || '',
          standNumber: record['Stand Number'] || '',
          fieldAgentName: currentAgent,
          'Field Agent Name (pole permission)': currentAgent,
          lastModifiedDate: record['Last Modified Pole Permissions Date'] || '',
          
          // GPS fields
          latitude: record['Latitude'] || '',
          'GPS Latitude': record['Latitude'] || '',
          longitude: record['Longitude'] || '',
          'GPS Longitude': record['Longitude'] || '',
          
          // Import metadata
          importBatchId: importBatchId,
          fileName: csvFileName,
          lastImportDate: importDate,
          importedAt: admin.firestore.FieldValue.serverTimestamp(),
          
          // Track if this record had a status change
          hadStatusChangeInImport: isStatusChange
        };
        
        batch.set(docRef, cleanRecord, { merge: true });
      }
      
      await batch.commit();
      processed += chunk.length;
      console.log(`✅ Processed ${processed}/${records.length} records`);
    }
    
    // Generate photo quality report
    const photoReport = photoTracker.generateReport(csvFileName);
    photoTracker.logToCSV(photoReport);
    photoTracker.displayResults(photoReport);
    
    // Generate import summary
    console.log('\n📋 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`📁 File: ${csvFileName}`);
    console.log(`📊 Total Records: ${records.length}`);
    console.log(`🆕 New Records: ${newRecords}`);
    console.log(`🔄 Status Changes: ${statusChanges}`);
    console.log(`🏷️  Import Batch ID: ${importBatchId}`);
    console.log(`📅 CSV Date: ${csvDate}`);
    console.log(`⏰ Import Date: ${importDate}`);
    
    // Create summary report
    const summaryReport = {
      fileName: csvFileName,
      importBatchId,
      importDate,
      csvDate,
      totalRecords: records.length,
      newRecords,
      statusChanges,
      processed,
      photoQuality: photoReport
    };
    
    // Save summary to file
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const summaryFile = path.join(reportsDir, `import-summary-${importBatchId}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summaryReport, null, 2));
    
    console.log(`\n📄 Summary saved: ${summaryFile}`);
    console.log('✅ Import completed successfully!');
    
    return importBatchId;
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const csvFileName = process.argv[2];
  
  if (!csvFileName) {
    console.log('Usage: node bulk-import-with-photo-tracking.js <csv-filename>');
    console.log('Example: node bulk-import-with-photo-tracking.js "Lawley July Week 4 21072025.csv"');
    process.exit(1);
  }
  
  importCSVWithHistoryAndPhotos(csvFileName)
    .then(batchId => {
      console.log(`\n🎉 Import completed with batch ID: ${batchId}`);
      console.log('\nNext steps:');
      console.log('1. Check quality-log.csv for photo tracking');
      console.log('2. Run sync-to-production.js if ready for production');
    })
    .catch(error => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importCSVWithHistoryAndPhotos };