#!/usr/bin/env node

const Database = require('./src/database');
const ExcelImporter = require('./src/excel-importer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

async function importWithTracking(filename) {
  if (!filename) {
    console.error(chalk.red('Please provide filename as argument'));
    process.exit(1);
  }
  
  const filepath = path.join(__dirname, '../data/excel/', filename);
  
  if (!fs.existsSync(filepath)) {
    console.error(chalk.red(`File not found: ${filepath}`));
    process.exit(1);
  }
  
  const db = new Database();
  await db.initialize();
  
  console.log(chalk.cyan('=== IMPORT WITH STATUS TRACKING ==='));
  console.log(chalk.gray(`File: ${filename}\n`));
  
  // Create status history table if not exists
  console.log(chalk.yellow('1. Setting up status tracking...'));
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      pole_number TEXT,
      drop_number TEXT,
      old_status TEXT,
      new_status TEXT,
      status_change_date DATETIME,
      import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      import_file TEXT,
      import_batch_id TEXT,
      agent TEXT,
      address TEXT,
      change_type TEXT CHECK(change_type IN ('new', 'update', 'revert'))
    )
  `);
  
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_history_property ON status_history(property_id);
    CREATE INDEX IF NOT EXISTS idx_history_date ON status_history(status_change_date);
    CREATE INDEX IF NOT EXISTS idx_history_batch ON status_history(import_batch_id);
  `);
  
  // Create enhanced status_changes table with tracking
  await db.run(`
    CREATE TABLE IF NOT EXISTS status_changes_staging (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT,
      pole_number TEXT,
      drop_number TEXT,
      status TEXT,
      status_date DATETIME,
      agent TEXT,
      address TEXT,
      location_lat REAL,
      location_lng REAL,
      zone TEXT,
      feeder TEXT,
      distribution TEXT,
      pon TEXT,
      project TEXT,
      contractor TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      import_batch_id TEXT,
      source_row INTEGER,
      raw_data TEXT,
      is_duplicate BOOLEAN DEFAULT 0,
      is_status_change BOOLEAN DEFAULT 0
    )
  `);
  
  // Import to staging first
  console.log(chalk.yellow('2. Importing to staging table...'));
  
  const batchId = crypto.randomBytes(8).toString('hex');
  const importer = new ExcelImporter(db);
  
  // Temporarily point to staging table
  const originalImport = importer.insertRow.bind(importer);
  importer.insertRow = async function(row) {
    const columns = Object.keys(row).filter(k => row[k] !== null);
    columns.push('import_batch_id');
    const values = columns.slice(0, -1).map(k => row[k]);
    values.push(batchId);
    const placeholders = columns.map(() => '?').join(', ');
    
    const sql = `INSERT INTO status_changes_staging (${columns.join(', ')}) VALUES (${placeholders})`;
    await this.db.run(sql, values);
  };
  
  // Import the file
  const importResult = await importer.importExcelFile(filepath, { skipDuplicateCheck: true });
  
  console.log(`   Imported ${importResult.processed} records to staging`);
  
  // Analyze staging data
  console.log(chalk.yellow('\n3. Analyzing for changes...'));
  
  const changes = await db.all(`
    SELECT 
      s.property_id,
      s.pole_number,
      s.drop_number,
      s.status as new_status,
      s.status_date,
      s.agent,
      s.address,
      c.status as old_status,
      CASE 
        WHEN c.property_id IS NULL THEN 'new'
        WHEN c.status != s.status THEN 'update'
        ELSE 'duplicate'
      END as change_type
    FROM status_changes_staging s
    LEFT JOIN status_changes c ON s.property_id = c.property_id
    WHERE s.import_batch_id = ?
  `, [batchId]);
  
  const newRecords = changes.filter(c => c.change_type === 'new');
  const updates = changes.filter(c => c.change_type === 'update');
  const duplicates = changes.filter(c => c.change_type === 'duplicate');
  
  console.log(`   New records: ${newRecords.length}`);
  console.log(`   Status changes: ${updates.length}`);
  console.log(`   Duplicates: ${duplicates.length}`);
  
  // Track status changes
  console.log(chalk.yellow('\n4. Recording status changes...'));
  
  let trackedCount = 0;
  
  for (const update of updates) {
    // Check if this is a revert (going backwards)
    let changeType = 'update';
    if (isStatusRevert(update.old_status, update.new_status)) {
      changeType = 'revert';
    }
    
    await db.run(`
      INSERT INTO status_history (
        property_id, pole_number, drop_number,
        old_status, new_status, status_change_date,
        import_file, import_batch_id, agent, address, change_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      update.property_id,
      update.pole_number,
      update.drop_number,
      update.old_status,
      update.new_status,
      update.status_date,
      filename,
      batchId,
      update.agent,
      update.address,
      changeType
    ]);
    
    trackedCount++;
    
    if (trackedCount <= 10) {
      console.log(`   ${trackedCount}. Property ${update.property_id}: ${update.old_status} → ${update.new_status}`);
    }
  }
  
  console.log(`   Total changes tracked: ${trackedCount}`);
  
  // Move non-duplicates from staging to main table
  console.log(chalk.yellow('\n5. Updating main database...'));
  
  // Delete existing records that will be updated
  await db.run(`
    DELETE FROM status_changes 
    WHERE property_id IN (
      SELECT property_id FROM status_changes_staging 
      WHERE import_batch_id = ? AND property_id IN (
        SELECT property_id FROM status_history WHERE import_batch_id = ?
      )
    )
  `, [batchId, batchId]);
  
  // Insert new and updated records
  await db.run(`
    INSERT INTO status_changes 
    SELECT 
      NULL as id,
      property_id, pole_number, drop_number, status, status_date,
      agent, address, location_lat, location_lng, zone, feeder,
      distribution, pon, project, contractor, created_at,
      import_batch_id, source_row, raw_data
    FROM status_changes_staging
    WHERE import_batch_id = ?
      AND property_id NOT IN (
        SELECT s.property_id 
        FROM status_changes_staging s
        JOIN status_changes c ON s.property_id = c.property_id
        WHERE s.status = c.status AND s.import_batch_id = ?
      )
  `, [batchId, batchId]);
  
  // Clean up staging
  await db.run('DELETE FROM status_changes_staging WHERE import_batch_id = ?', [batchId]);
  
  // Generate summary report
  console.log(chalk.green('\n=== IMPORT SUMMARY ===\n'));
  
  const summary = await db.get(`
    SELECT 
      COUNT(CASE WHEN change_type = 'new' THEN 1 END) as new_count,
      COUNT(CASE WHEN change_type = 'update' THEN 1 END) as update_count,
      COUNT(CASE WHEN change_type = 'revert' THEN 1 END) as revert_count
    FROM status_history
    WHERE import_batch_id = ?
  `, [batchId]);
  
  console.log(`New properties added: ${newRecords.length}`);
  console.log(`Status updates: ${summary.update_count}`);
  console.log(`Status reverts: ${summary.revert_count} ⚠️`);
  console.log(`Duplicates skipped: ${duplicates.length}`);
  
  // Show concerning changes
  const reverts = await db.all(`
    SELECT * FROM status_history 
    WHERE import_batch_id = ? AND change_type = 'revert'
    LIMIT 5
  `, [batchId]);
  
  if (reverts.length > 0) {
    console.log(chalk.red('\n⚠️  Status Reverts Detected:'));
    reverts.forEach((r, i) => {
      console.log(`${i + 1}. Property ${r.property_id}: ${r.old_status} → ${r.new_status}`);
    });
  }
  
  // Create import batch record if not exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      filename TEXT,
      import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT,
      processed_rows INTEGER,
      status_changes INTEGER
    )
  `);
  
  await db.run(`
    INSERT OR REPLACE INTO import_batches (id, filename, status, processed_rows, status_changes)
    VALUES (?, ?, ?, ?, ?)
  `, [batchId, filename, 'completed_with_tracking', importResult.processed, trackedCount]);
  
  // Update audit log
  const auditEntry = `
### ${new Date().toISOString().split('T')[0]} - ${filename}
- Total Records: ${importResult.processed}
- New Properties: ${newRecords.length}
- Status Changes: ${summary.update_count}
- Status Reverts: ${summary.revert_count}
- Duplicates Skipped: ${duplicates.length}
`;
  
  fs.appendFileSync(
    path.join(__dirname, '../IMPORT_AUDIT_LOG.md'),
    auditEntry
  );
  
  console.log(chalk.green('\n✓ Import completed with full status tracking!'));
  console.log(chalk.gray(`Batch ID: ${batchId}`));
  
  // Run anomaly detection
  console.log(chalk.yellow('\n6. Running anomaly detection...'));
  
  // Insert newly detected anomalies for this batch
  const anomalyResult = await db.run(`
    INSERT INTO status_anomalies (
      property_id, pole_number, drop_number,
      anomaly_type, old_status, new_status,
      status_change_date, import_file, import_batch_id,
      agent, address, severity
    )
    SELECT 
      sh.property_id, sh.pole_number, sh.drop_number,
      ar.anomaly_type, sh.old_status, sh.new_status,
      sh.status_change_date, sh.import_file, sh.import_batch_id,
      sh.agent, sh.address, ar.severity
    FROM status_history sh
    JOIN anomaly_rules ar ON 
      (sh.old_status = ar.from_status AND sh.new_status = ar.to_status)
      OR (ar.from_status = '' AND sh.old_status IS NULL AND sh.new_status = ar.to_status)
    WHERE ar.active = 1
      AND sh.import_batch_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM status_anomalies sa 
        WHERE sa.property_id = sh.property_id 
          AND sa.old_status = sh.old_status 
          AND sa.new_status = sh.new_status
          AND sa.status_change_date = sh.status_change_date
      )
  `, [batchId]);
  
  const anomalyStats = await db.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
      COUNT(CASE WHEN severity = 'high' THEN 1 END) as high
    FROM status_anomalies
    WHERE import_batch_id = ?
  `, [batchId]);
  
  if (anomalyStats.total > 0) {
    console.log(chalk.red(`\n⚠️  Anomalies Detected:`));
    console.log(`   Critical: ${anomalyStats.critical}`);
    console.log(`   High: ${anomalyStats.high}`);
    console.log(`   Total: ${anomalyStats.total}`);
    console.log(chalk.yellow('\n   Run "node scripts/detect-anomalies.js --export" for detailed report'));
  }
  
  await db.close();
}

function isStatusRevert(oldStatus, newStatus) {
  const statusOrder = [
    'Pole Permission: Pending',
    'Pole Permission: Approved',
    'Home Sign Ups: Pending',
    'Home Sign Ups: Approved',
    'Home Sign Ups: Approved & Installation Scheduled',
    'Home Installation: In Progress',
    'Home Installation: Installed'
  ];
  
  const oldIndex = statusOrder.indexOf(oldStatus);
  const newIndex = statusOrder.indexOf(newStatus);
  
  return oldIndex > newIndex && oldIndex !== -1 && newIndex !== -1;
}

// Get filename from command line
const filename = process.argv[2];
if (!filename) {
  console.error(chalk.red('Usage: node import-with-tracking.js <filename>'));
  process.exit(1);
}

importWithTracking(filename).catch(console.error);