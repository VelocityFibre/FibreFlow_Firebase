export type StaffMember = {
  id: string
  name: string
  role: "Project Manager" | "Technician" | "Engineer" | "Administrator" | "Field Worker"
  email: string
  phone: string
  department: string
  location: string
  avatar?: string
  skills: string[]
  availability: "Available" | "Busy" | "On Leave"
  assignedTasks: string[] // IDs of assigned tasks
  completedTasks: number
  activeProjects: string[] // IDs of active projects
  startDate: string
  bio?: string
}

export type TaskAssignment = {
  taskId: string
  staffId: string
  projectId: string
  assignedDate: string
  dueDate: string
  status: "Assigned" | "In Progress" | "Completed" | "Delayed"
  notes?: string
  flagged?: boolean
  flagReason?: string
}

export const mockStaff: StaffMember[] = [
  {
    id: "STAFF-001",
    name: "James Wilson",
    role: "Project Manager",
    email: "james.wilson@velocityfibre.com",
    phone: "+44 7700 900123",
    department: "Project Management",
    location: "London, UK",
    skills: [
      "Project Planning",
      "Team Leadership",
      "Budget Management",
      "Risk Assessment",
      "Stakeholder Communication",
    ],
    availability: "Available",
    assignedTasks: ["TASK-001", "TASK-002", "TASK-003"],
    completedTasks: 24,
    activeProjects: ["PRJ-001", "PRJ-003"],
    startDate: "2019-03-15",
    bio: "James has over 10 years of experience in telecommunications project management, specializing in fiber optic network deployments. He has successfully led projects across the UK, delivering high-speed connectivity to urban and rural communities.",
  },
  {
    id: "STAFF-002",
    name: "Sarah Chen",
    role: "Engineer",
    email: "sarah.chen@velocityfibre.com",
    phone: "+44 7700 900456",
    department: "Engineering",
    location: "Manchester, UK",
    skills: ["Network Design", "Fiber Optics", "Signal Analysis", "Technical Documentation", "CAD Software"],
    availability: "Busy",
    assignedTasks: ["TASK-004", "TASK-005"],
    completedTasks: 18,
    activeProjects: ["PRJ-001", "PRJ-002"],
    startDate: "2020-06-22",
    bio: "Sarah is a certified network engineer with expertise in fiber optic technology. She specializes in designing efficient network architectures and optimizing signal performance across complex deployments.",
  },
  {
    id: "STAFF-003",
    name: "David Okonkwo",
    role: "Technician",
    email: "david.okonkwo@velocityfibre.com",
    phone: "+44 7700 900789",
    department: "Field Operations",
    location: "Birmingham, UK",
    skills: ["Fiber Splicing", "Cable Installation", "Testing Equipment", "Troubleshooting", "Safety Protocols"],
    availability: "Available",
    assignedTasks: ["TASK-006", "TASK-007", "TASK-008"],
    completedTasks: 32,
    activeProjects: ["PRJ-002"],
    startDate: "2021-02-10",
  },
  {
    id: "STAFF-004",
    name: "Emma Thompson",
    role: "Administrator",
    email: "emma.thompson@velocityfibre.com",
    phone: "+44 7700 901234",
    department: "Administration",
    location: "London, UK",
    skills: ["Document Management", "Scheduling", "Client Communication", "Procurement", "Compliance"],
    availability: "Available",
    assignedTasks: ["TASK-009"],
    completedTasks: 15,
    activeProjects: ["PRJ-001", "PRJ-002", "PRJ-003"],
    startDate: "2022-01-05",
  },
  {
    id: "STAFF-005",
    name: "Raj Patel",
    role: "Field Worker",
    email: "raj.patel@velocityfibre.com",
    phone: "+44 7700 905678",
    department: "Field Operations",
    location: "Leeds, UK",
    skills: ["Cable Laying", "Duct Installation", "Site Surveys", "Equipment Handling", "Ground Works"],
    availability: "On Leave",
    assignedTasks: [],
    completedTasks: 27,
    activeProjects: ["PRJ-003"],
    startDate: "2021-08-17",
  },
  {
    id: "STAFF-006",
    name: "Olivia Garcia",
    role: "Project Manager",
    email: "olivia.garcia@velocityfibre.com",
    phone: "+44 7700 909012",
    department: "Project Management",
    location: "Bristol, UK",
    skills: [
      "Agile Methodologies",
      "Resource Allocation",
      "Critical Path Analysis",
      "Contract Management",
      "Quality Assurance",
    ],
    availability: "Busy",
    assignedTasks: ["TASK-010", "TASK-011"],
    completedTasks: 19,
    activeProjects: ["PRJ-004", "PRJ-005"],
    startDate: "2020-11-30",
  },
  {
    id: "STAFF-007",
    name: "Michael Zhang",
    role: "Engineer",
    email: "michael.zhang@velocityfibre.com",
    phone: "+44 7700 903456",
    department: "Engineering",
    location: "Edinburgh, UK",
    skills: [
      "Network Architecture",
      "Bandwidth Optimization",
      "Latency Analysis",
      "Redundancy Planning",
      "Performance Testing",
    ],
    availability: "Available",
    assignedTasks: ["TASK-012"],
    completedTasks: 21,
    activeProjects: ["PRJ-004"],
    startDate: "2019-09-08",
  },
  {
    id: "STAFF-008",
    name: "Aisha Mahmood",
    role: "Technician",
    email: "aisha.mahmood@velocityfibre.com",
    phone: "+44 7700 907890",
    department: "Field Operations",
    location: "Glasgow, UK",
    skills: ["Optical Testing", "OTDR Analysis", "Fault Finding", "Fiber Termination", "Network Certification"],
    availability: "Available",
    assignedTasks: ["TASK-013"],
    completedTasks: 29,
    activeProjects: ["PRJ-005"],
    startDate: "2020-04-15",
  },
]

export const mockTaskAssignments: TaskAssignment[] = [
  {
    taskId: "TASK-001",
    staffId: "STAFF-001",
    projectId: "PRJ-001",
    assignedDate: "2023-05-10",
    dueDate: "2023-05-20",
    status: "In Progress",
    notes: "Prepare project kickoff documentation for Westside deployment",
  },
  {
    taskId: "TASK-002",
    staffId: "STAFF-001",
    projectId: "PRJ-001",
    assignedDate: "2023-05-12",
    dueDate: "2023-05-25",
    status: "Assigned",
    notes: "Coordinate with local authorities for permits",
  },
  {
    taskId: "TASK-003",
    staffId: "STAFF-001",
    projectId: "PRJ-003",
    assignedDate: "2023-05-08",
    dueDate: "2023-05-18",
    status: "Completed",
    notes: "Finalize budget allocation for Rural Connectivity Phase 2",
  },
  {
    taskId: "TASK-004",
    staffId: "STAFF-002",
    projectId: "PRJ-001",
    assignedDate: "2023-05-11",
    dueDate: "2023-05-21",
    status: "In Progress",
    notes: "Design network architecture for Westside residential area",
  },
  {
    taskId: "TASK-005",
    staffId: "STAFF-002",
    projectId: "PRJ-002",
    assignedDate: "2023-05-14",
    dueDate: "2023-05-28",
    status: "Assigned",
    notes: "Analyze signal strength requirements for downtown high-rises",
  },
  {
    taskId: "TASK-006",
    staffId: "STAFF-003",
    projectId: "PRJ-002",
    assignedDate: "2023-05-09",
    dueDate: "2023-05-19",
    status: "Delayed",
    notes: "Install fiber junction boxes on Main Street",
    flagged: true,
    flagReason: "Equipment delivery delayed by supplier",
  },
  {
    taskId: "TASK-007",
    staffId: "STAFF-003",
    projectId: "PRJ-002",
    assignedDate: "2023-05-13",
    dueDate: "2023-05-23",
    status: "Assigned",
    notes: "Test signal integrity in completed sections",
  },
  {
    taskId: "TASK-008",
    staffId: "STAFF-003",
    projectId: "PRJ-002",
    assignedDate: "2023-05-15",
    dueDate: "2023-05-22",
    status: "Assigned",
    notes: "Splice fiber connections at distribution points",
  },
  {
    taskId: "TASK-009",
    staffId: "STAFF-004",
    projectId: "PRJ-003",
    assignedDate: "2023-05-10",
    dueDate: "2023-05-17",
    status: "Completed",
    notes: "Process invoices for equipment purchases",
  },
  {
    taskId: "TASK-010",
    staffId: "STAFF-006",
    projectId: "PRJ-004",
    assignedDate: "2023-05-12",
    dueDate: "2023-05-26",
    status: "In Progress",
    notes: "Develop timeline for Industrial Park installation phases",
  },
  {
    taskId: "TASK-011",
    staffId: "STAFF-006",
    projectId: "PRJ-005",
    assignedDate: "2023-05-14",
    dueDate: "2023-05-28",
    status: "Assigned",
    notes: "Prepare presentation for Municipal Broadband stakeholders",
  },
  {
    taskId: "TASK-012",
    staffId: "STAFF-007",
    projectId: "PRJ-004",
    assignedDate: "2023-05-11",
    dueDate: "2023-05-25",
    status: "In Progress",
    notes: "Design redundancy paths for critical infrastructure",
  },
  {
    taskId: "TASK-013",
    staffId: "STAFF-008",
    projectId: "PRJ-005",
    assignedDate: "2023-05-13",
    dueDate: "2023-05-23",
    status: "Assigned",
    notes: "Conduct site survey for municipal buildings",
  },
]
