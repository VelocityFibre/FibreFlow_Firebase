"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, User, MapPin } from "lucide-react"
import { mockBOQItems } from "@/lib/mock-data"
import type { Project } from "@/lib/types" // Import the updated Project type
import Link from "next/link"

const projectsData: Project[] = [
  {
    id: "PRJ-001",
    name: "Westside Fiber Deployment",
    projectManager: "John Doe",
    location: "Westside District",
    startDate: "2024-01-15",
    status: "In Progress",
    endDate: "2024-06-30",
    budget: 1500000,
    customer: "Westside Municipality",
    phase: "WIP - Civils Work",
    progress: 65,
  },
  {
    id: "PRJ-002",
    name: "Downtown Network Expansion",
    projectManager: "Sarah Johnson",
    location: "Downtown Core",
    startDate: "2024-02-01",
    status: "Completed",
    endDate: "2024-05-15",
    budget: 2000000,
    customer: "Downtown Business District",
    phase: "Handover",
    progress: 100,
  },
  {
    id: "PRJ-003",
    name: "Rural Connectivity Phase 2",
    projectManager: "Mike Wilson",
    location: "Rural Areas",
    startDate: "2024-01-10",
    status: "In Progress",
    endDate: "2024-04-30",
    budget: 1200000,
    customer: "Rural Development Corp",
    phase: "IP - Planning",
    progress: 35,
  },
  {
    id: "PRJ-004",
    name: "Industrial Park Installation",
    projectManager: "Emily Chen",
    location: "Industrial Park",
    startDate: "2024-03-01",
    status: "Planned",
    endDate: "2024-09-30",
    budget: 800000,
    customer: "Industrial Park Authority",
    phase: "IP - Initiation",
    progress: 10,
  },
]

export function Projects() {
  const [projects, setProjects] = useState<Project[]>(projectsData)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: "",
    projectManager: "",
    startDate: "",
    endDate: "",
    status: "Planned",
    location: "",
    budget: 0,
  })

  const statuses = ["In Progress", "Planned", "Completed"]

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectManager.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getProjectStats = (projectId: string) => {
    const boqItems = mockBOQItems.filter((item) => item.projectId === projectId)
    const totalBOQValue = boqItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const allocatedValue = boqItems.reduce((sum, item) => sum + item.allocatedQuantity * item.unitPrice, 0)
    const progress = totalBOQValue > 0 ? (allocatedValue / totalBOQValue) * 100 : 0
    return { boqItems: boqItems.length, totalBOQValue, allocatedValue, progress }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Progress":
        return <Badge className="bg-green-100 text-green-800">In Progress</Badge>
      case "Planned":
        return <Badge variant="secondary">Planned</Badge>
      case "Completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const today = new Date()
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleAddProject = () => {
    if (newProject.name && newProject.projectManager && newProject.startDate && newProject.endDate) {
      const project: Project = {
        id: `PRJ-${String(projects.length + 1).padStart(3, "0")}`,
        name: newProject.name,
        projectManager: newProject.projectManager,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        status: (newProject.status as Project["status"]) || "Planned",
        location: newProject.location || "",
        budget: newProject.budget || 0,
        customer: newProject.customer || "",
        phase: "IP - Initiation",
        progress: 0,
      }
      setProjects([...projects, project])
      setNewProject({
        name: "",
        projectManager: "",
        startDate: "",
        endDate: "",
        status: "Planned",
        location: "",
        budget: 0,
      })
      setIsAddDialogOpen(false)
    }
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setNewProject(project)
  }

  const handleUpdateProject = () => {
    if (editingProject && newProject.name) {
      const updatedProject: Project = {
        ...editingProject,
        ...newProject,
      } as Project

      setProjects(projects.map((project) => (project.id === editingProject.id ? updatedProject : project)))
      setEditingProject(null)
      setNewProject({
        name: "",
        projectManager: "",
        startDate: "",
        endDate: "",
        status: "Planned",
        location: "",
        budget: 0,
      })
    }
  }

  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter((project) => project.id !== id))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage and track all your fiber deployment projects</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="cursor-pointer transition-all hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription>{project.customer}</CardDescription>
                  </div>
                  <Badge variant={project.status === "In Progress" ? "default" : "secondary"}>{project.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {project.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Started {new Date(project.startDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {project.projectManager}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Phase: {project.phase}</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
