"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { mockProjectDetails } from "@/lib/mock-project-details"
import type { Project, ProjectPhase } from "@/lib/types"
import Link from "next/link"
import { ArrowLeft, CalendarIcon, PlusCircle, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

export default function EditTimelinePage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [projectData, setProjectData] = useState<Partial<Project> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const project = mockProjectDetails.find((p) => p.id === projectId)
    if (project) {
      setProjectData({
        startDate: project.startDate,
        endDate: project.endDate,
        workingHours: project.workingHours || { startTime: "08:00", endTime: "17:00" },
        allowWeekendWork: project.allowWeekendWork || false,
        allowNightWork: project.allowNightWork || false,
        projectPhases: project.projectPhases || [],
      })
    }
    setIsLoading(false)
  }, [projectId])

  const handleDateChange = (field: "startDate" | "endDate", date: Date | undefined) => {
    setProjectData((prev) => (prev ? { ...prev, [field]: date ? format(date, "yyyy-MM-dd") : "" } : null))
  }

  const handleWorkingHoursChange = (field: "startTime" | "endTime", value: string) => {
    setProjectData((prev) =>
      prev
        ? {
            ...prev,
            workingHours: {
              ...(prev.workingHours || { startTime: "08:00", endTime: "17:00" }),
              [field]: value,
            },
          }
        : null,
    )
  }

  const handleSwitchChange = (field: "allowWeekendWork" | "allowNightWork", checked: boolean) => {
    setProjectData((prev) => (prev ? { ...prev, [field]: checked } : null))
  }

  const handlePhaseChange = (index: number, field: keyof ProjectPhase, value: string) => {
    setProjectData((prev) => {
      if (!prev || !prev.projectPhases) return prev
      const updatedPhases = [...prev.projectPhases]
      updatedPhases[index] = { ...updatedPhases[index], [field]: value }
      return { ...prev, projectPhases: updatedPhases }
    })
  }

  const addPhase = () => {
    setProjectData((prev) => {
      if (!prev) return prev
      const newPhase: ProjectPhase = { name: "", duration: "", description: "", deliverables: "" }
      return { ...prev, projectPhases: [...(prev.projectPhases || []), newPhase] }
    })
  }

  const removePhase = (index: number) => {
    setProjectData((prev) => {
      if (!prev || !prev.projectPhases) return prev
      const updatedPhases = prev.projectPhases.filter((_, i) => i !== index)
      return { ...prev, projectPhases: updatedPhases }
    })
  }

  const handleSave = () => {
    console.log("Saving timeline info:", projectData)
    router.push(`/projects/${projectId}`)
  }

  if (isLoading) return <div>Loading project timeline...</div>
  if (!projectData) return <div>Project not found.</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Project Timeline</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Project Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !projectData.startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {projectData.startDate ? format(parseISO(projectData.startDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={projectData.startDate ? parseISO(projectData.startDate) : undefined}
                    onSelect={(date) => handleDateChange("startDate", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Target End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !projectData.endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {projectData.endDate ? format(parseISO(projectData.endDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={projectData.endDate ? parseISO(projectData.endDate) : undefined}
                    onSelect={(date) => handleDateChange("endDate", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Working Hours Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={projectData.workingHours?.startTime || "08:00"}
                onChange={(e) => handleWorkingHoursChange("startTime", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime">Working Hours End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={projectData.workingHours?.endTime || "17:00"}
                onChange={(e) => handleWorkingHoursChange("endTime", e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="allowWeekendWork"
              checked={projectData.allowWeekendWork || false}
              onCheckedChange={(checked) => handleSwitchChange("allowWeekendWork", checked)}
            />
            <Label htmlFor="allowWeekendWork">Allow weekend work</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="allowNightWork"
              checked={projectData.allowNightWork || false}
              onCheckedChange={(checked) => handleSwitchChange("allowNightWork", checked)}
            />
            <Label htmlFor="allowNightWork">Allow night work (after hours)</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Project Phases</CardTitle>
          <Button variant="outline" size="sm" onClick={addPhase}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Phase
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(projectData.projectPhases || []).map((phase, index) => (
            <Card key={index} className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Phase {index + 1}</h3>
                <Button variant="ghost" size="icon" onClick={() => removePhase(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`phaseName-${index}`}>Phase Name</Label>
                <Input
                  id={`phaseName-${index}`}
                  value={phase.name}
                  onChange={(e) => handlePhaseChange(index, "name", e.target.value)}
                />
              </div>
              <div className="grid gap-2 mt-2">
                <Label htmlFor={`phaseDuration-${index}`}>Duration</Label>
                <Input
                  id={`phaseDuration-${index}`}
                  value={phase.duration}
                  onChange={(e) => handlePhaseChange(index, "duration", e.target.value)}
                />
              </div>
              <div className="grid gap-2 mt-2">
                <Label htmlFor={`phaseDescription-${index}`}>Description</Label>
                <Textarea
                  id={`phaseDescription-${index}`}
                  value={phase.description}
                  onChange={(e) => handlePhaseChange(index, "description", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid gap-2 mt-2">
                <Label htmlFor={`phaseDeliverables-${index}`}>Key Deliverables</Label>
                <Textarea
                  id={`phaseDeliverables-${index}`}
                  value={phase.deliverables}
                  onChange={(e) => handlePhaseChange(index, "deliverables", e.target.value)}
                  rows={2}
                />
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>

      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </CardFooter>
    </div>
  )
}
