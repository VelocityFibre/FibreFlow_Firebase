#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function viewImportBatches() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    console.log('📦 IMPORT BATCH HISTORY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const query = `
      SELECT 
        id,
        filename,
        import_date,
        total_rows,
        processed_rows,
        error_rows,
        status
      FROM import_batches
      ORDER BY import_date DESC
      LIMIT 10
    `;
    
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log('No import batches found.');
      return;
    }
    
    result.rows.forEach(batch => {
      const timestamp = batch.import_date ? new Date(batch.import_date).toLocaleString() : 'Unknown';
      console.log(`📁 ${batch.filename || 'Unknown file'}`);
      console.log(`   ID: ${batch.id}`);
      console.log(`   Imported: ${timestamp}`);
      console.log(`   Status: ${batch.status || 'unknown'}`);
      console.log(`   Total Rows: ${batch.total_rows || 0}`);
      console.log(`   Processed: ${batch.processed_rows || 0}`);
      console.log(`   Errors: ${batch.error_rows || 0}\n`);
    });
    
    // Check for status changes
    console.log('📊 STATUS CHANGE SUMMARY');
    console.log('─────────────────────────────────────────────────────────────');
    
    const statusQuery = `
      SELECT COUNT(*) as total_changes
      FROM status_history
    `;
    
    const statusResult = await client.query(statusQuery);
    const totalChanges = statusResult.rows[0].total_changes;
    
    console.log(`Total status changes tracked: ${totalChanges}\n`);
    
    if (totalChanges > 0) {
      const recentQuery = `
        SELECT 
          property_id,
          pole_number,
          old_status,
          new_status,
          changed_at,
          import_batch_id
        FROM status_history
        ORDER BY changed_at DESC
        LIMIT 10
      `;
      
      const recentResult = await client.query(recentQuery);
      
      console.log('📋 Recent Status Changes:');
      recentResult.rows.forEach(change => {
        const timestamp = change.changed_at ? new Date(change.changed_at).toLocaleString() : 'Unknown';
        const oldStatus = change.old_status || '[New Record]';
        const pole = change.pole_number || '[No Pole]';
        
        console.log(`   ${timestamp}`);
        console.log(`   Property: ${change.property_id} | Pole: ${pole}`);
        console.log(`   Status: ${oldStatus} → ${change.new_status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

viewImportBatches().catch(console.error);