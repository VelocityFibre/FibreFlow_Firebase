#!/usr/bin/env node

const Database = require('duckdb-async').Database;
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

async function trackBackwardsProgressions() {
    console.log('🔄 Backwards Status Progression Tracking System\n');
    console.log('=' .repeat(80));
    
    const db = await Database.create(DB_PATH);
    
    try {
        // 1. Create backwards progressions table
        console.log('📊 Creating backwards progressions tracking table...\n');
        
        // Drop table if exists to start fresh
        await db.run(`DROP TABLE IF EXISTS backwards_progressions`);
        
        await db.run(`
            CREATE TABLE backwards_progressions (
                property_id BIGINT NOT NULL,
                pole_number VARCHAR,
                drop_number VARCHAR,
                address VARCHAR,
                old_status VARCHAR NOT NULL,
                new_status VARCHAR NOT NULL,
                old_status_order INTEGER,
                new_status_order INTEGER,
                agent_name VARCHAR,
                date_detected DATE DEFAULT CURRENT_DATE,
                source_file VARCHAR,
                comparison_period VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Table created/verified\n');
        
        // 2. Define status progression order
        const progressionOrder = {
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
        };
        
        // 3. Find all backwards progressions across all days
        console.log('🔍 Analyzing all backwards progressions...\n');
        
        // Aug 1 → Aug 2 backwards progressions
        const aug1to2 = await findBackwardsProgressions(db, 'aug1_import', 'aug2_import', 'Aug1→Aug2', progressionOrder);
        
        // Aug 2 → Aug 3 backwards progressions
        const aug2to3 = await findBackwardsProgressions(db, 'aug2_import', 'aug3_import', 'Aug2→Aug3', progressionOrder);
        
        // Aug 3 → Aug 4 backwards progressions
        const aug3to4 = await findBackwardsProgressions(db, 'aug3_import', 'aug4_import', 'Aug3→Aug4', progressionOrder);
        
        // Aug 4 → Aug 5 backwards progressions
        const aug4to5 = await findBackwardsProgressions(db, 'aug4_import', 'aug5_import', 'Aug4→Aug5', progressionOrder);
        
        // 4. Insert findings into tracking table
        const allBackwards = [...aug1to2, ...aug2to3, ...aug3to4, ...aug4to5];
        
        if (allBackwards.length > 0) {
            console.log(`\n📝 Recording ${allBackwards.length} backwards progressions...\n`);
            
            for (const progression of allBackwards) {
                // Escape single quotes in strings
                const escape = (str) => str ? str.replace(/'/g, "''") : null;
                
                await db.run(`
                    INSERT INTO backwards_progressions (
                        property_id, pole_number, drop_number, address,
                        old_status, new_status, old_status_order, new_status_order,
                        agent_name, source_file, comparison_period
                    ) VALUES (
                        ${Number(progression.property_id)},
                        ${progression.pole_number ? `'${escape(progression.pole_number)}'` : 'NULL'},
                        ${progression.drop_number ? `'${escape(progression.drop_number)}'` : 'NULL'},
                        ${progression.address ? `'${escape(progression.address)}'` : 'NULL'},
                        '${escape(progression.old_status)}',
                        '${escape(progression.new_status)}',
                        ${progression.old_order},
                        ${progression.new_order},
                        ${progression.agent ? `'${escape(progression.agent)}'` : 'NULL'},
                        '${escape(progression.source_file)}',
                        '${escape(progression.period)}'
                    )
                `);
            }
        }
        
        // 5. Generate comprehensive report
        console.log('📊 Generating backwards progression report...\n');
        
        const reportData = await db.all(`
            SELECT 
                property_id,
                pole_number,
                drop_number,
                address,
                old_status,
                new_status,
                old_status_order,
                new_status_order,
                agent_name,
                comparison_period,
                date_detected
            FROM backwards_progressions
            ORDER BY date_detected DESC, property_id
        `);
        
        // Create markdown report
        let report = `# Backwards Status Progression Report
**Generated**: ${new Date().toISOString()}  
**System**: DuckDB Status Tracking  
**Total Incidents**: ${reportData.length}

## Overview

This report tracks all instances where a property's status moved backwards in the installation workflow. These represent potential data quality issues, process violations, or system errors that require investigation.

## Status Progression Order

The expected workflow progression is:
1. Pole Permission: Pending
2. Pole Permission: Approved/Declined
3. Home Sign Ups: Pending
4. Home Sign Ups: Approved/Declined
5. Home Sign Ups: Approved & Installation Scheduled/Re-scheduled
6. Home Installation: In Progress
7. Home Installation: Installed

## Backwards Progressions Detected

`;
        
        if (reportData.length === 0) {
            report += '*No backwards progressions detected.*\n';
        } else {
            // Group by comparison period
            const byPeriod = {};
            reportData.forEach(row => {
                const period = row.comparison_period;
                if (!byPeriod[period]) byPeriod[period] = [];
                byPeriod[period].push(row);
            });
            
            for (const [period, incidents] of Object.entries(byPeriod)) {
                report += `### ${period}\n\n`;
                report += `| Property ID | Pole Number | Old Status | New Status | Agent | Address |\n`;
                report += `|-------------|-------------|------------|-----------|--------|----------|\n`;
                
                incidents.forEach(inc => {
                    const oldStatus = inc.old_status ? (inc.old_status.length > 25 ? inc.old_status.substring(0, 25) + '...' : inc.old_status) : 'N/A';
                    const newStatus = inc.new_status ? (inc.new_status.length > 25 ? inc.new_status.substring(0, 25) + '...' : inc.new_status) : 'N/A';
                    const address = inc.address ? (inc.address.length > 30 ? inc.address.substring(0, 30) + '...' : inc.address) : 'N/A';
                    report += `| ${inc.property_id} | ${inc.pole_number || 'N/A'} | ${oldStatus} | ${newStatus} | ${inc.agent_name || 'Unknown'} | ${address} |\n`;
                });
                report += '\n';
            }
            
            // Add detailed analysis
            report += `## Detailed Analysis\n\n`;
            
            reportData.forEach((inc, idx) => {
                report += `### ${idx + 1}. Property ${inc.property_id}\n`;
                report += `- **Pole**: ${inc.pole_number || 'Not assigned'}\n`;
                report += `- **Drop**: ${inc.drop_number || 'Not assigned'}\n`;
                report += `- **Address**: ${inc.address || 'Not available'}\n`;
                report += `- **Status Change**: ${inc.old_status} (Step ${inc.old_status_order}) → ${inc.new_status} (Step ${inc.new_status_order})\n`;
                report += `- **Agent**: ${inc.agent_name || 'Unknown'}\n`;
                report += `- **Period**: ${inc.comparison_period}\n`;
                report += `- **Impact**: Moved back ${inc.old_status_order - inc.new_status_order} steps in workflow\n\n`;
            });
            
            // Add summary statistics
            const stats = await db.all(`
                SELECT 
                    comparison_period,
                    COUNT(*) as count,
                    COUNT(DISTINCT property_id) as unique_properties,
                    COUNT(DISTINCT pole_number) as poles_affected
                FROM backwards_progressions
                GROUP BY comparison_period
            `);
            
            report += `## Summary Statistics\n\n`;
            report += `| Period | Incidents | Properties | Poles Affected |\n`;
            report += `|--------|-----------|------------|----------------|\n`;
            stats.forEach(stat => {
                report += `| ${stat.comparison_period} | ${stat.count} | ${stat.unique_properties} | ${stat.poles_affected || 0} |\n`;
            });
            
            // Add recommendations
            report += `\n## Recommendations\n\n`;
            report += `1. **Immediate Investigation Required** for all properties listed above\n`;
            report += `2. **Contact Field Teams** to verify actual status of affected properties\n`;
            report += `3. **Review Agent Training** for agents involved in backwards progressions\n`;
            report += `4. **Implement System Validation** to prevent backwards status changes\n`;
            report += `5. **Daily Monitoring** of this report to catch issues early\n`;
        }
        
        // Save report
        const reportPath = path.join(__dirname, '../reports/BACKWARDS_PROGRESSIONS_TRACKING.md');
        fs.writeFileSync(reportPath, report);
        console.log(`✅ Report saved to: ${reportPath}\n`);
        
        // Show summary
        console.log('📊 Summary:');
        console.log(`- Total backwards progressions tracked: ${reportData.length}`);
        if (reportData.length > 0) {
            const uniqueProps = new Set(reportData.map(r => r.property_id)).size;
            const polesAffected = reportData.filter(r => r.pole_number).length;
            console.log(`- Unique properties affected: ${uniqueProps}`);
            console.log(`- Properties with pole numbers: ${polesAffected}`);
        }
        
        // Query the table to verify
        console.log('\n📋 Database table contents:');
        const tableContents = await db.all(`
            SELECT COUNT(*) as total_records,
                   COUNT(DISTINCT property_id) as unique_properties,
                   COUNT(DISTINCT pole_number) as unique_poles
            FROM backwards_progressions
        `);
        console.table(tableContents);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await db.close();
    }
}

async function findBackwardsProgressions(db, table1, table2, period, orderMap) {
    const results = await db.all(`
        WITH t1_latest AS (
            SELECT DISTINCT ON ("Property ID")
                "Property ID" as property_id,
                "Status" as status,
                "Pole Number" as pole_number,
                "Drop Number" as drop_number,
                "Location Address" as address,
                COALESCE(
                    "Field Agent Name (pole permission)",
                    "Field Agent Name (Home Sign Ups)",
                    "Installer Name"
                ) as agent
            FROM ${table1}
            WHERE "Property ID" IS NOT NULL
            ORDER BY "Property ID", "date_status_changed" DESC NULLS LAST
        ),
        t2_latest AS (
            SELECT DISTINCT ON ("Property ID")
                "Property ID" as property_id,
                "Status" as status,
                "Pole Number" as pole_number,
                "Drop Number" as drop_number,
                "Location Address" as address,
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
            t2.drop_number,
            t2.address,
            t2.agent
        FROM t2_latest t2
        INNER JOIN t1_latest t1 ON t2.property_id = t1.property_id
        WHERE t1.status != t2.status
    `);
    
    // Filter for backwards progressions
    const backwards = results.filter(row => {
        const oldOrder = orderMap[row.old_status] || 0;
        const newOrder = orderMap[row.new_status] || 0;
        return oldOrder > newOrder && oldOrder > 0 && newOrder > 0;
    }).map(row => ({
        ...row,
        old_order: orderMap[row.old_status] || 0,
        new_order: orderMap[row.new_status] || 0,
        period: period,
        source_file: `${table1} vs ${table2}`
    }));
    
    console.log(`Found ${backwards.length} backwards progressions in ${period}`);
    
    return backwards;
}

// Run the tracking system
trackBackwardsProgressions().catch(console.error);