#!/usr/bin/env node

const duckdb = require('duckdb');
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

console.log('🦆 Initializing DuckDB for OneMap data processing...');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory:', dataDir);
}

// Initialize database
const db = new duckdb.Database(DB_PATH);
console.log('✅ Database created/opened at:', DB_PATH);

// Create connection
const conn = db.connect();

// Initialize tables
async function initializeTables() {
    try {
        // Enable Excel extension
        await conn.run("INSTALL excel");
        await conn.run("LOAD excel");
        console.log('✅ Excel extension installed and loaded');

        // Create raw imports table
        await conn.run(`
            CREATE TABLE IF NOT EXISTS raw_imports (
                import_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                property_id VARCHAR,
                address VARCHAR,
                suburb VARCHAR,
                pole_number VARCHAR,
                drop_number VARCHAR,
                status VARCHAR,
                status_date DATE,
                agent VARCHAR,
                notes TEXT,
                date_imported TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                import_batch_id INTEGER,
                file_name VARCHAR,
                row_number INTEGER
            )
        `);
        console.log('✅ Created raw_imports table');

        // Create processed data table with enhanced fields
        await conn.run(`
            CREATE TABLE IF NOT EXISTS processed_data (
                id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                property_id VARCHAR UNIQUE,
                address VARCHAR,
                suburb VARCHAR,
                pole_number VARCHAR,
                drop_number VARCHAR,
                current_status VARCHAR,
                current_status_date DATE,
                first_status VARCHAR,
                first_status_date DATE,
                agent VARCHAR,
                notes TEXT,
                is_duplicate BOOLEAN DEFAULT FALSE,
                duplicate_of VARCHAR,
                processing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created processed_data table');

        // Create status history table
        await conn.run(`
            CREATE TABLE IF NOT EXISTS status_history (
                id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                property_id VARCHAR,
                status VARCHAR,
                status_date DATE,
                agent VARCHAR,
                notes TEXT,
                import_batch_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (property_id) REFERENCES processed_data(property_id)
            )
        `);
        console.log('✅ Created status_history table');

        // Create import batches table
        await conn.run(`
            CREATE TABLE IF NOT EXISTS import_batches (
                batch_id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                file_name VARCHAR,
                file_path VARCHAR,
                import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_rows INTEGER,
                processed_rows INTEGER,
                error_rows INTEGER,
                duplicate_rows INTEGER,
                status VARCHAR DEFAULT 'pending',
                error_log TEXT,
                processing_time_ms INTEGER,
                user_name VARCHAR DEFAULT 'system'
            )
        `);
        console.log('✅ Created import_batches table');

        // Create analytics views
        await conn.run(`
            CREATE OR REPLACE VIEW monthly_summary AS
            SELECT 
                DATE_TRUNC('month', current_status_date) as month,
                agent,
                current_status,
                COUNT(*) as count
            FROM processed_data
            WHERE NOT is_duplicate
            GROUP BY month, agent, current_status
            ORDER BY month DESC, agent, current_status
        `);
        console.log('✅ Created monthly_summary view');

        await conn.run(`
            CREATE OR REPLACE VIEW agent_performance AS
            SELECT 
                agent,
                COUNT(DISTINCT property_id) as total_properties,
                COUNT(DISTINCT pole_number) as unique_poles,
                COUNT(DISTINCT CASE WHEN current_status = 'Pole Permission: Approved' THEN property_id END) as approved_count,
                MIN(first_status_date) as first_activity,
                MAX(current_status_date) as last_activity
            FROM processed_data
            WHERE NOT is_duplicate
            GROUP BY agent
            ORDER BY total_properties DESC
        `);
        console.log('✅ Created agent_performance view');

        // Create indexes for performance
        await conn.run(`CREATE INDEX IF NOT EXISTS idx_property_id ON processed_data(property_id)`);
        await conn.run(`CREATE INDEX IF NOT EXISTS idx_pole_number ON processed_data(pole_number)`);
        await conn.run(`CREATE INDEX IF NOT EXISTS idx_status_date ON processed_data(current_status_date)`);
        await conn.run(`CREATE INDEX IF NOT EXISTS idx_agent ON processed_data(agent)`);
        console.log('✅ Created performance indexes');

        console.log('\n🎉 Database initialization complete!');
        console.log('📊 Tables created:');
        console.log('   - raw_imports (for Excel data)');
        console.log('   - processed_data (cleaned data)');
        console.log('   - status_history (audit trail)');
        console.log('   - import_batches (import tracking)');
        console.log('📈 Views created:');
        console.log('   - monthly_summary');
        console.log('   - agent_performance');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    } finally {
        conn.close();
        db.close();
    }
}

// Run initialization
initializeTables();