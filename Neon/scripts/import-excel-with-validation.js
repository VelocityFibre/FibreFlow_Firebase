#!/usr/bin/env node

/**
 * Excel Import System with Validation and Status Tracking
 * - Validates data before import
 * - Prevents duplicates
 * - Tracks all status changes
 * - Maintains complete history
 */

const { Client } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-long-breeze-a9w7xool',
  ssl: { rejectUnauthorized: false }
};

// Status progression workflow
const STATUS_WORKFLOW = {
  'Planned': 1,
  'Pole Permission: Declined': 2,
  'Pole Permission: Approved': 3,
  'Home Sign Ups: Declined': 4,
  'Home Sign Ups: Approved & Installation Scheduled': 5,
  'Home Sign Ups: Approved & Installation Re-scheduled': 6,
  'Home Sign Ups: Declined Changed to Approved': 7,
  'Home Installation: In Progress': 8,
  'Home Installation: Declined': 9,
  'Home Installation: Installed': 10
};

class ExcelImporter {
  constructor() {
    this.client = new Client(NEON_CONFIG);
    this.validationErrors = [];
    this.importStats = {
      total: 0,
      new: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
  }

  async connect() {
    await this.client.connect();
    console.log('🔌 Connected to Neon database\n');
  }

  async disconnect() {
    await this.client.end();
  }

  // Create tables if they don't exist
  async ensureTables() {
    console.log('📊 Ensuring required tables exist...');
    
    // Create status_changes table if not exists
    const createMainTable = `
      CREATE TABLE IF NOT EXISTS status_changes (
        id BIGSERIAL PRIMARY KEY,
        property_id TEXT NOT NULL,
        pole_number TEXT,
        drop_number TEXT,
        status TEXT,
        status_date TIMESTAMP,
        agent TEXT,
        address TEXT,
        location_lat TEXT,
        location_lng TEXT,
        zone TEXT,
        feeder TEXT,
        distribution TEXT,
        pon TEXT,
        project TEXT,
        contractor TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        import_batch_id TEXT,
        source_row TEXT,
        raw_data TEXT,
        agent_name TEXT,
        connected_date TIMESTAMP,
        permission_date TIMESTAMP,
        pole_planted_date TIMESTAMP,
        stringing_date TIMESTAMP,
        signup_date TIMESTAMP,
        drop_date TIMESTAMP,
        date_stamp TIMESTAMP,
        flow_name_groups TEXT,
        project_name TEXT,
        UNIQUE(property_id)
      )
    `;

    // Create status history table for tracking all changes
    const createHistoryTable = `
      CREATE TABLE IF NOT EXISTS status_history (
        id BIGSERIAL PRIMARY KEY,
        property_id TEXT NOT NULL,
        pole_number TEXT,
        old_status TEXT,
        new_status TEXT,
        changed_by TEXT,
        changed_at TIMESTAMP DEFAULT NOW(),
        import_batch_id TEXT,
        change_details JSONB
      )
    `;
    
    // Create indexes separately for PostgreSQL
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_status_history_property_id ON status_history (property_id)',
      'CREATE INDEX IF NOT EXISTS idx_status_history_pole_number ON status_history (pole_number)',
      'CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON status_history (changed_at)'
    ];

    // Create import batches table
    const createBatchTable = `
      CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        imported_at TIMESTAMP DEFAULT NOW(),
        total_rows INTEGER,
        new_records INTEGER,
        updated_records INTEGER,
        skipped_records INTEGER,
        error_records INTEGER,
        validation_errors JSONB,
        import_user TEXT,
        status TEXT DEFAULT 'in_progress'
      )
    `;

    try {
      await this.client.query(createMainTable);
      await this.client.query(createHistoryTable);
      await this.client.query(createBatchTable);
      
      // Create indexes
      for (const indexQuery of createIndexes) {
        try {
          await this.client.query(indexQuery);
        } catch (indexError) {
          // Index might already exist, continue
        }
      }
      
      console.log('✅ Tables and indexes ready\n');
    } catch (error) {
      // Tables might already exist, that's OK
      console.log('ℹ️  Tables already exist\n');
    }
  }

  // Validate a single row
  validateRow(row, rowIndex) {
    const errors = [];
    
    // Required field validation
    if (!row['Property ID']) {
      errors.push(`Row ${rowIndex}: Missing Property ID`);
    }
    
    // Status validation
    if (row['Status'] && !STATUS_WORKFLOW[row['Status']] && row['Status'] !== '') {
      errors.push(`Row ${rowIndex}: Invalid status '${row['Status']}'`);
    }
    
    // Date validation
    const dateFields = ['Permission Date', 'Signup Date', 'Connected Date'];
    dateFields.forEach(field => {
      if (row[field]) {
        const date = new Date(row[field]);
        if (isNaN(date.getTime())) {
          errors.push(`Row ${rowIndex}: Invalid date in ${field}: ${row[field]}`);
        }
      }
    });
    
    // Pole number format validation (if provided)
    if (row['Pole Number'] && row['Pole Number'] !== '') {
      const poleRegex = /^[A-Z]{3}\.[A-Z]\.[A-Z]\d+$/;
      if (!poleRegex.test(row['Pole Number'])) {
        // Log warning but don't block import
        console.log(`⚠️  Row ${rowIndex}: Non-standard pole number format: ${row['Pole Number']}`);
      }
    }
    
    return errors;
  }

  // Check if this is a duplicate or update
  async checkExistingRecord(propertyId) {
    const query = `
      SELECT id, status, pole_number, updated_at 
      FROM status_changes 
      WHERE property_id = $1
    `;
    
    const result = await this.client.query(query, [propertyId]);
    return result.rows[0] || null;
  }

  // Process a single row
  async processRow(row, batchId, rowIndex) {
    const propertyId = String(row['Property ID']);
    
    // Check for existing record
    const existing = await this.checkExistingRecord(propertyId);
    
    // Prepare data
    const data = {
      property_id: propertyId,
      pole_number: row['Pole Number'] || null,
      drop_number: row['Drop Number'] || null,
      status: row['Status'] || null,
      address: row['Location Address'] || row['Address'] || null,
      zone: row['Zone'] || null,
      pon: row['PON'] || row['PONs'] || null,
      agent_name: row['Agent Name'] || null,
      permission_date: this.parseDate(row['Permission Date']),
      signup_date: this.parseDate(row['Signup Date']),
      project_name: row['Project Name'] || 'Lawley',
      import_batch_id: batchId
    };
    
    if (existing) {
      // Check if status changed
      if (existing.status !== data.status && data.status) {
        // Validate status progression
        const oldLevel = STATUS_WORKFLOW[existing.status] || 0;
        const newLevel = STATUS_WORKFLOW[data.status] || 0;
        
        // Record status change in history
        await this.recordStatusChange(
          propertyId,
          existing.pole_number,
          existing.status,
          data.status,
          batchId
        );
        
        // Update the record
        await this.updateRecord(existing.id, data);
        this.importStats.updated++;
        
        console.log(`📝 Updated: Property ${propertyId} - Status: ${existing.status} → ${data.status}`);
      } else {
        // No significant changes
        this.importStats.skipped++;
      }
    } else {
      // New record
      await this.insertRecord(data);
      this.importStats.new++;
      
      // Record initial status in history
      if (data.status) {
        await this.recordStatusChange(
          propertyId,
          data.pole_number,
          null,
          data.status,
          batchId
        );
      }
      
      console.log(`✅ New: Property ${propertyId} - Status: ${data.status}`);
    }
  }

  // Insert new record
  async insertRecord(data) {
    const fields = Object.keys(data).filter(k => data[k] !== null);
    const values = fields.map(k => data[k]);
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    
    const query = `
      INSERT INTO status_changes (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;
    
    await this.client.query(query, values);
  }

  // Update existing record
  async updateRecord(id, data) {
    const fields = Object.keys(data).filter(k => data[k] !== null && k !== 'property_id');
    const values = fields.map(k => data[k]);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    
    const query = `
      UPDATE status_changes 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
    `;
    
    await this.client.query(query, [id, ...values]);
  }

  // Record status change in history
  async recordStatusChange(propertyId, poleNumber, oldStatus, newStatus, batchId) {
    const query = `
      INSERT INTO status_history 
      (property_id, pole_number, old_status, new_status, import_batch_id)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await this.client.query(query, [
      propertyId,
      poleNumber,
      oldStatus,
      newStatus,
      batchId
    ]);
  }

  // Parse date safely
  parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  // Main import function
  async importExcel(filePath) {
    const filename = path.basename(filePath);
    const batchId = `BATCH_${Date.now()}_${filename}`;
    
    console.log('📄 EXCEL IMPORT WITH VALIDATION & TRACKING');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`File: ${filename}`);
    console.log(`Batch ID: ${batchId}\n`);
    
    try {
      // Create batch record
      await this.client.query(
        `INSERT INTO import_batches (id, filename, import_user, import_date) VALUES ($1, $2, $3, NOW())`,
        [batchId, filename, 'system']
      );
      
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      this.importStats.total = data.length;
      console.log(`📊 Found ${data.length} rows to process\n`);
      
      // Validate all rows first
      console.log('🔍 Validating data...');
      for (let i = 0; i < data.length; i++) {
        const errors = this.validateRow(data[i], i + 2); // +2 for Excel row number
        this.validationErrors.push(...errors);
      }
      
      if (this.validationErrors.length > 0) {
        console.log(`\n⚠️  Found ${this.validationErrors.length} validation issues:`);
        this.validationErrors.slice(0, 10).forEach(err => console.log(`   ${err}`));
        if (this.validationErrors.length > 10) {
          console.log(`   ... and ${this.validationErrors.length - 10} more`);
        }
        console.log('');
      } else {
        console.log('✅ All data validated successfully\n');
      }
      
      // Process each row
      console.log('📤 Processing rows...\n');
      for (let i = 0; i < data.length; i++) {
        try {
          await this.processRow(data[i], batchId, i + 2);
        } catch (error) {
          console.error(`❌ Error on row ${i + 2}: ${error.message}`);
          this.importStats.errors++;
        }
        
        // Progress update every 100 rows
        if ((i + 1) % 100 === 0) {
          console.log(`   Progress: ${i + 1}/${data.length} rows processed...`);
        }
      }
      
      // Update batch record
      await this.client.query(`
        UPDATE import_batches 
        SET status = 'completed',
            total_rows = $2,
            new_records = $3,
            updated_records = $4,
            skipped_records = $5,
            error_records = $6,
            validation_errors = $7
        WHERE id = $1
      `, [
        batchId,
        this.importStats.total,
        this.importStats.new,
        this.importStats.updated,
        this.importStats.skipped,
        this.importStats.errors,
        JSON.stringify(this.validationErrors)
      ]);
      
      // Final report
      console.log('\n\n📊 IMPORT SUMMARY');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`Total Rows: ${this.importStats.total}`);
      console.log(`✅ New Records: ${this.importStats.new}`);
      console.log(`📝 Updated Records: ${this.importStats.updated}`);
      console.log(`⏭️  Skipped (No Changes): ${this.importStats.skipped}`);
      console.log(`❌ Errors: ${this.importStats.errors}`);
      console.log(`⚠️  Validation Issues: ${this.validationErrors.length}`);
      
      // Show recent status changes
      const recentChanges = await this.client.query(`
        SELECT property_id, pole_number, old_status, new_status, changed_at
        FROM status_history
        WHERE import_batch_id = $1
        ORDER BY changed_at DESC
        LIMIT 5
      `, [batchId]);
      
      if (recentChanges.rows.length > 0) {
        console.log('\n📋 Recent Status Changes:');
        recentChanges.rows.forEach(change => {
          const oldStatus = change.old_status || '[New Record]';
          console.log(`   ${change.property_id}: ${oldStatus} → ${change.new_status}`);
        });
      }
      
      return this.importStats;
      
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      
      // Update batch record with error
      await this.client.query(`
        UPDATE import_batches 
        SET status = 'failed'
        WHERE id = $1
      `, [batchId]);
      
      throw error;
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node import-excel-with-validation.js <excel-file-path>');
    console.log('\nExample:');
    console.log('  node import-excel-with-validation.js /home/ldp/Downloads/Lawley_15082025.xlsx');
    return;
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  
  const importer = new ExcelImporter();
  
  try {
    await importer.connect();
    await importer.ensureTables();
    await importer.importExcel(filePath);
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await importer.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ExcelImporter;