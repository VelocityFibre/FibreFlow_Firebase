#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const xlsx = require('xlsx');
const fs = require('fs');

console.log('=== DIRECT AUGUST 5 IMPORT ===');

const filename = '/home/ldp/Downloads/1754473943261_Lawley__05082025.xlsx';
const snapshotDate = '2025-08-05';

if (!fs.existsSync(filename)) {
  console.error('❌ File not found:', filename);
  process.exit(1);
}

console.log('📂 Importing:', filename);
console.log('📅 Date:', snapshotDate);

// Read Excel file
console.log('📊 Reading Excel file...');
const workbook = xlsx.readFile(filename);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);

console.log(`   Found ${data.length} rows`);

// Connect to database
const db = new sqlite3.Database('../onemap.db');

// Check if daily_snapshots table exists, create if not
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
  if (err) {
    console.error('❌ Error creating table:', err.message);
    process.exit(1);
  }
  
  console.log('⏳ Processing rows...');
  
  // Clear existing data for this date
  db.run('DELETE FROM daily_snapshots WHERE snapshot_date = ?', [snapshotDate], (err) => {
    if (err) {
      console.error('❌ Error clearing existing data:', err.message);
      process.exit(1);
    }
    
    let processed = 0;
    let errors = 0;
    const batchId = Math.random().toString(16).substr(2, 16);
    
    // Begin transaction
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('❌ Error starting transaction:', err.message);
        process.exit(1);
      }
      
      // Process each row
      data.forEach((row, i) => {
        const propertyId = row['Property ID'];
        if (!propertyId) {
          processed++;
          return;
        }
        
        const mappedRow = {
          property_id: propertyId,
          pole_number: row['Pole Number'] || null,
          drop_number: row['Drop Number'] || null,
          status: row['Status'] || null,
          address: row['Location Address'] || null,
          agent: row['Field Agent Name (pole permission)'] || 
                 row['Field Agent Name (Home Sign Ups)'] || 
                 row['Installer Name'] || null,
          location_lat: row['Latitude'] || null,
          location_lng: row['Longitude'] || null,
          pon: row['PONs'] || null
        };
        
        db.run(`INSERT OR REPLACE INTO daily_snapshots 
          (property_id, snapshot_date, pole_number, drop_number, status, 
           agent, address, location_lat, location_lng, pon, import_batch_id, raw_data) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          [mappedRow.property_id, snapshotDate, mappedRow.pole_number, mappedRow.drop_number, 
           mappedRow.status, mappedRow.agent, mappedRow.address, mappedRow.location_lat,
           mappedRow.location_lng, mappedRow.pon, batchId, JSON.stringify(row)],
          function(err) {
            if (err) {
              errors++;
              console.error(`   ❌ Error on row ${i}:`, err.message);
            } else {
              processed++;
            }
            
            if (processed % 500 === 0) {
              console.log(`   ⏳ Processed ${processed} records...`);
            }
            
            // Check if all done
            if ((processed + errors) >= data.length) {
              // Commit transaction
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('❌ Error committing:', err.message);
                  process.exit(1);
                }
                
                console.log('✅ Import complete:');
                console.log(`   Processed: ${processed}`);
                console.log(`   Errors: ${errors}`);
                console.log(`   Date: ${snapshotDate}`);
                console.log(`   Batch ID: ${batchId}`);
                
                db.close();
                console.log('\n🎉 August 5 data imported successfully!');
              });
            }
          }
        );
      });
    });
  });
});