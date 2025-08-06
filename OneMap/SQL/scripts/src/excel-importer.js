const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ora = require('ora');
const chalk = require('chalk');

class ExcelImporter {
  constructor(database) {
    this.db = database;
    this.columnMappings = {
      // Common column name variations -> standard field names
      'property id': 'property_id',
      'propertyid': 'property_id',
      'property_id': 'property_id',
      
      'pole number': 'pole_number',
      'polenumber': 'pole_number',
      'pole_number': 'pole_number',
      'pole': 'pole_number',
      
      'drop number': 'drop_number',
      'dropnumber': 'drop_number',
      'drop_number': 'drop_number',
      'drop': 'drop_number',
      
      'status': 'status',
      'current status': 'status',
      'status description': 'status',
      
      // DATE MAPPINGS - FIXED
      'date_status_changed': 'status_date',
      'lst_mod_dt': 'status_date',
      'date': 'status_date',
      'date changed': 'status_date',
      'status date': 'status_date',
      'status_date': 'status_date',
      'datetime': 'status_date',
      'timestamp': 'status_date',
      
      // AGENT MAPPINGS - FIXED
      'field agent name (pole permission)': 'agent',
      'field agent name (home sign ups)': 'agent',
      'installer name': 'agent',
      'field agent name and surname(sales)': 'agent',
      'agent': 'agent',
      'user': 'agent',
      'changed by': 'agent',
      'updated by': 'agent',
      
      // ADDRESS MAPPING - FIXED
      'location address': 'address',
      'address': 'address',
      'location': 'address',
      'site address': 'address',
      
      'latitude': 'location_lat',
      'lat': 'location_lat',
      
      'longitude': 'location_lng',
      'lng': 'location_lng',
      'lon': 'location_lng',
      
      'zone': 'zone',
      'feeder': 'feeder',
      'distribution': 'distribution',
      'pons': 'pon',  // FIXED: PONs -> pon
      'pon': 'pon',
      'project': 'project',
      'contractor': 'contractor'
    };
  }

  async importExcelFile(filePath, options = {}) {
    const spinner = ora('Reading Excel file...').start();
    const batchId = crypto.randomBytes(8).toString('hex');
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read Excel file
      const workbook = XLSX.readFile(filePath, {
        cellDates: true,  // Parse dates automatically
        cellNF: false,    // Don't apply number formats
        cellText: false   // Don't generate formatted text
      });

      const sheetName = options.sheet || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
      }

      spinner.text = `Processing sheet: ${sheetName}`;

      // Convert to JSON with header mapping
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: 'yyyy-mm-dd hh:mm:ss',
        defval: null
      });

      if (rawData.length === 0) {
        throw new Error('No data found in Excel file');
      }

      spinner.text = `Found ${rawData.length} rows. Analyzing columns...`;

      // Detect columns
      const detectedColumns = this.detectColumns(rawData[0]);
      console.log('\n' + chalk.cyan('Detected columns:'));
      Object.entries(detectedColumns).forEach(([original, mapped]) => {
        console.log(chalk.gray(`  ${original} → ${mapped || chalk.red('unmapped')}`));
      });

      // Create import batch record
      await this.db.run(
        `INSERT INTO import_batches (id, filename, sheet_name, total_rows, status, column_mapping) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [batchId, path.basename(filePath), sheetName, rawData.length, 'processing', JSON.stringify(detectedColumns)]
      );

      // Process data in batches
      spinner.text = 'Importing data...';
      const results = await this.processBatch(rawData, batchId, detectedColumns);
      
      // Update import batch status
      await this.db.run(
        `UPDATE import_batches 
         SET processed_rows = ?, error_rows = ?, duplicate_rows = ?, status = ? 
         WHERE id = ?`,
        [results.processed, results.errors, results.duplicates, 'completed', batchId]
      );

      spinner.succeed(`Import completed! Processed: ${results.processed}, Errors: ${results.errors}, Duplicates: ${results.duplicates}`);
      
      // Show summary statistics
      await this.showImportSummary(batchId);
      
      return results;
      
    } catch (error) {
      spinner.fail(`Import failed: ${error.message}`);
      
      // Update batch status to failed
      await this.db.run(
        `UPDATE import_batches SET status = ?, errors = ? WHERE id = ?`,
        ['failed', error.message, batchId]
      );
      
      throw error;
    }
  }

  detectColumns(sampleRow) {
    const detected = {};
    const columns = Object.keys(sampleRow);
    
    columns.forEach(col => {
      const normalized = col.toLowerCase().trim();
      detected[col] = this.columnMappings[normalized] || null;
    });
    
    return detected;
  }

  async processBatch(data, batchId, columnMapping) {
    const batchSize = 1000;
    let processed = 0;
    let errors = 0;
    let duplicates = 0;
    
    await this.db.beginTransaction();
    
    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        for (const [index, row] of batch.entries()) {
          try {
            const mappedRow = this.mapRow(row, columnMapping);
            mappedRow.import_batch_id = batchId;
            mappedRow.source_row = i + index + 2; // Excel row number (1-based + header)
            mappedRow.raw_data = JSON.stringify(row);
            
            // Check for duplicates if option enabled
            if (await this.isDuplicate(mappedRow)) {
              duplicates++;
              continue;
            }
            
            // Insert the row
            await this.insertRow(mappedRow);
            processed++;
            
            // Update pole capacity if we have a pole number
            if (mappedRow.pole_number) {
              await this.updatePoleCapacity(mappedRow.pole_number);
            }
            
          } catch (error) {
            errors++;
            console.error(chalk.red(`Error on row ${i + index + 2}: ${error.message}`));
          }
        }
      }
      
      await this.db.commit();
      
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
    
    return { processed, errors, duplicates };
  }

  mapRow(row, columnMapping) {
    const mapped = {};
    
    Object.entries(row).forEach(([key, value]) => {
      const mappedKey = columnMapping[key];
      if (mappedKey) {
        // Handle date parsing
        if (mappedKey === 'status_date' && value) {
          mapped[mappedKey] = this.parseDate(value);
        } 
        // Handle agent field - use first non-empty agent value found
        else if (mappedKey === 'agent' && value && !mapped.agent) {
          mapped[mappedKey] = value;
        }
        // Handle other fields
        else if (mappedKey !== 'agent') {
          mapped[mappedKey] = value;
        }
      }
    });
    
    return mapped;
  }

  parseDate(value) {
    if (!value) return null;
    
    // If it's already a Date object from Excel
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    // Try to parse string dates
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    return value; // Return as-is if can't parse
  }

  async isDuplicate(row) {
    // Check if exact same record exists
    const existing = await this.db.get(
      `SELECT id FROM status_changes 
       WHERE property_id = ? AND pole_number = ? AND drop_number = ? 
       AND status = ? AND status_date = ?`,
      [row.property_id, row.pole_number, row.drop_number, row.status, row.status_date]
    );
    
    return !!existing;
  }

  async insertRow(row) {
    const columns = Object.keys(row).filter(k => row[k] !== null);
    const values = columns.map(k => row[k]);
    const placeholders = columns.map(() => '?').join(', ');
    
    const sql = `INSERT INTO status_changes (${columns.join(', ')}) VALUES (${placeholders})`;
    await this.db.run(sql, values);
  }

  async updatePoleCapacity(poleNumber) {
    const dropCount = await this.db.get(
      `SELECT COUNT(DISTINCT drop_number) as count 
       FROM status_changes 
       WHERE pole_number = ?`,
      [poleNumber]
    );
    
    await this.db.run(
      `INSERT OR REPLACE INTO pole_capacity (pole_number, total_drops) 
       VALUES (?, ?)`,
      [poleNumber, dropCount.count]
    );
  }

  async showImportSummary(batchId) {
    console.log('\n' + chalk.green('Import Summary:'));
    
    const stats = await this.db.getStats();
    console.log(chalk.gray('Database Statistics:'));
    console.log(`  Total Records: ${stats.totalRecords.count}`);
    console.log(`  Unique Poles: ${stats.uniquePoles.count}`);
    console.log(`  Unique Drops: ${stats.uniqueDrops.count}`);
    console.log(`  Unique Agents: ${stats.uniqueAgents.count}`);
    
    if (stats.dateRange.min_date) {
      console.log(`  Date Range: ${stats.dateRange.min_date} to ${stats.dateRange.max_date}`);
    }
    
    // Show top statuses
    const topStatuses = await this.db.all(
      `SELECT status, COUNT(*) as count 
       FROM status_changes 
       GROUP BY status 
       ORDER BY count DESC 
       LIMIT 5`
    );
    
    console.log('\n' + chalk.gray('Top Status Values:'));
    topStatuses.forEach(s => {
      console.log(`  ${s.status}: ${s.count}`);
    });
  }

  async listAvailableSheets(filePath) {
    const workbook = XLSX.readFile(filePath);
    return workbook.SheetNames;
  }
}

module.exports = ExcelImporter;