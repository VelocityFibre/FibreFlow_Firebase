#!/usr/bin/env node

/**
 * Compare Performance: Supabase vs Neon
 * 
 * This script runs identical queries on both databases
 * and compares performance metrics.
 */

const { createClient } = require('@supabase/supabase-js');
const { neon } = require('@neondatabase/serverless');

// Configuration
const SUPABASE_URL = 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXBicHJ2b294Z3Jrd3JrYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODE5MjUsImV4cCI6MjA3MDA1NzkyNX0.k2kHHs5T-W-4Twr_BTzWH5wIvy4PWYltbV8VzYfkLM8';
const NEON_CONNECTION = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

// Test queries
const TEST_QUERIES = [
  {
    name: 'Simple Count',
    sql: 'SELECT COUNT(*) as total FROM properties'
  },
  {
    name: 'Filtered Count',
    sql: `SELECT COUNT(*) as total FROM properties WHERE status = 'Active'`
  },
  {
    name: 'Group By Zone',
    sql: `
      SELECT zone, COUNT(*) as count 
      FROM properties 
      GROUP BY zone 
      ORDER BY count DESC 
      LIMIT 10
    `
  },
  {
    name: 'Complex Aggregation',
    sql: `
      SELECT 
        zone,
        status,
        COUNT(*) as count,
        COUNT(DISTINCT property_id) as unique_properties
      FROM properties
      GROUP BY zone, status
      ORDER BY zone, count DESC
    `
  },
  {
    name: 'Date Range Query',
    sql: `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM properties
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month
    `
  },
  {
    name: 'Full Table Scan',
    sql: 'SELECT * FROM properties LIMIT 1000'
  }
];

async function comparePerformance() {
  console.log('🔄 Database Performance Comparison: Supabase vs Neon\n');
  console.log('📊 OneMap Database: 15,651 properties\n');
  
  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const neonSql = neon(NEON_CONNECTION);
  
  const results = [];
  
  for (const query of TEST_QUERIES) {
    console.log(`\n📝 Test: ${query.name}`);
    console.log('─'.repeat(50));
    
    // Test Supabase
    const supabaseStart = Date.now();
    let supabaseResult;
    let supabaseError;
    
    try {
      // For Supabase, we need to use raw SQL through RPC
      const { data, error } = await supabase.rpc('execute_sql', { 
        query_text: query.sql 
      });
      
      if (error) throw error;
      supabaseResult = data;
    } catch (error) {
      supabaseError = error.message;
    }
    
    const supabaseTime = Date.now() - supabaseStart;
    
    // Test Neon
    const neonStart = Date.now();
    let neonResult;
    let neonError;
    
    try {
      neonResult = await neonSql(query.sql);
    } catch (error) {
      neonError = error.message;
    }
    
    const neonTime = Date.now() - neonStart;
    
    // Display results
    console.log(`Supabase: ${supabaseTime}ms ${supabaseError ? '❌ ' + supabaseError : '✅'}`);
    console.log(`Neon:     ${neonTime}ms ${neonError ? '❌ ' + neonError : '✅'}`);
    
    if (!supabaseError && !neonError) {
      const faster = supabaseTime < neonTime ? 'Supabase' : 'Neon';
      const speedup = Math.abs(supabaseTime - neonTime);
      const percentage = Math.round((speedup / Math.max(supabaseTime, neonTime)) * 100);
      console.log(`\n⚡ ${faster} was ${speedup}ms faster (${percentage}% improvement)`);
      
      // Show result counts
      const supaCount = Array.isArray(supabaseResult) ? supabaseResult.length : 1;
      const neonCount = Array.isArray(neonResult) ? neonResult.length : 1;
      console.log(`📊 Results: Supabase returned ${supaCount} rows, Neon returned ${neonCount} rows`);
    }
    
    results.push({
      query: query.name,
      supabaseTime,
      neonTime,
      supabaseError,
      neonError,
      winner: !supabaseError && !neonError ? (supabaseTime < neonTime ? 'Supabase' : 'Neon') : 'N/A'
    });
  }
  
  // Summary
  console.log('\n\n📊 PERFORMANCE SUMMARY');
  console.log('═'.repeat(70));
  console.log('Query'.padEnd(30) + 'Supabase'.padEnd(15) + 'Neon'.padEnd(15) + 'Winner');
  console.log('─'.repeat(70));
  
  let supabaseWins = 0;
  let neonWins = 0;
  let totalSupabaseTime = 0;
  let totalNeonTime = 0;
  
  results.forEach(r => {
    const supabaseDisplay = r.supabaseError ? 'ERROR' : `${r.supabaseTime}ms`;
    const neonDisplay = r.neonError ? 'ERROR' : `${r.neonTime}ms`;
    
    console.log(
      r.query.padEnd(30) + 
      supabaseDisplay.padEnd(15) + 
      neonDisplay.padEnd(15) + 
      r.winner
    );
    
    if (r.winner === 'Supabase') supabaseWins++;
    if (r.winner === 'Neon') neonWins++;
    if (!r.supabaseError) totalSupabaseTime += r.supabaseTime;
    if (!r.neonError) totalNeonTime += r.neonTime;
  });
  
  console.log('═'.repeat(70));
  console.log(`\n🏆 OVERALL RESULTS:`);
  console.log(`   Supabase wins: ${supabaseWins}`);
  console.log(`   Neon wins: ${neonWins}`);
  console.log(`   Total time - Supabase: ${totalSupabaseTime}ms`);
  console.log(`   Total time - Neon: ${totalNeonTime}ms`);
  
  if (totalSupabaseTime < totalNeonTime) {
    const improvement = Math.round(((totalNeonTime - totalSupabaseTime) / totalNeonTime) * 100);
    console.log(`\n⚡ Supabase was ${improvement}% faster overall`);
  } else {
    const improvement = Math.round(((totalSupabaseTime - totalNeonTime) / totalSupabaseTime) * 100);
    console.log(`\n⚡ Neon was ${improvement}% faster overall`);
  }
  
  // Connection characteristics
  console.log('\n\n🔌 CONNECTION CHARACTERISTICS:');
  console.log('─'.repeat(50));
  console.log('Supabase:');
  console.log('  - Location: Unknown (check Supabase dashboard)');
  console.log('  - Connection: REST API over HTTPS');
  console.log('  - Pooling: Managed by Supabase');
  console.log('\nNeon:');
  console.log('  - Location: Azure GWC (Great Western Canada)');
  console.log('  - Connection: Native PostgreSQL with pooler');
  console.log('  - Pooling: Built-in connection pooler');
}

// Note about Supabase RPC requirement
async function createSupabaseRPCFunction() {
  console.log('\n📝 NOTE: For Supabase comparison to work, you need this function:\n');
  console.log(`
-- Run this in Supabase SQL Editor:
CREATE OR REPLACE FUNCTION execute_sql(query_text text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;
  `);
}

// Run comparison
comparePerformance()
  .catch(error => {
    console.error('\n❌ Comparison failed:', error);
    createSupabaseRPCFunction();
  });