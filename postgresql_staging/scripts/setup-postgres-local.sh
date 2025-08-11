#!/bin/bash

# Setup PostgreSQL Local Database for OneMap Lawley Import
# This script creates the database and applies the schema

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DB_NAME="fibreflow_staging"
DB_USER="postgres"
DB_PORT=5433

echo -e "${BLUE}=== PostgreSQL Local Database Setup ===${NC}"
echo ""

# Check if PostgreSQL is running
echo -e "${YELLOW}Checking PostgreSQL status...${NC}"
if ! pg-status >/dev/null 2>&1; then
    echo -e "${YELLOW}PostgreSQL not running. Starting it...${NC}"
    pg-start
    sleep 3
fi

# Test connection
echo -e "${YELLOW}Testing PostgreSQL connection...${NC}"
if ! psql -p $DB_PORT -U $DB_USER -d postgres -c "SELECT version();" >/dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to PostgreSQL${NC}"
    echo "Make sure PostgreSQL is running on port $DB_PORT"
    echo "Try: pg-start"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL connection successful${NC}"

# Create database if it doesn't exist
echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
psql -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
    echo -e "${YELLOW}Database '$DB_NAME' already exists${NC}"
}

# Apply schema
echo -e "${YELLOW}Applying Lawley project schema...${NC}"
SCHEMA_FILE="config/lawley-schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found: $SCHEMA_FILE${NC}"
    exit 1
fi

if psql -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCHEMA_FILE"; then
    echo -e "${GREEN}✓ Schema applied successfully${NC}"
else
    echo -e "${RED}❌ Failed to apply schema${NC}"
    exit 1
fi

# Install Node.js dependencies for import scripts
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
if [ -f "package.json" ]; then
    npm install
else
    echo -e "${YELLOW}Creating package.json and installing dependencies...${NC}"
    cat > package.json << EOF
{
  "name": "postgresql-staging",
  "version": "1.0.0",
  "description": "PostgreSQL staging environment for OneMap data",
  "main": "index.js",
  "scripts": {
    "import": "node scripts/import-lawley-excel.js",
    "validate": "node scripts/validate-data.js",
    "status": "node scripts/check-status.js"
  },
  "dependencies": {
    "pg": "^8.11.0",
    "xlsx": "^0.18.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0"
  }
}
EOF

    npm install
fi

# Test the setup
echo -e "${YELLOW}Testing database setup...${NC}"

# Check if tables were created
TABLES_COUNT=$(psql -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
TABLES_COUNT=$(echo $TABLES_COUNT | tr -d ' ')

echo -e "${GREEN}✓ Created $TABLES_COUNT tables${NC}"

# List all tables
echo -e "${YELLOW}Database tables:${NC}"
psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt"

# Check views
echo -e "${YELLOW}Database views:${NC}"
psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dv"

# Create a quick test script
echo -e "${YELLOW}Creating quick test script...${NC}"
cat > scripts/test-connection.js << 'EOF'
const { Pool } = require('pg');
const config = require('../config/database.json');

async function testConnection() {
    const pool = new Pool(config.postgres);
    
    try {
        console.log('🔌 Testing PostgreSQL connection...');
        
        // Test basic connection
        const client = await pool.connect();
        const result = await client.query('SELECT version();');
        console.log('✓ PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
        client.release();
        
        // Test our tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('✓ Available tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   • ${row.table_name}`);
        });
        
        // Test our views
        const viewsResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        if (viewsResult.rows.length > 0) {
            console.log('✓ Available views:');
            viewsResult.rows.forEach(row => {
                console.log(`   • ${row.table_name}`);
            });
        }
        
        console.log('🎉 Database setup is working correctly!');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testConnection();
EOF

# Run the test
echo -e "${YELLOW}Running connection test...${NC}"
node scripts/test-connection.js

echo ""
echo -e "${GREEN}🎉 PostgreSQL setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 What's Next:${NC}"
echo "  1. Import your Excel data:"
echo "     ${YELLOW}node scripts/import-lawley-excel.js ~/Downloads/1754473447790_Lawley_01082025.xlsx${NC}"
echo ""
echo "  2. Check import status:"
echo "     ${YELLOW}psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT * FROM onemap_import_batches ORDER BY import_started DESC LIMIT 5;\"${NC}"
echo ""
echo "  3. View imported data:"
echo "     ${YELLOW}psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT COUNT(*) FROM onemap_lawley_raw;\"${NC}"
echo ""
echo "  4. Check status changes:"
echo "     ${YELLOW}psql -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT * FROM onemap_status_history ORDER BY change_date DESC LIMIT 10;\"${NC}"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "  • Start PostgreSQL:  ${GREEN}pg-start${NC}"
echo "  • Stop PostgreSQL:   ${GREEN}pg-stop${NC}"
echo "  • Connect to DB:     ${GREEN}psql -p $DB_PORT -U $DB_USER -d $DB_NAME${NC}"
echo "  • Test connection:   ${GREEN}node scripts/test-connection.js${NC}"
echo ""