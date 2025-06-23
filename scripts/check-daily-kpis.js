const admin = require('firebase-admin');

// Initialize with default credentials (requires GOOGLE_APPLICATION_CREDENTIALS env var)
// or run with: firebase emulators:exec "node scripts/check-daily-kpis.js"
admin.initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function checkDailyKPIs() {
  console.log('Checking Daily KPIs data...\n');
  
  try {
    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    console.log(`Found ${projectsSnapshot.size} projects\n`);
    
    for (const projectDoc of projectsSnapshot.docs) {
      const project = projectDoc.data();
      console.log(`\nProject: ${project.name} (ID: ${projectDoc.id})`);
      console.log('----------------------------------------');
      
      // Get daily-kpis subcollection
      const kpisSnapshot = await db.collection('projects')
        .doc(projectDoc.id)
        .collection('daily-kpis')
        .orderBy('date', 'desc')
        .limit(5)
        .get();
      
      console.log(`Found ${kpisSnapshot.size} KPI entries`);
      
      if (kpisSnapshot.size > 0) {
        kpisSnapshot.forEach(kpiDoc => {
          const kpi = kpiDoc.data();
          const date = kpi.date ? kpi.date.toDate() : null;
          console.log(`\n  Date: ${date ? date.toLocaleDateString() : 'Unknown'}`);
          console.log(`  ID: ${kpiDoc.id}`);
          
          // Show some key totals
          console.log(`  Permissions Total: ${kpi.permissionsTotal || 0}`);
          console.log(`  Poles Planted Total: ${kpi.polesPlantedTotal || 0}`);
          console.log(`  Home Signups Total: ${kpi.homeSignupsTotal || 0}`);
          console.log(`  Home Drops Total: ${kpi.homeDropsTotal || 0}`);
          console.log(`  Homes Connected Total: ${kpi.homesConnectedTotal || 0}`);
          console.log(`  Trenching Total: ${kpi.trenchingTotal || 0}`);
          
          // Show stringing totals
          const stringingTotal = (kpi.stringing24Total || 0) + 
                                (kpi.stringing48Total || 0) + 
                                (kpi.stringing96Total || 0) + 
                                (kpi.stringing144Total || 0) + 
                                (kpi.stringing288Total || 0);
          console.log(`  Total Stringing: ${stringingTotal}`);
          
          // Show any non-zero values
          console.log('\n  Non-zero values:');
          Object.keys(kpi).forEach(key => {
            if (key.includes('Total') && kpi[key] > 0) {
              console.log(`    ${key}: ${kpi[key]}`);
            }
          });
        });
      } else {
        console.log('  No KPI data found for this project');
      }
    }
  } catch (error) {
    console.error('Error checking daily KPIs:', error);
  } finally {
    admin.app().delete();
  }
}

checkDailyKPIs();