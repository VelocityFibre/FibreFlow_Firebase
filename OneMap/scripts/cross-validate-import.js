#!/usr/bin/env node

/**
 * Cross-Validation Script for OneMap to Neon Import
 * 
 * This script validates that data imported to Neon matches the source Excel file
 * to ensure 100% confidence in import accuracy.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Database configuration
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

class ImportValidator {
  constructor(excelFile, importDate) {
    this.excelFile = excelFile;
    this.importDate = importDate;
    this.validationResults = {
      totalExcelRecords: 0,
      totalDbRecords: 0,
      matchedRecords: 0,
      mismatchedRecords: [],
      missingInDb: [],
      extraInDb: [],
      validationTime: new Date().toISOString()
    };
  }

  async validate() {
    console.log('🔍 Starting Cross-Validation...\n');
    
    try {
      // Step 1: Load Excel data
      console.log('📊 Loading Excel data...');
      const excelData = await this.loadExcelData();
      console.log(`✅ Loaded ${excelData.length} records from Excel\n`);

      // Step 2: Load database data
      console.log('🗄️ Loading database data...');
      const dbData = await this.loadDatabaseData();
      console.log(`✅ Loaded ${dbData.size} unique properties from database\n`);

      // Step 3: Compare data
      console.log('🔄 Comparing Excel vs Database...');
      await this.compareData(excelData, dbData);

      // Step 4: Generate report
      console.log('\n📝 Generating validation report...');
      await this.generateReport();

      return this.validationResults;
    } catch (error) {
      console.error('❌ Validation error:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }

  async loadExcelData() {
    const workbook = XLSX.readFile(this.excelFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: null,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    // Group by Property ID and get latest status
    const propertyMap = new Map();
    
    jsonData.forEach(row => {
      const propertyId = row['Property ID'];
      if (!propertyId) return;

      const key = String(propertyId).trim();
      const status = row['Status'] || '';
      const date = row['Date'] || '';

      if (!propertyMap.has(key) || date > propertyMap.get(key).date) {
        propertyMap.set(key, {
          propertyId: key,
          status: status.trim(),
          date: date,
          fullRow: row
        });
      }
    });

    this.validationResults.totalExcelRecords = propertyMap.size;
    return Array.from(propertyMap.values());
  }

  async loadDatabaseData() {
    const query = `
      SELECT DISTINCT ON (property_id) 
        property_id,
        status,
        date,
        created_at
      FROM onemap_data
      WHERE created_at::date = $1
      ORDER BY property_id, created_at DESC
    `;

    const result = await pool.query(query, [this.importDate]);
    
    const dbMap = new Map();
    result.rows.forEach(row => {
      dbMap.set(String(row.property_id), {
        propertyId: String(row.property_id),
        status: row.status,
        date: row.date,
        createdAt: row.created_at
      });
    });

    this.validationResults.totalDbRecords = dbMap.size;
    return dbMap;
  }

  async compareData(excelData, dbData) {
    const mismatches = [];
    const missing = [];
    let matches = 0;

    // Check each Excel record against database
    for (const excelRecord of excelData) {
      const dbRecord = dbData.get(excelRecord.propertyId);

      if (!dbRecord) {
        missing.push({
          propertyId: excelRecord.propertyId,
          excelStatus: excelRecord.status,
          reason: 'Not found in database'
        });
      } else if (excelRecord.status !== dbRecord.status) {
        mismatches.push({
          propertyId: excelRecord.propertyId,
          excelStatus: excelRecord.status,
          dbStatus: dbRecord.status,
          reason: 'Status mismatch'
        });
      } else {
        matches++;
      }
    }

    // Check for extra records in database
    const excelIds = new Set(excelData.map(r => r.propertyId));
    const extraInDb = [];
    
    dbData.forEach((dbRecord, propertyId) => {
      if (!excelIds.has(propertyId)) {
        extraInDb.push({
          propertyId: propertyId,
          dbStatus: dbRecord.status,
          reason: 'Not found in Excel'
        });
      }
    });

    this.validationResults.matchedRecords = matches;
    this.validationResults.mismatchedRecords = mismatches;
    this.validationResults.missingInDb = missing;
    this.validationResults.extraInDb = extraInDb;

    // Calculate validation score
    const totalExpected = excelData.length;
    const validationScore = (matches / totalExpected * 100).toFixed(2);
    this.validationResults.validationScore = validationScore;

    console.log(`\n✅ Matched: ${matches} records`);
    console.log(`❌ Mismatched: ${mismatches.length} records`);
    console.log(`⚠️ Missing in DB: ${missing.length} records`);
    console.log(`🔍 Extra in DB: ${extraInDb.length} records`);
    console.log(`\n📊 Validation Score: ${validationScore}%`);
  }

  async generateReport() {
    const reportPath = path.join(__dirname, '..', 'docs', 'logs', `VALIDATION_REPORT_${this.importDate}.md`);
    
    const report = `# Cross-Validation Report - ${this.importDate}

## Overview
- **Excel File**: ${path.basename(this.excelFile)}
- **Validation Time**: ${this.validationResults.validationTime}
- **Import Date**: ${this.importDate}

## Summary Statistics
| Metric | Count | Percentage |
|--------|-------|------------|
| Total Excel Records | ${this.validationResults.totalExcelRecords} | 100% |
| Total DB Records | ${this.validationResults.totalDbRecords} | - |
| Matched Records | ${this.validationResults.matchedRecords} | ${this.validationResults.validationScore}% |
| Mismatched Records | ${this.validationResults.mismatchedRecords.length} | ${(this.validationResults.mismatchedRecords.length / this.validationResults.totalExcelRecords * 100).toFixed(2)}% |
| Missing in DB | ${this.validationResults.missingInDb.length} | ${(this.validationResults.missingInDb.length / this.validationResults.totalExcelRecords * 100).toFixed(2)}% |
| Extra in DB | ${this.validationResults.extraInDb.length} | - |

## Validation Score: ${this.validationResults.validationScore}%

${this.validationResults.validationScore >= 99 ? '✅ **VALIDATION PASSED** - Import accuracy verified' : '⚠️ **VALIDATION ISSUES DETECTED** - Review required'}

## Detailed Issues

### Status Mismatches (${this.validationResults.mismatchedRecords.length})
${this.validationResults.mismatchedRecords.slice(0, 10).map(m => 
  `- Property ${m.propertyId}: Excel="${m.excelStatus}" vs DB="${m.dbStatus}"`
).join('\n')}
${this.validationResults.mismatchedRecords.length > 10 ? `\n... and ${this.validationResults.mismatchedRecords.length - 10} more` : ''}

### Missing in Database (${this.validationResults.missingInDb.length})
${this.validationResults.missingInDb.slice(0, 10).map(m => 
  `- Property ${m.propertyId}: "${m.excelStatus}"`
).join('\n')}
${this.validationResults.missingInDb.length > 10 ? `\n... and ${this.validationResults.missingInDb.length - 10} more` : ''}

### Extra in Database (${this.validationResults.extraInDb.length})
${this.validationResults.extraInDb.slice(0, 10).map(e => 
  `- Property ${e.propertyId}: "${e.dbStatus}"`
).join('\n')}
${this.validationResults.extraInDb.length > 10 ? `\n... and ${this.validationResults.extraInDb.length - 10} more` : ''}

## Recommendations

${this.getRecommendations()}

---
*Generated by Cross-Validation Script*
`;

    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Validation report saved to: ${reportPath}`);

    // Also save detailed JSON report
    const jsonReportPath = reportPath.replace('.md', '.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.validationResults, null, 2));
  }

  getRecommendations() {
    const score = parseFloat(this.validationResults.validationScore);
    
    if (score >= 99) {
      return `✅ Import validated successfully with ${score}% accuracy. The import can be considered complete and accurate.`;
    } else if (score >= 95) {
      return `⚠️ Import shows ${score}% accuracy. Minor discrepancies detected. Review the mismatched records and consider re-importing specific failed records.`;
    } else {
      return `❌ Import shows only ${score}% accuracy. Significant issues detected. Consider:
1. Re-running the import script
2. Checking for data transformation issues
3. Verifying the Excel file integrity
4. Reviewing the import script logic`;
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node cross-validate-import.js <excel-file> [import-date]');
    console.log('Example: node cross-validate-import.js ../1755670317444_Lawley_19082025.xlsx 2025-08-20');
    process.exit(1);
  }

  const excelFile = path.resolve(args[0]);
  const importDate = args[1] || new Date().toISOString().split('T')[0];

  if (!fs.existsSync(excelFile)) {
    console.error(`❌ Excel file not found: ${excelFile}`);
    process.exit(1);
  }

  const validator = new ImportValidator(excelFile, importDate);
  
  try {
    const results = await validator.validate();
    
    console.log('\n🎯 Validation Complete!');
    console.log(`📊 Overall Score: ${results.validationScore}%`);
    
    process.exit(results.validationScore >= 95 ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ImportValidator };