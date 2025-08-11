const { Pool } = require('pg');
const config = require('../config/database.json');
const pool = new Pool(config.postgres);

(async () => {
  try {
    // Check batch status
    const batchResult = await pool.query(`
      SELECT id, source_file, status, total_rows, processed_rows, new_entities, updated_entities,
             to_char(import_started, 'HH24:MI:SS') as started,
             to_char(import_completed, 'HH24:MI:SS') as completed
      FROM onemap_import_batches 
      WHERE source_file = '1754632680975_Lawley_07082025.xlsx'
      ORDER BY import_started DESC
    `);
    
    console.log('August 7th batch status:');
    batchResult.rows.forEach(row => {
      console.log('---');
      console.log('Batch ID:', row.id);
      console.log('Status:', row.status);
      console.log('Total rows:', row.total_rows);
      console.log('Processed:', row.processed_rows || 0);
      console.log('New entities:', row.new_entities || 0);
      console.log('Updated entities:', row.updated_entities || 0);
      console.log('Started:', row.started);
      console.log('Completed:', row.completed || 'Still running');
    });
    
    // Check actual row count
    const countResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM onemap_lawley_raw 
      WHERE source_file = '1754632680975_Lawley_07082025.xlsx'
    `);
    
    console.log('\nActual rows in database:', countResult.rows[0].count);
    
    // Update batch status if needed
    if (batchResult.rows.length > 0 && batchResult.rows[0].status === 'processing') {
      const actualCount = parseInt(countResult.rows[0].count);
      if (actualCount > 0) {
        await pool.query(`
          UPDATE onemap_import_batches 
          SET status = 'completed',
              import_completed = NOW(),
              processed_rows = $2,
              new_entities = $2,
              updated_entities = 0
          WHERE id = $1
        `, [batchResult.rows[0].id, actualCount]);
        console.log('\nUpdated batch status to completed');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();