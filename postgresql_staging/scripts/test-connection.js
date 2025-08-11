const { Client } = require('pg');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Try to load config
let config;
const configPath = path.join(__dirname, '..', 'config', 'database.json');

if (fs.existsSync(configPath)) {
  config = require(configPath).postgres;
} else {
  // Default config
  config = {
    host: 'localhost',
    port: 5433,
    database: 'fibreflow_staging',
    user: 'postgres',
    password: ''
  };
}

async function testConnection() {
  const client = new Client(config);
  
  console.log(chalk.yellow('Testing PostgreSQL connection...'));
  console.log(chalk.gray(`Host: ${config.host}:${config.port}`));
  console.log(chalk.gray(`Database: ${config.database}`));
  console.log(chalk.gray(`User: ${config.user}`));
  
  try {
    await client.connect();
    console.log(chalk.green('✓ Connected successfully!'));
    
    // Test query
    const result = await client.query('SELECT version()');
    console.log(chalk.gray(`PostgreSQL ${result.rows[0].version.split(' ')[1]}`));
    
    // Check tables
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    if (tables.rows.length > 0) {
      console.log(chalk.green(`\n✓ Found ${tables.rows.length} tables:`));
      tables.rows.forEach(row => {
        console.log(`  - ${row.tablename}`);
      });
    } else {
      console.log(chalk.yellow('\n⚠ No tables found. Run setup script first.'));
    }
    
    await client.end();
    
  } catch (error) {
    console.error(chalk.red('✗ Connection failed:'), error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow('\nIs PostgreSQL running?'));
      console.log('Start with: sudo systemctl start postgresql');
    } else if (error.code === '28P01') {
      console.log(chalk.yellow('\nAuthentication failed.'));
      console.log('Run setup script: ./scripts/setup-postgres.sh');
    }
    
    process.exit(1);
  }
}

testConnection();