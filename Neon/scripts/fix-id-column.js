#!/usr/bin/env node

const { Client } = require('pg');

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech/neondb',
  ssl: { rejectUnauthorized: false }
};

async function fixIdColumn() {
  const client = new Client(NEON_CONFIG);
  
  try {
    await client.connect();
    console.log('🔌 Connected to Neon database\n');
    
    console.log('🔧 Fixing id column to auto-increment...\n');
    
    // Check current max id
    const maxIdQuery = `SELECT MAX(id) as max_id FROM status_changes`;
    const maxIdResult = await client.query(maxIdQuery);
    const maxId = maxIdResult.rows[0].max_id || 0;
    console.log(`Current max ID: ${maxId}`);
    
    // Create sequence if it doesn't exist
    const createSequence = `
      CREATE SEQUENCE IF NOT EXISTS status_changes_id_seq 
      START WITH ${maxId + 1}
      INCREMENT BY 1
    `;
    
    await client.query(createSequence);
    console.log('✅ Created/verified sequence');
    
    // Alter the column to use the sequence
    const alterColumn = `
      ALTER TABLE status_changes 
      ALTER COLUMN id SET DEFAULT nextval('status_changes_id_seq')
    `;
    
    await client.query(alterColumn);
    console.log('✅ Set id column to auto-increment');
    
    // Update the sequence to start from the correct value
    const updateSequence = `
      SELECT setval('status_changes_id_seq', COALESCE(MAX(id), 1)) 
      FROM status_changes
    `;
    
    const seqResult = await client.query(updateSequence);
    console.log(`✅ Set sequence to start from: ${seqResult.rows[0].setval}`);
    
    // Test inserting a record
    console.log('\n🧪 Testing insert...');
    const testInsert = `
      INSERT INTO status_changes (property_id, status) 
      VALUES ('TEST123', 'TEST STATUS') 
      RETURNING id
    `;
    
    const testResult = await client.query(testInsert);
    const newId = testResult.rows[0].id;
    console.log(`✅ Test insert successful - new ID: ${newId}`);
    
    // Clean up test record
    await client.query(`DELETE FROM status_changes WHERE id = $1`, [newId]);
    console.log('✅ Cleaned up test record');
    
    console.log('\n🎉 ID column fixed! Ready for imports.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixIdColumn().catch(console.error);