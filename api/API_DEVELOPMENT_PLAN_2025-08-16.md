# FibreFlow API Development Plan
*Date: 2025-08-16*  
*Status: Implementation Ready*

## Overview
Comprehensive plan for developing APIs to support multi-tier architecture.

## Technology Stack Decision

### Chosen: Firebase Functions
- **Why**: Already integrated, serverless, auto-scaling
- **Language**: Node.js (JavaScript/TypeScript)
- **Framework**: Express.js within Functions
- **Database**: Firestore + Neon (via connection pooling)

## API Structure

```
functions/
├── src/
│   ├── api/
│   │   ├── field/           # Field worker endpoints
│   │   │   ├── capture.ts
│   │   │   ├── sync.ts
│   │   │   └── assignments.ts
│   │   ├── admin/           # Admin CRUD operations
│   │   │   ├── validate.ts
│   │   │   ├── poles.ts
│   │   │   └── projects.ts
│   │   ├── analytics/       # Read-only analytics
│   │   │   ├── dashboard.ts
│   │   │   └── reports.ts
│   │   └── sow/            # SOW app endpoints
│   │       ├── submit.ts
│   │       └── documents.ts
│   ├── middleware/
│   │   ├── auth.ts         # Authentication
│   │   ├── validate.ts     # Input validation
│   │   ├── rateLimit.ts    # Rate limiting
│   │   └── cors.ts         # CORS config
│   ├── services/
│   │   ├── validation.ts   # Business logic
│   │   ├── staging.ts      # Staging operations
│   │   └── neon.ts         # Neon DB connection
│   └── utils/
│       ├── errors.ts       # Error handling
│       └── response.ts     # Standard responses
```

## Phase 1: Foundation (Week 1)

### 1.1 Setup Firebase Functions
```bash
# Initialize functions
firebase init functions

# Choose TypeScript
# Install dependencies
cd functions
npm install express cors helmet compression
npm install --save-dev @types/express
```

### 1.2 Base Middleware
```typescript
// middleware/auth.ts
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// middleware/validate.ts
export const validatePoleData = (req: Request, res: Response, next: NextFunction) => {
  const { poleNumber, gps, photos } = req.body;
  
  const errors = [];
  
  if (!poleNumber || !POLE_REGEX.test(poleNumber)) {
    errors.push('Invalid pole number format');
  }
  
  if (!gps || !isValidGPS(gps)) {
    errors.push('Invalid GPS coordinates');
  }
  
  if (!photos || photos.length < REQUIRED_PHOTOS) {
    errors.push(`Minimum ${REQUIRED_PHOTOS} photos required`);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  next();
};
```

### 1.3 Standard Response Format
```typescript
// utils/response.ts
export const successResponse = (data: any, meta?: any) => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    version: '1.0',
    ...meta
  }
});

export const errorResponse = (code: string, message: string, details?: any) => ({
  success: false,
  error: {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  }
});
```

## Phase 2: Field Worker API (Week 2)

### 2.1 Capture Endpoint
```typescript
// api/field/capture.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validatePoleData } from '../../middleware/validate';
import { successResponse, errorResponse } from '../../utils/response';

const router = Router();

router.post('/capture', authenticate, validatePoleData, async (req, res) => {
  try {
    const { poleNumber, gps, photos, notes, projectId } = req.body;
    const userId = req.user.uid;
    
    // Check for duplicates
    const existing = await db.collection('staging_poles')
      .where('poleNumber', '==', poleNumber)
      .where('status', '==', 'pending')
      .get();
    
    if (!existing.empty) {
      return res.status(409).json(
        errorResponse('DUPLICATE_ENTRY', 'Pole already in staging')
      );
    }
    
    // Write to staging
    const docRef = await db.collection('staging_poles').add({
      poleNumber,
      gps,
      photos,
      notes,
      projectId,
      capturedBy: userId,
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      validationStatus: 'awaiting'
    });
    
    res.json(successResponse({
      id: docRef.id,
      message: 'Pole data captured successfully'
    }));
    
  } catch (error) {
    console.error('Capture error:', error);
    res.status(500).json(
      errorResponse('CAPTURE_ERROR', 'Failed to capture pole data')
    );
  }
});

export default router;
```

### 2.2 Sync Endpoint
```typescript
// api/field/sync.ts
router.post('/sync', authenticate, async (req, res) => {
  const { lastSyncTimestamp, pendingData } = req.body;
  const userId = req.user.uid;
  
  // Process pending uploads
  const uploaded = [];
  const failed = [];
  
  for (const item of pendingData) {
    try {
      const result = await processPendingItem(item, userId);
      uploaded.push(result);
    } catch (error) {
      failed.push({ item, error: error.message });
    }
  }
  
  // Get new assignments since last sync
  const assignments = await db.collection('pole_assignments')
    .where('assignedTo', '==', userId)
    .where('updatedAt', '>', new Date(lastSyncTimestamp))
    .get();
  
  res.json(successResponse({
    uploaded: uploaded.length,
    failed: failed.length,
    newAssignments: assignments.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })),
    serverTimestamp: new Date().toISOString()
  }));
});
```

## Phase 3: Admin API (Week 3)

### 3.1 Validation Endpoint
```typescript
// api/admin/validate.ts
router.post('/validate/:stagingId', authenticate, requireRole('admin'), async (req, res) => {
  const { stagingId } = req.params;
  const { approved, rejectionReason, corrections } = req.body;
  
  const stagingDoc = await db.collection('staging_poles').doc(stagingId).get();
  
  if (!stagingDoc.exists) {
    return res.status(404).json(
      errorResponse('NOT_FOUND', 'Staging record not found')
    );
  }
  
  const stagingData = stagingDoc.data();
  
  if (approved) {
    // Move to production
    const productionData = {
      ...stagingData,
      ...corrections, // Admin corrections
      validatedBy: req.user.uid,
      validatedAt: admin.firestore.FieldValue.serverTimestamp(),
      stagingId: stagingId
    };
    
    delete productionData.status;
    delete productionData.validationStatus;
    
    const prodRef = await db.collection('poles').add(productionData);
    
    // Archive staging record
    await db.collection('staging_poles').doc(stagingId).update({
      status: 'approved',
      productionId: prodRef.id,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Also write to Neon for analytics
    await neonService.insertPole(productionData);
    
  } else {
    // Reject with reason
    await db.collection('staging_poles').doc(stagingId).update({
      status: 'rejected',
      rejectionReason,
      rejectedBy: req.user.uid,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  res.json(successResponse({
    action: approved ? 'approved' : 'rejected',
    stagingId
  }));
});
```

## Phase 4: Analytics API (Week 4)

### 4.1 Read-Only Endpoints
```typescript
// api/analytics/dashboard.ts
router.get('/dashboard', authenticate, cacheMiddleware(300), async (req, res) => {
  const { projectId, dateFrom, dateTo } = req.query;
  
  // Query from Neon for fast analytics
  const stats = await neonService.getDashboardStats({
    projectId,
    dateFrom,
    dateTo
  });
  
  res.json(successResponse(stats, {
    cached: true,
    cacheExpiry: 300
  }));
});
```

## Security Implementation

### API Key Management
```typescript
// For external integrations (Power BI)
const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !isValidAPIKey(apiKey)) {
    return res.status(401).json(
      errorResponse('INVALID_API_KEY', 'Invalid or missing API key')
    );
  }
  
  next();
};
```

### Rate Limiting
```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const fieldApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

export const analyticsApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50
});
```

## Testing Strategy

### Unit Tests
```typescript
// __tests__/api/field/capture.test.ts
describe('Field Capture API', () => {
  it('should reject invalid pole numbers', async () => {
    const response = await request(app)
      .post('/api/field/capture')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        poleNumber: 'INVALID',
        gps: { lat: -26.123, lng: 28.456 },
        photos: ['photo1', 'photo2']
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Integration Tests
- Test staging to production flow
- Test authentication across apps
- Test rate limiting
- Test error scenarios

## Deployment

### Environment Variables
```bash
# .env
NEON_CONNECTION_STRING=your-neon-connection
FIREBASE_PROJECT_ID=fibreflow-73daf
API_KEY_SECRET=your-secret-for-api-keys
```

### Deploy Commands
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:fieldAPI

# Set environment config
firebase functions:config:set neon.connection="your-connection-string"
```

## Monitoring

### Logging
```typescript
// Structured logging
console.log(JSON.stringify({
  severity: 'INFO',
  message: 'Pole captured',
  userId: req.user.uid,
  poleNumber: req.body.poleNumber,
  timestamp: new Date().toISOString()
}));
```

### Metrics to Track
- API response times
- Error rates by endpoint
- Validation success/failure rates
- Staging to production conversion rate

## Documentation

### OpenAPI/Swagger Spec
```yaml
openapi: 3.0.0
info:
  title: FibreFlow API
  version: 1.0.0
  
paths:
  /api/field/capture:
    post:
      summary: Capture pole data from field
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PoleCapture'
```

## Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Foundation | Auth, validation, base structure |
| 2 | Field API | Capture, sync, assignments |
| 3 | Admin API | Validation, CRUD, staging flow |
| 4 | Analytics API | Read endpoints, caching, performance |
| 5 | Testing & Docs | Full test suite, API documentation |
| 6 | Deployment | Production deployment, monitoring |

## Success Criteria

1. **Performance**: <200ms response time for 95% of requests
2. **Reliability**: 99.9% uptime
3. **Security**: Zero unauthorized access incidents
4. **Scalability**: Handle 1000+ concurrent field workers
5. **Data Integrity**: 100% validation before production writes

---
*This plan provides a complete roadmap for API development with industry best practices*