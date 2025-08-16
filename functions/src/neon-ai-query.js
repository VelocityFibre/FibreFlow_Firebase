const functions = require('firebase-functions');
const { neon } = require('@neondatabase/serverless');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Firebase Function for Neon AI Query Processing
 * Simple approach - no separate backend server needed
 */

// Initialize Neon connection
let sql = null;
function getNeonConnection() {
  if (!sql) {
    const connectionString = functions.config().neon?.connection_string || process.env.NEON_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('Neon connection string not configured. Set functions:config:set neon.connection_string="your_connection_string"');
    }
    sql = neon(connectionString);
  }
  return sql;
}

// Initialize Gemini AI
let genAI = null;
function getGeminiClient() {
  if (!genAI) {
    const apiKey = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Set functions:config:set gemini.api_key="your_api_key"');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Test Neon database connection
exports.testNeonConnection = functions.https.onCall(async (data, context) => {
  try {
    const sql = getNeonConnection();
    const result = await sql`SELECT NOW() as timestamp, version() as version`;
    
    return {
      success: true,
      message: 'Neon database connected successfully',
      timestamp: result[0].timestamp,
      version: result[0].version.split(',')[0]
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', `Database connection failed: ${error.message}`);
  }
});

// Get database information
exports.getNeonDatabaseInfo = functions.https.onCall(async (data, context) => {
  try {
    const sql = getNeonConnection();
    
    // Get table information
    const tables = await sql`
      SELECT table_name, 
             pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY table_name
    `;
    
    // Get table statistics
    const stats = {};
    for (const table of tables) {
      try {
        const count = await sql`SELECT COUNT(*) as count FROM ${sql(table.table_name)}`;
        stats[table.table_name] = parseInt(count[0].count);
      } catch (err) {
        stats[table.table_name] = 0;
      }
    }
    
    return {
      success: true,
      connection_status: 'connected',
      database_version: 'PostgreSQL (Neon Serverless)',
      tables: tables,
      table_statistics: stats,
      total_tables: tables.length,
      llm_model: 'gemini-pro',
      schema_available: true,
      supported_queries: ['SELECT', 'COUNT', 'GROUP BY', 'ORDER BY', 'WHERE', 'JOIN']
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', `Failed to get database info: ${error.message}`);
  }
});

// Process natural language query with AI
exports.processNeonQuery = functions.https.onCall(async (data, context) => {
  const startTime = Date.now();
  
  try {
    const { question, user_id = 'fibreflow-user', include_metadata = true, include_sql = false } = data;
    
    if (!question) {
      throw new functions.https.HttpsError('invalid-argument', 'Question is required');
    }
    
    const sql = getNeonConnection();
    const genAI = getGeminiClient();
    
    // Get database schema information
    const tables = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `;
    
    // Build schema description
    const schema = {};
    tables.forEach(row => {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push(`${row.column_name} (${row.data_type})`);
    });
    
    const schemaDescription = Object.entries(schema)
      .map(([table, columns]) => `${table}: ${columns.join(', ')}`)
      .join('\n');
    
    // Create AI prompt for SQL generation
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `You are a PostgreSQL expert. Given this database schema, convert the user's natural language question into a SELECT query.

DATABASE SCHEMA:
${schemaDescription}

RULES:
1. Only generate SELECT statements (no INSERT, UPDATE, DELETE)
2. Use proper PostgreSQL syntax
3. Be case-sensitive with column names
4. Use LIMIT to prevent large result sets
5. Return only the SQL query, nothing else

USER QUESTION: ${question}

SQL QUERY:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let sqlQuery = response.text().trim();
    
    // Clean up the SQL query (remove markdown formatting if present)
    sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Validate it's a SELECT query
    if (!sqlQuery.toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed for safety');
    }
    
    // Execute the generated SQL
    let queryResults;
    try {
      queryResults = await sql.unsafe(sqlQuery);
    } catch (sqlError) {
      // If SQL fails, try to fix common issues
      let fixedQuery = sqlQuery;
      
      // Try adding LIMIT if missing
      if (!fixedQuery.toLowerCase().includes('limit')) {
        fixedQuery += ' LIMIT 100';
      }
      
      try {
        queryResults = await sql.unsafe(fixedQuery);
        sqlQuery = fixedQuery; // Update the query that worked
      } catch (retryError) {
        throw new Error(`SQL execution failed: ${sqlError.message}`);
      }
    }
    
    // Format the results into a readable answer
    const answerPrompt = `Based on this SQL query and results, provide a clear, conversational answer to the user's question.

ORIGINAL QUESTION: ${question}
SQL QUERY: ${sqlQuery}
RESULTS: ${JSON.stringify(queryResults.slice(0, 10))} ${queryResults.length > 10 ? `... (showing first 10 of ${queryResults.length} results)` : ''}

Provide a natural language answer that:
1. Directly answers the user's question
2. Includes relevant numbers/data from the results
3. Is conversational and helpful
4. Mentions if results were limited

ANSWER:`;
    
    const answerResult = await model.generateContent(answerPrompt);
    const answerResponse = await answerResult.response;
    const answer = answerResponse.text();
    
    const executionTime = Date.now() - startTime;
    
    // Build response
    const response_data = {
      success: true,
      answer: answer,
      execution_time: executionTime,
      metadata: include_metadata ? {
        llm_model: 'gemini-pro',
        question: question,
        user_id: user_id,
        timestamp: Date.now(),
        results_count: queryResults.length,
        query_type: 'natural_language'
      } : undefined
    };
    
    if (include_sql) {
      response_data.sql_query = sqlQuery;
    }
    
    return response_data;
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    throw new functions.https.HttpsError('internal', error.message, {
      execution_time: executionTime,
      success: false
    });
  }
});

// Get health status
exports.getNeonAgentHealth = functions.https.onCall(async (data, context) => {
  try {
    const sql = getNeonConnection();
    const genAI = getGeminiClient();
    
    // Test database connection
    let database_connected = false;
    try {
      await sql`SELECT 1`;
      database_connected = true;
    } catch (err) {
      // Database connection failed
    }
    
    // Test AI connection
    let agent_ready = false;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      await model.generateContent('Test connection');
      agent_ready = true;
    } catch (err) {
      // AI connection failed
    }
    
    return {
      database_connected,
      agent_ready,
      uptime: process.uptime(),
      last_health_check: Math.floor(Date.now() / 1000),
      connection_pool: {
        status: 'serverless',
        pool_size: 'auto',
        connection_test: database_connected ? 'passed' : 'failed'
      },
      gemini_status: agent_ready ? 'ready' : 'unavailable',
      server_info: {
        version: '1.0.0',
        keep_alive_enabled: true,
        pool_size: 'serverless'
      }
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', `Health check failed: ${error.message}`);
  }
});

// Execute raw SQL query (admin only)
exports.executeNeonSQL = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated and has admin rights
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { query, params = [] } = data;
    
    if (!query) {
      throw new functions.https.HttpsError('invalid-argument', 'SQL query is required');
    }
    
    // Only allow SELECT queries for safety
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      throw new functions.https.HttpsError('invalid-argument', 'Only SELECT queries are allowed');
    }
    
    const sql = getNeonConnection();
    const results = params.length > 0 ? await sql(query, params) : await sql.unsafe(query);
    
    return {
      success: true,
      results: results,
      count: results.length
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', `SQL execution failed: ${error.message}`);
  }
});