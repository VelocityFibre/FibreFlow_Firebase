# Pole Permission Reconnection Strategy

*Created: 2025-07-23*  
*Status: Implementation Ready*

## Overview

This document defines the strategy for reconnecting pole permission records with pole assignment records when pole numbers are assigned to previously processed permission records.

## Problem Statement

When agents obtain pole permissions, they receive payment for their work. Later in the workflow, poles are assigned specific numbers and matched to physical installations. We need to track the progression from permission → assignment → installation while preventing duplicate payments.

**Current Challenge**:
- Permission records exist without pole numbers
- Pole assignments happen later with specific pole numbers  
- Need to link these stages while maintaining history
- Detect agent changes between permission and assignment stages

## Data Model Design

### 1. PermissionToAssignment Interface

```typescript
interface PermissionToAssignment {
  // Unique identifier
  id: string;
  
  // Linking identifiers
  permissionId: string;        // Reference to original permission record
  assignmentId?: string;       // Reference to pole assignment (when available)
  
  // Core business data
  propertyId: string;          // Business identifier
  oneMapNadId: string;        // OneMap reference
  poleNumber?: string;         // Assigned pole number (null initially)
  
  // Location matching
  permissionLocation: {
    address: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
  };
  
  assignmentLocation?: {
    address: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
  };
  
  // Agent tracking
  permissionAgent: {
    name: string;
    id?: string;
    paymentDate?: Date;
    paymentAmount?: number;
  };
  
  assignmentAgent?: {
    name: string;
    id?: string;
    contractorId?: string;
  };
  
  // Workflow status
  linkingStatus: 'PERMISSION_ONLY' | 'LINKED' | 'CONFLICT' | 'DUPLICATE_POLE';
  
  // Conflict detection
  conflicts?: {
    agentNameMismatch: boolean;
    locationMismatch: boolean;
    duplicatePoleAssignment: boolean;
    distanceMeters?: number;
  };
  
  // Linking metadata
  linkedDate?: Date;
  linkedBy?: string;          // User who confirmed the link
  linkingMethod: 'AUTO' | 'MANUAL' | 'GPS_MATCH';
  
  // Audit trail
  createdAt: Date;
  updatedAt: Date;
  reconciledAt?: Date;
}
```

### 2. Supporting Types

```typescript
enum LinkingStatus {
  PERMISSION_ONLY = 'PERMISSION_ONLY',     // Permission exists, no pole assigned
  LINKED = 'LINKED',                       // Successfully linked
  CONFLICT = 'CONFLICT',                   // Agent or location mismatch
  DUPLICATE_POLE = 'DUPLICATE_POLE'        // Pole assigned to multiple permissions
}

enum LinkingMethod {
  AUTO = 'AUTO',           // Automatically linked by exact match
  MANUAL = 'MANUAL',       // Manually confirmed by user
  GPS_MATCH = 'GPS_MATCH'  // Linked based on GPS proximity
}

interface ConflictDetails {
  agentNameMismatch: boolean;
  locationMismatch: boolean;
  duplicatePoleAssignment: boolean;
  distanceMeters?: number;
  
  // Detailed conflict info
  permissionAgentName: string;
  assignmentAgentName?: string;
  permissionAddress: string;
  assignmentAddress?: string;
  
  // Resolution suggestions
  suggestedAction: 'REVIEW_MANUALLY' | 'AUTO_LINK' | 'SPLIT_ASSIGNMENT';
  confidence: number; // 0-1 confidence score
}
```

## Database Collections

### 1. Primary Collection: `permission-assignments`

```javascript
// Firestore collection structure
{
  "permission-assignments": {
    "{id}": {
      permissionId: "perm_001",
      assignmentId: "assign_001",
      propertyId: "PROP_12345",
      oneMapNadId: "NAD_67890",
      poleNumber: "LAW.P.B167",
      
      permissionLocation: {
        address: "123 Main Street",
        gpsLatitude: -26.1234,
        gpsLongitude: 28.5678
      },
      
      assignmentLocation: {
        address: "123 Main Street",
        gpsLatitude: -26.1235,
        gpsLongitude: 28.5679
      },
      
      permissionAgent: {
        name: "John Smith",
        paymentDate: "2025-01-15T00:00:00Z",
        paymentAmount: 150.00
      },
      
      assignmentAgent: {
        name: "John Smith",
        contractorId: "CONT_001"
      },
      
      linkingStatus: "LINKED",
      linkingMethod: "AUTO",
      linkedDate: "2025-02-01T00:00:00Z",
      
      createdAt: "2025-01-15T00:00:00Z",
      updatedAt: "2025-02-01T00:00:00Z"
    }
  }
}
```

### 2. Conflict Tracking: `permission-conflicts`

```javascript
{
  "permission-conflicts": {
    "{id}": {
      permissionAssignmentId: "perm_assign_001",
      conflictType: "AGENT_MISMATCH",
      
      details: {
        permissionAgentName: "John Smith",
        assignmentAgentName: "Jane Doe",
        distanceMeters: 50,
        confidence: 0.85
      },
      
      resolution: {
        status: "PENDING", // PENDING, RESOLVED, ESCALATED
        resolvedBy: "user_123",
        resolvedAt: "2025-02-05T00:00:00Z",
        action: "MANUAL_LINK",
        notes: "Confirmed same agent, name variation"
      },
      
      createdAt: "2025-02-01T00:00:00Z"
    }
  }
}
```

## Daily Reconciliation Service

### 1. Service Implementation

```typescript
@Injectable({ providedIn: 'root' })
export class PermissionReconciliationService {
  private firestore = inject(Firestore);
  
  /**
   * Daily reconciliation process
   * Runs automatically via scheduled function
   */
  async runDailyReconciliation(): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      processedDate: new Date(),
      permissionsProcessed: 0,
      newLinks: 0,
      conflicts: 0,
      duplicates: 0
    };
    
    // 1. Get unlinked permissions
    const unlinkedPermissions = await this.getUnlinkedPermissions();
    
    // 2. Get new pole assignments
    const newAssignments = await this.getNewPoleAssignments();
    
    // 3. Match permissions to assignments
    for (const permission of unlinkedPermissions) {
      const matches = await this.findPotentialMatches(permission, newAssignments);
      
      if (matches.length === 1 && matches[0].confidence > 0.9) {
        // High confidence auto-link
        await this.createLink(permission, matches[0], 'AUTO');
        report.newLinks++;
      } else if (matches.length > 1) {
        // Multiple matches - create conflict
        await this.createConflict(permission, matches);
        report.conflicts++;
      }
      
      report.permissionsProcessed++;
    }
    
    // 4. Detect duplicate pole assignments
    await this.detectDuplicatePoles(report);
    
    return report;
  }
  
  /**
   * Find potential matches between permission and assignment
   */
  private async findPotentialMatches(
    permission: OneMapRecord, 
    assignments: PlannedPole[]
  ): Promise<MatchCandidate[]> {
    const candidates: MatchCandidate[] = [];
    
    for (const assignment of assignments) {
      const candidate: MatchCandidate = {
        assignment,
        confidence: 0,
        matchReasons: []
      };
      
      // Property ID exact match (highest confidence)
      if (permission.propertyId === assignment.propertyId) {
        candidate.confidence += 0.5;
        candidate.matchReasons.push('PROPERTY_ID_MATCH');
      }
      
      // GPS proximity match
      const distance = this.calculateGPSDistance(
        permission.gpsLatitude, permission.gpsLongitude,
        assignment.plannedLocation.lat, assignment.plannedLocation.lng
      );
      
      if (distance < 100) { // Within 100 meters
        candidate.confidence += 0.3;
        candidate.matchReasons.push('GPS_PROXIMITY');
      }
      
      // Agent name similarity
      const agentSimilarity = this.calculateNameSimilarity(
        permission.fieldAgentPolePermission,
        assignment.oneMapData?.fieldAgent
      );
      
      if (agentSimilarity > 0.8) {
        candidate.confidence += 0.2;
        candidate.matchReasons.push('AGENT_NAME_SIMILAR');
      }
      
      // Only consider candidates with some confidence
      if (candidate.confidence > 0.3) {
        candidates.push(candidate);
      }
    }
    
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Create a permission-assignment link
   */
  private async createLink(
    permission: OneMapRecord,
    match: MatchCandidate,
    method: LinkingMethod
  ): Promise<void> {
    const linkDoc: PermissionToAssignment = {
      id: generateId(),
      permissionId: permission.id,
      assignmentId: match.assignment.id,
      propertyId: permission.propertyId,
      oneMapNadId: permission.oneMapNadId,
      poleNumber: match.assignment.clientPoleNumber,
      
      permissionLocation: {
        address: permission.locationAddress,
        gpsLatitude: permission.gpsLatitude,
        gpsLongitude: permission.gpsLongitude
      },
      
      assignmentLocation: {
        address: match.assignment.plannedLocation.address,
        gpsLatitude: match.assignment.plannedLocation.lat,
        gpsLongitude: match.assignment.plannedLocation.lng
      },
      
      permissionAgent: {
        name: permission.fieldAgentPolePermission
      },
      
      assignmentAgent: {
        name: match.assignment.oneMapData?.fieldAgent,
        contractorId: match.assignment.assignedContractorId
      },
      
      linkingStatus: 'LINKED',
      linkingMethod: method,
      linkedDate: new Date(),
      
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check for conflicts
    const conflicts = this.detectConflicts(linkDoc);
    if (conflicts.length > 0) {
      linkDoc.linkingStatus = 'CONFLICT';
      linkDoc.conflicts = conflicts[0];
    }
    
    await addDoc(collection(this.firestore, 'permission-assignments'), linkDoc);
  }
  
  /**
   * Detect conflicts in a link
   */
  private detectConflicts(link: PermissionToAssignment): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    
    const conflict: ConflictDetails = {
      agentNameMismatch: false,
      locationMismatch: false,
      duplicatePoleAssignment: false,
      suggestedAction: 'AUTO_LINK',
      confidence: 1.0
    };
    
    // Agent name mismatch
    if (link.permissionAgent.name !== link.assignmentAgent?.name) {
      const similarity = this.calculateNameSimilarity(
        link.permissionAgent.name,
        link.assignmentAgent?.name || ''
      );
      
      if (similarity < 0.7) {
        conflict.agentNameMismatch = true;
        conflict.suggestedAction = 'REVIEW_MANUALLY';
        conflict.confidence -= 0.3;
      }
    }
    
    // Location mismatch (GPS distance > 200m)
    if (link.permissionLocation.gpsLatitude && link.assignmentLocation?.gpsLatitude) {
      const distance = this.calculateGPSDistance(
        link.permissionLocation.gpsLatitude,
        link.permissionLocation.gpsLongitude!,
        link.assignmentLocation.gpsLatitude,
        link.assignmentLocation.gpsLongitude!
      );
      
      if (distance > 200) {
        conflict.locationMismatch = true;
        conflict.distanceMeters = distance;
        conflict.suggestedAction = 'REVIEW_MANUALLY';
        conflict.confidence -= 0.4;
      }
    }
    
    if (conflict.agentNameMismatch || conflict.locationMismatch) {
      conflicts.push(conflict);
    }
    
    return conflicts;
  }
}
```

### 2. Supporting Interfaces

```typescript
interface ReconciliationReport {
  processedDate: Date;
  permissionsProcessed: number;
  newLinks: number;  
  conflicts: number;
  duplicates: number;
  details?: {
    autoLinked: PermissionToAssignment[];
    conflictsFound: ConflictDetails[];
    duplicatePoles: string[];
  };
}

interface MatchCandidate {
  assignment: PlannedPole;
  confidence: number; // 0-1 score
  matchReasons: string[];
}
```

## Benefits of This Approach

### 1. Maintains Complete History
- Permission records preserved for payment audit
- Assignment records maintained for technical tracking
- Linking table provides full traceability

### 2. Tracks Progression
- Clear visibility when poles are assigned numbers
- Agent changes detected between stages
- Location verification through GPS matching

### 3. Detects Issues
- Agent name mismatches flagged for review
- Location conflicts identified (>200m difference)
- Duplicate pole assignments prevented

### 4. Supports Different Workflows
- **Auto-linking**: High confidence matches (>90%)
- **Manual review**: Conflicts or low confidence
- **GPS matching**: Location-based linking for missing data

## Implementation Plan

### Phase 1: Data Model Setup (Week 1)
- Create Firestore collections
- Implement TypeScript interfaces
- Add basic CRUD operations

### Phase 2: Reconciliation Service (Week 2)  
- Implement matching algorithms
- Add conflict detection logic
- Create automated daily job

### Phase 3: UI Components (Week 3)
- Permission-assignment dashboard
- Conflict resolution interface
- Manual linking workflow

### Phase 4: Integration (Week 4)
- Connect to existing OneMap processing
- Integrate with pole tracker system
- Add reporting and analytics

## Usage Examples 

### 1. High Confidence Auto-Link
```
Permission: John Smith approved pole at GPS(-26.1234, 28.5678)
Assignment: Pole LAW.P.B167 assigned at GPS(-26.1235, 28.5679) to John Smith
→ AUTO LINK (GPS distance: 15m, Agent match: exact)
```

### 2. Agent Mismatch Conflict  
```
Permission: John Smith approved pole at address "123 Main St"
Assignment: Pole LAW.P.B167 assigned to Jane Doe at "123 Main Street"
→ CONFLICT FLAG (Review required: Different agents for same pole)
```

### 3. Location Mismatch
```
Permission: Agent approved pole at GPS(-26.1234, 28.5678) 
Assignment: Pole LAW.P.B167 at GPS(-26.1534, 28.6078)
→ CONFLICT FLAG (Distance: 450m - Verify if same pole)
```

## Quality Assurance

### 1. Data Validation
- Property ID uniqueness enforced
- GPS coordinates validated (South Africa bounds)
- Agent name standardization
- Pole number format validation

### 2. Matching Accuracy
- Confidence threshold tuning (>90% for auto-link)
- GPS distance limits (100m proximity, 200m conflict)  
- Name similarity algorithms (Levenshtein distance)
- Manual override capability

### 3. Audit Trail
- All linking decisions logged
- Conflict resolution tracked
- Payment implications documented
- System performance metrics

This strategy provides a robust foundation for reconnecting pole permissions with assignments while maintaining data integrity and supporting payment verification workflows.