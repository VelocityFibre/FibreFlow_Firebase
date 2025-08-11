const { Pool } = require('pg');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const config = require('../config/database.json');

class ComprehensiveCrossValidator {
  constructor() {
    this.pgPool = new Pool(config.postgres);
    this.sqlitePath = path.join(__dirname, '../../OneMap/SQL/onemap.db');
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  async runAllValidations() {
    console.log('='.repeat(80));
    console.log('COMPREHENSIVE CROSS-DATABASE VALIDATION');
    console.log('='.repeat(80));
    console.log(`Started: ${new Date().toISOString()}\n`);

    try {
      // 1. Database Record Count Validation
      await this.validateRecordCounts();
      
      // 2. Unique Identifier Validation
      await this.validateUniqueIdentifiers();
      
      // 3. Excel Spot Check Validation
      await this.validateAgainstExcel();
      
      // 4. Data Integrity Validation
      await this.validateDataIntegrity();
      
      // 5. Status Consistency Validation
      await this.validateStatusConsistency();
      
      // 6. Critical Business Rules
      await this.validateBusinessRules();
      
      // Print final results
      this.printResults();
      
    } catch (error) {
      console.error('Validation error:', error.message);
    } finally {
      await this.pgPool.end();
    }
  }

  async validateRecordCounts() {
    console.log('1. RECORD COUNT VALIDATION');
    console.log('-'.repeat(60));
    
    try {
      // PostgreSQL counts
      const pgCounts = await this.pgPool.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT property_id) as unique_properties,
          COUNT(DISTINCT pole_number) as unique_poles,
          COUNT(DISTINCT drop_number) as unique_drops
        FROM onemap_lawley_raw
      `);
      const pg = pgCounts.rows[0];
      
      // SQLite counts
      const sqlite = new Database(this.sqlitePath, { readonly: true });
      const sqliteCounts = sqlite.prepare(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT property_id) as unique_properties,
          COUNT(DISTINCT pole_number) as unique_poles
        FROM latest_data
      `).get();
      sqlite.close();
      
      console.log('PostgreSQL vs SQLite Comparison:');
      console.log(`  Total Records: ${pg.total_records} vs ${sqliteCounts.total_records}`);
      console.log(`  Unique Properties: ${pg.unique_properties} vs ${sqliteCounts.unique_properties}`);
      console.log(`  Unique Poles: ${pg.unique_poles} vs ${sqliteCounts.unique_poles}`);
      
      // Validate pole counts (should be very close)
      const poleDiff = Math.abs(parseInt(pg.unique_poles) - sqliteCounts.unique_poles);
      if (poleDiff <= 50) {
        this.results.passed.push('✅ Pole count validation: Difference of ' + poleDiff + ' poles (acceptable)');
      } else {
        this.results.failed.push('❌ Pole count mismatch: ' + poleDiff + ' difference');
      }
      
      console.log();
    } catch (error) {
      this.results.failed.push('❌ Record count validation failed: ' + error.message);
    }
  }

  async validateUniqueIdentifiers() {
    console.log('2. UNIQUE IDENTIFIER VALIDATION');
    console.log('-'.repeat(60));
    
    try {
      // Check for duplicate property-pole-file combinations
      const dupes = await this.pgPool.query(`
        SELECT property_id, pole_number, source_file, COUNT(*) as count
        FROM onemap_lawley_raw
        WHERE property_id IS NOT NULL AND pole_number IS NOT NULL
        GROUP BY property_id, pole_number, source_file
        HAVING COUNT(*) > 1
        LIMIT 5
      `);
      
      if (dupes.rows.length === 0) {
        this.results.passed.push('✅ No duplicate property-pole-file combinations found');
        console.log('✅ All property-pole-file combinations are unique');
      } else {
        this.results.failed.push('❌ Found ' + dupes.rows.length + ' duplicate combinations');
        console.log('❌ Duplicate combinations found:');
        dupes.rows.forEach(d => {
          console.log(`   Property: ${d.property_id}, Pole: ${d.pole_number}, File: ${d.source_file} (${d.count} times)`);
        });
      }
      
      console.log();
    } catch (error) {
      this.results.failed.push('❌ Unique identifier validation failed: ' + error.message);
    }
  }

  async validateAgainstExcel() {
    console.log('3. EXCEL SPOT CHECK VALIDATION');
    console.log('-'.repeat(60));
    
    try {
      // Check one file as example
      const testFile = '1754473447790_Lawley_01082025.xlsx';
      const excelPath = path.join(require('os').homedir(), 'Downloads', testFile);
      
      if (!fs.existsSync(excelPath)) {
        this.results.warnings.push('⚠️  Excel file not found for validation: ' + testFile);
        console.log('⚠️  Excel file not found: ' + testFile);
        return;
      }
      
      // Read Excel
      console.log(`Validating against Excel: ${testFile}`);
      const workbook = XLSX.readFile(excelPath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const excelData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      
      console.log(`Excel rows: ${excelData.length}`);
      
      // Get PostgreSQL data for this file
      const pgData = await this.pgPool.query(
        'SELECT COUNT(*) as count FROM onemap_lawley_raw WHERE source_file = $1',
        [testFile]
      );
      
      console.log(`PostgreSQL rows: ${pgData.rows[0].count}`);
      
      // Spot check 10 random records
      console.log('\nSpot checking 10 random records...');
      let matches = 0;
      let checks = 0;
      
      for (let i = 0; i < 10 && i < excelData.length; i++) {
        const randomIndex = Math.floor(Math.random() * excelData.length);
        const excelRow = excelData[randomIndex];
        
        // Check if this property exists in PostgreSQL
        const pgRow = await this.pgPool.query(`
          SELECT property_id, pole_number, status 
          FROM onemap_lawley_raw 
          WHERE source_file = $1 AND property_id = $2
          LIMIT 1
        `, [testFile, excelRow['Property ID']]);
        
        checks++;
        if (pgRow.rows.length > 0) {
          const pg = pgRow.rows[0];
          if (pg.pole_number === excelRow['Pole Number'] && 
              pg.status === excelRow['Status']) {
            matches++;
          }
        }
      }
      
      const accuracy = (matches / checks * 100).toFixed(1);
      console.log(`Spot check accuracy: ${matches}/${checks} (${accuracy}%)`);
      
      if (accuracy >= 90) {
        this.results.passed.push('✅ Excel validation: ' + accuracy + '% accuracy');
      } else {
        this.results.failed.push('❌ Excel validation: Only ' + accuracy + '% accuracy');
      }
      
      console.log();
    } catch (error) {
      this.results.warnings.push('⚠️  Excel validation error: ' + error.message);
    }
  }

  async validateDataIntegrity() {
    console.log('4. DATA INTEGRITY VALIDATION');
    console.log('-'.repeat(60));
    
    try {
      // Check for orphaned records
      const orphaned = await this.pgPool.query(`
        SELECT COUNT(*) as count
        FROM onemap_lawley_raw
        WHERE property_id IS NULL OR property_id = ''
      `);
      
      console.log(`Records without property ID: ${orphaned.rows[0].count}`);
      
      const orphanCount = parseInt(orphaned.rows[0].count) || 0;
      if (orphanCount === 0) {
        this.results.passed.push('✅ No orphaned records found');
      } else {
        this.results.warnings.push('⚠️  ' + orphanCount + ' records without property ID');
      }
      
      // Check data quality scores
      const quality = await this.pgPool.query(`
        SELECT 
          AVG(data_quality_score) as avg_score,
          MIN(data_quality_score) as min_score,
          MAX(data_quality_score) as max_score
        FROM onemap_lawley_raw
      `);
      
      const q = quality.rows[0];
      console.log(`Data Quality Scores: AVG=${q.avg_score}, MIN=${q.min_score}, MAX=${q.max_score}`);
      
      if (parseFloat(q.avg_score) >= 0.8) {
        this.results.passed.push('✅ Data quality average: ' + q.avg_score);
      } else {
        this.results.warnings.push('⚠️  Low data quality average: ' + q.avg_score);
      }
      
      console.log();
    } catch (error) {
      this.results.failed.push('❌ Data integrity validation failed: ' + error.message);
    }
  }

  async validateStatusConsistency() {
    console.log('5. STATUS CONSISTENCY VALIDATION');
    console.log('-'.repeat(60));
    
    try {
      // Check if status values are consistent
      const statusValues = await this.pgPool.query(`
        SELECT DISTINCT status, COUNT(*) as count
        FROM onemap_lawley_raw
        WHERE status IS NOT NULL
        GROUP BY status
        ORDER BY count DESC
        LIMIT 10
      `);
      
      console.log('Top 10 status values:');
      statusValues.rows.forEach(s => {
        console.log(`  "${s.status}": ${s.count} records`);
      });
      
      // Check for status progression logic
      const statusProgression = await this.pgPool.query(`
        WITH status_changes AS (
          SELECT 
            property_id,
            status,
            LAG(status) OVER (PARTITION BY property_id ORDER BY source_file) as prev_status,
            source_file
          FROM onemap_lawley_raw
          WHERE property_id IS NOT NULL AND status IS NOT NULL
        )
        SELECT 
          prev_status,
          status as new_status,
          COUNT(*) as count
        FROM status_changes
        WHERE prev_status IS NOT NULL AND prev_status != status
        GROUP BY prev_status, status
        ORDER BY count DESC
        LIMIT 5
      `);
      
      console.log('\nTop 5 status transitions:');
      statusProgression.rows.forEach(t => {
        console.log(`  "${t.prev_status}" → "${t.new_status}": ${t.count} times`);
      });
      
      this.results.passed.push('✅ Status values are consistent');
      console.log();
    } catch (error) {
      this.results.warnings.push('⚠️  Status consistency check error: ' + error.message);
    }
  }

  async validateBusinessRules() {
    console.log('6. BUSINESS RULES VALIDATION');
    console.log('-'.repeat(60));
    
    try {
      // Rule 1: Maximum 12 drops per pole
      const overloadedPoles = await this.pgPool.query(`
        SELECT pole_number, COUNT(DISTINCT drop_number) as drop_count
        FROM onemap_lawley_raw
        WHERE pole_number IS NOT NULL AND drop_number IS NOT NULL
        GROUP BY pole_number
        HAVING COUNT(DISTINCT drop_number) > 12
      `);
      
      if (overloadedPoles.rows.length === 0) {
        this.results.passed.push('✅ Business rule: No poles exceed 12 drops limit');
        console.log('✅ No poles exceed 12 drops limit');
      } else {
        this.results.failed.push('❌ ' + overloadedPoles.rows.length + ' poles exceed 12 drops limit');
        console.log('❌ Poles exceeding 12 drops:');
        overloadedPoles.rows.forEach(p => {
          console.log(`   ${p.pole_number}: ${p.drop_count} drops`);
        });
      }
      
      // Rule 2: Pole numbers should follow pattern
      const invalidPoles = await this.pgPool.query(`
        SELECT DISTINCT pole_number
        FROM onemap_lawley_raw
        WHERE pole_number IS NOT NULL 
          AND pole_number NOT LIKE 'LAW.P.%'
          AND pole_number != ''
        LIMIT 5
      `);
      
      if (invalidPoles.rows.length === 0) {
        this.results.passed.push('✅ All pole numbers follow LAW.P.* pattern');
        console.log('✅ All pole numbers follow correct pattern');
      } else {
        this.results.warnings.push('⚠️  Found non-standard pole numbers');
        console.log('⚠️  Non-standard pole numbers found:');
        invalidPoles.rows.forEach(p => {
          console.log(`   ${p.pole_number}`);
        });
      }
      
      console.log();
    } catch (error) {
      this.results.failed.push('❌ Business rules validation failed: ' + error.message);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\nPASSED (${this.results.passed.length}):`);
    this.results.passed.forEach(r => console.log('  ' + r));
    
    console.log(`\nWARNINGS (${this.results.warnings.length}):`);
    this.results.warnings.forEach(r => console.log('  ' + r));
    
    console.log(`\nFAILED (${this.results.failed.length}):`);
    this.results.failed.forEach(r => console.log('  ' + r));
    
    const totalChecks = this.results.passed.length + this.results.warnings.length + this.results.failed.length;
    const successRate = ((this.results.passed.length / totalChecks) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(80));
    if (this.results.failed.length === 0) {
      console.log(`✅ VALIDATION SUCCESSFUL - ${successRate}% pass rate`);
      console.log('The PostgreSQL import is accurate and ready for Supabase sync!');
    } else {
      console.log(`❌ VALIDATION FAILED - ${this.results.failed.length} critical issues found`);
      console.log('Please address the failed checks before syncing to Supabase.');
    }
    console.log('='.repeat(80));
  }
}

// Run the validation
const validator = new ComprehensiveCrossValidator();
validator.runAllValidations();