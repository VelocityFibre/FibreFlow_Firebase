"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Search,
  Filter,
  Download,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  MapPin,
  Package,
} from "lucide-react"
import { mockStockMovements, mockStockItems, mockProjects } from "@/lib/mock-data"
import type { StockMovement } from "@/lib/types"

export function StockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>(mockStockMovements)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newMovement, setNewMovement] = useState<Partial<StockMovement>>({
    stockItemId: "",
    type: "Addition",
    quantity: 0,
    date: new Date().toISOString().split("T")[0],
    performedBy: "",
    notes: "",
    projectId: "",
  })

  const movementTypes = ["Addition", "Consumption", "Transfer", "Adjustment", "Site Allocation"]

  const filteredMovements = movements.filter((movement) => {
    const stockItem = mockStockItems.find((si) => si.id === movement.stockItemId)
    const matchesSearch =
      movement.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockItem?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || movement.type === typeFilter
    return matchesSearch && matchesType
  })

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "Addition":
        return <ArrowUp className="h-4 w-4 text-green-600" />
      case "Consumption":
      case "Site Allocation":
        return <ArrowDown className="h-4 w-4 text-red-600" />
      case "Transfer":
        return <MapPin className="h-4 w-4 text-blue-600" />
      case "Adjustment":
        return <RotateCcw className="h-4 w-4 text-orange-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "Addition":
        return <Badge className="bg-green-100 text-green-800">Addition</Badge>
      case "Consumption":
        return <Badge className="bg-red-100 text-red-800">Consumption</Badge>
      case "Transfer":
        return <Badge className="bg-blue-100 text-blue-800">Transfer</Badge>
      case "Adjustment":
        return <Badge className="bg-orange-100 text-orange-800">Adjustment</Badge>
      case "Site Allocation":
        return <Badge className="bg-purple-100 text-purple-800">Site Allocation</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getMovementSummary = () => {
    const summary = movementTypes.map((type) => ({
      type,
      count: movements.filter((m) => m.type === type).length,
      totalQuantity: movements.filter((m) => m.type === type).reduce((sum, m) => sum + Math.abs(m.quantity), 0),
    }))
    return summary
  }

  const handleAddMovement = () => {
    if (newMovement.stockItemId && newMovement.type && newMovement.quantity && newMovement.performedBy) {
      const movement: StockMovement = {
        id: Date.now().toString(),
        stockItemId: newMovement.stockItemId,
        type: newMovement.type as StockMovement["type"],
        quantity: newMovement.quantity,
        date: newMovement.date || new Date().toISOString().split("T")[0],
        performedBy: newMovement.performedBy,
        notes: newMovement.notes || "",
        projectId: newMovement.projectId,
      }
      setMovements([movement, ...movements])
      setNewMovement({
        stockItemId: "",
        type: "Addition",
        quantity: 0,
        date: new Date().toISOString().split("T")[0],
        performedBy: "",
        notes: "",
        projectId: "",
      })
      setIsAddDialogOpen(false)
    }
  }

  const exportToCSV = () => {
    const headers = ["Date", "Stock Item", "Type", "Quantity", "Performed By", "Project", "Notes"]
    const csvContent = [
      headers.join(","),
      ...filteredMovements.map((movement) => {
        const stockItem = mockStockItems.find((si) => si.id === movement.stockItemId)
        const project = movement.projectId ? mockProjects.find((p) => p.id === movement.projectId) : null
        return [
          movement.date,
          `"${stockItem?.name || ""}"`,
          movement.type,
          movement.quantity,
          `"${movement.performedBy}"`,
          `"${project?.name || ""}"`,
          `"${movement.notes}"`,
        ].join(",")
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "stock-movements.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-500">Stock Movements</h2>
          <p className="text-muted-foreground">Track all stock level changes and inventory activities</p>
        </div>
        <div className="flex gap-2">
          <Button className="text-slate-500" variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Movement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Stock Movement</DialogTitle>
                <DialogDescription>Record a new stock movement or adjustment.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="stockItem">Stock Item *</Label>
                  <Select
                    value={newMovement.stockItemId || "default"}
                    onValueChange={(value) => setNewMovement({ ...newMovement, stockItemId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stock item" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockStockItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.quantityInStock} {item.unitOfMeasure})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Movement Type *</Label>
                    <Select
                      value={newMovement.type || "default"}
                      onValueChange={(value) =>
                        setNewMovement({ ...newMovement, type: value as StockMovement["type"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {movementTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newMovement.quantity}
                      onChange={(e) =>
                        setNewMovement({ ...newMovement, quantity: Number.parseInt(e.target.value) || 0 })
                      }
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newMovement.date}
                      onChange={(e) => setNewMovement({ ...newMovement, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="performedBy">Performed By *</Label>
                    <Input
                      id="performedBy"
                      value={newMovement.performedBy}
                      onChange={(e) => setNewMovement({ ...newMovement, performedBy: e.target.value })}
                      placeholder="Enter person name"
                    />
                  </div>
                </div>
                {(newMovement.type === "Site Allocation" || newMovement.type === "Transfer") && (
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select
                      value={newMovement.projectId || "default"}
                      onValueChange={(value) => setNewMovement({ ...newMovement, projectId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Project</SelectItem>
                        {mockProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={newMovement.notes}
                    onChange={(e) => setNewMovement({ ...newMovement, notes: e.target.value })}
                    placeholder="Enter additional notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMovement}>Add Movement</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Movement Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        {getMovementSummary().map((summary) => (
          <Card key={summary.type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{summary.type}</CardTitle>
              {getMovementIcon(summary.type)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.count}</div>
              <p className="text-xs text-muted-foreground">{summary.totalQuantity.toLocaleString()} total units</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search movements by performer, notes, or item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter || "default"} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {movementTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stock Movements ({filteredMovements.length})
          </CardTitle>
          <CardDescription>Complete history of all stock level changes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Stock Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map((movement) => {
                const stockItem = mockStockItems.find((si) => si.id === movement.stockItemId)
                const project = movement.projectId ? mockProjects.find((p) => p.id === movement.projectId) : null
                return (
                  <TableRow key={movement.id}>
                    <TableCell>{new Date(movement.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{stockItem?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {stockItem?.category} • {stockItem?.warehouseLocation}
                      </div>
                    </TableCell>
                    <TableCell>{getMovementBadge(movement.type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.type)}
                        <span className={`font-mono ${movement.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">{stockItem?.unitOfMeasure}</span>
                      </div>
                    </TableCell>
                    <TableCell>{movement.performedBy}</TableCell>
                    <TableCell>
                      {project ? (
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground">{project.location}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={movement.notes}>
                        {movement.notes || "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
