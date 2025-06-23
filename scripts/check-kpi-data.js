const admin = require('firebase-admin');
const serviceAccount = require('../functions/service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fibreflow-73daf.firebaseio.com"
});

const db = admin.firestore();

async function checkKPIData() {
  console.log('🔍 Checking KPI data for louistest project...\n');

  try {
    // First, let's find the louistest project
    const projectsSnapshot = await db.collection('projects')
      .where('name', '==', 'louistest')
      .limit(1)
      .get();

    if (projectsSnapshot.empty) {
      console.log('❌ No project found with name "louistest"');
      
      // Let's list all projects to help
      console.log('\n📋 Available projects:');
      const allProjects = await db.collection('projects').get();
      allProjects.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.name} (ID: ${doc.id})`);
      });
      return;
    }

    const projectDoc = projectsSnapshot.docs[0];
    const projectId = projectDoc.id;
    const projectData = projectDoc.data();
    
    console.log(`✅ Found project: ${projectData.name} (ID: ${projectId})\n`);

    // Now let's check for KPI data
    const kpisSnapshot = await db.collection('projects')
      .doc(projectId)
      .collection('daily-kpis')
      .orderBy('date', 'desc')
      .limit(5)
      .get();

    if (kpisSnapshot.empty) {
      console.log('❌ No KPI data found for this project');
      return;
    }

    console.log(`📊 Found ${kpisSnapshot.size} KPI entries. Latest entries:\n`);

    kpisSnapshot.forEach((doc, index) => {
      const data = doc.data();
      const date = data.date ? new Date(data.date.seconds * 1000) : new Date();
      
      console.log(`\n${index + 1}. KPI Entry (ID: ${doc.id})`);
      console.log(`   Date: ${date.toLocaleDateString()}`);
      console.log(`   Submitted by: ${data.submittedByName || 'Unknown'}`);
      console.log(`   Submitted at: ${data.submittedAt ? new Date(data.submittedAt.seconds * 1000).toLocaleString() : 'Unknown'}`);
      
      console.log('\n   📍 Core Activities:');
      console.log(`      - Permissions: Today=${data.permissionsToday || 0}, Total=${data.permissionsTotal || 0}`);
      console.log(`      - Missing Status: Today=${data.missingStatusToday || 0}, Total=${data.missingStatusTotal || 0}`);
      console.log(`      - Poles Planted: Today=${data.polesPlantedToday || 0}, Total=${data.polesPlantedTotal || 0}`);
      
      console.log('\n   🏠 Homes:');
      console.log(`      - Home Signups: Today=${data.homeSignupsToday || 0}, Total=${data.homeSignupsTotal || 0}`);
      console.log(`      - Home Drops: Today=${data.homeDropsToday || 0}, Total=${data.homeDropsTotal || 0}`);
      console.log(`      - Homes Connected: Today=${data.homesConnectedToday || 0}, Total=${data.homesConnectedTotal || 0}`);
      
      console.log('\n   🚧 Civils:');
      console.log(`      - Trenching: Today=${data.trenchingToday || 0}m, Total=${data.trenchingTotal || 0}m`);
      
      console.log('\n   🔗 Cable Stringing:');
      console.log(`      - 24F: Today=${data.stringing24Today || 0}m, Total=${data.stringing24Total || 0}m`);
      console.log(`      - 48F: Today=${data.stringing48Today || 0}m, Total=${data.stringing48Total || 0}m`);
      console.log(`      - 96F: Today=${data.stringing96Today || 0}m, Total=${data.stringing96Total || 0}m`);
      console.log(`      - 144F: Today=${data.stringing144Today || 0}m, Total=${data.stringing144Total || 0}m`);
      console.log(`      - 288F: Today=${data.stringing288Today || 0}m, Total=${data.stringing288Total || 0}m`);
      
      if (data.riskFlag) {
        console.log('\n   ⚠️  Risk Flag: ACTIVE');
      }
      
      if (data.comments) {
        console.log(`\n   💬 Comments: ${data.comments}`);
      }
      
      if (data.keyIssuesSummary) {
        console.log(`\n   🔴 Key Issues: ${data.keyIssuesSummary}`);
      }
      
      console.log('\n   ' + '─'.repeat(50));
    });

    // Calculate totals across all entries
    console.log('\n📈 CUMULATIVE TOTALS:');
    
    const latestEntry = kpisSnapshot.docs[0].data();
    console.log(`   - Permissions: ${latestEntry.permissionsTotal || 0}`);
    console.log(`   - Missing Status: ${latestEntry.missingStatusTotal || 0}`);
    console.log(`   - Poles Planted: ${latestEntry.polesPlantedTotal || 0}`);
    console.log(`   - Home Signups: ${latestEntry.homeSignupsTotal || 0}`);
    console.log(`   - Home Drops: ${latestEntry.homeDropsTotal || 0}`);
    console.log(`   - Homes Connected: ${latestEntry.homesConnectedTotal || 0}`);
    console.log(`   - Trenching: ${latestEntry.trenchingTotal || 0}m`);
    console.log(`   - Total Cable Strung: ${
      (latestEntry.stringing24Total || 0) +
      (latestEntry.stringing48Total || 0) +
      (latestEntry.stringing96Total || 0) +
      (latestEntry.stringing144Total || 0) +
      (latestEntry.stringing288Total || 0)
    }m`);

  } catch (error) {
    console.error('❌ Error checking KPI data:', error);
  } finally {
    // Cleanup
    await admin.app().delete();
    process.exit(0);
  }
}

// Run the check
checkKPIData();