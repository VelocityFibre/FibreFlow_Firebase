#!/usr/bin/env node

/**
 * Simplified 1Map to FibreFlow Sync Processor
 * Without raw data storage to avoid array issues
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const crypto = require('crypto');
const path = require('path');
const { Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

// Collections - CLEARLY SEPARATED
const PROCESSING_IMPORTS = 'onemap-processing-imports';
const PROCESSING_STAGING = 'onemap-processing-staging';

class OneMapSyncProcessor {
  constructor() {
    this.importId = `IMP_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    this.stats = {
      total: 0,
      new: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
      skipped: 0
    };
    this.changes = [];
    this.errors = [];
  }

  async processSync(csvFilePath) {
    try {
      console.log(`🚀 Starting 1Map sync process (simplified)...`);
      console.log(`📁 Import ID: ${this.importId}`);
      
      // Read and parse CSV
      const records = await this.readCsvFile(csvFilePath);
      console.log(`📊 Found ${records.length} records in CSV`);
      
      // Create import record
      await this.createImportRecord(csvFilePath, records.length);
      
      // Process records
      console.log(`⚙️  Processing records...`);
      let processed = 0;
      
      for (const record of records) {
        await this.processRecord(record);
        processed++;
        
        if (processed % 50 === 0) {
          console.log(`📊 Processed ${processed}/${records.length} records...`);
        }
      }
      
      console.log(`✅ Processing complete!`);
      
      // Update import status
      await this.updateImportStatus('completed');
      
      // Generate report
      const report = this.generateReport();
      console.log(`\n📋 SYNC REPORT:\n${report}`);
      
      // Save report
      await this.saveReport(report);
      
    } catch (error) {
      console.error('❌ Error during sync:', error);
      await this.updateImportStatus('error');
      throw error;
    }
  }

  async readCsvFile(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    return records;
  }

  async createImportRecord(filePath, recordCount) {
    const importDoc = {
      importId: this.importId,
      importDate: Timestamp.now(),
      fileName: path.basename(filePath),
      status: 'processing',
      recordCount: recordCount,
      processedAt: null
    };
    
    await db.collection(PROCESSING_IMPORTS).doc(this.importId).set(importDoc);
    console.log(`✅ Created import record`);
  }

  async processRecord(rawRecord) {
    try {
      this.stats.total++;
      
      // Get property ID
      const propertyId = rawRecord['Property ID'] || rawRecord['﻿Property ID'] || '';
      
      // Skip empty property IDs
      if (!propertyId || propertyId.trim() === '') {
        this.stats.skipped++;
        return;
      }
      
      const recordId = `PROP_${propertyId.trim()}`;
      
      // Map to FibreFlow format (simplified)
      const mappedData = this.mapToFibreFlow(rawRecord);
      
      // Check if exists
      const existingDoc = await db
        .collection(PROCESSING_STAGING)
        .doc(recordId)
        .get();
      
      if (!existingDoc.exists) {
        this.stats.new++;
        
        // Create new record
        await db
          .collection(PROCESSING_STAGING)
          .doc(recordId)
          .set({
            ...mappedData,
            _meta: {
              importId: this.importId,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            }
          });
          
        this.changes.push({
          recordId,
          status: 'new',
          propertyId: mappedData.propertyId,
          poleNumber: mappedData.poleNumber
        });
      } else {
        // For now, just count as unchanged
        this.stats.unchanged++;
      }
      
    } catch (error) {
      this.stats.errors++;
      
      const propertyId = rawRecord['Property ID'] || rawRecord['﻿Property ID'] || 'unknown';
      this.errors.push({
        propertyId,
        error: error.message,
        address: rawRecord['Location Address'] || 'unknown'
      });
      
      if (this.stats.errors <= 5) {
        console.error(`❌ Error processing ${propertyId}: ${error.message}`);
      }
    }
  }

  mapToFibreFlow(record) {
    const propertyId = record['Property ID'] || record['﻿Property ID'];
    
    const mapped = {
      // Core identifiers
      propertyId: propertyId,
      oneMapNadId: record['1map NAD ID'],
      
      // Status and workflow
      status: record['Status'],
      flowNameGroups: record['Flow Name Groups'],
      
      // Location info
      site: record['Site'],
      locationAddress: record['Location Address'],
      
      // Pole and drop info
      poleNumber: record['Pole Number'],
      dropNumber: record['Drop Number'],
      
      // GPS coordinates
      gpsLatitude: parseFloat(record['Pole Permissions - Actual Device Location (Latitude)'] || 
                             record['Latitude'] || 0),
      gpsLongitude: parseFloat(record['Pole Permissions - Actual Device Location (Longitude)'] || 
                              record['Longitude'] || 0),
      
      // Field agent
      fieldAgentPolePermission: record['Field Agent Name (pole permission)'],
      
      // Timestamps
      lastModifiedDate: record['lst_mod_dt'],
      dateStatusChanged: record['date_status_changed']
    };
    
    // Clean up - remove empty/null/undefined/zero values
    Object.keys(mapped).forEach(key => {
      const value = mapped[key];
      
      if (value === '' || value === null || value === undefined) {
        delete mapped[key];
      } else if (typeof value === 'string' && value.trim() === '') {
        delete mapped[key];
      } else if ((key === 'gpsLatitude' || key === 'gpsLongitude') && 
                 (isNaN(value) || value === 0)) {
        delete mapped[key];
      }
    });
    
    return mapped;
  }

  async updateImportStatus(status) {
    await db.collection(PROCESSING_IMPORTS).doc(this.importId).update({
      status: status,
      stats: this.stats,
      errorCount: this.errors.length,
      processedAt: Timestamp.now()
    });
  }

  generateReport() {
    const now = new Date().toISOString();
    
    return `
1MAP SYNC REPORT (Simplified)
=============================
Import ID: ${this.importId}
Date: ${now}

SUMMARY
-------
Total Records: ${this.stats.total}
New Records: ${this.stats.new}
Updated Records: ${this.stats.updated}
Unchanged Records: ${this.stats.unchanged}
Skipped (no Property ID): ${this.stats.skipped}
Errors: ${this.stats.errors}

${this.stats.new > 0 ? `
NEW RECORDS (showing first 10)
-------------------------------
${this.changes.slice(0, 10).map(c => 
  `- Property: ${c.propertyId}, Pole: ${c.poleNumber || 'N/A'}`
).join('\n')}
${this.changes.length > 10 ? `\n... and ${this.changes.length - 10} more` : ''}
` : ''}

${this.errors.length > 0 ? `
ERRORS (${this.errors.length})
------
${this.errors.slice(0, 5).map(e => 
  `- Property ${e.propertyId}: ${e.error}`
).join('\n')}
${this.errors.length > 5 ? `\n... and ${this.errors.length - 5} more errors` : ''}
` : ''}

STATUS
------
✅ Data imported to: onemap-processing-staging
📊 Total staged records: ${this.stats.new}
⏳ Ready for review before production sync
`;
  }

  async saveReport(report) {
    const reportPath = path.join(
      'OneMap/reports',
      `sync_report_${this.importId}.txt`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Please provide CSV file path');
    console.error('Usage: node process-1map-sync-simple.js <csv-file-path>');
    process.exit(1);
  }
  
  const csvPath = args[0];
  
  try {
    await fs.access(csvPath);
  } catch (error) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }
  
  const processor = new OneMapSyncProcessor();
  await processor.processSync(csvPath);
  
  console.log('\n✅ Sync to processing database complete!');
  console.log('📋 Next steps:');
  console.log('   1. Review staged data in Firebase Console');
  console.log('   2. Check collection: onemap-processing-staging');
  console.log('   3. When ready, sync to production (separate script)');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}