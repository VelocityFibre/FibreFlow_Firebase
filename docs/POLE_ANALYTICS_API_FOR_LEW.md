# Pole Analytics API Documentation for Lew's Team

## Overview
This API provides real-time analytics data for pole installations from the FibreFlow system. The data is pulled from the `planned-poles` collection after staging sync approval.

## IMPORTANT: Current Status (August 18, 2025)
The API endpoints are deployed but require authentication permissions to be set. Please follow the setup instructions below or contact the development team to enable public access.

## Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net
```

## Available Endpoints

### 1. Full Analytics Endpoint
**URL**: `/poleAnalyticsPublic`  
**Method**: GET  
**Description**: Returns comprehensive pole analytics with status breakdown and completion metrics.

#### Query Parameters:
- `projectId` (optional) - Filter by specific project ID
- `days` (optional, default: 30) - Number of days to look back for calculations

#### Example Request:
```bash
curl "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsPublic?days=7"
```

#### Response Format:
```json
{
  "success": true,
  "data": {
    "totalPoles": 10875,
    "estimatedCompleted": 0,
    "remainingPoles": 10875,
    "completionPercentage": 0.00,
    "statusBreakdown": {
      "Permission not granted": 8941,
      "Permission granted": 1792,
      "planned": 81,
      "Other statuses...": "count"
    },
    "sampleSize": 1000,
    "message": "Note: Status values in the database are different from expected enum values"
  },
  "metadata": {
    "generatedAt": "2025-08-18T19:45:00.000Z",
    "daysIncluded": 7,
    "projectFilter": "all"
  }
}
```

### 2. Summary Endpoint
**URL**: `/poleAnalyticsSummaryPublic`  
**Method**: GET  
**Description**: Returns a simple summary of total poles in the system.

#### Example Request:
```bash
curl "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsSummaryPublic"
```

#### Response Format:
```json
{
  "success": true,
  "data": {
    "totalPoles": 10875,
    "message": "Detailed analytics available at /poleAnalyticsPublic endpoint"
  },
  "timestamp": "2025-08-18T19:45:00.000Z"
}
```

## Important Notes

### Status Values
The current database contains different status values than originally expected:
- "Permission not granted" - Poles awaiting permission
- "Permission granted" - Poles with approved permission
- "planned" - Poles in planning stage
- Various other status texts

### Data Source
- All data comes from the `planned-poles` collection in Firestore
- This collection is populated after offline capture → staging sync → validation → production sync

### CORS Support
- All endpoints support CORS (Cross-Origin Resource Sharing)
- Can be called from any domain or application
- Supports GET, POST, and OPTIONS methods

### Error Handling
If an error occurs, the response will have `success: false`:
```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Usage Examples

### JavaScript/Node.js
```javascript
const fetch = require('node-fetch');

async function getPoleAnalytics() {
  const response = await fetch('https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsPublic?days=30');
  const data = await response.json();
  console.log('Total poles:', data.data.totalPoles);
  console.log('Completion:', data.data.completionPercentage + '%');
}
```

### Python
```python
import requests

response = requests.get('https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsPublic?days=30')
data = response.json()
print(f"Total poles: {data['data']['totalPoles']}")
print(f"Completion: {data['data']['completionPercentage']}%")
```

### cURL
```bash
# Get analytics for last 7 days
curl "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsPublic?days=7"

# Get summary only
curl "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsSummaryPublic"
```

## Rate Limits
- No specific rate limits are enforced
- Please be reasonable with request frequency
- Recommended: Cache results for at least 5 minutes

## Support
For any issues or questions about the API, please contact the FibreFlow development team.

---
*Last Updated: August 18, 2025*