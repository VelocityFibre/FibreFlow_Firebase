"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Download, TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, Activity } from "lucide-react"
import {
  mockStockItems,
  mockProjects,
  mockBOQItems,
  mockStockMovements,
  mockSuppliers,
  mockRFQs,
} from "@/lib/mock-data"

export function Analytics() {
  // Calculate analytics data
  const totalStockValue = mockStockItems.reduce((sum, item) => sum + item.quantityInStock * item.lastPurchasePrice, 0)
  const totalBOQValue = mockBOQItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const allocatedBOQValue = mockBOQItems.reduce((sum, item) => sum + item.allocatedQuantity * item.unitPrice, 0)
  const lowStockItems = mockStockItems.filter((item) => item.status === "Low Stock" || item.status === "Out of Stock")

  // Stock allocation by site (projects)
  const siteAllocations = mockProjects.map((project) => {
    const projectBOQItems = mockBOQItems.filter((item) => item.projectId === project.id)
    const allocatedValue = projectBOQItems.reduce((sum, item) => sum + item.allocatedQuantity * item.unitPrice, 0)
    return {
      site: project.name,
      location: project.location,
      value: allocatedValue,
      percentage: totalBOQValue > 0 ? (allocatedValue / totalBOQValue) * 100 : 0,
    }
  })

  // BOQ completion progress by project
  const boqProgress = mockProjects.map((project) => {
    const projectBOQItems = mockBOQItems.filter((item) => item.projectId === project.id)
    const totalValue = projectBOQItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const allocatedValue = projectBOQItems.reduce((sum, item) => sum + item.allocatedQuantity * item.unitPrice, 0)
    const progress = totalValue > 0 ? (allocatedValue / totalValue) * 100 : 0
    return {
      project: project.name,
      totalValue,
      allocatedValue,
      progress,
      status: project.status,
    }
  })

  // Supplier requirements (stock shortfall)
  const supplierRequirements = mockSuppliers
    .map((supplier) => {
      const supplierItems = mockStockItems.filter((item) => item.supplierId === supplier.id)
      const shortfallItems = supplierItems.filter((item) => item.quantityInStock < item.minimumStock)
      const shortfallValue = shortfallItems.reduce(
        (sum, item) => sum + (item.minimumStock - item.quantityInStock) * item.lastPurchasePrice,
        0,
      )
      return {
        supplier: supplier.name,
        shortfallItems: shortfallItems.length,
        shortfallValue,
        rating: supplier.rating,
      }
    })
    .filter((req) => req.shortfallItems > 0)

  // Stock value by category
  const categoryValues = mockStockItems.reduce(
    (acc, item) => {
      const value = item.quantityInStock * item.lastPurchasePrice
      acc[item.category] = (acc[item.category] || 0) + value
      return acc
    },
    {} as Record<string, number>,
  )

  const categoryData = Object.entries(categoryValues).map(([category, value]) => ({
    category,
    value,
    percentage: (value / totalStockValue) * 100,
    items: mockStockItems.filter((item) => item.category === category).length,
  }))

  // Stock movement types analysis
  const movementTypes = mockStockMovements.reduce(
    (acc, movement) => {
      acc[movement.type] = (acc[movement.type] || 0) + Math.abs(movement.quantity)
      return acc
    },
    {} as Record<string, number>,
  )

  const movementData = Object.entries(movementTypes).map(([type, quantity]) => ({
    type,
    quantity,
    count: mockStockMovements.filter((m) => m.type === type).length,
  }))

  // Recent trends
  const recentAdditions = mockStockMovements
    .filter((m) => m.type === "Addition")
    .reduce((sum, m) => sum + m.quantity, 0)

  const recentConsumptions = mockStockMovements
    .filter((m) => m.type === "Consumption" || m.type === "Site Allocation")
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0)

  const exportReport = () => {
    const reportData = {
      summary: {
        totalStockValue,
        totalBOQValue,
        allocatedBOQValue,
        lowStockAlerts: lowStockItems.length,
      },
      siteAllocations,
      boqProgress,
      supplierRequirements,
      categoryValues: categoryData,
      movementAnalysis: movementData,
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "analytics-report.json"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-500">Analytics & Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your stock management and project progress
          </p>
        </div>
        <Button onClick={exportReport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{totalStockValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across {mockStockItems.length} items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BOQ Allocated Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{allocatedBOQValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalBOQValue > 0 ? Math.round((allocatedBOQValue / totalBOQValue) * 100) : 0}% of total BOQ value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Allocations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{siteAllocations.length}</div>
            <p className="text-xs text-muted-foreground">Active project sites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Items need attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stock Allocation by Site */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Allocation by Site</CardTitle>
            <CardDescription>Distribution of allocated stock across project sites</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {siteAllocations.map((allocation) => (
              <div key={allocation.site} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{allocation.site}</div>
                    <div className="text-sm text-muted-foreground">{allocation.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">R{allocation.value.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{allocation.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                <Progress value={allocation.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* BOQ Completion Progress */}
        <Card>
          <CardHeader>
            <CardTitle>BOQ Completion Progress</CardTitle>
            <CardDescription>Project progress based on BOQ allocation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {boqProgress.map((project) => (
              <div key={project.project} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{project.project}</div>
                    <Badge variant={project.status === "Active" ? "default" : "secondary"}>{project.status}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{project.progress.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">
                      R{project.allocatedValue.toLocaleString()} / R{project.totalValue.toLocaleString()}
                    </div>
                  </div>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Supplier Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Requirements (Stock Shortfall)</CardTitle>
            <CardDescription>Suppliers with items below minimum stock levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplierRequirements.length > 0 ? (
              supplierRequirements.map((req) => (
                <div key={req.supplier} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{req.supplier}</div>
                    <div className="text-sm text-muted-foreground">{req.shortfallItems} items below minimum</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-orange-600">R{req.shortfallValue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Rating: {req.rating}/5</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">No stock shortfalls detected</div>
            )}
          </CardContent>
        </Card>

        {/* Project Allocation Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Value by Category</CardTitle>
            <CardDescription>Distribution of stock value across categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryData.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{category.category}</span>
                    <Badge variant="secondary">{category.items} items</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">R{category.value.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{category.percentage.toFixed(1)}%</div>
                  </div>
                </div>
                <Progress value={category.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stock Movement Types */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Movement Analysis</CardTitle>
            <CardDescription>Breakdown of stock movements by type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {movementData.map((movement) => (
              <div key={movement.type} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{movement.type}</div>
                  <div className="text-sm text-muted-foreground">{movement.count} transactions</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{movement.quantity.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">total units</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity Trends</CardTitle>
            <CardDescription>Stock movement trends and key metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Additions</span>
                </div>
                <div className="text-2xl font-bold text-green-600">+{recentAdditions.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">units added</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="font-medium">Consumption</span>
                </div>
                <div className="text-2xl font-bold text-red-600">-{recentConsumptions.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">units consumed</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active Projects</span>
                <span className="text-sm">{mockProjects.filter((p) => p.status === "Active").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Open RFQs</span>
                <span className="text-sm">{mockRFQs.filter((r) => r.status === "Open").length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Suppliers</span>
                <span className="text-sm">{mockSuppliers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Stock Categories</span>
                <span className="text-sm">{categoryData.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
