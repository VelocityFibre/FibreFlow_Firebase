#!/usr/bin/env node

const XLSX = require('xlsx');
const Database = require('duckdb-async').Database;
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');
const AUG3_FILE = path.join(__dirname, '../data/1754473671995_Lawley_03082025.xlsx');

async function trackAug3Changes() {
    console.log('🔍 OneMap Status Change Tracking: August 2 → August 3\n');
    console.log('=' .repeat(80));
    console.log('Processing August 3 file to track status changes from August 2...\n');
    
    const startTime = Date.now();
    const db = await Database.create(DB_PATH);
    
    try {
        // 1. Load August 3 Excel file
        console.log('📖 Loading August 3 Excel file...');
        console.log(`📄 File: ${AUG3_FILE}`);
        const workbook3 = XLSX.readFile(AUG3_FILE);
        const worksheet3 = workbook3.Sheets[workbook3.SheetNames[0]];
        const aug3Data = XLSX.utils.sheet_to_json(worksheet3, { raw: false, dateNF: 'yyyy-mm-dd', defval: null });
        
        console.log(`✅ Loaded ${aug3Data.length} records from August 3\n`);
        
        // Convert to CSV for import
        const csvContent3 = XLSX.utils.sheet_to_csv(worksheet3);
        const tempCsvPath3 = path.join(__dirname, '../data/temp_aug3.csv');
        fs.writeFileSync(tempCsvPath3, csvContent3);
        
        // Import August 3 data
        console.log('📥 Importing August 3 data to DuckDB...');
        await db.run(`
            CREATE OR REPLACE TABLE aug3_import AS 
            SELECT * FROM read_csv_auto('${tempCsvPath3}', header=true)
        `);
        fs.unlinkSync(tempCsvPath3);
        console.log('✅ Import complete\n');
        
        // 2. Basic statistics
        console.log('📊 Data Overview:\n');
        
        const overview = await db.all(`
            SELECT 
                'August 1' as date,
                COUNT(*) as records,
                COUNT(DISTINCT "Property ID") as unique_properties
            FROM aug1_import
            UNION ALL
            SELECT 
                'August 2' as date,
                COUNT(*) as records,
                COUNT(DISTINCT "Property ID") as unique_properties
            FROM aug2_import
            UNION ALL
            SELECT 
                'August 3' as date,
                COUNT(*) as records,
                COUNT(DISTINCT "Property ID") as unique_properties
            FROM aug3_import
        `);
        
        console.table(overview.map(row => ({
            Date: row.date,
            Records: Number(row.records),
            'Unique Properties': Number(row.unique_properties)
        })));
        
        // 3. Find new properties in August 3
        const newInAug3 = await db.all(`
            SELECT COUNT(DISTINCT a3."Property ID") as count
            FROM aug3_import a3
            LEFT JOIN aug2_import a2 ON a3."Property ID" = a2."Property ID"
            WHERE a2."Property ID" IS NULL
        `);
        console.log(`\n🆕 New properties in August 3: ${newInAug3[0].count}\n`);
        
        // 4. Track status changes from Aug 2 to Aug 3
        console.log('🔄 Analyzing Status Changes (Aug 2 → Aug 3):\n');
        
        const statusChanges = await db.all(`
            WITH aug2_latest AS (
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
            ),
            aug3_latest AS (
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
                FROM aug3_import
                WHERE "Property ID" IS NOT NULL
                ORDER BY "Property ID", "date_status_changed" DESC NULLS LAST
            )
            SELECT 
                a3."Property ID" as property_id,
                a2.status as old_status,
                a3.status as new_status,
                a2.status_date as old_date,
                a3.status_date as new_date,
                a3.agent as agent,
                a3."Pole Number" as pole_number,
                a3."Drop Number" as drop_number,
                SUBSTRING(a3."Location Address", 1, 50) as address_short
            FROM aug3_latest a3
            INNER JOIN aug2_latest a2 ON a3."Property ID" = a2."Property ID"
            WHERE a2.status != a3.status
               OR (a2.status IS NULL AND a3.status IS NOT NULL)
               OR (a2.status IS NOT NULL AND a3.status IS NULL)
            ORDER BY a3."Property ID"
        `);
        
        console.log(`📈 Total Status Changes Found: ${statusChanges.length}\n`);
        
        if (statusChanges.length > 0) {
            // Group changes by type
            const changeTypes = {};
            statusChanges.forEach(change => {
                const key = `${change.old_status || 'NULL'} → ${change.new_status || 'NULL'}`;
                changeTypes[key] = (changeTypes[key] || 0) + 1;
            });
            
            console.log('📊 Status Change Distribution:');
            const sortedChanges = Object.entries(changeTypes)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            console.table(sortedChanges.map(([change, count]) => ({
                'Status Change': change,
                'Count': count,
                'Percentage': ((count / statusChanges.length) * 100).toFixed(1) + '%'
            })));
            
            // Show samples
            console.log('\n📋 Sample Status Changes:');
            console.table(statusChanges.slice(0, 10).map(change => ({
                'Property': change.property_id,
                'Old Status': change.old_status?.substring(0, 30) || 'NULL',
                'New Status': change.new_status?.substring(0, 30) || 'NULL',
                'Agent': change.agent || 'Unknown',
                'Pole': change.pole_number || 'N/A'
            })));
        }
        
        // 5. Cumulative changes over 3 days
        console.log('\n📈 Cumulative Status Changes Analysis:\n');
        
        const cumulativeChanges = await db.all(`
            WITH property_status_history AS (
                SELECT 
                    "Property ID",
                    'Aug 1' as date,
                    "Status"
                FROM aug1_import
                UNION ALL
                SELECT 
                    "Property ID",
                    'Aug 2' as date,
                    "Status"
                FROM aug2_import
                UNION ALL
                SELECT 
                    "Property ID",
                    'Aug 3' as date,
                    "Status"
                FROM aug3_import
            ),
            status_changes AS (
                SELECT 
                    "Property ID",
                    COUNT(DISTINCT "Status") as status_count,
                    STRING_AGG(DISTINCT "Status", ' → ' ORDER BY date) as status_progression
                FROM property_status_history
                GROUP BY "Property ID"
                HAVING COUNT(DISTINCT "Status") > 1
            )
            SELECT 
                status_count,
                COUNT(*) as property_count
            FROM status_changes
            GROUP BY status_count
            ORDER BY status_count
        `);
        
        console.log('Properties with Multiple Status Changes Over 3 Days:');
        console.table(cumulativeChanges.map(row => ({
            'Number of Different Statuses': Number(row.status_count),
            'Property Count': Number(row.property_count)
        })));
        
        // 6. Anomaly detection
        console.log('\n⚠️  Anomaly Detection:\n');
        
        // Check for backwards progressions
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
            console.log(`🔴 Backwards Progressions: ${backwardsChanges.length}`);
            console.table(backwardsChanges.slice(0, 5).map(change => ({
                'Property': change.property_id,
                'Regression': `${change.old_status} → ${change.new_status}`,
                'Agent': change.agent || 'Unknown'
            })));
        } else {
            console.log('✅ No backwards progressions detected');
        }
        
        // Check for skipped approvals
        const skippedApprovals = statusChanges.filter(change => {
            return (change.old_status?.includes('Declined') && 
                    (change.new_status?.includes('In Progress') || 
                     change.new_status?.includes('Installed')));
        });
        
        if (skippedApprovals.length > 0) {
            console.log(`\n🟡 Skipped Approvals: ${skippedApprovals.length}`);
            console.table(skippedApprovals.map(change => ({
                'Property': change.property_id,
                'Jump': `${change.old_status} → ${change.new_status}`,
                'Agent': change.agent || 'Unknown'
            })));
        } else {
            console.log('\n✅ No skipped approvals detected');
        }
        
        // 7. Daily progression summary
        console.log('\n📊 Daily Status Progression Summary:\n');
        
        const dailyProgression = await db.all(`
            WITH daily_status AS (
                SELECT 
                    'Home Installation: Installed' as status,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug1_import WHERE "Status" = 'Home Installation: Installed') as aug1,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug2_import WHERE "Status" = 'Home Installation: Installed') as aug2,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug3_import WHERE "Status" = 'Home Installation: Installed') as aug3
                UNION ALL
                SELECT 
                    'Home Installation: In Progress' as status,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug1_import WHERE "Status" = 'Home Installation: In Progress') as aug1,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug2_import WHERE "Status" = 'Home Installation: In Progress') as aug2,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug3_import WHERE "Status" = 'Home Installation: In Progress') as aug3
                UNION ALL
                SELECT 
                    'Home Sign Ups: Approved & Installation Scheduled' as status,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug1_import WHERE "Status" = 'Home Sign Ups: Approved & Installation Scheduled') as aug1,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug2_import WHERE "Status" = 'Home Sign Ups: Approved & Installation Scheduled') as aug2,
                    (SELECT COUNT(DISTINCT "Property ID") FROM aug3_import WHERE "Status" = 'Home Sign Ups: Approved & Installation Scheduled') as aug3
            )
            SELECT * FROM daily_status
        `);
        
        console.table(dailyProgression.map(row => ({
            'Status': row.status,
            'Aug 1': Number(row.aug1),
            'Aug 2': Number(row.aug2),
            'Aug 3': Number(row.aug3),
            'Change (Aug2→Aug3)': Number(row.aug3) - Number(row.aug2)
        })));
        
        // 8. Export detailed change log
        if (statusChanges.length > 0) {
            // Create detailed report directory
            const reportDir = path.join(__dirname, '../reports');
            if (!fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, { recursive: true });
            }
            
            // Export to CSV
            const changeLogPath = path.join(reportDir, 'status_changes_aug2_to_aug3.csv');
            const ws = XLSX.utils.json_to_sheet(statusChanges.map(change => ({
                'Property ID': change.property_id,
                'Old Status': change.old_status,
                'New Status': change.new_status,
                'Old Date': change.old_date,
                'New Date': change.new_date,
                'Agent': change.agent,
                'Pole Number': change.pole_number,
                'Drop Number': change.drop_number,
                'Address': change.address_short
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Status Changes');
            XLSX.writeFile(wb, changeLogPath);
            console.log(`\n✅ Detailed change log exported to: ${changeLogPath}`);
        }
        
        // 9. Final summary
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('\n' + '=' .repeat(80));
        console.log('📊 FINAL SUMMARY - August 3 Processing\n');
        console.log(`Processing completed in ${processingTime} seconds\n`);
        
        console.log('Key Metrics:');
        console.log(`- New properties added: ${newInAug3[0].count}`);
        console.log(`- Status changes detected: ${statusChanges.length}`);
        console.log(`- Backwards progressions: ${backwardsChanges.length}`);
        console.log(`- Skipped approvals: ${skippedApprovals.length}`);
        
        // Save summary report
        const summaryReport = {
            date: new Date().toISOString(),
            files: {
                aug1: '1754473447790_Lawley_01082025.xlsx',
                aug2: '1754473537620_Lawley_02082025.xlsx',
                aug3: '1754473671995_Lawley_03082025.xlsx'
            },
            statistics: {
                aug3_records: aug3Data.length,
                new_properties: Number(newInAug3[0].count),
                status_changes: statusChanges.length,
                anomalies: {
                    backwards_progressions: backwardsChanges.length,
                    skipped_approvals: skippedApprovals.length
                }
            },
            processing_time_seconds: parseFloat(processingTime)
        };
        
        const summaryPath = path.join(__dirname, '../reports/august3_processing_summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2));
        console.log(`\n📄 Summary report saved to: ${summaryPath}`);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await db.close();
    }
}

// Run the analysis
trackAug3Changes().catch(console.error);