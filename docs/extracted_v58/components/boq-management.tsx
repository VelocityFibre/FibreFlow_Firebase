"use client"

import type React from "react"

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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  ClipboardList,
  ArrowRight,
  FileSpreadsheet,
  Send,
} from "lucide-react"
import { mockBOQItems, mockProjects, mockStockItems, mockStockMovements } from "@/lib/mock-data"
import type { BOQItem, StockMovement } from "@/lib/types"

export function BOQManagement() {
  const [boqItems, setBOQItems] = useState<BOQItem[]>(mockBOQItems)
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(mockStockMovements)
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isAllocateDialogOpen, setIsAllocateDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null)
  const [allocatingItem, setAllocatingItem] = useState<BOQItem | null>(null)
  const [allocationQuantity, setAllocationQuantity] = useState<number>(0)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProject, setImportProject] = useState<string>("default") // Updated default value
  const [previewData, setPreviewData] = useState<any[]>([])
  const [newItem, setNewItem] = useState<Partial<BOQItem>>({
    projectId: "default", // Updated default value
    stockItemId: "",
    requiredQuantity: 0,
    allocatedQuantity: 0,
    remainingQuantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    status: "Planned",
    needsQuote: false,
  })

  const statuses = ["Planned", "Partially Allocated", "Fully Allocated", "Ordered", "Delivered"]

  const filteredItems = boqItems.filter((item) => {
    const stockItem = mockStockItems.find((si) => si.id === item.stockItemId)
    const project = mockProjects.find((p) => p.id === item.projectId)

    const matchesProject = selectedProject === "all" || item.projectId === selectedProject
    const matchesSearch =
      stockItem?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || item.status === statusFilter

    return matchesProject && matchesSearch && matchesStatus
  })

  const getProjectSummary = (projectId: string) => {
    const projectItems = boqItems.filter((item) => item.projectId === projectId)
    const totalItems = projectItems.length
    const totalValue = projectItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const allocatedValue = projectItems.reduce((sum, item) => sum + item.allocatedQuantity * item.unitPrice, 0)
    const remainingValue = totalValue - allocatedValue
    const itemsNeedingQuotes = projectItems.filter((item) => item.needsQuote).length
    return { totalItems, totalValue, allocatedValue, remainingValue, itemsNeedingQuotes }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Planned":
        return <Badge variant="secondary">Planned</Badge>
      case "Partially Allocated":
        return <Badge className="bg-yellow-100 text-yellow-800">Partially Allocated</Badge>
      case "Fully Allocated":
        return <Badge className="bg-green-100 text-green-800">Fully Allocated</Badge>
      case "Ordered":
        return <Badge className="bg-blue-100 text-blue-800">Ordered</Badge>
      case "Delivered":
        return <Badge className="bg-purple-100 text-purple-800">Delivered</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
      // Parse CSV file for preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const lines = text.split("\n")
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
        const data = lines
          .slice(1, 6)
          .map((line) => {
            const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
            const row: any = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ""
            })
            return row
          })
          .filter((row) => Object.values(row).some((val) => val))

        setPreviewData(data)
      }
      reader.readAsText(file)
    }
  }

  const handleImportBOQ = () => {
    if (!importFile || !importProject) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n")
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

      const newBOQItems: BOQItem[] = lines
        .slice(1)
        .map((line, index) => {
          const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
          const row: any = {}
          headers.forEach((header, headerIndex) => {
            row[header] = values[headerIndex] || ""
          })

          if (!row["Item Description"] && !row["Description"]) return null

          const quantity = Number.parseInt(row["Quantity"] || row["Required Quantity"] || "0") || 0
          const unitPrice = Number.parseFloat(row["Unit Price"] || row["Price"] || "0") || 0
          const needsQuote =
            row["Needs Quote"]?.toLowerCase() === "true" ||
            row["Quote Required"]?.toLowerCase() === "true" ||
            row["RFQ"]?.toLowerCase() === "true"

          return {
            id: `imported-${Date.now()}-${index}`,
            projectId: importProject,
            stockItemId: "", // Will need to be mapped
            requiredQuantity: quantity,
            allocatedQuantity: 0,
            remainingQuantity: quantity,
            unitPrice: unitPrice,
            totalPrice: quantity * unitPrice,
            status: "Planned" as const,
            itemCode: row["Item Code"] || row["Code"] || "",
            description: row["Item Description"] || row["Description"] || "",
            specification: row["Specification"] || row["Spec"] || "",
            needsQuote: needsQuote,
          }
        })
        .filter(Boolean) as BOQItem[]

      setBOQItems([...boqItems, ...newBOQItems])
      setIsImportDialogOpen(false)
      setImportFile(null)
      setImportProject("default") // Updated default value
      setPreviewData([])
    }
    reader.readAsText(importFile)
  }

  const generateRFQForProject = (projectId: string) => {
    const projectItems = boqItems.filter(
      (item) => item.projectId === projectId && item.needsQuote && item.remainingQuantity > 0,
    )

    if (projectItems.length === 0) {
      alert("No items requiring quotes found for this project.")
      return
    }

    // This would typically navigate to RFQ creation with pre-filled data
    console.log("Generating RFQ for items:", projectItems)
    alert(`Generated RFQ for ${projectItems.length} items requiring quotes.`)
  }

  const handleAddItem = () => {
    if (newItem.projectId && newItem.description && newItem.requiredQuantity) {
      const item: BOQItem = {
        id: Date.now().toString(),
        projectId: newItem.projectId,
        stockItemId: newItem.stockItemId || "",
        requiredQuantity: newItem.requiredQuantity,
        allocatedQuantity: 0,
        remainingQuantity: newItem.requiredQuantity,
        unitPrice: newItem.unitPrice || 0,
        totalPrice: (newItem.requiredQuantity || 0) * (newItem.unitPrice || 0),
        status: "Planned",
        itemCode: newItem.itemCode || "",
        description: newItem.description || "",
        specification: newItem.specification || "",
        needsQuote: newItem.needsQuote || false,
      }
      setBOQItems([...boqItems, item])
      setNewItem({
        projectId: "default", // Updated default value
        stockItemId: "",
        requiredQuantity: 0,
        allocatedQuantity: 0,
        remainingQuantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        status: "Planned",
        needsQuote: false,
      })
      setIsAddDialogOpen(false)
    }
  }

  const handleAllocateStock = () => {
    if (allocatingItem && allocationQuantity > 0) {
      const stockItem = mockStockItems.find((si) => si.id === allocatingItem.stockItemId)
      const project = mockProjects.find((p) => p.id === allocatingItem.projectId)

      if (
        stockItem &&
        allocationQuantity <= stockItem.quantityInStock &&
        allocationQuantity <= allocatingItem.remainingQuantity
      ) {
        // Update BOQ item
        const updatedBOQItem: BOQItem = {
          ...allocatingItem,
          allocatedQuantity: allocatingItem.allocatedQuantity + allocationQuantity,
          remainingQuantity: allocatingItem.remainingQuantity - allocationQuantity,
          status:
            allocatingItem.remainingQuantity - allocationQuantity === 0 ? "Fully Allocated" : "Partially Allocated",
        }

        setBOQItems(boqItems.map((item) => (item.id === allocatingItem.id ? updatedBOQItem : item)))

        // Create stock movement record
        const movement: StockMovement = {
          id: Date.now().toString(),
          stockItemId: allocatingItem.stockItemId,
          type: "Site Allocation",
          quantity: -allocationQuantity,
          date: new Date().toISOString().split("T")[0],
          performedBy: "System User",
          notes: `Allocated to ${project?.name} project`,
          projectId: allocatingItem.projectId,
        }

        setStockMovements([...stockMovements, movement])

        setAllocatingItem(null)
        setAllocationQuantity(0)
        setIsAllocateDialogOpen(false)
      }
    }
  }

  const handleEditItem = (item: BOQItem) => {
    setEditingItem(item)
    setNewItem(item)
  }

  const handleUpdateItem = () => {
    if (editingItem && newItem.requiredQuantity) {
      const unitPrice = newItem.unitPrice || editingItem.unitPrice
      const totalPrice = (newItem.requiredQuantity || 0) * unitPrice

      const updatedItem: BOQItem = {
        ...editingItem,
        ...newItem,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        remainingQuantity: (newItem.requiredQuantity || 0) - (newItem.allocatedQuantity || 0),
      } as BOQItem

      setBOQItems(boqItems.map((item) => (item.id === editingItem.id ? updatedItem : item)))
      setEditingItem(null)
      setNewItem({
        projectId: "default", // Updated default value
        stockItemId: "",
        requiredQuantity: 0,
        allocatedQuantity: 0,
        remainingQuantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        status: "Planned",
        needsQuote: false,
      })
    }
  }

  const handleDeleteItem = (id: string) => {
    setBOQItems(boqItems.filter((item) => item.id !== id))
  }

  const exportToCSV = () => {
    const headers = [
      "Project",
      "Item Code",
      "Description",
      "Specification",
      "Required Qty",
      "Allocated Qty",
      "Remaining Qty",
      "Unit Price",
      "Total Price",
      "Status",
      "Needs Quote",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredItems.map((item) => {
        const project = mockProjects.find((p) => p.id === item.projectId)
        return [
          `"${project?.name || ""}"`,
          `"${item.itemCode || ""}"`,
          `"${item.description || ""}"`,
          `"${item.specification || ""}"`,
          item.requiredQuantity,
          item.allocatedQuantity,
          item.remainingQuantity,
          item.unitPrice,
          item.totalPrice,
          item.status,
          item.needsQuote ? "Yes" : "No",
        ].join(",")
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "boq-items.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-500">BOQ Management</h2>
          <p className="text-muted-foreground">Manage Bill of Quantities and stock allocations for projects</p>
        </div>
        <div className="flex gap-2">
          <Button className="text-slate-500" variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="text-slate-500" variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import BOQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[70vh] overflow-y-auto sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Import BOQ from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file containing BOQ items. The file should include columns for Item Code, Description,
                  Quantity, Unit Price, and optionally Specification and Needs Quote.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="project">Project *</Label>
                  <Select value={importProject} onValueChange={setImportProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project for BOQ import" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">CSV File *</Label>
                  <Input id="file" type="file" accept=".csv" onChange={handleFileUpload} />
                </div>
                {previewData.length > 0 && (
                  <div className="space-y-2">
                    <Label>Preview (First 5 rows)</Label>
                    <div className="border rounded-lg max-h-64 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(previewData[0] || {})
                              .slice(0, 6)
                              .map((header) => (
                                <TableHead key={header} className="text-xs font-medium min-w-[100px]">
                                  {header}
                                </TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, index) => (
                            <TableRow key={index}>
                              {Object.values(row)
                                .slice(0, 6)
                                .map((value: any, cellIndex) => (
                                  <TableCell
                                    key={cellIndex}
                                    className="text-xs p-2 max-w-[150px] truncate"
                                    title={value}
                                  >
                                    {value}
                                  </TableCell>
                                ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {Object.keys(previewData[0] || {}).length > 6 && (
                      <p className="text-xs text-muted-foreground">
                        Showing first 6 columns. Total columns: {Object.keys(previewData[0] || {}).length}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportBOQ} disabled={!importFile || !importProject}>
                  Import BOQ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add BOQ Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New BOQ Item</DialogTitle>
                <DialogDescription>Add a new item to the Bill of Quantities.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project *</Label>
                  <Select
                    value={newItem.projectId}
                    onValueChange={(value) => setNewItem({ ...newItem, projectId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemCode">Item Code</Label>
                    <Input
                      id="itemCode"
                      value={newItem.itemCode}
                      onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                      placeholder="Enter item code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stockItem">Stock Item (Optional)</Label>
                    <Select
                      value={newItem.stockItemId}
                      onValueChange={(value) => setNewItem({ ...newItem, stockItemId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Link to stock item" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No stock item</SelectItem>
                        {mockStockItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - R{item.lastPurchasePrice.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter item description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specification">Specification</Label>
                  <Textarea
                    id="specification"
                    value={newItem.specification}
                    onChange={(e) => setNewItem({ ...newItem, specification: e.target.value })}
                    placeholder="Enter detailed specifications"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Required Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newItem.requiredQuantity}
                      onChange={(e) =>
                        setNewItem({ ...newItem, requiredQuantity: Number.parseInt(e.target.value) || 0 })
                      }
                      placeholder="Enter required quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit Price</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: Number.parseFloat(e.target.value) || 0 })}
                      placeholder="Enter unit price"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needsQuote"
                    checked={newItem.needsQuote}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, needsQuote: checked as boolean })}
                  />
                  <Label htmlFor="needsQuote">Requires Quote (RFQ)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Project Summary */}
      {selectedProject !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Project Summary</span>
              <Button
                size="sm"
                onClick={() => generateRFQForProject(selectedProject)}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Generate RFQ
              </Button>
            </CardTitle>
            <CardDescription>{mockProjects.find((p) => p.id === selectedProject)?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const summary = getProjectSummary(selectedProject)
              return (
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{summary.totalItems}</div>
                    <div className="text-sm text-muted-foreground">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">R{summary.totalValue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">R{summary.allocatedValue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Allocated Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">R{summary.remainingValue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Remaining Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{summary.itemsNeedingQuotes}</div>
                    <div className="text-sm text-muted-foreground">Need Quotes</div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {mockProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search BOQ items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* BOQ Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            BOQ Items ({filteredItems.length})
          </CardTitle>
          <CardDescription>Bill of Quantities items and their allocation status</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quote</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const project = mockProjects.find((p) => p.id === item.projectId)
                const stockItem = mockStockItems.find((si) => si.id === item.stockItemId)
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{project?.name}</div>
                      <div className="text-sm text-muted-foreground">{project?.location}</div>
                    </TableCell>
                    <TableCell className="font-mono">{item.itemCode || "-"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.description || stockItem?.name}</div>
                      <div className="text-sm text-muted-foreground">{item.specification}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.requiredQuantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{item.allocatedQuantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{item.remainingQuantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">R{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">R{item.totalPrice.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      {item.needsQuote ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <FileSpreadsheet className="h-3 w-3 mr-1" />
                          RFQ
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {item.remainingQuantity > 0 && stockItem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAllocatingItem(item)
                              setAllocationQuantity(Math.min(item.remainingQuantity, stockItem?.quantityInStock || 0))
                              setIsAllocateDialogOpen(true)
                            }}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Allocate Stock Dialog */}
      <Dialog open={isAllocateDialogOpen} onOpenChange={setIsAllocateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Allocate Stock</DialogTitle>
            <DialogDescription>Allocate stock to this BOQ item from available inventory.</DialogDescription>
          </DialogHeader>
          {allocatingItem && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Stock Item</Label>
                <div className="p-2 bg-muted rounded">
                  {mockStockItems.find((si) => si.id === allocatingItem.stockItemId)?.name ||
                    allocatingItem.description}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Available Stock</Label>
                  <div className="p-2 bg-muted rounded text-center">
                    {mockStockItems.find((si) => si.id === allocatingItem.stockItemId)?.quantityInStock || 0}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Remaining Need</Label>
                  <div className="p-2 bg-muted rounded text-center">{allocatingItem.remainingQuantity}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allocateQty">Quantity to Allocate</Label>
                <Input
                  id="allocateQty"
                  type="number"
                  value={allocationQuantity}
                  onChange={(e) => setAllocationQuantity(Number.parseInt(e.target.value) || 0)}
                  max={Math.min(
                    allocatingItem.remainingQuantity,
                    mockStockItems.find((si) => si.id === allocatingItem.stockItemId)?.quantityInStock || 0,
                  )}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAllocateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAllocateStock}>Allocate Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit BOQ Item</DialogTitle>
            <DialogDescription>Update the BOQ item details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project">Project *</Label>
              <Select
                value={newItem.projectId || "default"}
                onValueChange={(value) => setNewItem({ ...newItem, projectId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {mockProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-itemCode">Item Code</Label>
                <Input
                  id="edit-itemCode"
                  value={newItem.itemCode}
                  onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                  placeholder="Enter item code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stockItem">Stock Item (Optional)</Label>
                <Select
                  value={newItem.stockItemId || "default"}
                  onValueChange={(value) => setNewItem({ ...newItem, stockItemId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to stock item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No stock item</SelectItem>
                    {mockStockItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} - R{item.lastPurchasePrice.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Input
                id="edit-description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Enter item description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-specification">Specification</Label>
              <Textarea
                id="edit-specification"
                value={newItem.specification}
                onChange={(e) => setNewItem({ ...newItem, specification: e.target.value })}
                placeholder="Enter detailed specifications"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Required Quantity *</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={newItem.requiredQuantity}
                  onChange={(e) => setNewItem({ ...newItem, requiredQuantity: Number.parseInt(e.target.value) || 0 })}
                  placeholder="Enter required quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unitPrice">Unit Price</Label>
                <Input
                  id="edit-unitPrice"
                  type="number"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: Number.parseFloat(e.target.value) || 0 })}
                  placeholder="Enter unit price"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-needsQuote"
                checked={newItem.needsQuote}
                onCheckedChange={(checked) => setNewItem({ ...newItem, needsQuote: checked as boolean })}
              />
              <Label htmlFor="edit-needsQuote">Requires Quote (RFQ)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem}>Update Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
