"use client"

import Image from "next/image"
import {
  BarChart3,
  Building2,
  Package,
  Users,
  Settings,
  Building,
  TrendingUp,
  ListTodo,
  Home,
  UserCheck,
  UserCog,
  FileText,
  ClipboardList,
  FileSpreadsheet,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Define menu items for the main dashboard
const dashboardItems = [
  {
    title: "Dashboard",
    icon: Home,
    id: "dashboard",
  },
]

// Define menu items for the Materials Management section
const materialsManagementItems = [
  {
    title: "Material",
    icon: Package,
    id: "stock",
  },
  {
    title: "Stock Movements",
    icon: TrendingUp,
    id: "movements",
  },
  {
    title: "BOQ Management",
    icon: ClipboardList,
    id: "boq",
  },
  {
    title: "RFQ Management",
    icon: FileSpreadsheet,
    id: "rfq",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    id: "analytics",
  },
]

// Define menu items for the Suppliers section
const suppliersItems = [
  {
    title: "Suppliers",
    icon: Users,
    id: "suppliers",
  },
  {
    title: "Supplier Portal",
    icon: Building,
    id: "supplier-portal",
  },
]

// Define menu items for the Clients section
const clientsItems = [
  {
    title: "Clients",
    icon: UserCheck,
    id: "clients",
  },
]

// Define menu items for the Staff section
const staffItems = [
  {
    title: "Staff",
    icon: UserCog,
    id: "staff",
  },
]

// Define menu items for the main navigation
const mainMenuItems = [
  {
    title: "Settings",
    icon: Settings,
    id: "theme",
  },
  {
    title: "Audit Trail",
    icon: FileText,
    id: "audit-trail",
  },
]

// Define menu items for the Project Management section
const projectManagementItems = [
  {
    title: "Projects",
    icon: Building2,
    id: "projects",
  },
  {
    title: "Tasks",
    icon: ListTodo,
    id: "tasks",
  },
]

interface AppSidebarProps {
  activeModule: string
  setActiveModule: (module: string) => void
}

export function AppSidebar({ activeModule, setActiveModule }: AppSidebarProps) {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="bg-[#0a0e1a] h-40 relative flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <Image
            src="/images/velocity-fibre-logo.png"
            alt="Velocity Fibre Logo"
            width={240}
            height={120}
            style={{ objectFit: "contain" }}
            priority
            className="max-w-full max-h-full"
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="overflow-y-auto">
        <div className="flex flex-col gap-2 p-2">
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dashboardItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        console.log("Dashboard clicked") // Debug log
                        setActiveModule(item.id)
                      }}
                      isActive={activeModule === item.id}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Staff</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {staffItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        console.log("Module clicked:", item.id) // Debug log
                        setActiveModule(item.id)
                      }}
                      isActive={activeModule === item.id}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Project Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectManagementItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        console.log("Module clicked:", item.id) // Debug log
                        setActiveModule(item.id)
                      }}
                      isActive={activeModule === item.id}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Materials Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {materialsManagementItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        console.log("Module clicked:", item.id) // Debug log
                        setActiveModule(item.id)
                      }}
                      isActive={activeModule === item.id}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Suppliers</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {suppliersItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        console.log("Module clicked:", item.id) // Debug log
                        setActiveModule(item.id)
                      }}
                      isActive={activeModule === item.id}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Clients</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {clientsItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        console.log("Module clicked:", item.id) // Debug log
                        setActiveModule(item.id)
                      }}
                      isActive={activeModule === item.id}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        console.log("Module clicked:", item.id) // Debug log
                        setActiveModule(item.id)
                      }}
                      isActive={activeModule === item.id}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
