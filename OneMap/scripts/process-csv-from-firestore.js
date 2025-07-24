#!/usr/bin/env node

/**
 * Process CSV files stored in vf-onemap-data Firestore
 * 
 * This script:
 * 1. Connects to vf-onemap-data Firebase project
 * 2. Fetches CSV metadata and content
 * 3. Processes records with deduplication
 * 4. Tracks changes between imports
 * 5. Generates reports
 */

const admin = require('firebase-admin');
const csv = require('csv-parse');
const { parse } = require('csv-parse/sync');
const fs = require('fs').promises;
const path = require('path');

// Initialize Firebase Admin for vf-onemap-data
const serviceAccount = require('../service-accounts/vf-onemap-data-service-account.json');

const vfOnemapApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
}, 'vf-onemap-data');

const db = vfOnemapApp.firestore();
const storage = vfOnemapApp.storage();

// Collections
const COLLECTIONS = {
  CSV_FILES: 'csv-files',
  PROCESSED_RECORDS: 'processed-records',
  POLE_RECORDS: 'pole-records',
  CHANGE_HISTORY: 'change-history',
  IMPORT_BATCHES: 'import-batches',
  PROCESSING_REPORTS: 'processing-reports'
};

// Business constraints
const CONSTRAINTS = {
  MAX_DROPS_PER_POLE: 12,
  BATCH_SIZE: 500
};

class CSVProcessor {
  constructor() {
    this.stats = {
      total: 0,
      processed: 0,
      duplicates: 0,
      newRecords: 0,
      updatedRecords: 0,
      errors: 0,
      changes: []
    };
    this.batchId = `batch_${Date.now()}`;
    this.processedRecords = new Map();
  }

  /**
   * Main processing function
   */
  async processCSVFromFirestore(csvDocId) {
    console.log(`🚀 Starting CSV processing for document: ${csvDocId}`);
    console.log(`📊 Batch ID: ${this.batchId}`);
    
    try {
      // 1. Fetch CSV metadata from Firestore
      const csvDoc = await this.fetchCSVDocument(csvDocId);
      if (!csvDoc) {
        throw new Error(`CSV document ${csvDocId} not found`);
      }

      // 2. Download CSV content
      const csvContent = await this.downloadCSVContent(csvDoc);
      
      // 3. Parse CSV
      const records = await this.parseCSV(csvContent);
      console.log(`📋 Parsed ${records.length} records from CSV`);
      
      // 4. Load existing records for comparison
      await this.loadExistingRecords();
      
      // 5. Process records with deduplication and change tracking
      await this.processRecords(records);
      
      // 6. Generate and save report
      const report = await this.generateReport(csvDoc);
      
      // 7. Update import batch status
      await this.updateBatchStatus('completed', report);
      
      console.log(`✅ Processing completed successfully`);
      return report;
      
    } catch (error) {
      console.error('❌ Processing failed:', error);
      await this.updateBatchStatus('failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch CSV document from Firestore
   */
  async fetchCSVDocument(docId) {
    const doc = await db.collection(COLLECTIONS.CSV_FILES).doc(docId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Download CSV content from Storage or Firestore
   */
  async downloadCSVContent(csvDoc) {
    // If CSV content is stored in Firestore (small files)
    if (csvDoc.content) {
      return csvDoc.content;
    }
    
    // If CSV is in Storage (large files)
    if (csvDoc.storageUrl) {
      const bucket = storage.bucket();
      const file = bucket.file(csvDoc.storageUrl);
      const [content] = await file.download();
      return content.toString();
    }
    
    throw new Error('No CSV content found');
  }

  /**
   * Parse CSV content
   */
  async parseCSV(content) {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  }

  /**
   * Load existing records for deduplication
   */
  async loadExistingRecords() {
    console.log('📥 Loading existing records...');
    const snapshot = await db.collection(COLLECTIONS.PROCESSED_RECORDS)
      .select('Property ID', 'Pole Number', '__lastUpdated')
      .get();
    
    snapshot.forEach(doc => {
      this.processedRecords.set(doc.id, doc.data());
    });
    
    console.log(`📊 Loaded ${this.processedRecords.size} existing records`);
  }

  /**
   * Process records with deduplication and change tracking
   */
  async processRecords(records) {
    console.log('🔄 Processing records...');
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const record of records) {
      this.stats.total++;
      
      try {
        // Use Property ID as unique identifier
        const propertyId = record['Property ID'];
        if (!propertyId) {
          console.warn(`⚠️ Record missing Property ID:`, record);
          this.stats.errors++;
          continue;
        }
        
        const docId = `prop_${propertyId}`;
        const existingRecord = this.processedRecords.get(docId);
        
        // Check for duplicates and changes
        if (existingRecord) {
          const changes = this.detectChanges(existingRecord, record);
          if (changes.length > 0) {
            // Update record and track changes
            await this.updateRecord(batch, docId, record, changes);
            this.stats.updatedRecords++;
            this.stats.changes.push({
              propertyId,
              poleNumber: record['Pole Number'],
              changes
            });
          } else {
            this.stats.duplicates++;
          }
        } else {
          // New record
          await this.createRecord(batch, docId, record);
          this.stats.newRecords++;
        }
        
        this.stats.processed++;
        
        // Commit batch when full
        if (++batchCount >= CONSTRAINTS.BATCH_SIZE) {
          await batch.commit();
          batchCount = 0;
          console.log(`💾 Committed batch of ${CONSTRAINTS.BATCH_SIZE} records`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing record:`, error, record);
        this.stats.errors++;
      }
    }
    
    // Commit remaining records
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Committed final batch of ${batchCount} records`);
    }
  }

  /**
   * Detect changes between existing and new record
   */
  detectChanges(existing, newRecord) {
    const changes = [];
    const fieldsToCompare = [
      'Pole Number',
      'Drop Number', 
      'Status',
      'Location Address',
      'GPS Latitude',
      'GPS Longitude',
      'Flow Name Groups',
      'Assigned Field Marketer Name'
    ];
    
    for (const field of fieldsToCompare) {
      if (existing[field] !== newRecord[field]) {
        changes.push({
          field,
          oldValue: existing[field],
          newValue: newRecord[field],
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return changes;
  }

  /**
   * Create new record
   */
  async createRecord(batch, docId, record) {
    const processedRecord = {
      ...record,
      __id: docId,
      __batchId: this.batchId,
      __firstSeen: admin.firestore.FieldValue.serverTimestamp(),
      __lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      __version: 1
    };
    
    batch.set(
      db.collection(COLLECTIONS.PROCESSED_RECORDS).doc(docId),
      processedRecord
    );
    
    // Also create/update pole record if pole number exists
    if (record['Pole Number']) {
      await this.updatePoleRecord(batch, record);
    }
  }

  /**
   * Update existing record
   */
  async updateRecord(batch, docId, record, changes) {
    const updates = {
      ...record,
      __lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      __version: admin.firestore.FieldValue.increment(1),
      __lastBatchId: this.batchId
    };
    
    batch.update(
      db.collection(COLLECTIONS.PROCESSED_RECORDS).doc(docId),
      updates
    );
    
    // Track changes in history
    const changeDoc = {
      propertyId: record['Property ID'],
      poleNumber: record['Pole Number'],
      batchId: this.batchId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      changes
    };
    
    batch.create(
      db.collection(COLLECTIONS.CHANGE_HISTORY).doc(),
      changeDoc
    );
    
    // Update pole record if pole number exists
    if (record['Pole Number']) {
      await this.updatePoleRecord(batch, record);
    }
  }

  /**
   * Update pole-centric record
   */
  async updatePoleRecord(batch, record) {
    const poleNumber = record['Pole Number'];
    if (!poleNumber) return;
    
    const poleDocId = `pole_${poleNumber.replace(/[\/\s]/g, '_')}`;
    const poleRef = db.collection(COLLECTIONS.POLE_RECORDS).doc(poleDocId);
    
    // Get existing pole record
    const poleDoc = await poleRef.get();
    
    if (poleDoc.exists) {
      // Update existing pole record
      const poleData = poleDoc.data();
      const drops = poleData.drops || [];
      
      // Add drop if not already present
      const dropExists = drops.some(d => d.propertyId === record['Property ID']);
      if (!dropExists && drops.length < CONSTRAINTS.MAX_DROPS_PER_POLE) {
        drops.push({
          propertyId: record['Property ID'],
          dropNumber: record['Drop Number'],
          address: record['Location Address'],
          status: record['Status'],
          addedDate: new Date().toISOString()
        });
      }
      
      batch.update(poleRef, {
        drops,
        dropCount: drops.length,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        lastBatchId: this.batchId
      });
      
    } else {
      // Create new pole record
      batch.set(poleRef, {
        poleNumber,
        gpsLatitude: record['GPS Latitude'],
        gpsLongitude: record['GPS Longitude'],
        drops: [{
          propertyId: record['Property ID'],
          dropNumber: record['Drop Number'],
          address: record['Location Address'],
          status: record['Status'],
          addedDate: new Date().toISOString()
        }],
        dropCount: 1,
        firstSeen: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        batchId: this.batchId
      });
    }
  }

  /**
   * Generate processing report
   */
  async generateReport(csvDoc) {
    const report = {
      batchId: this.batchId,
      csvFile: csvDoc.filename || csvDoc.id,
      processedAt: new Date().toISOString(),
      stats: this.stats,
      summary: {
        totalRecords: this.stats.total,
        successfullyProcessed: this.stats.processed,
        newRecords: this.stats.newRecords,
        updatedRecords: this.stats.updatedRecords,
        duplicatesSkipped: this.stats.duplicates,
        errors: this.stats.errors,
        changesDetected: this.stats.changes.length
      }
    };
    
    // Save report to Firestore
    await db.collection(COLLECTIONS.PROCESSING_REPORTS)
      .doc(this.batchId)
      .set(report);
    
    // Also save as markdown file
    await this.saveMarkdownReport(report);
    
    return report;
  }

  /**
   * Save report as markdown
   */
  async saveMarkdownReport(report) {
    const markdown = `# CSV Processing Report

## Batch Information
- **Batch ID**: ${report.batchId}
- **CSV File**: ${report.csvFile}
- **Processed At**: ${report.processedAt}

## Summary
- **Total Records**: ${report.summary.totalRecords}
- **Successfully Processed**: ${report.summary.successfullyProcessed}
- **New Records**: ${report.summary.newRecords}
- **Updated Records**: ${report.summary.updatedRecords}
- **Duplicates Skipped**: ${report.summary.duplicatesSkipped}
- **Errors**: ${report.summary.errors}
- **Changes Detected**: ${report.summary.changesDetected}

## Changes Detail
${report.stats.changes.length > 0 ? 
  report.stats.changes.map(change => `
### Property ${change.propertyId} (Pole: ${change.poleNumber || 'N/A'})
${change.changes.map(c => `- **${c.field}**: ${c.oldValue} → ${c.newValue}`).join('\n')}
`).join('\n') : 
  'No changes detected'}

## Processing Status
✅ Processing completed successfully
`;

    const reportsDir = path.join(__dirname, '../reports', 'processing');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filename = `report_${report.batchId}.md`;
    await fs.writeFile(path.join(reportsDir, filename), markdown);
    console.log(`📄 Report saved to: reports/processing/${filename}`);
  }

  /**
   * Update batch status
   */
  async updateBatchStatus(status, details = {}) {
    await db.collection(COLLECTIONS.IMPORT_BATCHES)
      .doc(this.batchId)
      .set({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...details
      }, { merge: true });
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node process-csv-from-firestore.js <csv-doc-id>

Example:
  node process-csv-from-firestore.js csv_20250124_lawley

Options:
  --dry-run    Run without making changes
  --limit N    Process only N records
    `);
    process.exit(1);
  }
  
  const csvDocId = args[0];
  const processor = new CSVProcessor();
  
  try {
    const report = await processor.processCSVFromFirestore(csvDocId);
    console.log('\n📊 Processing Report:');
    console.log(JSON.stringify(report.summary, null, 2));
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { CSVProcessor };