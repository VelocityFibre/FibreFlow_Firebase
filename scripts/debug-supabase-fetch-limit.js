#!/usr/bin/env node

/**
 * Debug script to understand Supabase fetch limitations
 * This analyzes the potential causes for getting only 3,651 rows instead of 15,651
 */

console.log('🔍 Debugging Supabase Fetch Limitation Issue\n');
console.log('Problem: Getting 3,651 rows instead of expected 15,651 from status_changes table\n');

console.log('📊 Analysis of the numbers:');
console.log('--------------------------------');
console.log('Expected rows: 15,651');
console.log('Actual rows:    3,651');
console.log('Missing rows:  12,000 (exactly!)\n');

console.log('🤔 This exact 12,000 difference suggests a systematic issue!\n');

console.log('🔍 Possible Causes:');
console.log('==================\n');

console.log('1. ⚠️  Supabase Default Pagination Limit');
console.log('   - Supabase has a default limit of 1,000 rows per request');
console.log('   - Without proper pagination, you only get the first page');
console.log('   - But 3,651 > 1,000, so multiple pages are being fetched\n');

console.log('2. 📄 Hard-coded Page Limit in Code');
console.log('   - The code might be fetching exactly 4 pages');
console.log('   - 4 pages × ~913 rows/page = 3,651 rows');
console.log('   - Or 3 pages × 1,000 + 1 page × 651 = 3,651 rows\n');

console.log('3. 🚫 Row Limit Policy');
console.log('   - Some Supabase plans have row limits for API calls');
console.log('   - Free tier might limit total rows returned');
console.log('   - Check if there\'s a 3,651 or 4,000 row limit\n');

console.log('4. ⏱️  Timeout or Error After ~3,651 Rows');
console.log('   - Request might timeout after fetching partial data');
console.log('   - Silent error that stops pagination loop');
console.log('   - Network issues after certain data volume\n');

console.log('5. 🔄 Incorrect hasMore Logic');
console.log('   - Pagination might incorrectly think there\'s no more data');
console.log('   - Could be checking count wrong or response.length wrong\n');

console.log('6. 📅 Data Filtering');
console.log('   - There might be a date filter limiting results');
console.log('   - Or status filter excluding 12,000 rows\n');

console.log('💡 Most Likely Scenarios:');
console.log('========================\n');

console.log('Scenario A: Fixed Page Limit');
console.log('   Code fetches exactly 4 pages then stops');
console.log('   Solution: Fix pagination loop to continue until no more data\n');

console.log('Scenario B: Supabase Response Limit');
console.log('   API returns max 3,651 rows regardless of pagination');
console.log('   Solution: Use different query approach or batch by date/ID ranges\n');

console.log('📝 Debugging Steps:');
console.log('==================\n');

console.log('1. Check the VF OneMap app code for:');
console.log('   - Look for .range() or .limit() calls');
console.log('   - Check pagination loop (while hasMore)');
console.log('   - Look for hardcoded page limits\n');

console.log('2. Test Supabase directly:');
console.log('   - Try different range values');
console.log('   - Check if count matches actual rows returned');
console.log('   - Test with smaller page sizes\n');

console.log('3. Potential Code Fixes:');
console.log('   ```javascript');
console.log('   // Instead of:');
console.log('   const { data } = await supabase');
console.log('     .from("status_changes")');
console.log('     .select("*")');
console.log('     .range(0, 3650); // Hard limit!');
console.log('');
console.log('   // Use proper pagination:');
console.log('   let allData = [];');
console.log('   let from = 0;');
console.log('   const pageSize = 1000;');
console.log('   let hasMore = true;');
console.log('   ');
console.log('   while (hasMore) {');
console.log('     const { data, error } = await supabase');
console.log('       .from("status_changes")');
console.log('       .select("*")');
console.log('       .range(from, from + pageSize - 1)');
console.log('       .order("id");');
console.log('     ');
console.log('     if (error) throw error;');
console.log('     if (!data || data.length === 0) {');
console.log('       hasMore = false;');
console.log('     } else {');
console.log('       allData = [...allData, ...data];');
console.log('       from += pageSize;');
console.log('       hasMore = data.length === pageSize;');
console.log('     }');
console.log('   }');
console.log('   ```\n');

console.log('4. Alternative Approach - Batch by ID:');
console.log('   ```javascript');
console.log('   // Fetch in ID batches to avoid limits');
console.log('   const batchSize = 3000;');
console.log('   let lastId = 0;');
console.log('   ');
console.log('   while (true) {');
console.log('     const { data } = await supabase');
console.log('       .from("status_changes")');
console.log('       .select("*")');
console.log('       .gt("id", lastId)');
console.log('       .order("id")');
console.log('       .limit(batchSize);');
console.log('     ');
console.log('     if (!data || data.length === 0) break;');
console.log('     // Process data...');
console.log('     lastId = data[data.length - 1].id;');
console.log('   }');
console.log('   ```\n');

console.log('🎯 Next Steps:');
console.log('=============');
console.log('1. Check the VF OneMap source code for pagination implementation');
console.log('2. Look for any hardcoded limits or range values');
console.log('3. Test the Supabase query with different parameters');
console.log('4. Implement proper pagination without limits\n');

console.log('✅ Debug analysis complete!');