const fs = require('fs');
const path = require('path');

const augustPath = path.join(__dirname, '../downloads/august-2025');

// Read the export file with Home Installs without Signup
const exportFile = path.join(augustPath, 'HOME_INSTALLS_WITHOUT_SIGNUP_AUGUST_2025.csv');

async function analyzeHomeInstallsIssue() {
  console.log('🔍 DEEP DIVE: Home Installations Without Sign Ups Analysis');
  console.log('='.repeat(80));
  
  if (!fs.existsSync(exportFile)) {
    console.error('Export file not found. Run analyze-august-home-installs-semicolon.js first.');
    return;
  }
  
  // Read the problematic records
  const content = fs.readFileSync(exportFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`\nTotal problematic records: ${lines.length - 1}`); // Minus header
  
  // Analyze patterns
  const patterns = {
    byStatus: {},
    byPolePrefix: {},
    byDropPrefix: {},
    noDropNoPole: 0,
    hasDropNoPole: 0,
    hasPoleNoDrop: 0,
    hasBoth: 0,
    byFlowHistory: {
      empty: 0,
      poleOnly: 0,
      installOnly: 0,
      mixed: 0
    }
  };
  
  // Skip header line
  for (let i = 1; i < lines.length && i < 100; i++) { // Analyze first 100
    // Parse CSV line (handle quotes)
    const match = lines[i].match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
    if (!match) continue;
    
    const [_, propertyId, dropNumber, poleNumber, address, status, date, file, flowHistory] = match;
    
    // Count by status
    patterns.byStatus[status] = (patterns.byStatus[status] || 0) + 1;
    
    // Analyze pole patterns
    if (poleNumber) {
      const prefix = poleNumber.split('.')[2]?.[0] || 'Unknown'; // Get letter prefix (A, B, C, etc)
      patterns.byPolePrefix[prefix] = (patterns.byPolePrefix[prefix] || 0) + 1;
    }
    
    // Analyze drop patterns
    if (dropNumber) {
      const prefix = dropNumber.substring(0, 4); // DR17 prefix
      patterns.byDropPrefix[prefix] = (patterns.byDropPrefix[prefix] || 0) + 1;
    }
    
    // Count combinations
    if (!dropNumber && !poleNumber) patterns.noDropNoPole++;
    else if (dropNumber && !poleNumber) patterns.hasDropNoPole++;
    else if (!dropNumber && poleNumber) patterns.hasPoleNoDrop++;
    else if (dropNumber && poleNumber) patterns.hasBoth++;
    
    // Analyze flow history
    if (!flowHistory || flowHistory === 'None') {
      patterns.byFlowHistory.empty++;
    } else if (flowHistory.includes('Pole Permission') && !flowHistory.includes('Home')) {
      patterns.byFlowHistory.poleOnly++;
    } else if (flowHistory.includes('Home Installation') && !flowHistory.includes('Sign')) {
      patterns.byFlowHistory.installOnly++;
    } else {
      patterns.byFlowHistory.mixed++;
    }
    
    // Show examples for each pattern
    if (i <= 20) {
      console.log(`\nExample ${i}:`);
      console.log(`  Property: ${propertyId}`);
      console.log(`  Status: ${status}`);
      console.log(`  Drop: ${dropNumber || 'NONE'} | Pole: ${poleNumber || 'NONE'}`);
      console.log(`  Address: ${address}`);
      console.log(`  Flow History: ${flowHistory || 'EMPTY'}`);
    }
  }
  
  // Summary Analysis
  console.log('\n' + '='.repeat(80));
  console.log('📊 PATTERN ANALYSIS SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n1️⃣ STATUS BREAKDOWN:');
  Object.entries(patterns.byStatus)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
  
  console.log('\n2️⃣ POLE/DROP COMBINATIONS:');
  console.log(`   No Drop + No Pole: ${patterns.noDropNoPole} (${(patterns.noDropNoPole/100*100).toFixed(1)}%)`);
  console.log(`   Has Drop + No Pole: ${patterns.hasDropNoPole} (${(patterns.hasDropNoPole/100*100).toFixed(1)}%)`);
  console.log(`   No Drop + Has Pole: ${patterns.hasPoleNoDrop} (${(patterns.hasPoleNoDrop/100*100).toFixed(1)}%)`);
  console.log(`   Has Both: ${patterns.hasBoth} (${(patterns.hasBoth/100*100).toFixed(1)}%)`);
  
  console.log('\n3️⃣ POLE PREFIX DISTRIBUTION:');
  Object.entries(patterns.byPolePrefix)
    .sort((a, b) => b[1] - a[1])
    .forEach(([prefix, count]) => {
      console.log(`   LAW.P.${prefix}xxx: ${count}`);
    });
  
  console.log('\n4️⃣ FLOW HISTORY PATTERNS:');
  console.log(`   Empty/None: ${patterns.byFlowHistory.empty}`);
  console.log(`   Pole Permission Only: ${patterns.byFlowHistory.poleOnly}`);
  console.log(`   Home Installation Only: ${patterns.byFlowHistory.installOnly}`);
  console.log(`   Mixed History: ${patterns.byFlowHistory.mixed}`);
  
  // Hypothesis Testing
  console.log('\n5️⃣ HYPOTHESIS TESTING:');
  
  if (patterns.noDropNoPole > 50) {
    console.log(`   ⚠️  High number of records without drops or poles - likely early stage captures`);
  }
  
  if (patterns.byFlowHistory.installOnly > 50) {
    console.log(`   ⚠️  Many records show installation but no signup history - possible data migration issue`);
  }
  
  if (patterns.byFlowHistory.empty > 20) {
    console.log(`   ⚠️  Records with empty flow history - might be new workflow not capturing history`);
  }
  
  // Recommendations
  console.log('\n6️⃣ RECOMMENDATIONS:');
  console.log('   1. Investigate properties without drop/pole numbers - are these valid?');
  console.log('   2. Check if "Home Installation: In Progress" can be legitimately set without signup');
  console.log('   3. Verify if flow history tracking was implemented for all workflows');
  console.log('   4. Cross-reference with field teams about installation process');
  
  // Create detailed analysis report
  const analysisReport = `# Deep Analysis: Home Installations Without Sign Ups

**Date**: ${new Date().toISOString()}
**Total Cases**: ${lines.length - 1}

## Key Findings

### Status Distribution
${Object.entries(patterns.byStatus)
  .sort((a, b) => b[1] - a[1])
  .map(([status, count]) => `- ${status}: ${count}`)
  .join('\n')}

### Data Completeness
- Records without Drop or Pole: ${patterns.noDropNoPole} (${(patterns.noDropNoPole/100*100).toFixed(1)}%)
- Records with Drop but no Pole: ${patterns.hasDropNoPole} (${(patterns.hasDropNoPole/100*100).toFixed(1)}%)
- Records with Pole but no Drop: ${patterns.hasPoleNoDrop} (${(patterns.hasPoleNoDrop/100*100).toFixed(1)}%)
- Records with both Drop and Pole: ${patterns.hasBoth} (${(patterns.hasBoth/100*100).toFixed(1)}%)

### Flow History Analysis
- Empty/No History: ${patterns.byFlowHistory.empty}
- Pole Permission Only: ${patterns.byFlowHistory.poleOnly}
- Installation Only: ${patterns.byFlowHistory.installOnly}
- Mixed History: ${patterns.byFlowHistory.mixed}

## Possible Explanations

1. **New Workflow**: Home installations might be starting without formal signups in some cases
2. **Data Migration**: Historical data might not have complete flow history
3. **Field Process**: Teams might be installing without updating signup status first
4. **System Issue**: Flow history tracking might not be capturing all status changes

## Next Steps

1. Contact field teams to understand current installation process
2. Check if business rules allow installations without signups
3. Verify data entry procedures with operations team
4. Consider adding validation to prevent this in future imports
`;
  
  const reportPath = path.join(augustPath, 'HOME_INSTALLS_DEEP_ANALYSIS.md');
  fs.writeFileSync(reportPath, analysisReport);
  console.log(`\n📄 Detailed analysis saved to: ${reportPath}`);
}

// Run analysis
analyzeHomeInstallsIssue().catch(console.error);