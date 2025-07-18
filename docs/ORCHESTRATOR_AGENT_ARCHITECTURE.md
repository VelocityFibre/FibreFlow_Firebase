# FibreFlow Orchestrator Agent Architecture

**Date**: 2025-07-16  
**Status**: APPROVED  
**Decision By**: Development Team  

## Decision Summary

Deploy the FibreFlow Orchestrator Agent as Firebase Functions within the same Firebase project as the main FibreFlow application.

## Architecture Overview

```
Firebase Project: fibreflow-73daf
├── FibreFlow App (Angular Frontend)
│   └── Hosted on Firebase Hosting
├── Firestore Database (Shared Data Store)
├── Authentication (Shared User Management)
└── Firebase Functions
    ├── Meeting sync functions ✅
    ├── Audit trail functions ✅
    └── Orchestrator agent functions ⭐ (NEW)
```

## Component Separation

### FibreFlow App
- **Purpose**: User interface and frontend logic
- **Technology**: Angular 20 + Material Design
- **Hosting**: Firebase Hosting
- **URL**: https://fibreflow.web.app

### Orchestrator Agent
- **Purpose**: AI assistant service for development workflow
- **Technology**: Firebase Functions (Node.js)
- **Hosting**: Firebase Functions
- **URLs**: 
  - `https://us-central1-fibreflow-73daf.cloudfunctions.net/orchestratorChat`
  - `https://us-central1-fibreflow-73daf.cloudfunctions.net/orchestratorDataQuery`
  - `https://us-central1-fibreflow-73daf.cloudfunctions.net/orchestratorHealth`
  - `https://us-central1-fibreflow-73daf.cloudfunctions.net/orchestratorAsk`

### Shared Infrastructure
- **Database**: Single Firestore instance
- **Authentication**: Firebase Auth (shared users and roles)
- **Security**: Same role-based access control
- **Environment**: Single Firebase project

## Migration Path

### Before (Local)
```bash
# Local orchestrator server
cd /home/ldp/VF/Agents/fibreflow-orchestrator
node src/api/secure-server.js
# Accessible at: http://localhost:3001
```

### After (Cloud)
```bash
# No local server needed
# Accessible at: https://us-central1-fibreflow-73daf.cloudfunctions.net/orchestrator*
```

## Benefits

### 1. Always-On Availability
- ✅ No dependency on local machine being powered on
- ✅ Available 24/7 to team members
- ✅ Auto-scaling based on demand

### 2. Shared Infrastructure
- ✅ Direct Firestore data access (no API calls needed)
- ✅ Shared authentication and user permissions
- ✅ Single environment for management
- ✅ Unified billing and monitoring

### 3. Role-Based Security (Preserved)
- ✅ Lead Dev: Full access (read/write/learn)
- ✅ Dept Head: Read-only access
- ✅ Project Manager: Limited data access
- ✅ Admin User: Inventory and reports only
- ✅ App UI: Specific data collections only

### 4. Development Workflow
- ✅ Same API structure and responses
- ✅ Compatible with existing Cursor integration
- ✅ Maintains memory and learning capabilities
- ✅ Preserves pattern recognition system

## Technical Implementation

### Function Structure
```javascript
// Role-based authentication
const AGENT_USERS = {
  'lead-dev-key': { canWrite: true, dataAccess: ['projects', 'contractors', 'inventory', 'admin'] },
  'dept-head-key': { canWrite: false, dataAccess: ['projects', 'contractors', 'reports'] },
  // ... other roles
};

// Endpoints
exports.orchestratorChat = functions.https.onRequest(/* Main chat endpoint */);
exports.orchestratorDataQuery = functions.https.onRequest(/* Data queries */);
exports.orchestratorHealth = functions.https.onRequest(/* Health check */);
exports.orchestratorAsk = functions.https.onRequest(/* Quick queries for Cursor */);
```

### Data Access Patterns
- **Direct Firestore access** for optimal performance
- **Permission-based filtering** at the query level
- **Real-time data** without API overhead
- **Shared audit trail** with main application

## API Compatibility

### Same Request/Response Format
```javascript
// Local orchestrator format (preserved)
POST /api/chat
{
  "message": "What projects are active?",
  "context": {}
}

// Firebase Functions format (same response)
POST /orchestratorChat
{
  "message": "What projects are active?", 
  "context": {},
  "apiKey": "dept-head-key"
}
```

### Authentication
- **Before**: Header-based API keys
- **After**: Same API keys, multiple auth methods (headers, query params, body)

## Cost Analysis

### Local Hosting Costs
- ❌ Always-on electricity for development machine
- ❌ Internet bandwidth and reliability dependency
- ❌ Manual server management and updates

### Firebase Functions Costs
- ✅ Pay-per-use model (only when agent is used)
- ✅ Auto-scaling (no wasted resources)
- ✅ Shared with existing Firebase infrastructure
- ✅ Estimated: $5-20/month for typical usage

## Migration Steps

1. ✅ Integrate orchestrator logic into Firebase Functions
2. ⏳ Deploy and test all endpoints
3. ⏳ Update client applications to use new URLs
4. ⏳ Migrate memory and patterns to Firestore
5. ⏳ Deprecate local server

## Monitoring and Maintenance

### Firebase Console Access
- **Functions logs**: Monitor agent performance and errors
- **Firestore data**: View conversations and patterns
- **Authentication**: Manage user access and roles
- **Usage metrics**: Track API calls and costs

### Development Workflow
- **Same deployment process**: `firebase deploy --only functions`
- **Version control**: Functions code in main FibreFlow repository
- **Testing**: Same local development with Firebase emulators

## Decision Rationale

### Why Same Firebase Project?
1. **Data Access**: Direct Firestore access eliminates API overhead
2. **Authentication**: Shared user base and permissions
3. **Simplicity**: Single environment to manage
4. **Cost**: No additional infrastructure costs
5. **Security**: Unified security model

### Why Not Separate Projects?
1. **Complexity**: Cross-project authentication required
2. **Performance**: API calls between projects add latency
3. **Management**: Multiple environments to maintain
4. **Cost**: Duplicate infrastructure costs

### Why Not Other Hosting Options?
1. **App Engine**: More complex, higher cost
2. **Cloud Run**: Container overhead, more setup
3. **VM/VPS**: Manual management, always-on costs

## Conclusion

The Firebase Functions approach provides the optimal balance of:
- **Functionality preservation**
- **Infrastructure simplicity** 
- **Cost effectiveness**
- **Always-on availability**
- **Team accessibility**

This decision maintains all existing orchestrator capabilities while providing cloud-native benefits and seamless integration with the FibreFlow ecosystem.

---

**Next Steps**: Complete deployment and testing of orchestrator endpoints in Firebase Functions.