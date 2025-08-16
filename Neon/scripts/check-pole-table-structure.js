#!/usr/bin/env node

/**
 * Check the structure of existing pole-related tables in Neon
 */

const { neon } = require('@neondatabase/serverless');

const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function checkPoleTableStructure() {
  console.log('🔍 Checking pole-related table structures in Neon...\n');
  
  try {
    const sql = neon(connectionString);
    
    // Tables to check
    const poleTables = [
      'project_poles',
      'sow_poles', 
      'pole_capacity',
      'project_drops',
      'sow_drops',
      'status_history',
      'onemap_status_history'
    ];
    
    for (const tableName of poleTables) {
      console.log(`\n📊 Table: ${tableName}`);
      console.log('=' .repeat(50));
      
      try {
        // Get column information
        const columns = await sql`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          ORDER BY ordinal_position
        `;
        
        console.log('\nColumns:');
        columns.forEach(col => {
          let type = col.data_type;
          if (col.character_maximum_length) {
            type += `(${col.character_maximum_length})`;
          }
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          
          console.log(`  - ${col.column_name}: ${type} ${nullable}${defaultVal}`);
        });
        
        // Get row count
        const countResult = await sql.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`\nRow count: ${countResult[0].count}`);
        
        // Get indexes
        const indexes = await sql`
          SELECT 
            indexname,
            indexdef
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = ${tableName}
        `;
        
        if (indexes.length > 0) {
          console.log('\nIndexes:');
          indexes.forEach(idx => {
            console.log(`  - ${idx.indexname}`);
          });
        }
        
        // Get constraints
        const constraints = await sql`
          SELECT 
            conname as constraint_name,
            contype as constraint_type,
            pg_get_constraintdef(oid) as definition
          FROM pg_constraint
          WHERE conrelid = ${tableName}::regclass
        `;
        
        if (constraints.length > 0) {
          console.log('\nConstraints:');
          constraints.forEach(con => {
            const type = {
              'p': 'PRIMARY KEY',
              'f': 'FOREIGN KEY',
              'u': 'UNIQUE',
              'c': 'CHECK'
            }[con.constraint_type] || con.constraint_type;
            console.log(`  - ${con.constraint_name} (${type})`);
          });
        }
        
        // Sample data for key tables
        if (['project_poles', 'sow_poles'].includes(tableName)) {
          const sample = await sql.query(`SELECT * FROM ${tableName} LIMIT 1`);
          if (sample.length > 0) {
            console.log('\nSample record:');
            console.log(JSON.stringify(sample[0], null, 2));
          }
        }
        
      } catch (error) {
        console.log(`  ❌ Error checking ${tableName}: ${error.message}`);
      }
    }
    
    // Check relationships
    console.log('\n\n🔗 Table Relationships:');
    console.log('=' .repeat(50));
    
    const relationships = await sql`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('project_poles', 'sow_poles', 'project_drops', 'sow_drops')
    `;
    
    relationships.forEach(rel => {
      console.log(`  ${rel.table_name}.${rel.column_name} → ${rel.foreign_table_name}.${rel.foreign_column_name}`);
    });
    
    console.log('\n✅ Structure inspection complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the check
checkPoleTableStructure();