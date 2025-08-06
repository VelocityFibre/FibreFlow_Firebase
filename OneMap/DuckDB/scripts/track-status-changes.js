#!/usr/bin/env node

const XLSX = require('xlsx');
const Database = require('duckdb-async').Database;
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');
const AUG1_FILE = path.join(__dirname, '../data/1754473447790_Lawley_01082025.xlsx');
const AUG2_FILE = path.join(__dirname, '../data/1754473537620_Lawley_02082025.xlsx');

async function trackStatusChanges() {
    console.log('🔍 OneMap Status Change Tracking System\n');
    console.log('=' .repeat(80));
    console.log('Processing August 2 file to track status changes from August 1...\n');
    
    const db = await Database.create(DB_PATH);
    
    try {
        // 1. Load August 2 Excel file
        console.log('📖 Loading August 2 Excel file...');
        const workbook2 = XLSX.readFile(AUG2_FILE);
        const worksheet2 = workbook2.Sheets[workbook2.SheetNames[0]];
        const aug2Data = XLSX.utils.sheet_to_json(worksheet2, { raw: false, dateNF: 'yyyy-mm-dd', defval: null });
        
        console.log(`✅ Loaded ${aug2Data.length} records from August 2\n`);
        
        // Convert to CSV for import
        const csvContent2 = XLSX.utils.sheet_to_csv(worksheet2);
        const tempCsvPath2 = path.join(__dirname, '../data/temp_aug2.csv');
        fs.writeFileSync(tempCsvPath2, csvContent2);
        
        // Import August 2 data
        console.log('📥 Importing August 2 data to DuckDB...');
        await db.run(`
            CREATE OR REPLACE TABLE aug2_import AS 
            SELECT * FROM read_csv_auto('${tempCsvPath2}', header=true)
        `);
        fs.unlinkSync(tempCsvPath2);
        
        // Rename the original table to aug1_import for clarity
        await db.run('ALTER TABLE excel_import RENAME TO aug1_import');
        
        // 2. Compare data to find status changes
        console.log('\n🔄 Comparing August 1 and August 2 data...\n');
        
        // Get basic statistics
        const stats = await db.all(`
            WITH comparison AS (
                SELECT 
                    (SELECT COUNT(*) FROM aug1_import) as aug1_count,
                    (SELECT COUNT(*) FROM aug2_import) as aug2_count,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug1_import) as aug1_properties,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug2_import) as aug2_properties
            )
            SELECT * FROM comparison
        `);
        
        console.log('📊 Basic Statistics:');
        console.log(`  August 1: ${stats[0].aug1_count} records (${stats[0].aug1_properties} unique properties)`);
        console.log(`  August 2: ${stats[0].aug2_count} records (${stats[0].aug2_properties} unique properties)`);
        console.log(`  Difference: ${stats[0].aug2_count - stats[0].aug1_count} records\n`);
        
        // Find new properties
        const newProperties = await db.all(`
            SELECT COUNT(DISTINCT a2."Property ID") as count
            FROM aug2_import a2
            LEFT JOIN aug1_import a1 ON a2."Property ID" = a1."Property ID"
            WHERE a1."Property ID" IS NULL
        `);
        console.log(`🆕 New properties in August 2: ${newProperties[0].count}\n`);
        
        // 3. Find status changes
        console.log('🔍 Finding all status changes...\n');
        
        const statusChanges = await db.all(`
            WITH aug1_latest AS (
                SELECT DISTINCT ON ("Property ID")
                    "Property ID",
                    "Status" as status,
                    "date_status_changed" as status_date,
                    "Pole Number",
                    "Drop Number",
                    "Location Address",
                    COALESCE(
                        "Field Agent Name (pole permission)",
                        "Field Agent Name (Home Sign Ups)",
                        "Installer Name"
                    ) as agent
                FROM aug1_import
                WHERE "Property ID" IS NOT NULL
                ORDER BY "Property ID", "date_status_changed" DESC NULLS LAST
            ),
            aug2_latest AS (
                SELECT DISTINCT ON ("Property ID")
                    "Property ID",
                    "Status" as status,
                    "date_status_changed" as status_date,
                    "Pole Number",
                    "Drop Number",
                    "Location Address",
                    COALESCE(
                        "Field Agent Name (pole permission)",
                        "Field Agent Name (Home Sign Ups)",
                        "Installer Name"
                    ) as agent
                FROM aug2_import
                WHERE "Property ID" IS NOT NULL
                ORDER BY "Property ID", "date_status_changed" DESC NULLS LAST
            )
            SELECT 
                a2."Property ID" as property_id,
                a1.status as old_status,
                a2.status as new_status,
                a1.status_date as old_date,
                a2.status_date as new_date,
                a2.agent as agent,
                a2."Pole Number" as pole_number,
                a2."Drop Number" as drop_number,
                a2."Location Address" as address
            FROM aug2_latest a2
            INNER JOIN aug1_latest a1 ON a2."Property ID" = a1."Property ID"
            WHERE a1.status != a2.status
               OR (a1.status IS NULL AND a2.status IS NOT NULL)
               OR (a1.status IS NOT NULL AND a2.status IS NULL)
            ORDER BY a2."Property ID"
        `);
        
        console.log(`📈 Status Changes Found: ${statusChanges.length}\n`);
        
        if (statusChanges.length > 0) {
            // Group changes by type
            const changeTypes = {};
            statusChanges.forEach(change => {
                const key = `${change.old_status || 'NULL'} → ${change.new_status || 'NULL'}`;
                changeTypes[key] = (changeTypes[key] || 0) + 1;
            });
            
            console.log('📊 Status Change Types:');
            Object.entries(changeTypes)
                .sort((a, b) => b[1] - a[1])
                .forEach(([change, count]) => {
                    console.log(`  ${change}: ${count} properties`);
                });
            
            // Show sample changes
            console.log('\n📋 Sample Status Changes (first 10):');
            console.table(statusChanges.slice(0, 10).map(change => ({
                'Property ID': change.property_id,
                'Old Status': change.old_status || 'NULL',
                'New Status': change.new_status || 'NULL',
                'Agent': change.agent || 'Unknown',
                'Pole': change.pole_number,
                'Drop': change.drop_number
            })));
        }
        
        // 4. Check for anomalies
        console.log('\n⚠️  Checking for Status Anomalies...\n');
        
        // Find backwards progressions
        const backwardsChanges = statusChanges.filter(change => {
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
            
            const oldOrder = progressionOrder[change.old_status] || 0;
            const newOrder = progressionOrder[change.new_status] || 0;
            
            return oldOrder > newOrder && oldOrder > 0 && newOrder > 0;
        });
        
        if (backwardsChanges.length > 0) {
            console.log(`🔴 Backwards Status Changes: ${backwardsChanges.length}`);
            console.table(backwardsChanges.slice(0, 5).map(change => ({
                'Property ID': change.property_id,
                'Old Status': change.old_status,
                'New Status': change.new_status,
                'Address': change.address?.substring(0, 50) + '...'
            })));
        }
        
        // Find skipped approvals
        const skippedApprovals = statusChanges.filter(change => {
            return (change.old_status?.includes('Declined') && 
                    change.new_status?.includes('In Progress')) ||
                   (change.old_status?.includes('Declined') && 
                    change.new_status?.includes('Installed'));
        });
        
        if (skippedApprovals.length > 0) {
            console.log(`\n🟡 Skipped Approval Process: ${skippedApprovals.length}`);
            console.table(skippedApprovals.map(change => ({
                'Property ID': change.property_id,
                'Old Status': change.old_status,
                'New Status': change.new_status
            })));
        }
        
        // 5. Check why we might have gotten 0 changes before
        console.log('\n🔍 Investigating potential data issues...\n');
        
        // Check if status fields are actually different
        const directComparison = await db.all(`
            SELECT 
                a1."Property ID",
                a1."Status" as aug1_status,
                a2."Status" as aug2_status,
                CASE WHEN a1."Status" = a2."Status" THEN 'Same' ELSE 'Different' END as comparison
            FROM aug1_import a1
            INNER JOIN aug2_import a2 ON a1."Property ID" = a2."Property ID"
            WHERE a1."Status" != a2."Status"
            LIMIT 20
        `);
        
        if (directComparison.length === 0) {
            console.log('❗ No direct status differences found when comparing Property IDs');
            console.log('This might explain why the system reported 0 status changes.');
            console.log('\nChecking for data quality issues...');
            
            // Check for duplicates
            const duplicateCheck = await db.all(`
                SELECT 
                    "Property ID",
                    COUNT(*) as count
                FROM aug2_import
                GROUP BY "Property ID"
                HAVING COUNT(*) > 1
                LIMIT 10
            `);
            
            if (duplicateCheck.length > 0) {
                console.log(`\n⚠️  Found ${duplicateCheck.length} properties with duplicates in August 2`);
            }
        } else {
            console.log(`\n✅ Found ${directComparison.length} direct status differences`);
        }
        
        // 6. Generate summary report
        console.log('\n' + '=' .repeat(80));
        console.log('📊 FINAL STATUS CHANGE REPORT\n');
        
        console.log('Summary:');
        console.log(`- Total records in August 2: ${stats[0].aug2_count}`);
        console.log(`- New properties added: ${newProperties[0].count}`);
        console.log(`- Status changes detected: ${statusChanges.length}`);
        console.log(`- Backwards progressions: ${backwardsChanges.length}`);
        console.log(`- Skipped approvals: ${skippedApprovals.length}`);
        
        // Export detailed change log
        if (statusChanges.length > 0) {
            const changeLogPath = path.join(__dirname, '../reports/status_changes_aug1_to_aug2.csv');
            const ws = XLSX.utils.json_to_sheet(statusChanges);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Status Changes');
            XLSX.writeFile(wb, changeLogPath);
            console.log(`\n✅ Detailed change log exported to: ${changeLogPath}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await db.close();
    }
}

// Run the analysis
trackStatusChanges().catch(console.error);