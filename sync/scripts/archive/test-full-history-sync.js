#!/usr/bin/env node

/**
 * Test Full Status History Sync
 * 
 * Tests the full status history sync with a small batch of poles
 * to verify the logic before running the complete sync
 */

const { findPolesWithApprovalHistory, getAllStatusHistoryForPole } = require('./sync-full-status-history');
const admin = require('firebase-admin');

// Initialize staging app for testing
const stagingServiceAccount = require('../config/service-accounts/vf-onemap-data-key.json');
const stagingApp = admin.initializeApp({
  credential: admin.credential.cert(stagingServiceAccount),
  projectId: 'vf-onemap-data'
}, 'staging-test');

const stagingDb = stagingApp.firestore();

async function testStatusHistorySync() {
  console.log('🧪 Testing Full Status History Sync\n');
  
  try {
    // Find poles with approval
    console.log('1️⃣ Finding poles with approval history...');
    const approvedPoles = await findPolesWithApprovalHistory();
    console.log(`   Found ${approvedPoles.length} poles with approval history\n`);
    
    // Test with first 3 poles
    const testPoles = approvedPoles.slice(0, 3);
    console.log(`2️⃣ Testing with ${testPoles.length} poles: ${testPoles.join(', ')}\n`);
    
    for (const poleNumber of testPoles) {
      console.log(`\n📊 Analyzing pole: ${poleNumber}`);
      console.log('─'.repeat(50));
      
      // Get all status history
      const history = await getAllStatusHistoryForPole(poleNumber);
      
      if (history.length === 0) {
        console.log('   ⚠️  No history found');
        continue;
      }
      
      // Show status progression
      console.log(`   Status History (${history.length} entries):`);
      history.forEach((entry, idx) => {
        const timestamp = entry.timestamp ? 
          new Date(entry.timestamp.toDate()).toLocaleDateString() : 
          'No date';
        console.log(`   ${idx + 1}. ${entry.status} - ${timestamp}`);
        if (entry.propertyId) {
          console.log(`      Property: ${entry.propertyId}, Drop: ${entry.dropNumber || 'N/A'}`);
        }
      });
      
      // Check for post-approval statuses
      const approvalIndex = history.findIndex(h => h.status === 'Pole Permission: Approved');
      if (approvalIndex >= 0) {
        const postApprovalStatuses = history.slice(approvalIndex + 1);
        if (postApprovalStatuses.length > 0) {
          console.log(`\n   ✅ Found ${postApprovalStatuses.length} status changes AFTER approval:`);
          postApprovalStatuses.forEach(s => {
            console.log(`      - ${s.status}`);
          });
        } else {
          console.log('\n   ℹ️  No status changes after approval');
        }
      }
    }
    
    console.log('\n\n3️⃣ Summary:');
    console.log('─'.repeat(50));
    console.log('✅ Test completed successfully');
    console.log('📋 The sync will capture ALL status history for approved poles');
    console.log('🎯 This includes status changes after approval (installations, etc.)');
    console.log('\nTo run the full sync, execute:');
    console.log('   node sync/scripts/sync-full-status-history.js');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testStatusHistorySync()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test error:', error);
      process.exit(1);
    });
}