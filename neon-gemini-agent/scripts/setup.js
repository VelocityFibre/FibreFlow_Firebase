#!/usr/bin/env node

/**
 * Setup script for first-time configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  console.log(chalk.bold.cyan('\n🚀 Neon + Gemini Agent Setup\n'));
  
  // Check if .env already exists
  const envPath = path.join(__dirname, '..', 'config', '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question(chalk.yellow('⚠️  .env file already exists. Overwrite? (y/N): '));
    if (overwrite.toLowerCase() !== 'y') {
      console.log(chalk.blue('Setup cancelled.'));
      process.exit(0);
    }
  }
  
  console.log(chalk.gray('Let\'s configure your connection settings...\n'));
  
  // Get Neon database URL
  console.log(chalk.cyan('1. Neon Database Configuration'));
  console.log(chalk.gray('   Get this from your Neon project dashboard'));
  console.log(chalk.gray('   Format: postgresql://user:pass@host/database?sslmode=require\n'));
  
  const dbUrl = await question('Neon Database URL: ');
  
  // Get Gemini API key
  console.log(chalk.cyan('\n2. Google Gemini AI Configuration'));
  console.log(chalk.gray('   Get this from: https://aistudio.google.com/apikey'));
  console.log(chalk.gray('   Free tier: 50 requests/day\n'));
  
  const geminiKey = await question('Gemini API Key: ');
  
  // Optional settings
  console.log(chalk.cyan('\n3. Optional Settings (press Enter for defaults)'));
  
  const maxConnections = await question('Max DB connections (10): ') || '10';
  const debug = await question('Enable debug mode? (y/N): ');
  
  // Create .env file
  const envContent = `# Neon Database Configuration
NEON_DATABASE_URL=${dbUrl}

# Google Gemini AI Configuration
GEMINI_API_KEY=${geminiKey}

# Connection Pool Settings
DB_MAX_CONNECTIONS=${maxConnections}
DB_IDLE_TIMEOUT_MS=30000

# Gemini Settings
GEMINI_MODEL=gemini-1.5-pro
GEMINI_MAX_TOKENS=8192

# Debug Mode
DEBUG=${debug.toLowerCase() === 'y' ? 'true' : 'false'}
`;
  
  // Write configuration
  fs.writeFileSync(envPath, envContent);
  console.log(chalk.green('\n✅ Configuration saved to config/.env'));
  
  // Test connections
  console.log(chalk.cyan('\n4. Testing connections...'));
  const testScript = path.join(__dirname, '..', 'tests', 'test-connection.js');
  
  rl.close();
  
  // Run test script
  require(testScript);
}

setup().catch(error => {
  console.error(chalk.red('\nSetup error:'), error);
  process.exit(1);
});