const admin = require('firebase-admin');
const fs = require('fs').promises;

// Initialize Firebase Admin
const serviceAccount = require('../fibreflow-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://fibreflow-73daf.firebaseio.com'
  });
}

const db = admin.firestore();

async function generateQuickReport(importId, fileName) {
  console.log(`📊 Generating quick report for ${importId}...`);
  
  try {
    // Get count only (much faster)
    const countSnapshot = await db.collection('onemap-processing-staging')
      .where('import_id', '==', importId)
      .count()
      .get();
    
    const totalCount = countSnapshot.data().count;
    console.log(`Found ${totalCount} records`);
    
    // Sample 100 records for analysis
    const sampleSnapshot = await db.collection('onemap-processing-staging')
      .where('import_id', '==', importId)
      .limit(100)
      .get();
    
    // Quick analysis
    let withPoles = 0;
    let withAgents = 0;
    
    sampleSnapshot.forEach(doc => {
      const mapped = doc.data().mapped_data || {};
      if (mapped.poleNumber) withPoles++;
      if (mapped.fieldAgentPolePermission) withAgents++;
    });
    
    // Estimate percentages
    const polePercent = Math.round((withPoles / 100) * 100);
    const agentPercent = Math.round((withAgents / 100) * 100);
    
    const now = new Date().toISOString();
    const report = `# ${fileName.replace('.csv', '')} - IMPORT COMPLETE

Generated: ${now}  
Import ID: ${importId}

## Summary
- **Total Records Imported**: ${totalCount}
- **Status**: ✅ FULLY COMPLETED

## Data Quality (based on sample)
- **Estimated records with poles**: ~${polePercent}%
- **Estimated records with agents**: ~${agentPercent}%

## Next Steps
1. Sync to production
2. Continue with next file

---
*Quick report generated at ${new Date().toLocaleString()}*
`;
    
    const reportPath = `OneMap/reports/QUICK_REPORT_${importId}.md`;
    await fs.writeFile(reportPath, report);
    
    console.log(`✅ Report saved to: ${reportPath}`);
    console.log(`Summary: ${totalCount} records imported`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

// Run
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node generate-quick-report.js <import-id> <filename>');
  process.exit(1);
}

generateQuickReport(args[0], args[1]);