#!/usr/bin/env node

const Database = require('duckdb-async').Database;
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

async function detailedVerification() {
    console.log('🔍 DuckDB vs SQL Database Verification\n');
    console.log('=' .repeat(60));
    
    const db = await Database.create(DB_PATH);
    
    try {
        // 1. Basic counts verification
        console.log('\n📊 BASIC COUNT VERIFICATION:\n');
        
        const totalCount = await db.all('SELECT COUNT(*) as count FROM excel_import');
        const totalNum = Number(totalCount[0].count);
        console.log(`Total Records:`);
        console.log(`  DuckDB: ${totalNum}`);
        console.log(`  SQL DB: 13,656`);
        console.log(`  Match: ${totalNum === 13656 ? '✅ VERIFIED' : '❌ MISMATCH'}`);
        
        const homeInstallCount = await db.all(`
            SELECT COUNT(*) as count 
            FROM excel_import 
            WHERE "Status" LIKE '%Home Installation%'
        `);
        const installNum = Number(homeInstallCount[0].count);
        console.log(`\nHome Installation Records:`);
        console.log(`  DuckDB: ${installNum}`);
        console.log(`  SQL DB: 1,750`);
        console.log(`  Match: ${installNum === 1750 ? '✅ VERIFIED' : '❌ MISMATCH'}`);
        
        const homeSignUpCount = await db.all(`
            SELECT COUNT(*) as count 
            FROM excel_import 
            WHERE "Status" LIKE '%Home Sign Up%'
        `);
        const signupNum = Number(homeSignUpCount[0].count);
        console.log(`\nHome SignUp Records:`);
        console.log(`  DuckDB: ${signupNum}`);
        console.log(`  SQL DB: 6,470`);
        console.log(`  Match: ${signupNum === 6470 ? '✅ VERIFIED' : '❌ MISMATCH'}`);
        
        // 2. Key Finding Verification
        console.log('\n' + '=' .repeat(60));
        console.log('\n🎯 KEY FINDING VERIFICATION:\n');
        console.log('Finding: 1,746 properties have "Home Installation" but NO "Home SignUp"\n');
        
        // Method 1: Check current status only
        const installOnlyCount = await db.all(`
            WITH property_current_status AS (
                SELECT DISTINCT "Property ID"
                FROM excel_import
                WHERE "Status" LIKE '%Home Installation%'
            ),
            property_signup_status AS (
                SELECT DISTINCT "Property ID"
                FROM excel_import
                WHERE "Status" LIKE '%Home Sign Up%'
            )
            SELECT COUNT(DISTINCT pcs."Property ID") as count
            FROM property_current_status pcs
            LEFT JOIN property_signup_status pss ON pcs."Property ID" = pss."Property ID"
            WHERE pss."Property ID" IS NULL
        `);
        
        console.log(`Method 1 - Current Status Check:`);
        console.log(`  Properties with Installation but no SignUp: ${Number(installOnlyCount[0].count)}`);
        
        // Method 2: Check Flow Name Groups history
        const flowCheckCount = await db.all(`
            SELECT COUNT(DISTINCT "Property ID") as count
            FROM excel_import
            WHERE "Status" LIKE '%Home Installation%'
            AND ("Flow Name Groups" NOT LIKE '%Home Sign Up%' OR "Flow Name Groups" IS NULL)
        `);
        
        console.log(`\nMethod 2 - Flow History Check:`);
        console.log(`  Properties without SignUp in history: ${Number(flowCheckCount[0].count)}`);
        
        // Get examples with details
        const examples = await db.all(`
            WITH install_properties AS (
                SELECT DISTINCT "Property ID"
                FROM excel_import
                WHERE "Status" LIKE '%Home Installation%'
            ),
            signup_properties AS (
                SELECT DISTINCT "Property ID"
                FROM excel_import
                WHERE "Status" LIKE '%Home Sign Up%'
            )
            SELECT 
                e."Property ID",
                e."Status",
                e."Location Address",
                e."Pole Number",
                e."Drop Number",
                CASE 
                    WHEN e."Flow Name Groups" LIKE '%Home Sign Up%' THEN 'Has SignUp History'
                    ELSE 'No SignUp History'
                END as signup_history
            FROM excel_import e
            INNER JOIN install_properties ip ON e."Property ID" = ip."Property ID"
            LEFT JOIN signup_properties sp ON e."Property ID" = sp."Property ID"
            WHERE sp."Property ID" IS NULL
            AND e."Status" LIKE '%Home Installation%'
            LIMIT 10
        `);
        
        console.log('\n📋 Example Properties (Install but no SignUp):');
        console.table(examples.map(row => ({
            'Property ID': Number(row['Property ID']),
            'Status': row.Status,
            'Address': row['Location Address'],
            'Pole': row['Pole Number'],
            'Drop': row['Drop Number'],
            'SignUp History': row.signup_history
        })));
        
        // 3. Cross-reference validation
        console.log('\n' + '=' .repeat(60));
        console.log('\n✅ FINAL VERIFICATION RESULTS:\n');
        
        const finalCount = Number(installOnlyCount[0].count);
        console.log(`SQL Database Finding: 1,746 properties`);
        console.log(`DuckDB Verification: ${finalCount} properties`);
        console.log(`Difference: ${Math.abs(1746 - finalCount)} properties`);
        console.log(`Match Status: ${Math.abs(1746 - finalCount) < 10 ? '✅ CLOSE MATCH (within tolerance)' : '⚠️  VARIANCE DETECTED'}`);
        
        // Additional insights
        const statusSummary = await db.all(`
            SELECT 
                COUNT(DISTINCT CASE WHEN "Status" LIKE '%Home Installation%' THEN "Property ID" END) as with_installation,
                COUNT(DISTINCT CASE WHEN "Status" LIKE '%Home Sign Up%' THEN "Property ID" END) as with_signup,
                COUNT(DISTINCT "Property ID") as total_properties
            FROM excel_import
        `);
        
        console.log('\n📊 Property Summary:');
        console.log(`  Total Unique Properties: ${Number(statusSummary[0].total_properties)}`);
        console.log(`  Properties with Installation: ${Number(statusSummary[0].with_installation)}`);
        console.log(`  Properties with SignUp: ${Number(statusSummary[0].with_signup)}`);
        console.log(`  Properties with Install ONLY: ${Number(statusSummary[0].with_installation) - Number(statusSummary[0].with_signup)}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.close();
    }
}

// Run verification
detailedVerification().catch(console.error);