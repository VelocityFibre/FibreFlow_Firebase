# OneMap Staging Database Access Guide for Cursor

## Quick Start (5 Minutes)

### 1. API Endpoint
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI
```

### 2. Test Connection (Paste this in Cursor)
```javascript
// Test if API is working
fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI')
  .then(res => res.json())
  .then(data => console.log('API Connected!', data))
  .catch(err => console.error('Connection failed:', err));
```

## Common Tasks in Cursor

### Task 1: Get Overview of Staging Data
```javascript
// Quick summary of what's in staging
async function getStagingSummary() {
  const response = await fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI/summary');
  const data = await response.json();
  
  console.log(`Total Records: ${data.totalRecords}`);
  console.log(`Records with Poles: ${data.recordsWithPoles}`);
  console.log(`Records with Agents: ${data.recordsWithAgents}`);
  console.log(`Data Quality Score: ${data.qualityScore}/100`);
  
  return data;
}

// Run it
getStagingSummary();
```

### Task 2: Find Duplicate Poles
```javascript
// Get all duplicate poles (poles at multiple addresses)
async function findDuplicatePoles() {
  const response = await fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI/duplicates');
  const data = await response.json();
  
  console.log(`Found ${data.totalDuplicatePoles} poles with duplicates`);
  
  // Show top 5 worst offenders
  data.duplicates.slice(0, 5).forEach(dup => {
    console.log(`\nPole ${dup.poleNumber}:`);
    console.log(`- Appears ${dup.count} times`);
    console.log(`- Addresses: ${dup.addresses.join(', ')}`);
    console.log(`- Agents: ${dup.agents.join(', ')}`);
  });
  
  return data;
}

findDuplicatePoles();
```

### Task 3: Search for Specific Data
```javascript
// Search for records by any field
async function searchRecords(field, operator, value) {
  const response = await fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, operator, value, limit: 100 })
  });
  
  const data = await response.json();
  console.log(`Found ${data.count} records matching ${field} ${operator} ${value}`);
  
  return data;
}

// Examples:
// Find all records for a specific pole
searchRecords('poleNumber', '==', 'LAW.P.D721');

// Find records without pole numbers
searchRecords('poleNumber', '==', null);

// Find records by agent
searchRecords('fieldAgent', '==', 'John Doe');
```

### Task 4: Get Data Quality Report
```javascript
// Comprehensive quality analysis
async function getQualityReport() {
  const response = await fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI/quality');
  const report = await response.json();
  
  console.log('=== Data Quality Report ===');
  console.log(`Overall Score: ${report.qualityScore}/100`);
  
  console.log('\nField Completeness:');
  Object.entries(report.fieldCompleteness).forEach(([field, count]) => {
    const percentage = Math.round((count / report.totalRecords) * 100);
    console.log(`- ${field}: ${percentage}% complete (${count}/${report.totalRecords})`);
  });
  
  console.log('\nTop Issues:');
  console.log(`- Missing poles: ${report.dataIssues.missingPoles.length} records`);
  console.log(`- Missing agents: ${report.dataIssues.missingAgents.length} records`);
  
  return report;
}

getQualityReport();
```

### Task 5: Export Data for Analysis
```javascript
// Get all records and export to CSV
async function exportToCSV() {
  // Fetch all records (paginated)
  let allRecords = [];
  let offset = 0;
  const limit = 500;
  
  while (true) {
    const response = await fetch(`https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI/records?limit=${limit}&offset=${offset}`);
    const data = await response.json();
    
    allRecords = allRecords.concat(data.data);
    
    if (!data.pagination.hasMore) break;
    offset += limit;
    
    console.log(`Fetched ${allRecords.length} of ${data.pagination.total} records...`);
  }
  
  // Convert to CSV
  const headers = Object.keys(allRecords[0]).join(',');
  const rows = allRecords.map(record => 
    Object.values(record).map(v => `"${v || ''}"`).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'staging-data.csv';
  a.click();
  
  console.log(`Exported ${allRecords.length} records to CSV`);
}

exportToCSV();
```

## Cursor AI Assistant Prompts

### For Analysis
```
@cursor analyze the staging data at https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI/summary and tell me:
1. What percentage of records are missing critical data?
2. How many duplicate poles exist?
3. What's the overall data quality?
```

### For Visualization
```
@cursor fetch the duplicate pole data from https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI/duplicates and create a bar chart showing the top 10 poles with the most duplicates
```

### For Data Cleaning Suggestions
```
@cursor get the quality report from https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI/quality and suggest a prioritized list of data cleaning tasks based on the issues found
```

## Advanced Usage

### 1. Batch Analysis Script
```javascript
// Comprehensive staging analysis
async function analyzeStaging() {
  console.log('🔍 Starting Staging Database Analysis...\n');
  
  // 1. Get summary
  const summary = await fetch(baseURL + '/summary').then(r => r.json());
  console.log('📊 Summary:', summary);
  
  // 2. Check duplicates
  const duplicates = await fetch(baseURL + '/duplicates').then(r => r.json());
  console.log(`\n🔄 Duplicates: ${duplicates.totalDuplicatePoles} poles`);
  
  // 3. Quality report
  const quality = await fetch(baseURL + '/quality').then(r => r.json());
  console.log(`\n✅ Quality Score: ${quality.qualityScore}/100`);
  
  // 4. Find problem records
  const noPoles = await searchRecords('poleNumber', '==', null);
  console.log(`\n⚠️ Records without poles: ${noPoles.count}`);
  
  // Generate recommendations
  console.log('\n📋 Recommendations:');
  if (quality.qualityScore < 80) {
    console.log('- Data quality below 80%, review missing fields');
  }
  if (duplicates.totalDuplicatePoles > 100) {
    console.log('- High duplicate count, investigate pole assignment process');
  }
  if (noPoles.count > summary.totalRecords * 0.2) {
    console.log('- Over 20% missing poles, urgent field verification needed');
  }
}

const baseURL = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI';
analyzeStaging();
```

### 2. Real-time Monitoring
```javascript
// Monitor staging changes
async function monitorStaging(intervalMinutes = 5) {
  let lastCount = 0;
  
  setInterval(async () => {
    const summary = await fetch(baseURL + '/summary').then(r => r.json());
    
    if (summary.totalRecords !== lastCount) {
      console.log(`📈 Record count changed: ${lastCount} → ${summary.totalRecords}`);
      console.log(`   Quality: ${summary.qualityScore}/100`);
      lastCount = summary.totalRecords;
      
      // Alert on significant changes
      if (Math.abs(summary.totalRecords - lastCount) > 100) {
        console.log('🚨 SIGNIFICANT CHANGE DETECTED!');
      }
    }
  }, intervalMinutes * 60 * 1000);
  
  console.log(`Monitoring started... checking every ${intervalMinutes} minutes`);
}

monitorStaging(5);
```

### 3. Compare with Production
```javascript
// Check what's different between staging and production
async function compareStagingToProduction() {
  // Get staging summary
  const staging = await fetch(baseURL + '/summary').then(r => r.json());
  
  // Get production count (if you have access)
  // const production = await getProductionCount();
  
  console.log('Staging vs Production:');
  console.log(`Staging Records: ${staging.totalRecords}`);
  console.log(`Ready for sync: ${staging.recordsWithPoles}`);
  console.log(`Needs attention: ${staging.totalRecords - staging.recordsWithPoles}`);
}
```

## Troubleshooting

### Connection Issues
```javascript
// Test with error handling
fetch(baseURL)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => console.log('✅ Connected:', data))
  .catch(err => console.error('❌ Connection failed:', err));
```

### CORS Issues
If you get CORS errors, use a proxy:
```javascript
// Option 1: Use a CORS proxy
const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
const apiUrl = 'https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI';
fetch(proxyUrl + apiUrl);

// Option 2: Run in Node.js instead of browser
```

### Rate Limiting
```javascript
// Add delays between requests
async function fetchWithDelay(url, delayMs = 1000) {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return fetch(url).then(r => r.json());
}
```

## Quick Reference

### API Endpoints
- `GET /` - API info
- `GET /summary` - Quick stats
- `GET /records?limit=100&offset=0` - Paginated records
- `GET /records/:id` - Single record
- `POST /search` - Search records
- `GET /duplicates` - Duplicate analysis
- `GET /quality` - Quality report

### Search Operators
- `==` - Equals
- `!=` - Not equals
- `>` - Greater than
- `<` - Less than
- `>=` - Greater or equal
- `<=` - Less or equal
- `in` - In array
- `array-contains` - Array contains

### Common Fields
- `propertyId` - Unique property ID
- `poleNumber` - Pole identifier (LAW.P.XXXX)
- `fieldAgent` - Agent name
- `status` - Current status
- `address` - Property address
- `gps` - GPS coordinates
- `importDate` - When imported

## Need Help?

1. **Check API is running**: Visit base URL in browser
2. **Check your query**: Log the request body
3. **Check response**: Log full response including headers
4. **Contact**: [Your contact info]

---

**Pro Tip**: Save these snippets as Cursor snippets for quick access!