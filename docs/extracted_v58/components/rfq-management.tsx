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
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  Send,
  ExternalLink,
  BarChart3,
} from "lucide-react"
import { mockRFQs, mockSuppliers, mockProjects, mockStockItems, mockBOQItems } from "@/lib/mock-data"
import type { RFQ, RFQItem } from "@/lib/types"

export function RFQManagement() {
  const [rfqs, setRFQs] = useState<RFQ[]>(mockRFQs)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [isSupplierPortalDialogOpen, setIsSupplierPortalDialogOpen] = useState(false)
  const [editingRFQ, setEditingRFQ] = useState<RFQ | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [selectedRFQForPortal, setSelectedRFQForPortal] = useState<string>("")
  const [newRFQ, setNewRFQ] = useState<Partial<RFQ>>({
    supplierId: "",
    projectId: "",
    rfqDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    status: "Open",
    totalEstimatedAmount: 0,
    items: [],
  })

  const statuses = ["Open", "Received", "Closed", "Evaluated"]

  const filteredRFQs = rfqs.filter((rfq) => {
    const supplier = mockSuppliers.find((s) => s.id === rfq.supplierId)
    const project = mockProjects.find((p) => p.id === rfq.projectId)

    const matchesSearch =
      supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfq.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || rfq.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <Badge className="bg-blue-100 text-blue-800">Open</Badge>
      case "Received":
        return <Badge className="bg-green-100 text-green-800">Received</Badge>
      case "Evaluated":
        return <Badge className="bg-purple-100 text-purple-800">Evaluated</Badge>
      case "Closed":
        return <Badge variant="secondary">Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const generateRFQFromBOQ = () => {
    if (!selectedProject || !selectedSupplier) return

    // Find BOQ items for the project that need procurement
    const projectBOQItems = mockBOQItems.filter(
      (item) => item.projectId === selectedProject && item.remainingQuantity > 0 && item.needsQuote,
    )

    // Filter items by supplier (based on stock item's supplier)
    const supplierItems = projectBOQItems.filter((boqItem) => {
      const stockItem = mockStockItems.find((si) => si.id === boqItem.stockItemId)
      return stockItem?.supplierId === selectedSupplier || !boqItem.stockItemId // Include items without stock mapping
    })

    if (supplierItems.length === 0) {
      alert("No items requiring quotes found for this supplier and project combination.")
      return
    }

    const rfqItems: RFQItem[] = supplierItems.map((boqItem) => ({
      id: Date.now().toString() + Math.random(),
      stockItemId: boqItem.stockItemId || "",
      quantity: boqItem.remainingQuantity,
      estimatedPrice: boqItem.unitPrice,
      specification: boqItem.specification,
      itemCode: boqItem.itemCode,
      description: boqItem.description,
    }))

    const totalAmount = rfqItems.reduce((sum, item) => sum + item.quantity * item.estimatedPrice, 0)

    const newRFQ: RFQ = {
      id: `RFQ-${Date.now()}`,
      supplierId: selectedSupplier,
      projectId: selectedProject,
      rfqDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 14 days from now
      status: "Open",
      totalEstimatedAmount: totalAmount,
      items: rfqItems,
      supplierPortalLink: `${window.location.origin}/supplier-portal?rfq=${Date.now()}&supplier=${selectedSupplier}`,
    }

    setRFQs([...rfqs, newRFQ])
    setSelectedProject("")
    setSelectedSupplier("")
    setIsGenerateDialogOpen(false)

    alert(`RFQ generated successfully with ${rfqItems.length} items. Supplier portal link created.`)
  }

  const handleAddRFQ = () => {
    if (newRFQ.supplierId && newRFQ.projectId && newRFQ.dueDate) {
      const rfq: RFQ = {
        id: `RFQ-${Date.now()}`,
        supplierId: newRFQ.supplierId,
        projectId: newRFQ.projectId,
        rfqDate: newRFQ.rfqDate || new Date().toISOString().split("T")[0],
        dueDate: newRFQ.dueDate,
        status: "Open",
        totalEstimatedAmount: newRFQ.totalEstimatedAmount || 0,
        items: newRFQ.items || [],
        supplierPortalLink: `${window.location.origin}/supplier-portal?rfq=${Date.now()}&supplier=${newRFQ.supplierId}`,
      }
      setRFQs([...rfqs, rfq])
      setNewRFQ({
        supplierId: "",
        projectId: "",
        rfqDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        status: "Open",
        totalEstimatedAmount: 0,
        items: [],
      })
      setIsAddDialogOpen(false)
    }
  }

  const handleEditRFQ = (rfq: RFQ) => {
    setEditingRFQ(rfq)
    setNewRFQ(rfq)
  }

  const handleUpdateRFQ = () => {
    if (editingRFQ) {
      const updatedRFQ: RFQ = {
        ...editingRFQ,
        ...newRFQ,
      } as RFQ

      setRFQs(rfqs.map((rfq) => (rfq.id === editingRFQ.id ? updatedRFQ : rfq)))
      setEditingRFQ(null)
      setNewRFQ({
        supplierId: "",
        projectId: "",
        rfqDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        status: "Open",
        totalEstimatedAmount: 0,
        items: [],
      })
    }
  }

  const handleDeleteRFQ = (id: string) => {
    setRFQs(rfqs.filter((rfq) => rfq.id !== id))
  }

  const sendToSupplier = (rfqId: string) => {
    const rfq = rfqs.find((r) => r.id === rfqId)
    if (rfq) {
      setSelectedRFQForPortal(rfqId)
      setIsSupplierPortalDialogOpen(true)
    }
  }

  const exportToCSV = () => {
    const headers = [
      "RFQ ID",
      "Supplier",
      "Project",
      "RFQ Date",
      "Due Date",
      "Status",
      "Total Amount",
      "Items Count",
      "Portal Link",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredRFQs.map((rfq) => {
        const supplier = mockSuppliers.find((s) => s.id === rfq.supplierId)
        const project = mockProjects.find((p) => p.id === rfq.projectId)
        return [
          rfq.id,
          `"${supplier?.name || ""}"`,
          `"${project?.name || ""}"`,
          rfq.rfqDate,
          rfq.dueDate,
          rfq.status,
          rfq.totalEstimatedAmount,
          rfq.items.length,
          `"${rfq.supplierPortalLink || ""}"`,
        ].join(",")
      }),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "rfq-list.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-500">RFQ Management</h2>
          <p className="text-muted-foreground">Manage Request for Quotations and procurement processes</p>
        </div>
        <div className="flex gap-2">
          <Button className="text-slate-500" variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-slate-500">
                <Plus className="mr-2 h-4 w-4" />
                Generate from BOQ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Generate RFQ from BOQ</DialogTitle>
                <DialogDescription>
                  Create an RFQ based on BOQ requirements for a specific project and supplier. Only items marked as
                  "Needs Quote" will be included.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="gen-project">Project *</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
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
                <div className="space-y-2">
                  <Label htmlFor="gen-supplier">Supplier *</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
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
                {selectedProject && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <strong>Items requiring quotes:</strong>{" "}
                      {
                        mockBOQItems.filter(
                          (item) => item.projectId === selectedProject && item.needsQuote && item.remainingQuantity > 0,
                        ).length
                      }{" "}
                      items found
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={generateRFQFromBOQ}>Generate RFQ</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="text-slate-500">
                <Plus className="mr-2 h-4 w-4" />
                Add RFQ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New RFQ</DialogTitle>
                <DialogDescription>Create a new Request for Quotation.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select
                    value={newRFQ.supplierId}
                    onValueChange={(value) => setNewRFQ({ ...newRFQ, supplierId: value })}
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
                  <Label htmlFor="project">Project *</Label>
                  <Select
                    value={newRFQ.projectId}
                    onValueChange={(value) => setNewRFQ({ ...newRFQ, projectId: value })}
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
                    <Label htmlFor="rfqDate">RFQ Date</Label>
                    <Input
                      id="rfqDate"
                      type="date"
                      value={newRFQ.rfqDate}
                      onChange={(e) => setNewRFQ({ ...newRFQ, rfqDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newRFQ.dueDate}
                      onChange={(e) => setNewRFQ({ ...newRFQ, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Estimated Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newRFQ.totalEstimatedAmount}
                    onChange={(e) =>
                      setNewRFQ({ ...newRFQ, totalEstimatedAmount: Number.parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Enter estimated amount"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRFQ}>Add RFQ</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search RFQs by ID, supplier, or project..."
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

      {/* RFQ Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRFQs.map((rfq) => {
          const supplier = mockSuppliers.find((s) => s.id === rfq.supplierId)
          const project = mockProjects.find((p) => p.id === rfq.projectId)
          const daysUntilDue = getDaysUntilDue(rfq.dueDate)
          const isOverdue = daysUntilDue < 0
          const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0

          return (
            <Card key={rfq.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {rfq.id}
                    </CardTitle>
                    <CardDescription>{supplier?.name}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => sendToSupplier(rfq.id)}>
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditRFQ(rfq)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRFQ(rfq.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  {getStatusBadge(rfq.status)}
                  {(isOverdue || isDueSoon) && (
                    <div
                      className={`flex items-center gap-1 text-sm ${isOverdue ? "text-red-600" : "text-orange-600"}`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {isOverdue ? "Overdue" : "Due Soon"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>RFQ: {new Date(rfq.rfqDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Due: {new Date(rfq.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>R{rfq.totalEstimatedAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm font-medium mb-2">Project: {project?.name}</div>
                  <div className="text-sm text-muted-foreground">{project?.location}</div>
                </div>

                <div className="flex justify-between text-sm pt-2 border-t">
                  <div className="text-center">
                    <div className="font-semibold">{rfq.items.length}</div>
                    <div className="text-muted-foreground">Items</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{daysUntilDue >= 0 ? daysUntilDue : 0}</div>
                    <div className="text-muted-foreground">Days Left</div>
                  </div>
                </div>

                {rfq.supplierPortalLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(rfq.supplierPortalLink, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Supplier Portal
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* RFQ Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            RFQ Summary ({filteredRFQs.length})
          </CardTitle>
          <CardDescription>Overview of all Request for Quotations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFQ ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>RFQ Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRFQs.map((rfq) => {
                const supplier = mockSuppliers.find((s) => s.id === rfq.supplierId)
                const project = mockProjects.find((p) => p.id === rfq.projectId)
                const daysUntilDue = getDaysUntilDue(rfq.dueDate)
                const isOverdue = daysUntilDue < 0

                return (
                  <TableRow key={rfq.id}>
                    <TableCell className="font-mono">{rfq.id}</TableCell>
                    <TableCell>{supplier?.name}</TableCell>
                    <TableCell>
                      <div className="font-medium">{project?.name}</div>
                      <div className="text-sm text-muted-foreground">{project?.location}</div>
                    </TableCell>
                    <TableCell>{new Date(rfq.rfqDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className={isOverdue ? "text-red-600" : ""}>
                        {new Date(rfq.dueDate).toLocaleDateString()}
                      </div>
                      {isOverdue && <div className="text-xs text-red-600">{Math.abs(daysUntilDue)} days overdue</div>}
                    </TableCell>
                    <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                    <TableCell className="text-right font-mono">R{rfq.totalEstimatedAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-center">{rfq.items.length}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => sendToSupplier(rfq.id)}>
                          <Send className="h-4 w-4" />
                        </Button>
                        {rfq.status === "Received" && (
                          <Button variant="ghost" size="sm" title="Analyze Quotes">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEditRFQ(rfq)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRFQ(rfq.id)}>
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

      {/* Supplier Portal Dialog */}
      <Dialog open={isSupplierPortalDialogOpen} onOpenChange={setIsSupplierPortalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send RFQ to Supplier</DialogTitle>
            <DialogDescription>Share the supplier portal link or send notification to supplier</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedRFQForPortal &&
              (() => {
                const rfq = rfqs.find((r) => r.id === selectedRFQForPortal)
                const supplier = rfq ? mockSuppliers.find((s) => s.id === rfq.supplierId) : null

                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="font-medium">RFQ: {rfq?.id}</div>
                      <div className="text-sm text-muted-foreground">Supplier: {supplier?.name}</div>
                      <div className="text-sm text-muted-foreground">Items: {rfq?.items.length}</div>
                    </div>

                    <div className="space-y-2">
                      <Label>Supplier Portal Link</Label>
                      <div className="flex gap-2">
                        <Input value={rfq?.supplierPortalLink || ""} readOnly className="font-mono text-sm" />
                        <Button
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(rfq?.supplierPortalLink || "")}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email Message (Optional)</Label>
                      <Textarea placeholder="Additional message to include in the email notification..." rows={3} />
                    </div>
                  </div>
                )
              })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplierPortalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                alert("RFQ sent to supplier successfully!")
                setIsSupplierPortalDialogOpen(false)
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Send RFQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingRFQ} onOpenChange={(open) => !open && setEditingRFQ(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit RFQ</DialogTitle>
            <DialogDescription>Update the RFQ details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-supplier">Supplier *</Label>
              <Select value={newRFQ.supplierId} onValueChange={(value) => setNewRFQ({ ...newRFQ, supplierId: value })}>
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
              <Label htmlFor="edit-project">Project *</Label>
              <Select value={newRFQ.projectId} onValueChange={(value) => setNewRFQ({ ...newRFQ, projectId: value })}>
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
                <Label htmlFor="edit-rfqDate">RFQ Date</Label>
                <Input
                  id="edit-rfqDate"
                  type="date"
                  value={newRFQ.rfqDate}
                  onChange={(e) => setNewRFQ({ ...newRFQ, rfqDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Due Date *</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={newRFQ.dueDate}
                  onChange={(e) => setNewRFQ({ ...newRFQ, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={newRFQ.status}
                  onValueChange={(value) => setNewRFQ({ ...newRFQ, status: value as RFQ["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Estimated Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={newRFQ.totalEstimatedAmount}
                  onChange={(e) =>
                    setNewRFQ({ ...newRFQ, totalEstimatedAmount: Number.parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Enter estimated amount"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRFQ(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRFQ}>Update RFQ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
