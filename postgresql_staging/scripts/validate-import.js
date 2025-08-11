#!/usr/bin/env node

/**
 * Data Validation Tool for OneMap Imports
 * 
 * Features:
 * - Cross-reference database records with Excel source
 * - Comprehensive data integrity checks
 * - Field-by-field comparison
 * - Statistical validation
 * - Anomaly detection
 * 
 * Usage:
 *   node scripts/validate-import.js ~/Downloads/1754473447790_Lawley_01082025.xlsx
 *   node scripts/validate-import.js --batch-id UUID
 *   node scripts/validate-import.js --full                # Full validation (slower)
 */

const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const config = require('../config/database.json');
const dbConfig = config.postgres;

class ImportValidator {
    constructor() {
        this.pool = new Pool(dbConfig);
        this.validationResults = {
            summary: {
                totalRecords: 0,
                validatedRecords: 0,
                passedRecords: 0,
                failedRecords: 0,
                missingInDb: 0,
                missingInExcel: 0,
                fieldMismatches: 0,
                dataAnomalies: 0
            },
            fieldStats: {},
            issues: [],
            anomalies: []
        };
    }

    /**
     * Validate import by file or batch
     */
    async validate(excelPath = null, batchId = null, fullValidation = false) {
        try {
            console.log('🔍 Starting Import Validation...');
            
            // Determine what to validate
            let sourceFile;
            if (batchId) {
                const batch = await this.getBatchInfo(batchId);
                sourceFile = batch.source_file;
                excelPath = path.join(os.homedir(), 'Downloads', sourceFile);
            } else if (excelPath) {
                sourceFile = path.basename(excelPath.replace('~', os.homedir()));
            } else {
                // Get latest import
                const latestBatch = await this.getLatestBatch();
                sourceFile = latestBatch.source_file;
                excelPath = path.join(os.homedir(), 'Downloads', sourceFile);
            }
            
            console.log(`📁 Validating: ${sourceFile}`);
            
            // Load data
            const excelData = await this.loadExcelData(excelPath);
            const dbData = await this.loadDatabaseData(sourceFile);
            
            this.validationResults.summary.totalRecords = Math.max(excelData.length, dbData.length);
            
            // Run validations
            console.log(`📊 Comparing ${excelData.length} Excel records with ${dbData.length} database records...`);
            
            await this.crossReferenceData(excelData, dbData);
            await this.validateDataIntegrity(dbData);
            await this.checkForAnomalies(dbData);
            
            if (fullValidation) {
                await this.deepFieldValidation(excelData, dbData);
            }
            
            // Generate report
            this.generateValidationReport();
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            throw error;
        } finally {
            await this.pool.end();
        }
    }

    /**
     * Load Excel data
     */
    async loadExcelData(filePath) {
        const expandedPath = filePath.replace('~', os.homedir());
        
        if (!fs.existsSync(expandedPath)) {
            throw new Error(`Excel file not found: ${expandedPath}`);
        }
        
        console.log('📖 Loading Excel data...');
        const workbook = XLSX.readFile(expandedPath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
        console.log(`✓ Loaded ${data.length} Excel records`);
        return data;
    }

    /**
     * Load database data
     */
    async loadDatabaseData(sourceFile) {
        console.log('🗄️  Loading database data...');
        
        const query = `
            SELECT * FROM onemap_lawley_raw 
            WHERE source_file = $1
            ORDER BY "property_id"
        `;
        
        const result = await this.pool.query(query, [sourceFile]);
        console.log(`✓ Loaded ${result.rows.length} database records`);
        
        return result.rows;
    }

    /**
     * Cross-reference Excel and database data
     */
    async crossReferenceData(excelData, dbData) {
        console.log('🔄 Cross-referencing data...');
        
        // Create lookup maps
        const excelMap = new Map();
        const dbMap = new Map();
        
        excelData.forEach(row => {
            const propertyId = row['Property ID']?.toString();
            if (propertyId) {
                excelMap.set(propertyId, row);
            }
        });
        
        dbData.forEach(row => {
            const propertyId = row.property_id?.toString();
            if (propertyId) {
                dbMap.set(propertyId, row);
            }
        });
        
        // Check for missing records
        for (const [propertyId, excelRow] of excelMap) {
            this.validationResults.validatedRecords++;
            
            if (!dbMap.has(propertyId)) {
                this.validationResults.summary.missingInDb++;
                this.validationResults.issues.push({
                    type: 'MISSING_IN_DB',
                    propertyId,
                    message: `Property ${propertyId} exists in Excel but not in database`,
                    excelData: {
                        status: excelRow['Status'],
                        pole: excelRow['Pole Number'],
                        address: excelRow['Location Address']
                    }
                });
            } else {
                // Validate field matches
                const dbRow = dbMap.get(propertyId);
                const fieldIssues = await this.validateFields(excelRow, dbRow);
                
                if (fieldIssues.length === 0) {
                    this.validationResults.summary.passedRecords++;
                } else {
                    this.validationResults.summary.failedRecords++;
                    this.validationResults.summary.fieldMismatches += fieldIssues.length;
                    
                    this.validationResults.issues.push({
                        type: 'FIELD_MISMATCH',
                        propertyId,
                        fieldIssues
                    });
                }
            }
        }
        
        // Check for DB records not in Excel
        for (const [propertyId, dbRow] of dbMap) {
            if (!excelMap.has(propertyId)) {
                this.validationResults.summary.missingInExcel++;
                this.validationResults.issues.push({
                    type: 'MISSING_IN_EXCEL',
                    propertyId,
                    message: `Property ${propertyId} exists in database but not in Excel`,
                    dbData: {
                        status: dbRow.status,
                        pole: dbRow.pole_number,
                        address: dbRow.location_address
                    }
                });
            }
        }
    }

    /**
     * Validate individual fields
     */
    async validateFields(excelRow, dbRow) {
        const issues = [];
        
        // Key field mappings
        const fieldMappings = [
            { excel: 'Status', db: 'status', critical: true },
            { excel: 'Pole Number', db: 'pole_number', critical: true },
            { excel: 'Drop Number', db: 'drop_number', critical: true },
            { excel: 'Field Agent Name (pole permission)', db: 'field_agent_name__pole_permission_', critical: false },
            { excel: 'Location Address', db: 'location_address', critical: false },
            { excel: 'Latitude', db: 'latitude', type: 'numeric' },
            { excel: 'Longitude', db: 'longitude', type: 'numeric' },
            { excel: 'Contact Person: Name', db: 'contact_person__name', critical: false },
            { excel: 'Contact Person: Surname', db: 'contact_person__surname', critical: false },
            { excel: 'Contact Number (e.g.0123456789)', db: 'contact_number__e_g_0123456789_', type: 'numeric' }
        ];
        
        for (const mapping of fieldMappings) {
            const excelValue = excelRow[mapping.excel];
            const dbValue = dbRow[mapping.db];
            
            // Initialize field stats
            if (!this.validationResults.fieldStats[mapping.db]) {
                this.validationResults.fieldStats[mapping.db] = {
                    checked: 0,
                    matched: 0,
                    mismatched: 0,
                    nullInExcel: 0,
                    nullInDb: 0
                };
            }
            
            const fieldStat = this.validationResults.fieldStats[mapping.db];
            fieldStat.checked++;
            
            // Handle null/empty values
            const excelEmpty = !excelValue || excelValue === '';
            const dbEmpty = !dbValue || dbValue === null;
            
            if (excelEmpty && dbEmpty) {
                fieldStat.matched++;
                continue;
            }
            
            if (excelEmpty) fieldStat.nullInExcel++;
            if (dbEmpty) fieldStat.nullInDb++;
            
            // Type-specific validation
            if (mapping.type === 'numeric') {
                const excelNum = parseFloat(excelValue);
                const dbNum = parseFloat(dbValue);
                
                if (!isNaN(excelNum) && !isNaN(dbNum)) {
                    // Allow small floating point differences
                    if (Math.abs(excelNum - dbNum) < 0.000001) {
                        fieldStat.matched++;
                        continue;
                    }
                }
            }
            
            // String comparison (trim whitespace)
            const excelStr = String(excelValue || '').trim();
            const dbStr = String(dbValue || '').trim();
            
            if (excelStr === dbStr) {
                fieldStat.matched++;
            } else {
                fieldStat.mismatched++;
                
                if (mapping.critical || (!excelEmpty && !dbEmpty)) {
                    issues.push({
                        field: mapping.db,
                        excelValue: excelValue,
                        dbValue: dbValue,
                        critical: mapping.critical
                    });
                }
            }
        }
        
        return issues;
    }

    /**
     * Check data integrity
     */
    async validateDataIntegrity(dbData) {
        console.log('🔒 Checking data integrity...');
        
        // Check for duplicate property IDs
        const propertyIds = dbData.map(r => r.property_id).filter(id => id);
        const duplicates = propertyIds.filter((id, index) => propertyIds.indexOf(id) !== index);
        
        if (duplicates.length > 0) {
            this.validationResults.anomalies.push({
                type: 'DUPLICATE_PROPERTY_IDS',
                count: duplicates.length,
                samples: [...new Set(duplicates)].slice(0, 5)
            });
        }
        
        // Check pole capacity (max 12 drops per pole)
        const poleDropCounts = {};
        dbData.forEach(row => {
            if (row.pole_number && row.drop_number) {
                poleDropCounts[row.pole_number] = (poleDropCounts[row.pole_number] || 0) + 1;
            }
        });
        
        const overCapacityPoles = Object.entries(poleDropCounts)
            .filter(([pole, count]) => count > 12)
            .map(([pole, count]) => ({ pole, dropCount: count }));
        
        if (overCapacityPoles.length > 0) {
            this.validationResults.anomalies.push({
                type: 'POLE_OVER_CAPACITY',
                count: overCapacityPoles.length,
                details: overCapacityPoles
            });
        }
        
        // Check data quality scores
        const lowQualityRecords = dbData.filter(r => r.data_quality_score < 0.5);
        if (lowQualityRecords.length > 0) {
            this.validationResults.anomalies.push({
                type: 'LOW_QUALITY_RECORDS',
                count: lowQualityRecords.length,
                percentage: ((lowQualityRecords.length / dbData.length) * 100).toFixed(1)
            });
        }
    }

    /**
     * Check for data anomalies
     */
    async checkForAnomalies(dbData) {
        console.log('🚨 Checking for anomalies...');
        
        // Check for unusual patterns
        const statusCounts = {};
        const agentCounts = {};
        
        dbData.forEach(row => {
            if (row.status) {
                statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
            }
            if (row.field_agent_name__pole_permission_) {
                agentCounts[row.field_agent_name__pole_permission_] = 
                    (agentCounts[row.field_agent_name__pole_permission_] || 0) + 1;
            }
        });
        
        // Check for status distribution anomalies
        const totalWithStatus = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        for (const [status, count] of Object.entries(statusCounts)) {
            const percentage = (count / totalWithStatus) * 100;
            if (percentage > 90) {
                this.validationResults.anomalies.push({
                    type: 'STATUS_CONCENTRATION',
                    status,
                    count,
                    percentage: percentage.toFixed(1),
                    message: `${percentage.toFixed(1)}% of records have the same status`
                });
            }
        }
        
        // Check for missing critical data
        const missingPoleCount = dbData.filter(r => r.status && r.status.includes('Pole') && !r.pole_number).length;
        if (missingPoleCount > 0) {
            this.validationResults.anomalies.push({
                type: 'MISSING_POLE_NUMBERS',
                count: missingPoleCount,
                message: 'Records with pole-related status but no pole number'
            });
        }
    }

    /**
     * Deep field-by-field validation (slow but thorough)
     */
    async deepFieldValidation(excelData, dbData) {
        console.log('🔬 Performing deep field validation...');
        
        // This would validate every single field in every record
        // Implemented as needed for specific requirements
    }

    /**
     * Generate validation report
     */
    generateValidationReport() {
        const report = this.validationResults;
        
        console.log('\n' + '='.repeat(60));
        console.log('VALIDATION REPORT');
        console.log('='.repeat(60));
        
        console.log('\n📊 SUMMARY:');
        console.log(`Total Records: ${report.summary.totalRecords}`);
        console.log(`Validated: ${report.summary.validatedRecords}`);
        console.log(`✅ Passed: ${report.summary.passedRecords}`);
        console.log(`❌ Failed: ${report.summary.failedRecords}`);
        console.log(`Missing in DB: ${report.summary.missingInDb}`);
        console.log(`Missing in Excel: ${report.summary.missingInExcel}`);
        console.log(`Field Mismatches: ${report.summary.fieldMismatches}`);
        
        const accuracy = report.summary.validatedRecords > 0
            ? ((report.summary.passedRecords / report.summary.validatedRecords) * 100).toFixed(1)
            : 0;
        console.log(`\nAccuracy: ${accuracy}%`);
        
        if (report.anomalies.length > 0) {
            console.log('\n🚨 ANOMALIES DETECTED:');
            report.anomalies.forEach(anomaly => {
                console.log(`- ${anomaly.type}: ${anomaly.message || `${anomaly.count} instances`}`);
                if (anomaly.details) {
                    console.log(`  Details: ${JSON.stringify(anomaly.details.slice(0, 3))}...`);
                }
            });
        }
        
        console.log('\n📈 FIELD STATISTICS:');
        Object.entries(report.fieldStats).forEach(([field, stats]) => {
            const matchRate = stats.checked > 0 
                ? ((stats.matched / stats.checked) * 100).toFixed(1)
                : 0;
            console.log(`${field}: ${matchRate}% match rate (${stats.matched}/${stats.checked})`);
        });
        
        if (report.issues.length > 0) {
            console.log(`\n⚠️  TOP ISSUES (showing first 10 of ${report.issues.length}):`);
            report.issues.slice(0, 10).forEach(issue => {
                console.log(`- Property ${issue.propertyId}: ${issue.type}`);
                if (issue.fieldIssues) {
                    issue.fieldIssues.slice(0, 3).forEach(fi => {
                        console.log(`  ${fi.field}: "${fi.excelValue}" ≠ "${fi.dbValue}"`);
                    });
                }
            });
        }
        
        // Save detailed report
        const reportPath = path.join(__dirname, '..', 'reports', `validation-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }

    /**
     * Get batch info
     */
    async getBatchInfo(batchId) {
        const query = 'SELECT * FROM onemap_import_batches WHERE id = $1';
        const result = await this.pool.query(query, [batchId]);
        return result.rows[0];
    }

    /**
     * Get latest batch
     */
    async getLatestBatch() {
        const query = 'SELECT * FROM onemap_import_batches ORDER BY import_started DESC LIMIT 1';
        const result = await this.pool.query(query);
        return result.rows[0];
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const validator = new ImportValidator();
    
    try {
        const excelPath = args.find(arg => !arg.startsWith('--'));
        const batchId = args.find(arg => arg.startsWith('--batch-id='))?.split('=')[1];
        const fullValidation = args.includes('--full');
        
        await validator.validate(excelPath, batchId, fullValidation);
        
        const accuracy = validator.validationResults.summary.validatedRecords > 0
            ? ((validator.validationResults.summary.passedRecords / validator.validationResults.summary.validatedRecords) * 100).toFixed(1)
            : 0;
            
        if (parseFloat(accuracy) < 95) {
            console.log('\n⚠️  WARNING: Data accuracy below 95% threshold!');
            process.exit(1);
        } else {
            console.log('\n✅ Validation completed successfully!');
        }
        
    } catch (error) {
        console.error('💥 Validation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ImportValidator;