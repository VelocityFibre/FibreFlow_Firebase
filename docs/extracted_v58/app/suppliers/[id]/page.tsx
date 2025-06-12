"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Star, Phone, Mail, MapPin, Edit, Calendar, Package, FileText } from "lucide-react"
import { mockSuppliers, mockStockItems, mockRFQs } from "@/lib/mock-data"
import type { Supplier } from "@/lib/types"

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [supplierStockItems, setSupplierStockItems] = useState([])
  const [supplierRFQs, setSupplierRFQs] = useState([])

  useEffect(() => {
    const foundSupplier = mockSuppliers.find((s) => s.id === params.id)
    setSupplier(foundSupplier || null)
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    if (supplier) {
      setSupplierStockItems(mockStockItems.filter((item) => item.supplierId === supplier?.id))
      setSupplierRFQs(mockRFQs.filter((rfq) => rfq.supplierId === supplier?.id))
    }
  }, [supplier])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading supplier details...</p>
        </div>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Supplier Not Found</h2>
          <p className="text-gray-600 mt-2">The supplier you're looking for doesn't exist.</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
    ))
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
            <p className="text-gray-600">{supplier.contactPerson}</p>
          </div>
        </div>
        <Button>
          <Edit className="mr-2 h-4 w-4" />
          Edit Supplier
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {renderStars(supplier.rating)}
              <span className="text-sm text-muted-foreground">({supplier.rating}/5)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Active items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RFQs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierRFQs.length}</div>
            <p className="text-xs text-muted-foreground">Total requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Terms</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplier.paymentTerms}</div>
            <p className="text-xs text-muted-foreground">Terms</p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{supplier.email}</p>
              </div>
            </div>
            {supplier.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{supplier.phone}</p>
                </div>
              </div>
            )}
          </div>
          {supplier.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{supplier.address}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for detailed information */}
      <Tabs defaultValue="stock-items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock-items">Stock Items ({supplierStockItems.length})</TabsTrigger>
          <TabsTrigger value="rfqs">RFQs ({supplierRFQs.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="stock-items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Items</CardTitle>
              <CardDescription>Items supplied by {supplier.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {supplierStockItems.length > 0 ? (
                <div className="space-y-4">
                  {supplierStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${item.unitPrice}</p>
                        <p className="text-sm text-muted-foreground">Stock: {item.currentStock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No stock items found for this supplier.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rfqs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request for Quotations</CardTitle>
              <CardDescription>RFQs sent to {supplier.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {supplierRFQs.length > 0 ? (
                <div className="space-y-4">
                  {supplierRFQs.map((rfq) => (
                    <div key={rfq.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">RFQ #{rfq.id}</h4>
                        <p className="text-sm text-muted-foreground">Created: {rfq.createdAt}</p>
                      </div>
                      <Badge variant={rfq.status === "pending" ? "secondary" : "default"}>{rfq.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No RFQs found for this supplier.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier History</CardTitle>
              <CardDescription>Activity and interaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No history available yet.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
