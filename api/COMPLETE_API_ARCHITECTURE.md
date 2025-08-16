# Complete FibreFlow API Architecture

*Date: 2025-08-16*  
*Status: Implementation Ready*

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Field Workers  │     │   SOW Team      │     │   Management    │
│   Mobile App    │     │   React App     │     │   Power BI      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         ▼                       ▼                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY                                │
├─────────────────┬──────────────────┬──────────────────────────────┤
│  Staging API    │   Read-Only API  │      Admin API               │
│  (Write)        │   (Read)         │      (Full Access)           │
└─────────────────┴──────────────────┴──────────────────────────────┘
         │                  │                      │
         ▼                  ▼                      ▼
┌─────────────────┐  ┌──────────────┐  ┌────────────────────────────┐
│ Staging Database│  │   Neon DB    │  │     Firebase DB            │
│  (Validation)   │  │  (Analytics) │  │   (Real-time Ops)          │
└─────────────────┘  └──────────────┘  └────────────────────────────┘
         │                                         ▲
         └──────── Validation Workflow ────────────┘
```

## API Components Built

### 1. Read-Only API (`/api/neon-read-api`)
**Purpose**: Secure read access for external developers

**Endpoints**:
- `GET /api/v1/poles` - List poles with filtering
- `GET /api/v1/poles/:id` - Get single pole
- `GET /api/v1/poles/stats/summary` - Pole statistics
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/:id` - Get project details
- `GET /api/v1/projects/:id/poles` - Get project poles
- `GET /api/v1/analytics/dashboard` - Dashboard stats
- `GET /api/v1/analytics/daily-progress` - Progress tracking
- `GET /api/v1/analytics/contractor-performance` - Performance metrics

**Security**:
- API Key authentication
- Rate limiting (1000/hour)
- Read-only database user
- Request logging

### 2. Staging API (`/api/staging-api`)
**Purpose**: Accept external data submissions for validation

**Endpoints**:
- `POST /api/v1/submit/pole` - Submit pole data
- `POST /api/v1/submit/sow` - Submit SOW document
- `POST /api/v1/submit/bulk` - Bulk submissions (max 100)
- `GET /api/v1/status/:submissionId` - Check submission status
- `POST /api/v1/upload` - Upload photos/documents

**Features**:
- Input validation
- Duplicate detection
- GPS verification
- Auto-approval for high-quality data
- Manual review queue

### 3. Validation Workflow (`/api/validation-workflow`)
**Purpose**: Process staging data to production

**Cloud Functions**:
- `processValidationQueue` - Runs every 5 minutes
- `moveApprovedToProduction` - Runs every 10 minutes
- `approveSubmission` - Manual approval endpoint
- `rejectSubmission` - Manual rejection endpoint
- `cleanupStaging` - Daily cleanup of old records

**Validation Rules**:
- Pole number format validation
- GPS boundary checking
- Photo completeness
- Contractor verification
- Duplicate prevention

## Data Flow

### 1. Field Worker Submits Data
```javascript
// Mobile app submits to staging
POST /api/v1/submit/pole
{
  data: {
    poleNumber: "LAW.P.B167",
    gps: { latitude: -26.123, longitude: 28.456 },
    photos: [...],
    projectId: "project123"
  },
  metadata: {
    deviceId: "mobile-001",
    appVersion: "1.0.0"
  }
}

// Response
{
  success: true,
  data: {
    submissionId: "stg_pole_abc123",
    status: "pending_validation"
  }
}
```

### 2. Automatic Validation
```javascript
// Validation process (runs automatically)
1. Format checks (pole number, GPS)
2. Duplicate detection
3. Photo validation
4. Contractor verification
5. Calculate quality score

// If score >= 80 and no issues
→ Auto-approve → Queue for production

// If score < 80 or has warnings
→ Requires manual review
```

### 3. Move to Production
```javascript
// Approved data moves to:
1. Firebase (real-time operations)
2. Neon (analytics & reporting)

// Creates:
- Production pole record
- Activity log
- Updates project statistics
```

## Security Implementation

### API Keys Management
```bash
# Generate API keys
openssl rand -hex 32

# Store in Firebase config
firebase functions:config:set \
  api.key_1="generated-key-1" \
  api.key_2="generated-key-2"
```

### Database Users
```sql
-- Neon read-only user
CREATE USER readonly_api WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE fibreflow TO readonly_api;
GRANT USAGE ON SCHEMA public TO readonly_api;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_api;

-- Staging write user (limited permissions)
CREATE USER staging_api WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE fibreflow TO staging_api;
GRANT USAGE ON SCHEMA public TO staging_api;
GRANT INSERT ON TABLE staging_submissions TO staging_api;
```

### Rate Limiting Configuration
```typescript
// Different limits per API
export const rateLimits = {
  read: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 1000                    // 1000 requests
  },
  staging: {
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100                     // 100 submissions
  },
  admin: {
    windowMs: 5 * 60 * 1000,    // 5 minutes
    max: 500                     // 500 requests
  }
};
```

## Deployment Instructions

### 1. Deploy Read-Only API
```bash
cd api/neon-read-api
npm install
npm run build
firebase deploy --only functions:neonReadAPI
```

### 2. Deploy Staging API
```bash
cd api/staging-api
npm install
npm run build
firebase deploy --only functions:stagingAPI
```

### 3. Deploy Validation Workflow
```bash
cd api/validation-workflow
npm install
npm run build
firebase deploy --only functions:processValidationQueue,functions:moveApprovedToProduction
```

### 4. Set Environment Variables
```bash
# Set Neon connection
firebase functions:config:set neon.connection_string="postgresql://..."

# Set API keys
firebase functions:config:set api.key_1="..." api.key_2="..."

# Deploy config
firebase functions:config:get
```

## Monitoring & Maintenance

### Health Checks
```bash
# Check API health
curl https://your-api-url/health

# Check validation queue
firebase functions:log --only processValidationQueue

# Check error rates
firebase functions:log --severity ERROR
```

### Metrics to Monitor
1. API response times
2. Validation success rate
3. Queue processing time
4. Error rates by endpoint
5. Data quality scores

### Alerts to Set Up
- Queue backup (>100 pending)
- High error rate (>5%)
- Low approval rate (<70%)
- API downtime

## For External Developers

### Getting Started
1. Request API key from FibreFlow team
2. Review `DEVELOPER_GUIDE.md`
3. Test in development environment
4. Deploy to production

### Example Integration
```javascript
// Read data
const poles = await fetch('https://api-url/api/v1/poles', {
  headers: { 'X-API-Key': 'your-key' }
});

// Submit data
const submission = await fetch('https://staging-api/api/v1/submit/pole', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: { /* pole data */ },
    metadata: { /* app metadata */ }
  })
});
```

## Benefits Achieved

1. **Data Integrity** ✅
   - All data validated before production
   - No direct database writes
   - Complete audit trail

2. **Scalability** ✅
   - Separate read/write APIs
   - Async validation processing
   - Database connection pooling

3. **Developer Experience** ✅
   - Clear documentation
   - Consistent error handling
   - Example code provided

4. **Security** ✅
   - API key authentication
   - Rate limiting
   - Read-only database access
   - Staging isolation

## Next Steps

1. **Create Admin UI** for validation queue
2. **Add WebSocket** for real-time updates
3. **Implement caching** for analytics
4. **Add GraphQL** option for complex queries
5. **Create SDK** for common languages

---

This architecture provides a complete, secure, and scalable API solution for FibreFlow's multi-tier system.