#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('=== SNAPSHOT-BASED IMPORT SYSTEM ===');
console.log('Implementing proper snapshot comparison approach\n');

// Column mappings
const COLUMN_MAPPINGS = {
  'Property ID': 'property_id',
  'Pole Number': 'pole_number',
  'Drop Number': 'drop_number',
  'Status': 'status',
  'date_status_changed': 'status_date',
  'lst_mod_dt': 'last_modified',
  'Field Agent Name (pole permission)': 'agent',
  'Field Agent Name (Home Sign Ups)': 'agent',
  'Installer Name': 'agent',
  'Location Address': 'address',
  'Latitude': 'location_lat',
  'Longitude': 'location_lng',
  'PONs': 'pon'
};

// Status progression levels
const STATUS_LEVELS = {
  'Pole Permission: Pending': 1,
  'Pole Permission: Approved': 2,
  'Home Sign Ups: Pending': 3,
  'Home Sign Ups: Approved': 4,
  'Home Sign Ups: Approved & Installation Scheduled': 5,
  'Home Installation: In Progress': 6,
  'Home Installation: Installed': 7,
  'Home Installation: Complete': 8
};

function extractDateFromFilename(filename) {
  // Manual mapping for known files (most reliable)
  const dateMap = {
    '1754473447790_Lawley_01082025.xlsx': '2025-08-01',
    '1754473537620_Lawley_02082025.xlsx': '2025-08-02', 
    '1754473671995_Lawley_03082025.xlsx': '2025-08-03',
    '1754473817260_Lawley_04082025.xlsx': '2025-08-04',
    '1754473943261_Lawley__05082025.xlsx': '2025-08-05'
  };
  
  if (dateMap[filename]) {
    return dateMap[filename];
  }
  
  // Extract date from end of filename like "_02082025.xlsx" 
  const match = filename.match(/_(\d{2})(\d{2})(\d{4})\.xlsx$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  
  console.warn(`Cannot extract date from filename: ${filename}`);
  return null;
}

function generateBatchId() {
  return Math.random().toString(16).substr(2, 16);
}

function mapExcelRow(excelRow) {
  const mapped = {};
  
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

function categorizeChange(oldStatus, newStatus) {
  const oldLevel = STATUS_LEVELS[oldStatus] || 0;
  const newLevel = STATUS_LEVELS[newStatus] || 0;
  
  if (newLevel < oldLevel) {
    const levelsBack = oldLevel - newLevel;
    return { 
      type: 'revert', 
      severity: levelsBack >= 4 ? 'critical' : levelsBack === 3 ? 'high' : levelsBack === 2 ? 'medium' : 'low',
      levelsBack 
    };
  } else if (newLevel > oldLevel + 1) {
    return { type: 'bypassed', severity: 'medium', levelsBack: 0 };
  } else {
    return { type: 'normal', severity: 'none', levelsBack: 0 };
  }
}

async function setupSnapshotTables(db) {
  console.log('📋 Setting up snapshot tables...');
  
  // Create daily snapshots table
  await new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS daily_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      snapshot_date DATE NOT NULL,
      pole_number TEXT,
      drop_number TEXT,
      status TEXT,
      status_date DATETIME,
      last_modified DATETIME,
      agent TEXT,
      address TEXT,
      location_lat REAL,
      location_lng REAL,
      pon TEXT,
      import_batch_id TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(property_id, snapshot_date)
    )`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Create snapshot changes table
  await new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS snapshot_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      old_status TEXT,
      new_status TEXT,
      old_agent TEXT,
      new_agent TEXT,
      change_type TEXT, -- 'status_change', 'new_property', 'agent_change', 'data_update'
      severity TEXT,    -- 'critical', 'high', 'medium', 'low', 'none'
      levels_back INTEGER DEFAULT 0,
      pole_number TEXT,
      drop_number TEXT,
      address TEXT,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Create indexes
  await new Promise((resolve, reject) => {
    db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_date ON daily_snapshots(snapshot_date)`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.run(`CREATE INDEX IF NOT EXISTS idx_snapshots_property ON daily_snapshots(property_id)`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.run(`CREATE INDEX IF NOT EXISTS idx_changes_dates ON snapshot_changes(from_date, to_date)`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log('   ✅ Snapshot tables ready');
}

async function importSnapshot(filename, snapshotDate) {
  const db = new sqlite3.Database('./onemap.db');
  
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`\n📂 Importing snapshot: ${filename} (${snapshotDate})`);
      
      const filePath = filename.startsWith('/') ? filename : path.join('../data/excel', filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Setup tables
      await setupSnapshotTables(db);

      // Read Excel file
      console.log('   📊 Reading Excel file...');
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      console.log(`   📋 Found ${data.length} rows`);

      // Start transaction
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Clear any existing data for this date
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM daily_snapshots WHERE snapshot_date = ?', [snapshotDate], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const batchId = generateBatchId();
      let processed = 0;
      let errors = 0;

      // Process each row
      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          const mappedRow = mapExcelRow(row);

          // Skip if no property ID
          if (!mappedRow.property_id) continue;

          // Insert into daily snapshots
          await new Promise((resolve, reject) => {
            db.run(`INSERT OR REPLACE INTO daily_snapshots 
              (property_id, snapshot_date, pole_number, drop_number, status, 
               status_date, last_modified, agent, address, location_lat, 
               location_lng, pon, import_batch_id, raw_data)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
              mappedRow.property_id,
              snapshotDate,
              mappedRow.pole_number,
              mappedRow.drop_number,
              mappedRow.status,
              mappedRow.status_date,
              mappedRow.last_modified,
              mappedRow.agent,
              mappedRow.address,
              mappedRow.location_lat,
              mappedRow.location_lng,
              mappedRow.pon,
              batchId,
              JSON.stringify(row)
            ], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          processed++;
          
          if (processed % 500 === 0) {
            console.log(`   ⏳ Processed ${processed} records...`);
          }

        } catch (rowError) {
          errors++;
          console.log(`   ❌ Error on row ${i}: ${rowError.message}`);
        }
      }

      // Create import batch record
      await new Promise((resolve, reject) => {
        db.run(`INSERT OR REPLACE INTO import_batches 
          (id, filename, import_date, status, processed_rows, error_rows, column_mapping)
          VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)`, [
          batchId, filename, 'completed_snapshot', processed, errors, JSON.stringify(COLUMN_MAPPINGS)
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Commit transaction
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`   ✅ Snapshot imported: ${processed} records, ${errors} errors`);

      db.close();
      resolve({ processed, errors, batchId, snapshotDate });

    } catch (error) {
      console.error(`   ❌ Import failed: ${error.message}`);
      db.run('ROLLBACK', () => {
        db.close();
        reject(error);
      });
    }
  });
}

async function compareSnapshots(fromDate, toDate) {
  const db = new sqlite3.Database('./onemap.db');
  
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`\n🔍 Comparing snapshots: ${fromDate} → ${toDate}`);

      // Find changes between snapshots
      const changes = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            COALESCE(curr.property_id, prev.property_id) as property_id,
            COALESCE(curr.pole_number, prev.pole_number, '') as pole_number,
            COALESCE(curr.drop_number, prev.drop_number, '') as drop_number,
            COALESCE(curr.address, prev.address, '') as address,
            prev.status as old_status,
            curr.status as new_status,
            prev.agent as old_agent,
            curr.agent as new_agent,
            CASE 
              WHEN prev.property_id IS NULL THEN 'new_property'
              WHEN curr.property_id IS NULL THEN 'removed_property'
              WHEN COALESCE(prev.status, '') != COALESCE(curr.status, '') THEN 'status_change'
              WHEN COALESCE(prev.agent, '') != COALESCE(curr.agent, '') THEN 'agent_change'
              ELSE 'no_change'
            END as change_type
          FROM daily_snapshots curr
          FULL OUTER JOIN daily_snapshots prev 
            ON curr.property_id = prev.property_id
          WHERE curr.snapshot_date = ? AND prev.snapshot_date = ?
            AND (
              COALESCE(prev.status, '') != COALESCE(curr.status, '') OR
              COALESCE(prev.agent, '') != COALESCE(curr.agent, '') OR
              prev.property_id IS NULL OR
              curr.property_id IS NULL
            )
          ORDER BY change_type, property_id
        `, [toDate, fromDate], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      console.log(`   📊 Found ${changes.length} changes`);

      // Start transaction for inserting changes
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Clear existing changes for this date range
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM snapshot_changes WHERE from_date = ? AND to_date = ?', 
          [fromDate, toDate], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Categorize and insert changes
      let statusChanges = 0;
      let reverts = 0;
      let newProperties = 0;

      for (const change of changes) {
        let severity = 'none';
        let levelsBack = 0;

        if (change.change_type === 'status_change' && change.old_status && change.new_status) {
          const analysis = categorizeChange(change.old_status, change.new_status);
          severity = analysis.severity;
          levelsBack = analysis.levelsBack;
          
          if (analysis.type === 'revert') {
            reverts++;
          }
          statusChanges++;
        } else if (change.change_type === 'new_property') {
          newProperties++;
        }

        await new Promise((resolve, reject) => {
          db.run(`INSERT INTO snapshot_changes 
            (property_id, from_date, to_date, old_status, new_status, 
             old_agent, new_agent, change_type, severity, levels_back,
             pole_number, drop_number, address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            change.property_id,
            fromDate,
            toDate,
            change.old_status,
            change.new_status,
            change.old_agent,
            change.new_agent,
            change.change_type,
            severity,
            levelsBack,
            change.pole_number,
            change.drop_number,
            change.address
          ], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Commit changes
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`   ✅ Analysis complete:`);
      console.log(`      - Status changes: ${statusChanges}`);
      console.log(`      - Status reverts: ${reverts}`);
      console.log(`      - New properties: ${newProperties}`);

      db.close();
      resolve({ 
        totalChanges: changes.length,
        statusChanges, 
        reverts, 
        newProperties,
        changes: changes
      });

    } catch (error) {
      console.error(`   ❌ Comparison failed: ${error.message}`);
      db.run('ROLLBACK', () => {
        db.close();
        reject(error);
      });
    }
  });
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'import') {
    const filename = process.argv[3];
    if (!filename) {
      console.error('❌ Usage: node snapshot-import-system.js import <filename>');
      process.exit(1);
    }

    const snapshotDate = extractDateFromFilename(filename);
    if (!snapshotDate) {
      console.error('❌ Cannot extract date from filename');
      process.exit(1);
    }

    try {
      const result = await importSnapshot(filename, snapshotDate);
      console.log(`\n🎉 Snapshot import completed!`);
      console.log(`   📊 Date: ${result.snapshotDate}`);
      console.log(`   📋 Records: ${result.processed}`);
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    }

  } else if (command === 'compare') {
    const fromDate = process.argv[3];
    const toDate = process.argv[4];
    
    if (!fromDate || !toDate) {
      console.error('❌ Usage: node snapshot-import-system.js compare <from-date> <to-date>');
      console.error('   Example: node snapshot-import-system.js compare 2025-08-03 2025-08-04');
      process.exit(1);
    }

    try {
      const result = await compareSnapshots(fromDate, toDate);
      
      console.log(`\n🎯 COMPARISON RESULTS:`);
      console.log(`📊 Total Changes: ${result.totalChanges}`);
      console.log(`🔄 Status Changes: ${result.statusChanges}`);
      console.log(`⚠️  Status Reverts: ${result.reverts}`);
      console.log(`🆕 New Properties: ${result.newProperties}`);

      // Show sample changes
      if (result.changes.length > 0) {
        console.log(`\n📋 Sample Changes:`);
        result.changes.slice(0, 5).forEach((change, i) => {
          console.log(`${i + 1}. Property ${change.property_id}: "${change.old_status}" → "${change.new_status}"`);
        });
      }

    } catch (error) {
      console.error('❌ Comparison failed:', error.message);
      process.exit(1);
    }

  } else {
    console.log('📋 SNAPSHOT IMPORT SYSTEM USAGE:');
    console.log('');
    console.log('Import snapshot:');
    console.log('  node snapshot-import-system.js import <filename>');
    console.log('  Example: node snapshot-import-system.js import 1754473537620_Lawley_02082025.xlsx');
    console.log('');
    console.log('Compare snapshots:');
    console.log('  node snapshot-import-system.js compare <from-date> <to-date>');
    console.log('  Example: node snapshot-import-system.js compare 2025-08-03 2025-08-04');
    console.log('');
    console.log('This will create proper daily snapshots and detect changes like DuckDB!');
  }
}

main();