#!/usr/bin/env node

const XLSX = require('xlsx');
const Database = require('duckdb-async').Database;
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');
const AUG3_FILE = path.join(__dirname, '../data/1754473671995_Lawley_03082025.xlsx');

async function analyzeAug3() {
    console.log('📊 OneMap August 3 Analysis\n');
    console.log('=' .repeat(80));
    
    const db = await Database.create(DB_PATH);
    
    try {
        // Import August 3
        console.log('📥 Loading August 3 data...');
        const workbook = XLSX.readFile(AUG3_FILE);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        const tempCsv = path.join(__dirname, '../data/temp_aug3.csv');
        fs.writeFileSync(tempCsv, csvContent);
        
        await db.run(`
            CREATE OR REPLACE TABLE aug3_import AS 
            SELECT * FROM read_csv_auto('${tempCsv}', header=true)
        `);
        fs.unlinkSync(tempCsv);
        
        // Get overview
        const stats = await db.all(`
            SELECT 
                (SELECT COUNT(*) FROM aug1_import) as aug1_count,
                (SELECT COUNT(*) FROM aug2_import) as aug2_count,
                (SELECT COUNT(*) FROM aug3_import) as aug3_count,
                (SELECT COUNT(DISTINCT "Property ID") FROM aug3_import) as aug3_unique
        `);
        
        console.log('\n📈 Record Counts:');
        console.log(`  August 1: ${stats[0].aug1_count}`);
        console.log(`  August 2: ${stats[0].aug2_count}`);
        console.log(`  August 3: ${stats[0].aug3_count} (${stats[0].aug3_unique} unique properties)\n`);
        
        // New properties
        const newProps = await db.all(`
            SELECT COUNT(DISTINCT a3."Property ID") as count
            FROM aug3_import a3
            LEFT JOIN aug2_import a2 ON a3."Property ID" = a2."Property ID"
            WHERE a2."Property ID" IS NULL
        `);
        console.log(`🆕 New Properties in Aug 3: ${newProps[0].count}\n`);
        
        // Status changes
        console.log('🔄 Status Changes (Aug 2 → Aug 3):\n');
        
        const changes = await db.all(`
            WITH aug2_status AS (
                SELECT DISTINCT ON ("Property ID")
                    "Property ID",
                    "Status",
                    "date_status_changed",
                    "Pole Number",
                    COALESCE(
                        "Field Agent Name (pole permission)",
                        "Field Agent Name (Home Sign Ups)",
                        "Installer Name"
                    ) as agent
                FROM aug2_import
                ORDER BY "Property ID", "date_status_changed" DESC NULLS LAST
            ),
            aug3_status AS (
                SELECT DISTINCT ON ("Property ID")
                    "Property ID",
                    "Status",
                    "date_status_changed",
                    "Pole Number",
                    COALESCE(
                        "Field Agent Name (pole permission)",
                        "Field Agent Name (Home Sign Ups)",
                        "Installer Name"
                    ) as agent
                FROM aug3_import
                ORDER BY "Property ID", "date_status_changed" DESC NULLS LAST
            )
            SELECT 
                a3."Property ID" as prop_id,
                a2."Status" as old_status,
                a3."Status" as new_status,
                a3.agent,
                a3."Pole Number" as pole
            FROM aug3_status a3
            INNER JOIN aug2_status a2 ON a3."Property ID" = a2."Property ID"
            WHERE a2."Status" != a3."Status"
        `);
        
        console.log(`Total changes found: ${changes.length}\n`);
        
        if (changes.length > 0) {
            console.log('Details:');
            changes.forEach((change, idx) => {
                console.log(`${idx + 1}. Property ${change.prop_id}:`);
                console.log(`   ${change.old_status} → ${change.new_status}`);
                console.log(`   Agent: ${change.agent || 'Unknown'}, Pole: ${change.pole || 'N/A'}\n`);
            });
        }
        
        // Check anomalies
        const backwards = changes.filter(c => {
            return (c.new_status?.includes('Approved') && c.old_status?.includes('In Progress')) ||
                   (c.new_status?.includes('Scheduled') && c.old_status?.includes('In Progress'));
        });
        
        if (backwards.length > 0) {
            console.log(`⚠️  Backwards Progressions: ${backwards.length}`);
            backwards.forEach(b => {
                console.log(`   Property ${b.prop_id}: ${b.old_status} → ${b.new_status}`);
            });
        }
        
        // Daily progression
        console.log('\n📊 3-Day Status Progression:\n');
        
        const progression = await db.all(`
            SELECT 
                'Installed' as status,
                (SELECT COUNT(*) FROM aug1_import WHERE "Status" LIKE '%Installed%') as day1,
                (SELECT COUNT(*) FROM aug2_import WHERE "Status" LIKE '%Installed%') as day2,
                (SELECT COUNT(*) FROM aug3_import WHERE "Status" LIKE '%Installed%') as day3
            UNION ALL
            SELECT 
                'In Progress' as status,
                (SELECT COUNT(*) FROM aug1_import WHERE "Status" LIKE '%In Progress%') as day1,
                (SELECT COUNT(*) FROM aug2_import WHERE "Status" LIKE '%In Progress%') as day2,
                (SELECT COUNT(*) FROM aug3_import WHERE "Status" LIKE '%In Progress%') as day3
            UNION ALL
            SELECT 
                'Scheduled' as status,
                (SELECT COUNT(*) FROM aug1_import WHERE "Status" LIKE '%Scheduled%') as day1,
                (SELECT COUNT(*) FROM aug2_import WHERE "Status" LIKE '%Scheduled%') as day2,
                (SELECT COUNT(*) FROM aug3_import WHERE "Status" LIKE '%Scheduled%') as day3
        `);
        
        console.table(progression.map(row => ({
            Status: row.status,
            'Aug 1': Number(row.day1),
            'Aug 2': Number(row.day2),
            'Aug 3': Number(row.day3),
            'Daily Change': Number(row.day3) - Number(row.day2)
        })));
        
        // Export changes
        if (changes.length > 0) {
            const reportPath = path.join(__dirname, '../reports/aug3_status_changes.json');
            fs.writeFileSync(reportPath, JSON.stringify(changes, null, 2));
            console.log(`\n📄 Changes exported to: ${reportPath}`);
        }
        
        console.log('\n✅ August 3 Analysis Complete!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.close();
    }
}

analyzeAug3().catch(console.error);