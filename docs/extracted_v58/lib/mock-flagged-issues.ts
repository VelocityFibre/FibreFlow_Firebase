export interface FlaggedIssue {
  id: string
  title: string
  description: string
  severity: "High" | "Medium" | "Low"
  status: "Open" | "In Progress" | "Resolved"
  type: "Project Phase" | "Task" | "Material" | "Supplier" | "Client"
  projectId?: string
  projectName?: string
  phaseIndex?: number
  phaseName?: string
  taskId?: string
  taskName?: string
  flaggedBy: string
  flaggedDate: string
  dueDate?: string
  assignedTo?: string
  tags: string[]
}

export const mockFlaggedIssues: FlaggedIssue[] = [
  {
    id: "FLAG-001",
    title: "Permit Delays - Downtown Fiber Installation",
    description:
      "City permits are taking longer than expected. Initial approval was supposed to be 2 weeks, now it's been 4 weeks with no clear timeline.",
    severity: "High",
    status: "Open",
    type: "Project Phase",
    projectId: "1",
    projectName: "Downtown Fiber Installation",
    phaseIndex: 0,
    phaseName: "Planning & Permits",
    flaggedBy: "John Smith",
    flaggedDate: "2024-01-15",
    dueDate: "2024-01-20",
    assignedTo: "Sarah Johnson",
    tags: ["permits", "delays", "city-approval"],
  },
  {
    id: "FLAG-002",
    title: "Fiber Cable Stock Shortage",
    description:
      "Running low on single-mode fiber optic cable. Current stock will only last 3 more days at current usage rate.",
    severity: "High",
    status: "In Progress",
    type: "Material",
    projectId: "2",
    projectName: "Residential Complex Wiring",
    flaggedBy: "Mike Wilson",
    flaggedDate: "2024-01-14",
    dueDate: "2024-01-17",
    assignedTo: "David Chen",
    tags: ["inventory", "materials", "urgent"],
  },
  {
    id: "FLAG-003",
    title: "Trenching Equipment Breakdown",
    description:
      "Main trenching equipment has broken down during the excavation phase. Repair estimate is 5-7 days which will delay the project timeline.",
    severity: "Medium",
    status: "Open",
    type: "Task",
    projectId: "1",
    projectName: "Downtown Fiber Installation",
    taskId: "trenching",
    taskName: "Trenching and excavation",
    flaggedBy: "Robert Davis",
    flaggedDate: "2024-01-13",
    dueDate: "2024-01-18",
    assignedTo: "Mike Wilson",
    tags: ["equipment", "delays", "maintenance"],
  },
  {
    id: "FLAG-004",
    title: "Client Access Issues - Office Building",
    description:
      "Building management is restricting access hours to 6-8 AM only, significantly slowing down installation progress.",
    severity: "Medium",
    status: "In Progress",
    type: "Client",
    projectId: "3",
    projectName: "Corporate Office Network",
    flaggedBy: "Lisa Anderson",
    flaggedDate: "2024-01-12",
    assignedTo: "Sarah Johnson",
    tags: ["client-relations", "access", "scheduling"],
  },
  {
    id: "FLAG-005",
    title: "Supplier Quality Issues",
    description:
      "Recent batch of junction boxes from TechCorp Solutions has 15% defect rate. Need to address quality control with supplier.",
    severity: "Medium",
    status: "Open",
    type: "Supplier",
    projectId: "2",
    projectName: "Residential Complex Wiring",
    flaggedBy: "David Chen",
    flaggedDate: "2024-01-11",
    assignedTo: "John Smith",
    tags: ["quality", "supplier", "defects"],
  },
  {
    id: "FLAG-006",
    title: "Weather Delays - Outdoor Installation",
    description:
      "Continuous rain for the past week has halted all outdoor fiber installation work. Weather forecast shows more rain for next 3 days.",
    severity: "Low",
    status: "Open",
    type: "Project Phase",
    projectId: "4",
    projectName: "Rural Area Expansion",
    phaseIndex: 2,
    phaseName: "Cable Installation",
    flaggedBy: "Tom Brown",
    flaggedDate: "2024-01-10",
    tags: ["weather", "outdoor", "delays"],
  },
]
