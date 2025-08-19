const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());

// Get Neon connection
const connectionString = process.env.NEON_CONNECTION_STRING || 
                        functions.config().neon?.connection_string ||
                        'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

// API Keys for authentication
const API_KEYS = [
  'powerbi-data-warehouse-2025',
  'management-dashboard-key-2025',
  process.env.POWERBI_API_KEY,
  functions.config().powerbi?.api_key,
].filter(Boolean);

// Middleware to check API key
function checkApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apikey;
  
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      hint: 'Use X-API-Key header or ?apikey= parameter'
    });
  }
  
  next();
}

// Apply API key check to all routes
app.use(checkApiKey);

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await sql`SELECT NOW() as timestamp`;
    res.json({
      success: true,
      service: 'Neon Data Warehouse API',
      database: 'connected',
      timestamp: result[0].timestamp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// List all available tables
app.get('/tables', async (req, res) => {
  try {
    const tables = await sql`
      SELECT table_name, table_type, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_type, table_name
    `;
    
    res.json({
      success: true,
      data: tables,
      total: tables.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get tables',
      message: error.message
    });
  }
});

// Get table structure/schema
app.get('/tables/:tableName/schema', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName} AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    const sampleData = await sql`
      SELECT * FROM ${sql(tableName)} LIMIT 3
    `;
    
    res.json({
      success: true,
      table: tableName,
      schema: columns,
      sampleData,
      recordCount: sampleData.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get schema for ${req.params.tableName}`,
      message: error.message
    });
  }
});

// Get all data from a specific table
app.get('/tables/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total FROM ${sql(tableName)}
    `;
    const total = parseInt(countResult[0].total);
    
    // Get data with pagination
    const data = await sql`
      SELECT * FROM ${sql(tableName)} 
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    res.json({
      success: true,
      table: tableName,
      data,
      meta: {
        total,
        limit,
        offset,
        returned: data.length,
        hasMore: offset + data.length < total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get data from ${req.params.tableName}`,
      message: error.message
    });
  }
});

// Management Dashboard - All key data in one endpoint
app.get('/dashboard', async (req, res) => {
  try {
    // Get key metrics from all tables
    const results = await Promise.all([
      // Projects summary
      sql`SELECT COUNT(*) as total_projects FROM projects`,
      
      // Poles data
      sql`SELECT COUNT(*) as total_poles FROM project_poles`,
      sql`SELECT status, COUNT(*) as count FROM onemap_status_history 
          GROUP BY status ORDER BY count DESC LIMIT 10`,
      
      // Recent imports
      sql`SELECT COUNT(*) as recent_imports FROM import_batches 
          WHERE created_at > NOW() - INTERVAL '30 days'`,
      
      // Drops data
      sql`SELECT COUNT(*) as total_drops FROM project_drops`,
      
      // SOW data
      sql`SELECT COUNT(*) as sow_poles FROM sow_drops`,
      
      // Fibre data
      sql`SELECT COUNT(*) as total_fibre FROM project_fibre`
    ]);
    
    const dashboard = {
      projects: {
        total: parseInt(results[0][0].total_projects)
      },
      poles: {
        total: parseInt(results[1][0].total_poles),
        statusBreakdown: results[2]
      },
      imports: {
        recent: parseInt(results[3][0].recent_imports)
      },
      drops: {
        total: parseInt(results[4][0].total_drops)
      },
      sow: {
        poles: parseInt(results[5][0].sow_poles)
      },
      fibre: {
        total: parseInt(results[6][0].total_fibre)
      }
    };
    
    res.json({
      success: true,
      dashboard,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      message: error.message
    });
  }
});

// Power BI Optimized Endpoints
app.get('/powerbi/poles', async (req, res) => {
  try {
    const data = await sql`
      SELECT 
        p.pole_number,
        p.project_id,
        p.location_description,
        p.gps_lat,
        p.gps_lng,
        s.status as current_status,
        s.status_changed_date,
        s.agent_name
      FROM status_changes p
      WHERE p.pole_number IS NOT NULL 
      AND p.id IN (
        SELECT MAX(id) FROM status_changes 
        WHERE pole_number IS NOT NULL
        GROUP BY pole_number
      )
      ORDER BY p.pole_number
    `;
    
    res.json({
      success: true,
      data,
      meta: {
        total: data.length,
        description: 'All poles with current status'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get poles data for Power BI',
      message: error.message
    });
  }
});

app.get('/powerbi/status-history', async (req, res) => {
  try {
    const data = await sql`
      SELECT 
        property_id,
        pole_number,
        status,
        status_changed_date,
        agent_name,
        import_batch_id
      FROM onemap_status_history
      WHERE status_changed_date IS NOT NULL
      ORDER BY status_changed_date DESC
      LIMIT 10000
    `;
    
    res.json({
      success: true,
      data,
      meta: {
        total: data.length,
        description: 'Status change history for tracking progress'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get status history for Power BI',
      message: error.message
    });
  }
});

// Get data from ALL tables in one endpoint (for Power BI multi-table import)
app.get('/all-data', async (req, res) => {
  try {
    // Updated to query actual tables that exist in Neon
    const tables = [
      'status_changes', // Main table with 15,651 rows of OneMap data
      'import_batches', // Import tracking
      'projects', 'project_poles', 'project_drops', 'project_fibre',
      'sow_drops', 'sow_fibre', 'onemap_status_history'
    ];
    
    const allData = {};
    
    for (const table of tables) {
      try {
        const data = await sql`SELECT * FROM ${sql(table)} LIMIT 1000`;
        allData[table] = data;
      } catch (e) {
        console.log(`Table ${table} not accessible: ${e.message}`);
        allData[table] = [];
      }
    }
    
    res.json({
      success: true,
      data: allData,
      tables: Object.keys(allData),
      meta: {
        description: 'All data from all tables',
        recordCounts: Object.keys(allData).reduce((acc, table) => {
          acc[table] = allData[table].length;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get all data',
      message: error.message
    });
  }
});

// Export as Firebase Function
exports.neonDataWarehouse = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 120
  })
  .https
  .onRequest(app);