#!/usr/bin/env node

/**
 * View Status Change History
 */

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function viewStatusHistory() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'recent';
    
    console.log('📊 STATUS CHANGE TRACKING SYSTEM');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    switch (command) {
      case 'recent':
        await showRecentChanges(client, parseInt(args[1]) || 20);
        break;
      case 'property':
        if (!args[1]) {
          console.log('Usage: view-status-history.js property <property-id>');
          return;
        }
        await showPropertyHistory(client, args[1]);
        break;
      case 'pole':
        if (!args[1]) {
          console.log('Usage: view-status-history.js pole <pole-number>');
          return;
        }
        await showPoleHistory(client, args[1]);
        break;
      case 'batches':
        await showImportBatches(client);
        break;
      case 'stats':
        await showStatusStats(client);
        break;
      default:
        showUsage();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

async function showRecentChanges(client, limit) {
  console.log(`📋 RECENT STATUS CHANGES (Last ${limit})`);
  console.log('─────────────────────────────────────────────────────────────\n');
  
  const query = `
    SELECT 
      h.property_id,
      h.pole_number,
      h.old_status,
      h.new_status,
      h.changed_at,
      h.import_batch_id
    FROM status_history h
    ORDER BY h.changed_at DESC
    LIMIT $1
  `;
  
  const result = await client.query(query, [limit]);
  
  if (result.rows.length === 0) {
    console.log('No status changes found.');
    return;
  }
  
  result.rows.forEach(row => {
    const timestamp = new Date(row.changed_at).toLocaleString();
    const oldStatus = row.old_status || '[New Record]';
    const pole = row.pole_number || '[No Pole]';
    
    console.log(`${timestamp}`);
    console.log(`  Property: ${row.property_id} | Pole: ${pole}`);
    console.log(`  Status: ${oldStatus} → ${row.new_status}`);
    console.log(`  Batch: ${row.import_batch_id}\n`);
  });
}

async function showPropertyHistory(client, propertyId) {
  console.log(`📋 STATUS HISTORY FOR PROPERTY: ${propertyId}`);
  console.log('─────────────────────────────────────────────────────────────\n');
  
  const query = `
    SELECT 
      h.old_status,
      h.new_status,
      h.changed_at,
      h.import_batch_id
    FROM status_history h
    WHERE h.property_id = $1
    ORDER BY h.changed_at ASC
  `;
  
  const result = await client.query(query, [propertyId]);
  
  if (result.rows.length === 0) {
    console.log('No status changes found for this property.');
    return;
  }
  
  console.log('Status Progression:');
  result.rows.forEach((row, index) => {
    const timestamp = new Date(row.changed_at).toLocaleString();
    const oldStatus = row.old_status || '[Initial Status]';
    
    console.log(`${index + 1}. ${timestamp}`);
    console.log(`   ${oldStatus} → ${row.new_status}`);
    console.log(`   Batch: ${row.import_batch_id}\n`);
  });
}

async function showPoleHistory(client, poleNumber) {
  console.log(`📋 STATUS HISTORY FOR POLE: ${poleNumber}`);
  console.log('─────────────────────────────────────────────────────────────\n');
  
  const query = `
    SELECT 
      h.property_id,
      h.old_status,
      h.new_status,
      h.changed_at,
      h.import_batch_id
    FROM status_history h
    WHERE h.pole_number = $1
    ORDER BY h.changed_at ASC
  `;
  
  const result = await client.query(query, [poleNumber]);
  
  if (result.rows.length === 0) {
    console.log('No status changes found for this pole.');
    return;
  }
  
  result.rows.forEach(row => {
    const timestamp = new Date(row.changed_at).toLocaleString();
    const oldStatus = row.old_status || '[Initial Status]';
    
    console.log(`Property: ${row.property_id}`);
    console.log(`  ${timestamp}: ${oldStatus} → ${row.new_status}`);
    console.log(`  Batch: ${row.import_batch_id}\n`);
  });
}

async function showImportBatches(client) {
  console.log('📦 IMPORT BATCH HISTORY');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  const query = `
    SELECT 
      id,
      filename,
      imported_at,
      total_rows,
      new_records,
      updated_records,
      skipped_records,
      error_records,
      status
    FROM import_batches
    ORDER BY imported_at DESC
    LIMIT 10
  `;
  
  const result = await client.query(query);
  
  if (result.rows.length === 0) {
    console.log('No import batches found.');
    return;
  }
  
  result.rows.forEach(batch => {
    const timestamp = new Date(batch.imported_at).toLocaleString();
    console.log(`📁 ${batch.filename}`);
    console.log(`   Imported: ${timestamp}`);
    console.log(`   Status: ${batch.status}`);
    console.log(`   Rows: ${batch.total_rows} | New: ${batch.new_records} | Updated: ${batch.updated_records}`);
    console.log(`   Skipped: ${batch.skipped_records} | Errors: ${batch.error_records}\n`);
  });
}

async function showStatusStats(client) {
  console.log('📊 STATUS CHANGE STATISTICS');
  console.log('─────────────────────────────────────────────────────────────\n');
  
  // Most common status transitions
  const transitionQuery = `
    SELECT 
      CONCAT(COALESCE(old_status, '[New]'), ' → ', new_status) as transition,
      COUNT(*) as count
    FROM status_history
    GROUP BY old_status, new_status
    ORDER BY count DESC
    LIMIT 10
  `;
  
  const transitions = await client.query(transitionQuery);
  
  console.log('Most Common Status Transitions:');
  transitions.rows.forEach((row, index) => {
    console.log(`${index + 1}. ${row.transition}: ${row.count} times`);
  });
  
  // Daily activity
  console.log('\n📅 Recent Daily Activity:');
  const dailyQuery = `
    SELECT 
      DATE(changed_at) as date,
      COUNT(*) as changes
    FROM status_history
    WHERE changed_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(changed_at)
    ORDER BY date DESC
  `;
  
  const daily = await client.query(dailyQuery);
  daily.rows.forEach(row => {
    console.log(`   ${row.date}: ${row.changes} status changes`);
  });
}

function showUsage() {
  console.log('USAGE:');
  console.log('  view-status-history.js recent [limit]     - Show recent changes (default 20)');
  console.log('  view-status-history.js property <id>      - Show history for specific property');
  console.log('  view-status-history.js pole <number>      - Show history for specific pole');
  console.log('  view-status-history.js batches            - Show import batch history');
  console.log('  view-status-history.js stats              - Show statistics and trends');
  console.log('\nExamples:');
  console.log('  view-status-history.js recent 50');
  console.log('  view-status-history.js property 249111');
  console.log('  view-status-history.js pole LAW.P.B167');
}

viewStatusHistory().catch(console.error);