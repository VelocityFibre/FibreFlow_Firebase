import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Package, AlertTriangle, Building2, TrendingUp, DollarSign, Users, Calendar, Activity } from "lucide-react"
import { mockStockItems, mockProjects, mockBOQItems, mockStockMovements, mockSuppliers } from "@/lib/mock-data"

export function AnalyticsDashboard() {
  // Calculate dashboard metrics
  const totalStockValue = mockStockItems.reduce((sum, item) => sum + item.quantityInStock * item.lastPurchasePrice, 0)
  const lowStockItems = mockStockItems.filter((item) => item.status === "Low Stock" || item.status === "Out of Stock")
  const activeProjects = mockProjects.filter((project) => project.status === "Active")
  const recentMovements = mockStockMovements.slice(0, 5)
  const totalBOQValue = mockBOQItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const allocatedValue = mockBOQItems.reduce((sum, item) => sum + item.allocatedQuantity * item.unitPrice, 0)

  const categories = [...new Set(mockStockItems.map((item) => item.category))]
  const stockByCategory = categories.map((category) => ({
    category,
    count: mockStockItems.filter((item) => item.category === category).length,
    value: mockStockItems
      .filter((item) => item.category === category)
      .reduce((sum, item) => sum + item.quantityInStock * item.lastPurchasePrice, 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-500">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Detailed analytics and reporting for your operations</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="velocity-gradient text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">R{totalStockValue.toLocaleString()}</div>
            <p className="text-xs text-white/80">Across {mockStockItems.length} items</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-500 to-red-500 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{lowStockItems.length}</div>
            <p className="text-xs text-white/80">Items need attention</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Active Projects</CardTitle>
            <Building2 className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeProjects.length}</div>
            <p className="text-xs text-white/80">Out of {mockProjects.length} total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">BOQ Allocation</CardTitle>
            <TrendingUp className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {totalBOQValue > 0 ? Math.round((allocatedValue / totalBOQValue) * 100) : 0}%
            </div>
            <p className="text-xs text-white/80">R{allocatedValue.toLocaleString()} allocated</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Stock by Category */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Stock by Category</CardTitle>
            <CardDescription>Distribution of inventory across categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stockByCategory.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{category.category}</span>
                    <Badge variant="secondary">{category.count} items</Badge>
                  </div>
                  <span className="text-sm font-medium">R{category.value.toLocaleString()}</span>
                </div>
                <Progress value={(category.value / totalStockValue) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
            <CardDescription>Latest inventory activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMovements.map((movement) => {
                const stockItem = mockStockItems.find((item) => item.id === movement.stockItemId)
                return (
                  <div key={movement.id} className="flex items-center space-x-4">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{stockItem?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {movement.type}: {Math.abs(movement.quantity)} {stockItem?.unitOfMeasure}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">{new Date(movement.date).toLocaleDateString()}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Suppliers</CardTitle>
            <Users className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{mockSuppliers.length}</div>
            <p className="text-xs text-white/80">Active supplier relationships</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-600 to-red-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{mockStockMovements.length}</div>
            <p className="text-xs text-white/80">Stock movements recorded</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Categories</CardTitle>
            <Package className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{categories.length}</div>
            <p className="text-xs text-white/80">Different item categories</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
