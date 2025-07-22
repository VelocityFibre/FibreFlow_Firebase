# FibreFlow Firebase Connection Guide

## Overview
This guide provides all the necessary information for connecting external agents/systems to the FibreFlow Firebase database and application.

## Application Details

### Live Application
- **Production URL**: https://fibreflow-73daf.web.app
- **Firebase Console**: https://console.firebase.google.com/project/fibreflow-73daf
- **Status**: Production - Active

### Firebase Project Configuration
- **Project ID**: `fibreflow-73daf`
- **Region**: `us-central1`
- **Database**: Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Functions**: Firebase Functions (Node.js 20)

## Connection Information

### Firebase Configuration
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "296054249427",
  appId: "1:296054249427:web:2f0d6482daa6beb0624126",
  measurementId: "G-J0P7YRLGPW"
};
```

### Firestore Database URL
```
https://firestore.googleapis.com/v1/projects/fibreflow-73daf/databases/(default)
```

### Cloud Functions Base URL
```
https://us-central1-fibreflow-73daf.cloudfunctions.net/
```

## Database Structure

### Main Collections
- **projects** - Project management data
- **staff** - Staff/employee information
- **contractors** - Contractor details
- **clients** - Client information
- **suppliers** - Supplier data
- **stock** - Inventory management
- **stockItems** - Stock item details
- **stockMovements** - Stock movement tracking
- **tasks** - Task management
- **meetings** - Meeting records from Fireflies integration
- **roles** - System roles and permissions
- **dailyProgress** - Daily KPI tracking
- **audit-trail** - System audit logs
- **planned-poles** - Pole tracker data
- **boqItems** - Bill of Quantities items
- **quotes** - Quote management
- **emailLogs** - Email tracking

### Hierarchical Structure Example
```
projects/{projectId}/
├── Basic project data
├── phases/{phaseId}/
├── steps/{stepId}/
└── Related collections via projectId field
```

## Authentication & Security

### Current Security Rules
```javascript
// Firestore Rules (Development Mode - Open Access)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Open access until October 1, 2025
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 10, 1);
    }
  }
}
```

**⚠️ Important**: The database is currently in development mode with open access. All read/write operations are permitted without authentication until October 1, 2025.

### Authentication Methods
- **Email/Password**: Standard Firebase Auth
- **Google OAuth**: Available for Google accounts
- **Admin SDK**: For server-side applications

## API Endpoints

### Firebase Functions
- **Base URL**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/`
- **Health Check**: `/api/health`
- **Orchestrator**: `/api/orchestrator/**`

### Available Functions
- `getFirefliesMeetings` - Fetch meetings from Fireflies
- `syncFirefliesMeetings` - Sync meetings to Firestore
- `getFirefliesTranscript` - Get meeting transcripts
- `universalAuditTrail` - Audit logging
- `testAuditSystem` - Test audit functionality

## Connection Examples

### Web/JavaScript
```javascript
// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Example: Get all projects
import { collection, getDocs } from 'firebase/firestore';

const querySnapshot = await getDocs(collection(db, 'projects'));
querySnapshot.forEach((doc) => {
  console.log(doc.id, " => ", doc.data());
});
```

### Node.js (Admin SDK)
```javascript
const admin = require('firebase-admin');

// Initialize with service account key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
  databaseURL: 'https://fibreflow-73daf.firebaseio.com'
});

const db = admin.firestore();

// Example: Get staff data
const staffSnapshot = await db.collection('staff').get();
staffSnapshot.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

### REST API
```bash
# Get all projects
curl -X GET \
  "https://firestore.googleapis.com/v1/projects/fibreflow-73daf/databases/(default)/documents/projects" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get specific project
curl -X GET \
  "https://firestore.googleapis.com/v1/projects/fibreflow-73daf/databases/(default)/documents/projects/PROJECT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Data Access Patterns

### Staff Data
```javascript
// Get all staff
const staff = await db.collection('staff').get();

// Get staff by group
const managers = await db.collection('staff')
  .where('primaryGroup', '==', 'ProjectManager')
  .get();

// Get active staff
const activeStaff = await db.collection('staff')
  .where('isActive', '==', true)
  .get();
```

### Project Data
```javascript
// Get all projects
const projects = await db.collection('projects').get();

// Get project with phases and steps
const projectId = 'your-project-id';
const project = await db.collection('projects').doc(projectId).get();
const phases = await db.collection('projects').doc(projectId)
  .collection('phases').get();
const steps = await db.collection('projects').doc(projectId)
  .collection('steps').get();
```

### Real-time Listeners
```javascript
// Listen for staff changes
db.collection('staff').onSnapshot((snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      console.log('New staff: ', change.doc.data());
    }
    if (change.type === 'modified') {
      console.log('Modified staff: ', change.doc.data());
    }
    if (change.type === 'removed') {
      console.log('Removed staff: ', change.doc.data());
    }
  });
});
```

## Data Models

### Staff Model
```typescript
interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  primaryGroup: 'Admin' | 'ProjectManager' | 'Technician' | 'Supplier' | 'Client';
  isActive: boolean;
  availability: {
    status: 'available' | 'busy' | 'offline' | 'vacation';
    currentTaskCount: number;
    maxConcurrentTasks: number;
  };
  activity: {
    lastLogin: Timestamp | null;
    tasksCompleted: number;
    tasksInProgress: number;
  };
  skills?: string[];
  certifications?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Project Model
```typescript
interface Project {
  id: string;
  title: string;
  client: { id: string; name: string; };
  status: 'active' | 'completed' | 'pending' | 'on-hold';
  priority: 'high' | 'medium' | 'low';
  location: string;
  startDate: Timestamp;
  type: 'FTTH' | 'FTTB' | 'FTTC' | 'P2P';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Environment Setup

### Required Dependencies (Node.js)
```bash
npm install firebase-admin firebase
# or
npm install @google-cloud/firestore
```

### Environment Variables
```bash
# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
FIREBASE_PROJECT_ID=fibreflow-73daf

# Firebase Web SDK
FIREBASE_API_KEY=AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc
FIREBASE_AUTH_DOMAIN=fibreflow-73daf.firebaseapp.com
FIREBASE_PROJECT_ID=fibreflow-73daf
```

## Service Account Access

For server-side applications, you'll need a service account key:

1. Go to [Firebase Console](https://console.firebase.google.com/project/fibreflow-73daf)
2. Navigate to Project Settings > Service Accounts
3. Generate a new private key
4. Download the JSON file
5. Use it in your application

## Rate Limits & Quotas

### Firestore Limits
- **Reads**: 50,000 per day (free tier)
- **Writes**: 20,000 per day (free tier)
- **Deletes**: 20,000 per day (free tier)
- **Document Size**: 1 MiB maximum
- **Collection ID**: 1,500 bytes maximum

### Cloud Functions Limits
- **Invocations**: 2,000,000 per month (free tier)
- **GB-seconds**: 400,000 per month (free tier)
- **Timeout**: 540 seconds maximum

## Monitoring & Logging

### Firebase Console
- **Analytics**: https://console.firebase.google.com/project/fibreflow-73daf/analytics
- **Performance**: https://console.firebase.google.com/project/fibreflow-73daf/performance
- **Crash Reporting**: Integrated with Sentry

### Sentry Error Tracking
- **DSN**: `https://6cff665ed0e4b1cdba0d84da3585c68f@o4508210707431424.ingest.us.sentry.io/4509515741200384`
- **Environment**: `production`

## Best Practices

### 1. Data Access
- Use compound queries for complex filtering
- Implement pagination for large datasets
- Cache frequently accessed data
- Use real-time listeners sparingly

### 2. Security
- Validate all input data
- Use Firebase Auth for user authentication
- Implement proper error handling
- Never expose sensitive data in client-side code

### 3. Performance
- Batch reads and writes when possible
- Use collection group queries for cross-collection searches
- Implement proper indexing
- Monitor query performance

## Troubleshooting

### Common Issues
1. **Authentication Errors**: Check service account permissions
2. **Network Errors**: Verify internet connectivity and firewall settings
3. **Quota Exceeded**: Monitor usage in Firebase Console
4. **Permission Denied**: Check Firestore security rules

### Debug Mode
```javascript
// Enable debug logging
firebase.firestore.setLogLevel('debug');
```

### Support Contacts
- **Technical Lead**: louis@velocityfibreapp.com
- **Project Manager**: Available through FibreFlow staff system
- **Firebase Support**: Firebase Console > Support

## Example Integration

### Python Example
```python
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin
cred = credentials.Certificate('path/to/service-account-key.json')
firebase_admin.initialize_app(cred)

# Get Firestore client
db = firestore.client()

# Get staff data
staff_ref = db.collection('staff')
staff_docs = staff_ref.stream()

for doc in staff_docs:
    print(f'{doc.id} => {doc.to_dict()}')
```

### curl Example
```bash
# Get Firebase ID token (for authenticated requests)
curl -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password",
    "returnSecureToken": true
  }'

# Use token to access Firestore
curl -X GET \
  "https://firestore.googleapis.com/v1/projects/fibreflow-73daf/databases/(default)/documents/staff" \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

---

## Summary

FibreFlow is a production-ready fiber optic project management system with:
- **Open database access** (development mode until Oct 2025)
- **Comprehensive data structure** for fiber optic projects
- **Real-time synchronization** via Firestore
- **Cloud Functions** for server-side operations
- **RESTful API** access via Firebase
- **Professional monitoring** and error tracking

The system is currently optimized for South African fiber optic installations with support for multiple project types, staff management, inventory tracking, and integrated meeting management via Fireflies.ai.

For immediate access, you can start querying the database using the provided configuration without authentication required.