import type { LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  href?: string
  disabled?: boolean
  external?: boolean
  icon?: LucideIcon
  label?: string
  description?: string
}

export type SidebarNavItem = NavItem & {
  items: SidebarNavItem[]
}

export type ProjectPhaseStatus = "Pending" | "Started" | "Flagged" | "Completed"

export type ProjectPhase = {
  name: string
  duration: string
  description: string
  deliverables: string
  status: ProjectPhaseStatus
  isFlagged: boolean
  flagReason?: string
  progress?: number // Optional progress for individual phases
}

export type Project = {
  id: string
  name: string
  projectManager: string
  startDate: string
  endDate: string
  status: "Active" | "Planned" | "Completed" | "In Progress"
  location: string // Used in Project Details card
  budget: number // Total budget, used in Project Details and Budget Used card
  customer?: string // Customer Name, used in Customer Information
  customerContact?: string // New: For Customer Information card
  customerEmail?: string // New: For Customer Information card
  customerPhone?: string // New: For Customer Information card
  phase?: string // Main current phase name, might be derived or set
  progress?: number // Overall project progress, used in Overall Progress card
  description?: string // Main project description, shown under title
  projectType?: string
  priorityLevel?: "High" | "Medium" | "Low"
  projectCode?: string
  workingHours?: { startTime: string; endTime: string }
  allowWeekendWork?: boolean
  allowNightWork?: boolean
  projectPhases?: ProjectPhase[]

  // New fields for stats cards
  overallProgress?: number // Percentage for Overall Progress card
  budgetUsed?: number // Amount for Budget Used card
  activeTasksCount?: number // Count for Active Tasks card
  completedTasksCount?: number // Sub-info for Active Tasks card
  currentPhaseName?: string // Name for Current Phase card
  currentPhaseProgress?: number // Percentage for Current Phase card
}

export type StockItem = {
  id: string
  name: string
  category: string
  sku: string
  unit: string
  currentStock: number
  minStockLevel: number
  lastUpdated: string
  status: "In Stock" | "Low Stock" | "Out of Stock"
  supplierId: string
}

export type Supplier = {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  status: "Active" | "Inactive"
  lastOrderDate: string
}

export type BOQItem = {
  id: string
  projectId: string
  description: string
  unit: string
  unitPrice: number
  quantity: number
  totalPrice: number
  allocatedQuantity: number
  status: "Pending" | "Allocated" | "Completed"
}

export type RFQ = {
  id: string
  projectId: string
  title: string
  status: "Open" | "Closed" | "Awarded"
  dueDate: string
  items: {
    id: string
    description: string
    quantity: number
    unit: string
  }[]
  quotes: {
    supplierId: string
    quoteAmount: number
    quoteDate: string
    status: "Submitted" | "Rejected" | "Accepted"
  }[]
}

export type StockMovement = {
  id: string
  itemId: string
  itemName: string
  type: "In" | "Out" | "Adjustment"
  quantity: number
  date: string
  projectId?: string
  notes?: string
}

export type Quote = {
  id: string
  rfqId: string
  supplierId: string
  supplierName: string
  quoteDate: string
  totalAmount: number
  status: "Submitted" | "Accepted" | "Rejected"
  items: {
    boqItemId: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
}

export type User = {
  id: string
  name: string
  email: string
  role: "Admin" | "Project Manager" | "Stock Manager" | "Supplier"
}
