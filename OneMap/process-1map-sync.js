#!/usr/bin/env node

/**
 * 1Map to FibreFlow Manual Sync Processor
 * 
 * Usage: node process-1map-sync.js <csv-file-path>
 * 
 * This script:
 * 1. Reads 1Map CSV export
 * 2. Imports to processing database
 * 3. Detects changes
 * 4. Generates report
 * 5. Optionally syncs to production
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const crypto = require('crypto');
const path = require('path');
const { Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin with ADC
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

// Collections - CLEARLY SEPARATED
const PROCESSING_IMPORTS = 'onemap-processing-imports';  // Import metadata
const PROCESSING_STAGING = 'onemap-processing-staging';  // Staged records
const PRODUCTION_COLLECTION = 'planned-poles';  // PRODUCTION - DO NOT WRITE HERE YET

// Safety check
function ensureProcessingCollection(collectionName) {
  if (!collectionName.includes('processing')) {
    throw new Error(`SAFETY: Attempting to write to non-processing collection: ${collectionName}`);
  }
}

class OneMapSyncProcessor {
  constructor() {
    this.importId = `IMP_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    this.stats = {
      total: 0,
      new: 0,
      updated: 0,
      unchanged: 0,
      errors: 0
    };
    this.changes = [];
    this.errors = [];
  }

  /**
   * Main processing function
   */
  async processSync(csvFilePath) {
    try {
      console.log(`🚀 Starting 1Map sync process...`);
      console.log(`📁 Import ID: ${this.importId}`);
      
      // Step 1: Read and parse CSV
      const records = await this.readCsvFile(csvFilePath);
      console.log(`📊 Found ${records.length} records in CSV`);
      
      // Step 2: Create import record
      await this.createImportRecord(csvFilePath, records.length);
      
      // Step 3: Process each record
      console.log(`⚙️  Processing records...`);
      for (const record of records) {
        await this.processRecord(record);
      }
      
      // Step 4: Generate report
      const report = await this.generateReport();
      console.log(`\n📋 SYNC REPORT:\n${report}`);
      
      // Step 5: Save report
      await this.saveReport(report);
      
      // Step 6: Ask for sync approval
      await this.promptForSync();
      
    } catch (error) {
      console.error('❌ Error during sync:', error);
      throw error;
    }
  }

  /**
   * Read and parse CSV file
   */
  async readCsvFile(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',  // 1Map uses semicolon delimiter
      relax_quotes: true,  // Handle inconsistent quoting
      relax_column_count: true  // Handle varying column counts
    });
    return records;
  }

  /**
   * Create import tracking record
   */
  async createImportRecord(filePath, recordCount) {
    ensureProcessingCollection(PROCESSING_IMPORTS);
    
    const importDoc = {
      importId: this.importId,
      importDate: Timestamp.now(),
      fileName: path.basename(filePath),
      status: 'processing',
      recordCount: recordCount,
      changes: {
        new: 0,
        updated: 0,
        unchanged: 0,
        errors: 0
      },
      errors: [],
      processedAt: null,
      syncedAt: null
    };
    
    await db.collection(PROCESSING_IMPORTS).doc(this.importId).set(importDoc);
    console.log(`✅ Created import record in processing database`);
  }

  /**
   * Process individual record
   */
  async processRecord(rawRecord) {
    try {
      this.stats.total++;
      
      // Generate unique ID for record
      const recordId = this.generateRecordId(rawRecord);
      
      // Compute hash of current data
      const currentHash = this.computeHash(rawRecord);
      
      // Check if record exists in staging
      ensureProcessingCollection(PROCESSING_STAGING);
      const existingDoc = await db
        .collection(PROCESSING_STAGING)
        .doc(recordId)
        .get();
      
      let status = 'unchanged';
      let changes = null;
      
      if (!existingDoc.exists) {
        status = 'new';
        this.stats.new++;
      } else {
        const existingData = existingDoc.data();
        const lastHash = existingData?._import?.hash;
        if (lastHash !== currentHash) {
          status = 'updated';
          this.stats.updated++;
          changes = this.detectFieldChanges(existingData, rawRecord);
        } else {
          this.stats.unchanged++;
        }
      }
      
      // Store in staging collection
      const processedRecord = {
        // Mapped fields for FibreFlow
        ...this.mapToFibreFlow(rawRecord),
        
        // Import metadata
        _import: {
          importId: this.importId,
          recordId: recordId,
          hash: currentHash,
          status: status,
          processedAt: Timestamp.now(),
          changes: changes,
          lastImportDate: Timestamp.now()
        },
        
        // Keep raw data for reference
        _raw: rawRecord
      };
      
      await db
        .collection(PROCESSING_STAGING)
        .doc(recordId)
        .set(processedRecord, { merge: true });
      
      if (status !== 'unchanged') {
        this.changes.push({
          recordId,
          status,
          changes,
          data: processedRecord
        });
      }
      
      // Log progress every 100 records
      if (this.stats.total % 100 === 0) {
        console.log(`📊 Processed ${this.stats.total} records...`);
      }
      
    } catch (error) {
      this.stats.errors++;
      
      // Check if it's just an empty record to skip
      if (error.message.includes('Empty Property ID')) {
        // Just skip silently
        return;
      }
      
      const propertyId = rawRecord['Property ID'] || rawRecord['﻿Property ID'] || 'unknown';
      this.errors.push({
        recordId: propertyId,
        error: error.message,
        address: rawRecord['Location Address'] || 'unknown'
      });
      
      // Only log first few errors to avoid spam
      if (this.stats.errors <= 5) {
        console.error(`❌ Error processing record ${propertyId}:`, error.message);
      }
    }
  }

  /**
   * Generate unique record ID
   * Using Property ID as unique identifier (always present in 1Map data)
   */
  generateRecordId(record) {
    // Property ID is the unique identifier in 1Map
    // Remove BOM character if present
    const propertyId = record['Property ID'] || record['﻿Property ID'] || '';
    
    // Skip empty property IDs
    if (!propertyId || propertyId.trim() === '') {
      throw new Error('Empty Property ID - skipping record');
    }
    
    return `PROP_${propertyId.trim()}`;
  }

  /**
   * Compute hash of record for change detection
   */
  computeHash(record) {
    const normalized = JSON.stringify(record, Object.keys(record).sort());
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * NOT USED - Removed complex query logic
   * Change detection now happens directly in processRecord
   */

  /**
   * Detect specific field changes
   */
  detectFieldChanges(oldData, newData) {
    const changes = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const key of allKeys) {
      if (key.startsWith('_')) continue; // Skip metadata fields
      
      if (oldData[key] !== newData[key]) {
        changes.push({
          field: key,
          old: oldData[key],
          new: newData[key]
        });
      }
    }
    
    return changes;
  }

  /**
   * Map 1Map fields to FibreFlow schema
   * Based on actual 1Map CSV structure
   */
  mapToFibreFlow(record) {
    // Handle BOM in first column
    const propertyId = record['Property ID'] || record['﻿Property ID'];
    
    // Extract key fields
    const mapped = {
      // Core identifiers
      propertyId: propertyId,
      oneMapNadId: record['1map NAD ID'],
      jobId: record['Job ID'],
      
      // Status and workflow
      status: record['Status'],
      flowNameGroups: record['Flow Name Groups'],
      dateStatusChanged: record['date_status_changed'],
      
      // Location info
      site: record['Site'],
      sections: record['Sections'],
      pons: record['PONs'],
      locationAddress: record['Location Address'],
      standNumber: record['Stand Number'],
      
      // Pole and drop info
      poleNumber: record['Pole Number'],
      dropNumber: record['Drop Number'],
      
      // GPS coordinates (multiple sources, prioritize pole permission coords)
      gpsLatitude: parseFloat(record['Pole Permissions - Actual Device Location (Latitude)'] || 
                             record['Latitude'] || 
                             record['Actual Device Location (Latitude)'] || 0),
      gpsLongitude: parseFloat(record['Pole Permissions - Actual Device Location (Longitude)'] || 
                              record['Longitude'] || 
                              record['Actual Device Location (Longitude)'] || 0),
      
      // Field agent info
      fieldAgentPolePermission: record['Field Agent Name (pole permission)'],
      fieldAgentHomeSignUps: record['Field Agent Name (Home Sign Ups)'],
      fieldAgentSales: record['Field Agent Name & Surname(sales)'],
      
      // Consent and permissions
      ownerOrTenant: record['Owner or Tenant'],
      consentDate: record['Date of Signature'],
      
      // Installation info
      installerName: record['Installer Name'],
      ontActivationCode: record['Nokia Easy Start ONT Activation Code'],
      ontBarcode: record['ONT Barcode'],
      miniUpsSerialNumber: record['Mini-UPS Serial Number'],
      
      // Quality and tracking
      clientHappyWithInstallation: record['Client happy with Installation'],
      qualityOfInstallation: record['What was the quality of the installation?'],
      
      // Timestamps
      lastModifiedBy: record['lst_mod_by'],
      lastModifiedDate: record['lst_mod_dt'],
      lastUpdatedFrom1Map: Timestamp.now()
    };
    
    // Clean up empty values and fix data types
    Object.keys(mapped).forEach(key => {
      const value = mapped[key];
      
      // Remove empty, null, or undefined values
      if (value === '' || value === null || value === undefined) {
        delete mapped[key];
        return;
      }
      
      // Convert string numbers to actual numbers where appropriate
      if (key === 'gpsLatitude' || key === 'gpsLongitude') {
        const num = parseFloat(value);
        if (isNaN(num) || num === 0) {
          delete mapped[key];
        } else {
          mapped[key] = num;
        }
      }
      
      // Ensure no empty strings in any field
      if (typeof value === 'string' && value.trim() === '') {
        delete mapped[key];
      }
    });
    
    return mapped;
  }

  /**
   * Generate sync report
   */
  async generateReport() {
    const report = `
1MAP SYNC REPORT
================
Import ID: ${this.importId}
Date: ${new Date().toISOString()}
File: ${await this.getFileName()}

SUMMARY
-------
Total Records: ${this.stats.total}
New Records: ${this.stats.new}
Updated Records: ${this.stats.updated}
Unchanged Records: ${this.stats.unchanged}
Errors: ${this.stats.errors}

${this.stats.new > 0 ? `
NEW RECORDS (${this.stats.new})
-----------
${this.changes.filter(c => c.status === 'new').map(c => 
  `- ${c.recordId}: ${JSON.stringify(c.data)}`
).join('\n')}
` : ''}

${this.stats.updated > 0 ? `
UPDATED RECORDS (${this.stats.updated})
---------------
${this.changes.filter(c => c.status === 'updated').map(c => 
  `- ${c.recordId}:\n${c.changes.map(ch => 
    `  * ${ch.field}: "${ch.old}" → "${ch.new}"`
  ).join('\n')}`
).join('\n\n')}
` : ''}

${this.errors.length > 0 ? `
ERRORS (${this.errors.length})
------
${this.errors.map(e => 
  `- ${JSON.stringify(e.record)}: ${e.error}`
).join('\n')}
` : ''}

NEXT STEPS
----------
${this.changes.length > 0 ? 
  '✅ Ready to sync ' + this.changes.length + ' changes to production' : 
  '✓ No changes to sync'}
`;
    
    return report;
  }

  /**
   * Get file name from import record
   */
  async getFileName() {
    const doc = await db.collection(PROCESSING_IMPORTS).doc(this.importId).get();
    return doc.data()?.fileName || 'unknown';
  }

  /**
   * Save report to file
   */
  async saveReport(report) {
    const reportPath = path.join(
      'OneMap/reports',
      `sync_report_${this.importId}.txt`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);
  }

  /**
   * Update import status
   */
  async updateImportStatus(status, syncedAt = null) {
    const update = {
      status: status,
      changes: this.stats,
      errors: this.errors,
      processedAt: Timestamp.now()
    };
    
    if (syncedAt) {
      update.syncedAt = syncedAt;
    }
    
    await db.collection(PROCESSING_COLLECTION).doc(this.importId).update(update);
  }

  /**
   * Prompt for sync approval
   */
  async promptForSync() {
    if (this.changes.length === 0) {
      console.log('\n✅ No changes to sync. Process complete!');
      await this.updateImportStatus('completed');
      return;
    }
    
    console.log(`\n🤔 Do you want to sync ${this.changes.length} changes to production?`);
    console.log('   (This feature will be implemented in the next phase)');
    console.log('   For now, review the report and sync manually if needed.');
    
    await this.updateImportStatus('validated');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Please provide CSV file path');
    console.error('Usage: node process-1map-sync.js <csv-file-path>');
    process.exit(1);
  }
  
  const csvPath = args[0];
  
  // Check if file exists
  try {
    await fs.access(csvPath);
  } catch (error) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }
  
  const processor = new OneMapSyncProcessor();
  await processor.processSync(csvPath);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { OneMapSyncProcessor };