const fs = require('fs');
const path = require('path');

const augustPath = path.join(__dirname, '../downloads/august-2025');
const augustFiles = [
  '1754294879962_Lawley August Week 1 01082025.csv',
  '1754294986426_Lawley August Week 1 02082025.csv',
  '1754295169323_Lawley August Week 1 03082025.csv',
  '1754374822777_Lawley August Week 1 04082025.csv'
];

// Verification checks
const verificationResults = {
  dataIntegrity: [],
  suspiciousPatterns: [],
  spotChecks: [],
  crossFileValidation: [],
  recommendations: []
};

function parseCSVLine(line) {
  return line.split(';').map(val => val.trim());
}

async function performSpotChecks() {
  console.log('🔍 AUGUST DATA VERIFICATION & SPOT CHECKS');
  console.log('='.repeat(80));
  
  // Track properties across files for consistency
  const propertyTracking = new Map();
  const allHeaders = [];
  
  // First pass - collect all data
  for (const filename of augustFiles) {
    const filePath = path.join(augustPath, filename);
    const fileDate = filename.match(/(\d{2})082025/)?.[1] || 'Unknown';
    
    console.log(`\n📄 Analyzing ${filename}...`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    allHeaders.push({ file: filename, headers });
    
    // Get column indices
    const cols = {
      propertyId: headers.findIndex(h => h.includes('Property ID')),
      status: headers.findIndex(h => h === 'Status'),
      dropNumber: headers.findIndex(h => h.includes('Drop Number')),
      poleNumber: headers.findIndex(h => h.includes('Pole Number')),
      flowGroups: headers.findIndex(h => h.includes('Flow Name Groups')),
      address: headers.findIndex(h => h.includes('Location Address')),
      lastModDate: headers.findIndex(h => h.includes('Last Modified Home Sign Ups Date'))
    };
    
    // Process records
    for (let i = 1; i < Math.min(lines.length, 1000); i++) { // Sample first 1000 records
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;
      
      const propertyId = values[cols.propertyId];
      const status = values[cols.status];
      const dropNumber = values[cols.dropNumber];
      const poleNumber = values[cols.poleNumber];
      const flowGroups = values[cols.flowGroups];
      const address = values[cols.address];
      const lastModDate = values[cols.lastModDate];
      
      if (!propertyTracking.has(propertyId)) {
        propertyTracking.set(propertyId, []);
      }
      
      propertyTracking.get(propertyId).push({
        file: filename,
        date: fileDate,
        status,
        dropNumber,
        poleNumber,
        flowGroups,
        address,
        lastModDate
      });
    }
  }
  
  // 1. DATA INTEGRITY CHECKS
  console.log('\n1️⃣ DATA INTEGRITY CHECKS:');
  
  // Check header consistency
  const firstHeaders = allHeaders[0].headers;
  let headerConsistent = true;
  allHeaders.forEach(({ file, headers }) => {
    if (headers.length !== firstHeaders.length) {
      headerConsistent = false;
      verificationResults.dataIntegrity.push({
        issue: 'Header count mismatch',
        file,
        expected: firstHeaders.length,
        actual: headers.length
      });
    }
  });
  console.log(`   Header Consistency: ${headerConsistent ? '✅ All files have same structure' : '❌ Structure mismatch'}`);
  
  // 2. SUSPICIOUS PATTERNS
  console.log('\n2️⃣ SUSPICIOUS PATTERN DETECTION:');
  
  let installsWithoutSignup = 0;
  let propertiesWithMultipleDrops = 0;
  let statusChangesBackwards = 0;
  
  propertyTracking.forEach((records, propertyId) => {
    // Check for installs without signup
    const hasInstall = records.some(r => r.status?.includes('Home Installation'));
    const hasSignup = records.some(r => r.flowGroups?.includes('Home Sign Ups'));
    if (hasInstall && !hasSignup) {
      installsWithoutSignup++;
    }
    
    // Check for multiple drops
    const uniqueDrops = new Set(records.map(r => r.dropNumber).filter(d => d));
    if (uniqueDrops.size > 1) {
      propertiesWithMultipleDrops++;
      verificationResults.suspiciousPatterns.push({
        propertyId,
        issue: 'Multiple drop numbers',
        drops: Array.from(uniqueDrops)
      });
    }
    
    // Check for status regression
    const statuses = records.map(r => r.status);
    for (let i = 1; i < statuses.length; i++) {
      if (statuses[i] === 'Home Sign Ups: Approved' && 
          statuses[i-1]?.includes('Home Installation')) {
        statusChangesBackwards++;
        verificationResults.suspiciousPatterns.push({
          propertyId,
          issue: 'Status went backwards',
          from: statuses[i-1],
          to: statuses[i]
        });
      }
    }
  });
  
  console.log(`   Installs without Signup: ${installsWithoutSignup} properties`);
  console.log(`   Properties with Multiple Drops: ${propertiesWithMultipleDrops}`);
  console.log(`   Backwards Status Changes: ${statusChangesBackwards}`);
  
  // 3. SPOT CHECKS - Random samples
  console.log('\n3️⃣ RANDOM SPOT CHECKS (10 samples):');
  
  const propertyIds = Array.from(propertyTracking.keys());
  const sampleSize = Math.min(10, propertyIds.length);
  
  for (let i = 0; i < sampleSize; i++) {
    const randomId = propertyIds[Math.floor(Math.random() * propertyIds.length)];
    const records = propertyTracking.get(randomId);
    
    console.log(`\n   Property ${randomId}:`);
    console.log(`   Address: ${records[0].address}`);
    console.log(`   Records found: ${records.length}`);
    
    records.forEach(r => {
      console.log(`     - ${r.date}/08: ${r.status} | Drop: ${r.dropNumber || 'None'} | Pole: ${r.poleNumber || 'None'}`);
    });
    
    verificationResults.spotChecks.push({
      propertyId: randomId,
      recordCount: records.length,
      statuses: records.map(r => r.status),
      consistent: records.every(r => r.address === records[0].address)
    });
  }
  
  // 4. CROSS-FILE VALIDATION
  console.log('\n4️⃣ CROSS-FILE VALIDATION:');
  
  let consistentProperties = 0;
  let inconsistentProperties = 0;
  
  propertyTracking.forEach((records, propertyId) => {
    if (records.length > 1) {
      // Check if address is consistent across files
      const addresses = new Set(records.map(r => r.address));
      if (addresses.size === 1) {
        consistentProperties++;
      } else {
        inconsistentProperties++;
        if (inconsistentProperties <= 5) { // Show first 5
          verificationResults.crossFileValidation.push({
            propertyId,
            issue: 'Address changed between files',
            addresses: Array.from(addresses)
          });
        }
      }
    }
  });
  
  console.log(`   Properties with consistent data: ${consistentProperties}`);
  console.log(`   Properties with inconsistencies: ${inconsistentProperties}`);
  
  // 5. DATA QUALITY METRICS
  console.log('\n5️⃣ DATA QUALITY METRICS:');
  
  let totalRecords = 0;
  let recordsWithDrops = 0;
  let recordsWithPoles = 0;
  let recordsWithFlowHistory = 0;
  
  propertyTracking.forEach((records) => {
    records.forEach(r => {
      totalRecords++;
      if (r.dropNumber) recordsWithDrops++;
      if (r.poleNumber) recordsWithPoles++;
      if (r.flowGroups) recordsWithFlowHistory++;
    });
  });
  
  console.log(`   Drop Number Coverage: ${(recordsWithDrops/totalRecords*100).toFixed(1)}%`);
  console.log(`   Pole Number Coverage: ${(recordsWithPoles/totalRecords*100).toFixed(1)}%`);
  console.log(`   Flow History Coverage: ${(recordsWithFlowHistory/totalRecords*100).toFixed(1)}%`);
  
  // 6. RECOMMENDATIONS
  console.log('\n6️⃣ VERIFICATION RECOMMENDATIONS:');
  
  if (installsWithoutSignup > 100) {
    console.log(`   ⚠️  High number of installs without signups (${installsWithoutSignup}) - needs investigation`);
    verificationResults.recommendations.push('Investigate Home Installations without Sign Ups');
  }
  
  if (propertiesWithMultipleDrops > 50) {
    console.log(`   ⚠️  Many properties have multiple drop numbers - verify drop assignment logic`);
    verificationResults.recommendations.push('Review drop number assignment process');
  }
  
  if (inconsistentProperties > 10) {
    console.log(`   ⚠️  Address inconsistencies detected - verify data source`);
    verificationResults.recommendations.push('Check for address standardization issues');
  }
  
  if (headerConsistent && consistentProperties > inconsistentProperties) {
    console.log(`   ✅ Data structure is consistent - safe to proceed with import`);
    verificationResults.recommendations.push('Data verified - proceed with import');
  }
  
  // Save verification report
  const reportPath = path.join(augustPath, 'VERIFICATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(verificationResults, null, 2));
  
  console.log(`\n📁 Detailed verification report saved to: ${reportPath}`);
  
  // Create human-readable summary
  const summaryPath = path.join(augustPath, 'VERIFICATION_SUMMARY.md');
  const summary = `# August 2025 Data Verification Summary

**Date**: ${new Date().toISOString()}

## Overall Assessment
${verificationResults.recommendations.includes('Data verified - proceed with import') ? '✅ **PASSED** - Data is ready for import' : '⚠️ **NEEDS REVIEW** - Issues found'}

## Key Findings
- **Installs without Signup**: ${installsWithoutSignup} properties
- **Multiple Drop Numbers**: ${propertiesWithMultipleDrops} properties  
- **Address Inconsistencies**: ${inconsistentProperties} properties
- **Drop Coverage**: ${(recordsWithDrops/totalRecords*100).toFixed(1)}%
- **Pole Coverage**: ${(recordsWithPoles/totalRecords*100).toFixed(1)}%

## Suspicious Patterns Found
${verificationResults.suspiciousPatterns.slice(0, 5).map(p => 
  `- Property ${p.propertyId}: ${p.issue} ${p.drops ? '(' + p.drops.join(', ') + ')' : ''}`
).join('\n')}

## Recommendations
${verificationResults.recommendations.map(r => `- ${r}`).join('\n')}

## Next Steps
1. Review properties with multiple drop numbers
2. Investigate installations without signups
3. Verify address standardization
4. Proceed with import if all checks pass
`;
  
  fs.writeFileSync(summaryPath, summary);
  console.log(`📄 Verification summary saved to: ${summaryPath}\n`);
}

// Run verification
performSpotChecks().catch(console.error);