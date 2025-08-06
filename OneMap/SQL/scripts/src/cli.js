#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const Database = require('./database');
const ExcelImporter = require('./excel-importer');
const Analytics = require('./analytics');

const program = new Command();

program
  .name('onemap-sql')
  .description('SQLite-based processor for OneMap Excel data')
  .version('1.0.0');

// Initialize database
async function getDatabase() {
  const db = new Database();
  await db.initialize();
  return db;
}

// Import command
program
  .command('import <file>')
  .description('Import Excel file into SQLite database')
  .option('-s, --sheet <name>', 'Specify sheet name to import')
  .option('-c, --clear', 'Clear existing data before import')
  .action(async (file, options) => {
    try {
      const db = await getDatabase();
      const importer = new ExcelImporter(db);
      
      // Check if file exists
      if (!fs.existsSync(file)) {
        console.error(chalk.red(`File not found: ${file}`));
        process.exit(1);
      }
      
      // List available sheets
      const sheets = await importer.listAvailableSheets(file);
      console.log(chalk.cyan('Available sheets:'), sheets.join(', '));
      
      // Clear data if requested
      if (options.clear) {
        const confirm = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'This will delete all existing data. Are you sure?',
          default: false
        }]);
        
        if (confirm.proceed) {
          await db.run('DELETE FROM status_changes');
          await db.run('DELETE FROM import_batches');
          await db.run('DELETE FROM pole_capacity');
          console.log(chalk.yellow('Existing data cleared'));
        }
      }
      
      // Import the file
      await importer.importExcelFile(file, { sheet: options.sheet });
      
      await db.close();
    } catch (error) {
      console.error(chalk.red('Import error:'), error.message);
      process.exit(1);
    }
  });

// Analyze command
program
  .command('analyze')
  .description('Run analytics on imported data')
  .action(async () => {
    try {
      const db = await getDatabase();
      const analytics = new Analytics(db);
      
      // Show menu of analysis options
      const { analysis } = await inquirer.prompt([{
        type: 'list',
        name: 'analysis',
        message: 'Select analysis to run:',
        choices: [
          { name: 'First Approvals by Pole', value: 'first-approvals' },
          { name: 'Agent Performance Summary', value: 'agent-performance' },
          { name: 'Status Distribution', value: 'status-analysis' },
          { name: 'Daily Activity Timeline', value: 'daily-activity' },
          { name: 'Pole Capacity Analysis', value: 'pole-capacity' },
          { name: 'Duplicate Detection', value: 'duplicates' },
          { name: 'Generate Monthly Report', value: 'monthly-report' },
          { name: 'Custom SQL Query', value: 'custom-query' }
        ]
      }]);
      
      let results;
      
      switch (analysis) {
        case 'first-approvals':
          results = await analytics.runFirstApprovals({ limit: 50 });
          analytics.displayTable(results, 'First Approvals by Pole');
          break;
          
        case 'agent-performance':
          results = await analytics.runAgentPerformance({ minPoles: 5 });
          analytics.displayTable(results, 'Agent Performance Summary');
          break;
          
        case 'status-analysis':
          results = await analytics.runStatusAnalysis();
          analytics.displayTable(results, 'Status Distribution');
          break;
          
        case 'daily-activity':
          results = await analytics.runDailyActivity({ limit: 30 });
          analytics.displayTable(results, 'Daily Activity (Last 30 Days)');
          break;
          
        case 'pole-capacity':
          results = await analytics.runPoleCapacityAnalysis();
          analytics.displayTable(results, 'Pole Capacity Analysis');
          break;
          
        case 'duplicates':
          results = await analytics.runDuplicateAnalysis();
          analytics.displayTable(results, 'Duplicate Records');
          break;
          
        case 'monthly-report':
          const { year, month } = await inquirer.prompt([
            {
              type: 'input',
              name: 'year',
              message: 'Enter year (YYYY):',
              default: new Date().getFullYear()
            },
            {
              type: 'input',
              name: 'month',
              message: 'Enter month (1-12):',
              default: new Date().getMonth() + 1
            }
          ]);
          await analytics.generateMonthlyReport(parseInt(year), parseInt(month));
          break;
          
        case 'custom-query':
          const { query } = await inquirer.prompt([{
            type: 'input',
            name: 'query',
            message: 'Enter SQL query:'
          }]);
          results = await analytics.runCustomQuery(query);
          analytics.displayTable(results, 'Query Results');
          break;
      }
      
      // Ask about export
      if (results && results.length > 0) {
        const { doExport } = await inquirer.prompt([{
          type: 'confirm',
          name: 'doExport',
          message: 'Export results?',
          default: false
        }]);
        
        if (doExport) {
          const { format, filename } = await inquirer.prompt([
            {
              type: 'list',
              name: 'format',
              message: 'Export format:',
              choices: ['Excel', 'CSV', 'JSON']
            },
            {
              type: 'input',
              name: 'filename',
              message: 'Filename:',
              default: `export_${Date.now()}`
            }
          ]);
          
          switch (format) {
            case 'Excel':
              await analytics.exportToExcel(results, `${filename}.xlsx`);
              break;
            case 'CSV':
              await analytics.exportToCSV(results, `${filename}.csv`);
              break;
            case 'JSON':
              await analytics.exportToJSON(results, `${filename}.json`);
              break;
          }
        }
      }
      
      await db.close();
    } catch (error) {
      console.error(chalk.red('Analysis error:'), error.message);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show database statistics')
  .action(async () => {
    try {
      const db = await getDatabase();
      const stats = await db.getStats();
      
      console.log(chalk.cyan('\nDatabase Statistics:'));
      console.log(chalk.white('─'.repeat(40)));
      console.log(`Total Records: ${chalk.green(stats.totalRecords.count)}`);
      console.log(`Unique Poles: ${chalk.green(stats.uniquePoles.count)}`);
      console.log(`Unique Drops: ${chalk.green(stats.uniqueDrops.count)}`);
      console.log(`Unique Agents: ${chalk.green(stats.uniqueAgents.count)}`);
      
      if (stats.dateRange.min_date) {
        console.log(`\nDate Range:`);
        console.log(`  From: ${chalk.blue(stats.dateRange.min_date)}`);
        console.log(`  To: ${chalk.blue(stats.dateRange.max_date)}`);
      }
      
      // Show recent imports
      const imports = await db.all(
        `SELECT filename, sheet_name, import_date, processed_rows, status 
         FROM import_batches 
         ORDER BY import_date DESC 
         LIMIT 5`
      );
      
      if (imports.length > 0) {
        console.log(chalk.cyan('\nRecent Imports:'));
        console.log(chalk.white('─'.repeat(40)));
        imports.forEach(imp => {
          console.log(`${chalk.gray(imp.import_date)} - ${imp.filename} (${imp.processed_rows} rows) - ${
            imp.status === 'completed' ? chalk.green(imp.status) : chalk.red(imp.status)
          }`);
        });
      }
      
      await db.close();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Clear command
program
  .command('clear')
  .description('Clear all data from database')
  .action(async () => {
    try {
      const confirm = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: chalk.red('This will delete ALL data. Are you sure?'),
        default: false
      }]);
      
      if (!confirm.proceed) {
        console.log('Operation cancelled');
        return;
      }
      
      const db = await getDatabase();
      await db.run('DELETE FROM status_changes');
      await db.run('DELETE FROM import_batches');
      await db.run('DELETE FROM pole_capacity');
      
      console.log(chalk.green('✓ All data cleared'));
      
      await db.close();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Export schema command
program
  .command('schema')
  .description('Export database schema')
  .action(async () => {
    try {
      const db = await getDatabase();
      
      const tables = ['status_changes', 'import_batches', 'pole_capacity'];
      
      console.log(chalk.cyan('\nDatabase Schema:'));
      console.log(chalk.white('─'.repeat(60)));
      
      for (const table of tables) {
        const info = await db.getTableInfo(table);
        console.log(chalk.yellow(`\nTable: ${table}`));
        info.forEach(col => {
          console.log(`  ${col.name} ${chalk.gray(col.type)} ${col.pk ? chalk.green('PRIMARY KEY') : ''} ${col.notnull ? chalk.red('NOT NULL') : ''}`);
        });
      }
      
      await db.close();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);