"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Edit,
  MapPin,
  CalendarDays,
  UserCircle,
  DollarSign,
  Building,
  Mail,
  Phone,
  Activity,
  Flag,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  Circle,
  MoreVertical,
  Save,
  X,
  ListChecks,
  Layers,
  Plus,
  User,
  ClipboardList,
  FileSpreadsheet,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { mockProjectDetails } from "@/lib/mock-project-details"
import { notFound, useParams, useRouter } from "next/navigation"
import type { Project, ProjectPhase, ProjectPhaseStatus } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

// Helper function to format currency
const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined) return "N/A"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount)
}

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  console.log("Project ID from params:", projectId)
  console.log(
    "Available project IDs:",
    mockProjectDetails.map((p) => p.id),
  )

  const [project, setProject] = useState<Project | null>(null)
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false)
  const [currentFlaggingPhaseIndex, setCurrentFlaggingPhaseIndex] = useState<number | null>(null)
  const [flagReason, setFlagReason] = useState("")
  const [editingPhaseIndex, setEditingPhaseIndex] = useState<number | null>(null)
  const [editingPhaseData, setEditingPhaseData] = useState<Partial<ProjectPhase>>({})
  const [activeTab, setActiveTab] = useState("overview")

  // Task management states
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskData, setEditingTaskData] = useState<{
    name: string
    description?: string
    assignee?: string
    dueDate?: string
    priority?: string
  }>({
    name: "",
    description: "",
    assignee: "",
    dueDate: "",
    priority: "Medium",
  })

  const [tasks, setTasks] = useState<
    Record<
      string,
      {
        id: string
        name: string
        description?: string
        assignee?: string
        dueDate?: string
        priority?: string
        status: string
        phase: string
      }
    >
  >({
    "project-scoping": {
      id: "project-scoping",
      name: "Project scoping and design",
      description: "Complete project scoping and design documentation",
      assignee: "John Smith",
      dueDate: "2024-01-15",
      priority: "High",
      status: "Pending",
      phase: "IP",
    },
    "budget-approval": {
      id: "budget-approval",
      name: "Budget approval and allocation",
      description: "Get budget approval from stakeholders",
      assignee: "Sarah Johnson",
      dueDate: "2024-01-20",
      priority: "High",
      status: "Pending",
      phase: "IP",
    },
    "project-kickoff": {
      id: "project-kickoff",
      name: "Project kick-off meeting",
      description: "Conduct project kickoff meeting with all stakeholders",
      assignee: "Mike Wilson",
      dueDate: "2024-01-25",
      priority: "Medium",
      status: "Pending",
      phase: "IP",
    },
    "resource-allocation": {
      id: "resource-allocation",
      name: "Resource allocation and team assignment",
      description: "Allocate resources and assign team members",
      assignee: "Emily Chen",
      dueDate: "2024-01-30",
      priority: "High",
      status: "Pending",
      phase: "IP",
    },
    "permits-approvals": {
      id: "permits-approvals",
      name: "Permits and regulatory approvals",
      description: "Obtain all necessary permits and approvals",
      assignee: "David Wong",
      dueDate: "2024-02-05",
      priority: "High",
      status: "Pending",
      phase: "IP",
    },
    "pole-permissions": {
      id: "pole-permissions",
      name: "Pole permissions and wayleaves",
      description: "Secure pole permissions and wayleave agreements",
      assignee: "Lisa Chen",
      dueDate: "2024-02-10",
      priority: "Medium",
      status: "Pending",
      phase: "WIP",
    },
    trenching: {
      id: "trenching",
      name: "Trenching and excavation",
      description: "Perform trenching and excavation work",
      assignee: "Robert Taylor",
      dueDate: "2024-02-15",
      priority: "High",
      status: "Pending",
      phase: "WIP",
    },
    "duct-installation": {
      id: "duct-installation",
      name: "Duct installation",
      description: "Install underground ducts for fiber cables",
      assignee: "Jennifer Brown",
      dueDate: "2024-02-20",
      priority: "High",
      status: "Pending",
      phase: "WIP",
    },
    "cable-laying": {
      id: "cable-laying",
      name: "Cable laying and pulling",
      description: "Lay and pull fiber optic cables",
      assignee: "Michael Davis",
      dueDate: "2024-02-25",
      priority: "High",
      status: "Pending",
      phase: "WIP",
    },
    "fiber-splicing": {
      id: "fiber-splicing",
      name: "Fiber splicing and termination",
      description: "Splice and terminate fiber optic connections",
      assignee: "Amanda Wilson",
      dueDate: "2024-03-01",
      priority: "High",
      status: "Pending",
      phase: "WIP",
    },
    "equipment-installation": {
      id: "equipment-installation",
      name: "Equipment installation and configuration",
      description: "Install and configure network equipment",
      assignee: "Kevin Martinez",
      dueDate: "2024-03-05",
      priority: "High",
      status: "Pending",
      phase: "WIP",
    },
    "network-testing": {
      id: "network-testing",
      name: "Network testing and commissioning",
      description: "Test and commission the network infrastructure",
      assignee: "Rachel Garcia",
      dueDate: "2024-03-10",
      priority: "High",
      status: "Pending",
      phase: "WIP",
    },
  })

  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({
    "project-scoping": "Pending",
    "budget-approval": "Pending",
    "project-kickoff": "Pending",
    "resource-allocation": "Pending",
    "permits-approvals": "Pending",
    "pole-permissions": "Pending",
    trenching: "Pending",
    "duct-installation": "Pending",
    "cable-laying": "Pending",
    "fiber-splicing": "Pending",
    "equipment-installation": "Pending",
    "network-testing": "Pending",
    "asbuilt-docs": "Pending",
    "quality-testing": "Pending",
    "safety-compliance": "Pending",
    "client-training": "Pending",
    "handover-docs": "Pending",
    "warranty-setup": "Pending",
    "final-inspection": "Pending",
    "closure-docs": "Pending",
    "lessons-learned": "Pending",
    "acceptance-certificate": "Pending",
  })

  useEffect(() => {
    const foundProject = mockProjectDetails.find((p) => p.id === projectId)
    console.log("Found project:", foundProject)

    if (foundProject) {
      // Calculate overall progress if not provided
      const updatedProject = { ...foundProject }
      if (updatedProject.overallProgress === undefined && updatedProject.projectPhases) {
        const completedPhases = updatedProject.projectPhases.filter((p) => p.status === "Completed").length
        updatedProject.overallProgress = Math.round((completedPhases / updatedProject.projectPhases.length) * 100)
      }
      // Set current phase name and progress if not provided
      if (updatedProject.currentPhaseName === undefined && updatedProject.projectPhases) {
        const activePhase =
          updatedProject.projectPhases.find((p) => p.status === "Started") ||
          updatedProject.projectPhases.find((p) => p.status === "Pending") ||
          updatedProject.projectPhases[updatedProject.projectPhases.length - 1]
        if (activePhase) {
          updatedProject.currentPhaseName = activePhase.name
          updatedProject.currentPhaseProgress =
            activePhase.progress ||
            (activePhase.status === "Completed" ? 100 : activePhase.status === "Started" ? 50 : 0)
        }
      }
      setProject(updatedProject)
    } else {
      console.error("Project not found with ID:", projectId)
      notFound()
    }
  }, [projectId])

  const projectPhases = useMemo(() => project?.projectPhases || [], [project])

  if (!project) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading project details...</p>
      </div>
    )
  }

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "In Progress":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">{status}</Badge>
      case "Planned":
        return <Badge variant="secondary">{status}</Badge>
      case "Completed":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">{status}</Badge>
      case "Active":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">{status}</Badge>
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>
    }
  }

  const handlePhaseStatusChange = (phaseIndex: number) => {
    setProject((prevProject) => {
      if (!prevProject || !prevProject.projectPhases) return prevProject

      const newPhases = [...prevProject.projectPhases]
      const currentPhase = newPhases[phaseIndex]
      let nextStatus: ProjectPhaseStatus = "Pending"

      // Cycle through statuses: Pending -> Started -> Flagged -> Completed -> Pending
      if (currentPhase.status === "Pending") {
        nextStatus = "Started"
      } else if (currentPhase.status === "Started") {
        nextStatus = "Flagged"
      } else if (currentPhase.status === "Flagged") {
        nextStatus = "Completed"
      } else if (currentPhase.status === "Completed") {
        nextStatus = "Pending"
      }

      // Update the phase status and set isFlagged appropriately
      newPhases[phaseIndex] = {
        ...currentPhase,
        status: nextStatus,
        isFlagged: nextStatus === "Flagged",
      }

      toast({
        title: "Phase Status Updated",
        description: `Phase "${newPhases[phaseIndex].name}" is now ${nextStatus}.`,
      })

      return { ...prevProject, projectPhases: newPhases }
    })
  }

  const openFlagDialog = (phaseIndex: number) => {
    setCurrentFlaggingPhaseIndex(phaseIndex)
    setFlagReason(project.projectPhases?.[phaseIndex]?.flagReason || "")
    setIsFlagDialogOpen(true)
  }

  const handleSaveFlagReason = () => {
    if (currentFlaggingPhaseIndex === null) return
    setProject((prevProject) => {
      if (!prevProject || !prevProject.projectPhases) return prevProject
      const newPhases = [...prevProject.projectPhases]
      newPhases[currentFlaggingPhaseIndex] = {
        ...newPhases[currentFlaggingPhaseIndex],
        isFlagged: true,
        flagReason: flagReason,
      }
      toast({
        title: "Phase Flagged",
        description: `Phase "${newPhases[currentFlaggingPhaseIndex].name}" has been flagged.`,
      })
      return { ...prevProject, projectPhases: newPhases }
    })
    setIsFlagDialogOpen(false)
    setCurrentFlaggingPhaseIndex(null)
    setFlagReason("")
  }

  const handleUnflagPhase = (phaseIndex: number) => {
    setProject((prevProject) => {
      if (!prevProject || !prevProject.projectPhases) return prevProject
      const newPhases = [...prevProject.projectPhases]
      newPhases[phaseIndex] = { ...newPhases[phaseIndex], isFlagged: false, flagReason: "" }
      toast({ title: "Phase Unflagged", description: `Phase "${newPhases[phaseIndex].name}" is no longer flagged.` })
      return { ...prevProject, projectPhases: newPhases }
    })
  }

  const getPhaseStatusIndicator = (status: ProjectPhaseStatus) => {
    switch (status) {
      case "Pending":
        return <Circle className="h-5 w-5 text-gray-400" />
      case "Started":
        return <PlayCircle className="h-5 w-5 text-blue-500" />
      case "Completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const startEditingPhase = (index: number) => {
    setEditingPhaseIndex(index)
    setEditingPhaseData(project.projectPhases?.[index] || {})
  }

  const handleEditingPhaseChange = (field: keyof ProjectPhase, value: string) => {
    setEditingPhaseData((prev) => ({ ...prev, [field]: value }))
  }

  const saveEditingPhase = () => {
    if (editingPhaseIndex === null) return
    setProject((prevProject) => {
      if (!prevProject || !prevProject.projectPhases) return prevProject
      const newPhases = [...prevProject.projectPhases]
      newPhases[editingPhaseIndex] = { ...newPhases[editingPhaseIndex], ...editingPhaseData } as ProjectPhase
      toast({ title: "Phase Updated", description: `Phase "${newPhases[editingPhaseIndex].name}" has been updated.` })
      return { ...prevProject, projectPhases: newPhases }
    })
    setEditingPhaseIndex(null)
    setEditingPhaseData({})
  }

  const cancelEditingPhase = () => {
    setEditingPhaseIndex(null)
    setEditingPhaseData({})
  }

  // Task management functions
  const handleTaskStatusChange = (taskId: string) => {
    setTaskStatuses((prev) => {
      const currentStatus = prev[taskId] || "Pending"
      let nextStatus = "Pending"

      // Cycle through statuses: Pending -> In Progress -> Completed -> Pending
      if (currentStatus === "Pending") {
        nextStatus = "In Progress"
      } else if (currentStatus === "In Progress") {
        nextStatus = "Completed"
      } else if (currentStatus === "Completed") {
        nextStatus = "Pending"
      }

      toast({
        title: "Task Status Updated",
        description: `Task status changed to ${nextStatus}.`,
      })

      return { ...prev, [taskId]: nextStatus }
    })
  }

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "In Progress":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">In Progress</Badge>
      case "Completed":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Completed</Badge>
      case "Pending":
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const openTaskDialog = (taskId?: string) => {
    if (taskId && tasks[taskId]) {
      setEditingTaskId(taskId)
      setEditingTaskData({
        name: tasks[taskId].name,
        description: tasks[taskId].description || "",
        assignee: tasks[taskId].assignee || "",
        dueDate: tasks[taskId].dueDate || "",
        priority: tasks[taskId].priority || "Medium",
      })
    } else {
      setEditingTaskId(null)
      setEditingTaskData({
        name: "",
        description: "",
        assignee: "",
        dueDate: "",
        priority: "Medium",
      })
    }
    setIsTaskDialogOpen(true)
  }

  const saveTask = () => {
    if (editingTaskId) {
      // Update existing task
      setTasks((prev) => ({
        ...prev,
        [editingTaskId]: {
          ...prev[editingTaskId],
          ...editingTaskData,
        },
      }))
      toast({
        title: "Task Updated",
        description: `Task "${editingTaskData.name}" has been updated.`,
      })
    } else {
      // Add new task
      const newTaskId = `task-${Date.now()}`
      setTasks((prev) => ({
        ...prev,
        [newTaskId]: {
          id: newTaskId,
          name: editingTaskData.name,
          description: editingTaskData.description,
          assignee: editingTaskData.assignee,
          dueDate: editingTaskData.dueDate,
          priority: editingTaskData.priority,
          status: "Pending",
          phase: "IP",
        },
      }))
      setTaskStatuses((prev) => ({
        ...prev,
        [newTaskId]: "Pending",
      }))
      toast({
        title: "Task Added",
        description: `Task "${editingTaskData.name}" has been added.`,
      })
    }
    setIsTaskDialogOpen(false)
  }

  const deleteTask = (taskId: string) => {
    setTasks((prev) => {
      const newTasks = { ...prev }
      delete newTasks[taskId]
      return newTasks
    })
    setTaskStatuses((prev) => {
      const newStatuses = { ...prev }
      delete newStatuses[taskId]
      return newStatuses
    })
    toast({
      title: "Task Deleted",
      description: "Task has been removed from the project.",
    })
  }

  const handleBackClick = () => {
    // Navigate back to the main app
    window.location.href = "/"
  }

  const handleBOQClick = () => {
    router.push(`/projects/${projectId}/boq`)
  }

  const handleRFQClick = () => {
    router.push(`/projects/${projectId}/rfq`)
  }

  const StatCard = ({
    title,
    value,
    subValue,
    icon: Icon,
    progressValue,
    progressTotalLabel,
  }: {
    title: string
    value: string
    subValue?: string
    icon: React.ElementType
    progressValue?: number
    progressTotalLabel?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        {progressValue !== undefined && (
          <div className="mt-2">
            <Progress value={progressValue} className="h-2" />
            {progressTotalLabel && <p className="text-xs text-muted-foreground mt-1">{progressTotalLabel}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const createIndividualTask = (phaseTaskId: string, phaseTaskName: string) => {
    // This would create a task in the main tasks system
    const newTask = {
      id: Date.now(),
      title: phaseTaskName,
      project: project.name,
      assignee: "Unassigned", // Could open assignment dialog
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 7 days from now
      priority: "Medium" as "High" | "Medium" | "Low",
      status: "Not Started" as "Not Started" | "In Progress" | "Completed",
      description: `Task from ${project.name} project phase`,
      projectPhaseTask: true,
      phaseTaskId: phaseTaskId,
    }

    toast({
      title: "Individual Task Created",
      description: `"${phaseTaskName}" has been added to the main tasks list`,
    })
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleBackClick}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Projects</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {project.description || "No description available."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusBadge(project.status)}
          <Button variant="default">
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Overall Progress"
          value={`${project.overallProgress || 0}%`}
          icon={Activity}
          progressValue={project.overallProgress || 0}
        />
        <StatCard
          title="Budget Used"
          value={formatCurrency(project.budgetUsed)}
          subValue={`of ${formatCurrency(project.budget)} budget`}
          icon={DollarSign}
          progressValue={project.budget && project.budgetUsed ? (project.budgetUsed / project.budget) * 100 : 0}
        />
        <StatCard
          title="Active Tasks"
          value={project.activeTasksCount?.toString() || "0"}
          subValue={`${project.completedTasksCount || 0} completed`}
          icon={ListChecks}
        />
        <StatCard
          title="Current Phase"
          value={project.currentPhaseName || "N/A"}
          subValue={`${project.currentPhaseProgress || 0}% complete`}
          icon={Layers}
          progressValue={project.currentPhaseProgress || 0}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="phases">Phases</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="contractors">Contractors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>{project.location}</span>
                </div>
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>
                    {new Date(project.startDate).toLocaleDateString()} -{" "}
                    {new Date(project.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center">
                  <UserCircle className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>{project.projectManager}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>{formatCurrency(project.budget)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>{project.customer || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <UserCircle className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>Contact: {project.customerContact || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>{project.customerEmail || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" />
                  <span>{project.customerPhone || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            {/* BOQ Management Card */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleBOQClick}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">BOQ Management</CardTitle>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold">24 Items</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-medium">$450,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allocated:</span>
                    <span className="font-medium">$380,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Need Quotes:</span>
                    <span className="font-medium text-orange-600">6 Items</span>
                  </div>
                </div>
                <Progress value={84} className="h-2" />
                <p className="text-xs text-muted-foreground">84% allocated</p>
              </CardContent>
            </Card>

            {/* RFQ Management Card */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleRFQClick}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RFQ Management</CardTitle>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold">8 RFQs</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Open RFQs:</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Value:</span>
                    <span className="font-medium">$125,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue:</span>
                    <span className="font-medium text-red-600">1 RFQ</span>
                  </div>
                </div>
                <Progress value={62} className="h-2" />
                <p className="text-xs text-muted-foreground">62% responses received</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="phases" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Phases</CardTitle>
              <CardDescription>
                Click status button to cycle through: Pending → Started → Flagged → Completed. Click phase details to
                edit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectPhases.map((phase, index) => (
                <div
                  key={index}
                  className={`border p-4 rounded-md ${phase.isFlagged ? "border-red-500 bg-red-50 dark:bg-red-900/30" : "border-border"}`}
                >
                  {editingPhaseIndex === index ? (
                    <div className="space-y-3">
                      <Input
                        value={editingPhaseData.name || ""}
                        onChange={(e) => handleEditingPhaseChange("name", e.target.value)}
                        placeholder="Phase Name"
                        className="text-lg font-semibold"
                      />
                      <Input
                        value={editingPhaseData.duration || ""}
                        onChange={(e) => handleEditingPhaseChange("duration", e.target.value)}
                        placeholder="Duration (e.g., 1 week)"
                      />
                      <Textarea
                        value={editingPhaseData.description || ""}
                        onChange={(e) => handleEditingPhaseChange("description", e.target.value)}
                        placeholder="Description"
                        rows={2}
                      />
                      <Textarea
                        value={editingPhaseData.deliverables || ""}
                        onChange={(e) => handleEditingPhaseChange("deliverables", e.target.value)}
                        placeholder="Key Deliverables"
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={cancelEditingPhase}>
                          <X className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={saveEditingPhase}>
                          <Save className="h-4 w-4 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-grow cursor-pointer" onClick={() => startEditingPhase(index)}>
                        <div className="flex items-center">
                          <h3 className="text-lg font-semibold">
                            {index + 1}. {phase.name}
                            {phase.isFlagged && <Flag className="h-5 w-5 text-red-500 ml-2 inline-block" />}
                          </h3>
                        </div>
                        <Badge variant="secondary" className="mt-1">
                          {phase.duration}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-2">{phase.description}</p>
                        <p className="text-sm mt-2">
                          <span className="font-medium">Key Deliverables:</span> {phase.deliverables}
                        </p>
                        {phase.isFlagged && phase.flagReason && (
                          <p className="text-sm mt-2 text-red-600 italic">
                            <span className="font-medium">Flag Reason:</span> {phase.flagReason}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePhaseStatusChange(index)
                          }}
                          className={`
  ${
    phase.status === "Flagged"
      ? "border-red-400 text-red-700 bg-red-50 hover:bg-red-100"
      : phase.status === "Pending"
        ? "border-gray-400 text-gray-600 bg-gray-50 hover:bg-gray-100"
        : phase.status === "Started"
          ? "border-orange-400 text-orange-700 bg-orange-50 hover:bg-orange-100"
          : phase.status === "Completed"
            ? "border-green-400 text-green-700 bg-green-50 hover:bg-green-100"
            : "border-gray-400 text-gray-600 bg-gray-50 hover:bg-gray-100"
  }
`}
                        >
                          {phase.status}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingPhase(index)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Phase
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                openFlagDialog(index)
                              }}
                            >
                              <Flag className="mr-2 h-4 w-4" />
                              {phase.isFlagged ? "Edit Flag Reason" : "Flag Phase"}
                            </DropdownMenuItem>
                            {phase.isFlagged && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUnflagPhase(index)
                                }}
                                className="text-red-600"
                              >
                                <AlertTriangle className="mr-2 h-4 w-4" /> Unflag Phase
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project Tasks</CardTitle>
                <CardDescription>
                  Manage all project tasks. Click on any task to change its status or use the dropdown for more options.
                </CardDescription>
              </div>
              <Button onClick={() => openTaskDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Initiate Project (IP) Phase */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center">
                  <Circle className="h-5 w-5 mr-2 text-blue-500" />
                  Initiate Project (IP) Phase
                </h3>
                <div className="ml-7 space-y-2">
                  {Object.values(tasks)
                    .filter((task) => task.phase === "IP")
                    .map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-grow" onClick={() => handleTaskStatusChange(task.id)}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{task.name}</span>
                            {getTaskStatusBadge(taskStatuses[task.id] || task.status)}
                          </div>
                          {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {task.assignee && (
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {task.assignee}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="flex items-center">
                                <CalendarDays className="h-3 w-3 mr-1" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {task.priority && (
                              <Badge
                                variant={
                                  task.priority === "High"
                                    ? "destructive"
                                    : task.priority === "Medium"
                                      ? "default"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 ml-2">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                openTaskDialog(task.id)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Task
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteTask(task.id)
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                </div>
              </div>

              {/* Work in Progress (WIP) Phase */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center">
                  <PlayCircle className="h-5 w-5 mr-2 text-orange-500" />
                  Work in Progress (WIP) Phase
                </h3>
                <div className="ml-7 space-y-2">
                  {Object.values(tasks)
                    .filter((task) => task.phase === "WIP")
                    .map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-grow" onClick={() => handleTaskStatusChange(task.id)}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{task.name}</span>
                            {getTaskStatusBadge(taskStatuses[task.id] || task.status)}
                          </div>
                          {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {task.assignee && (
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {task.assignee}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="flex items-center">
                                <CalendarDays className="h-3 w-3 mr-1" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {task.priority && (
                              <Badge
                                variant={
                                  task.priority === "High"
                                    ? "destructive"
                                    : task.priority === "Medium"
                                      ? "default"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 ml-2">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                openTaskDialog(task.id)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Task
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteTask(task.id)
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Materials & Equipment</CardTitle>
              <CardDescription>Materials and equipment required for this project</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Materials management functionality will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contractors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Contractors & Suppliers</CardTitle>
              <CardDescription>External contractors and suppliers involved in this project</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Contractor management functionality will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flag Dialog */}
      <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Flag Phase Issue</DialogTitle>
            <DialogDescription>
              Provide a reason for flagging this phase. This will help track and resolve issues.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="flag-reason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="flag-reason"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Describe the issue or concern..."
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveFlagReason}>
              Save Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTaskId ? "Edit Task" : "Add New Task"}</DialogTitle>
            <DialogDescription>
              {editingTaskId ? "Update the task details below." : "Create a new task for this project."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-name" className="text-right">
                Name
              </Label>
              <Input
                id="task-name"
                value={editingTaskData.name}
                onChange={(e) => setEditingTaskData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Task name"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="task-description"
                value={editingTaskData.description}
                onChange={(e) => setEditingTaskData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Task description"
                className="col-span-3"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-assignee" className="text-right">
                Assignee
              </Label>
              <Input
                id="task-assignee"
                value={editingTaskData.assignee}
                onChange={(e) => setEditingTaskData((prev) => ({ ...prev, assignee: e.target.value }))}
                placeholder="Assigned to"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-due-date" className="text-right">
                Due Date
              </Label>
              <Input
                id="task-due-date"
                type="date"
                value={editingTaskData.dueDate}
                onChange={(e) => setEditingTaskData((prev) => ({ ...prev, dueDate: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-priority" className="text-right">
                Priority
              </Label>
              <Select
                value={editingTaskData.priority}
                onValueChange={(value) => setEditingTaskData((prev) => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveTask}>
              {editingTaskId ? "Update Task" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
