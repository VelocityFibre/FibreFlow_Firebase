#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wzyysfumoeuvvhfmfwlj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatusChangesTable() {
  console.log('🔍 Checking status_changes table in Supabase...\n');

  try {
    // 1. Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('status_changes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting count:', countError);
      return;
    }

    console.log(`📊 Total rows in status_changes table: ${totalCount?.toLocaleString()}`);

    // 2. Check for null values in key columns
    console.log('\n🔍 Checking for NULL values in key columns...');
    
    const keyColumns = ['pole_number', 'drop_number', 'address', 'property_id', 'status', 'status_date'];
    
    for (const column of keyColumns) {
      const { count: nullCount } = await supabase
        .from('status_changes')
        .select('*', { count: 'exact', head: true })
        .is(column, null);
      
      console.log(`   ${column}: ${nullCount?.toLocaleString()} NULL values`);
    }

    // 3. Get data range (min/max IDs and dates)
    console.log('\n📅 Getting data ranges...');

    // Get min/max IDs
    const { data: idRange } = await supabase
      .from('status_changes')
      .select('id')
      .order('id', { ascending: true })
      .limit(1);
    
    const { data: maxIdData } = await supabase
      .from('status_changes')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (idRange && maxIdData) {
      console.log(`   ID range: ${idRange[0]?.id} to ${maxIdData[0]?.id}`);
    }

    // Get min/max status dates
    const { data: minDateData } = await supabase
      .from('status_changes')
      .select('status_date')
      .not('status_date', 'is', null)
      .order('status_date', { ascending: true })
      .limit(1);
    
    const { data: maxDateData } = await supabase
      .from('status_changes')
      .select('status_date')
      .not('status_date', 'is', null)
      .order('status_date', { ascending: false })
      .limit(1);

    if (minDateData && maxDateData) {
      console.log(`   Date range: ${minDateData[0]?.status_date} to ${maxDateData[0]?.status_date}`);
    }

    // 4. Check status distribution
    console.log('\n📊 Status distribution:');
    const { data: statusCounts } = await supabase
      .from('status_changes')
      .select('status')
      .not('status', 'is', null);

    if (statusCounts) {
      const statusMap = {};
      statusCounts.forEach(row => {
        statusMap[row.status] = (statusMap[row.status] || 0) + 1;
      });

      Object.entries(statusMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([status, count]) => {
          console.log(`   ${status}: ${count.toLocaleString()}`);
        });
    }

    // 5. Check for specific pole number patterns
    console.log('\n🔍 Checking pole number patterns...');
    
    // Count rows with pole numbers starting with specific prefixes
    const prefixes = ['LAW', 'MOH', 'MID', 'NOR'];
    for (const prefix of prefixes) {
      const { count } = await supabase
        .from('status_changes')
        .select('*', { count: 'exact', head: true })
        .like('pole_number', `${prefix}%`);
      
      console.log(`   Poles starting with ${prefix}: ${count?.toLocaleString()}`);
    }

    // 6. Check pagination behavior
    console.log('\n📄 Testing pagination...');
    
    let fetchedCount = 0;
    let lastId = 0;
    const pageSize = 1000;
    
    for (let i = 0; i < 5; i++) {
      const { data, error } = await supabase
        .from('status_changes')
        .select('id')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(pageSize);

      if (error) {
        console.error(`   Error on page ${i + 1}:`, error);
        break;
      }

      if (!data || data.length === 0) {
        console.log(`   No more data after ${fetchedCount} rows`);
        break;
      }

      fetchedCount += data.length;
      lastId = data[data.length - 1].id;
      console.log(`   Page ${i + 1}: fetched ${data.length} rows (total so far: ${fetchedCount})`);
    }

    // 7. Check for duplicate IDs or gaps
    console.log('\n🔍 Checking for ID gaps...');
    
    const { data: sampleIds } = await supabase
      .from('status_changes')
      .select('id')
      .order('id', { ascending: true })
      .limit(100);

    if (sampleIds && sampleIds.length > 1) {
      let gaps = 0;
      for (let i = 1; i < sampleIds.length; i++) {
        if (sampleIds[i].id - sampleIds[i-1].id > 1) {
          gaps++;
        }
      }
      console.log(`   Found ${gaps} gaps in first 100 IDs`);
    }

    // 8. Test specific query that's failing
    console.log('\n🧪 Testing the actual analytics query...');
    
    const { data: testQuery, count: testCount, error: testError } = await supabase
      .from('status_changes')
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(0, 999);

    if (testError) {
      console.error('   Query error:', testError);
    } else {
      console.log(`   Test query returned ${testQuery?.length} rows with count: ${testCount}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkStatusChangesTable().then(() => {
  console.log('\n✅ Check complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});