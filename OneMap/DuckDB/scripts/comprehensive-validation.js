#!/usr/bin/env node

const Database = require('duckdb-async').Database;
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');
const REPORTS_DIR = path.join(__dirname, '../reports/validation');
const VALIDATION_DB = path.join(__dirname, '../data/validation.duckdb');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Business rules configuration
const BUSINESS_RULES = {
    maxDropsPerPole: 12,
    minDaysToComplete: 1,
    maxDaysToComplete: 365,
    maxPropertiesPerAddress: 20,
    maxStatusChangesPerProperty: 10,
    requiredFieldsForInstallation: ['Pole Number', 'Drop Number', 'Field Agent Name'],
    workflowOrder: {
        'Pole Permission: Pending': 1,
        'Pole Permission: Approved': 2,
        'Pole Permission: Declined': 2,
        'Home Sign Ups: Pending': 3,
        'Home Sign Ups: Declined': 4,
        'Home Sign Ups: Approved': 4,
        'Home Sign Ups: Approved & Installation Scheduled': 5,
        'Home Sign Ups: Approved & Installation Re-scheduled': 5,
        'Home Installation: In Progress': 6,
        'Home Installation: Installed': 7,
        'Home Installation: Declined': 6
    }
};

class ComprehensiveValidator {
    constructor() {
        this.validationResults = {
            timestamp: new Date().toISOString(),
            summary: {
                totalRecords: 0,
                validationScore: 0,
                criticalIssues: 0,
                warnings: 0,
                passed: 0
            },
            categories: {
                excelImport: { issues: [], warnings: [], passed: [] },
                businessLogic: { issues: [], warnings: [], passed: [] },
                statistical: { issues: [], warnings: [], passed: []  }
            },
            details: []
        };
    }

    async initialize() {
        this.db = await Database.create(DB_PATH);
        this.validationDb = await Database.create(VALIDATION_DB);
        
        // Create validation tracking tables
        await this.createValidationTables();
    }

    async createValidationTables() {
        // Create validation history table
        await this.validationDb.run(`
            CREATE SEQUENCE IF NOT EXISTS validation_history_seq START 1
        `);
        
        await this.validationDb.run(`
            CREATE TABLE IF NOT EXISTS validation_history (
                id INTEGER PRIMARY KEY DEFAULT nextval('validation_history_seq'),
                run_date DATE DEFAULT CURRENT_DATE,
                run_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_records INTEGER,
                validation_score DECIMAL(5,2),
                critical_issues INTEGER,
                warnings INTEGER,
                passed INTEGER,
                report_path VARCHAR
            )
        `);

        // Create issue tracking table
        await this.validationDb.run(`
            CREATE SEQUENCE IF NOT EXISTS validation_issues_seq START 1
        `);
        
        await this.validationDb.run(`
            CREATE TABLE IF NOT EXISTS validation_issues (
                id INTEGER PRIMARY KEY DEFAULT nextval('validation_issues_seq'),
                run_date DATE DEFAULT CURRENT_DATE,
                category VARCHAR,
                severity VARCHAR,
                rule_name VARCHAR,
                description VARCHAR,
                affected_count INTEGER,
                sample_data TEXT
            )
        `);

        // Create 5-day baseline table
        await this.validationDb.run(`
            CREATE TABLE IF NOT EXISTS baseline_metrics (
                metric_name VARCHAR PRIMARY KEY,
                avg_value DECIMAL,
                std_dev DECIMAL,
                min_value DECIMAL,
                max_value DECIMAL,
                last_updated DATE DEFAULT CURRENT_DATE
            )
        `);
    }

    // VALIDATION TYPE 1: Excel Import Validation
    async validateExcelImport(excelFile, tableName) {
        console.log('\n📋 VALIDATION 1: Excel Import Accuracy\n');
        
        try {
            // Read Excel file
            const workbook = XLSX.readFile(excelFile);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const excelData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd', defval: null });
            
            // Get database data
            const dbData = await this.db.all(`SELECT * FROM ${tableName}`);
            
            // Basic count validation
            if (excelData.length !== dbData.length) {
                this.addIssue('excelImport', 'critical', 'Record Count Mismatch', 
                    `Excel: ${excelData.length} records, Database: ${dbData.length} records`, 
                    Math.abs(excelData.length - dbData.length));
                
                // Block import if mismatch
                throw new Error(`IMPORT BLOCKED: Record count mismatch. Excel has ${excelData.length} records but database has ${dbData.length}`);
            } else {
                this.addPassed('excelImport', 'Record Count Match', 
                    `Both have ${excelData.length} records`);
            }

            // Field integrity validation
            const criticalFields = ['Property ID', 'Status', 'Pole Number', 'Drop Number'];
            let fieldMismatches = 0;
            
            for (let i = 0; i < Math.min(100, excelData.length); i++) {
                const excelRow = excelData[i];
                const dbRow = dbData.find(d => d['Property ID'] == excelRow['Property ID']);
                
                if (!dbRow) {
                    fieldMismatches++;
                    continue;
                }
                
                for (const field of criticalFields) {
                    if (excelRow[field] !== dbRow[field]) {
                        fieldMismatches++;
                    }
                }
            }
            
            if (fieldMismatches > 0) {
                this.addIssue('excelImport', 'critical', 'Field Value Mismatch', 
                    `${fieldMismatches} field mismatches in sample of 100 records`, 
                    fieldMismatches);
            } else {
                this.addPassed('excelImport', 'Field Integrity', 
                    'All critical fields match in sample');
            }
            
            // Data type consistency
            const dataTypeIssues = await this.checkDataTypes(tableName);
            if (dataTypeIssues > 0) {
                this.addWarning('excelImport', 'Data Type Issues', 
                    `${dataTypeIssues} fields have inconsistent data types`, 
                    dataTypeIssues);
            }
            
            console.log(`✅ Excel import validation complete\n`);
            
        } catch (error) {
            console.error(`❌ Excel import validation failed: ${error.message}`);
            throw error;
        }
    }

    // VALIDATION TYPE 2: Business Logic Validation
    async validateBusinessLogic() {
        console.log('📋 VALIDATION 2: Business Logic Rules\n');
        
        // Get latest data
        const latestTable = await this.getLatestTable();
        
        // 1. Workflow violations (installations without sign up)
        const workflowViolations = await this.db.all(`
            SELECT COUNT(*) as count
            FROM ${latestTable}
            WHERE (
                "Status" LIKE '%Home Installation:%'
            )
            AND (
                "Flow Name Groups" NOT LIKE '%Home Sign Ups: Approved%'
                OR "Flow Name Groups" IS NULL
            )
        `);
        
        const violationCount = Number(workflowViolations[0].count);
        if (violationCount > 0) {
            const samples = await this.db.all(`
                SELECT "Property ID", "Status", "Pole Number", 
                       COALESCE("Field Agent Name (pole permission)", 
                                "Field Agent Name (Home Sign Ups)", 
                                "Installer Name") as agent
                FROM ${latestTable}
                WHERE ("Status" LIKE '%Home Installation:%')
                AND ("Flow Name Groups" NOT LIKE '%Home Sign Ups: Approved%' OR "Flow Name Groups" IS NULL)
                LIMIT 5
            `);
            
            this.addIssue('businessLogic', 'critical', 'Workflow Violations', 
                `${violationCount} installations without Home Sign Up approval`, 
                violationCount, samples);
        } else {
            this.addPassed('businessLogic', 'Workflow Compliance', 
                'All installations have proper sign up approval');
        }

        // 2. Backwards status progressions
        const backwardsProgressions = await this.checkBackwardsProgressions();
        if (backwardsProgressions.length > 0) {
            this.addIssue('businessLogic', 'critical', 'Backwards Progressions', 
                `${backwardsProgressions.length} properties moved backwards in workflow`, 
                backwardsProgressions.length, backwardsProgressions.slice(0, 5));
        } else {
            this.addPassed('businessLogic', 'Status Progression', 
                'No backwards progressions detected');
        }

        // 3. Pole capacity violations
        const poleCapacityIssues = await this.db.all(`
            SELECT "Pole Number", COUNT(*) as drop_count
            FROM ${latestTable}
            WHERE "Pole Number" IS NOT NULL
            GROUP BY "Pole Number"
            HAVING COUNT(*) > ${BUSINESS_RULES.maxDropsPerPole}
        `);
        
        if (poleCapacityIssues.length > 0) {
            this.addIssue('businessLogic', 'critical', 'Pole Capacity Exceeded', 
                `${poleCapacityIssues.length} poles have more than ${BUSINESS_RULES.maxDropsPerPole} drops`, 
                poleCapacityIssues.length, poleCapacityIssues.slice(0, 5));
        } else {
            this.addPassed('businessLogic', 'Pole Capacity', 
                `All poles within ${BUSINESS_RULES.maxDropsPerPole} drop limit`);
        }

        // 4. Missing required fields for installations
        const missingFields = await this.db.all(`
            SELECT COUNT(*) as count
            FROM ${latestTable}
            WHERE "Status" LIKE '%Installation:%'
            AND ("Pole Number" IS NULL OR "Drop Number" IS NULL)
        `);
        
        const missingCount = Number(missingFields[0].count);
        if (missingCount > 0) {
            this.addWarning('businessLogic', 'Missing Required Fields', 
                `${missingCount} installations missing pole/drop numbers`, 
                missingCount);
        }

        // 5. Agent name consistency
        const agentIssues = await this.checkAgentConsistency();
        if (agentIssues.length > 0) {
            this.addWarning('businessLogic', 'Agent Name Inconsistency', 
                `${agentIssues.length} variations in agent naming`, 
                agentIssues.length, agentIssues.slice(0, 5));
        }

        console.log('✅ Business logic validation complete\n');
    }

    // VALIDATION TYPE 3: Statistical Validation
    async validateStatistical() {
        console.log('📋 VALIDATION 3: Statistical Anomaly Detection\n');
        
        // Update 5-day baseline
        await this.updateBaseline();
        
        // 1. Agent performance outliers
        const agentOutliers = await this.findAgentOutliers();
        if (agentOutliers.length > 0) {
            this.addWarning('statistical', 'Agent Performance Outliers', 
                `${agentOutliers.length} agents with unusual patterns`, 
                agentOutliers.length, agentOutliers);
        }

        // 2. Rapid status progressions
        const rapidProgressions = await this.findRapidProgressions();
        if (rapidProgressions.length > 0) {
            this.addWarning('statistical', 'Unrealistic Timing', 
                `${rapidProgressions.length} properties completed in <1 day`, 
                rapidProgressions.length, rapidProgressions.slice(0, 5));
        }

        // 3. Address anomalies
        const addressAnomalies = await this.findAddressAnomalies();
        if (addressAnomalies.length > 0) {
            this.addWarning('statistical', 'Address Anomalies', 
                `${addressAnomalies.length} addresses with suspicious property counts`, 
                addressAnomalies.length, addressAnomalies.slice(0, 5));
        }

        // 4. Status change frequency outliers
        const changeOutliers = await this.findStatusChangeOutliers();
        if (changeOutliers.length > 0) {
            this.addWarning('statistical', 'Excessive Status Changes', 
                `${changeOutliers.length} properties with abnormal change frequency`, 
                changeOutliers.length, changeOutliers.slice(0, 5));
        }

        console.log('✅ Statistical validation complete\n');
    }

    // Helper methods
    async getLatestTable() {
        const tables = await this.db.all(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'main' 
            AND table_name LIKE 'aug%_import'
            ORDER BY table_name DESC
            LIMIT 1
        `);
        return tables[0].table_name;
    }

    async checkDataTypes(tableName) {
        // Check for fields that should be numeric but contain text
        let issues = 0;
        
        const numericChecks = [
            { field: 'Property ID', pattern: '^[0-9]+$' },
            { field: 'date_status_changed', pattern: '^\\d{4}-\\d{2}-\\d{2}' }
        ];
        
        for (const check of numericChecks) {
            try {
                const invalid = await this.db.all(`
                    SELECT COUNT(*) as count
                    FROM ${tableName}
                    WHERE "${check.field}" IS NOT NULL
                    AND NOT REGEXP_MATCHES("${check.field}", '${check.pattern}')
                `);
                issues += Number(invalid[0].count);
            } catch (e) {
                // RegExp might not be available, skip
            }
        }
        
        return issues;
    }

    async checkBackwardsProgressions() {
        const tables = await this.db.all(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'main' 
            AND table_name LIKE 'aug%_import'
            ORDER BY table_name
        `);
        
        const allBackwards = [];
        
        for (let i = 1; i < tables.length; i++) {
            const table1 = tables[i-1].table_name;
            const table2 = tables[i].table_name;
            
            const backwards = await this.db.all(`
                WITH t1_latest AS (
                    SELECT DISTINCT ON ("Property ID")
                        "Property ID" as property_id,
                        "Status" as status,
                        "Pole Number" as pole_number
                    FROM ${table1}
                    WHERE "Property ID" IS NOT NULL
                    ORDER BY "Property ID", "date_status_changed" DESC NULLS LAST
                ),
                t2_latest AS (
                    SELECT DISTINCT ON ("Property ID")
                        "Property ID" as property_id,
                        "Status" as status,
                        "Pole Number" as pole_number,
                        COALESCE(
                            "Field Agent Name (pole permission)",
                            "Field Agent Name (Home Sign Ups)",
                            "Installer Name"
                        ) as agent
                    FROM ${table2}
                    WHERE "Property ID" IS NOT NULL
                    ORDER BY "Property ID", "date_status_changed" DESC NULLS LAST
                )
                SELECT 
                    t2.property_id,
                    t1.status as old_status,
                    t2.status as new_status,
                    t2.pole_number,
                    t2.agent
                FROM t2_latest t2
                INNER JOIN t1_latest t1 ON t2.property_id = t1.property_id
                WHERE t1.status != t2.status
            `);
            
            const filtered = backwards.filter(row => {
                const oldOrder = BUSINESS_RULES.workflowOrder[row.old_status] || 0;
                const newOrder = BUSINESS_RULES.workflowOrder[row.new_status] || 0;
                return oldOrder > newOrder && oldOrder > 0 && newOrder > 0;
            });
            
            allBackwards.push(...filtered.map(r => ({
                ...r,
                period: `${table1} → ${table2}`
            })));
        }
        
        return allBackwards;
    }

    async checkAgentConsistency() {
        const latestTable = await this.getLatestTable();
        
        const agents = await this.db.all(`
            SELECT 
                COALESCE(
                    "Field Agent Name (pole permission)",
                    "Field Agent Name (Home Sign Ups)",
                    "Installer Name"
                ) as agent,
                COUNT(*) as count
            FROM ${latestTable}
            WHERE COALESCE(
                "Field Agent Name (pole permission)",
                "Field Agent Name (Home Sign Ups)",
                "Installer Name"
            ) IS NOT NULL
            GROUP BY agent
            ORDER BY agent
        `);
        
        // Look for similar names (potential duplicates)
        const issues = [];
        for (let i = 0; i < agents.length - 1; i++) {
            for (let j = i + 1; j < agents.length; j++) {
                const similarity = this.stringSimilarity(
                    agents[i].agent.toLowerCase(), 
                    agents[j].agent.toLowerCase()
                );
                if (similarity > 0.8 && similarity < 1) {
                    issues.push({
                        agent1: agents[i].agent,
                        agent2: agents[j].agent,
                        similarity: (similarity * 100).toFixed(1) + '%'
                    });
                }
            }
        }
        
        return issues;
    }

    stringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    async updateBaseline() {
        // Calculate 5-day rolling averages for key metrics
        const tables = await this.db.all(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'main' 
            AND table_name LIKE 'aug%_import'
            ORDER BY table_name DESC
            LIMIT 5
        `);
        
        if (tables.length < 5) return; // Need 5 days for baseline
        
        // Calculate baseline metrics
        const metrics = [
            { name: 'daily_status_changes', query: 'COUNT(DISTINCT "Property ID")' },
            { name: 'backwards_progressions_rate', query: 'COUNT(*)' }, // Will be calculated separately
            { name: 'avg_properties_per_address', query: 'AVG(prop_count)' }
        ];
        
        // Update baseline in validation database
        for (const metric of metrics) {
            // Implementation depends on specific metric
            // This is a simplified example
            await this.validationDb.run(`
                INSERT OR REPLACE INTO baseline_metrics (metric_name, avg_value, std_dev, last_updated)
                VALUES ('${metric.name}', 0, 0, CURRENT_DATE)
            `);
        }
    }

    async findAgentOutliers() {
        const latestTable = await this.getLatestTable();
        
        // Find agents with high backwards progression rates
        const agentStats = await this.db.all(`
            SELECT 
                agent,
                SUM(CASE WHEN is_backwards = 1 THEN 1 ELSE 0 END) as backwards_count,
                COUNT(*) as total_changes
            FROM (
                -- This would be the full backwards progression query
                SELECT 'placeholder' as agent, 0 as is_backwards
            ) t
            GROUP BY agent
            HAVING backwards_count > 5
        `);
        
        return agentStats;
    }

    async findRapidProgressions() {
        const latestTable = await this.getLatestTable();
        
        // Find properties that progressed too quickly
        const rapid = await this.db.all(`
            WITH property_timeline AS (
                SELECT 
                    "Property ID",
                    MIN(CASE WHEN "Status" LIKE '%Pole Permission%' THEN "date_status_changed" END) as start_date,
                    MAX(CASE WHEN "Status" LIKE '%Installed%' THEN "date_status_changed" END) as end_date
                FROM ${latestTable}
                WHERE "Property ID" IS NOT NULL
                GROUP BY "Property ID"
            )
            SELECT 
                "Property ID" as property_id,
                start_date,
                end_date,
                julian(end_date) - julian(start_date) as days_to_complete
            FROM property_timeline
            WHERE start_date IS NOT NULL 
            AND end_date IS NOT NULL
            AND julian(end_date) - julian(start_date) < 1
            LIMIT 10
        `);
        
        return rapid;
    }

    async findAddressAnomalies() {
        const latestTable = await this.getLatestTable();
        
        const anomalies = await this.db.all(`
            SELECT 
                "Location Address" as address,
                COUNT(DISTINCT "Property ID") as property_count
            FROM ${latestTable}
            WHERE "Location Address" IS NOT NULL
            GROUP BY "Location Address"
            HAVING COUNT(DISTINCT "Property ID") > ${BUSINESS_RULES.maxPropertiesPerAddress}
            ORDER BY property_count DESC
            LIMIT 10
        `);
        
        return anomalies;
    }

    async findStatusChangeOutliers() {
        const tables = await this.db.all(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'main' 
            AND table_name LIKE 'aug%_import'
            ORDER BY table_name
        `);
        
        // Count status changes per property across all days
        const changeFrequency = new Map();
        
        for (const table of tables) {
            const statuses = await this.db.all(`
                SELECT "Property ID", "Status"
                FROM ${table.table_name}
                WHERE "Property ID" IS NOT NULL
            `);
            
            statuses.forEach(row => {
                const propId = row['Property ID'];
                if (!changeFrequency.has(propId)) {
                    changeFrequency.set(propId, new Set());
                }
                changeFrequency.get(propId).add(row.Status);
            });
        }
        
        // Find outliers
        const outliers = [];
        changeFrequency.forEach((statuses, propId) => {
            if (statuses.size > BUSINESS_RULES.maxStatusChangesPerProperty) {
                outliers.push({
                    property_id: propId,
                    change_count: statuses.size
                });
            }
        });
        
        return outliers.slice(0, 10);
    }

    // Reporting helpers
    addIssue(category, severity, ruleName, description, affectedCount, samples = []) {
        this.validationResults.categories[category].issues.push({
            severity,
            ruleName,
            description,
            affectedCount,
            samples
        });
        this.validationResults.summary.criticalIssues++;
    }

    addWarning(category, ruleName, description, affectedCount, samples = []) {
        this.validationResults.categories[category].warnings.push({
            ruleName,
            description,
            affectedCount,
            samples
        });
        this.validationResults.summary.warnings++;
    }

    addPassed(category, ruleName, description) {
        this.validationResults.categories[category].passed.push({
            ruleName,
            description
        });
        this.validationResults.summary.passed++;
    }

    calculateValidationScore() {
        const total = this.validationResults.summary.criticalIssues + 
                     this.validationResults.summary.warnings + 
                     this.validationResults.summary.passed;
        
        if (total === 0) return 100;
        
        const score = ((this.validationResults.summary.passed / total) * 100) - 
                     (this.validationResults.summary.criticalIssues * 5) - 
                     (this.validationResults.summary.warnings * 2);
        
        return Math.max(0, Math.min(100, score));
    }

    // Report generation
    async generateReports() {
        console.log('\n📊 Generating validation reports...\n');
        
        // Calculate final score
        this.validationResults.summary.validationScore = this.calculateValidationScore();
        
        // 1. Console output
        this.generateConsoleReport();
        
        // 2. Markdown report
        const markdownPath = await this.generateMarkdownReport();
        
        // 3. Database entry
        await this.saveToDatabase(markdownPath);
        
        // 4. JSON export
        await this.generateJsonReport();
        
        console.log('\n✅ All reports generated successfully!');
    }

    generateConsoleReport() {
        console.log('\n' + '='.repeat(70));
        console.log('🔍 DAILY VALIDATION REPORT');
        console.log('='.repeat(70));
        console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
        console.log(`Validation Score: ${this.validationResults.summary.validationScore.toFixed(1)}%`);
        console.log(`\n📈 SUMMARY:`);
        console.log(`- Critical Issues: ${this.validationResults.summary.criticalIssues} ⚠️`);
        console.log(`- Warnings: ${this.validationResults.summary.warnings} ⚡`);
        console.log(`- Passed: ${this.validationResults.summary.passed} ✅`);
        
        // Show critical issues
        if (this.validationResults.summary.criticalIssues > 0) {
            console.log(`\n🚨 CRITICAL ISSUES (require immediate action):`);
            let issueNum = 1;
            
            Object.entries(this.validationResults.categories).forEach(([category, data]) => {
                data.issues.forEach(issue => {
                    console.log(`${issueNum}. ${issue.ruleName}: ${issue.description}`);
                    issueNum++;
                });
            });
        }
        
        // Show warnings
        if (this.validationResults.summary.warnings > 0) {
            console.log(`\n⚠️ WARNINGS (review recommended):`);
            let warnNum = 1;
            
            Object.entries(this.validationResults.categories).forEach(([category, data]) => {
                data.warnings.forEach(warning => {
                    console.log(`${warnNum}. ${warning.ruleName}: ${warning.description}`);
                    warnNum++;
                });
            });
        }
    }

    async generateMarkdownReport() {
        const date = new Date().toISOString().split('T')[0];
        const filename = `validation_report_${date}.md`;
        const filepath = path.join(REPORTS_DIR, filename);
        
        let report = `# Daily Validation Report - ${date}\n\n`;
        report += `**Generated**: ${new Date().toISOString()}\n`;
        report += `**System**: DuckDB Comprehensive Validation Framework\n\n`;
        
        report += `## 📊 Executive Summary\n\n`;
        report += `- **Validation Score**: ${this.validationResults.summary.validationScore.toFixed(1)}%\n`;
        report += `- **Critical Issues**: ${this.validationResults.summary.criticalIssues}\n`;
        report += `- **Warnings**: ${this.validationResults.summary.warnings}\n`;
        report += `- **Passed Checks**: ${this.validationResults.summary.passed}\n\n`;
        
        // Excel Import Validation
        report += `## 1️⃣ Excel Import Validation\n\n`;
        report += this.addCategoryToReport(report, 'excelImport');
        
        // Business Logic Validation
        report += `## 2️⃣ Business Logic Validation\n\n`;
        report += this.addCategoryToReport(report, 'businessLogic');
        
        // Statistical Validation
        report += `## 3️⃣ Statistical Anomaly Detection\n\n`;
        report += this.addCategoryToReport(report, 'statistical');
        
        // Recommendations
        report += `## 🎯 Recommendations\n\n`;
        report += this.generateRecommendations();
        
        fs.writeFileSync(filepath, report);
        console.log(`\n📄 Markdown report saved: ${filepath}`);
        
        return filepath;
    }

    addCategoryToReport(report, category) {
        const data = this.validationResults.categories[category];
        let content = '';
        
        if (data.issues.length > 0) {
            content += `### ❌ Critical Issues\n\n`;
            data.issues.forEach(issue => {
                content += `**${issue.ruleName}**\n`;
                content += `- ${issue.description}\n`;
                if (issue.samples && issue.samples.length > 0) {
                    content += `- Sample affected records:\n`;
                    issue.samples.slice(0, 3).forEach(sample => {
                        content += `  - Property ${sample.property_id || sample['Property ID'] || 'N/A'}\n`;
                    });
                }
                content += '\n';
            });
        }
        
        if (data.warnings.length > 0) {
            content += `### ⚠️ Warnings\n\n`;
            data.warnings.forEach(warning => {
                content += `**${warning.ruleName}**\n`;
                content += `- ${warning.description}\n\n`;
            });
        }
        
        if (data.passed.length > 0) {
            content += `### ✅ Passed Checks\n\n`;
            data.passed.forEach(check => {
                content += `- **${check.ruleName}**: ${check.description}\n`;
            });
            content += '\n';
        }
        
        return content;
    }

    generateRecommendations() {
        let recommendations = '';
        
        if (this.validationResults.summary.criticalIssues > 0) {
            recommendations += `1. **Immediate Action Required**: Address all critical issues before next import\n`;
            recommendations += `2. **Data Correction**: Review and correct identified data quality issues\n`;
            recommendations += `3. **Process Review**: Investigate root causes of validation failures\n`;
        }
        
        if (this.validationResults.summary.warnings > 0) {
            recommendations += `4. **Warning Review**: Analyze warning patterns for systemic issues\n`;
            recommendations += `5. **Training**: Consider agent training for consistency\n`;
        }
        
        recommendations += `6. **Continuous Monitoring**: Run validation daily after each import\n`;
        recommendations += `7. **Baseline Update**: Review statistical baselines weekly\n`;
        
        return recommendations;
    }

    async saveToDatabase(reportPath) {
        // Escape strings for SQL
        const escapeStr = (str) => str ? str.replace(/'/g, "''") : '';
        
        await this.validationDb.run(`
            INSERT INTO validation_history (
                total_records, validation_score, critical_issues, 
                warnings, passed, report_path
            ) VALUES (${this.validationResults.summary.totalRecords}, 
                     ${this.validationResults.summary.validationScore}, 
                     ${this.validationResults.summary.criticalIssues}, 
                     ${this.validationResults.summary.warnings}, 
                     ${this.validationResults.summary.passed}, 
                     '${escapeStr(reportPath)}')
        `);
        
        // Save individual issues
        for (const [category, data] of Object.entries(this.validationResults.categories)) {
            for (const issue of data.issues) {
                await this.validationDb.run(`
                    INSERT INTO validation_issues (
                        category, severity, rule_name, description, 
                        affected_count, sample_data
                    ) VALUES ('${escapeStr(category)}', 
                             '${escapeStr(issue.severity)}', 
                             '${escapeStr(issue.ruleName)}', 
                             '${escapeStr(issue.description)}', 
                             ${issue.affectedCount}, 
                             '${escapeStr(JSON.stringify(issue.samples))}')
                `);
            }
            
            for (const warning of data.warnings) {
                await this.validationDb.run(`
                    INSERT INTO validation_issues (
                        category, severity, rule_name, description, 
                        affected_count, sample_data
                    ) VALUES ('${escapeStr(category)}', 
                             'warning', 
                             '${escapeStr(warning.ruleName)}', 
                             '${escapeStr(warning.description)}', 
                             ${warning.affectedCount}, 
                             '${escapeStr(JSON.stringify(warning.samples))}')
                `);
            }
        }
        
        console.log('💾 Results saved to validation database');
    }

    async generateJsonReport() {
        const date = new Date().toISOString().split('T')[0];
        const filename = `validation_report_${date}.json`;
        const filepath = path.join(REPORTS_DIR, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(this.validationResults, null, 2));
        console.log(`📄 JSON report saved: ${filepath}`);
    }

    async cleanup() {
        await this.db.close();
        await this.validationDb.close();
    }
}

// Main execution
async function runValidation(excelFile = null, tableName = null) {
    const validator = new ComprehensiveValidator();
    
    try {
        await validator.initialize();
        
        // Get latest data info
        const latestTable = await validator.getLatestTable();
        const recordCount = await validator.db.all(`SELECT COUNT(*) as count FROM ${latestTable}`);
        validator.validationResults.summary.totalRecords = Number(recordCount[0].count);
        
        console.log('\n🚀 Starting Comprehensive Validation Framework');
        console.log('='.repeat(70));
        console.log(`Processing ${validator.validationResults.summary.totalRecords} records from ${latestTable}\n`);
        
        // Run validations
        if (excelFile && tableName) {
            // Validate specific import
            await validator.validateExcelImport(excelFile, tableName);
        }
        
        await validator.validateBusinessLogic();
        await validator.validateStatistical();
        
        // Generate reports
        await validator.generateReports();
        
        // Show alerts if critical issues
        if (validator.validationResults.summary.criticalIssues > 0) {
            console.log('\n' + '🚨'.repeat(35));
            console.log('ALERT: CRITICAL ISSUES DETECTED - IMMEDIATE ACTION REQUIRED!');
            console.log('🚨'.repeat(35));
        }
        
    } catch (error) {
        console.error('\n❌ Validation failed:', error.message);
        process.exit(1);
    } finally {
        await validator.cleanup();
    }
}

// Check if running directly or being imported
if (require.main === module) {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const excelFile = args[0];
    const tableName = args[1];
    
    runValidation(excelFile, tableName).catch(console.error);
}

module.exports = { runValidation, ComprehensiveValidator };