# Audit Logging Implementation Plan

This document outlines all the logging points and requirements for implementing real-time audit logging with Supabase integration.

## 📋 Database Schema (Supabase Tables)

### `audit_logs` Table
\`\`\`sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('Error', 'Warning', 'Info', 'Debug', 'Security')),
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  ip_address INET,
  user_agent TEXT,
  resource_id TEXT,
  resource_type TEXT,
  old_value JSONB,
  new_value JSONB,
  duration INTEGER, -- milliseconds
  error_code TEXT,
  stack_trace TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_level ON audit_logs(level);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
\`\`\`

## 🎯 Logging Points to Implement

### 1. Authentication Events
**File**: `app/login/page.tsx`
\`\`\`typescript
// Login success
AuditLogger.log({
  level: 'Info',
  category: 'Authentication',
  action: 'USER_LOGIN',
  description: 'User successfully logged in',
  userId: user.id,
  userName: user.name
});

// Login failure
AuditLogger.log({
  level: 'Security',
  category: 'Authentication', 
  action: 'FAILED_LOGIN_ATTEMPT',
  description: 'Failed login attempt with invalid credentials',
  userName: attemptedUsername
});

// Logout
AuditLogger.log({
  level: 'Info',
  category: 'Authentication',
  action: 'USER_LOGOUT',
  description: 'User logged out successfully',
  userId: user.id,
  userName: user.name
});
\`\`\`

### 2. Task Management Events
**File**: `app/staff/[id]/page.tsx`, `app/projects/[id]/page.tsx`
\`\`\`typescript
// Task status update
AuditLogger.log({
  level: 'Info',
  category: 'Task Management',
  action: 'TASK_STATUS_UPDATE',
  description: `Task status updated from '${oldStatus}' to '${newStatus}'`,
  resourceId: task.id,
  resourceType: 'Task',
  oldValue: oldStatus,
  newValue: newStatus
});

// Task assignment
AuditLogger.log({
  level: 'Info',
  category: 'Task Management',
  action: 'TASK_ASSIGNED',
  description: `Task assigned to ${assignee.name}`,
  resourceId: task.id,
  resourceType: 'Task',
  newValue: assignee.name
});

// Task flagging
AuditLogger.log({
  level: 'Warning',
  category: 'Task Management',
  action: 'TASK_FLAGGED',
  description: `Task flagged: ${flagReason}`,
  resourceId: task.id,
  resourceType: 'Task',
  newValue: flagReason
});
\`\`\`

### 3. Project Management Events
**File**: `app/projects/[id]/page.tsx`, `components/projects.tsx`
\`\`\`typescript
// Project creation
AuditLogger.log({
  level: 'Info',
  category: 'Project Management',
  action: 'PROJECT_CREATED',
  description: `New project created: ${project.name}`,
  resourceId: project.id,
  resourceType: 'Project',
  newValue: project.name
});

// Phase status change
AuditLogger.log({
  level: 'Info',
  category: 'Project Management',
  action: 'PHASE_STATUS_UPDATE',
  description: `Phase '${phase.name}' status changed from '${oldStatus}' to '${newStatus}'`,
  resourceId: phase.id,
  resourceType: 'Project Phase',
  oldValue: oldStatus,
  newValue: newStatus
});

// Phase flagging
AuditLogger.log({
  level: 'Warning',
  category: 'Project Management',
  action: 'PHASE_FLAGGED',
  description: `Phase flagged: ${flagReason}`,
  resourceId: phase.id,
  resourceType: 'Project Phase',
  newValue: flagReason
});
\`\`\`

### 4. Staff Management Events
**File**: `components/staff.tsx`, `app/staff/[id]/page.tsx`
\`\`\`typescript
// Staff member created
AuditLogger.log({
  level: 'Info',
  category: 'User Management',
  action: 'STAFF_CREATED',
  description: `New staff member added: ${staff.name}`,
  resourceId: staff.id,
  resourceType: 'Staff',
  newValue: `${staff.name} - ${staff.role}`
});

// Staff profile update
AuditLogger.log({
  level: 'Info',
  category: 'User Management',
  action: 'STAFF_UPDATED',
  description: `Staff profile updated for ${staff.name}`,
  resourceId: staff.id,
  resourceType: 'Staff',
  oldValue: oldData,
  newValue: newData
});
\`\`\`

### 5. Material Management Events
**File**: `components/stock-items.tsx`, `components/stock-movements.tsx`
\`\`\`typescript
// Stock update
AuditLogger.log({
  level: 'Info',
  category: 'Material Management',
  action: 'STOCK_UPDATED',
  description: `Stock quantity updated for ${item.name}`,
  resourceId: item.id,
  resourceType: 'Stock Item',
  oldValue: `${oldQuantity} ${item.unit}`,
  newValue: `${newQuantity} ${item.unit}`
});

// Low stock alert
AuditLogger.log({
  level: 'Warning',
  category: 'Material Management',
  action: 'LOW_STOCK_ALERT',
  description: `Stock level below minimum threshold for ${item.name}`,
  resourceId: item.id,
  resourceType: 'Stock Item',
  newValue: `${currentQuantity} ${item.unit} (min: ${minQuantity})`
});
\`\`\`

### 6. Client Management Events
**File**: `components/clients.tsx`, `app/clients/[id]/page.tsx`
\`\`\`typescript
// Client created
AuditLogger.log({
  level: 'Info',
  category: 'User Management',
  action: 'CLIENT_CREATED',
  description: `New client added: ${client.name}`,
  resourceId: client.id,
  resourceType: 'Client',
  newValue: client.name
});
\`\`\`

### 7. System Events
**File**: Various error boundaries and system components
\`\`\`typescript
// System errors
AuditLogger.log({
  level: 'Error',
  category: 'System',
  action: 'APPLICATION_ERROR',
  description: error.message,
  errorCode: error.code,
  stackTrace: error.stack
});

// Performance issues
AuditLogger.log({
  level: 'Warning',
  category: 'Performance',
  action: 'SLOW_OPERATION',
  description: `Operation exceeded performance threshold`,
  duration: operationTime,
  resourceType: 'API Call'
});
\`\`\`

### 8. Navigation Events
**File**: `app/page.tsx`, navigation components
\`\`\`typescript
// Page navigation
AuditLogger.log({
  level: 'Debug',
  category: 'System',
  action: 'PAGE_NAVIGATION',
  description: `User navigated to ${pageName}`,
  newValue: pageName
});
\`\`\`

## 🛠️ Implementation Components

### 1. Audit Logger Service
**File**: `lib/audit-logger.ts`
\`\`\`typescript
import { createClient } from '@supabase/supabase-js'

class AuditLogger {
  private static supabase = createClient(...)
  
  static async log(entry: Partial<AuditLogEntry>) {
    // Add automatic fields
    const logEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      ip_address: await this.getClientIP(),
      user_agent: navigator.userAgent,
      session_id: this.getSessionId()
    }
    
    // Insert to Supabase
    await this.supabase.from('audit_logs').insert(logEntry)
    
    // Optional: Real-time updates
    this.notifyRealTimeListeners(logEntry)
  }
}
\`\`\`

### 2. React Hook for Logging
**File**: `hooks/use-audit-logger.ts`
\`\`\`typescript
export function useAuditLogger() {
  const logAction = useCallback((entry: Partial<AuditLogEntry>) => {
    AuditLogger.log({
      ...entry,
      user_id: currentUser?.id,
      user_name: currentUser?.name
    })
  }, [currentUser])
  
  return { logAction }
}
\`\`\`

### 3. Error Boundary with Logging
**File**: `components/error-boundary.tsx`
\`\`\`typescript
export class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    AuditLogger.log({
      level: 'Error',
      category: 'System',
      action: 'REACT_ERROR',
      description: error.message,
      stack_trace: error.stack
    })
  }
}
\`\`\`

## 📊 Real-time Updates

### Supabase Realtime Subscription
\`\`\`typescript
// In audit-trail.tsx component
useEffect(() => {
  const subscription = supabase
    .channel('audit_logs')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'audit_logs' },
      (payload) => {
        setLogs(prev => [payload.new, ...prev])
      }
    )
    .subscribe()
    
  return () => subscription.unsubscribe()
}, [])
\`\`\`

## 🔐 Security Considerations

1. **Sensitive Data**: Never log passwords, tokens, or sensitive personal information
2. **Data Retention**: Implement log rotation and archival policies
3. **Access Control**: Restrict audit log access to administrators only
4. **Encryption**: Encrypt sensitive log data at rest
5. **Rate Limiting**: Prevent log spam from malicious users

## 📈 Performance Optimization

1. **Batch Logging**: Group multiple log entries for bulk insert
2. **Async Logging**: Don't block user actions waiting for log writes
3. **Indexing**: Proper database indexes for fast queries
4. **Pagination**: Implement cursor-based pagination for large log sets
5. **Caching**: Cache frequently accessed log summaries

## 🚀 Implementation Priority

### Phase 1 (High Priority)
- [ ] Authentication events
- [ ] Task management events
- [ ] Project phase changes
- [ ] System errors

### Phase 2 (Medium Priority)
- [ ] Staff management events
- [ ] Material management events
- [ ] Client management events
- [ ] Performance monitoring

### Phase 3 (Low Priority)
- [ ] Navigation tracking
- [ ] Debug events
- [ ] Advanced analytics
- [ ] Real-time notifications

## 📝 Testing Checklist

- [ ] Log entries are created for all major actions
- [ ] Sensitive data is not logged
- [ ] Performance impact is minimal
- [ ] Real-time updates work correctly
- [ ] Filtering and search perform well
- [ ] Export functionality works
- [ ] Error handling is robust
- [ ] Database indexes are effective
