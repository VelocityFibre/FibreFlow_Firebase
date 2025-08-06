#!/usr/bin/env node

const Database = require('./src/database');
const chalk = require('chalk');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function checkInstallsWithoutSignups() {
  const db = new Database();
  await db.initialize();
  
  console.log(chalk.cyan('Checking for Home Installations without Home SignUps...\n'));
  
  // First, let's understand the data structure
  console.log(chalk.yellow('Step 1: Analyzing status patterns...'));
  
  // Get all unique statuses
  const allStatuses = await db.all(`
    SELECT DISTINCT status, COUNT(*) as count
    FROM status_changes
    WHERE status LIKE '%Home%'
    GROUP BY status
    ORDER BY status
  `);
  
  console.log('Home-related statuses found:');
  allStatuses.forEach(s => {
    console.log(`  - ${s.status}: ${s.count} records`);
  });
  
  // Find properties with Home Installation but no Sign Up
  console.log(chalk.yellow('\nStep 2: Finding Home Installations without SignUps...'));
  
  const query = `
    WITH home_installs AS (
      SELECT DISTINCT 
        property_id,
        pole_number,
        drop_number,
        status,
        address
      FROM status_changes
      WHERE status IN ('Home Installation: In Progress', 'Home Installation: Installed')
        AND property_id IS NOT NULL
    ),
    home_signups AS (
      SELECT DISTINCT property_id
      FROM status_changes
      WHERE status LIKE 'Home Sign Ups:%'
        AND property_id IS NOT NULL
    )
    SELECT 
      hi.property_id,
      hi.pole_number,
      hi.drop_number,
      hi.status,
      hi.address
    FROM home_installs hi
    LEFT JOIN home_signups hs ON hi.property_id = hs.property_id
    WHERE hs.property_id IS NULL
    ORDER BY hi.pole_number, hi.drop_number
  `;
  
  const results = await db.all(query);
  
  console.log(chalk.green(`\n✓ Found ${results.length} Home Installations without Home SignUps\n`));
  
  if (results.length > 0) {
    // Display first 10 results
    console.log(chalk.cyan('Sample results (first 10):'));
    console.log(chalk.gray('─'.repeat(100)));
    
    results.slice(0, 10).forEach((row, index) => {
      console.log(`${index + 1}. Property: ${row.property_id}`);
      console.log(`   Pole: ${row.pole_number || 'N/A'}`);
      console.log(`   Drop: ${row.drop_number || 'N/A'}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Address: ${row.address || 'N/A'}`);
      console.log('');
    });
    
    // Summary by status
    const summary = await db.all(`
      WITH home_installs AS (
        SELECT DISTINCT 
          property_id,
          status
        FROM status_changes
        WHERE status IN ('Home Installation: In Progress', 'Home Installation: Installed')
          AND property_id IS NOT NULL
      ),
      home_signups AS (
        SELECT DISTINCT property_id
        FROM status_changes
        WHERE status LIKE 'Home Sign Ups:%'
          AND property_id IS NOT NULL
      )
      SELECT 
        hi.status,
        COUNT(*) as count
      FROM home_installs hi
      LEFT JOIN home_signups hs ON hi.property_id = hs.property_id
      WHERE hs.property_id IS NULL
      GROUP BY hi.status
    `);
    
    console.log(chalk.cyan('Summary by Installation Status:'));
    console.log(chalk.gray('─'.repeat(50)));
    summary.forEach(s => {
      console.log(`${s.status}: ${s.count} properties`);
    });
    
    // Export to Excel
    console.log(chalk.yellow('\nExporting full results to Excel...'));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(results);
    XLSX.utils.book_append_sheet(wb, ws, 'Installs Without SignUps');
    
    // Add summary sheet
    const summaryData = [
      ['Summary Report - Home Installations without SignUps'],
      ['Generated:', new Date().toISOString()],
      [''],
      ['Total Properties:', results.length],
      [''],
      ['By Status:'],
      ...summary.map(s => [s.status, s.count])
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    
    const filename = `Lawley_Installs_Without_SignUps_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filepath = path.join(__dirname, '../reports/', filename);
    
    XLSX.writeFile(wb, filepath);
    console.log(chalk.green(`✓ Results exported to: ${filepath}`));
  }
  
  // Additional check: Properties with multiple statuses
  console.log(chalk.yellow('\nStep 3: Checking for properties with conflicting statuses...'));
  
  const conflictingQuery = `
    SELECT 
      property_id,
      GROUP_CONCAT(DISTINCT status, ' | ') as all_statuses,
      COUNT(DISTINCT status) as status_count
    FROM status_changes
    WHERE status LIKE '%Home%'
      AND property_id IS NOT NULL
    GROUP BY property_id
    HAVING status_count > 1
      AND all_statuses LIKE '%Installation%'
      AND all_statuses NOT LIKE '%Sign Up%'
    LIMIT 20
  `;
  
  const conflicts = await db.all(conflictingQuery);
  
  if (conflicts.length > 0) {
    console.log(chalk.red(`\nFound ${conflicts.length} properties with installation but no signup status:`));
    conflicts.forEach((c, i) => {
      console.log(`${i + 1}. Property ${c.property_id}: ${c.all_statuses}`);
    });
  }
  
  await db.close();
}

// Run the check
checkInstallsWithoutSignups().catch(console.error);