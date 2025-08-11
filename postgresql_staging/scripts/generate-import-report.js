#!/usr/bin/env node

/**
 * Import Report Generator for OneMap Lawley Data
 * 
 * Features:
 * - Generate detailed import reports (HTML/TXT/JSON)
 * - Import history log with crucial statistics
 * - Data validation spot checks against Excel
 * - Cross-reference verification
 * 
 * Usage:
 *   node scripts/generate-import-report.js                    # Generate report for latest import
 *   node scripts/generate-import-report.js --batch-id UUID   # Generate for specific batch
 *   node scripts/generate-import-report.js --validate        # Include validation checks
 */

const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const config = require('../config/database.json');
const dbConfig = config.postgres;

class ImportReportGenerator {
    constructor() {
        this.pool = new Pool(dbConfig);
        this.reportDir = path.join(__dirname, '..', 'reports');
        this.importLogFile = path.join(this.reportDir, 'import-history.log');
        
        // Ensure reports directory exists
        if (!fs.existsSync(this.reportDir)) {
            fs.mkdirSync(this.reportDir, { recursive: true });
        }
    }

    /**
     * Generate report for specific batch or latest
     */
    async generateReport(batchId = null, includeValidation = false) {
        try {
            console.log('📊 Generating Import Report...');
            
            // Get batch info
            const batch = await this.getBatchInfo(batchId);
            if (!batch) {
                console.error('❌ No import batch found');
                return;
            }
            
            console.log(`📦 Batch ID: ${batch.id}`);
            console.log(`📁 Source File: ${batch.source_file}`);
            
            // Gather report data
            const reportData = {
                batch,
                statistics: await this.getImportStatistics(batch.id),
                statusChanges: await this.getStatusChanges(batch.id),
                dataQuality: await this.getDataQualityStats(batch.id),
                errors: await this.getImportErrors(batch.id),
                topChanges: await this.getTopChanges(batch.id)
            };
            
            // Add validation if requested
            if (includeValidation) {
                console.log('🔍 Running validation checks...');
                reportData.validation = await this.validateImportedData(batch);
            }
            
            // Generate report files
            await this.generateHTMLReport(reportData);
            await this.generateTextReport(reportData);
            await this.generateJSONReport(reportData);
            
            // Update import history log
            await this.updateImportLog(reportData);
            
            console.log('✅ Report generation completed!');
            console.log(`📂 Reports saved to: ${this.reportDir}`);
            
        } catch (error) {
            console.error('❌ Report generation failed:', error.message);
            throw error;
        } finally {
            await this.pool.end();
        }
    }

    /**
     * Get batch information
     */
    async getBatchInfo(batchId) {
        let query;
        let params;
        
        if (batchId) {
            query = 'SELECT * FROM onemap_import_batches WHERE id = $1';
            params = [batchId];
        } else {
            query = 'SELECT * FROM onemap_import_batches ORDER BY import_started DESC LIMIT 1';
            params = [];
        }
        
        const result = await this.pool.query(query, params);
        return result.rows[0];
    }

    /**
     * Get import statistics
     */
    async getImportStatistics(batchId) {
        const query = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT "property_id") as unique_properties,
                COUNT(DISTINCT "pole_number") as unique_poles,
                COUNT(DISTINCT field_agent_name_pole_permission) as unique_agents,
                AVG(data_quality_score)::DECIMAL(3,2) as avg_quality_score,
                COUNT(CASE WHEN "status" IS NOT NULL THEN 1 END) as records_with_status,
                COUNT(CASE WHEN "pole_number" IS NOT NULL THEN 1 END) as records_with_poles
            FROM onemap_lawley_raw
            WHERE source_file = (
                SELECT source_file FROM onemap_import_batches WHERE id = $1
            )
        `;
        
        const result = await this.pool.query(query, [batchId]);
        return result.rows[0];
    }

    /**
     * Get status changes from this import
     */
    async getStatusChanges(batchId) {
        const query = `
            SELECT 
                field_name,
                COUNT(*) as change_count,
                COUNT(DISTINCT entity_id) as affected_entities
            FROM onemap_status_history
            WHERE import_batch_id = $1
            GROUP BY field_name
            ORDER BY change_count DESC
        `;
        
        const result = await this.pool.query(query, [batchId]);
        return result.rows;
    }

    /**
     * Get data quality statistics
     */
    async getDataQualityStats(batchId) {
        const query = `
            SELECT 
                CASE 
                    WHEN data_quality_score >= 0.9 THEN 'Excellent (90-100%)'
                    WHEN data_quality_score >= 0.7 THEN 'Good (70-89%)'
                    WHEN data_quality_score >= 0.5 THEN 'Fair (50-69%)'
                    ELSE 'Poor (<50%)'
                END as quality_tier,
                COUNT(*) as record_count,
                ROUND(AVG(data_quality_score) * 100, 1) as avg_score
            FROM onemap_lawley_raw
            WHERE source_file = (
                SELECT source_file FROM onemap_import_batches WHERE id = $1
            )
            GROUP BY quality_tier
            ORDER BY avg_score DESC
        `;
        
        const result = await this.pool.query(query, [batchId]);
        return result.rows;
    }

    /**
     * Get import errors if any
     */
    async getImportErrors(batchId) {
        const batch = await this.getBatchInfo(batchId);
        if (batch.error_details && Object.keys(batch.error_details).length > 0) {
            return batch.error_details;
        }
        return null;
    }

    /**
     * Get top status changes
     */
    async getTopChanges(batchId) {
        const query = `
            SELECT 
                entity_id,
                field_name,
                old_value,
                new_value,
                to_char(change_date, 'YYYY-MM-DD HH24:MI:SS') as change_time
            FROM onemap_status_history
            WHERE import_batch_id = $1
                AND field_name = 'status'
            ORDER BY change_date DESC
            LIMIT 10
        `;
        
        const result = await this.pool.query(query, [batchId]);
        return result.rows;
    }

    /**
     * Validate imported data against Excel file
     */
    async validateImportedData(batch) {
        const validation = {
            spotChecks: [],
            summary: {
                totalChecks: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
        
        // Find the Excel file
        const filePath = path.join(os.homedir(), 'Downloads', batch.source_file);
        if (!fs.existsSync(filePath)) {
            validation.summary.warnings++;
            validation.error = `Excel file not found for validation: ${batch.source_file}`;
            return validation;
        }
        
        // Read Excel file
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
        // Get random sample of imported records
        const sampleQuery = `
            SELECT * FROM onemap_lawley_raw 
            WHERE source_file = $1
            ORDER BY RANDOM() 
            LIMIT 20
        `;
        const dbRecords = await this.pool.query(sampleQuery, [batch.source_file]);
        
        // Validate each record
        for (const dbRecord of dbRecords.rows) {
            validation.totalChecks++;
            
            // Find corresponding Excel row by property_id
            const excelRow = excelData.find(row => 
                row['Property ID'] == dbRecord.property_id
            );
            
            if (!excelRow) {
                validation.summary.failed++;
                validation.spotChecks.push({
                    property_id: dbRecord.property_id,
                    status: 'FAILED',
                    error: 'Record not found in Excel file'
                });
                continue;
            }
            
            // Check key fields
            const checks = {
                property_id: dbRecord.property_id,
                checks: []
            };
            
            // Status check
            if (dbRecord.status === excelRow['Status']) {
                checks.checks.push({ field: 'status', result: 'PASS' });
            } else {
                checks.checks.push({ 
                    field: 'status', 
                    result: 'FAIL',
                    db: dbRecord.status,
                    excel: excelRow['Status']
                });
                validation.summary.failed++;
            }
            
            // Pole number check
            if (dbRecord.pole_number === excelRow['Pole Number'] || 
                (!dbRecord.pole_number && !excelRow['Pole Number'])) {
                checks.checks.push({ field: 'pole_number', result: 'PASS' });
            } else {
                checks.checks.push({ 
                    field: 'pole_number', 
                    result: 'FAIL',
                    db: dbRecord.pole_number,
                    excel: excelRow['Pole Number']
                });
                validation.summary.failed++;
            }
            
            // Agent check
            const dbAgent = dbRecord.field_agent_name_pole_permission;
            const excelAgent = excelRow['Field Agent Name (pole permission)'];
            if (dbAgent === excelAgent || (!dbAgent && !excelAgent)) {
                checks.checks.push({ field: 'agent', result: 'PASS' });
            } else {
                checks.checks.push({ 
                    field: 'agent', 
                    result: 'FAIL',
                    db: dbAgent,
                    excel: excelAgent
                });
                validation.summary.failed++;
            }
            
            validation.spotChecks.push(checks);
            
            // Overall record status
            const failedChecks = checks.checks.filter(c => c.result === 'FAIL').length;
            if (failedChecks === 0) {
                validation.summary.passed++;
            }
        }
        
        validation.summary.totalChecks = validation.spotChecks.length;
        validation.summary.accuracy = validation.summary.totalChecks > 0 
            ? ((validation.summary.passed / validation.summary.totalChecks) * 100).toFixed(1) + '%'
            : 'N/A';
        
        return validation;
    }

    /**
     * Generate HTML report
     */
    async generateHTMLReport(data) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Import Report - ${data.batch.source_file}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1, h2 { color: #333; }
        h1 { border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { margin-top: 30px; color: #666; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-box { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50; }
        .stat-value { font-size: 24px; font-weight: bold; color: #333; }
        .stat-label { color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        tr:hover { background: #f5f5f5; }
        .status-change { background: #fff3cd; }
        .validation-pass { color: #28a745; }
        .validation-fail { color: #dc3545; }
        .timestamp { color: #666; font-size: 12px; }
        .quality-excellent { color: #28a745; }
        .quality-good { color: #17a2b8; }
        .quality-fair { color: #ffc107; }
        .quality-poor { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Import Report</h1>
        <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
        
        <h2>Import Details</h2>
        <table>
            <tr><th>Batch ID</th><td>${data.batch.id}</td></tr>
            <tr><th>Source File</th><td>${data.batch.source_file}</td></tr>
            <tr><th>Import Started</th><td>${new Date(data.batch.import_started).toLocaleString()}</td></tr>
            <tr><th>Import Completed</th><td>${data.batch.import_completed ? new Date(data.batch.import_completed).toLocaleString() : 'In Progress'}</td></tr>
            <tr><th>Status</th><td>${data.batch.status}</td></tr>
        </table>
        
        <h2>Import Statistics</h2>
        <div class="summary">
            <div class="stat-box">
                <div class="stat-value">${data.batch.total_rows.toLocaleString()}</div>
                <div class="stat-label">Total Rows</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${data.batch.new_entities.toLocaleString()}</div>
                <div class="stat-label">New Records</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${data.batch.updated_entities.toLocaleString()}</div>
                <div class="stat-label">Updated Records</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${data.batch.status_changes.toLocaleString()}</div>
                <div class="stat-label">Status Changes</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${data.statistics.unique_poles || 0}</div>
                <div class="stat-label">Unique Poles</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${data.statistics.avg_quality_score || 0}</div>
                <div class="stat-label">Avg Quality Score</div>
            </div>
        </div>
        
        <h2>Data Quality Distribution</h2>
        <table>
            <tr>
                <th>Quality Tier</th>
                <th>Record Count</th>
                <th>Average Score</th>
            </tr>
            ${data.dataQuality.map(q => `
                <tr>
                    <td class="quality-${q.quality_tier.toLowerCase().split(' ')[0]}">${q.quality_tier}</td>
                    <td>${q.record_count.toLocaleString()}</td>
                    <td>${q.avg_score}%</td>
                </tr>
            `).join('')}
        </table>
        
        <h2>Change Summary</h2>
        <table>
            <tr>
                <th>Field</th>
                <th>Changes</th>
                <th>Affected Records</th>
            </tr>
            ${data.statusChanges.map(c => `
                <tr>
                    <td>${c.field_name}</td>
                    <td>${c.change_count}</td>
                    <td>${c.affected_entities}</td>
                </tr>
            `).join('')}
        </table>
        
        <h2>Recent Status Changes (Top 10)</h2>
        <table>
            <tr>
                <th>Entity ID</th>
                <th>Old Status</th>
                <th>New Status</th>
                <th>Changed At</th>
            </tr>
            ${data.topChanges.map(c => `
                <tr class="status-change">
                    <td>${c.entity_id}</td>
                    <td>${c.old_value || 'NULL'}</td>
                    <td>${c.new_value}</td>
                    <td>${c.change_time}</td>
                </tr>
            `).join('')}
        </table>
        
        ${data.validation ? `
        <h2>Data Validation Results</h2>
        <div class="summary">
            <div class="stat-box">
                <div class="stat-value">${data.validation.summary.totalChecks}</div>
                <div class="stat-label">Records Checked</div>
            </div>
            <div class="stat-box">
                <div class="stat-value validation-pass">${data.validation.summary.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-box">
                <div class="stat-value validation-fail">${data.validation.summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${data.validation.summary.accuracy}</div>
                <div class="stat-label">Accuracy</div>
            </div>
        </div>
        
        <h3>Spot Check Details</h3>
        <table>
            <tr>
                <th>Property ID</th>
                <th>Field</th>
                <th>Result</th>
                <th>Database Value</th>
                <th>Excel Value</th>
            </tr>
            ${data.validation.spotChecks.flatMap(record => 
                record.checks ? record.checks.map(check => `
                    <tr>
                        <td>${record.property_id}</td>
                        <td>${check.field}</td>
                        <td class="${check.result === 'PASS' ? 'validation-pass' : 'validation-fail'}">${check.result}</td>
                        <td>${check.db !== undefined ? check.db : '-'}</td>
                        <td>${check.excel !== undefined ? check.excel : '-'}</td>
                    </tr>
                `) : []
            ).join('')}
        </table>
        ` : ''}
        
        ${data.errors ? `
        <h2>Import Errors</h2>
        <div style="background: #f8d7da; padding: 15px; border-radius: 5px; color: #721c24;">
            <pre>${JSON.stringify(data.errors, null, 2)}</pre>
        </div>
        ` : ''}
    </div>
</body>
</html>
        `;
        
        const fileName = `import-report-${data.batch.id}.html`;
        const filePath = path.join(this.reportDir, fileName);
        fs.writeFileSync(filePath, html);
        console.log(`📄 HTML report saved: ${fileName}`);
    }

    /**
     * Generate text report
     */
    async generateTextReport(data) {
        let text = `IMPORT REPORT
============
Generated: ${new Date().toISOString()}

IMPORT DETAILS
--------------
Batch ID: ${data.batch.id}
Source File: ${data.batch.source_file}
Import Started: ${data.batch.import_started}
Import Completed: ${data.batch.import_completed || 'In Progress'}
Status: ${data.batch.status}

STATISTICS
----------
Total Rows: ${data.batch.total_rows}
New Records: ${data.batch.new_entities}
Updated Records: ${data.batch.updated_entities}
Status Changes: ${data.batch.status_changes}
Errors: ${data.batch.errors}

Unique Properties: ${data.statistics.unique_properties}
Unique Poles: ${data.statistics.unique_poles}
Unique Agents: ${data.statistics.unique_agents}
Average Quality Score: ${data.statistics.avg_quality_score}

DATA QUALITY
------------
${data.dataQuality.map(q => `${q.quality_tier}: ${q.record_count} records (${q.avg_score}% avg)`).join('\n')}

CHANGE SUMMARY
--------------
${data.statusChanges.map(c => `${c.field_name}: ${c.change_count} changes affecting ${c.affected_entities} records`).join('\n')}

TOP STATUS CHANGES
------------------
${data.topChanges.map(c => `${c.entity_id}: "${c.old_value || 'NULL'}" → "${c.new_value}" at ${c.change_time}`).join('\n')}
`;

        if (data.validation) {
            text += `

VALIDATION RESULTS
------------------
Records Checked: ${data.validation.summary.totalChecks}
Passed: ${data.validation.summary.passed}
Failed: ${data.validation.summary.failed}
Accuracy: ${data.validation.summary.accuracy}

${data.validation.error ? `Error: ${data.validation.error}\n` : ''}
`;
        }

        if (data.errors) {
            text += `

ERRORS
------
${JSON.stringify(data.errors, null, 2)}
`;
        }

        const fileName = `import-report-${data.batch.id}.txt`;
        const filePath = path.join(this.reportDir, fileName);
        fs.writeFileSync(filePath, text);
        console.log(`📄 Text report saved: ${fileName}`);
    }

    /**
     * Generate JSON report
     */
    async generateJSONReport(data) {
        const fileName = `import-report-${data.batch.id}.json`;
        const filePath = path.join(this.reportDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`📄 JSON report saved: ${fileName}`);
    }

    /**
     * Update import history log
     */
    async updateImportLog(data) {
        const logEntry = `${new Date().toISOString()} | ${data.batch.source_file} | Rows: ${data.batch.total_rows} | New: ${data.batch.new_entities} | Updated: ${data.batch.updated_entities} | Changes: ${data.batch.status_changes} | Status: ${data.batch.status}\n`;
        
        fs.appendFileSync(this.importLogFile, logEntry);
        console.log(`📝 Import log updated: import-history.log`);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const batchId = args.find(arg => arg.startsWith('--batch-id='))?.split('=')[1];
    const includeValidation = args.includes('--validate');
    
    const generator = new ImportReportGenerator();
    
    try {
        await generator.generateReport(batchId, includeValidation);
    } catch (error) {
        console.error('💥 Report generation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ImportReportGenerator;