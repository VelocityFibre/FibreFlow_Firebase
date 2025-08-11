const { Client } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const duckdb = require('duckdb');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Load configuration
const config = require('../config/database.json');

class CrossDatabaseValidator {
  constructor() {
    this.postgres = null;
    this.sqlite = null;
    this.duckdb = null;
    this.report = {
      timestamp: new Date().toISOString(),
      databases: {
        postgres: { connected: false },
        sqlite: { connected: false },
        duckdb: { connected: false }
      },
      validations: [],
      discrepancies: [],
      summary: {
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async connect() {
    const spinner = ora('Connecting to databases...').start();
    
    try {
      // PostgreSQL
      this.postgres = new Client(config.postgres);
      await this.postgres.connect();
      this.report.databases.postgres.connected = true;
      
      // SQLite
      if (fs.existsSync(config.sqlite.path)) {
        this.sqlite = new sqlite3.Database(config.sqlite.path);
        this.report.databases.sqlite.connected = true;
      }
      
      // DuckDB
      if (fs.existsSync(config.duckdb.path)) {
        this.duckdb = new duckdb.Database(config.duckdb.path);
        this.report.databases.duckdb.connected = true;
      }
      
      spinner.succeed('Connected to databases');
    } catch (error) {
      spinner.fail('Connection failed');
      throw error;
    }
  }

  async validate() {
    console.log(chalk.bold('\n🔍 Cross-Database Validation\n'));
    
    // Run validation checks
    await this.validateRowCounts();
    await this.validateDuplicates();
    await this.validateDataIntegrity();
    await this.validateStatusConsistency();
    await this.validateRelationships();
    
    // Generate summary
    this.generateSummary();
  }

  async validateRowCounts() {
    console.log(chalk.yellow('📊 Validating row counts...'));
    
    const tables = ['poles', 'drops', 'properties', 'status_changes'];
    const counts = {};
    
    for (const table of tables) {
      counts[table] = {};
      
      // PostgreSQL count
      try {
        const pgResult = await this.postgres.query(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table].postgres = parseInt(pgResult.rows[0].count);
      } catch (err) {
        counts[table].postgres = `Error: ${err.message}`;
      }
      
      // SQLite count
      if (this.sqlite) {
        try {
          const sqliteCount = await this.queryAsync(this.sqlite, 
            `SELECT COUNT(*) as count FROM ${table}`
          );
          counts[table].sqlite = sqliteCount[0]?.count || 0;
        } catch (err) {
          counts[table].sqlite = 'Table not found';
        }
      }
      
      // DuckDB count
      if (this.duckdb) {
        try {
          const duckCount = await this.queryDuckDB(
            `SELECT COUNT(*) as count FROM ${table}`
          );
          counts[table].duckdb = duckCount[0]?.count || 0;
        } catch (err) {
          counts[table].duckdb = 'Table not found';
        }
      }
      
      // Check if counts match
      const values = Object.values(counts[table]).filter(v => typeof v === 'number');
      const allMatch = values.length > 1 && values.every(v => v === values[0]);
      
      this.addValidation({
        check: `Row count - ${table}`,
        result: allMatch ? 'PASS' : 'FAIL',
        details: counts[table],
        severity: allMatch ? 'info' : 'error'
      });
      
      // Display results
      console.log(`  ${table}:`);
      Object.entries(counts[table]).forEach(([db, count]) => {
        const icon = typeof count === 'number' ? '✓' : '✗';
        const color = typeof count === 'number' ? chalk.green : chalk.red;
        console.log(`    ${icon} ${db}: ${color(count)}`);
      });
    }
  }

  async validateDuplicates() {
    console.log(chalk.yellow('\n🔍 Checking for duplicates...'));
    
    // Check pole duplicates
    const pgDupes = await this.postgres.query(`
      SELECT pole_number, COUNT(*) as count 
      FROM poles 
      GROUP BY pole_number 
      HAVING COUNT(*) > 1
    `);
    
    if (pgDupes.rows.length > 0) {
      this.addValidation({
        check: 'Duplicate poles',
        result: 'FAIL',
        details: `Found ${pgDupes.rows.length} duplicate pole numbers`,
        severity: 'error',
        data: pgDupes.rows
      });
      console.log(chalk.red(`  ✗ Found ${pgDupes.rows.length} duplicate poles`));
    } else {
      this.addValidation({
        check: 'Duplicate poles',
        result: 'PASS',
        details: 'No duplicate poles found',
        severity: 'info'
      });
      console.log(chalk.green('  ✓ No duplicate poles'));
    }
    
    // Check drop duplicates
    const dropDupes = await this.postgres.query(`
      SELECT drop_number, COUNT(*) as count 
      FROM drops 
      GROUP BY drop_number 
      HAVING COUNT(*) > 1
    `);
    
    if (dropDupes.rows.length > 0) {
      this.addValidation({
        check: 'Duplicate drops',
        result: 'FAIL',
        details: `Found ${dropDupes.rows.length} duplicate drop numbers`,
        severity: 'error',
        data: dropDupes.rows
      });
      console.log(chalk.red(`  ✗ Found ${dropDupes.rows.length} duplicate drops`));
    } else {
      console.log(chalk.green('  ✓ No duplicate drops'));
    }
  }

  async validateDataIntegrity() {
    console.log(chalk.yellow('\n🛡️  Validating data integrity...'));
    
    // Check for drops without valid poles
    const orphanDrops = await this.postgres.query(`
      SELECT COUNT(*) as count 
      FROM drops d
      WHERE d.pole_number IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM poles p 
        WHERE p.pole_number = d.pole_number
      )
    `);
    
    const orphanCount = parseInt(orphanDrops.rows[0].count);
    if (orphanCount > 0) {
      this.addValidation({
        check: 'Orphan drops',
        result: 'WARN',
        details: `${orphanCount} drops reference non-existent poles`,
        severity: 'warning'
      });
      console.log(chalk.yellow(`  ⚠ ${orphanCount} drops with invalid pole references`));
    } else {
      console.log(chalk.green('  ✓ All drops have valid pole references'));
    }
    
    // Check max drops per pole constraint
    const overloadedPoles = await this.postgres.query(`
      SELECT pole_number, COUNT(*) as drop_count
      FROM drops
      WHERE pole_number IS NOT NULL
      GROUP BY pole_number
      HAVING COUNT(*) > 12
    `);
    
    if (overloadedPoles.rows.length > 0) {
      this.addValidation({
        check: 'Max drops per pole',
        result: 'FAIL',
        details: `${overloadedPoles.rows.length} poles exceed 12 drop limit`,
        severity: 'error',
        data: overloadedPoles.rows
      });
      console.log(chalk.red(`  ✗ ${overloadedPoles.rows.length} poles exceed drop limit`));
    } else {
      console.log(chalk.green('  ✓ All poles within drop limit'));
    }
  }

  async validateStatusConsistency() {
    console.log(chalk.yellow('\n📈 Validating status consistency...'));
    
    // Compare status values across databases
    if (this.sqlite) {
      const pgStatuses = await this.postgres.query(`
        SELECT DISTINCT status, COUNT(*) as count 
        FROM poles 
        WHERE status IS NOT NULL
        GROUP BY status 
        ORDER BY status
      `);
      
      try {
        const sqliteStatuses = await this.queryAsync(this.sqlite, `
          SELECT DISTINCT status, COUNT(*) as count 
          FROM poles 
          WHERE status IS NOT NULL
          GROUP BY status 
          ORDER BY status
        `);
        
        // Compare status distributions
        const pgStatusMap = new Map(pgStatuses.rows.map(r => [r.status, r.count]));
        const sqliteStatusMap = new Map(sqliteStatuses.map(r => [r.status, r.count]));
        
        let mismatches = 0;
        for (const [status, count] of pgStatusMap) {
          const sqliteCount = sqliteStatusMap.get(status) || 0;
          if (Math.abs(count - sqliteCount) > 10) { // Allow small variance
            mismatches++;
          }
        }
        
        if (mismatches > 0) {
          this.addValidation({
            check: 'Status distribution',
            result: 'WARN',
            details: `${mismatches} status values have significant count differences`,
            severity: 'warning'
          });
          console.log(chalk.yellow(`  ⚠ ${mismatches} status inconsistencies`));
        } else {
          console.log(chalk.green('  ✓ Status distributions match'));
        }
      } catch (err) {
        console.log(chalk.gray('  - SQLite comparison skipped'));
      }
    }
  }

  async validateRelationships() {
    console.log(chalk.yellow('\n🔗 Validating relationships...'));
    
    // Check pole-drop relationships
    const relationshipCheck = await this.postgres.query(`
      SELECT 
        COUNT(DISTINCT p.pole_number) as total_poles,
        COUNT(DISTINCT d.pole_number) as poles_with_drops,
        COUNT(DISTINCT d.drop_number) as total_drops,
        AVG(drop_counts.count)::numeric(10,2) as avg_drops_per_pole
      FROM poles p
      LEFT JOIN drops d ON p.pole_number = d.pole_number
      LEFT JOIN (
        SELECT pole_number, COUNT(*) as count
        FROM drops
        GROUP BY pole_number
      ) drop_counts ON p.pole_number = drop_counts.pole_number
    `);
    
    const stats = relationshipCheck.rows[0];
    console.log(`  Total poles: ${chalk.cyan(stats.total_poles)}`);
    console.log(`  Poles with drops: ${chalk.cyan(stats.poles_with_drops)}`);
    console.log(`  Total drops: ${chalk.cyan(stats.total_drops)}`);
    console.log(`  Avg drops per pole: ${chalk.cyan(stats.avg_drops_per_pole)}`);
    
    this.addValidation({
      check: 'Relationship statistics',
      result: 'INFO',
      details: stats,
      severity: 'info'
    });
  }

  // Helper methods
  queryAsync(db, sql) {
    return new Promise((resolve, reject) => {
      db.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  queryDuckDB(sql) {
    return new Promise((resolve, reject) => {
      this.duckdb.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  addValidation(validation) {
    this.report.validations.push(validation);
    
    if (validation.result === 'PASS') {
      this.report.summary.passed++;
    } else if (validation.result === 'FAIL') {
      this.report.summary.failed++;
      this.report.discrepancies.push(validation);
    } else if (validation.result === 'WARN') {
      this.report.summary.warnings++;
    }
  }

  generateSummary() {
    console.log(chalk.bold('\n📋 Validation Summary\n'));
    console.log('═'.repeat(50));
    console.log(`Passed:   ${chalk.green(this.report.summary.passed)}`);
    console.log(`Failed:   ${chalk.red(this.report.summary.failed)}`);
    console.log(`Warnings: ${chalk.yellow(this.report.summary.warnings)}`);
    console.log('═'.repeat(50));
    
    // Save report
    const reportPath = path.join(__dirname, '..', 'logs', 
      `validation-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`
    );
    
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(chalk.gray(`\nFull report saved to: ${reportPath}`));
    
    // Show recommendations
    if (this.report.summary.failed > 0) {
      console.log(chalk.red('\n⚠️  Critical issues found!'));
      console.log('Please resolve the following before syncing to production:');
      this.report.discrepancies.forEach(d => {
        console.log(`  - ${d.check}: ${d.details}`);
      });
    } else if (this.report.summary.warnings > 0) {
      console.log(chalk.yellow('\n⚠️  Some warnings detected.'));
      console.log('Review warnings before proceeding with sync.');
    } else {
      console.log(chalk.green('\n✅ All validations passed!'));
      console.log('Data is ready for sync to Supabase.');
    }
  }

  async disconnect() {
    if (this.postgres) await this.postgres.end();
    if (this.sqlite) this.sqlite.close();
    if (this.duckdb) this.duckdb.close();
  }
}

// Main execution
async function main() {
  const validator = new CrossDatabaseValidator();
  
  try {
    await validator.connect();
    await validator.validate();
  } catch (error) {
    console.error(chalk.red('Validation failed:'), error.message);
    process.exit(1);
  } finally {
    await validator.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = CrossDatabaseValidator;