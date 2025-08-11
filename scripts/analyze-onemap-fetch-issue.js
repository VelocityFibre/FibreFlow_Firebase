#!/usr/bin/env node

/**
 * Script to analyze why we're only getting 3,651 rows instead of 15,651
 * This script analyzes the OneMapService fetch behavior
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Analyzing OneMap Service Fetch Behavior\n');

// Read the OneMapService to understand the fetch logic
const servicePath = join(__dirname, '../src/app/features/settings/services/onemap.service.ts');

try {
  const serviceContent = readFileSync(servicePath, 'utf8');
  
  console.log('📄 OneMapService Analysis:');
  console.log('================================\n');
  
  // Extract the fetchStatusChanges method
  const fetchMethodMatch = serviceContent.match(/async fetchStatusChanges[\s\S]*?^\s{2}\}/m);
  if (fetchMethodMatch) {
    console.log('Found fetchStatusChanges method:');
    console.log(fetchMethodMatch[0]);
    console.log('\n');
  }
  
  // Look for pagination logic
  const paginationMatches = serviceContent.match(/pageSize|limit|range|from|count/gi);
  if (paginationMatches) {
    console.log('📊 Pagination-related keywords found:');
    paginationMatches.forEach(match => console.log(`   - ${match}`));
    console.log('\n');
  }
  
  // Check for any hardcoded limits
  const limitMatches = serviceContent.match(/\.limit\(\d+\)|\.range\(\d+,\s*\d+\)/g);
  if (limitMatches) {
    console.log('⚠️  Hardcoded limits found:');
    limitMatches.forEach(match => console.log(`   - ${match}`));
    console.log('\n');
  }
  
  // Check for batch processing
  const batchMatches = serviceContent.match(/batch|chunk|slice|page/gi);
  if (batchMatches) {
    console.log('🔄 Batch processing keywords:');
    batchMatches.forEach(match => console.log(`   - ${match}`));
    console.log('\n');
  }
  
  // Extract all Supabase query patterns
  console.log('🔍 Supabase Query Patterns:');
  const queryPatterns = serviceContent.match(/from\(['"]status_changes['"]\)[\s\S]*?;/g);
  if (queryPatterns) {
    queryPatterns.forEach((pattern, i) => {
      console.log(`\nQuery ${i + 1}:`);
      console.log(pattern.replace(/\s+/g, ' ').substring(0, 200) + '...');
    });
  }
  
  console.log('\n================================');
  console.log('\n📋 Key Findings:\n');
  
  // Analyze the specific issue
  if (serviceContent.includes('.range(')) {
    console.log('❗ The service uses .range() for pagination');
    const rangeMatch = serviceContent.match(/\.range\((\d+),\s*(\d+)\)/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      console.log(`   Range: ${start} to ${end} (fetches ${end - start + 1} rows)`);
    }
  }
  
  if (serviceContent.includes('while') && serviceContent.includes('hasMore')) {
    console.log('✅ The service appears to have pagination loop logic');
  } else {
    console.log('⚠️  No clear pagination loop found - might fetch only one page');
  }
  
  // Check the actual implementation
  const hasMoreLogic = serviceContent.match(/hasMore\s*=.*$/m);
  if (hasMoreLogic) {
    console.log('\n📌 hasMore logic:');
    console.log(`   ${hasMoreLogic[0]}`);
  }
  
  // Look for the page size
  const pageSizeMatch = serviceContent.match(/pageSize\s*=\s*(\d+)/);
  if (pageSizeMatch) {
    console.log(`\n📏 Page size: ${pageSizeMatch[1]} rows per fetch`);
    const pageSize = parseInt(pageSizeMatch[1]);
    const pagesNeeded = Math.ceil(15651 / pageSize);
    const actualPages = Math.ceil(3651 / pageSize);
    console.log(`   To fetch 15,651 rows: ${pagesNeeded} pages needed`);
    console.log(`   Currently fetching: ${actualPages} pages (3,651 rows)`);
  }
  
  console.log('\n💡 Possible Issues:');
  console.log('1. The pagination might stop early due to a condition');
  console.log('2. The API might have a hard limit on total rows returned');
  console.log('3. The hasMore condition might be incorrectly evaluated');
  console.log('4. There might be a timeout or error that stops fetching');
  
  console.log('\n🔧 Recommendations:');
  console.log('1. Add console logging to track pagination progress');
  console.log('2. Log the total count vs fetched count');
  console.log('3. Check if errors are silently caught');
  console.log('4. Verify the hasMore condition logic');
  
} catch (error) {
  console.error('❌ Error reading service file:', error.message);
}

console.log('\n✅ Analysis complete!');