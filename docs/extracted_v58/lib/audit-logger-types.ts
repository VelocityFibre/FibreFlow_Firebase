// Type definitions for future audit logging implementation

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
  id?: string
  timestamp?: string
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
  oldValue?: any
  newValue?: any
  duration?: number // in milliseconds
  errorCode?: string
  stackTrace?: string
  sessionId?: string
}

// Future implementation placeholder
export class AuditLogger {
  static async log(entry: Partial<AuditLogEntry>): Promise<void> {
    // TODO: Implement with Supabase integration
    console.log("Future audit log entry:", entry)
  }

  static async getLogs(filters?: {
    level?: AuditLogLevel
    category?: AuditLogCategory
    userId?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<AuditLogEntry[]> {
    // TODO: Implement with Supabase queries
    return []
  }
}
