const admin = require('firebase-admin');
const serviceAccount = require('../fibreflow-service-account.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testPoleData() {
  try {
    console.log('Testing pole data in planned-poles collection...\n');
    
    // Get total count
    const totalSnapshot = await db.collection('planned-poles').count().get();
    console.log(`Total poles in database: ${totalSnapshot.data().count}`);
    
    // Get status breakdown
    const statuses = ['planned', 'assigned', 'in_progress', 'installed', 'verified', 'rejected', 'cancelled'];
    console.log('\nStatus breakdown:');
    
    for (const status of statuses) {
      const snapshot = await db.collection('planned-poles').where('status', '==', status).count().get();
      console.log(`  ${status}: ${snapshot.data().count}`);
    }
    
    // Get sample pole data
    console.log('\nSample pole data:');
    const sampleSnapshot = await db.collection('planned-poles').limit(3).get();
    
    sampleSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nPole ID: ${doc.id}`);
      console.log(`  Pole Number: ${data.clientPoleNumber || data.poleNumber || 'N/A'}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Project: ${data.projectName || 'N/A'}`);
      console.log(`  Contractor: ${data.assignedContractorName || 'N/A'}`);
    });
    
    // Test the analytics calculations
    console.log('\n\nTesting Analytics Calculations:');
    
    // Get all poles for calculations
    const allPolesSnapshot = await db.collection('planned-poles').get();
    const poles = allPolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calculate completion percentage
    const installedCount = poles.filter(p => p.status === 'installed' || p.status === 'verified').length;
    const completionPercentage = poles.length > 0 ? (installedCount / poles.length) * 100 : 0;
    
    console.log(`\nTotal poles: ${poles.length}`);
    console.log(`Completed poles: ${installedCount}`);
    console.log(`Completion percentage: ${completionPercentage.toFixed(2)}%`);
    
    // Calculate contractor performance
    const contractorMap = new Map();
    poles.forEach(pole => {
      if (pole.assignedContractorId) {
        if (!contractorMap.has(pole.assignedContractorId)) {
          contractorMap.set(pole.assignedContractorId, {
            name: pole.assignedContractorName || 'Unknown',
            assigned: 0,
            completed: 0
          });
        }
        const contractor = contractorMap.get(pole.assignedContractorId);
        contractor.assigned++;
        if (pole.status === 'installed' || pole.status === 'verified') {
          contractor.completed++;
        }
      }
    });
    
    console.log('\nContractor Performance:');
    contractorMap.forEach(contractor => {
      const completionRate = contractor.assigned > 0 ? (contractor.completed / contractor.assigned) * 100 : 0;
      console.log(`  ${contractor.name}: ${contractor.completed}/${contractor.assigned} (${completionRate.toFixed(1)}%)`);
    });
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('Error testing pole data:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testPoleData();