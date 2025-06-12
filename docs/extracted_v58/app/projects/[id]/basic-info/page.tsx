"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockProjectDetails } from "@/lib/mock-project-details" // Assuming this mock data exists
import type { Project } from "@/lib/types" // Assuming Project type is defined
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function EditBasicInfoPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [projectData, setProjectData] = useState<Partial<Project> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const project = mockProjectDetails.find((p) => p.id === projectId)
    if (project) {
      setProjectData({
        name: project.name,
        description: project.description,
        projectType: project.projectType,
        priorityLevel: project.priorityLevel,
        projectCode: project.projectCode,
        projectManager: project.projectManager,
        customer: project.customer,
        location: project.location,
      })
    }
    setIsLoading(false)
  }, [projectId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProjectData((prev) => (prev ? { ...prev, [name]: value } : null))
  }

  const handleSelectChange = (name: string, value: string) => {
    setProjectData((prev) => (prev ? { ...prev, [name]: value } : null))
  }

  const handleSave = () => {
    console.log("Saving basic info:", projectData)
    // Here you would typically call an API to save the data
    router.push(`/projects/${projectId}`) // Navigate back to project details
  }

  if (isLoading) {
    return <div>Loading project details...</div>
  }

  if (!projectData) {
    return <div>Project not found.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Basic Information</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input id="name" name="name" value={projectData.name || ""} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Project Description</Label>
            <Textarea
              id="description"
              name="description"
              value={projectData.description || ""}
              onChange={handleChange}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select
                name="projectType"
                value={projectData.projectType || ""}
                onValueChange={(value) => handleSelectChange("projectType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FTTH">FTTH (Fiber to the Home)</SelectItem>
                  <SelectItem value="FTTB">FTTB (Fiber to the Building)</SelectItem>
                  <SelectItem value="Backbone">Backbone Network</SelectItem>
                  <SelectItem value="Enterprise">Enterprise Solution</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priorityLevel">Priority Level</Label>
              <Select
                name="priorityLevel"
                value={projectData.priorityLevel || "Medium"}
                onValueChange={(value) => handleSelectChange("priorityLevel", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="projectCode">Project Code</Label>
            <Input id="projectCode" name="projectCode" value={projectData.projectCode || ""} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="projectManager">Project Manager</Label>
            <Input
              id="projectManager"
              name="projectManager"
              value={projectData.projectManager || ""}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer">Customer</Label>
            <Input id="customer" name="customer" value={projectData.customer || ""} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" value={projectData.location || ""} onChange={handleChange} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
