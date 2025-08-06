#!/usr/bin/env node

/**
 * Batch Import Script
 * Import multiple Excel files from a directory
 */

const fs = require('fs');
const path = require('path');
const Database = require('../src/database');
const ExcelImporter = require('../src/excel-importer');
const chalk = require('chalk');
const ora = require('ora');

async function batchImport(directory) {
  const db = await new Database();
  await db.initialize();
  
  const importer = new ExcelImporter(db);
  
  // Find all Excel files
  const files = fs.readdirSync(directory)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
    .map(f => path.join(directory, f));
  
  console.log(chalk.cyan(`Found ${files.length} Excel files to import`));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    console.log(chalk.blue(`\nImporting: ${path.basename(file)}`));
    
    try {
      await importer.importExcelFile(file);
      successCount++;
    } catch (error) {
      console.error(chalk.red(`Failed: ${error.message}`));
      errorCount++;
    }
  }
  
  // Show final summary
  console.log(chalk.green('\n=== Batch Import Complete ==='));
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  
  const stats = await db.getStats();
  console.log(`\nTotal Records: ${stats.totalRecords.count}`);
  console.log(`Unique Poles: ${stats.uniquePoles.count}`);
  console.log(`Unique Drops: ${stats.uniqueDrops.count}`);
  
  await db.close();
}

// Check command line arguments
const directory = process.argv[2] || '../data/excel';

if (!fs.existsSync(directory)) {
  console.error(chalk.red(`Directory not found: ${directory}`));
  process.exit(1);
}

// Run batch import
batchImport(directory).catch(console.error);