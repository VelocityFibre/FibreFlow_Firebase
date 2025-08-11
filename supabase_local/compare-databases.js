const sqlite3 = require('sqlite3').verbose();
const duckdb = require('duckdb');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  sqlite: {
    path: './local.db'
  },
  duckdb: {
    path: './analytics.duckdb'
  },
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'fibreflow_staging',
    user: 'postgres',
    password: 'postgres'
  },
  neon: {
    connectionString: process.env.NEON_DATABASE_URL
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY
  }
};

class DatabaseComparator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      databases: {},
      comparisons: {},
      validationErrors: []
    };
  }

  // Connect to all databases
  async connectAll() {
    console.log('Connecting to databases...');
    
    // SQLite
    this.sqlite = new sqlite3.Database(config.sqlite.path);
    
    // DuckDB
    this.duckdb = new duckdb.Database(config.duckdb.path);
    
    // PostgreSQL (only if configured)
    if (config.postgres.host) {
      this.postgres = new Client(config.postgres);
      try {
        await this.postgres.connect();
        console.log('✓ PostgreSQL connected');
      } catch (err) {
        console.log('✗ PostgreSQL not available:', err.message);
      }
    }
    
    // Neon (only if configured)
    if (config.neon.connectionString) {
      this.neon = new Client(config.neon);
      try {
        await this.neon.connect();
        console.log('✓ Neon connected');
      } catch (err) {
        console.log('✗ Neon not available:', err.message);
      }
    }
    
    // Supabase
    if (config.supabase.url && config.supabase.key) {
      this.supabase = createClient(config.supabase.url, config.supabase.key);
      console.log('✓ Supabase client initialized');
    }
  }

  // Get row counts from each database
  async getRowCounts(tableName) {
    const counts = {};
    
    // SQLite
    try {
      const sqliteCount = await new Promise((resolve, reject) => {
        this.sqlite.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });
      counts.sqlite = sqliteCount;
    } catch (err) {
      counts.sqlite = `Error: ${err.message}`;
    }
    
    // DuckDB
    try {
      const duckdbCount = await new Promise((resolve, reject) => {
        this.duckdb.all(`SELECT COUNT(*) as count FROM ${tableName}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0].count);
        });
      });
      counts.duckdb = duckdbCount;
    } catch (err) {
      counts.duckdb = `Error: ${err.message}`;
    }
    
    // PostgreSQL
    if (this.postgres) {
      try {
        const result = await this.postgres.query(`SELECT COUNT(*) FROM ${tableName}`);
        counts.postgres = parseInt(result.rows[0].count);
      } catch (err) {
        counts.postgres = `Error: ${err.message}`;
      }
    }
    
    // Supabase
    if (this.supabase) {
      try {
        const { count, error } = await this.supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        counts.supabase = error ? `Error: ${error.message}` : count;
      } catch (err) {
        counts.supabase = `Error: ${err.message}`;
      }
    }
    
    return counts;
  }

  // Check for duplicates
  async checkDuplicates(tableName, keyColumn) {
    const duplicates = {};
    
    // SQLite
    try {
      const sqliteDupes = await new Promise((resolve, reject) => {
        this.sqlite.all(`
          SELECT ${keyColumn}, COUNT(*) as count 
          FROM ${tableName} 
          GROUP BY ${keyColumn} 
          HAVING COUNT(*) > 1
        `, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      duplicates.sqlite = sqliteDupes.length;
    } catch (err) {
      duplicates.sqlite = `Error: ${err.message}`;
    }
    
    // Add similar checks for other databases...
    
    return duplicates;
  }

  // Compare specific records
  async compareRecords(tableName, whereClause) {
    const records = {};
    
    // Fetch from each database and compare
    // Implementation depends on your specific needs
    
    return records;
  }

  // Generate comparison report
  async generateReport() {
    console.log('\n=== Database Comparison Report ===\n');
    
    // Test with common tables
    const tables = ['poles', 'drops', 'status_changes'];
    
    for (const table of tables) {
      console.log(`\nTable: ${table}`);
      console.log('-'.repeat(40));
      
      // Get row counts
      const counts = await this.getRowCounts(table);
      console.log('Row counts:');
      Object.entries(counts).forEach(([db, count]) => {
        console.log(`  ${db}: ${count}`);
      });
      
      // Check if counts match
      const countValues = Object.values(counts).filter(c => typeof c === 'number');
      const allMatch = countValues.every(c => c === countValues[0]);
      
      if (!allMatch) {
        console.log('  ⚠️  Row counts do not match!');
        this.results.validationErrors.push({
          table,
          error: 'Row count mismatch',
          counts
        });
      } else {
        console.log('  ✓ Row counts match');
      }
    }
    
    return this.results;
  }

  // Close all connections
  async closeAll() {
    if (this.sqlite) this.sqlite.close();
    if (this.duckdb) this.duckdb.close();
    if (this.postgres) await this.postgres.end();
    if (this.neon) await this.neon.end();
  }
}

// Main execution
async function main() {
  const comparator = new DatabaseComparator();
  
  try {
    await comparator.connectAll();
    const report = await comparator.generateReport();
    
    // Save report
    const fs = require('fs');
    fs.writeFileSync(
      `comparison-report-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n✓ Report saved to comparison-report-*.json');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await comparator.closeAll();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DatabaseComparator };