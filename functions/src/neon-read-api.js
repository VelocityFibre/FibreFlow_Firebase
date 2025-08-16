const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());

// Get Neon connection from environment
const connectionString = process.env.NEON_CONNECTION_STRING || 
                        functions.config().neon?.connection_string ||
                        'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

// Simple API key middleware
const API_KEYS = [
  'dev-api-key-12345', // Development key
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  functions.config().api?.key_1,
  functions.config().api?.key_2,
].filter(Boolean);

function checkApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required. Include X-API-Key header'
      }
    });
  }
  
  if (!API_KEYS.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key'
      }
    });
  }
  
  next();
}

// Apply API key check to all routes
app.use(checkApiKey);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// GET /api/v1/poles
app.get('/api/v1/poles', async (req, res) => {
  try {
    const { projectId, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM poles WHERE 1=1';
    const params = [];
    
    if (projectId) {
      params.push(projectId);
      query += ` AND project_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const poles = await sql(query, params);
    
    res.json({
      success: true,
      data: poles,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching poles:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch poles'
      }
    });
  }
});

// GET /api/v1/analytics/summary
app.get('/api/v1/analytics/summary', async (req, res) => {
  try {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_poles,
        COUNT(CASE WHEN status = 'installed' THEN 1 END) as installed,
        COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned,
        COUNT(DISTINCT project_id) as total_projects
      FROM poles
    `;
    
    const result = await sql(summaryQuery);
    
    res.json({
      success: true,
      data: result[0],
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch analytics'
      }
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Export as Firebase Function
exports.neonReadAPI = functions.https.onRequest(app);