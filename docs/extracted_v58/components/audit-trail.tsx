"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
  Shield,
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
} from "lucide-react"
import { mockAuditLogs, type AuditLogLevel, type AuditLogCategory } from "@/lib/mock-audit-logs"

const levelIcons = {
  Error: AlertCircle,
  Warning: AlertTriangle,
  Info: Info,
  Debug: Bug,
  Security: Shield,
}

const levelColors = {
  Error: "destructive",
  Warning: "secondary",
  Info: "default",
  Debug: "outline",
  Security: "default",
} as const

export function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<AuditLogLevel | "All">("All")
  const [selectedCategory, setSelectedCategory] = useState<AuditLogCategory | "All">("All")
  const [selectedUser, setSelectedUser] = useState<string>("All")
  const [dateRange, setDateRange] = useState<string>("24h")

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const users = mockAuditLogs.filter((log) => log.userName).map((log) => ({ id: log.userId!, name: log.userName! }))
    const uniqueUsersMap = new Map()
    users.forEach((user) => uniqueUsersMap.set(user.id, user))
    return Array.from(uniqueUsersMap.values())
  }, [])

  // Filter logs based on current filters
  const filteredLogs = useMemo(() => {
    let logs = [...mockAuditLogs]

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      logs = logs.filter(
        (log) =>
          log.action.toLowerCase().includes(term) ||
          log.description.toLowerCase().includes(term) ||
          log.userName?.toLowerCase().includes(term) ||
          log.resourceType?.toLowerCase().includes(term),
      )
    }

    // Filter by level
    if (selectedLevel !== "All") {
      logs = logs.filter((log) => log.level === selectedLevel)
    }

    // Filter by category
    if (selectedCategory !== "All") {
      logs = logs.filter((log) => log.category === selectedCategory)
    }

    // Filter by user
    if (selectedUser !== "All") {
      logs = logs.filter((log) => log.userId === selectedUser)
    }

    // Filter by date range
    const now = new Date()
    let startDate: Date
    switch (dateRange) {
      case "1h":
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(0)
    }

    logs = logs.filter((log) => new Date(log.timestamp) >= startDate)

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [searchTerm, selectedLevel, selectedCategory, selectedUser, dateRange])

  // Get statistics
  const stats = useMemo(() => {
    const total = filteredLogs.length
    const errors = filteredLogs.filter((log) => log.level === "Error").length
    const warnings = filteredLogs.filter((log) => log.level === "Warning").length
    const security = filteredLogs.filter((log) => log.level === "Security").length

    return { total, errors, warnings, security }
  }, [filteredLogs])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return ""
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(2)}s`
  }

  const handleExport = () => {
    const csvContent = [
      ["Timestamp", "Level", "Category", "Action", "Description", "User", "Resource", "IP Address"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.level,
          log.category,
          log.action,
          `"${log.description}"`,
          log.userName || "",
          log.resourceType || "",
          log.ipAddress || "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedLevel("All")
    setSelectedCategory("All")
    setSelectedUser("All")
    setDateRange("24h")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground">Monitor system activities, user actions, and security events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearFilters}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">In selected time range</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">Critical issues requiring attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.warnings}</div>
            <p className="text-xs text-muted-foreground">Potential issues to monitor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.security}</div>
            <p className="text-xs text-muted-foreground">Authentication & access events</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedLevel} onValueChange={(value) => setSelectedLevel(value as AuditLogLevel | "All")}>
              <SelectTrigger>
                <SelectValue placeholder="Log Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Levels</SelectItem>
                <SelectItem value="Error">Error</SelectItem>
                <SelectItem value="Warning">Warning</SelectItem>
                <SelectItem value="Info">Info</SelectItem>
                <SelectItem value="Debug">Debug</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as AuditLogCategory | "All")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Authentication">Authentication</SelectItem>
                <SelectItem value="User Management">User Management</SelectItem>
                <SelectItem value="Project Management">Project Management</SelectItem>
                <SelectItem value="Task Management">Task Management</SelectItem>
                <SelectItem value="Material Management">Material Management</SelectItem>
                <SelectItem value="System">System</SelectItem>
                <SelectItem value="Data Access">Data Access</SelectItem>
                <SelectItem value="Configuration">Configuration</SelectItem>
                <SelectItem value="Performance">Performance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Users</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{filteredLogs.length} events</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>Detailed view of all system activities and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No logs found matching the current filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const LevelIcon = levelIcons[log.level]
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">{formatTimestamp(log.timestamp)}</TableCell>
                        <TableCell>
                          <Badge variant={levelColors[log.level]} className="flex items-center gap-1 w-fit">
                            <LevelIcon className="h-3 w-3" />
                            {log.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.category}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.action}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={log.description}>
                            {log.description}
                          </div>
                          {log.errorCode && <div className="text-xs text-red-500 mt-1">Error: {log.errorCode}</div>}
                        </TableCell>
                        <TableCell>
                          {log.userName && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="text-xs">{log.userName}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.resourceType && (
                            <Badge variant="secondary" className="text-xs">
                              {log.resourceType}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                          {log.duration && <div>Duration: {formatDuration(log.duration)}</div>}
                          {log.oldValue && log.newValue && (
                            <div className="mt-1">
                              <div className="text-red-500">- {log.oldValue}</div>
                              <div className="text-green-500">+ {log.newValue}</div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
