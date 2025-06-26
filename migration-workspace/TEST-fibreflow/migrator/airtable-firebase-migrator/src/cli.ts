#!/usr/bin/env node
import { program } from 'commander';
import { config as loadEnv } from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import { AirtableService } from './services/airtable.service';
import { FirebaseService } from './services/firebase.service';
import { TransformationService } from './services/transformation.service';
import { getMapping, migrationOrder } from './config/mappings';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
loadEnv();

program
  .name('airtable-firebase-migrator')
  .description('Migrate data from Airtable to Firebase')
  .version('1.0.0');

program
  .command('migrate [tables...]')
  .description('Migrate specific tables or all tables')
  .option('-b, --batch-size <number>', 'Batch size for processing', '100')
  .option('-d, --dry-run', 'Perform dry run without writing to Firebase')
  .option('-f, --from-date <date>', 'Only migrate records modified after this date')
  .option('-s, --service-account <path>', 'Path to Firebase service account JSON', './service-account.json')
  .action(async (tables, options) => {
    const spinner = ora();
    
    try {
      // Validate environment
      if (!process.env.AIRTABLE_API_KEY) {
        throw new Error('AIRTABLE_API_KEY environment variable is required');
      }
      
      const baseId = process.env.AIRTABLE_BASE_ID || 'appkYMgaK0cHVu4Zg';
      
      // Check service account file
      try {
        await fs.access(options.serviceAccount);
      } catch {
        throw new Error(`Service account file not found: ${options.serviceAccount}`);
      }
      
      // Initialize services
      spinner.start('Initializing services...');
      const airtable = new AirtableService(process.env.AIRTABLE_API_KEY, baseId);
      const firebase = options.dryRun ? null : new FirebaseService(options.serviceAccount);
      const transformer = new TransformationService();
      
      if (firebase) {
        const connected = await firebase.checkConnection();
        if (!connected) {
          throw new Error('Failed to connect to Firebase');
        }
      }
      spinner.succeed('Services initialized');
      
      // Determine tables to migrate
      const tablesToMigrate = tables.length > 0 ? tables : migrationOrder;
      
      console.log(chalk.blue('\nMigration Plan:'));
      console.log(chalk.gray(`Tables to migrate: ${tablesToMigrate.join(', ')}`));
      console.log(chalk.gray(`Batch size: ${options.batchSize}`));
      console.log(chalk.gray(`Dry run: ${options.dryRun ? 'Yes' : 'No'}`));
      if (options.fromDate) {
        console.log(chalk.gray(`Modified after: ${options.fromDate}`));
      }
      console.log();
      
      // Migrate each table
      for (const tableName of tablesToMigrate) {
        const mapping = getMapping(tableName);
        if (!mapping) {
          console.log(chalk.yellow(`⚠ No mapping found for table: ${tableName}, skipping...`));
          continue;
        }
        
        console.log(chalk.blue(`\n📊 Migrating ${tableName}...`));
        spinner.start(`Fetching records from ${mapping.airtableTable}...`);
        
        const records = await airtable.fetchAllRecords(
          mapping.airtableTable,
          {
            pageSize: parseInt(options.batchSize),
            modifiedAfter: options.fromDate ? new Date(options.fromDate) : undefined
          }
        );
        spinner.succeed(`Fetched ${records.length} records from ${mapping.airtableTable}`);
        
        if (records.length === 0) {
          console.log(chalk.gray('No records to migrate'));
          continue;
        }
        
        // Transform records
        spinner.start('Transforming records...');
        const transformed = await transformer.transformBatch(records, mapping);
        spinner.succeed(`Transformed ${transformed.length} records`);
        
        // Write to Firebase
        if (!options.dryRun && firebase) {
          spinner.start(`Writing to Firebase collection: ${mapping.firebaseCollection}...`);
          await firebase.batchWrite(mapping.firebaseCollection, transformed);
          spinner.succeed(`Wrote ${transformed.length} records to Firebase`);
        } else {
          console.log(chalk.gray('Dry run - skipping Firebase write'));
          
          // Save sample output for review
          const samplePath = path.join('output', `${tableName}-sample.json`);
          await fs.mkdir('output', { recursive: true });
          await fs.writeFile(
            samplePath,
            JSON.stringify(transformed.slice(0, 5), null, 2)
          );
          console.log(chalk.gray(`Sample output saved to: ${samplePath}`));
        }
      }
      
      console.log(chalk.green('\n✅ Migration completed successfully!'));
      
    } catch (error) {
      spinner.fail('Migration failed');
      console.error(chalk.red('\nError:'), error);
      process.exit(1);
    }
  });

program
  .command('validate <table>')
  .description('Validate table mapping and show sample transformation')
  .action(async (table) => {
    try {
      const mapping = getMapping(table);
      if (!mapping) {
        console.log(chalk.red(`No mapping found for table: ${table}`));
        process.exit(1);
      }
      
      console.log(chalk.blue(`\nMapping for ${table}:`));
      console.log(chalk.gray(`Airtable table: ${mapping.airtableTable}`));
      console.log(chalk.gray(`Firebase collection: ${mapping.firebaseCollection}`));
      console.log(chalk.gray(`Field mappings: ${mapping.fieldMappings.length}`));
      console.log(chalk.gray(`Relationships: ${mapping.relationships?.length || 0}`));
      
      console.log(chalk.blue('\nField Mappings:'));
      mapping.fieldMappings.forEach(field => {
        console.log(`  ${field.airtableField} → ${field.firebaseField} (${field.dataType})`);
      });
      
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program.parse();