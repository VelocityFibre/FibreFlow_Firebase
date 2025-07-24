#!/usr/bin/env node

/**
 * Process CSV to Staging Firestore
 * 
 * Imports OneMap CSV files to a staging Firestore database
 * for validation before syncing to production
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse');
const { createReadStream } = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, collection, getDocs, writeBatch, serverTimestamp } = require('firebase/firestore');

// Staging Firebase configuration (separate from production)
const stagingConfig = {
  // TODO: Replace with actual staging project config
  apiKey: "your-staging-api-key",
  authDomain: "onemap-staging.firebaseapp.com", 
  projectId: "onemap-staging",
  storageBucket: "onemap-staging.appspot.com",
  messagingSenderId: "your-staging-sender-id",
  appId: "your-staging-app-id"
};

// For now, use the test database
const testConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBbaRXEkiVGHC5S_lLH8SWvgTJZDF6iTzQ",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "146498268846",
  appId: "1:146498268846:web:34fda96797dcec30dc6c74"
};

// Initialize Firebase with staging config
const app = initializeApp(testConfig); // Use test for now
const db = getFirestore(app);

// Configuration
const CONFIG = {
  BATCH_SIZE: 500,
  CSV_IMPORTS: 'staging/csv-imports',
  POLE_RECORDS: 'staging/pole-records', 
  IMPORT_BATCHES: 'staging/import-batches',
  VALIDATION_REPORTS: 'staging/validation-reports'
};

/**
 * Parse CSV file
 */
async function parseCSVFile(filePath) {
  console.log(`\n📄 Parsing CSV file: ${path.basename(filePath)}`);
  
  const records = [];
  const parser = createReadStream(filePath)
    .pipe(csv.parse({
      columns: true,
      skip_empty_lines: true,
      bom: true,
      delimiter: ';', // Semicolon delimiter for OneMap files
      relax_quotes: true
    }));
  
  for await (const record of parser) {
    records.push(record);
  }
  
  console.log(`   ✅ Parsed ${records.length} records`);
  return records;
}

/**
 * Extract date from filename
 */
function extractDateFromFilename(filename) {
  const patterns = [
    /(\d{2})(\d{2})(\d{4})/, // DDMMYYYY
    /(\d{4})-(\d{2})-(\d{2})/ // YYYY-MM-DD
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      if (match[0].length === 8) {
        // DDMMYYYY format
        const [, dd, mm, yyyy] = match;
        return `${yyyy}-${mm}-${dd}`;
      } else {
        // YYYY-MM-DD format
        return match[0];
      }
    }
  }
  
  return new Date().toISOString().split('T')[0];
}

/**
 * Process records to staging
 */
async function processToStaging(records, importDate, filename) {
  console.log(`\n📤 Importing to staging database...`);
  
  const stats = {
    total: records.length,
    imported: 0,
    updated: 0,
    failed: 0,
    poles: new Set(),
    properties: new Set()
  };
  
  // Create import batch record
  const batchId = `import_${importDate}_${Date.now()}`;
  const batchRef = doc(db, CONFIG.IMPORT_BATCHES, batchId);
  
  await setDoc(batchRef, {
    id: batchId,
    filename,
    importDate,
    startedAt: serverTimestamp(),
    status: 'processing',
    totalRecords: records.length
  });
  
  // Process in batches
  const batches = [];
  for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
    batches.push(records.slice(i, i + CONFIG.BATCH_SIZE));
  }
  
  console.log(`   Processing ${batches.length} batches...`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const writeBatchOp = writeBatch(db);
    
    for (const record of batch) {
      try {
        const propertyId = record['Property ID'];
        if (!propertyId) {
          stats.failed++;
          continue;
        }
        
        stats.properties.add(propertyId);
        
        // Add pole to tracking if present
        const poleNumber = record['Pole Number'];
        if (poleNumber && poleNumber.trim()) {
          stats.poles.add(poleNumber);
        }
        
        // Create document data
        const docData = {
          ...record,
          _importBatch: batchId,
          _importDate: importDate,
          _lastUpdated: serverTimestamp()
        };
        
        // Save to csv-imports collection
        const docRef = doc(db, CONFIG.CSV_IMPORTS, propertyId);
        writeBatchOp.set(docRef, docData, { merge: true });
        
        stats.imported++;
        
      } catch (error) {
        console.error(`Error processing record:`, error.message);
        stats.failed++;
      }
    }
    
    // Commit batch
    await writeBatchOp.commit();
    console.log(`   ✓ Batch ${batchIndex + 1}/${batches.length} completed`);
  }
  
  // Update batch record with results
  await setDoc(batchRef, {
    completedAt: serverTimestamp(),
    status: 'completed',
    stats: {
      imported: stats.imported,
      updated: stats.updated,
      failed: stats.failed,
      uniqueProperties: stats.properties.size,
      uniquePoles: stats.poles.size
    }
  }, { merge: true });
  
  return stats;
}

/**
 * Generate import report
 */
async function generateImportReport(stats, importDate, filename) {
  console.log(`\n📊 Import Summary for ${filename}:`);
  console.log(`   Date: ${importDate}`);
  console.log(`   Total Records: ${stats.total}`);
  console.log(`   Successfully Imported: ${stats.imported}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Unique Properties: ${stats.properties.size}`);
  console.log(`   Unique Poles: ${stats.poles.size}`);
  
  // Save validation report
  const reportRef = doc(db, CONFIG.VALIDATION_REPORTS, importDate);
  await setDoc(reportRef, {
    filename,
    importDate,
    generatedAt: serverTimestamp(),
    stats: {
      total: stats.total,
      imported: stats.imported,
      failed: stats.failed,
      uniqueProperties: stats.properties.size,
      uniquePoles: stats.poles.size
    },
    status: stats.failed === 0 ? 'success' : 'partial'
  });
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 CSV to Staging Firestore Importer');
  console.log('=====================================');
  
  // Get file from command line
  const args = process.argv.slice(2);
  const filename = args.find(a => !a.startsWith('--')) || args.find(a => a.startsWith('--file='))?.split('=')[1];
  
  if (!filename) {
    console.error('❌ Please provide a CSV filename');
    console.log('Usage: node process-csv-to-staging.js [filename]');
    console.log('   or: node process-csv-to-staging.js --file=[filename]');
    process.exit(1);
  }
  
  // Build file path
  const filePath = path.isAbsolute(filename) 
    ? filename 
    : path.join(__dirname, '../../../downloads', filename);
  
  // Check file exists
  try {
    await fs.access(filePath);
  } catch (error) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Extract date from filename
  const importDate = extractDateFromFilename(filename);
  console.log(`\n📅 Import Date: ${importDate}`);
  
  try {
    // Parse CSV
    const records = await parseCSVFile(filePath);
    
    // Import to staging
    const stats = await processToStaging(records, importDate, filename);
    
    // Generate report
    await generateImportReport(stats, importDate, filename);
    
    console.log('\n✅ Import completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run validation checks: node ../validation/check-data-quality.js');
    console.log('2. Generate pole reports: node ../reports/generate-pole-reports.js');
    console.log('3. When ready, sync to production: node ../sync/sync-to-production.js');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parseCSVFile, processToStaging };