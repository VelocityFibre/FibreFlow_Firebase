# FibreFlow API Layer

This directory contains the API gateway implementation for FibreFlow's multi-tier architecture.

## Overview

The API layer serves as the central control point for all data operations, ensuring:
- Data validation before database writes
- Authentication and authorization
- Rate limiting and security
- Consistent response formats
- Separation between different user applications

## Directory Structure

```
api/
├── README.md                           # This file
├── API_DEVELOPMENT_PLAN_2025-08-16.md # Detailed implementation plan
├── functions/                          # Firebase Functions (coming soon)
│   ├── src/
│   │   ├── field/                     # Field worker endpoints
│   │   ├── admin/                     # Admin CRUD operations
│   │   ├── analytics/                 # Read-only analytics
│   │   └── sow/                       # SOW app endpoints
│   └── package.json
└── docs/                              # API documentation
    ├── field-api.md                   # Field worker API docs
    ├── admin-api.md                   # Admin API docs
    └── analytics-api.md               # Analytics API docs
```

## Quick Start

1. **Review the Plan**: Read `API_DEVELOPMENT_PLAN_2025-08-16.md`
2. **Setup Firebase Functions**: Follow Phase 1 in the plan
3. **Implement Endpoints**: Start with field worker API
4. **Test & Deploy**: Use Firebase emulators for local testing

## Key Principles

1. **No Direct Database Access**: All writes go through validation
2. **Role-Based Access**: Different endpoints for different user types
3. **Staging Before Production**: Field data validated before acceptance
4. **Technology Agnostic**: Any app can consume these APIs

## API Endpoints Overview

### Field Worker API (`/api/field/*`)
- `POST /capture` - Submit pole data to staging
- `POST /sync` - Sync offline data
- `GET /assignments` - Get user assignments

### Admin API (`/api/admin/*`)
- `POST /validate/:id` - Approve/reject staging data
- Full CRUD on all resources
- Bulk operations

### Analytics API (`/api/analytics/*`)
- `GET /dashboard` - Dashboard statistics
- `GET /reports/*` - Various reports
- Read-only access

### SOW API (`/api/sow/*`)
- `POST /submit` - Submit SOW documents
- `GET /templates` - Get SOW templates
- Document management

## Security

- Firebase Authentication required
- API keys for external systems (Power BI)
- Rate limiting per endpoint
- Input validation on all endpoints
- CORS configured for specific origins

## Development Status

- [ ] Phase 1: Foundation setup
- [ ] Phase 2: Field Worker API
- [ ] Phase 3: Admin API
- [ ] Phase 4: Analytics API
- [ ] Phase 5: Testing & Documentation
- [ ] Phase 6: Production deployment

## ✅ **PRODUCTION DATA WAREHOUSE APIs (Ready for Power BI)**

### **Neon Data Warehouse API** 
**Status**: ✅ **DEPLOYED & WORKING**  
**URL**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/neonDataWarehouse`  
**API Key**: `powerbi-data-warehouse-2025`  

**Contains**: All Neon PostgreSQL data
- OneMap Excel imports (pole permissions, status history)
- SOW data (scopes of work)
- Project poles, drops, fibre infrastructure
- Import batches and tracking

**Power BI Endpoint**: `/all-data?apikey=powerbi-data-warehouse-2025`

### **Firebase Data Warehouse API**
**Status**: ✅ **DEPLOYED & WORKING**  
**URL**: `https://us-central1-fibreflow-73daf.cloudfunctions.net/firebaseDataWarehouse`  
**API Key**: `powerbi-firebase-warehouse-2025`  

**Contains**: All Firestore data (28 collections)
- Projects, tasks, staff, contractors
- Materials, stock, BOQ, quotes
- Meetings, daily progress
- Pole tracker data

**Power BI Endpoint**: `/all-data?apikey=powerbi-firebase-warehouse-2025`

### **Features**:
- ✅ **Read-only access** - Safe for management reporting
- ✅ **API key protected** - Secure authentication
- ✅ **Public access enabled** - No additional setup needed
- ✅ **Power BI optimized** - JSON format for business intelligence
- ✅ **Complete data coverage** - All databases accessible

### **Documentation**:
- **Complete Setup Guide**: `COMPLETE_POWER_BI_DUAL_DATABASE_GUIDE.md`
- **Power BI Connection**: `POWER_BI_COMPLETE_DATA_WAREHOUSE_GUIDE.md`
- **Beginner's Guide**: `POWERBI_COMPLETE_GUIDE_FOR_BEGINNERS.md`

**Ready for**: Lew's team, management reporting, executive dashboards

---

For detailed implementation instructions, see `API_DEVELOPMENT_PLAN_2025-08-16.md`