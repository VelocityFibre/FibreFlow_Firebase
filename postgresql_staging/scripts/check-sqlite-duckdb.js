const Database = require('better-sqlite3');
const duckdb = require('duckdb');
const path = require('path');

async function checkDatabases() {
  console.log('=== CHECKING SQLITE DATABASE ===\n');
  
  try {
    // SQLite
    const sqlitePath = path.join(__dirname, '../../OneMap/onemap.db');
    const sqlite = new Database(sqlitePath, { readonly: true });
    
    // Get table names
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('SQLite tables found:');
    tables.forEach(t => console.log(`  - ${t.name}`));
    
    // Check each table for Lawley data
    for (const table of tables) {
      const count = sqlite.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get();
      if (count.count > 0) {
        console.log(`\n  ${table.name}: ${count.count} records`);
        
        // Check for pole data
        const columns = sqlite.prepare(`PRAGMA table_info("${table.name}")`).all();
        const hasPoleColumn = columns.some(c => c.name.toLowerCase().includes('pole'));
        
        if (hasPoleColumn) {
          const poleCol = columns.find(c => c.name.toLowerCase().includes('pole')).name;
          const poleCount = sqlite.prepare(`SELECT COUNT(DISTINCT "${poleCol}") as count FROM "${table.name}" WHERE "${poleCol}" IS NOT NULL`).get();
          console.log(`    Unique poles: ${poleCount.count}`);
        }
      }
    }
    
    sqlite.close();
    
  } catch (error) {
    console.error('SQLite error:', error.message);
  }
  
  console.log('\n\n=== CHECKING DUCKDB DATABASE ===\n');
  
  try {
    // DuckDB
    const duckPath = path.join(__dirname, '../../OneMap/DuckDB/data/onemap.duckdb');
    const db = new duckdb.Database(duckPath);
    
    db.all("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'", (err, tables) => {
      if (err) {
        console.error('DuckDB error:', err);
        return;
      }
      
      console.log('DuckDB tables found:');
      if (!tables || tables.length === 0) {
        console.log('  No tables found');
        db.close();
        return;
      }
      
      tables.forEach(t => console.log(`  - ${t.table_name}`));
      
      // Check excel_import table
      db.get('SELECT COUNT(*) as total, COUNT(DISTINCT "Pole Number") as poles FROM excel_import', (err, result) => {
        if (err) {
          console.log('\n  excel_import table not found or error:', err.message);
        } else {
          console.log(`\n  excel_import: ${result.total} records, ${result.poles} unique poles`);
        }
        
        db.close();
      });
    });
    
  } catch (error) {
    console.error('DuckDB error:', error.message);
  }
}

checkDatabases();