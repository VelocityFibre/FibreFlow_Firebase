const XLSX = require('xlsx');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { format } = require('date-fns');

// Load configuration
const config = require('../config/database.json');
const pgConnection = config.postgres;

class ExcelToPostgresImporter {
  constructor() {
    this.client = null;
    this.batchId = `IMP_${Date.now()}`;
    this.stats = {
      total: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
      duplicates: 0,
      statusChanges: 0
    };
    this.errors = [];
  }

  async connect() {
    this.client = new Client(pgConnection);
    await this.client.connect();
    console.log(chalk.green('✓ Connected to PostgreSQL'));
  }

  async importExcel(filePath) {
    const spinner = ora('Reading Excel file...').start();
    
    try {
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with proper date handling
      const data = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
      
      spinner.succeed(`Read ${data.length} rows from Excel`);
      this.stats.total = data.length;
      
      // Create import batch record
      await this.createImportBatch(path.basename(filePath), data.length);
      
      // Process in batches
      const batchSize = config.import.batchSize || 1000;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await this.processBatch(batch, i / batchSize + 1, Math.ceil(data.length / batchSize));
      }
      
      // Update import batch status
      await this.finalizeImportBatch();
      
      // Show summary
      this.showSummary();
      
    } catch (error) {
      spinner.fail('Import failed');
      console.error(chalk.red('Error:'), error.message);
      throw error;
    }
  }

  async createImportBatch(fileName, totalRows) {
    const query = `
      INSERT INTO import_batches (batch_id, file_name, total_rows, status, metadata)
      VALUES ($1, $2, $3, 'processing', $4)
    `;
    
    await this.client.query(query, [
      this.batchId,
      fileName,
      totalRows,
      JSON.stringify({
        startTime: new Date(),
        importConfig: config.import
      })
    ]);
  }

  async processBatch(rows, batchNum, totalBatches) {
    const spinner = ora(`Processing batch ${batchNum}/${totalBatches}...`).start();
    
    try {
      await this.client.query('BEGIN');
      
      for (const row of rows) {
        try {
          await this.processRow(row);
        } catch (error) {
          this.stats.failed++;
          this.errors.push({
            row: row['Property ID'] || 'Unknown',
            error: error.message
          });
        }
      }
      
      await this.client.query('COMMIT');
      spinner.succeed(`Batch ${batchNum}/${totalBatches} completed`);
      
    } catch (error) {
      await this.client.query('ROLLBACK');
      spinner.fail(`Batch ${batchNum} failed: ${error.message}`);
      throw error;
    }
  }

  async processRow(row) {
    // Extract key fields (based on OneMap structure)
    const propertyId = row['Property ID'];
    const poleNumber = row['Pole Number'];
    const dropNumber = row['Drop Number'];
    const status = row['Status'];
    const address = row['Address'];
    
    // Track status changes if enabled
    if (config.import.trackStatusHistory && propertyId && status) {
      await this.trackStatusChange(propertyId, status, row);
    }
    
    // Process based on available data
    if (poleNumber) {
      await this.upsertPole(row);
    }
    
    if (dropNumber) {
      await this.upsertDrop(row);
    }
    
    if (propertyId) {
      await this.upsertProperty(row);
    }
    
    this.stats.imported++;
  }

  async trackStatusChange(propertyId, newStatus, rowData) {
    // Check for existing status
    const existingQuery = `
      SELECT status FROM properties WHERE property_id = $1
      UNION
      SELECT status FROM poles WHERE pole_number = $1
      UNION  
      SELECT status FROM drops WHERE drop_number = $1
      LIMIT 1
    `;
    
    const result = await this.client.query(existingQuery, [propertyId]);
    const oldStatus = result.rows[0]?.status;
    
    if (oldStatus && oldStatus !== newStatus) {
      // Record status change
      const insertQuery = `
        INSERT INTO status_changes (property_id, old_status, new_status, changed_at, source_file, row_data)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await this.client.query(insertQuery, [
        propertyId,
        oldStatus,
        newStatus,
        new Date(),
        this.batchId,
        JSON.stringify(rowData)
      ]);
      
      this.stats.statusChanges++;
    }
  }

  async upsertPole(row) {
    const poleNumber = row['Pole Number'];
    if (!poleNumber) return;
    
    // Check for duplicates
    if (config.import.validateDuplicates) {
      const checkQuery = 'SELECT id FROM poles WHERE pole_number = $1';
      const existing = await this.client.query(checkQuery, [poleNumber]);
      
      if (existing.rows.length > 0) {
        this.stats.duplicates++;
        this.stats.skipped++;
        return;
      }
    }
    
    const query = `
      INSERT INTO poles (
        pole_number, project_id, gps_lat, gps_lng, address, 
        status, contractor, data, status_history
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (pole_number) 
      DO UPDATE SET
        status = EXCLUDED.status,
        data = poles.data || EXCLUDED.data,
        status_history = array_append(
          COALESCE(poles.status_history, ARRAY[]::jsonb[]), 
          jsonb_build_object(
            'status', EXCLUDED.status,
            'timestamp', now(),
            'source', '${this.batchId}'
          )
        ),
        updated_at = NOW()
    `;
    
    await this.client.query(query, [
      poleNumber,
      row['Project'] || row['Project ID'],
      this.parseCoordinate(row['GPS Lat'] || row['Latitude']),
      this.parseCoordinate(row['GPS Lng'] || row['Longitude']),
      row['Address'],
      row['Status'],
      row['Contractor'] || row['Agent'],
      JSON.stringify(this.cleanRowData(row)),
      JSON.stringify([{
        status: row['Status'],
        timestamp: new Date(),
        source: this.batchId
      }])
    ]);
  }

  async upsertDrop(row) {
    const dropNumber = row['Drop Number'];
    const poleNumber = row['Pole Number'];
    
    if (!dropNumber) return;
    
    // Validate pole relationship if configured
    if (config.import.maxDropsPerPole && poleNumber) {
      const countQuery = 'SELECT COUNT(*) FROM drops WHERE pole_number = $1';
      const result = await this.client.query(countQuery, [poleNumber]);
      
      if (result.rows[0].count >= config.import.maxDropsPerPole) {
        throw new Error(`Pole ${poleNumber} already has maximum drops`);
      }
    }
    
    const query = `
      INSERT INTO drops (
        drop_number, pole_number, property_id, address, status, data
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (drop_number)
      DO UPDATE SET
        status = EXCLUDED.status,
        data = drops.data || EXCLUDED.data,
        updated_at = NOW()
    `;
    
    await this.client.query(query, [
      dropNumber,
      poleNumber,
      row['Property ID'],
      row['Address'],
      row['Status'],
      JSON.stringify(this.cleanRowData(row))
    ]);
  }

  async upsertProperty(row) {
    const propertyId = row['Property ID'];
    if (!propertyId) return;
    
    const query = `
      INSERT INTO properties (
        property_id, address, suburb, city, postal_code, status, data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (property_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        data = properties.data || EXCLUDED.data,
        updated_at = NOW()
    `;
    
    await this.client.query(query, [
      propertyId,
      row['Address'],
      row['Suburb'],
      row['City'],
      row['Postal Code'],
      row['Status'],
      JSON.stringify(this.cleanRowData(row))
    ]);
  }

  parseCoordinate(value) {
    if (!value) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  cleanRowData(row) {
    // Remove empty values and clean data
    const cleaned = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  async finalizeImportBatch() {
    const query = `
      UPDATE import_batches 
      SET status = 'completed',
          imported_rows = $1,
          failed_rows = $2,
          errors = $3,
          metadata = metadata || jsonb_build_object('endTime', $4, 'stats', $5)
      WHERE batch_id = $6
    `;
    
    await this.client.query(query, [
      this.stats.imported,
      this.stats.failed,
      JSON.stringify(this.errors),
      new Date(),
      JSON.stringify(this.stats),
      this.batchId
    ]);
  }

  showSummary() {
    console.log('\n' + chalk.bold('Import Summary'));
    console.log('═'.repeat(40));
    console.log(`Total Rows:      ${chalk.cyan(this.stats.total)}`);
    console.log(`Imported:        ${chalk.green(this.stats.imported)}`);
    console.log(`Skipped:         ${chalk.yellow(this.stats.skipped)}`);
    console.log(`Failed:          ${chalk.red(this.stats.failed)}`);
    console.log(`Duplicates:      ${chalk.yellow(this.stats.duplicates)}`);
    console.log(`Status Changes:  ${chalk.blue(this.stats.statusChanges)}`);
    console.log('═'.repeat(40));
    console.log(`Batch ID: ${chalk.gray(this.batchId)}`);
    
    if (this.errors.length > 0) {
      console.log('\n' + chalk.red('Errors:'));
      this.errors.slice(0, 5).forEach(err => {
        console.log(`  - Row ${err.row}: ${err.error}`);
      });
      if (this.errors.length > 5) {
        console.log(`  ... and ${this.errors.length - 5} more errors`);
      }
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log(chalk.gray('Disconnected from PostgreSQL'));
    }
  }
}

// Main execution
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error(chalk.red('Error: Please provide an Excel file path'));
    console.log('Usage: node import-excel-to-postgres.js <file.xlsx>');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`Error: File not found: ${filePath}`));
    process.exit(1);
  }
  
  const importer = new ExcelToPostgresImporter();
  
  try {
    await importer.connect();
    await importer.importExcel(filePath);
  } catch (error) {
    console.error(chalk.red('Import failed:'), error.message);
    process.exit(1);
  } finally {
    await importer.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ExcelToPostgresImporter;