"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, Package, UserCheck, AlertTriangle, BarChart3, Activity, CheckCircle } from "lucide-react"

interface DashboardProps {
  setActiveModule: (module: string) => void
}

export function Dashboard({ setActiveModule }: DashboardProps) {
  const shortcutCards = [
    {
      title: "Projects",
      description: "Manage and track all projects",
      icon: Building2,
      count: "12 Active",
      color: "bg-blue-500",
      module: "projects",
    },
    {
      title: "Suppliers",
      description: "Supplier management and contacts",
      icon: Users,
      count: "24 Active",
      color: "bg-green-500",
      module: "suppliers",
    },
    {
      title: "Materials",
      description: "Inventory and stock management",
      icon: Package,
      count: "156 Items",
      color: "bg-purple-500",
      module: "stock",
    },
    {
      title: "Clients",
      description: "Client information and projects",
      icon: UserCheck,
      count: "8 Active",
      color: "bg-orange-500",
      module: "clients", // Make sure this is "clients" not "clients-module" or anything else
    },
    {
      title: "Flagged Issues",
      description: "Issues requiring attention",
      icon: AlertTriangle,
      count: "3 Issues",
      color: "bg-red-500",
      module: "flagged-issues",
    },
    {
      title: "Analytics",
      description: "Detailed reports and analytics",
      icon: BarChart3,
      count: "View Reports",
      color: "bg-indigo-500",
      module: "analytics",
    },
  ]

  const summaryCards = [
    {
      title: "Poles Planted",
      value: "1,247",
      change: "+12% from last month",
      icon: Activity,
      color: "text-green-600",
    },
    {
      title: "Materials Needed",
      value: "23 Items",
      change: "Below minimum stock",
      icon: Package,
      color: "text-orange-600",
    },
    {
      title: "Active Projects",
      value: "12",
      change: "2 starting this week",
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "Completion Rate",
      value: "94%",
      change: "On-time delivery",
      icon: CheckCircle,
      color: "text-green-600",
    },
  ]

  const handleCardClick = (module: string) => {
    setActiveModule(module)
  }

  const handleSummaryCardClick = (cardTitle: string) => {
    // Navigate to relevant sections based on summary card
    switch (cardTitle) {
      case "Materials Needed":
        setActiveModule("stock")
        break
      case "Active Projects":
        setActiveModule("projects")
        break
      default:
        // For other summary cards, you can add specific navigation logic
        break
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to FibreFlow. Quick access to all your project management tools.
        </p>
      </div>

      {/* Shortcut Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shortcutCards.map((card) => (
          <Card
            key={card.module}
            className="cursor-pointer hover:shadow-md transition-shadow hover:scale-105 transform transition-transform"
            onClick={() => handleCardClick(card.module)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-md ${card.color}`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{card.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{card.count}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCardClick(card.module)
                    }}
                  >
                    Open →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Summary</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <Card
              key={card.title}
              className={`${card.title === "Materials Needed" || card.title === "Active Projects" ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
              onClick={() => handleSummaryCardClick(card.title)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm">Project "Fiber Installation - Downtown" completed Phase 2</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => setActiveModule("stock")}
            >
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm">Low stock alert: Fiber Optic Cable (Single Mode)</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            <div
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => setActiveModule("suppliers")}
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm">New supplier "TechCorp Solutions" added</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
