"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockStaff, mockTaskAssignments, type StaffMember, type TaskAssignment } from "@/lib/mock-staff"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ListChecks,
  Building2,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Clock3,
  MoreHorizontal,
  Edit,
  Flag,
  UserX,
  ExternalLink,
} from "lucide-react"

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const staffId = params.id as string
  const [staff, setStaff] = useState<StaffMember | null>(null)
  const [staffTasks, setStaffTasks] = useState<TaskAssignment[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedTask, setSelectedTask] = useState<TaskAssignment | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false)
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false)
  const [flagReason, setFlagReason] = useState("")
  const [newStatus, setNewStatus] = useState<string>("")
  const [newAssignee, setNewAssignee] = useState<string>("")

  useEffect(() => {
    const foundStaff = mockStaff.find((s) => s.id === staffId)
    if (foundStaff) {
      setStaff(foundStaff)
      // Find tasks assigned to this staff member
      const tasks = mockTaskAssignments.filter((task) => task.staffId === staffId)

      // Add project names to tasks (in a real app, this would come from the database)
      const tasksWithProjects = tasks.map((task) => ({
        ...task,
        projectName:
          task.projectId === "PRJ-001"
            ? "Westside Fiber Deployment"
            : task.projectId === "PRJ-002"
              ? "Downtown Network Expansion"
              : task.projectId === "PRJ-003"
                ? "Rural Connectivity Phase 2"
                : task.projectId === "PRJ-004"
                  ? "Industrial Park Installation"
                  : task.projectId === "PRJ-005"
                    ? "Municipal Broadband Initiative"
                    : `Project ${task.projectId}`,
      }))

      setStaffTasks(tasksWithProjects)
    } else {
      // Staff not found, redirect to staff listing
      router.push("/staff")
    }
  }, [staffId, router])

  const handleUpdateStatus = (task: TaskAssignment) => {
    console.log("Opening status dialog for task:", task.taskId)
    setSelectedTask(task)
    setNewStatus(task.status)
    setIsStatusDialogOpen(true)
  }

  const handleFlagTask = (task: TaskAssignment) => {
    console.log("Opening flag dialog for task:", task.taskId)
    setSelectedTask(task)
    setFlagReason("")
    setIsFlagDialogOpen(true)
  }

  const handleReassignTask = (task: TaskAssignment) => {
    console.log("Opening reassign dialog for task:", task.taskId)
    setSelectedTask(task)
    setNewAssignee("")
    setIsReassignDialogOpen(true)
  }

  const handleViewInProject = (task: TaskAssignment) => {
    console.log("Navigating to project:", task.projectId)
    window.location.href = `/projects/${task.projectId}`
  }

  if (!staff) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading staff details...</p>
      </div>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "Available":
        return "bg-green-500 hover:bg-green-600"
      case "Busy":
        return "bg-orange-500 hover:bg-orange-600"
      case "On Leave":
        return "bg-red-500 hover:bg-red-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const getAvailabilityIcon = (availability: string) => {
    switch (availability) {
      case "Available":
        return <CheckCircle2 className="h-4 w-4 mr-1" />
      case "Busy":
        return <Clock className="h-4 w-4 mr-1" />
      case "On Leave":
        return <AlertCircle className="h-4 w-4 mr-1" />
      default:
        return null
    }
  }

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            <CheckCircle className="h-3 w-3 mr-1" /> Completed
          </Badge>
        )
      case "In Progress":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
            <Clock3 className="h-3 w-3 mr-1" /> In Progress
          </Badge>
        )
      case "Delayed":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-white">
            <AlertTriangle className="h-3 w-3 mr-1" /> Delayed
          </Badge>
        )
      case "Assigned":
      default:
        return (
          <Badge variant="outline">
            <Clock3 className="h-3 w-3 mr-1" /> Assigned
          </Badge>
        )
    }
  }

  const handleBackClick = () => {
    // Navigate back to staff listing
    window.history.back()
  }

  const completedTasks = staffTasks.filter((task) => task.status === "Completed").length
  const taskCompletionRate = staffTasks.length > 0 ? (completedTasks / staffTasks.length) * 100 : 0

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleBackClick}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Staff</span>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={staff.avatar || "/placeholder.svg"} alt={staff.name} />
              <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{staff.name}</h1>
              <p className="text-muted-foreground flex items-center">
                <Briefcase className="h-4 w-4 mr-1" />
                {staff.role} • {staff.department}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={`${getAvailabilityColor(staff.availability)} text-white`}>
            {getAvailabilityIcon(staff.availability)}
            {staff.availability}
          </Badge>
          <Button variant="default">Edit Profile</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffTasks.length}</div>
            <p className="text-xs text-muted-foreground">{completedTasks} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(taskCompletionRate)}%</div>
            <Progress value={taskCompletionRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.activeProjects.length}</div>
            <p className="text-xs text-muted-foreground">Across {staff.activeProjects.length} teams</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Experience</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date().getFullYear() - new Date(staff.startDate).getFullYear()} years
            </div>
            <p className="text-xs text-muted-foreground">Since {new Date(staff.startDate).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="skills">Skills & Qualifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>{staff.email}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>{staff.phone}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>{staff.location}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>Started on {new Date(staff.startDate).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Professional Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{staff.bio || "No bio available."}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Tasks</CardTitle>
              <CardDescription>Tasks currently assigned to {staff.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {staffTasks.length > 0 ? (
                <div className="space-y-4">
                  {staffTasks.map((task) => (
                    <div key={task.taskId} className="border p-4 rounded-md hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium">{task.notes}</h3>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Project: {task.projectName || "Unknown Project"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {getTaskStatusBadge(task.status)}

                          {/* Alternative: Individual Action Buttons */}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateStatus(task)}
                              title="Update Status"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleFlagTask(task)} title="Flag Issue">
                              <Flag className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReassignTask(task)}
                              title="Reassign Task"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewInProject(task)}
                              title="View in Project"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Dropdown Menu as Backup */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuLabel>Manage Task</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleUpdateStatus(task)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Update Status
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleFlagTask(task)}>
                                <Flag className="mr-2 h-4 w-4" />
                                Flag Issue
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReassignTask(task)}>
                                <UserX className="mr-2 h-4 w-4" />
                                Reassign Task
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewInProject(task)}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View in Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {task.flagged && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <span className="font-medium text-red-600">Flagged:</span> {task.flagReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tasks currently assigned.</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => (window.location.href = "/tasks")}>
                View All Tasks
              </Button>
              <Button>Request New Task</Button>
            </CardFooter>
          </Card>

          {/* Status Update Dialog */}
          <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Update Task Status</DialogTitle>
                <DialogDescription>Change the status of this task to reflect its current progress.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-name">Task</Label>
                  <p className="text-sm font-medium">{selectedTask?.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Assigned">Assigned</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Delayed">Delayed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedTask && newStatus) {
                      // Update task status
                      const updatedTasks = staffTasks.map((task) =>
                        task.taskId === selectedTask.taskId ? { ...task, status: newStatus } : task,
                      )
                      setStaffTasks(updatedTasks)
                      setIsStatusDialogOpen(false)

                      // In a real app, you would save this to the backend
                      console.log(`Updated task ${selectedTask.taskId} status to ${newStatus}`)
                    }
                  }}
                >
                  Update Status
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Flag Issue Dialog */}
          <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Flag Task Issue</DialogTitle>
                <DialogDescription>Flag this task if there are issues that need attention.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-name">Task</Label>
                  <p className="text-sm font-medium">{selectedTask?.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="flag-reason">Reason for Flagging</Label>
                  <Textarea
                    id="flag-reason"
                    placeholder="Describe the issue with this task..."
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFlagDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedTask && flagReason) {
                      // Flag the task
                      const updatedTasks = staffTasks.map((task) =>
                        task.taskId === selectedTask.taskId ? { ...task, flagged: true, flagReason: flagReason } : task,
                      )
                      setStaffTasks(updatedTasks)
                      setIsFlagDialogOpen(false)
                      setFlagReason("")

                      // In a real app, you would save this to the backend
                      console.log(`Flagged task ${selectedTask.taskId}: ${flagReason}`)
                    }
                  }}
                >
                  Flag Issue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reassign Task Dialog */}
          <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Reassign Task</DialogTitle>
                <DialogDescription>Transfer this task to another team member.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-name">Task</Label>
                  <p className="text-sm font-medium">{selectedTask?.notes}</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-assignee">New Assignee</Label>
                  <Select value={newAssignee} onValueChange={setNewAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockStaff
                        .filter((s) => s.id !== staffId) // Don't show current staff member
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReassignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedTask && newAssignee) {
                      // Reassign the task
                      const updatedTasks = staffTasks.filter((task) => task.taskId !== selectedTask.taskId)
                      setStaffTasks(updatedTasks)
                      setIsReassignDialogOpen(false)

                      // In a real app, you would save this to the backend
                      console.log(`Reassigned task ${selectedTask.taskId} to staff ${newAssignee}`)
                    }
                  }}
                >
                  Reassign Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Projects</CardTitle>
              <CardDescription>Projects {staff.name} is currently working on</CardDescription>
            </CardHeader>
            <CardContent>
              {staff.activeProjects.length > 0 ? (
                <div className="space-y-4">
                  {staff.activeProjects.map((projectId) => (
                    <div
                      key={projectId}
                      className="border p-4 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Navigate to the project
                        window.location.href = `/projects/${projectId}`
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {projectId === "PRJ-001"
                              ? "Westside Fiber Deployment"
                              : projectId === "PRJ-002"
                                ? "Downtown Network Expansion"
                                : projectId === "PRJ-003"
                                  ? "Rural Connectivity Phase 2"
                                  : projectId === "PRJ-004"
                                    ? "Industrial Park Installation"
                                    : projectId === "PRJ-005"
                                      ? "Municipal Broadband Initiative"
                                      : `Project ${projectId}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Role: {staff.role === "Project Manager" ? "Lead" : "Contributor"}
                          </p>
                        </div>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No active projects.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Skills & Qualifications</CardTitle>
              <CardDescription>Technical skills and professional qualifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Technical Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {staff.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center">
                        <Wrench className="h-3 w-3 mr-1" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Certifications</h3>
                  <p className="text-sm text-muted-foreground">
                    Certification data not available in the current system.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline">Add Skill</Button>
              <Button>Add Certification</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
