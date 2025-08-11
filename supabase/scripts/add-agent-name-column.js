#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://vkmpbprvooxgrkwrkbcf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAgentNameColumn() {
  console.log('🔧 Adding agent_name column to status_changes table...\n');

  try {
    // Use Supabase's rpc to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE status_changes ADD COLUMN IF NOT EXISTS agent_name TEXT;'
    });

    if (error) {
      // If rpc doesn't exist, try a different approach
      console.log('⚠️  Direct SQL execution not available, trying alternative method...');
      
      // Check if column exists by trying to select it
      const { error: selectError } = await supabase
        .from('status_changes')
        .select('agent_name')
        .limit(1);

      if (selectError && selectError.message.includes('column')) {
        console.log('❌ Column does not exist and cannot be added via API');
        console.log('\n📋 Please add the column manually in Supabase Dashboard:');
        console.log('   1. Go to your Supabase project dashboard');
        console.log('   2. Navigate to Table Editor → status_changes');
        console.log('   3. Click "Add column"');
        console.log('   4. Name: agent_name');
        console.log('   5. Type: text');
        console.log('   6. Click "Save"');
        console.log('\n   Then run the sync script again.');
        return false;
      } else {
        console.log('✅ Column agent_name already exists!');
        return true;
      }
    }

    console.log('✅ Successfully added agent_name column!');
    return true;

  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

// Run the function
addAgentNameColumn().then(success => {
  if (success) {
    console.log('\n🎉 Column added successfully! You can now run the sync script.');
  } else {
    console.log('\n⚠️  Please add the column manually as described above.');
  }
  process.exit(success ? 0 : 1);
});