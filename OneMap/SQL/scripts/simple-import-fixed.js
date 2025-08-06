#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('=== SIMPLE BULLETPROOF IMPORT (FIXED) ===\n');

// Column mappings that WORKED for August 1
const COLUMN_MAPPINGS = {
  'Property ID': 'property_id',
  'Pole Number': 'pole_number',
  'Drop Number': 'drop_number', 
  'Status': 'status',
  'date_status_changed': 'status_date',
  'lst_mod_dt': 'status_date',
  'Field Agent Name (pole permission)': 'agent',
  'Field Agent Name (Home Sign Ups)': 'agent',
  'Installer Name': 'agent',
  'Location Address': 'address',
  'Latitude': 'location_lat',
  'Longitude': 'location_lng',
  'PONs': 'pon'
};

function generateBatchId() {
  return Math.random().toString(16).substr(2, 16);
}

function mapExcelRow(excelRow) {
  const mapped = {};
  
  // Map columns using case-insensitive matching
  for (const [excelCol, dbCol] of Object.entries(COLUMN_MAPPINGS)) {
    // Try exact match first
    if (excelRow[excelCol] !== undefined) {
      mapped[dbCol] = cleanValue(excelRow[excelCol]);
      continue;
    }
    
    // Try case-insensitive match
    const foundKey = Object.keys(excelRow).find(key => 
      key.toLowerCase() === excelCol.toLowerCase()
    );
    
    if (foundKey) {
      mapped[dbCol] = cleanValue(excelRow[foundKey]);
    }
  }
  
  return mapped;
}

function cleanValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const cleaned = value.trim();
    return cleaned === '' ? null : cleaned;
  }
  return value;
}

async function importExcelFile(filename) {
  const db = new sqlite3.Database('./onemap.db');
  
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`📂 Importing: ${filename}`);
      
      const filePath = path.join('../data/excel', filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read Excel file
      console.log('   📊 Reading Excel file...');
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      console.log(`   📋 Found ${data.length} rows in Excel`);

      if (data.length === 0) {
        console.log('   ⚠️  No data found');
        resolve({ processed: 0, duplicates: 0, errors: 0 });
        return;
      }

      // Generate batch ID
      const batchId = generateBatchId();
      console.log(`   🎯 Batch ID: ${batchId}`);

      // Start transaction for safety
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log('   ✅ Transaction started');

      // Create batch record
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO import_batches 
          (id, filename, sheet_name, total_rows, processed_rows, error_rows, duplicate_rows, status, column_mapping) 
          VALUES (?, ?, ?, ?, 0, 0, 0, 'processing', ?)
        `, [batchId, filename, sheetName, data.length, JSON.stringify(COLUMN_MAPPINGS)], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log('   📝 Batch record created');

      // Process each row
      let processed = 0;
      let duplicates = 0;
      let errors = 0;

      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          const mappedRow = mapExcelRow(row);

          // Skip if no property ID
          if (!mappedRow.property_id) {
            continue;
          }

          // Check for existing record (duplicate detection)
          const existing = await new Promise((resolve, reject) => {
            db.get(`
              SELECT COUNT(*) as count 
              FROM status_changes 
              WHERE property_id = ? 
                AND COALESCE(status, '') = COALESCE(?, '')
                AND COALESCE(status_date, '') = COALESCE(?, '')
            `, [mappedRow.property_id, mappedRow.status, mappedRow.status_date], (err, row) => {
              if (err) reject(err);
              else resolve(row.count > 0);
            });
          });

          if (existing) {
            duplicates++;
            continue;
          }

          // Insert new record with explicit column list
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT INTO status_changes 
              (property_id, pole_number, drop_number, status, status_date, 
               agent, address, location_lat, location_lng, pon, 
               import_batch_id, source_row, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              mappedRow.property_id,
              mappedRow.pole_number,
              mappedRow.drop_number, 
              mappedRow.status,
              mappedRow.status_date,
              mappedRow.agent,
              mappedRow.address,
              mappedRow.location_lat,
              mappedRow.location_lng,
              mappedRow.pon,
              batchId,
              i
            ], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          processed++;
          
          if (processed % 200 === 0) {
            console.log(`   ⏳ Processed ${processed} records...`);
          }

        } catch (rowError) {
          errors++;
          console.log(`   ❌ Error on row ${i}: ${rowError.message}`);
          if (errors > 10) {
            throw new Error('Too many errors, aborting');
          }
        }
      }

      // Update batch record with final counts
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE import_batches 
          SET processed_rows = ?, error_rows = ?, duplicate_rows = ?, status = 'completed'
          WHERE id = ?
        `, [processed, errors, duplicates, batchId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // COMMIT the transaction (this was missing in the original!)
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log('   ✅ TRANSACTION COMMITTED');
      console.log(`   📊 Results:`);
      console.log(`      - Processed: ${processed} new records`);
      console.log(`      - Duplicates: ${duplicates}`);
      console.log(`      - Errors: ${errors}`);

      db.close();
      resolve({ processed, duplicates, errors, batchId });

    } catch (error) {
      console.error(`   ❌ Import failed: ${error.message}`);
      
      // ROLLBACK on error
      db.run('ROLLBACK', () => {
        db.close();
        reject(error);
      });
    }
  });
}

async function main() {
  const filename = process.argv[2];
  
  if (!filename) {
    console.error('❌ Usage: node simple-import-fixed.js <filename>');
    process.exit(1);
  }

  try {
    const result = await importExcelFile(filename);
    console.log(`\n🎉 Import completed successfully!`);
    console.log(`   📊 Summary: ${result.processed} processed, ${result.duplicates} duplicates, ${result.errors} errors`);
    
    // Quick verification
    const db = new sqlite3.Database('./onemap.db');
    const total = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM status_changes', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    db.close();
    
    console.log(`   📋 Total records in database: ${total}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();