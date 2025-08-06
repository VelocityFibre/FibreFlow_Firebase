const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

// Initialize admin SDK for vf-onemap-data
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'vf-onemap-data'
});

const db = admin.firestore();

async function analyzePropertyStatusHistory() {
  console.log('Analyzing property status history in vf-onemap-data...\n');
  
  try {
    // First check if properties collection exists
    const propertiesSnapshot = await db.collection('properties')
      .limit(100)
      .get();
    
    console.log(`Found ${propertiesSnapshot.size} properties in initial batch\n`);
    
    if (propertiesSnapshot.size === 0) {
      console.log('No properties found in the database.');
      process.exit(0);
    }
    
    // Look for properties with statusHistory array
    let propertiesWithHistory = [];
    let sampleProperty = null;
    
    propertiesSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Show first property structure as sample
      if (!sampleProperty) {
        sampleProperty = {
          id: doc.id,
          fields: Object.keys(data)
        };
      }
      
      // Check if property has statusHistory
      if (data.statusHistory && Array.isArray(data.statusHistory) && data.statusHistory.length > 0) {
        propertiesWithHistory.push({
          id: doc.id,
          statusCount: data.statusHistory.length,
          currentStatus: data.currentStatus || data.status || 'Unknown',
          statusHistory: data.statusHistory
        });
      }
    });
    
    console.log('Sample property structure:');
    console.log(`Property ID: ${sampleProperty.id}`);
    console.log('Fields:', sampleProperty.fields.join(', '));
    console.log('');
    
    if (propertiesWithHistory.length === 0) {
      console.log('No properties found with statusHistory array.');
      
      // Let's check if there's a different structure
      console.log('\nChecking for alternative status tracking...\n');
      
      // Look for any status-related fields
      const statusFields = new Set();
      propertiesSnapshot.forEach(doc => {
        const data = doc.data();
        Object.keys(data).forEach(key => {
          if (key.toLowerCase().includes('status')) {
            statusFields.add(key);
          }
        });
      });
      
      console.log('Status-related fields found:', Array.from(statusFields));
      
      // Show a few properties with their status fields
      console.log('\nSample properties with status data:');
      let count = 0;
      propertiesSnapshot.forEach(doc => {
        if (count >= 5) return;
        const data = doc.data();
        const statusData = {};
        Array.from(statusFields).forEach(field => {
          if (data[field]) {
            statusData[field] = data[field];
          }
        });
        
        if (Object.keys(statusData).length > 0) {
          console.log(`\nProperty ${doc.id}:`);
          console.log(JSON.stringify(statusData, null, 2));
          count++;
        }
      });
      
    } else {
      // Sort by number of status changes
      propertiesWithHistory.sort((a, b) => b.statusCount - a.statusCount);
      
      console.log(`\nFound ${propertiesWithHistory.length} properties with status history\n`);
      
      // Show top 5 properties with most changes
      console.log('Properties with multiple status changes:\n');
      
      propertiesWithHistory.slice(0, 5).forEach((prop, index) => {
        console.log(`${index + 1}. Property ID: ${prop.id}`);
        console.log(`   Current Status: ${prop.currentStatus}`);
        console.log(`   Total Status Changes: ${prop.statusCount}`);
        console.log('   Status History:');
        
        prop.statusHistory.forEach((status, idx) => {
          const date = status.timestamp ? 
            new Date(status.timestamp._seconds * 1000).toISOString().split('T')[0] : 
            (status.date || 'No date');
          const statusValue = status.status || status.value || 'Unknown';
          console.log(`     ${idx + 1}. [${date}] ${statusValue}`);
        });
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

analyzePropertyStatusHistory();