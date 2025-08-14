const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Neon connection configuration
const pool = new Pool({
  host: 'ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_AlX83ojfZpBk',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  },
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function setupDatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🗄️ Setting up PowerBI database schema...');
    
    // Read and execute event tables SQL
    console.log('📋 Creating event tables and schema...');
    const eventTablesSQL = fs.readFileSync(path.join(__dirname, 'sql/01-create-event-tables.sql'), 'utf8');
    
    // Split SQL file into individual statements and execute
    const statements = eventTablesSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️ Statement ${i + 1} - Object already exists (skipping)`);
          } else {
            console.log(`❌ Error in statement ${i + 1}:`, error.message);
            console.log('Statement:', statement.substring(0, 100) + '...');
          }
        }
      }
    }
    
    // Read and execute BI views SQL
    console.log('📊 Creating BI views...');
    const biViewsSQL = fs.readFileSync(path.join(__dirname, 'sql/02-create-bi-views.sql'), 'utf8');
    
    const viewStatements = biViewsSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (let i = 0; i < viewStatements.length; i++) {
      const statement = viewStatements[i];
      if (statement.trim()) {
        try {
          await client.query(statement);
          console.log(`✅ Executed view statement ${i + 1}/${viewStatements.length}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️ View statement ${i + 1} - Object already exists (skipping)`);
          } else {
            console.log(`❌ Error in view statement ${i + 1}:`, error.message);
            console.log('Statement:', statement.substring(0, 100) + '...');
          }
        }
      }
    }
    
    // Create PowerBI reader user with secure password
    console.log('👤 Creating PowerBI reader user...');
    const powerbiPassword = 'PowerBI_' + Math.random().toString(36).substring(2, 15) + '_2025';
    
    try {
      await client.query(`CREATE USER powerbi_reader WITH PASSWORD '${powerbiPassword}'`);
      console.log('✅ PowerBI reader user created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        // Update password for existing user
        await client.query(`ALTER USER powerbi_reader PASSWORD '${powerbiPassword}'`);
        console.log('✅ PowerBI reader password updated');
      } else {
        throw error;
      }
    }
    
    // Grant permissions
    console.log('🔐 Granting permissions to PowerBI reader...');
    await client.query('GRANT CONNECT ON DATABASE neondb TO powerbi_reader');
    await client.query('GRANT USAGE ON SCHEMA public TO powerbi_reader');
    await client.query('GRANT USAGE ON SCHEMA bi_views TO powerbi_reader');
    await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA public TO powerbi_reader');
    await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA bi_views TO powerbi_reader');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powerbi_reader');
    await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA bi_views GRANT SELECT ON TABLES TO powerbi_reader');
    
    // Test the views
    console.log('🧪 Testing BI views...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'bi_views'
      ORDER BY table_name
    `);
    
    console.log('✅ Available BI views:');
    tables.rows.forEach(row => {
      console.log(`  📊 bi_views.${row.table_name}`);
    });
    
    // Test PowerBI connection
    console.log('🔍 Testing PowerBI reader connection...');
    const testPool = new Pool({
      host: 'ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech',
      database: 'neondb',
      user: 'powerbi_reader',
      password: powerbiPassword,
      port: 5432,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1
    });
    
    const testClient = await testPool.connect();
    const testResult = await testClient.query('SELECT COUNT(*) as view_count FROM information_schema.tables WHERE table_schema = \'bi_views\'');
    testClient.release();
    await testPool.end();
    
    console.log(`✅ PowerBI reader can access ${testResult.rows[0].view_count} views`);
    
    console.log('\n🎉 Database schema setup complete!');
    console.log('\n📝 PowerBI Connection Details:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Host: ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech');
    console.log('Database: neondb');
    console.log('Username: powerbi_reader');
    console.log(`Password: ${powerbiPassword}`);
    console.log('Port: 5432');
    console.log('SSL Mode: Require');
    console.log('═══════════════════════════════════════════════════════');
    
    // Save connection details to file
    const connectionInfo = {
      host: 'ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech',
      database: 'neondb',
      username: 'powerbi_reader',
      password: powerbiPassword,
      port: 5432,
      ssl: 'require',
      connectionString: `Host=ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech;Port=5432;Database=neondb;Username=powerbi_reader;Password=${powerbiPassword};SSL Mode=Require;Trust Server Certificate=true`,
      setupDate: new Date().toISOString(),
      availableViews: tables.rows.map(row => `bi_views.${row.table_name}`)
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'powerbi-connection-details.json'), 
      JSON.stringify(connectionInfo, null, 2)
    );
    
    console.log('\n💾 Connection details saved to: powerbi-connection-details.json');
    console.log('📖 For detailed setup guide, see: POWERBI_CONNECTION_GUIDE.md');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main execution
if (require.main === module) {
  setupDatabaseSchema()
    .then(() => {
      console.log('\n✅ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupDatabaseSchema };