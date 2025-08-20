#!/usr/bin/env node

/**
 * Neon + Gemini Agent - Natural Language Database Query Interface
 * 
 * This script allows you to query the FibreFlow Neon database using natural language
 * questions. It uses Google's Gemini AI to convert your questions to SQL and
 * interpret the results.
 * 
 * Usage: node neon-gemini-query.js "How many poles were installed last month?"
 */

const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', 'config', '.env') });

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Initialize Neon database connection
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Database schema for context
const SCHEMA_CONTEXT = `
FibreFlow Database Schema (PostgreSQL/Neon):

Tables:
1. onemap_status_changes - Tracks all status changes from OneMap imports
   - id, import_batch_id, property_id, pole_number, drop_number
   - status, substatus, agent_code, agent_name, approved_date
   - latitude, longitude, address, zone, created_at

2. sow_poles - Scope of Work pole data
   - id, project_id, pole_number, pole_type, location
   - installation_date, status, contractor_id

3. sow_drops - Drops/connections per pole
   - id, pole_id, drop_number, address, customer_name
   - installation_status, connected_date

4. import_batches - Track data imports
   - id, filename, import_date, record_count, status

Key relationships:
- Each pole can have multiple drops (max 12)
- Status changes are tracked over time
- Contractors are assigned to poles/projects
`;

/**
 * Convert natural language to SQL using Gemini
 */
async function generateSQL(question) {
  const prompt = `
You are a SQL expert for the FibreFlow fiber optic management system.
Convert the following natural language question into a PostgreSQL query.

Database Schema:
${SCHEMA_CONTEXT}

Rules:
1. Return ONLY the SQL query, no explanations
2. Use proper PostgreSQL syntax
3. Include appropriate JOINs when needed
4. Limit results to 100 unless specified otherwise
5. Use date functions for time-based queries

Question: ${question}

SQL Query:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating SQL:', error);
    throw error;
  }
}

/**
 * Execute SQL query on Neon database
 */
async function executeQuery(sql) {
  try {
    console.log('\nExecuting SQL:', sql);
    const result = await pool.query(sql);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Interpret query results using Gemini
 */
async function interpretResults(question, sql, results) {
  const prompt = `
You asked: "${question}"

The SQL query executed was:
${sql}

The results are:
${JSON.stringify(results, null, 2)}

Please provide a natural language summary of these results that directly answers the original question.
Be concise but informative. If the results are empty, explain what that means.
Format numbers nicely and highlight key insights.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error interpreting results:', error);
    throw error;
  }
}

/**
 * Interactive mode - continuous Q&A session
 */
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n🤖 Neon + Gemini Agent - Interactive Mode');
  console.log('Ask questions about your FibreFlow data in natural language.');
  console.log('Type "exit" to quit.\n');

  const askQuestion = () => {
    rl.question('Your question: ', async (question) => {
      if (question.toLowerCase() === 'exit') {
        console.log('\nGoodbye! 👋');
        rl.close();
        pool.end();
        return;
      }

      try {
        console.log('\n🔍 Processing your question...');
        
        // Generate SQL
        const sql = await generateSQL(question);
        
        // Execute query
        const results = await executeQuery(sql);
        
        // Interpret results
        const interpretation = await interpretResults(question, sql, results);
        
        console.log('\n📊 Answer:');
        console.log(interpretation);
        console.log('\n' + '='.repeat(80) + '\n');
        
      } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('Please try rephrasing your question.\n');
      }
      
      askQuestion(); // Continue the loop
    });
  };

  askQuestion();
}

/**
 * Single query mode - answer one question and exit
 */
async function singleQuery(question) {
  try {
    console.log('\n🔍 Processing your question...');
    
    // Generate SQL
    const sql = await generateSQL(question);
    
    // Execute query
    const results = await executeQuery(sql);
    
    // Interpret results
    const interpretation = await interpretResults(question, sql, results);
    
    console.log('\n📊 Answer:');
    console.log(interpretation);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Interactive mode
    await interactiveMode();
  } else {
    // Single query mode
    const question = args.join(' ');
    await singleQuery(question);
  }
}

// Run the agent
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});