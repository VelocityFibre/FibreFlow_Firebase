# Contractor Management Module for FibreFlow

A self-contained, plug-and-play module that adds comprehensive contractor management capabilities to the FibreFlow platform.

## 🎯 Module Overview

**Module Name**: Contractor Management System (CMS)
**Version**: 1.0
**Dependencies**: Core FibreFlow (Projects, Daily Progress, Authentication)
**Integration Points**: Projects, Daily Progress, Stock Management, Financial Tracking

## 🔌 Integration Points

### Required from Core System:
- `projects` collection (read access)
- `dailyProgress` collection (read/write access)
- `profiles` collection (contractor role)
- Authentication service
- Notification service

### Exposes to Core System:
- Contractor assignment status
- Payment approval workflows
- Performance metrics
- Work target achievements

## 📊 Module Data Schema

### Primary Collections

```typescript
// 1. Contractor Registry
contractors: {
  id: string;
  // Basic Information
  companyName: string;
  registrationNumber: string;
  vatNumber?: string;
  
  // Contact Details
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  
  // Address
  physicalAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    gpsCoordinates?: GeoPoint;
  };
  
  // Capabilities
  capabilities: {
    services: ('trenching' | 'pole_planting' | 'fiber_stringing' | 'splicing' | 'home_connections')[];
    maxTeams: number;
    equipment: string[];
    certifications: {
      name: string;
      issuer: string;
      validUntil: Timestamp;
      documentUrl?: string;
    }[];
  };
  
  // Compliance
  compliance: {
    insurancePolicy: string;
    insuranceExpiry: Timestamp;
    insuranceDocUrl?: string;
    safetyRating: number;
    bbbeeLevel?: number;
    bbbeeDocUrl?: string;
  };
  
  // Financial
  financial: {
    bankName: string;
    accountNumber: string;
    branchCode: string;
    accountType: 'current' | 'savings';
    paymentTerms: number; // days
    creditLimit?: number;
  };
  
  // Status
  status: 'pending_approval' | 'active' | 'suspended' | 'blacklisted';
  onboardingStatus: 'documents_pending' | 'under_review' | 'approved' | 'rejected';
  suspensionReason?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Timestamp;
}

// 2. Contractor Teams (Subcollection)
'contractors/{contractorId}/teams': {
  id: string;
  teamCode: string;
  teamName: string;
  
  // Team Composition
  teamLead: {
    name: string;
    phone: string;
    email?: string;
    employeeId?: string;
  };
  
  members: {
    name: string;
    role: 'technician' | 'helper' | 'driver' | 'supervisor';
    skills: string[];
  }[];
  
  // Capabilities
  primarySkill: 'trenching' | 'pole_planting' | 'fiber_stringing' | 'splicing' | 'home_connections';
  secondarySkills: string[];
  
  // Availability
  currentProjectId?: string;
  availableFrom?: Timestamp;
  
  // Performance
  performanceScore: number;
  completedProjects: number;
  
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 3. Project Contractor Assignments
contractorAssignments: {
  id: string;
  projectId: string;
  contractorId: string;
  
  // Contract Details
  contractNumber: string;
  contractType: 'fixed_price' | 'unit_rate' | 'milestone_based' | 'time_material';
  
  // Timeline
  startDate: Timestamp;
  endDate: Timestamp;
  actualStartDate?: Timestamp;
  actualEndDate?: Timestamp;
  
  // Scope
  scopeOfWork: {
    description: string;
    deliverables: string[];
    exclusions?: string[];
  };
  
  // Teams Assigned
  assignedTeams: string[]; // Team IDs
  
  // Commercial Terms
  commercial: {
    contractValue?: number; // For fixed price
    retentionPercentage: number;
    paymentSchedule: 'weekly' | 'biweekly' | 'monthly' | 'milestone' | 'completion';
    penaltyClause?: {
      type: 'fixed' | 'percentage';
      value: number;
      conditions: string;
    };
  };
  
  // Work Targets
  workTargets: {
    targetId: string;
    kpiName: string;
    targetValue: number;
    unit: string;
    deadline?: Timestamp;
    isMandatory: boolean;
  }[];
  
  // Status
  status: 'draft' | 'pending_approval' | 'active' | 'on_hold' | 'completed' | 'terminated';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Timestamp;
  
  // Documents
  documents: {
    type: 'contract' | 'purchase_order' | 'insurance' | 'other';
    name: string;
    url: string;
    uploadedAt: Timestamp;
  }[];
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// 4. Payment Milestones
contractorMilestones: {
  id: string;
  assignmentId: string;
  contractorId: string;
  projectId: string;
  
  // Milestone Details
  milestoneNumber: number;
  milestoneName: string;
  description: string;
  
  // Value
  milestoneValue: number;
  retentionAmount: number;
  netPayable: number;
  
  // Completion Criteria
  completionCriteria: {
    criteriaId: string;
    type: 'kpi_based' | 'deliverable_based' | 'date_based' | 'approval_based';
    
    // For KPI-based
    kpiCriteria?: {
      kpiName: string;
      targetValue: number;
      currentValue: number;
      unit: string;
    };
    
    // For deliverable-based
    deliverableCriteria?: {
      description: string;
      isCompleted: boolean;
      completedDate?: Timestamp;
    };
    
    // For date-based
    dateCriteria?: {
      dueDate: Timestamp;
    };
    
    isMandatory: boolean;
    weightage: number; // Percentage
  }[];
  
  // Achievement Tracking
  achievement: {
    overallProgress: number; // Percentage
    achievedDate?: Timestamp;
    verifiedBy?: string;
    verifiedAt?: Timestamp;
    verificationNotes?: string;
  };
  
  // Payment Processing
  payment: {
    status: 'pending' | 'approved' | 'processing' | 'paid' | 'on_hold' | 'disputed';
    approvedBy?: string;
    approvedAt?: Timestamp;
    
    // Invoice Details
    invoiceNumber?: string;
    invoiceDate?: Timestamp;
    invoiceAmount?: number;
    invoiceUrl?: string;
    
    // Payment Details
    paymentDate?: Timestamp;
    paymentReference?: string;
    paymentMethod?: 'eft' | 'cheque' | 'cash';
    
    // Deductions if any
    deductions?: {
      type: 'penalty' | 'damage' | 'advance_recovery' | 'other';
      amount: number;
      reason: string;
    }[];
    
    finalAmount?: number;
  };
  
  // Dispute Management
  dispute?: {
    raisedBy: string;
    raisedAt: Timestamp;
    reason: string;
    status: 'open' | 'under_review' | 'resolved' | 'escalated';
    resolution?: string;
    resolvedAt?: Timestamp;
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 5. Contractor Performance Tracking
contractorPerformance: {
  id: string;
  contractorId: string;
  projectId?: string; // Optional for overall performance
  evaluationPeriod: {
    startDate: Timestamp;
    endDate: Timestamp;
    type: 'weekly' | 'monthly' | 'project' | 'annual';
  };
  
  // KPI Performance
  kpiPerformance: {
    [kpiName: string]: {
      target: number;
      achieved: number;
      unit: string;
      achievementRate: number; // Percentage
      trend: 'improving' | 'stable' | 'declining';
    }
  };
  
  // Quality Metrics
  qualityMetrics: {
    defectsReported: number;
    defectsResolved: number;
    reworkRequired: number;
    customerComplaints: number;
    qualityScore: number; // 1-10
  };
  
  // Safety Metrics
  safetyMetrics: {
    safetyIncidents: number;
    nearMisses: number;
    toolboxTalksAttended: number;
    safetyScore: number; // 1-10
  };
  
  // Reliability Metrics
  reliabilityMetrics: {
    daysWorked: number;
    daysAbsent: number;
    onTimeArrival: number; // Percentage
    equipmentDowntime: number; // Hours
  };
  
  // Financial Performance
  financialMetrics: {
    invoicedAmount: number;
    paidAmount: number;
    penaltiesIncurred: number;
    bonusEarned: number;
    profitability: number; // Percentage
  };
  
  // Overall Ratings
  overallRating: number; // 1-5 stars
  recommendationStatus: 'highly_recommended' | 'recommended' | 'conditional' | 'not_recommended';
  
  // Feedback
  feedback?: {
    providedBy: string;
    role: string;
    comments: string;
    date: Timestamp;
  }[];
  
  createdAt: Timestamp;
  calculatedAt: Timestamp;
}

// 6. Contractor Onboarding Workflow
contractorOnboarding: {
  id: string;
  contractorId: string;
  
  // Workflow Status
  currentStep: number;
  totalSteps: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  
  // Steps Tracking
  steps: {
    stepNumber: number;
    stepName: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    completedAt?: Timestamp;
    completedBy?: string;
    
    // Required Documents
    requiredDocuments?: {
      documentType: string;
      uploaded: boolean;
      documentUrl?: string;
      verificationStatus?: 'pending' | 'verified' | 'rejected';
      verificationNotes?: string;
    }[];
    
    // Approvals Required
    approvals?: {
      approvalType: string;
      approvedBy?: string;
      approvedAt?: Timestamp;
      rejected: boolean;
      rejectionReason?: string;
    }[];
  }[];
  
  // Final Approval
  finalApproval: {
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: Timestamp;
    comments?: string;
  };
  
  startedAt: Timestamp;
  completedAt?: Timestamp;
  lastUpdated: Timestamp;
}
```

## 🔧 Module Services

### 1. Contractor Management Service
```typescript
interface ContractorManagementService {
  // Onboarding
  initiateOnboarding(contractorData: any): Promise<string>;
  updateOnboardingStep(contractorId: string, step: any): Promise<void>;
  approveContractor(contractorId: string, approverId: string): Promise<void>;
  
  // Assignment
  assignToProject(assignmentData: any): Promise<string>;
  updateAssignment(assignmentId: string, updates: any): Promise<void>;
  terminateAssignment(assignmentId: string, reason: string): Promise<void>;
  
  // Performance
  calculatePerformance(contractorId: string, period: any): Promise<any>;
  getPerformanceTrends(contractorId: string): Promise<any>;
}
```

### 2. Payment Processing Service
```typescript
interface PaymentProcessingService {
  // Milestone Management
  createMilestone(milestoneData: any): Promise<string>;
  updateMilestoneProgress(milestoneId: string): Promise<void>;
  verifyMilestoneCompletion(milestoneId: string, verifierId: string): Promise<boolean>;
  
  // Payment Processing
  initiatePayment(milestoneId: string): Promise<void>;
  approvePayment(milestoneId: string, approverId: string): Promise<void>;
  processPayment(milestoneId: string, paymentDetails: any): Promise<void>;
  
  // Dispute Management
  raiseDispute(milestoneId: string, dispute: any): Promise<void>;
  resolveDispute(disputeId: string, resolution: any): Promise<void>;
}
```

### 3. Work Target Tracking Service
```typescript
interface WorkTargetService {
  // Target Management
  setWorkTargets(assignmentId: string, targets: any[]): Promise<void>;
  updateTargetProgress(targetId: string, progress: number): Promise<void>;
  
  // Achievement Tracking
  calculateAchievement(assignmentId: string): Promise<any>;
  checkMilestoneEligibility(milestoneId: string): Promise<boolean>;
  
  // Automated Triggers
  checkDailyProgressImpact(dailyProgressId: string): Promise<void>;
}
```

## 🎛️ Module Configuration

```typescript
interface ContractorModuleConfig {
  // Feature Flags
  features: {
    enableOnboarding: boolean;
    enableMilestonePayments: boolean;
    enablePerformanceTracking: boolean;
    enableDisputeManagement: boolean;
    enableAutomatedPayments: boolean;
  };
  
  // Business Rules
  businessRules: {
    minRetentionPercentage: number;
    maxRetentionPercentage: number;
    defaultPaymentTerms: number; // days
    performanceEvaluationFrequency: 'weekly' | 'monthly';
    requireInsurance: boolean;
    requireBBBEE: boolean;
  };
  
  // Integration Settings
  integrations: {
    linkToDailyProgress: boolean;
    linkToStockMovements: boolean;
    linkToQualityReports: boolean;
  };
  
  // Notification Settings
  notifications: {
    milestoneAchieved: boolean;
    paymentApproved: boolean;
    performanceAlert: boolean;
    documentExpiry: boolean;
  };
}
```

## 🔗 Integration Hooks

### Input Hooks (Listen to Core System)
```typescript
// Listen to Daily Progress Updates
onDailyProgressUpdate(progressData) {
  // Update contractor work target achievements
  // Check milestone completion criteria
}

// Listen to Project Status Changes
onProjectStatusChange(projectData) {
  // Update contractor assignment status
  // Trigger final payments if completed
}
```

### Output Hooks (Notify Core System)
```typescript
// Notify when contractor is assigned
emitContractorAssigned(assignment) {
  // Update project team information
  // Update resource allocation
}

// Notify when payment is processed
emitPaymentProcessed(payment) {
  // Update project costs
  // Update financial tracking
}
```

## 🚀 Quick Start Integration

```typescript
// 1. Install the module
import { ContractorManagementModule } from '@fibreflow/contractor-management';

// 2. Configure the module
const contractorConfig: ContractorModuleConfig = {
  features: {
    enableOnboarding: true,
    enableMilestonePayments: true,
    // ... other features
  },
  // ... other config
};

// 3. Register with main app
app.registerModule(ContractorManagementModule, contractorConfig);

// 4. Set up integration hooks
ContractorManagementModule.onReady(() => {
  // Connect to daily progress updates
  dailyProgressService.subscribe(ContractorManagementModule.handleProgressUpdate);
  
  // Connect to project updates  
  projectService.subscribe(ContractorManagementModule.handleProjectUpdate);
});
```

## 📊 Module Dashboard Components

### 1. Contractor Overview Widget
- Active contractors count
- Performance ratings distribution
- Payment status summary
- Upcoming milestones

### 2. Payment Pipeline Widget
- Pending approvals
- Processing payments
- Disputed amounts
- Cash flow projection

### 3. Performance Tracker Widget
- Top performing contractors
- Underperforming alerts
- Safety incident trends
- Quality metrics summary

## 🔒 Security & Permissions

### Role-Based Access
```typescript
contractorPermissions = {
  'admin': ['*'], // Full access
  'project_manager': [
    'contractors.read',
    'assignments.create',
    'assignments.update',
    'milestones.verify',
    'performance.read'
  ],
  'finance_manager': [
    'contractors.read',
    'milestones.read',
    'payments.approve',
    'payments.process'
  ],
  'contractor': [
    'own_profile.read',
    'own_assignments.read',
    'own_milestones.read',
    'own_performance.read'
  ]
};
```

## 📋 Module Deliverables

1. **Firestore Collections** (as defined above)
2. **Angular Module** with components and services
3. **Cloud Functions** for automated workflows
4. **Security Rules** for Firestore access
5. **Integration Documentation**
6. **API Documentation**
7. **Admin Configuration UI**
8. **Contractor Portal Components**

## 🎯 Success Metrics

- Contractor onboarding time < 48 hours
- Payment processing time < 24 hours
- Zero payment disputes due to calculation errors
- 95% milestone verification accuracy
- 100% audit trail compliance