#!/usr/bin/env node

const duckdb = require('duckdb');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/onemap.duckdb');

console.log('🦆 Setting up DuckDB Excel Extension...');

const db = new duckdb.Database(DB_PATH);
const conn = db.connect();

// Install and load the spatial extension which includes Excel support
conn.run("INSTALL spatial;", (err) => {
    if (err) {
        console.error('❌ Failed to install spatial extension:', err);
        return;
    }
    console.log('✅ Spatial extension installed');
    
    conn.run("LOAD spatial;", (err) => {
        if (err) {
            console.error('❌ Failed to load spatial extension:', err);
            return;
        }
        console.log('✅ Spatial extension loaded');
        
        // Now try to install the Excel extension from the community repository
        conn.run("SET custom_extension_repository = 'http://extensions.duckdb.org';", (err) => {
            if (err) {
                console.log('⚠️  Could not set custom repository:', err);
            }
            
            conn.run("INSTALL excel FROM community;", (err) => {
                if (err) {
                    console.error('❌ Failed to install Excel extension:', err);
                    console.log('\n⚠️  Excel extension not available in this DuckDB version');
                    console.log('📝 Note: Excel support requires DuckDB v0.10.0+ with community extensions');
                    return;
                }
                console.log('✅ Excel extension installed from community repository');
                
                conn.run("LOAD excel;", (err) => {
                    if (err) {
                        console.error('❌ Failed to load Excel extension:', err);
                        return;
                    }
                    console.log('✅ Excel extension loaded successfully!');
                    console.log('\n🎉 You can now import Excel files directly!');
                    
                    // Test the extension
                    console.log('\n🧪 Testing Excel extension...');
                    conn.all("SELECT excel_version();", (err, result) => {
                        if (err) {
                            console.log('⚠️  Excel version check failed:', err.message);
                        } else {
                            console.log('✅ Excel extension version:', result);
                        }
                        
                        conn.close();
                        db.close();
                    });
                });
            });
        });
    });
});