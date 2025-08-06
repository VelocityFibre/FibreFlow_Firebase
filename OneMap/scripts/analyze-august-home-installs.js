const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const augustPath = path.join(__dirname, '../downloads/august-2025');
const augustFiles = [
  '1754294879962_Lawley August Week 1 01082025.csv',
  '1754294986426_Lawley August Week 1 02082025.csv',
  '1754295169323_Lawley August Week 1 03082025.csv',
  '1754374822777_Lawley August Week 1 04082025.csv'
];

// Track properties and their status history
const propertyStatusMap = new Map();
const installsWithoutSignup = [];
const headerValidation = [];

async function analyzeFile(filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(augustPath, filename);
    const fileDate = filename.match(/(\d{2})082025/)?.[1] || 'Unknown';
    
    console.log(`\n📄 Analyzing ${filename} (August ${fileDate}, 2025)...`);
    
    let rowCount = 0;
    let headers = null;
    let homeInstallsInProgress = 0;
    let homeInstallsComplete = 0;
    let homeSignUps = 0;
    
    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headerList) => {
        headers = headerList;
        headerValidation.push({
          file: filename,
          headers: headerList,
          hasRequiredFields: validateHeaders(headerList)
        });
      })
      .on('data', (row) => {
        rowCount++;
        
        const propertyId = row['Property ID'];
        const dropNumber = row['Drop Number'];
        const status = row['Status'];
        const flowNameGroups = row['Flow Name Groups'] || '';
        const address = row['Address'] || row['Location Address'] || '';
        
        // Track all statuses for this property
        if (!propertyStatusMap.has(propertyId)) {
          propertyStatusMap.set(propertyId, {
            propertyId,
            dropNumber,
            address,
            statuses: new Set(),
            flowHistory: new Set(),
            firstSeen: filename,
            lastSeen: filename
          });
        }
        
        const propertyData = propertyStatusMap.get(propertyId);
        propertyData.statuses.add(status);
        propertyData.lastSeen = filename;
        
        // Parse flow history
        if (flowNameGroups) {
          const flows = flowNameGroups.split(',').map(f => f.trim());
          flows.forEach(flow => propertyData.flowHistory.add(flow));
        }
        
        // Count status types
        if (status === 'Home Installation: In Progress') {
          homeInstallsInProgress++;
        } else if (status === 'Home Installation: Installed' || status === 'Home Installation: Complete') {
          homeInstallsComplete++;
        } else if (status && status.includes('Home Sign Ups')) {
          homeSignUps++;
        }
        
        // Check for installs without signup
        if ((status === 'Home Installation: In Progress' || 
             status === 'Home Installation: Installed' ||
             status === 'Home Installation: Complete')) {
          
          const hasSignup = flowNameGroups.includes('Home Sign Ups') || 
                           Array.from(propertyData.statuses).some(s => s.includes('Home Sign Ups'));
          
          if (!hasSignup) {
            installsWithoutSignup.push({
              file: filename,
              date: `August ${fileDate}, 2025`,
              propertyId,
              dropNumber,
              address,
              status,
              flowNameGroups
            });
          }
        }
      })
      .on('end', () => {
        console.log(`✅ Processed ${rowCount} rows`);
        console.log(`   - Home Installations In Progress: ${homeInstallsInProgress}`);
        console.log(`   - Home Installations Complete: ${homeInstallsComplete}`);
        console.log(`   - Home Sign Ups: ${homeSignUps}`);
        resolve({ filename, rowCount, homeInstallsInProgress, homeInstallsComplete, homeSignUps });
      })
      .on('error', reject);
  });
}

function validateHeaders(headers) {
  const requiredFields = [
    'Property ID',
    'Drop Number',
    'Status',
    'Flow Name Groups',
    'Address'
  ];
  
  const missingFields = requiredFields.filter(field => 
    !headers.some(h => h.includes(field) || (field === 'Address' && h.includes('Location')))
  );
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    totalHeaders: headers.length
  };
}

async function analyzeAllFiles() {
  console.log('🔍 Analyzing August 2025 OneMap Files for Home Installs without SignUps...\n');
  
  const results = [];
  
  // Process each file
  for (const filename of augustFiles) {
    try {
      const result = await analyzeFile(filename);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
  }
  
  // Generate report
  console.log('\n' + '='.repeat(80));
  console.log('📊 ANALYSIS SUMMARY - HOME INSTALLS WITHOUT SIGNUPS');
  console.log('='.repeat(80));
  
  // Header validation
  console.log('\n1️⃣ CSV STRUCTURE VALIDATION:');
  headerValidation.forEach(({ file, headers, hasRequiredFields }) => {
    console.log(`\n   ${file}:`);
    console.log(`   - Total headers: ${headers.length}`);
    console.log(`   - Required fields: ${hasRequiredFields.isValid ? '✅ All present' : '❌ Missing: ' + hasRequiredFields.missingFields.join(', ')}`);
    if (!hasRequiredFields.isValid) {
      console.log(`   - Headers found: ${headers.slice(0, 5).join(', ')}...`);
    }
  });
  
  // Installs without signup
  console.log('\n2️⃣ HOME INSTALLS WITHOUT HOME SIGNUPS:');
  console.log(`   Total found: ${installsWithoutSignup.length}`);
  
  if (installsWithoutSignup.length > 0) {
    console.log('\n   Detailed List:');
    console.log('   ' + '-'.repeat(100));
    
    // Group by status
    const byStatus = {};
    installsWithoutSignup.forEach(record => {
      if (!byStatus[record.status]) {
        byStatus[record.status] = [];
      }
      byStatus[record.status].push(record);
    });
    
    Object.entries(byStatus).forEach(([status, records]) => {
      console.log(`\n   ${status} (${records.length} properties):`);
      records.slice(0, 10).forEach(record => {
        console.log(`   - Property: ${record.propertyId} | Drop: ${record.dropNumber || 'N/A'}`);
        console.log(`     Address: ${record.address}`);
        console.log(`     File: ${record.file} (${record.date})`);
        console.log(`     Flow History: ${record.flowNameGroups || 'None'}`);
      });
      if (records.length > 10) {
        console.log(`   ... and ${records.length - 10} more`);
      }
    });
  }
  
  // Overall statistics
  console.log('\n3️⃣ OVERALL STATISTICS:');
  const totalRows = results.reduce((sum, r) => sum + r.rowCount, 0);
  const totalInProgress = results.reduce((sum, r) => sum + r.homeInstallsInProgress, 0);
  const totalComplete = results.reduce((sum, r) => sum + r.homeInstallsComplete, 0);
  const totalSignups = results.reduce((sum, r) => sum + r.homeSignUps, 0);
  
  console.log(`   - Total records processed: ${totalRows.toLocaleString()}`);
  console.log(`   - Unique properties tracked: ${propertyStatusMap.size.toLocaleString()}`);
  console.log(`   - Home Installs In Progress: ${totalInProgress.toLocaleString()}`);
  console.log(`   - Home Installs Complete: ${totalComplete.toLocaleString()}`);
  console.log(`   - Home Sign Ups: ${totalSignups.toLocaleString()}`);
  console.log(`   - Installs without SignUp: ${installsWithoutSignup.length} (${((installsWithoutSignup.length / (totalInProgress + totalComplete)) * 100).toFixed(1)}%)`);
  
  // Export results
  const reportPath = path.join(augustPath, 'HOME_INSTALLS_WITHOUT_SIGNUP_REPORT.csv');
  const csvContent = [
    'Property ID,Drop Number,Address,Status,Date,File,Flow History',
    ...installsWithoutSignup.map(r => 
      `"${r.propertyId}","${r.dropNumber || ''}","${r.address}","${r.status}","${r.date}","${r.file}","${r.flowNameGroups || ''}"`
    )
  ].join('\n');
  
  fs.writeFileSync(reportPath, csvContent);
  console.log(`\n📁 Detailed report saved to: ${reportPath}`);
}

// Run analysis
analyzeAllFiles().catch(console.error);