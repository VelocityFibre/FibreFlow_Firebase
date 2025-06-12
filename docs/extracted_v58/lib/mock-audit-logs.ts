export type AuditLogLevel = "Error" | "Warning" | "Info" | "Debug" | "Security"

export type AuditLogCategory =
  | "Authentication"
  | "User Management"
  | "Project Management"
  | "Task Management"
  | "Material Management"
  | "System"
  | "Data Access"
  | "Configuration"
  | "Performance"

export interface AuditLogEntry {
  id: string
  timestamp: string
  level: AuditLogLevel
  category: AuditLogCategory
  action: string
  description: string
  userId?: string
  userName?: string
  ipAddress?: string
  userAgent?: string
  resourceId?: string
  resourceType?: string
  oldValue?: string
  newValue?: string
  duration?: number // in milliseconds
  errorCode?: string
  stackTrace?: string
  sessionId?: string
}

export const mockAuditLogs: AuditLogEntry[] = [
  // Recent entries (last 24 hours)
  {
    id: "LOG-001",
    timestamp: "2024-01-15T14:30:25.123Z",
    level: "Info",
    category: "Authentication",
    action: "USER_LOGIN",
    description: "User successfully logged in",
    userId: "STAFF-001",
    userName: "John Smith",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    sessionId: "sess_abc123",
  },
  {
    id: "LOG-002",
    timestamp: "2024-01-15T14:25:12.456Z",
    level: "Info",
    category: "Task Management",
    action: "TASK_STATUS_UPDATE",
    description: "Task status updated from 'In Progress' to 'Completed'",
    userId: "STAFF-002",
    userName: "Sarah Johnson",
    resourceId: "TASK-001",
    resourceType: "Task",
    oldValue: "In Progress",
    newValue: "Completed",
    ipAddress: "192.168.1.101",
  },
  {
    id: "LOG-003",
    timestamp: "2024-01-15T14:20:08.789Z",
    level: "Warning",
    category: "Project Management",
    action: "PHASE_FLAGGED",
    description: "Project phase flagged due to material shortage",
    userId: "STAFF-003",
    userName: "Mike Wilson",
    resourceId: "PRJ-001",
    resourceType: "Project Phase",
    newValue: "Material shortage - waiting for supplier delivery",
    ipAddress: "192.168.1.102",
  },
  {
    id: "LOG-004",
    timestamp: "2024-01-15T14:15:33.234Z",
    level: "Error",
    category: "System",
    action: "DATABASE_CONNECTION_FAILED",
    description: "Failed to connect to database server",
    errorCode: "DB_CONN_TIMEOUT",
    stackTrace: "Error: Connection timeout\n  at Database.connect (db.js:45)\n  at async handler (api.js:12)",
    duration: 5000,
  },
  {
    id: "LOG-005",
    timestamp: "2024-01-15T14:10:15.567Z",
    level: "Info",
    category: "User Management",
    action: "STAFF_CREATED",
    description: "New staff member added to the system",
    userId: "ADMIN-001",
    userName: "Admin User",
    resourceId: "STAFF-008",
    resourceType: "Staff",
    newValue: "David Brown - Technician",
    ipAddress: "192.168.1.50",
  },
  {
    id: "LOG-006",
    timestamp: "2024-01-15T14:05:42.890Z",
    level: "Security",
    category: "Authentication",
    action: "FAILED_LOGIN_ATTEMPT",
    description: "Failed login attempt with invalid credentials",
    userName: "unknown_user",
    ipAddress: "203.0.113.45",
    userAgent: "curl/7.68.0",
    errorCode: "INVALID_CREDENTIALS",
  },
  {
    id: "LOG-007",
    timestamp: "2024-01-15T13:58:21.123Z",
    level: "Info",
    category: "Material Management",
    action: "STOCK_UPDATED",
    description: "Stock quantity updated for fiber optic cable",
    userId: "STAFF-004",
    userName: "Lisa Chen",
    resourceId: "ITEM-001",
    resourceType: "Stock Item",
    oldValue: "150 meters",
    newValue: "200 meters",
    ipAddress: "192.168.1.103",
  },
  {
    id: "LOG-008",
    timestamp: "2024-01-15T13:45:17.456Z",
    level: "Warning",
    category: "Performance",
    action: "SLOW_QUERY_DETECTED",
    description: "Database query exceeded performance threshold",
    duration: 3500,
    resourceType: "Database Query",
    newValue: "SELECT * FROM projects WHERE status = 'Active'",
  },
  {
    id: "LOG-009",
    timestamp: "2024-01-15T13:30:55.789Z",
    level: "Info",
    category: "Project Management",
    action: "PROJECT_CREATED",
    description: "New project created in the system",
    userId: "STAFF-001",
    userName: "John Smith",
    resourceId: "PRJ-005",
    resourceType: "Project",
    newValue: "Suburban Fiber Network - Phase 1",
    ipAddress: "192.168.1.100",
  },
  {
    id: "LOG-010",
    timestamp: "2024-01-15T13:25:33.012Z",
    level: "Debug",
    category: "System",
    action: "CACHE_CLEARED",
    description: "Application cache cleared successfully",
    userId: "ADMIN-001",
    userName: "Admin User",
    duration: 250,
    ipAddress: "192.168.1.50",
  },

  // Older entries (past week)
  {
    id: "LOG-011",
    timestamp: "2024-01-14T16:20:45.345Z",
    level: "Error",
    category: "Data Access",
    action: "UNAUTHORIZED_ACCESS_ATTEMPT",
    description: "Attempt to access restricted project data",
    userId: "STAFF-005",
    userName: "Tom Anderson",
    resourceId: "PRJ-002",
    resourceType: "Project",
    errorCode: "ACCESS_DENIED",
    ipAddress: "192.168.1.104",
  },
  {
    id: "LOG-012",
    timestamp: "2024-01-14T15:45:22.678Z",
    level: "Info",
    category: "Configuration",
    action: "SETTINGS_UPDATED",
    description: "System notification settings updated",
    userId: "ADMIN-001",
    userName: "Admin User",
    oldValue: "Email notifications: disabled",
    newValue: "Email notifications: enabled",
    ipAddress: "192.168.1.50",
  },
  {
    id: "LOG-013",
    timestamp: "2024-01-14T14:30:18.901Z",
    level: "Warning",
    category: "Material Management",
    action: "LOW_STOCK_ALERT",
    description: "Stock level below minimum threshold",
    resourceId: "ITEM-003",
    resourceType: "Stock Item",
    newValue: "Fiber splice enclosures: 5 units remaining (min: 10)",
  },
  {
    id: "LOG-014",
    timestamp: "2024-01-14T12:15:07.234Z",
    level: "Info",
    category: "Task Management",
    action: "TASK_ASSIGNED",
    description: "Task assigned to staff member",
    userId: "STAFF-001",
    userName: "John Smith",
    resourceId: "TASK-005",
    resourceType: "Task",
    newValue: "Assigned to: Sarah Johnson",
    ipAddress: "192.168.1.100",
  },
  {
    id: "LOG-015",
    timestamp: "2024-01-13T17:45:33.567Z",
    level: "Security",
    category: "Authentication",
    action: "PASSWORD_CHANGED",
    description: "User password changed successfully",
    userId: "STAFF-002",
    userName: "Sarah Johnson",
    ipAddress: "192.168.1.101",
    sessionId: "sess_def456",
  },
  {
    id: "LOG-016",
    timestamp: "2024-01-13T16:20:12.890Z",
    level: "Error",
    category: "System",
    action: "FILE_UPLOAD_FAILED",
    description: "Failed to upload project document",
    userId: "STAFF-003",
    userName: "Mike Wilson",
    errorCode: "FILE_SIZE_EXCEEDED",
    resourceType: "Document",
    ipAddress: "192.168.1.102",
  },
  {
    id: "LOG-017",
    timestamp: "2024-01-12T14:55:28.123Z",
    level: "Info",
    category: "Project Management",
    action: "PROJECT_STATUS_UPDATED",
    description: "Project status changed from 'Planned' to 'Active'",
    userId: "STAFF-001",
    userName: "John Smith",
    resourceId: "PRJ-003",
    resourceType: "Project",
    oldValue: "Planned",
    newValue: "Active",
    ipAddress: "192.168.1.100",
  },
  {
    id: "LOG-018",
    timestamp: "2024-01-12T11:30:45.456Z",
    level: "Debug",
    category: "Performance",
    action: "BACKUP_COMPLETED",
    description: "Daily database backup completed successfully",
    duration: 45000,
    resourceType: "Database Backup",
  },
  {
    id: "LOG-019",
    timestamp: "2024-01-11T09:15:33.789Z",
    level: "Warning",
    category: "System",
    action: "DISK_SPACE_WARNING",
    description: "Server disk space usage above 80%",
    newValue: "Disk usage: 85% (425GB used of 500GB total)",
  },
  {
    id: "LOG-020",
    timestamp: "2024-01-10T16:40:22.012Z",
    level: "Info",
    category: "Authentication",
    action: "USER_LOGOUT",
    description: "User logged out successfully",
    userId: "STAFF-004",
    userName: "Lisa Chen",
    ipAddress: "192.168.1.103",
    sessionId: "sess_ghi789",
    duration: 7200000, // 2 hours session
  },
]

// Helper functions for filtering and searching logs
export function filterLogsByLevel(logs: AuditLogEntry[], level: AuditLogLevel): AuditLogEntry[] {
  return logs.filter((log) => log.level === level)
}

export function filterLogsByCategory(logs: AuditLogEntry[], category: AuditLogCategory): AuditLogEntry[] {
  return logs.filter((log) => log.category === category)
}

export function filterLogsByUser(logs: AuditLogEntry[], userId: string): AuditLogEntry[] {
  return logs.filter((log) => log.userId === userId)
}

export function filterLogsByDateRange(logs: AuditLogEntry[], startDate: string, endDate: string): AuditLogEntry[] {
  return logs.filter((log) => {
    const logDate = new Date(log.timestamp)
    return logDate >= new Date(startDate) && logDate <= new Date(endDate)
  })
}

export function searchLogs(logs: AuditLogEntry[], searchTerm: string): AuditLogEntry[] {
  const term = searchTerm.toLowerCase()
  return logs.filter(
    (log) =>
      log.action.toLowerCase().includes(term) ||
      log.description.toLowerCase().includes(term) ||
      log.userName?.toLowerCase().includes(term) ||
      log.resourceType?.toLowerCase().includes(term),
  )
}
