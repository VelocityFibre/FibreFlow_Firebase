const { Pool } = require('pg');
const config = require('../config/database.json');
const pool = new Pool(config.postgres);

(async () => {
  try {
    const result = await pool.query("SELECT id, source_file, status, total_rows, processed_rows, new_entities FROM onemap_import_batches WHERE source_file = '1754473943261_Lawley__05082025.xlsx'");
    console.log('August 5th batch status:');
    result.rows.forEach(row => {
      console.log('Batch ID:', row.id);
      console.log('Status:', row.status);
      console.log('Total rows:', row.total_rows);
      console.log('Processed:', row.processed_rows || 0);
      console.log('New entities:', row.new_entities || 0);
    });
    
    // Delete incomplete batch
    if (result.rows.length > 0 && result.rows[0].status !== 'completed') {
      await pool.query("DELETE FROM onemap_import_batches WHERE source_file = '1754473943261_Lawley__05082025.xlsx'");
      console.log('\nDeleted incomplete batch record');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();