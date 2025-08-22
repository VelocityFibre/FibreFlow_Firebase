#!/usr/bin/env node

/**
 * Test script to verify Neon database and Gemini AI connections
 */

const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'config', '.env') });

async function testNeonConnection() {
  const spinner = ora('Testing Neon database connection...').start();
  
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    spinner.succeed(chalk.green('✓ Neon database connection successful'));
    
    console.log(chalk.blue('  Database time:'), result.rows[0].current_time);
    console.log(chalk.blue('  PostgreSQL version:'), result.rows[0].db_version.split(' ')[1]);
    
    // Test table access
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tables = await pool.query(tablesQuery);
    
    console.log(chalk.blue('\n  Available tables:'));
    tables.rows.forEach(row => {
      console.log(chalk.gray('    -'), row.table_name);
    });
    
    // Test record counts
    const countQuery = `
      SELECT 
        (SELECT COUNT(*) FROM onemap_status_changes) as status_changes,
        (SELECT COUNT(*) FROM sow_poles) as poles,
        (SELECT COUNT(*) FROM sow_drops) as drops,
        (SELECT COUNT(*) FROM import_batches) as imports
    `;
    const counts = await pool.query(countQuery);
    
    console.log(chalk.blue('\n  Record counts:'));
    console.log(chalk.gray('    - Status changes:'), counts.rows[0].status_changes);
    console.log(chalk.gray('    - Poles:'), counts.rows[0].poles);
    console.log(chalk.gray('    - Drops:'), counts.rows[0].drops);
    console.log(chalk.gray('    - Import batches:'), counts.rows[0].imports);
    
    await pool.end();
    return true;
  } catch (error) {
    spinner.fail(chalk.red('✗ Neon database connection failed'));
    console.error(chalk.red('  Error:'), error.message);
    
    if (error.message.includes('password')) {
      console.log(chalk.yellow('\n  Hint: Check your NEON_DATABASE_URL in config/.env'));
      console.log(chalk.yellow('  Make sure the password is URL-encoded if it contains special characters'));
    }
    
    await pool.end();
    return false;
  }
}

async function testGeminiConnection() {
  const spinner = ora('Testing Gemini AI connection...').start();
  
  if (!process.env.GEMINI_API_KEY) {
    spinner.fail(chalk.red('✗ Gemini API key not found'));
    console.log(chalk.yellow('  Please set GEMINI_API_KEY in config/.env'));
    return false;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // Test with a simple prompt
    const result = await model.generateContent('Say "Hello from Gemini!" and nothing else.');
    const response = await result.response;
    const text = response.text();
    
    spinner.succeed(chalk.green('✓ Gemini AI connection successful'));
    console.log(chalk.blue('  Response:'), text.trim());
    
    // Get model info
    console.log(chalk.blue('  Model:'), 'gemini-1.5-pro');
    console.log(chalk.blue('  Context window:'), '1M tokens');
    
    return true;
  } catch (error) {
    spinner.fail(chalk.red('✗ Gemini AI connection failed'));
    console.error(chalk.red('  Error:'), error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log(chalk.yellow('\n  Hint: Your API key appears to be invalid'));
      console.log(chalk.yellow('  Get a new key from: https://aistudio.google.com/apikey'));
    }
    
    return false;
  }
}

async function testSampleQuery() {
  console.log(chalk.cyan('\n📊 Testing sample query...'));
  
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // Generate SQL for a simple question
    const prompt = `Convert this to PostgreSQL: "Count total poles in the system"
    
    Tables available: sow_poles (id, pole_number, status)
    
    Return only the SQL query.`;
    
    const result = await model.generateContent(prompt);
    const sql = result.response.text().trim();
    
    console.log(chalk.blue('  Generated SQL:'), sql);
    
    // Execute the query
    const queryResult = await pool.query(sql);
    console.log(chalk.green('  Result:'), queryResult.rows[0]);
    
    await pool.end();
    return true;
  } catch (error) {
    console.error(chalk.red('  Sample query failed:'), error.message);
    await pool.end();
    return false;
  }
}

async function main() {
  console.log(chalk.bold.cyan('\n🔧 Neon + Gemini Agent Connection Test\n'));
  
  const neonOk = await testNeonConnection();
  console.log();
  const geminiOk = await testGeminiConnection();
  
  if (neonOk && geminiOk) {
    await testSampleQuery();
    console.log(chalk.bold.green('\n✅ All connections successful! The agent is ready to use.\n'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red('\n❌ Some connections failed. Please check your configuration.\n'));
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});