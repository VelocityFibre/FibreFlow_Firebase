const { Pool } = require('pg');
const config = require('../config/database.json');
const pool = new Pool(config.postgres);

async function generateFinalSummary() {
  try {
    // Update Aug 10 batch if needed
    const aug10Batch = await pool.query(
      "SELECT id FROM onemap_import_batches WHERE source_file = '1754891703324_Lawley_10082025.xlsx' AND status = 'processing'"
    );
    
    if (aug10Batch.rows.length > 0) {
      const count = await pool.query(
        "SELECT COUNT(*) as count FROM onemap_lawley_raw WHERE source_file = '1754891703324_Lawley_10082025.xlsx'"
      );
      
      await pool.query(
        "UPDATE onemap_import_batches SET status = 'completed', import_completed = NOW(), processed_rows = $2, new_entities = $2 WHERE id = $1",
        [aug10Batch.rows[0].id, parseInt(count.rows[0].count)]
      );
    }
    
    // Generate report for the last batch
    const ImportReportGenerator = require('./generate-import-report.js');
    const generator = new ImportReportGenerator();
    await generator.generateReport();
    
    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('POSTGRESQL STAGING - FINAL IMPORT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Generated: ${new Date().toISOString()}\n`);
    
    // Import batches summary
    const batches = await pool.query(`
      SELECT 
        to_char(import_started, 'DD Mon') as date,
        source_file,
        total_rows,
        processed_rows,
        new_entities,
        updated_entities,
        status,
        ROUND(EXTRACT(EPOCH FROM (import_completed - import_started))/60, 1) as duration_mins
      FROM onemap_import_batches
      WHERE source_file LIKE '%Lawley%082025.xlsx'
      ORDER BY source_file
    `);
    
    console.log('IMPORT BATCHES');
    console.log('-'.repeat(80));
    console.log('Date   | Filename                      | Total  | Processed | New    | Updated | Duration');
    console.log('-------|-------------------------------|--------|-----------|--------|---------|----------');
    
    let totalRows = 0;
    let totalProcessed = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    
    batches.rows.forEach(row => {
      const shortName = row.source_file.substring(0, 28) + '...';
      console.log(
        `${row.date.padEnd(6)} | ${shortName.padEnd(29)} | ${String(row.total_rows).padStart(6)} | ${String(row.processed_rows || 0).padStart(9)} | ${String(row.new_entities || 0).padStart(6)} | ${String(row.updated_entities || 0).padStart(7)} | ${row.duration_mins ? row.duration_mins + ' min' : 'N/A'}`
      );
      totalRows += row.total_rows;
      totalProcessed += row.processed_rows || 0;
      totalNew += row.new_entities || 0;
      totalUpdated += row.updated_entities || 0;
    });
    
    console.log('-'.repeat(80));
    console.log(`${'TOTALS'.padEnd(37)} | ${String(totalRows).padStart(6)} | ${String(totalProcessed).padStart(9)} | ${String(totalNew).padStart(6)} | ${String(totalUpdated).padStart(7)} |`);
    
    // Database statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT property_id) as unique_properties,
        COUNT(DISTINCT pole_number) as unique_poles,
        COUNT(DISTINCT drop_number) as unique_drops,
        COUNT(DISTINCT field_agent_name_pole_permission) as unique_agents,
        COUNT(DISTINCT location_address) as unique_addresses,
        AVG(data_quality_score)::DECIMAL(3,2) as avg_quality_score
      FROM onemap_lawley_raw
    `);
    
    console.log('\nDATABASE STATISTICS');
    console.log('-'.repeat(80));
    const s = stats.rows[0];
    console.log(`Total Records:        ${s.total_records.toLocaleString()}`);
    console.log(`Unique Properties:    ${s.unique_properties.toLocaleString()}`);
    console.log(`Unique Poles:         ${s.unique_poles.toLocaleString()}`);
    console.log(`Unique Drops:         ${s.unique_drops.toLocaleString()}`);
    console.log(`Unique Agents:        ${s.unique_agents.toLocaleString()}`);
    console.log(`Unique Addresses:     ${s.unique_addresses.toLocaleString()}`);
    console.log(`Avg Quality Score:    ${s.avg_quality_score}`);
    
    // Status distribution
    const statusDist = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM onemap_lawley_raw
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('\nTOP STATUS VALUES');
    console.log('-'.repeat(80));
    statusDist.rows.forEach(row => {
      console.log(`${row.status.padEnd(60)} ${String(row.count).padStart(10)}`);
    });
    
    // Agent distribution
    const agentDist = await pool.query(`
      SELECT field_agent_name_pole_permission as agent, COUNT(*) as count
      FROM onemap_lawley_raw
      WHERE field_agent_name_pole_permission IS NOT NULL
      GROUP BY field_agent_name_pole_permission
      ORDER BY count DESC
      LIMIT 5
    `);
    
    console.log('\nTOP 5 AGENTS BY RECORD COUNT');
    console.log('-'.repeat(80));
    agentDist.rows.forEach(row => {
      console.log(`${(row.agent || 'Unknown').padEnd(50)} ${String(row.count).padStart(10)}`);
    });
    
    // Import history log
    console.log('\nIMPORT HISTORY LOG LOCATION');
    console.log('-'.repeat(80));
    console.log('reports/import-history.log');
    
    console.log('\nNEXT STEPS');
    console.log('-'.repeat(80));
    console.log('1. Review validation reports for each import batch');
    console.log('2. Track status changes between files using status history tables');
    console.log('3. Set up PostgreSQL → Supabase synchronization');
    console.log('4. Cross-validate with SQLite and DuckDB imports');
    
    console.log('\n' + '='.repeat(80));
    console.log('IMPORT PROCESS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Error generating summary:', error.message);
  } finally {
    await pool.end();
  }
}

generateFinalSummary();