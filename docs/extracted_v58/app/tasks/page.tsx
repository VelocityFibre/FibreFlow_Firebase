"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  CalendarIcon,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  XCircle,
  PlayCircle,
  Layers,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/types" // Import Task type from lib/types

export default function TasksPage() {
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    project: "",
    assignee: "",
    dueDate: "",
    priority: "Medium" as "High" | "Medium" | "Low",
    status: "Not Started" as "Not Started" | "In Progress" | "Completed",
  })
  const [selectedDate, setSelectedDate] = useState<Date>()

  const handleTaskClick = (task: Task) => {
    if (task.projectPhaseTask) {
      // Navigate to project's Tasks tab for project phase tasks
      const projectId =
        task.project === "Westside Fiber Deployment"
          ? "1"
          : task.project === "Downtown Network Expansion"
            ? "2"
            : task.project === "Rural Connectivity Phase 2"
              ? "3"
              : "1"
      window.location.href = `/projects/${projectId}?tab=tasks`
    } else {
      // For regular tasks, navigate to the project page
      const projectId =
        task.project === "Westside Fiber Deployment"
          ? "1"
          : task.project === "Downtown Network Expansion"
            ? "2"
            : task.project === "Rural Connectivity Phase 2"
              ? "3"
              : "1"
      window.location.href = `/projects/${projectId}`
    }
  }

  const projects = [
    "Westside Fiber Deployment",
    "Downtown Network Expansion",
    "Rural Connectivity Phase 2",
    "Industrial Park Installation",
    "Residential Complex Upgrade",
    "Business District Fiber",
    "School District Network",
  ]

  const teamMembers = [
    "John Doe",
    "Sarah Johnson",
    "Mike Wilson",
    "Emily Chen",
    "David Rodriguez",
    "Lisa Thompson",
    "Alex Kumar",
    "Maria Garcia",
  ]

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: "Complete pole permissions",
      project: "Westside Fiber Deployment",
      assignee: "John Doe",
      dueDate: "2024-01-20",
      priority: "High",
      status: "In Progress",
      description: "Obtain all necessary permits for pole installations",
      projectPhaseTask: false,
    },
    {
      id: 2,
      title: "Submit design documents",
      project: "Downtown Network Expansion",
      assignee: "Sarah Johnson",
      dueDate: "2024-01-21",
      priority: "Medium",
      status: "Not Started",
      description: "Finalize and submit technical design documentation",
      projectPhaseTask: false,
    },
    {
      id: 3,
      title: "Finalize contractor agreements",
      project: "Rural Connectivity Phase 2",
      assignee: "Mike Wilson",
      dueDate: "2024-01-22",
      priority: "High",
      status: "In Progress",
      description: "Complete contract negotiations with installation contractors",
      projectPhaseTask: false,
    },
    {
      id: 4,
      title: "Equipment procurement approval",
      project: "Industrial Park Installation",
      assignee: "Emily Chen",
      dueDate: "2024-01-23",
      priority: "Medium",
      status: "Not Started",
      description: "Get approval for fiber optic equipment purchase orders",
      projectPhaseTask: false,
    },
    {
      id: 5,
      title: "Site survey validation",
      project: "Westside Fiber Deployment",
      assignee: "John Doe",
      dueDate: "2024-01-18",
      priority: "Medium",
      status: "Completed",
      completedDate: "2024-01-18",
      projectPhaseTask: false,
    },
    {
      id: 6,
      title: "Initial design review",
      project: "Downtown Network Expansion",
      assignee: "Sarah Johnson",
      dueDate: "2024-01-17",
      priority: "High",
      status: "Completed",
      completedDate: "2024-01-17",
      projectPhaseTask: false,
    },
    {
      id: 7,
      title: "Phase 1 - Site Prep",
      project: "Westside Fiber Deployment",
      assignee: "John Doe",
      dueDate: "2024-02-01",
      priority: "High",
      status: "In Progress",
      description: "Prepare sites for fiber deployment",
      projectPhaseTask: true,
    },
    {
      id: 8,
      title: "Phase 2 - Fiber Installation",
      project: "Westside Fiber Deployment",
      assignee: "Sarah Johnson",
      dueDate: "2024-02-15",
      priority: "High",
      status: "Not Started",
      description: "Install fiber optic cables",
      projectPhaseTask: true,
    },
  ])

  const updateTaskStatus = (taskId: number, newStatus: "Not Started" | "In Progress" | "Completed") => {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id === taskId) {
          const updatedTask = {
            ...task,
            status: newStatus,
            completedDate: newStatus === "Completed" ? new Date().toISOString().split("T")[0] : task.completedDate,
          }

          // Show toast notification
          toast({
            title: "Task status updated",
            description: `"${task.title}" is now ${newStatus.toLowerCase()}`,
          })

          return updatedTask
        }
        return task
      }),
    )
  }

  const addNewTask = () => {
    if (!newTask.title || !newTask.project || !newTask.assignee || !selectedDate) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const task: Task = {
      id: Math.max(...tasks.map((t) => t.id)) + 1,
      title: newTask.title,
      description: newTask.description,
      project: newTask.project,
      assignee: newTask.assignee,
      dueDate: format(selectedDate, "yyyy-MM-dd"),
      priority: newTask.priority,
      status: newTask.status,
      projectPhaseTask: false,
    }

    setTasks((currentTasks) => [...currentTasks, task])

    // Reset form
    setNewTask({
      title: "",
      description: "",
      project: "",
      assignee: "",
      dueDate: "",
      priority: "Medium",
      status: "Not Started",
    })
    setSelectedDate(undefined)
    setIsNewTaskDialogOpen(false)

    toast({
      title: "Task created successfully",
      description: `"${task.title}" has been added to your tasks`,
    })
  }

  const activeTasks = tasks.filter((task) => task.status !== "Completed")
  const completedTasks = tasks.filter((task) => task.status === "Completed")
  const dueTodayTasks = tasks.filter(
    (task) => new Date(task.dueDate).toDateString() === new Date().toDateString() && task.status !== "Completed",
  )
  const projectPhaseTasks = tasks.filter((task) => task.projectPhaseTask === true)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your project tasks and assignments</p>
        </div>
        <Dialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsNewTaskDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Add a new task to your project. Fill in the details below.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="task-title">Task Title *</Label>
                <Input
                  id="task-title"
                  placeholder="Enter task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  placeholder="Enter task description"
                  value={newTask.description}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Project *</Label>
                  <Select
                    value={newTask.project}
                    onValueChange={(value) => setNewTask((prev) => ({ ...prev, project: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project} value={project}>
                          {project}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Assignee *</Label>
                  <Select
                    value={newTask.assignee}
                    onValueChange={(value) => setNewTask((prev) => ({ ...prev, assignee: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member} value={member}>
                          {member}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: "High" | "Medium" | "Low") =>
                      setNewTask((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={newTask.status}
                    onValueChange={(value: "Not Started" | "In Progress" | "Completed") =>
                      setNewTask((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addNewTask}>Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Tasks ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="due-today">Due Today ({dueTodayTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
          <TabsTrigger value="project-tasks">Project Phase Tasks ({projectPhaseTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeTasks.map((task) => (
              <Card
                key={task.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                onClick={() => handleTaskClick(task)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </CardTitle>
                      <CardDescription>{task.project}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={task.priority === "High" ? "destructive" : "secondary"}>{task.priority}</Badge>
                      <StatusBadge status={task.status} />
                      <TaskStatusDropdown task={task} updateTaskStatus={updateTaskStatus} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {task.assignee}
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="due-today" className="space-y-4">
          {dueTodayTasks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dueTodayTasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                  onClick={() => handleTaskClick(task)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                          {task.title}
                        </CardTitle>
                        <CardDescription>{task.project}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={task.priority === "High" ? "destructive" : "secondary"}>{task.priority}</Badge>
                        <StatusBadge status={task.status} />
                        <TaskStatusDropdown task={task} updateTaskStatus={updateTaskStatus} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {task.assignee}
                        </div>
                        <div className="flex items-center gap-2 text-orange-600 font-medium">
                          <CalendarIcon className="h-4 w-4" />
                          Due Today
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No tasks due today</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {completedTasks.map((task) => (
              <Card
                key={task.id}
                className="opacity-75 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group hover:opacity-90"
                onClick={() => handleTaskClick(task)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg line-through group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </CardTitle>
                      <CardDescription>{task.project}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Completed
                      </Badge>
                      <TaskStatusDropdown task={task} updateTaskStatus={updateTaskStatus} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {task.assignee}
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Completed {new Date(task.completedDate!).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="project-tasks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tasks
              .filter((task) => task.projectPhaseTask)
              .map((task) => (
                <Card
                  key={task.id}
                  className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group"
                  onClick={() => handleTaskClick(task)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                          <Layers className="h-5 w-5 text-blue-600" />
                          {task.title}
                        </CardTitle>
                        <CardDescription>{task.project}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                          Phase Task
                        </Badge>
                        <StatusBadge status={task.status} />
                        <TaskStatusDropdown task={task} updateTaskStatus={updateTaskStatus} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {task.assignee}
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Completed":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    case "In Progress":
      return (
        <Badge variant="default" className="bg-blue-500">
          <Clock className="h-3 w-3 mr-1" />
          In Progress
        </Badge>
      )
    case "Not Started":
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Not Started
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function TaskStatusDropdown({
  task,
  updateTaskStatus,
}: {
  task: Task
  updateTaskStatus: (taskId: number, status: "Not Started" | "In Progress" | "Completed") => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Change task status</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={task.status === "Not Started"}
          onClick={() => updateTaskStatus(task.id, "Not Started")}
          className="flex items-center gap-2"
        >
          <XCircle className="h-4 w-4" />
          <span>Mark as Not Started</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={task.status === "In Progress"}
          onClick={() => updateTaskStatus(task.id, "In Progress")}
          className="flex items-center gap-2"
        >
          <PlayCircle className="h-4 w-4" />
          <span>Mark as In Progress</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={task.status === "Completed"}
          onClick={() => updateTaskStatus(task.id, "Completed")}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          <span>Mark as Completed</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
