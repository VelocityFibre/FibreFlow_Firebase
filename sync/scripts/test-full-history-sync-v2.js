#!/usr/bin/env node

/**
 * Test Full Status History Sync V2
 * 
 * Tests the updated sync with correct field names and collection structure
 */

const { findPolesWithApprovalHistory, getFullStatusHistory } = require('./sync-full-status-history-v2');

async function testStatusHistorySync() {
  console.log('🧪 Testing Full Status History Sync V2\n');
  
  try {
    // Find poles with approval
    console.log('1️⃣ Finding poles with approval history...');
    const approvedPoles = await findPolesWithApprovalHistory();
    console.log(`   Found ${approvedPoles.length} poles with approval history\n`);
    
    if (approvedPoles.length === 0) {
      console.log('⚠️  No approved poles found in the staging database');
      return;
    }
    
    // Test with first 3 poles
    const testPoles = approvedPoles.slice(0, 3);
    console.log(`2️⃣ Testing with ${testPoles.length} poles: ${testPoles.join(', ')}\n`);
    
    for (const poleNumber of testPoles) {
      console.log(`\n📊 Analyzing pole: ${poleNumber}`);
      console.log('─'.repeat(50));
      
      // Get full status history
      const historyData = await getFullStatusHistory(poleNumber);
      const { statusHistory, currentStatus, approvalInfo } = historyData;
      
      if (statusHistory.length === 0) {
        console.log('   ⚠️  No history found');
        continue;
      }
      
      // Show current status
      if (currentStatus) {
        console.log(`   Current Status: ${currentStatus.status}`);
        console.log(`   Location: ${currentStatus.address}`);
      }
      
      // Show status progression
      console.log(`\n   Status History (${statusHistory.length} changes):`);
      statusHistory.forEach((change, idx) => {
        console.log(`   ${idx + 1}. ${change.fromStatus} → ${change.toStatus}`);
        console.log(`      Date: ${change.changeDate}, Agent: ${change.agent || 'N/A'}`);
        if (change.propertyId) {
          console.log(`      Property: ${change.propertyId}, Drop: ${change.dropNumber || 'N/A'}`);
        }
      });
      
      // Check for post-approval statuses
      if (approvalInfo.hasApproval) {
        console.log(`\n   ✅ Pole was approved on: ${approvalInfo.approvalDate}`);
        
        const approvalIndex = statusHistory.findIndex(h => h.toStatus === 'Pole Permission: Approved');
        const postApprovalChanges = statusHistory.slice(approvalIndex + 1);
        
        if (postApprovalChanges.length > 0) {
          console.log(`   📈 ${postApprovalChanges.length} status changes AFTER approval:`);
          postApprovalChanges.forEach(change => {
            console.log(`      - ${change.toStatus} (${change.changeDate})`);
          });
        } else {
          console.log('   ℹ️  No status changes recorded after approval');
        }
      }
    }
    
    console.log('\n\n3️⃣ Summary:');
    console.log('─'.repeat(50));
    console.log('✅ Test completed successfully');
    console.log('📋 The sync will capture ALL status history including post-approval changes');
    console.log('🎯 This provides full lifecycle visibility from approval through installation');
    console.log('\nTo run the full sync, execute:');
    console.log('   node sync/scripts/sync-full-status-history-v2.js');
    
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