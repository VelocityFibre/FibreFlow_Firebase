"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  User,
  Building2,
  Package,
  Users,
  UserCheck,
  Clock,
  ArrowRight,
} from "lucide-react"
import { mockFlaggedIssues, type FlaggedIssue } from "@/lib/mock-flagged-issues"

interface FlaggedIssuesProps {
  setActiveModule: (module: string) => void
}

export function FlaggedIssues({ setActiveModule }: FlaggedIssuesProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const filteredIssues = useMemo(() => {
    return mockFlaggedIssues.filter((issue) => {
      const matchesSearch =
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.flaggedBy.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter
      const matchesStatus = statusFilter === "all" || issue.status === statusFilter
      const matchesType = typeFilter === "all" || issue.type === typeFilter

      return matchesSearch && matchesSeverity && matchesStatus && matchesType
    })
  }, [searchTerm, severityFilter, statusFilter, typeFilter])

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "High":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white">High</Badge>
      case "Medium":
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-white">Medium</Badge>
      case "Low":
        return <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">Low</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <Badge variant="destructive">Open</Badge>
      case "In Progress":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">In Progress</Badge>
      case "Resolved":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Resolved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Project Phase":
        return <Building2 className="h-4 w-4" />
      case "Task":
        return <Clock className="h-4 w-4" />
      case "Material":
        return <Package className="h-4 w-4" />
      case "Supplier":
        return <Users className="h-4 w-4" />
      case "Client":
        return <UserCheck className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const handleIssueClick = (issue: FlaggedIssue) => {
    if (issue.projectId) {
      // Navigate to the specific project
      setActiveModule("projects")
      // In a real app, you'd also set the project ID and potentially the tab/phase
      // For now, we'll just navigate to projects - you could enhance this further
      setTimeout(() => {
        // This would ideally navigate to the specific project page
        window.location.href = `/projects/${issue.projectId}`
      }, 100)
    }
  }

  const stats = useMemo(() => {
    const total = filteredIssues.length
    const high = filteredIssues.filter((i) => i.severity === "High").length
    const open = filteredIssues.filter((i) => i.status === "Open").length
    const overdue = filteredIssues.filter((i) => i.dueDate && new Date(i.dueDate) < new Date()).length

    return { total, high, open, overdue }
  }, [filteredIssues])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Flagged Issues</h2>
        <p className="text-muted-foreground">
          Track and manage all flagged issues across projects, tasks, and operations.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Active flagged issues</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Awaiting resolution</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Calendar className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Project Phase">Project Phase</SelectItem>
                <SelectItem value="Task">Task</SelectItem>
                <SelectItem value="Material">Material</SelectItem>
                <SelectItem value="Supplier">Supplier</SelectItem>
                <SelectItem value="Client">Client</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setSeverityFilter("all")
                setStatusFilter("all")
                setTypeFilter("all")
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="grid gap-4">
        {filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No flagged issues found</h3>
              <p className="text-muted-foreground text-center">
                {searchTerm || severityFilter !== "all" || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Great! No issues are currently flagged."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredIssues.map((issue) => (
            <Card
              key={issue.id}
              className="cursor-pointer hover:shadow-md transition-all duration-200 group"
              onClick={() => handleIssueClick(issue)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(issue.type)}
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                        {issue.title}
                      </CardTitle>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getSeverityBadge(issue.severity)}
                      {getStatusBadge(issue.status)}
                      <Badge variant="outline">{issue.type}</Badge>
                      {issue.dueDate && new Date(issue.dueDate) < new Date() && (
                        <Badge variant="destructive">Overdue</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{issue.description}</p>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
                  {issue.projectName && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Project:</span>
                      <span>{issue.projectName}</span>
                    </div>
                  )}
                  {issue.phaseName && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Phase:</span>
                      <span>{issue.phaseName}</span>
                    </div>
                  )}
                  {issue.taskName && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Task:</span>
                      <span>{issue.taskName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Flagged by:</span>
                    <span>{issue.flaggedBy}</span>
                  </div>
                  {issue.assignedTo && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Assigned to:</span>
                      <span>{issue.assignedTo}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Flagged:</span>
                    <span>{new Date(issue.flaggedDate).toLocaleDateString()}</span>
                  </div>
                  {issue.dueDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Due:</span>
                      <span className={new Date(issue.dueDate) < new Date() ? "text-red-600 font-semibold" : ""}>
                        {new Date(issue.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {issue.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm font-medium">Tags:</span>
                    <div className="flex gap-1 flex-wrap">
                      {issue.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
