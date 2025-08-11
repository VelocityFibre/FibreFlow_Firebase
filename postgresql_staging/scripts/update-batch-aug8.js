const { Pool } = require('pg');
const config = require('../config/database.json');
const pool = new Pool(config.postgres);

(async () => {
  try {
    // Check batch and row count
    const batchResult = await pool.query(`
      SELECT id, status, total_rows FROM onemap_import_batches 
      WHERE source_file = '1754891492681_Lawley_08082025.xlsx'
    `);
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM onemap_lawley_raw 
      WHERE source_file = '1754891492681_Lawley_08082025.xlsx'
    `);
    
    console.log('Aug 8 batch:', batchResult.rows[0]);
    console.log('Actual rows:', countResult.rows[0].count);
    
    // Update if needed
    if (batchResult.rows[0]?.status === 'processing') {
      const count = parseInt(countResult.rows[0].count);
      await pool.query(`
        UPDATE onemap_import_batches 
        SET status = 'completed', import_completed = NOW(),
            processed_rows = $2, new_entities = $2
        WHERE id = $1
      `, [batchResult.rows[0].id, count]);
      console.log('Updated to completed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();