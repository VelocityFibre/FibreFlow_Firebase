const fs = require('fs');
const path = require('path');

const augustPath = path.join(__dirname, '../downloads/august-2025');
const augustFiles = [
  '1754294879962_Lawley August Week 1 01082025.csv',
  '1754294986426_Lawley August Week 1 02082025.csv', 
  '1754295169323_Lawley August Week 1 03082025.csv',
  '1754374822777_Lawley August Week 1 04082025.csv'
];

// Track all findings
const installsWithoutSignup = [];
const propertyStatusTracking = new Map();
let totalRows = 0;
let totalHomeInstalls = 0;
let totalHomeSignups = 0;

function parseCSVLine(line) {
  // Split by semicolon delimiter
  return line.split(';').map(val => val.trim());
}

function analyzeFile(filename) {
  return new Promise((resolve) => {
    const filePath = path.join(augustPath, filename);
    const fileDate = filename.match(/(\d{2})082025/)?.[1] || 'Unknown';
    
    console.log(`\n📄 Analyzing ${filename} (August ${fileDate}, 2025)...`);
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // Parse headers (first line)
    const headers = parseCSVLine(lines[0]);
    
    // Find column indices
    const propertyIdIdx = headers.findIndex(h => h.includes('Property ID'));
    const dropNumberIdx = headers.findIndex(h => h.includes('Drop Number'));
    const statusIdx = headers.findIndex(h => h === 'Status');
    const flowNameGroupsIdx = headers.findIndex(h => h.includes('Flow Name Groups'));
    const addressIdx = headers.findIndex(h => h.includes('Location Address'));
    const poleNumberIdx = headers.findIndex(h => h.includes('Pole Number'));
    
    console.log(`   Headers found: ${headers.length}`);
    console.log(`   Status column index: ${statusIdx}`);
    
    let rowCount = 0;
    let fileHomeInstalls = 0;
    let fileHomeSignups = 0;
    let fileInstallsNoSignup = 0;
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;
      
      rowCount++;
      totalRows++;
      
      const propertyId = values[propertyIdIdx] || '';
      const dropNumber = values[dropNumberIdx] || '';
      const status = values[statusIdx] || '';
      const flowNameGroups = values[flowNameGroupsIdx] || '';
      const address = values[addressIdx] || '';
      const poleNumber = values[poleNumberIdx] || '';
      
      // Track property status history
      if (!propertyStatusTracking.has(propertyId)) {
        propertyStatusTracking.set(propertyId, {
          propertyId,
          dropNumber,
          address,
          poleNumber,
          statuses: new Set(),
          flowHistory: new Set(),
          hasHomeSignup: false,
          hasHomeInstall: false
        });
      }
      
      const property = propertyStatusTracking.get(propertyId);
      property.statuses.add(status);
      
      // Parse flow history
      if (flowNameGroups) {
        const flows = flowNameGroups.split(',').map(f => f.trim());
        flows.forEach(flow => {
          property.flowHistory.add(flow);
          if (flow.includes('Home Sign Ups')) {
            property.hasHomeSignup = true;
          }
        });
      }
      
      // Check current status
      if (status.includes('Home Sign Ups')) {
        fileHomeSignups++;
        totalHomeSignups++;
        property.hasHomeSignup = true;
      }
      
      if (status.includes('Home Installation:')) {
        fileHomeInstalls++;
        totalHomeInstalls++;
        property.hasHomeInstall = true;
        
        // Check if this install has a signup
        const hasSignupInFlow = flowNameGroups.includes('Home Sign Ups');
        const hasSignupInHistory = property.hasHomeSignup;
        
        if (!hasSignupInFlow && !hasSignupInHistory) {
          fileInstallsNoSignup++;
          installsWithoutSignup.push({
            file: filename,
            date: `August ${fileDate}, 2025`,
            propertyId,
            dropNumber,
            poleNumber,
            address,
            status,
            flowNameGroups
          });
        }
      }
    }
    
    console.log(`   Processed ${rowCount} rows`);
    console.log(`   Home Installations: ${fileHomeInstalls}`);
    console.log(`   Home Sign Ups: ${fileHomeSignups}`);
    console.log(`   Installs without Signup: ${fileInstallsNoSignup}`);
    
    resolve({
      filename,
      rowCount,
      homeInstalls: fileHomeInstalls,
      homeSignups: fileHomeSignups,
      installsNoSignup: fileInstallsNoSignup
    });
  });
}

async function runAnalysis() {
  console.log('🔍 AUGUST 2025 ANALYSIS: Home Installations without Home Sign Ups');
  console.log('='.repeat(80));
  
  const results = [];
  
  // Analyze each file
  for (const filename of augustFiles) {
    try {
      const result = await analyzeFile(filename);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
  }
  
  // Summary Report
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL SUMMARY REPORT');
  console.log('='.repeat(80));
  
  console.log('\n1️⃣ OVERALL STATISTICS:');
  console.log(`   Total records processed: ${totalRows.toLocaleString()}`);
  console.log(`   Unique properties tracked: ${propertyStatusTracking.size.toLocaleString()}`);
  console.log(`   Total Home Installations: ${totalHomeInstalls}`);
  console.log(`   Total Home Sign Ups: ${totalHomeSignups}`);
  console.log(`   Installations without Sign Up: ${installsWithoutSignup.length}`);
  
  if (installsWithoutSignup.length > 0) {
    console.log('\n2️⃣ HOME INSTALLATIONS WITHOUT SIGN UPS:');
    console.log(`   Found ${installsWithoutSignup.length} cases\n`);
    
    // Group by status type
    const byStatus = {};
    installsWithoutSignup.forEach(record => {
      if (!byStatus[record.status]) {
        byStatus[record.status] = [];
      }
      byStatus[record.status].push(record);
    });
    
    Object.entries(byStatus).forEach(([status, records]) => {
      console.log(`   ${status}: ${records.length} properties`);
      
      // Show first 5 examples
      records.slice(0, 5).forEach(record => {
        console.log(`\n   Property ID: ${record.propertyId}`);
        console.log(`   Drop: ${record.dropNumber || 'No drop number'}`);
        console.log(`   Pole: ${record.poleNumber || 'No pole number'}`);
        console.log(`   Address: ${record.address}`);
        console.log(`   File: ${record.file}`);
        console.log(`   Flow History: ${record.flowNameGroups || 'None'}`);
      });
      
      if (records.length > 5) {
        console.log(`\n   ... and ${records.length - 5} more ${status} cases`);
      }
    });
    
    // Export detailed CSV
    const csvPath = path.join(augustPath, 'HOME_INSTALLS_WITHOUT_SIGNUP_AUGUST_2025.csv');
    const csvContent = [
      'Property ID,Drop Number,Pole Number,Address,Status,Date,File,Flow History',
      ...installsWithoutSignup.map(r => 
        `"${r.propertyId}","${r.dropNumber}","${r.poleNumber}","${r.address}","${r.status}","${r.date}","${r.file}","${r.flowNameGroups}"`
      )
    ].join('\n');
    
    fs.writeFileSync(csvPath, csvContent);
    console.log(`\n📁 Detailed CSV report saved to:\n   ${csvPath}`);
  } else {
    console.log('\n✅ GOOD NEWS: No Home Installations found without Home Sign Ups!');
  }
  
  // Check for properties with multiple status changes
  console.log('\n3️⃣ PROPERTIES WITH MULTIPLE STATUS TYPES:');
  let multiStatusCount = 0;
  propertyStatusTracking.forEach((property, propertyId) => {
    if (property.statuses.size > 1) {
      multiStatusCount++;
    }
  });
  console.log(`   Found ${multiStatusCount} properties with multiple status changes`);
}

// Run the analysis
runAnalysis().catch(console.error);