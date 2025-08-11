const { Pool } = require('pg');
const config = require('../config/database.json');
const pool = new Pool(config.postgres);

const files = [
  '1754891594710_Lawley_09082025.xlsx',
  '1754891703324_Lawley_10082025.xlsx'
];

async function checkAndComplete(fileName) {
  try {
    // Check batch status
    const batchResult = await pool.query(
      'SELECT id, status, total_rows FROM onemap_import_batches WHERE source_file = $1',
      [fileName]
    );
    
    if (batchResult.rows.length === 0) {
      console.log(`${fileName}: No batch found`);
      return;
    }
    
    const batch = batchResult.rows[0];
    
    // Check actual row count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM onemap_lawley_raw WHERE source_file = $1',
      [fileName]
    );
    
    const actualCount = parseInt(countResult.rows[0].count);
    
    console.log(`${fileName}:`);
    console.log(`  Batch status: ${batch.status}`);
    console.log(`  Expected rows: ${batch.total_rows}`);
    console.log(`  Actual rows: ${actualCount}`);
    
    // Update if processing
    if (batch.status === 'processing' && actualCount > 0) {
      await pool.query(`
        UPDATE onemap_import_batches 
        SET status = 'completed',
            import_completed = NOW(),
            processed_rows = $2,
            new_entities = $2
        WHERE id = $1
      `, [batch.id, actualCount]);
      console.log(`  Updated to completed`);
    }
  } catch (error) {
    console.error(`Error processing ${fileName}:`, error.message);
  }
}

async function generateSummary() {
  const result = await pool.query(`
    SELECT 
      to_char(import_started, 'MM/DD') as date,
      source_file,
      total_rows,
      processed_rows,
      new_entities,
      updated_entities,
      status
    FROM onemap_import_batches
    WHERE source_file LIKE '%Lawley%082025.xlsx'
    ORDER BY source_file
  `);
  
  console.log('\n=== IMPORT SUMMARY ===');
  console.log('Date | File | Total | Processed | New | Updated | Status');
  console.log('-----|------|-------|-----------|-----|---------|--------');
  
  result.rows.forEach(row => {
    const shortName = row.source_file.match(/(\d{2})082025/)?.[1] || '??';
    console.log(
      `08/${shortName} | ${row.source_file.substring(0, 20)}... | ${row.total_rows} | ${row.processed_rows || 0} | ${row.new_entities || 0} | ${row.updated_entities || 0} | ${row.status}`
    );
  });
  
  // Total statistics
  const totals = await pool.query(`
    SELECT 
      COUNT(DISTINCT property_id) as total_properties,
      COUNT(DISTINCT pole_number) as total_poles,
      COUNT(DISTINCT field_agent_name_pole_permission) as total_agents
    FROM onemap_lawley_raw
    WHERE source_file LIKE '%Lawley%082025.xlsx'
  `);
  
  console.log('\n=== OVERALL STATISTICS ===');
  console.log(`Total unique properties: ${totals.rows[0].total_properties}`);
  console.log(`Total unique poles: ${totals.rows[0].total_poles}`);
  console.log(`Total unique agents: ${totals.rows[0].total_agents}`);
}

async function main() {
  try {
    // Check and complete Aug 9 and 10
    for (const file of files) {
      await checkAndComplete(file);
    }
    
    // Generate summary
    await generateSummary();
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();