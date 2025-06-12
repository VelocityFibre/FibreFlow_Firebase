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
import { Plus, Search, Filter, Download, Upload, Edit, Trash2, Package, TrendingUp } from "lucide-react" // Added TrendingUp
import { mockStockItems, mockSuppliers } from "@/lib/mock-data"
import type { StockItem } from "@/lib/types"

interface StockItemsProps {
  setActiveModule: (module: string) => void // Added setActiveModule prop
}

export function StockItems({ setActiveModule }: StockItemsProps) {
  // Destructure setActiveModule
  const [stockItems, setStockItems] = useState<StockItem[]>(mockStockItems)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [newItem, setNewItem] = useState<Partial<StockItem>>({
    name: "",
    category: "Fibre",
    unitOfMeasure: "",
    quantityInStock: 0,
    minimumStock: 0,
    supplierId: "",
    lastPurchasePrice: 0,
    warehouseLocation: "",
    status: "In Stock",
    itemCode: "",
    description: "",
  })

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [isProcessingImport, setIsProcessingImport] = useState(false)
  const [csvCategories, setCsvCategories] = useState<string[]>([])

  // Extended categories based on typical fiber/telecom inventory
  const defaultCategories = [
    "Fibre",
    "Poles",
    "Equipment",
    "Tools",
    "Consumables",
    "Home Connections",
    "Network Equipment",
    "Installation Materials",
    "Safety Equipment",
    "Testing Equipment",
  ]

  // Use CSV categories if available, otherwise use default
  const categories = csvCategories.length > 0 ? csvCategories : defaultCategories

  const filteredItems = stockItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.warehouseLocation.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Stock":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">In Stock</Badge>
      case "Low Stock":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Low Stock</Badge>
        )
      case "Out of Stock":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Out of Stock</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleAddItem = () => {
    if (newItem.name && newItem.category) {
      const item: StockItem = {
        id: Date.now().toString(),
        name: newItem.name,
        category: newItem.category as StockItem["category"],
        unitOfMeasure: newItem.unitOfMeasure || "pieces",
        quantityInStock: newItem.quantityInStock || 0,
        minimumStock: newItem.minimumStock || 0,
        supplierId: newItem.supplierId || mockSuppliers[0].id,
        lastPurchasePrice: newItem.lastPurchasePrice || 0,
        warehouseLocation: "A-01",
        status:
          newItem.quantityInStock === 0
            ? "Out of Stock"
            : newItem.quantityInStock <= (newItem.minimumStock || 0)
              ? "Low Stock"
              : "In Stock",
        itemCode: newItem.itemCode,
        description: newItem.description,
      }
      setStockItems([...stockItems, item])
      setNewItem({
        name: "",
        category: "Fibre",
        unitOfMeasure: "",
        quantityInStock: 0,
        minimumStock: 0,
        supplierId: "",
        lastPurchasePrice: 0,
        warehouseLocation: "",
        status: "In Stock",
        itemCode: "",
        description: "",
      })
      setIsAddDialogOpen(false)
    }
  }

  const handleEditItem = (item: StockItem) => {
    setEditingItem(item)
    setNewItem(item)
  }

  const handleUpdateItem = () => {
    if (editingItem && newItem.name) {
      const updatedItem: StockItem = {
        ...editingItem,
        ...newItem,
        status:
          newItem.quantityInStock === 0
            ? "Out of Stock"
            : (newItem.quantityInStock || 0) <= (newItem.minimumStock || 0)
              ? "Low Stock"
              : "In Stock",
      } as StockItem

      setStockItems(stockItems.map((item) => (item.id === editingItem.id ? updatedItem : item)))
      setEditingItem(null)
      setNewItem({
        name: "",
        category: "Fibre",
        unitOfMeasure: "",
        quantityInStock: 0,
        minimumStock: 0,
        supplierId: "",
        lastPurchasePrice: 0,
        warehouseLocation: "",
        status: "In Stock",
        itemCode: "",
        description: "",
      })
    }
  }

  const handleDeleteItem = (id: string) => {
    setStockItems(stockItems.filter((item) => item.id !== id))
  }

  const exportToCSV = () => {
    const headers = ["Item Code", "Name", "Category", "Unit", "Quantity", "Min Stock", "Price", "Location", "Status"]
    const csvContent = [
      headers.join(","),
      ...filteredItems.map((item) =>
        [
          item.itemCode || "",
          `"${item.name}"`,
          item.category,
          item.unitOfMeasure,
          item.quantityInStock,
          item.minimumStock,
          item.lastPurchasePrice,
          item.warehouseLocation,
          item.status,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "stock-items.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split("\n").filter((line) => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(",").map((col) => col.trim().replace(/"/g, ""))
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((col) => col.trim().replace(/"/g, ""))
      if (values.length >= headers.length) {
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })
        data.push(row)
      }
    }

    return data
  }

  const extractCategoriesFromCSV = (csvText: string) => {
    const lines = csvText.split("\n").filter((line) => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(",").map((col) => col.trim().replace(/"/g, ""))
    const categoryColumnIndex = headers.findIndex(
      (col) => col.toLowerCase().includes("category") || col.toLowerCase().includes("item category"),
    )

    if (categoryColumnIndex === -1) return []

    const categories = new Set<string>()

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((col) => col.trim().replace(/"/g, ""))
      if (values[categoryColumnIndex] && values[categoryColumnIndex].trim()) {
        categories.add(values[categoryColumnIndex].trim())
      }
    }

    return Array.from(categories).sort()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFile(file)

    try {
      const text = await file.text()

      // Extract categories from CSV
      const extractedCategories = extractCategoriesFromCSV(text)
      if (extractedCategories.length > 0) {
        setCsvCategories(extractedCategories)
        console.log("Extracted categories:", extractedCategories)
      }

      const parsed = parseCSV(text)
      setImportPreview(parsed.slice(0, 5)) // Show first 5 rows for preview
    } catch (error) {
      console.error("Error parsing CSV:", error)
    }
  }

  const processImport = async () => {
    if (!importFile) return

    setIsProcessingImport(true)

    try {
      const text = await importFile.text()
      const parsed = parseCSV(text)

      const newItems: StockItem[] = parsed.map((row, index) => {
        // Map CSV columns to our StockItem interface
        const name = row["Name"] || row["Item Name"] || `Imported Item ${index + 1}`
        const itemCode = row["Item Code"] || row["Item No"] || ""
        const category = row["Item Category"] || "Equipment" // Use exact category from CSV
        const unitOfMeasure = row["UoM"] || row["Unit"] || "pieces"

        return {
          id: `import-${Date.now()}-${index}`,
          name,
          category: category as StockItem["category"], // Use the exact category from CSV
          unitOfMeasure,
          quantityInStock: 0,
          minimumStock: 10,
          supplierId: mockSuppliers[0].id,
          lastPurchasePrice: 0,
          warehouseLocation: "A-01",
          status: "In Stock" as StockItem["status"],
          itemCode,
          description: `Imported from ${importFile.name}`,
        }
      })

      setStockItems([...stockItems, ...newItems])
      setIsImportDialogOpen(false)
      setImportFile(null)
      setImportPreview([])

      console.log(`Successfully imported ${newItems.length} items`)
      console.log("Categories used:", [...new Set(newItems.map((item) => item.category))])
    } catch (error) {
      console.error("Error importing CSV:", error)
    } finally {
      setIsProcessingImport(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-black">Stock Items</h2>
          <p className="text-muted-foreground">Manage your inventory and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button className="text-slate-500" variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button className="text-slate-500" variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Stock Item</DialogTitle>
                <DialogDescription>Enter the details for the new stock item.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name *</Label>
                    <Input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Enter item name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemCode">Item Code</Label>
                    <Input
                      id="itemCode"
                      value={newItem.itemCode}
                      onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                      placeholder="Enter item code"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={newItem.category}
                      onValueChange={(value) => setNewItem({ ...newItem, category: value as StockItem["category"] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit of Measure</Label>
                    <Input
                      id="unit"
                      value={newItem.unitOfMeasure}
                      onChange={(e) => setNewItem({ ...newItem, unitOfMeasure: e.target.value })}
                      placeholder="e.g., pieces, meters, kg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity in Stock</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newItem.quantityInStock}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantityInStock: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Minimum Stock</Label>
                    <Input
                      id="minStock"
                      type="number"
                      value={newItem.minimumStock}
                      onChange={(e) => setNewItem({ ...newItem, minimumStock: Number.parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Last Purchase Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newItem.lastPurchasePrice}
                      onChange={(e) =>
                        setNewItem({ ...newItem, lastPurchasePrice: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Select
                      value={newItem.supplierId}
                      onValueChange={(value) => setNewItem({ ...newItem, supplierId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockSuppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Warehouse Location</Label>
                    <Input
                      id="location"
                      value={newItem.warehouseLocation}
                      onChange={(e) => setNewItem({ ...newItem, warehouseLocation: e.target.value })}
                      placeholder="e.g., A-01, B-02"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter item description"
                  />
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

      {/* New Card for Stock Movements */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Movements</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Track all incoming and outgoing stock transactions.</p>
          <Button onClick={() => setActiveModule("movements")}>Go to Stock Movements</Button>
        </CardContent>
      </Card>

      {/* Show categories info if CSV categories are loaded */}
      {csvCategories.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4" />
              <span className="font-medium">Categories from imported CSV:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {csvCategories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items by name, code, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stock Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Items ({filteredItems.length})
          </CardTitle>
          <CardDescription>Manage your inventory items and stock levels</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const supplier = mockSuppliers.find((s) => s.id === item.supplierId)
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.itemCode || "-"}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.quantityInStock.toLocaleString()}</TableCell>
                    <TableCell>{item.unitOfMeasure}</TableCell>
                    <TableCell className="text-right font-mono">{item.minimumStock.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">R{item.lastPurchasePrice.toFixed(2)}</TableCell>
                    <TableCell>{item.warehouseLocation}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Stock Item</DialogTitle>
            <DialogDescription>Update the details for this stock item.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Item Name *</Label>
                <Input
                  id="edit-name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Enter item name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-itemCode">Item Code</Label>
                <Input
                  id="edit-itemCode"
                  value={newItem.itemCode}
                  onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                  placeholder="Enter item code"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(value) => setNewItem({ ...newItem, category: value as StockItem["category"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit of Measure</Label>
                <Input
                  id="edit-unit"
                  value={newItem.unitOfMeasure}
                  onChange={(e) => setNewItem({ ...newItem, unitOfMeasure: e.target.value })}
                  placeholder="e.g., pieces, meters, kg"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity in Stock</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={newItem.quantityInStock}
                  onChange={(e) => setNewItem({ ...newItem, quantityInStock: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-minStock">Minimum Stock</Label>
                <Input
                  id="edit-minStock"
                  type="number"
                  value={newItem.minimumStock}
                  onChange={(e) => setNewItem({ ...newItem, minimumStock: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Last Purchase Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={newItem.lastPurchasePrice}
                  onChange={(e) =>
                    setNewItem({ ...newItem, lastPurchasePrice: Number.parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-supplier">Supplier</Label>
                <Select
                  value={newItem.supplierId}
                  onValueChange={(value) => setNewItem({ ...newItem, supplierId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Warehouse Location</Label>
                <Input
                  id="edit-location"
                  value={newItem.warehouseLocation}
                  onChange={(e) => setNewItem({ ...newItem, warehouseLocation: e.target.value })}
                  placeholder="e.g., A-01, B-02"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Enter item description"
              />
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

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Import Stock Items</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import stock items. Expected columns: Name, Item No, UoM, Item Category, Item Code
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="csvFile">CSV File</Label>
              <Input id="csvFile" type="file" accept=".csv" onChange={handleFileUpload} />
            </div>

            {importFile && (
              <div className="space-y-2">
                <Label>File Information</Label>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">File name:</span> {importFile.name}
                    </div>
                    <div>
                      <span className="font-medium">File size:</span> {(importFile.size / 1024).toFixed(1)} KB
                    </div>
                    <div>
                      <span className="font-medium">Preview rows:</span> {importPreview.length}
                    </div>
                    <div>
                      <span className="font-medium">Categories found:</span> {csvCategories.length}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Preview (First 5 rows)</Label>
                <div className="border rounded-lg p-4 max-h-80 overflow-auto bg-muted/20">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Name</TableHead>
                        <TableHead className="min-w-[120px]">Item Code</TableHead>
                        <TableHead className="min-w-[150px]">Category</TableHead>
                        <TableHead className="min-w-[100px]">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row["Name"] || row["Item Name"] || "N/A"}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {row["Item Code"] || row["Item No"] || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{row["Item Category"] || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>{row["UoM"] || row["Unit"] || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {csvCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Categories found in CSV ({csvCategories.length})</Label>
                <div className="border rounded-lg p-3 bg-muted/20">
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
                    {csvCategories.map((category) => (
                      <Badge key={category} variant="secondary" className="text-sm">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={processImport} disabled={!importFile || isProcessingImport}>
              {isProcessingImport ? "Importing..." : `Import ${importFile ? "Items" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
