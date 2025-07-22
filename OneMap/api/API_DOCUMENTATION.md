# OneMap Staging API Documentation

## Quick Start for Claude Code / Cursor

### Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI
```

### Authentication
Currently open access (can add auth later if needed)

## Example Usage in Claude Code / Cursor

### 1. Get Summary Statistics
```javascript
// Quick overview of staging data
const response = await fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI/summary');
const data = await response.json();
console.log(data);

// Returns:
{
  "totalRecords": 3487,
  "recordsWithPoles": 2441,
  "recordsWithAgents": 2406,
  "uniquePoles": 2387,
  "qualityScore": 70
}
```

### 2. Search for Specific Records
```javascript
// Find all records for a specific pole
const response = await fetch('https://[baseURL]/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    field: 'poleNumber',
    operator: '==',
    value: 'LAW.P.D721'
  })
});
const results = await response.json();
```

### 3. Get Duplicate Analysis
```javascript
// Find all duplicate poles
const response = await fetch('https://[baseURL]/duplicates');
const duplicates = await response.json();

// Returns poles appearing at multiple addresses
{
  "totalDuplicatePoles": 127,
  "duplicates": [
    {
      "poleNumber": "LAW.P.D721",
      "count": 7,
      "addresses": ["Address1", "Address2", ...],
      "agents": ["Agent1", "Agent2"]
    }
  ]
}
```

### 4. Get Data Quality Report
```javascript
// Comprehensive quality analysis
const response = await fetch('https://[baseURL]/quality');
const report = await response.json();

// Shows missing data, completeness scores, issues
```

## All Available Endpoints

### GET /summary
Returns overview statistics of staging data

### GET /records
Get paginated list of records
- Query params: `?limit=100&offset=0&sortBy=propertyId&orderBy=asc`

### GET /records/:id
Get specific record by ID

### POST /search
Search records by any field
```json
{
  "field": "fieldAgent",
  "operator": "==",
  "value": "John Doe",
  "limit": 50
}
```

### GET /duplicates
Analyze duplicate poles across addresses

### GET /quality
Comprehensive data quality report

## Python Example (for data analysis)

```python
import requests
import pandas as pd

# Get all staging data
url = "https://[baseURL]/records?limit=1000"
response = requests.get(url)
data = response.json()

# Convert to DataFrame
df = pd.DataFrame(data['data'])

# Analyze duplicates
duplicates_url = "https://[baseURL]/duplicates"
dup_response = requests.get(duplicates_url)
duplicates = dup_response.json()

print(f"Found {duplicates['totalDuplicatePoles']} duplicate poles")
```

## Rate Limits
- 100 requests per minute
- Max 1000 records per request

## Error Responses
```json
{
  "error": "Error message",
  "status": 400
}
```

## Local Development Setup

If your friend wants to run locally:

```bash
# Clone the function
git clone [repo]

# Install dependencies
npm install express cors firebase-admin

# Set up Firebase credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccount.json"

# Run locally
npm run serve
```

## Sample Queries for Analysis

### 1. Find records without poles
```javascript
POST /search
{
  "field": "poleNumber",
  "operator": "==",
  "value": null
}
```

### 2. Get records by date range
```javascript
POST /search
{
  "field": "importDate",
  "operator": ">=",
  "value": "2025-06-01"
}
```

### 3. Find specific agent's work
```javascript
POST /search
{
  "field": "fieldAgent",
  "operator": "==",
  "value": "Agent Name"
}
```

## Tips for Claude Code / Cursor

1. **Use the API in your prompts**:
   ```
   "Analyze the OneMap staging data at https://[baseURL]/summary 
   and create a visualization of data quality trends"
   ```

2. **Batch operations**:
   ```javascript
   // Get summary, then drill down
   const summary = await fetch(baseURL + '/summary').then(r => r.json());
   if (summary.duplicates > 100) {
     const dups = await fetch(baseURL + '/duplicates').then(r => r.json());
     // Analyze duplicates...
   }
   ```

3. **Export for spreadsheets**:
   ```javascript
   // Get data and convert to CSV
   const records = await fetch(baseURL + '/records?limit=5000').then(r => r.json());
   const csv = convertToCSV(records.data);
   downloadFile(csv, 'staging-data.csv');
   ```

## Contact
For API issues or feature requests, contact the OneMap team.