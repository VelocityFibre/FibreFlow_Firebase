#!/usr/bin/env node

const Database = require('./src/database');
const ExcelImporter = require('./src/excel-importer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

async function detectStatusChanges(filename) {
  const filepath = path.join(__dirname, '../data/excel/', filename);
  
  if (!fs.existsSync(filepath)) {
    console.error(chalk.red(`File not found: ${filepath}`));
    process.exit(1);
  }
  
  const db = new Database();
  await db.initialize();
  
  console.log(chalk.cyan('=== COMPREHENSIVE STATUS CHANGE DETECTION ==='));
  console.log(chalk.gray(`File: ${filename}\n`));
  
  // Import August 2 data to temporary table
  console.log(chalk.yellow('1. Loading August 2 data...'));
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS august2_data (
      property_id TEXT PRIMARY KEY,
      pole_number TEXT,
      drop_number TEXT,
      status TEXT,
      status_date DATETIME,
      agent TEXT,
      address TEXT
    )
  `);
  
  await db.run('DELETE FROM august2_data');
  
  const importer = new ExcelImporter(db);
  
  // Override to import to temporary table
  importer.insertRow = async function(row) {
    const fields = ['property_id', 'pole_number', 'drop_number', 'status', 'status_date', 'agent', 'address'];
    const values = fields.map(f => row[f] || null);
    
    await this.db.run(
      `INSERT OR IGNORE INTO august2_data (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
      values
    );
  };
  
  await importer.importExcelFile(filepath, { skipDuplicateCheck: true });
  
  const aug2Count = await db.get('SELECT COUNT(*) as count FROM august2_data');
  console.log(`   Loaded ${aug2Count.count} records from August 2`);
  
  // Get August 1 data stats
  const aug1Count = await db.get('SELECT COUNT(*) as count FROM status_changes');
  console.log(`   Existing records (August 1): ${aug1Count.count}`);
  
  // Find status changes
  console.log(chalk.yellow('\n2. Detecting status changes...'));
  
  const changes = await db.all(`
    SELECT 
      aug2.property_id,
      aug2.pole_number,
      aug2.drop_number,
      aug1.status as old_status,
      aug2.status as new_status,
      aug1.status_date as old_date,
      aug2.status_date as new_date,
      aug2.agent,
      aug2.address
    FROM august2_data aug2
    INNER JOIN status_changes aug1 ON aug2.property_id = aug1.property_id
    WHERE aug1.status != aug2.status
    ORDER BY aug2.property_id
  `);
  
  console.log(chalk.green(`\n   Found ${changes.length} status changes!\n`));
  
  // Categorize changes
  const categories = {
    normal_progression: [],
    status_reverts: [],
    bypassed_approvals: [],
    other_changes: []
  };
  
  const progressionMap = {
    'Pole Permission: Pending': 1,
    'Pole Permission: Approved': 2,
    'Home Sign Ups: Pending': 3,
    'Home Sign Ups: Approved': 4,
    'Home Sign Ups: Approved & Installation Scheduled': 5,
    'Home Installation: In Progress': 6,
    'Home Installation: Installed': 7
  };
  
  changes.forEach(change => {
    const oldLevel = progressionMap[change.old_status] || 0;
    const newLevel = progressionMap[change.new_status] || 0;
    
    if (oldLevel > 0 && newLevel > 0 && newLevel < oldLevel) {
      // Status going backwards
      categories.status_reverts.push(change);
    } else if (change.old_status?.includes('Declined') && change.new_status?.includes('In Progress')) {
      // Bypassed approval
      categories.bypassed_approvals.push(change);
    } else if (newLevel > oldLevel) {
      // Normal progression
      categories.normal_progression.push(change);
    } else {
      categories.other_changes.push(change);
    }
  });
  
  // Display categorized results
  console.log(chalk.green('3. Status Change Summary:'));
  console.log(`   Normal Progression: ${categories.normal_progression.length}`);
  console.log(`   Status Reverts: ${chalk.red(categories.status_reverts.length)} ⚠️`);
  console.log(`   Bypassed Approvals: ${chalk.red(categories.bypassed_approvals.length)} ⚠️`);
  console.log(`   Other Changes: ${categories.other_changes.length}`);
  
  // Show concerning changes
  if (categories.status_reverts.length > 0) {
    console.log(chalk.red('\n⚠️  Status Reverts (Going Backwards):'));
    categories.status_reverts.slice(0, 5).forEach((change, i) => {
      console.log(`${i + 1}. Property ${change.property_id} (${change.pole_number || 'No Pole'})`);
      console.log(`   ${change.old_status} → ${change.new_status}`);
      console.log(`   Agent: ${change.agent || 'Unknown'}`);
      console.log(`   Date: ${change.new_date}\n`);
    });
    if (categories.status_reverts.length > 5) {
      console.log(`   ... and ${categories.status_reverts.length - 5} more\n`);
    }
  }
  
  if (categories.bypassed_approvals.length > 0) {
    console.log(chalk.red('\n⚠️  Bypassed Approvals:'));
    categories.bypassed_approvals.slice(0, 5).forEach((change, i) => {
      console.log(`${i + 1}. Property ${change.property_id} (${change.pole_number || 'No Pole'})`);
      console.log(`   ${change.old_status} → ${change.new_status}`);
      console.log(`   Agent: ${change.agent || 'Unknown'}`);
      console.log(`   Address: ${change.address || 'N/A'}\n`);
    });
  }
  
  // Find new properties
  console.log(chalk.yellow('\n4. New Properties in August 2:'));
  
  const newProperties = await db.all(`
    SELECT COUNT(*) as count
    FROM august2_data aug2
    WHERE NOT EXISTS (
      SELECT 1 FROM status_changes aug1 
      WHERE aug1.property_id = aug2.property_id
    )
  `);
  
  console.log(`   ${newProperties[0].count} new properties added\n`);
  
  // Save results to CSV
  console.log(chalk.yellow('5. Saving results...'));
  
  const csvContent = [
    'Property ID,Pole Number,Drop Number,Old Status,New Status,Change Date,Agent,Address,Category',
    ...changes.map(c => {
      let category = 'normal';
      if (categories.status_reverts.some(r => r.property_id === c.property_id)) category = 'revert';
      else if (categories.bypassed_approvals.some(b => b.property_id === c.property_id)) category = 'bypassed';
      
      return [
        c.property_id,
        c.pole_number || '',
        c.drop_number || '',
        c.old_status || '',
        c.new_status || '',
        c.new_date || '',
        c.agent || '',
        `"${(c.address || '').replace(/"/g, '""')}"`,
        category
      ].join(',');
    })
  ].join('\n');
  
  const outputPath = path.join(__dirname, '../reports/', `status_changes_aug1_to_aug2_${new Date().toISOString().split('T')[0]}.csv`);
  fs.writeFileSync(outputPath, csvContent);
  
  console.log(chalk.green(`   ✓ Saved to: ${outputPath}`));
  
  // Update CLAUDE.md with findings
  const summary = `
## Status Change Analysis: August 1 → August 2

**Analysis Date**: ${new Date().toISOString()}
**File Analyzed**: ${filename}

### Summary
- Total Status Changes: **${changes.length}**
- Normal Progression: ${categories.normal_progression.length}
- Status Reverts: **${categories.status_reverts.length}** ⚠️
- Bypassed Approvals: **${categories.bypassed_approvals.length}** ⚠️
- New Properties: ${newProperties[0].count}

### Critical Findings
${categories.status_reverts.length > 0 ? `
#### Status Reverts (Properties going backwards in process)
${categories.status_reverts.slice(0, 3).map(c => 
  `- Property ${c.property_id}: ${c.old_status} → ${c.new_status}`
).join('\n')}
` : ''}
${categories.bypassed_approvals.length > 0 ? `
#### Bypassed Approvals (Installations without proper approval)
${categories.bypassed_approvals.slice(0, 3).map(c => 
  `- Property ${c.property_id}: ${c.old_status} → ${c.new_status}`
).join('\n')}
` : ''}

### Recommended Actions
1. Investigate all status reverts with field teams
2. Verify bypassed approvals with management
3. Update data collection processes to prevent these issues
`;
  
  console.log(chalk.cyan('\n=== ANALYSIS COMPLETE ==='));
  console.log(summary);
  
  await db.close();
}

// Run detection
const filename = process.argv[2] || '1754473537620_Lawley_02082025.xlsx';
detectStatusChanges(filename).catch(console.error);