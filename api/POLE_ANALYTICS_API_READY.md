# Pole Analytics API - READY FOR USE

## API Status: ✅ DEPLOYED & PUBLIC

The API has been deployed and made publicly accessible. However, there's a Firestore permissions issue that needs to be resolved for full functionality.

## Working Endpoints

### 1. Health Check (✅ WORKING)
```bash
curl -H "X-API-Token: fibreflow-pole-analytics-2025" \
  https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/health
```

Response:
```json
{
  "success": true,
  "service": "pole-analytics-api",
  "timestamp": "2025-08-19T07:09:08.133Z"
}
```

### 2. Test Endpoint with Mock Data (✅ WORKING)
```bash
curl -H "X-API-Token: fibreflow-pole-analytics-2025" \
  https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/test
```

This returns the expected data structure with mock values.

### 3. Real Data Endpoints (🔧 Firestore Permission Fix Needed)
- `/summary` - Will return total pole count
- `/analytics` - Will return full analytics with status breakdown

## Current Issue

The API is accessible but getting "Missing or insufficient permissions" when trying to read from the `planned-poles` collection. This is a known Firebase Functions issue that requires the function's service account to have proper Firestore read permissions.

## Quick Fix Options

1. **Use the mock data endpoint** (`/test`) for development/testing
2. **Wait for Firestore permissions** to be fixed by the dev team
3. **Use direct Firestore access** with Firebase Admin SDK in your own code

## API Documentation

**Base URL**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress`

**Authentication**: 
- Header: `X-API-Token: fibreflow-pole-analytics-2025`
- Or Query: `?token=fibreflow-pole-analytics-2025`

**Endpoints**:
- `GET /health` - Health check
- `GET /test` - Mock data (working)
- `GET /summary` - Total poles (needs fix)
- `GET /analytics?days=30` - Full analytics (needs fix)

## For Lew's Team

The API infrastructure is ready. You can:
1. Test integration using the `/health` and `/test` endpoints
2. See the expected data structure from `/test`
3. The real data endpoints will work once Firestore permissions are fixed

---
*Last Updated: August 19, 2025*