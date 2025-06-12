"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react" // Import new icons
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

// Define the type for a Project Phase
type ProjectPhase = {
  id: number
  name: string
  duration: string
  description: string
  deliverables: string
}

export default function NewProjectPage() {
  const [projectName, setProjectName] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const [projectType, setProjectType] = useState("")
  const [priorityLevel, setPriorityLevel] = useState("Medium")
  const [projectCode, setProjectCode] = useState("")
  const [customer, setCustomer] = useState("")
  const [streetAddress, setStreetAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [gpsCoordinates, setGpsCoordinates] = useState("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("17:00")
  const [allowWeekendWork, setAllowWeekendWork] = useState(false)
  const [allowNightWork, setAllowNightWork] = useState(false)
  const [budget, setBudget] = useState<number | string>("")
  const [projectManager, setProjectManager] = useState("")
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [technicalRequirements, setTechnicalRequirements] = useState("")
  const [materialList, setMaterialList] = useState("")
  const [complianceNotes, setComplianceNotes] = useState("")

  // State for project phases, initialized with your provided data
  const [projectPhases, setProjectPhases] = useState<ProjectPhase[]>([
    {
      id: 1,
      name: "Project Initiation",
      duration: "1 week",
      description: "Project kickoff, stakeholder alignment, and initial planning",
      deliverables: "Project Charter, Stakeholder Register, Initial Risk Assessment",
    },
    {
      id: 2,
      name: "Site Survey & Design",
      duration: "2-3 weeks",
      description: "Detailed site survey, network design, and engineering documentation",
      deliverables: "Site Survey Report, Network Design, Engineering Drawings, Permit Applications",
    },
    {
      id: 3,
      name: "Procurement & Permits",
      duration: "3-4 weeks",
      description: "Material procurement, permit acquisition, and resource preparation",
      deliverables: "Materials Delivered, Permits Approved, Contractor Agreements",
    },
    {
      id: 4,
      name: "Installation",
      duration: "6-8 weeks",
      description: "Physical installation of fiber infrastructure and equipment",
      deliverables: "Fiber Cables Installed, Equipment Mounted, Connections Made",
    },
    {
      id: 5,
      name: "Testing & Commissioning",
      duration: "1-2 weeks",
      description: "System testing, performance validation, and commissioning",
      deliverables: "Test Results, Performance Reports, System Documentation",
    },
    {
      id: 6,
      name: "Deployment & Handover",
      duration: "1 week",
      description: "Go-live activities, training, and project handover",
      deliverables: "Training Materials, Operation Manuals, Handover Documentation",
    },
  ])

  const projectTypes = ["FTTH", "FTTB", "FTTC", "FTTA", "Other"]
  const priorityLevels = ["High", "Medium", "Low"]
  const customers = ["City of Westside", "Metro Communications", "Rural Connect Inc", "Industrial Solutions"]
  const managers = ["John Doe", "Sarah Johnson", "Mike Wilson", "Emily Chen"] // Example managers

  const handleGenerateProjectCode = () => {
    const code = `PROJ-${Date.now().toString().slice(-6)}`
    setProjectCode(code)
  }

  const handleAddPhase = () => {
    const newId = projectPhases.length > 0 ? Math.max(...projectPhases.map((p) => p.id)) + 1 : 1
    setProjectPhases([
      ...projectPhases,
      {
        id: newId,
        name: "",
        duration: "",
        description: "",
        deliverables: "",
      },
    ])
  }

  const handleUpdatePhase = (id: number, field: keyof ProjectPhase, value: string) => {
    setProjectPhases((prevPhases) =>
      prevPhases.map((phase) => (phase.id === id ? { ...phase, [field]: value } : phase)),
    )
  }

  const handleDeletePhase = (id: number) => {
    setProjectPhases((prevPhases) => prevPhases.filter((phase) => phase.id !== id))
  }

  const handleCreateProject = () => {
    if (!projectName || !customer || !startDate || !endDate || !projectManager) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all fields marked with *.",
        variant: "destructive",
      })
      return
    }

    const newProjectData = {
      projectName,
      projectDescription,
      projectType,
      priorityLevel,
      projectCode,
      customer,
      streetAddress,
      city,
      state,
      gpsCoordinates,
      startDate: startDate ? format(startDate, "yyyy-MM-dd") : "",
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : "",
      estimatedDuration,
      startTime,
      endTime,
      allowWeekendWork,
      allowNightWork,
      budget: Number(budget),
      projectManager,
      teamMembers,
      technicalRequirements,
      materialList,
      complianceNotes,
      projectPhases, // Include phases data
    }

    console.log("New Project Data:", newProjectData)
    toast({
      title: "Project Created",
      description: `Project "${projectName}" has been created successfully! (Data logged to console)`,
    })

    // Reset form (optional)
    setProjectName("")
    setProjectDescription("")
    setProjectType("")
    setPriorityLevel("Medium")
    setProjectCode("")
    setCustomer("")
    setStreetAddress("")
    setCity("")
    setState("")
    setGpsCoordinates("")
    setStartDate(undefined)
    setEndDate(undefined)
    setEstimatedDuration("")
    setStartTime("08:00")
    setEndTime("17:00")
    setAllowWeekendWork(false)
    setAllowNightWork(false)
    setBudget("")
    setProjectManager("")
    setTeamMembers([])
    setTechnicalRequirements("")
    setMaterialList("")
    setComplianceNotes("")
    setProjectPhases([
      // Reset phases to initial state or empty
      {
        id: 1,
        name: "Project Initiation",
        duration: "1 week",
        description: "Project kickoff, stakeholder alignment, and initial planning",
        deliverables: "Project Charter, Stakeholder Register, Initial Risk Assessment",
      },
      {
        id: 2,
        name: "Site Survey & Design",
        duration: "2-3 weeks",
        description: "Detailed site survey, network design, and engineering documentation",
        deliverables: "Site Survey Report, Network Design, Engineering Drawings, Permit Applications",
      },
      {
        id: 3,
        name: "Procurement & Permits",
        duration: "3-4 weeks",
        description: "Material procurement, permit acquisition, and resource preparation",
        deliverables: "Materials Delivered, Permits Approved, Contractor Agreements",
      },
      {
        id: 4,
        name: "Installation",
        duration: "6-8 weeks",
        description: "Physical installation of fiber infrastructure and equipment",
        deliverables: "Fiber Cables Installed, Equipment Mounted, Connections Made",
      },
      {
        id: 5,
        name: "Testing & Commissioning",
        duration: "1-2 weeks",
        description: "System testing, performance validation, and commissioning",
        deliverables: "Test Results, Performance Reports, System Documentation",
      },
      {
        id: 6,
        name: "Deployment & Handover",
        duration: "1 week",
        description: "Go-live activities, training, and project handover",
        deliverables: "Training Materials, Operation Manuals, Handover Documentation",
      },
    ])
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
          <p className="text-muted-foreground">
            Set up a comprehensive fiber deployment project with all necessary details
          </p>
        </div>
      </div>

      <Tabs defaultValue="basic-info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7">
          <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic-info">
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
              <CardDescription>Basic details about the project</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="Enter descriptive project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="projectDescription">Project Description</Label>
                <Textarea
                  id="projectDescription"
                  placeholder="Detailed description of project scope, objectives, and expected outcomes"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger id="projectType">
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priorityLevel">Priority Level</Label>
                  <Select value={priorityLevel} onValueChange={setPriorityLevel}>
                    <SelectTrigger id="priorityLevel">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityLevels.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority} Priority
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="projectCode">Project Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="projectCode"
                    placeholder="Auto-generated or custom code"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleGenerateProjectCode}>
                    Generate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Location - Moved here as part of Basic Info for now, can be its own tab if preferred */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Customer & Location</CardTitle>
              <CardDescription>Customer information and project location</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="customer">Customer *</Label>
                <Select value={customer} onValueChange={setCustomer}>
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select customer organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((cust) => (
                      <SelectItem key={cust} value={cust}>
                        {cust}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="streetAddress">Project Location</Label>
                <Input
                  id="streetAddress"
                  placeholder="Street Address or area description"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gpsCoordinates">GPS Coordinates (Optional)</Label>
                <Input
                  id="gpsCoordinates"
                  placeholder="Latitude, Longitude"
                  value={gpsCoordinates}
                  onChange={(e) => setGpsCoordinates(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Project Schedule</CardTitle>
              <CardDescription>Set project dates and working hours</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Project Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Target End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedDuration">Estimated Duration</Label>
                <Input
                  id="estimatedDuration"
                  placeholder="e.g., 16 weeks, 4 months"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allowWeekendWork">Allow weekend work</Label>
                <Switch id="allowWeekendWork" checked={allowWeekendWork} onCheckedChange={setAllowWeekendWork} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allowNightWork">Allow night work (after hours)</Label>
                <Switch id="allowNightWork" checked={allowNightWork} onCheckedChange={setAllowNightWork} />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Project Phases</CardTitle>
              <CardDescription>Planned project phases and milestones</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              {projectPhases.map((phase) => (
                <div key={phase.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Phase {phase.id}</h3>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePhase(phase.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span className="sr-only">Delete phase</span>
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`phase-name-${phase.id}`}>Phase Name</Label>
                    <Input
                      id={`phase-name-${phase.id}`}
                      value={phase.name}
                      onChange={(e) => handleUpdatePhase(phase.id, "name", e.target.value)}
                      placeholder="e.g., Project Initiation"
                    />
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor={`phase-duration-${phase.id}`}>Duration</Label>
                    <Input
                      id={`phase-duration-${phase.id}`}
                      value={phase.duration}
                      onChange={(e) => handleUpdatePhase(phase.id, "duration", e.target.value)}
                      placeholder="e.g., 1 week"
                    />
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor={`phase-description-${phase.id}`}>Description</Label>
                    <Textarea
                      id={`phase-description-${phase.id}`}
                      value={phase.description}
                      onChange={(e) => handleUpdatePhase(phase.id, "description", e.target.value)}
                      placeholder="Detailed description of phase scope"
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor={`phase-deliverables-${phase.id}`}>Key Deliverables</Label>
                    <Textarea
                      id={`phase-deliverables-${phase.id}`}
                      value={phase.deliverables}
                      onChange={(e) => handleUpdatePhase(phase.id, "deliverables", e.target.value)}
                      placeholder="List key deliverables, separated by commas"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddPhase} className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add New Phase
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle>Budget</CardTitle>
              <CardDescription>Allocate budget for the project</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="budget">Project Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="Enter budget amount (e.g., 1500000)"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
              <CardDescription>Assign project manager and team members</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="projectManager">Project Manager *</Label>
                <Select value={projectManager} onValueChange={setProjectManager}>
                  <SelectTrigger id="projectManager">
                    <SelectValue placeholder="Select project manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager} value={manager}>
                        {manager}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teamMembers">Team Members (Optional)</Label>
                <Textarea
                  id="teamMembers"
                  placeholder="List team members, separated by commas"
                  value={teamMembers.join(", ")}
                  onChange={(e) => setTeamMembers(e.target.value.split(",").map((s) => s.trim()))}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technical Tab */}
        <TabsContent value="technical">
          <Card>
            <CardHeader>
              <CardTitle>Technical</CardTitle>
              <CardDescription>Specify technical requirements and specifications</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="technicalRequirements">Technical Requirements</Label>
                <Textarea
                  id="technicalRequirements"
                  placeholder="Detailed technical specifications, network diagrams, etc."
                  value={technicalRequirements}
                  onChange={(e) => setTechnicalRequirements(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Materials</CardTitle>
              <CardDescription>List required materials and equipment</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="materialList">Material List</Label>
                <Textarea
                  id="materialList"
                  placeholder="List all required fiber, cables, connectors, etc."
                  value={materialList}
                  onChange={(e) => setMaterialList(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance</CardTitle>
              <CardDescription>Notes on regulatory and safety compliance</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="complianceNotes">Compliance Notes</Label>
                <Textarea
                  id="complianceNotes"
                  placeholder="Any specific regulations, safety standards, or permits required"
                  value={complianceNotes}
                  onChange={(e) => setComplianceNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons - outside of tabs so they are always visible */}
      <div className="flex justify-end gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => {
            // Implement cancel logic, e.g., navigate back
            toast({ title: "Action Cancelled", description: "Project creation cancelled." })
          }}
        >
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            // Implement save as draft logic
            toast({ title: "Saved as Draft", description: "Project data saved as draft." })
          }}
        >
          Save as Draft
        </Button>
        <Button onClick={handleCreateProject}>Create Project</Button>
      </div>
    </div>
  )
}
