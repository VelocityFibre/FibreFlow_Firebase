"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Dashboard } from "@/components/dashboard"
import { StockItems } from "@/components/stock-items"
import { StockMovements } from "@/components/stock-movements"
import { Suppliers } from "@/components/suppliers"
import { SupplierPortal } from "@/components/supplier-portal"
import { Clients } from "@/components/clients"
import { Staff } from "@/components/staff"
import { Projects } from "@/components/projects"
import { ThemeSettings } from "@/components/theme-settings"
import { AuditTrail } from "@/components/audit-trail"
import { FlaggedIssues } from "@/components/flagged-issues"
import { BOQManagement } from "@/components/boq-management"
import { RFQManagement } from "@/components/rfq-management"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import TasksPage from "@/app/tasks/page"

export default function Page() {
  const [activeModule, setActiveModule] = useState("dashboard")

  const handleModuleChange = (module: string) => {
    setActiveModule(module)
  }

  const renderActiveModule = () => {
    switch (activeModule) {
      case "dashboard":
        return <Dashboard setActiveModule={handleModuleChange} />
      case "stock":
        return <StockItems setActiveModule={handleModuleChange} />
      case "movements":
        return <StockMovements />
      case "analytics":
        return <AnalyticsDashboard />
      case "suppliers":
        return <Suppliers setActiveModule={handleModuleChange} />
      case "supplier-portal":
        return <SupplierPortal supplierId="SUP-001" />
      case "clients":
        return <Clients setActiveModule={handleModuleChange} />
      case "staff":
        return <Staff setActiveModule={handleModuleChange} />
      case "projects":
        return <Projects />
      case "tasks":
        return <TasksPage />
      case "flagged-issues":
        return <FlaggedIssues setActiveModule={handleModuleChange} />
      case "theme":
        return <ThemeSettings />
      case "audit-trail":
        return <AuditTrail />
      case "boq":
        return <BOQManagement />
      case "rfq":
        return <RFQManagement />
      default:
        return <Dashboard setActiveModule={handleModuleChange} />
    }
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar activeModule={activeModule} setActiveModule={handleModuleChange} />
        <SidebarInset className="flex-1 overflow-auto">
          <div className="p-6">{renderActiveModule()}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
