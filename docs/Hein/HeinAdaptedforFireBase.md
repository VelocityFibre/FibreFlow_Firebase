# FibreFlow - Enterprise Fiber Project Management Platform (Firebase Version)

Create a comprehensive full-stack project management application for Velocity Fibre, a fiber optic installation company. This Firebase-adapted version leverages the existing Firebase/Firestore infrastructure while maintaining the enterprise-grade capabilities outlined in the original plan.

## 🎯 Core Application Purpose

FibreFlow is an enterprise project management platform specifically engineered for fiber optic infrastructure deployment. The system centers around a sophisticated **4-level hierarchical project management system**: Projects → Phases → Steps → Tasks, designed to manage the complete lifecycle of fiber projects from initial planning to final acceptance.

**Primary Value Proposition:** Transform fiber project management through an intelligent hierarchical system with industry-specific workflows, AI-powered optimization, real-time collaboration, and comprehensive business intelligence - reducing project completion time by 20% and achieving 95% on-time delivery rates.

## 🛠️ Tech Stack (Firebase Adapted)

Leveraging the existing Angular + Firebase infrastructure:

- **Frontend**: Angular 18 + TypeScript (existing setup)
- **Styling**: Angular Material + SCSS + Custom Theme System
- **Backend**: Firebase Firestore (already configured)
- **Authentication**: Firebase Auth with custom claims for multi-tenant support
- **Real-time**: Firestore real-time listeners
- **File Storage**: Firebase Storage for documents, images, and voice recordings
- **Cloud Functions**: Firebase Cloud Functions for server-side processing
- **Email Service**: Firebase Cloud Functions with SendGrid/Nodemailer
- **AI Integration**: Cloud Functions calling OpenAI API for procurement optimization
- **Voice Recognition**: Web Speech API for voice-to-text features
- **Offline Support**: Firestore offline persistence + Angular PWA
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **File Processing**: SheetJS for Excel import/export (client-side)
- **Charts**: Chart.js + ng2-charts for Angular integration

## 🎨 Design System (Angular Material Adapted)

**Apple-Inspired Minimalism with Angular Material:**

- Leverage existing Angular Material theme system
- Custom theme with VelocityFibre branding
- Professional color palette integrated with Material Design:

```scss
// In existing _variables.scss
$primary-palette: (
  50: #e8f5e9,
  100: #c8e6c9,
  200: #a5d6a7,
  300: #81c784,
  400: #66bb6a,
  500: #4caf50,  // VelocityFibre brand green
  600: #43a047,
  700: #388e3c,
  800: #2e7d32,
  900: #1b5e20,
  contrast: (
    50: rgba(black, 0.87),
    100: rgba(black, 0.87),
    200: rgba(black, 0.87),
    300: rgba(black, 0.87),
    400: rgba(black, 0.87),
    500: white,
    600: white,
    700: white,
    800: white,
    900: white
  )
);

$accent-palette: (
  // Sophisticated charcoal accent colors
);

$warn-palette: (
  // Error/warning colors
);
```

## 🏗️ Firestore Database Schema

### Collections Structure

```typescript
// Core Collections
interface FirestoreSchema {
  // User Management
  profiles: {
    uid: string; // Firebase Auth UID
    email: string;
    fullName: string;
    role: 'admin' | 'project_manager' | 'site_supervisor' | 'contractor' | 'technician' | 'viewer' | 'supplier_admin' | 'supplier_user' | 'customer';
    department?: string;
    phone?: string;
    avatarUrl?: string;
    supplierId?: string;
    customerId?: string;
    
    // Voice & Mobile Preferences
    voiceEnabled: boolean;
    preferredLanguage: string;
    voiceCommandsEnabled: boolean;
    
    // Notification Preferences
    notificationPreferences: {
      emailNotifications: boolean;
      pushNotifications: boolean;
      smsNotifications: boolean;
      dailyDigest: boolean;
      projectUpdates: boolean;
      costAlerts: boolean;
      delayWarnings: boolean;
    };
    
    // Mobile & Offline Settings
    offlineSyncEnabled: boolean;
    mobileDataUsageLimit: 'unlimited' | 'wifi-only' | 'limited';
    lastOfflineSync?: Timestamp;
    
    isActive: boolean;
    lastLogin?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Customer Management
  customers: {
    id: string;
    name: string;
    companyRegistration?: string;
    address: {
      line1?: string;
      line2?: string;
      city?: string;
      postalCode?: string;
    };
    email?: string;
    phone?: string;
    
    // Customer Portal Features
    portalAccessEnabled: boolean;
    portalSubdomain?: string;
    portalLogoUrl?: string;
    portalThemeConfig?: any;
    
    // Communication Preferences
    preferredCommunicationMethod: 'email' | 'phone' | 'portal' | 'sms';
    notificationPreferences: {
      projectUpdates: boolean;
      milestoneAlerts: boolean;
      delayNotifications: boolean;
      completionAlerts: boolean;
    };
    
    // Account Management
    accountManagerId?: string;
    customerTier: 'bronze' | 'silver' | 'gold' | 'platinum';
    
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Project Management
  projects: {
    id: string;
    projectName: string;
    customerId: string;
    region?: string;
    status: 'not_started' | 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    startDate?: Timestamp;
    endDate?: Timestamp;
    locationId?: string;
    totalHomesPO?: number;
    totalPolesBoQ?: number;
    budget?: number;
    siteAddress?: string;
    siteCoordinates?: GeoPoint;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Phases (Subcollection under projects)
  'projects/{projectId}/phases': {
    id: string;
    phaseTemplateId: string; // Reference to phase template
    name: string;
    description?: string;
    orderNo: number;
    status: 'pending' | 'active' | 'completed' | 'blocked';
    startDate?: Timestamp;
    endDate?: Timestamp;
    assignedTo?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Steps (Subcollection under phases)
  'projects/{projectId}/phases/{phaseId}/steps': {
    id: string;
    name: string;
    description?: string;
    orderNo: number;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    assignedTo?: string;
    dueDate?: Timestamp;
    estimatedHours?: number;
    actualHours?: number;
    completionPercentage: number;
    notes?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Tasks (Subcollection under steps)
  'projects/{projectId}/phases/{phaseId}/steps/{stepId}/tasks': {
    id: string;
    name: string;
    description?: string;
    orderNo: number;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    assignedTo?: string;
    dueDate?: Timestamp;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    attachments?: string[]; // Firebase Storage URLs
    checklist?: {
      item: string;
      completed: boolean;
    }[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Phase Templates (Standard phases)
  phaseTemplates: {
    id: string;
    name: string;
    description?: string;
    orderNo: number;
    isDefault: boolean;
    defaultSteps?: any[]; // Template steps
    createdAt: Timestamp;
  };

  // Daily Progress
  dailyProgress: {
    id: string;
    projectId: string;
    contractorId?: string;
    contractorTeamId?: string;
    technicianId?: string;
    entryDate: Timestamp;
    
    // Standard KPIs
    polePermissions: number;
    homeSignups: number;
    polesPlanted: number;
    meters24fStringing: number;
    meters144fStringing: number;
    metersTrenched: number;
    homesConnected: number;
    homesActivated: number;
    
    // Custom KPIs
    customKPIs?: { [key: string]: any };
    
    // Voice Input Features
    voiceInputUsed: boolean;
    voiceTranscription?: string;
    voiceConfidenceScore?: number;
    voiceRecordingUrl?: string; // Firebase Storage URL
    
    // Data Quality & Validation
    dataQualityScore: number;
    validationWarnings?: string[];
    requiresReview: boolean;
    reviewedBy?: string;
    reviewedAt?: Timestamp;
    
    notes?: string;
    weatherConditions?: string;
    shiftStartTime?: string;
    shiftEndTime?: string;
    photos?: string[]; // Firebase Storage URLs
    gpsLocation?: GeoPoint;
    
    // Offline Support
    createdOffline: boolean;
    syncedAt?: Timestamp;
    offlineDeviceId?: string;
    
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Stock Management
  stockItems: {
    id: string;
    name: string;
    itemCode: string;
    category?: string;
    subcategory?: string;
    description?: string;
    unit?: string;
    minimumStock: number;
    reorderLevel: number;
    standardCost?: number;
    currentStock: number;
    allocatedStock: number;
    availableStock: number; // Calculated: currentStock - allocatedStock
    warehouseLocation?: string;
    storageRequirements?: string;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Stock Movements (Subcollection under stockItems)
  'stockItems/{itemId}/movements': {
    id: string;
    movementType: 'receipt' | 'issue' | 'transfer' | 'adjustment' | 'return';
    fromLocationId?: string;
    toLocationId?: string;
    projectId?: string;
    contractorId?: string;
    supplierId?: string;
    quantity: number;
    unitCost?: number;
    totalCost?: number; // quantity * unitCost
    referenceNumber?: string;
    movementDate: Timestamp;
    reason?: string;
    notes?: string;
    batchNumber?: string;
    expiryDate?: Timestamp;
    qualityCheckStatus: 'pending' | 'passed' | 'failed' | 'not_required';
    createdBy: string;
    approvedBy?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Suppliers
  suppliers: {
    id: string;
    name: string;
    companyRegistration?: string;
    taxNumber?: string;
    contactEmail?: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country: string;
    website?: string;
    
    // Portal Access
    portalSubdomain?: string;
    portalLogoUrl?: string;
    portalThemeConfig?: any;
    portalActive: boolean;
    
    // Business Information
    businessType?: 'manufacturer' | 'distributor' | 'reseller' | 'service_provider';
    yearsInBusiness?: number;
    employeeCount?: number;
    annualTurnover?: number;
    
    // Certifications & Compliance
    certifications?: any[];
    complianceDocuments?: string[]; // Firebase Storage URLs
    insuranceInfo?: any;
    
    // Performance & Rating
    performanceRating: number;
    onTimeDeliveryRate: number;
    qualityRating: number;
    totalOrders: number;
    totalOrderValue: number;
    
    // Financial Information
    paymentTerms: string;
    creditLimit?: number;
    preferredPaymentMethod?: string;
    bankDetails?: any;
    
    // Operational Details
    leadTimeDays: number;
    minimumOrderValue: number;
    deliveryRegions?: string[];
    specializations?: string[];
    
    // Portal Settings
    notificationPreferences: {
      rfqNotifications: boolean;
      orderUpdates: boolean;
      paymentReminders: boolean;
    };
    autoQuoteEnabled: boolean;
    quoteValidityDays: number;
    
    // Status & Approval
    approvalStatus: 'pending' | 'approved' | 'suspended' | 'rejected';
    approvedBy?: string;
    approvedAt?: Timestamp;
    suspensionReason?: string;
    
    isActive: boolean;
    preferredSupplier: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // BOQ Items (Subcollection under projects)
  'projects/{projectId}/boqItems': {
    id: string;
    itemCode?: string;
    itemName: string;
    description?: string;
    category?: string;
    quantity: number;
    unit?: string;
    estimatedUnitPrice?: number;
    estimatedTotalCost?: number; // quantity * estimatedUnitPrice
    specification?: string;
    notes?: string;
    priority: 'high' | 'medium' | 'low';
    requiredDate?: Timestamp;
    status: 'planned' | 'rfq_sent' | 'quoted' | 'approved' | 'ordered' | 'delivered' | 'consumed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // RFQs
  rfqs: {
    id: string;
    projectId: string;
    rfqNumber: string;
    title: string;
    description?: string;
    
    // Timeline
    issueDate: Timestamp;
    closingDate?: Timestamp;
    clarificationDeadline?: Timestamp;
    
    // Status & Workflow
    status: 'draft' | 'published' | 'clarifications' | 'closed' | 'cancelled' | 'awarded';
    publishedAt?: Timestamp;
    closedAt?: Timestamp;
    
    // RFQ Details
    procurementType: 'goods' | 'services' | 'works' | 'consultancy';
    evaluationCriteria: {
      price: number;
      quality: number;
      delivery: number;
    };
    termsAndConditions?: string;
    specialRequirements?: string;
    deliveryRequirements?: string;
    paymentTerms?: string;
    
    // Portal Features
    allowPartialQuotes: boolean;
    allowAlternativeProducts: boolean;
    requireSamples: boolean;
    confidentialityLevel: 'public' | 'restricted' | 'confidential';
    
    // Supplier Targeting
    invitedSuppliers?: string[];
    openToAllSuppliers: boolean;
    supplierCategories?: string[];
    
    // Notifications
    emailNotificationsSent: boolean;
    portalNotificationsSent: boolean;
    reminderNotifications: number;
    
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Intelligent Alerts
  intelligentAlerts: {
    id: string;
    
    // Alert Classification
    alertType: 'cost_overrun' | 'schedule_delay' | 'quality_issue' | 'safety_incident' |
               'resource_shortage' | 'weather_impact' | 'supplier_delay' | 'milestone_risk';
    severity: 'low' | 'medium' | 'high' | 'critical';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    
    // Alert Content
    title: string;
    description: string;
    recommendedActions?: string[];
    
    // Context & References
    projectId?: string;
    supplierId?: string;
    contractorId?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    
    // AI Analysis
    aiGenerated: boolean;
    aiConfidenceScore?: number;
    aiReasoning?: string;
    predictionData?: any;
    
    // Alert Lifecycle
    status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
    triggeredAt: Timestamp;
    acknowledgedBy?: string;
    acknowledgedAt?: Timestamp;
    resolvedBy?: string;
    resolvedAt?: Timestamp;
    resolutionNotes?: string;
    
    // Notification Tracking
    notificationsSent?: any;
    escalationLevel: number;
    nextEscalationAt?: Timestamp;
    
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };

  // Voice Commands
  voiceCommands: {
    id: string;
    userId: string;
    
    // Voice Data
    commandText: string;
    originalAudioUrl?: string; // Firebase Storage URL
    confidenceScore?: number;
    languageCode: string;
    
    // Processing
    intent?: string;
    entities?: any;
    actionTaken?: string;
    success: boolean;
    errorMessage?: string;
    
    // Context
    pageContext?: string;
    projectContext?: string;
    
    createdAt: Timestamp;
  };

  // Audit Logs
  auditLogs: {
    id: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Timestamp;
  };
}
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function hasRole(role) {
      return isSignedIn() && request.auth.token.role == role;
    }
    
    function isAdmin() {
      return hasRole('admin');
    }
    
    function isProjectManager() {
      return hasRole('project_manager') || isAdmin();
    }
    
    function isSiteSuper() {
      return hasRole('site_supervisor') || isProjectManager();
    }
    
    function isContractor() {
      return hasRole('contractor');
    }
    
    function isSupplier() {
      return hasRole('supplier_admin') || hasRole('supplier_user');
    }
    
    function isCustomer() {
      return hasRole('customer');
    }
    
    // Profiles
    match /profiles/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow write: if isSignedIn() && (request.auth.uid == userId || isAdmin());
    }
    
    // Projects
    match /projects/{projectId} {
      allow read: if isSignedIn();
      allow create: if isProjectManager();
      allow update: if isProjectManager();
      allow delete: if isAdmin();
      
      // Project subcollections
      match /phases/{phaseId} {
        allow read: if isSignedIn();
        allow write: if isProjectManager();
        
        match /steps/{stepId} {
          allow read: if isSignedIn();
          allow write: if isSiteSuper();
          
          match /tasks/{taskId} {
            allow read: if isSignedIn();
            allow write: if isSignedIn();
          }
        }
      }
      
      match /boqItems/{itemId} {
        allow read: if isSignedIn();
        allow write: if isProjectManager();
      }
    }
    
    // Daily Progress
    match /dailyProgress/{progressId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() && 
        (request.auth.uid == resource.data.createdBy || isSiteSuper());
      allow delete: if isAdmin();
    }
    
    // Suppliers
    match /suppliers/{supplierId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
    
    // RFQs
    match /rfqs/{rfqId} {
      allow read: if isSignedIn();
      allow write: if isProjectManager();
    }
    
    // Stock Items
    match /stockItems/{itemId} {
      allow read: if isSignedIn();
      allow write: if isProjectManager();
      
      match /movements/{movementId} {
        allow read: if isSignedIn();
        allow create: if isSignedIn();
        allow update: if isProjectManager();
        allow delete: if isAdmin();
      }
    }
    
    // Alerts
    match /intelligentAlerts/{alertId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn();
      allow delete: if isAdmin();
    }
    
    // Audit Logs (read-only for all except system)
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

## 🚀 Core Features to Implement

### **High-Impact Quick Implementation Features** ⭐ PRIORITY

1. **Voice-to-Text Daily Logging** 🎤
   - Web Speech API integration in Angular components
   - Smart entity recognition service
   - Real-time transcription with Angular reactive forms
   - Voice commands directive for navigation
   - Firebase Storage for voice recordings

2. **Advanced Mobile Offline Capabilities** 📱
   - Angular PWA with service workers
   - Firestore offline persistence enabled
   - Smart sync service with conflict resolution
   - Mobile-optimized Angular Material components
   - Image compression service before Firebase Storage upload

3. **Real-time Cost Tracking** 💰
   - Firestore real-time listeners for budget updates
   - Cost variance alerts using Cloud Functions
   - Angular Material data tables with inline editing
   - Multi-level approval workflows with Cloud Functions

4. **Intelligent Alerting System** 🚨
   - Cloud Functions for AI-powered predictions
   - Angular notification service with FCM integration
   - Context-aware alerts based on user roles
   - Automatic escalation with Cloud Functions triggers

5. **Customer Portal Basic Features** 👥
   - Separate Angular module for customer portal
   - Firebase Auth with custom claims for access control
   - Real-time project status with Firestore listeners
   - Document access via Firebase Storage with security rules

### **Implementation Architecture**

#### **Angular Module Structure:**
```typescript
src/app/
├── core/
│   ├── services/
│   │   ├── firebase/
│   │   │   ├── auth.service.ts
│   │   │   ├── firestore.service.ts
│   │   │   └── storage.service.ts
│   │   ├── voice/
│   │   │   ├── voice-recognition.service.ts
│   │   │   └── voice-commands.service.ts
│   │   └── offline/
│   │       ├── sync.service.ts
│   │       └── conflict-resolver.service.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── role.guard.ts
│   └── interceptors/
│       └── offline.interceptor.ts
├── features/
│   ├── projects/
│   │   ├── services/
│   │   ├── components/
│   │   └── pages/
│   ├── daily-progress/
│   │   ├── voice-input/
│   │   └── offline-form/
│   ├── procurement/
│   │   ├── rfq/
│   │   └── supplier-portal/
│   └── customer-portal/
│       ├── auth/
│       └── dashboard/
└── shared/
    ├── components/
    ├── directives/
    └── pipes/
```

#### **Firebase Cloud Functions Structure:**
```typescript
functions/
├── src/
│   ├── triggers/
│   │   ├── audit-log.ts
│   │   ├── alert-generation.ts
│   │   └── cost-tracking.ts
│   ├── scheduled/
│   │   ├── daily-reports.ts
│   │   └── alert-escalation.ts
│   ├── http/
│   │   ├── ai-integration.ts
│   │   └── email-notifications.ts
│   └── utils/
│       ├── firestore-helpers.ts
│       └── auth-helpers.ts
```

### **Key Integration Points**

1. **Firebase Auth Integration:**
   - Custom claims for role-based access
   - Multi-tenant support with customer/supplier IDs
   - Session management with Angular guards

2. **Firestore Real-time Updates:**
   - Observable-based data services
   - Optimistic UI updates
   - Conflict resolution for offline changes

3. **Firebase Storage:**
   - Secure file uploads with progress tracking
   - Image optimization before upload
   - Voice recording storage with metadata

4. **Cloud Functions:**
   - Automated workflows and notifications
   - AI integration for predictions
   - Scheduled reports and escalations

5. **Firebase Cloud Messaging:**
   - Push notifications for alerts
   - In-app notifications
   - Email digest via Cloud Functions

### **Success Metrics**

- **Operational**: 95% on-time delivery, 90% budget adherence
- **User Experience**: 90% daily active users, 70% voice input adoption
- **Technical**: 99.9% uptime, <2s response time, 99.5% offline sync success
- **Business Impact**: 25% cost reduction, 50% faster reporting, 300% ROI

Create a modern, intuitive, and powerful platform that revolutionizes fiber project management through intelligent automation, real-time collaboration, and comprehensive business intelligence - all built on the robust Firebase platform.