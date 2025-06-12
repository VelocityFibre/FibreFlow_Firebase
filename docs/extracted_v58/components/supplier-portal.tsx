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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar,
  Clock,
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  Building,
  MapPin,
  Mail,
  User,
} from "lucide-react"
import { mockRFQs, mockSuppliers, mockProjects, mockStockItems } from "@/lib/mock-data"
import type { Quote, QuoteItem, RFQ } from "@/lib/types"

interface SupplierPortalProps {
  supplierId?: string
  rfqId?: string
}

export function SupplierPortal({ supplierId = "SUP-001", rfqId }: SupplierPortalProps) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null)
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false)
  const [currentQuote, setCurrentQuote] = useState<Partial<Quote>>({})
  const [quoteItems, setQuoteItems] = useState<Partial<QuoteItem>[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get supplier info
  const supplier = mockSuppliers.find((s) => s.id === supplierId)

  // Filter RFQs for this supplier
  const supplierRFQs = mockRFQs.filter(
    (rfq) => rfq.supplierId === supplierId && (rfq.status === "Open" || rfq.status === "Received"),
  )

  // Initialize quote when RFQ is selected
  const initializeQuote = (rfq: RFQ) => {
    const items = rfq.items.map((item) => ({
      rfqItemId: item.id,
      unitPrice: 0,
      totalPrice: 0,
      leadTime: 7,
      availability: "In Stock",
      notes: "",
    }))

    setQuoteItems(items)
    setCurrentQuote({
      rfqId: rfq.id,
      supplierId: supplierId,
      submittedDate: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      totalAmount: 0,
      leadTime: 14,
      paymentTerms: "Net 30",
      items: [],
      notes: "",
      status: "Submitted",
    })
  }

  const updateQuoteItem = (index: number, field: string, value: any) => {
    const updatedItems = [...quoteItems]
    const item = { ...updatedItems[index] }

    if (field === "unitPrice") {
      const rfqItem = selectedRFQ?.items[index]
      if (rfqItem) {
        item.unitPrice = value
        item.totalPrice = value * rfqItem.quantity
      }
    } else {
      item[field as keyof QuoteItem] = value
    }

    updatedItems[index] = item
    setQuoteItems(updatedItems)

    // Calculate total quote amount
    const totalAmount = updatedItems.reduce((sum, quoteItem) => sum + (quoteItem.totalPrice || 0), 0)
    setCurrentQuote((prev) => ({ ...prev, totalAmount }))
  }

  const handleSubmitQuote = async () => {
    if (!selectedRFQ || !currentQuote.validUntil || !currentQuote.paymentTerms) {
      alert("Please fill in all required fields")
      return
    }

    // Validate all items have prices
    const hasEmptyPrices = quoteItems.some((item) => !item.unitPrice || item.unitPrice <= 0)
    if (hasEmptyPrices) {
      alert("Please provide unit prices for all items")
      return
    }

    setIsSubmitting(true)

    try {
      const quote: Quote = {
        id: `QUOTE-${Date.now()}`,
        rfqId: selectedRFQ.id,
        supplierId: supplierId,
        submittedDate: new Date().toISOString().split("T")[0],
        validUntil: currentQuote.validUntil || "",
        totalAmount: currentQuote.totalAmount || 0,
        leadTime: currentQuote.leadTime || 14,
        paymentTerms: currentQuote.paymentTerms || "",
        items: quoteItems.map((item, index) => ({
          id: `QUOTE-ITEM-${Date.now()}-${index}`,
          rfqItemId: item.rfqItemId || "",
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          leadTime: item.leadTime || 7,
          availability: item.availability || "In Stock",
          notes: item.notes || "",
        })),
        notes: currentQuote.notes || "",
        status: "Submitted",
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setQuotes([...quotes, quote])
      setIsQuoteDialogOpen(false)
      setSelectedRFQ(null)

      alert("Quote submitted successfully! You will receive a confirmation email shortly.")
    } catch (error) {
      alert("Error submitting quote. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <Badge className="bg-blue-100 text-blue-800">Open</Badge>
      case "Received":
        return <Badge className="bg-green-100 text-green-800">Received</Badge>
      case "Submitted":
        return <Badge className="bg-purple-100 text-purple-800">Submitted</Badge>
      case "Under Review":
        return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>
      case "Accepted":
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
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

  const openQuoteDialog = (rfq: RFQ) => {
    setSelectedRFQ(rfq)
    initializeQuote(rfq)
    setIsQuoteDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Supplier Portal</h1>
                <p className="text-sm text-gray-500">Welcome, {supplier?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {supplier?.contactPerson}
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {supplier?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="rfqs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rfqs">Open RFQs ({supplierRFQs.length})</TabsTrigger>
            <TabsTrigger value="quotes">My Quotes ({quotes.length})</TabsTrigger>
            <TabsTrigger value="profile">Company Profile</TabsTrigger>
          </TabsList>

          {/* Open RFQs Tab */}
          <TabsContent value="rfqs" className="space-y-6">
            {supplierRFQs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Open RFQs</h3>
                  <p className="text-gray-500">You don't have any open requests for quotation at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {supplierRFQs.map((rfq) => {
                  const project = mockProjects.find((p) => p.id === rfq.projectId)
                  const daysUntilDue = getDaysUntilDue(rfq.dueDate)
                  const isUrgent = daysUntilDue <= 3
                  const hasQuote = quotes.some((q) => q.rfqId === rfq.id)

                  return (
                    <Card
                      key={rfq.id}
                      className={`hover:shadow-lg transition-shadow ${isUrgent ? "border-orange-200 bg-orange-50" : ""}`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              {rfq.id}
                            </CardTitle>
                            <CardDescription className="font-medium">{project?.name}</CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isUrgent && <AlertCircle className="h-5 w-5 text-orange-500" />}
                            {hasQuote && <CheckCircle className="h-5 w-5 text-green-500" />}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(rfq.status)}
                          {isUrgent && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              Due in {daysUntilDue} days
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>RFQ Date: {new Date(rfq.rfqDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>Due: {new Date(rfq.dueDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{project?.location}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t">
                          <div className="flex justify-between text-sm mb-3">
                            <div className="text-center">
                              <div className="font-semibold text-lg">{rfq.items.length}</div>
                              <div className="text-gray-500">Items</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-lg">R{rfq.totalEstimatedAmount.toLocaleString()}</div>
                              <div className="text-gray-500">Est. Value</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedRFQ(rfq)
                              // Show RFQ details in a preview mode
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button size="sm" className="flex-1" onClick={() => openQuoteDialog(rfq)} disabled={hasQuote}>
                            {hasQuote ? "Quote Submitted" : "Submit Quote"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* My Quotes Tab */}
          <TabsContent value="quotes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submitted Quotes</CardTitle>
                <CardDescription>Track the status of your submitted quotations</CardDescription>
              </CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No quotes submitted yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quote ID</TableHead>
                        <TableHead>RFQ ID</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Lead Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.map((quote) => {
                        const rfq = mockRFQs.find((r) => r.id === quote.rfqId)
                        const project = rfq ? mockProjects.find((p) => p.id === rfq.projectId) : null

                        return (
                          <TableRow key={quote.id}>
                            <TableCell className="font-mono">{quote.id}</TableCell>
                            <TableCell className="font-mono">{quote.rfqId}</TableCell>
                            <TableCell>{project?.name}</TableCell>
                            <TableCell>{new Date(quote.submittedDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(quote.validUntil).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right font-mono">
                              R{quote.totalAmount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">{quote.leadTime} days</TableCell>
                            <TableCell>{getStatusBadge(quote.status)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Your registered company details</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Company Name</Label>
                    <div className="text-lg font-medium">{supplier?.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Contact Person</Label>
                    <div>{supplier?.contactPerson}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <div>{supplier?.email}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Phone</Label>
                    <div>{supplier?.phone}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Address</Label>
                    <div>{supplier?.address}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Payment Terms</Label>
                    <div>{supplier?.paymentTerms}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quote Submission Dialog */}
      <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit Quote - {selectedRFQ?.id}
            </DialogTitle>
            <DialogDescription>
              Provide your quotation for the requested items. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          {selectedRFQ && (
            <div className="space-y-6">
              {/* RFQ Summary */}
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Project:</strong> {mockProjects.find((p) => p.id === selectedRFQ.projectId)?.name}
                    </div>
                    <div>
                      <strong>Due Date:</strong> {new Date(selectedRFQ.dueDate).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Items:</strong> {selectedRFQ.items.length}
                    </div>
                    <div>
                      <strong>Est. Value:</strong> R{selectedRFQ.totalEstimatedAmount.toLocaleString()}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Quote Items */}
              <div className="border rounded-lg">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium">Quote Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Item Description</TableHead>
                        <TableHead className="w-[80px]">Qty</TableHead>
                        <TableHead className="w-[120px]">Unit Price *</TableHead>
                        <TableHead className="w-[120px]">Total Price</TableHead>
                        <TableHead className="w-[100px]">Lead Time *</TableHead>
                        <TableHead className="w-[120px]">Availability</TableHead>
                        <TableHead className="w-[200px]">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRFQ.items.map((rfqItem, index) => {
                        const stockItem = mockStockItems.find((si) => si.id === rfqItem.stockItemId)
                        const quoteItem = quoteItems[index] || {}

                        return (
                          <TableRow key={rfqItem.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{stockItem?.name || rfqItem.description}</div>
                                <div className="text-sm text-gray-500">{rfqItem.specification}</div>
                                {rfqItem.itemCode && (
                                  <div className="text-xs text-gray-400">Code: {rfqItem.itemCode}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-medium">{rfqItem.quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={quoteItem.unitPrice || ""}
                                onChange={(e) =>
                                  updateQuoteItem(index, "unitPrice", Number.parseFloat(e.target.value) || 0)
                                }
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell className="font-mono font-medium">
                              R{((quoteItem.unitPrice || 0) * rfqItem.quantity).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  placeholder="7"
                                  value={quoteItem.leadTime || ""}
                                  onChange={(e) =>
                                    updateQuoteItem(index, "leadTime", Number.parseInt(e.target.value) || 0)
                                  }
                                  className="w-16"
                                />
                                <span className="text-xs text-gray-500">days</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <select
                                value={quoteItem.availability || "In Stock"}
                                onChange={(e) => updateQuoteItem(index, "availability", e.target.value)}
                                className="w-full p-2 border rounded text-sm"
                              >
                                <option value="In Stock">In Stock</option>
                                <option value="Limited Stock">Limited Stock</option>
                                <option value="Out of Stock">Out of Stock</option>
                                <option value="Made to Order">Made to Order</option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Optional notes"
                                value={quoteItem.notes || ""}
                                onChange={(e) => updateQuoteItem(index, "notes", e.target.value)}
                                className="w-full"
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Quote Summary */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="validUntil">Quote Valid Until *</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={currentQuote.validUntil}
                      onChange={(e) => setCurrentQuote({ ...currentQuote, validUntil: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="leadTime">Overall Lead Time (Days) *</Label>
                    <Input
                      id="leadTime"
                      type="number"
                      value={currentQuote.leadTime}
                      onChange={(e) =>
                        setCurrentQuote({ ...currentQuote, leadTime: Number.parseInt(e.target.value) || 0 })
                      }
                      placeholder="14"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="paymentTerms">Payment Terms *</Label>
                    <select
                      id="paymentTerms"
                      value={currentQuote.paymentTerms}
                      onChange={(e) => setCurrentQuote({ ...currentQuote, paymentTerms: e.target.value })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select payment terms</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 15">Net 15</option>
                      <option value="COD">Cash on Delivery</option>
                      <option value="50% Advance">50% Advance</option>
                    </select>
                  </div>
                  <div>
                    <Label>Total Quote Amount</Label>
                    <div className="text-3xl font-bold text-green-600">
                      R{(currentQuote.totalAmount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={currentQuote.notes}
                    onChange={(e) => setCurrentQuote({ ...currentQuote, notes: e.target.value })}
                    placeholder="Any additional information, terms, or conditions"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsQuoteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitQuote}
              disabled={
                isSubmitting ||
                !currentQuote.validUntil ||
                !currentQuote.paymentTerms ||
                quoteItems.some((item) => !item.unitPrice || !item.leadTime)
              }
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Quote
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
