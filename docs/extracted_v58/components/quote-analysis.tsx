"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { TrendingDown, Award, Clock, DollarSign, Brain, BarChart3, Zap } from "lucide-react"
import { mockRFQs, mockSuppliers, mockProjects, mockStockItems } from "@/lib/mock-data"
import type { Quote, QuoteComparison } from "@/lib/types"

export function QuoteAnalysis() {
  const [selectedRFQ, setSelectedRFQ] = useState<string>("")
  const [quotes] = useState<Quote[]>([
    // Mock quotes for demonstration
    {
      id: "QUOTE-001",
      rfqId: "RFQ-1",
      supplierId: "1",
      submittedDate: "2024-01-15",
      validUntil: "2024-02-15",
      totalAmount: 125000,
      leadTime: 14,
      paymentTerms: "Net 30",
      items: [
        {
          id: "QI-001",
          rfqItemId: "RFQ-ITEM-001",
          unitPrice: 250,
          totalPrice: 25000,
          leadTime: 10,
          availability: "In Stock",
          notes: "Bulk discount applied",
        },
      ],
      notes: "We can offer additional 5% discount for orders over R100k",
      status: "Submitted",
      score: 85,
      aiAnalysis: "Strong pricing with good lead times. Supplier has excellent track record.",
    },
    {
      id: "QUOTE-002",
      rfqId: "RFQ-1",
      supplierId: "2",
      submittedDate: "2024-01-16",
      validUntil: "2024-02-20",
      totalAmount: 118000,
      leadTime: 21,
      paymentTerms: "Net 45",
      items: [
        {
          id: "QI-002",
          rfqItemId: "RFQ-ITEM-001",
          unitPrice: 230,
          totalPrice: 23000,
          leadTime: 15,
          availability: "Limited Stock",
          notes: "Premium quality materials",
        },
      ],
      notes: "Extended warranty included",
      status: "Submitted",
      score: 78,
      aiAnalysis: "Best pricing but longer lead times. Quality assurance is excellent.",
    },
    {
      id: "QUOTE-003",
      rfqId: "RFQ-1",
      supplierId: "3",
      submittedDate: "2024-01-17",
      validUntil: "2024-02-10",
      totalAmount: 135000,
      leadTime: 7,
      paymentTerms: "Net 15",
      items: [
        {
          id: "QI-003",
          rfqItemId: "RFQ-ITEM-001",
          unitPrice: 270,
          totalPrice: 27000,
          leadTime: 7,
          availability: "In Stock",
          notes: "Express delivery available",
        },
      ],
      notes: "Fastest delivery, premium service",
      status: "Submitted",
      score: 72,
      aiAnalysis: "Fastest delivery but highest cost. Good for urgent requirements.",
    },
  ])

  const [isAIAnalysisOpen, setIsAIAnalysisOpen] = useState(false)
  const [aiRecommendation, setAIRecommendation] = useState("")
  const [analysisWeights, setAnalysisWeights] = useState({
    price: 40,
    leadTime: 30,
    quality: 20,
    reliability: 10,
  })

  const rfqsWithQuotes = mockRFQs.filter((rfq) => quotes.some((quote) => quote.rfqId === rfq.id))

  const selectedRFQData = mockRFQs.find((rfq) => rfq.id === selectedRFQ)
  const rfqQuotes = quotes.filter((quote) => quote.rfqId === selectedRFQ)

  const generateQuoteComparison = (): QuoteComparison[] => {
    if (!selectedRFQData) return []

    return selectedRFQData.items.map((rfqItem) => {
      const stockItem = mockStockItems.find((si) => si.id === rfqItem.stockItemId)
      const itemQuotes = rfqQuotes
        .map((quote) => {
          const quoteItem = quote.items.find((qi) => qi.rfqItemId === rfqItem.id)
          const supplier = mockSuppliers.find((s) => s.id === quote.supplierId)

          return {
            quoteId: quote.id,
            supplierName: supplier?.name || "Unknown",
            unitPrice: quoteItem?.unitPrice || 0,
            leadTime: quoteItem?.leadTime || 0,
            totalPrice: quoteItem?.totalPrice || 0,
            score: calculateItemScore(quoteItem, quote),
          }
        })
        .filter((q) => q.unitPrice > 0)

      // Find best options
      const bestPrice = itemQuotes.reduce((min, q) => (q.unitPrice < min.unitPrice ? q : min), itemQuotes[0])
      const bestLeadTime = itemQuotes.reduce((min, q) => (q.leadTime < min.leadTime ? q : min), itemQuotes[0])
      const bestOverall = itemQuotes.reduce((max, q) => (q.score > max.score ? q : max), itemQuotes[0])

      return {
        rfqItemId: rfqItem.id,
        itemName: stockItem?.name || rfqItem.description || "Unknown Item",
        quotes: itemQuotes,
        recommendation: {
          bestPrice: bestPrice?.supplierName || "",
          bestLeadTime: bestLeadTime?.supplierName || "",
          bestOverall: bestOverall?.supplierName || "",
          aiRecommendation: generateAIRecommendation(itemQuotes, analysisWeights),
        },
      }
    })
  }

  const calculateItemScore = (quoteItem: any, quote: Quote): number => {
    if (!quoteItem) return 0

    const supplier = mockSuppliers.find((s) => s.id === quote.supplierId)
    const priceScore = Math.max(0, 100 - quoteItem.unitPrice / 10) // Simplified scoring
    const leadTimeScore = Math.max(0, 100 - quoteItem.leadTime * 2)
    const qualityScore = (supplier?.rating || 3) * 20
    const reliabilityScore = quote.status === "Submitted" ? 80 : 60

    return (
      (priceScore * analysisWeights.price) / 100 +
      (leadTimeScore * analysisWeights.leadTime) / 100 +
      (qualityScore * analysisWeights.quality) / 100 +
      (reliabilityScore * analysisWeights.reliability) / 100
    )
  }

  const generateAIRecommendation = (itemQuotes: any[], weights: any): string => {
    if (itemQuotes.length === 0) return "No quotes available"

    const bestOverall = itemQuotes.reduce((max, q) => (q.score > max.score ? q : max), itemQuotes[0])
    const bestPrice = itemQuotes.reduce((min, q) => (q.unitPrice < min.unitPrice ? q : min), itemQuotes[0])

    if (bestOverall.supplierName === bestPrice.supplierName) {
      return `${bestOverall.supplierName} offers the best overall value with competitive pricing and good delivery times.`
    } else {
      return `${bestOverall.supplierName} provides the best overall value, while ${bestPrice.supplierName} has the lowest price. Consider project urgency and budget constraints.`
    }
  }

  const runAIAnalysis = () => {
    // Simulate AI analysis
    const analysis = `
Based on the submitted quotes and historical supplier performance data, here's my analysis:

**Overall Recommendation:** 
${rfqQuotes.length > 0 ? mockSuppliers.find((s) => s.id === rfqQuotes[0].supplierId)?.name : "No quotes"} provides the best balance of price, quality, and delivery time for this project.

**Key Insights:**
• Price variance across suppliers: ${Math.max(...rfqQuotes.map((q) => q.totalAmount)) - Math.min(...rfqQuotes.map((q) => q.totalAmount))} ZAR
• Lead time range: ${Math.min(...rfqQuotes.map((q) => q.leadTime))} - ${Math.max(...rfqQuotes.map((q) => q.leadTime))} days
• All suppliers meet minimum quality requirements

**Risk Assessment:**
• Low risk: Established suppliers with good track records
• Consider backup supplier for critical items
• Monitor lead times closely for project timeline compliance

**Cost Optimization:**
• Potential savings of R${(Math.max(...rfqQuotes.map((q) => q.totalAmount)) - Math.min(...rfqQuotes.map((q) => q.totalAmount))).toLocaleString()} by choosing optimal supplier mix
• Negotiate payment terms for additional discounts
    `

    setAIRecommendation(analysis)
    setIsAIAnalysisOpen(true)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
    return <Badge className="bg-red-100 text-red-800">Fair</Badge>
  }

  const quoteComparisons = generateQuoteComparison()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-500">Quote Analysis</h2>
          <p className="text-muted-foreground">Analyze and compare supplier quotes with AI-powered recommendations</p>
        </div>
        <Button onClick={runAIAnalysis} disabled={!selectedRFQ}>
          <Brain className="mr-2 h-4 w-4" />
          AI Analysis
        </Button>
      </div>

      {/* RFQ Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select RFQ for Analysis</CardTitle>
          <CardDescription>Choose an RFQ with submitted quotes to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRFQ} onValueChange={setSelectedRFQ}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select RFQ to analyze" />
            </SelectTrigger>
            <SelectContent>
              {rfqsWithQuotes.map((rfq) => {
                const project = mockProjects.find((p) => p.id === rfq.projectId)
                const quoteCount = quotes.filter((q) => q.rfqId === rfq.id).length
                return (
                  <SelectItem key={rfq.id} value={rfq.id}>
                    {rfq.id} - {project?.name} ({quoteCount} quotes)
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedRFQ && (
        <>
          {/* Analysis Weights */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Criteria Weights</CardTitle>
              <CardDescription>Adjust the importance of different factors in the analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Price ({analysisWeights.price}%)</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={analysisWeights.price}
                    onChange={(e) =>
                      setAnalysisWeights({
                        ...analysisWeights,
                        price: Number.parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lead Time ({analysisWeights.leadTime}%)</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={analysisWeights.leadTime}
                    onChange={(e) =>
                      setAnalysisWeights({
                        ...analysisWeights,
                        leadTime: Number.parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quality ({analysisWeights.quality}%)</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={analysisWeights.quality}
                    onChange={(e) =>
                      setAnalysisWeights({
                        ...analysisWeights,
                        quality: Number.parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reliability ({analysisWeights.reliability}%)</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={analysisWeights.reliability}
                    onChange={(e) =>
                      setAnalysisWeights({
                        ...analysisWeights,
                        reliability: Number.parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            {rfqQuotes.map((quote) => {
              const supplier = mockSuppliers.find((s) => s.id === quote.supplierId)
              const isLowest = quote.totalAmount === Math.min(...rfqQuotes.map((q) => q.totalAmount))
              const isFastest = quote.leadTime === Math.min(...rfqQuotes.map((q) => q.leadTime))

              return (
                <Card key={quote.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{supplier?.name}</CardTitle>
                        <CardDescription>{quote.id}</CardDescription>
                      </div>
                      <div className="flex flex-col gap-1">
                        {isLowest && (
                          <Badge className="bg-green-100 text-green-800">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Best Price
                          </Badge>
                        )}
                        {isFastest && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Fastest
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold">R{quote.totalAmount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Total Amount</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{quote.leadTime} days</div>
                        <div className="text-sm text-muted-foreground">Lead Time</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Overall Score</span>
                        {getScoreBadge(quote.score || 0)}
                      </div>
                      <Progress value={quote.score || 0} className="h-2" />
                      <div className={`text-sm font-medium ${getScoreColor(quote.score || 0)}`}>
                        {quote.score || 0}/100
                      </div>
                    </div>

                    <div className="text-sm">
                      <div className="font-medium mb-1">Payment Terms:</div>
                      <div className="text-muted-foreground">{quote.paymentTerms}</div>
                    </div>

                    {quote.notes && (
                      <div className="text-sm">
                        <div className="font-medium mb-1">Notes:</div>
                        <div className="text-muted-foreground">{quote.notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Detailed Item Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Item-by-Item Comparison
              </CardTitle>
              <CardDescription>Detailed analysis of each RFQ item across all quotes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {quoteComparisons.map((comparison) => (
                  <Card key={comparison.rfqItemId}>
                    <CardHeader>
                      <CardTitle className="text-lg">{comparison.itemName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Total Price</TableHead>
                            <TableHead>Lead Time</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Recommendation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparison.quotes.map((quote) => (
                            <TableRow key={quote.quoteId}>
                              <TableCell className="font-medium">{quote.supplierName}</TableCell>
                              <TableCell className="font-mono">R{quote.unitPrice.toFixed(2)}</TableCell>
                              <TableCell className="font-mono">R{quote.totalPrice.toLocaleString()}</TableCell>
                              <TableCell>{quote.leadTime} days</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={quote.score} className="h-2 w-16" />
                                  <span className={`text-sm font-medium ${getScoreColor(quote.score)}`}>
                                    {quote.score.toFixed(0)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {quote.supplierName === comparison.recommendation.bestPrice && (
                                    <Badge variant="outline" className="text-green-600">
                                      <TrendingDown className="h-3 w-3 mr-1" />
                                      Best Price
                                    </Badge>
                                  )}
                                  {quote.supplierName === comparison.recommendation.bestLeadTime && (
                                    <Badge variant="outline" className="text-blue-600">
                                      <Zap className="h-3 w-3 mr-1" />
                                      Fastest
                                    </Badge>
                                  )}
                                  {quote.supplierName === comparison.recommendation.bestOverall && (
                                    <Badge variant="outline" className="text-purple-600">
                                      <Award className="h-3 w-3 mr-1" />
                                      Best Overall
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {comparison.recommendation.aiRecommendation && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div className="text-sm text-blue-800">
                              <strong>AI Recommendation:</strong> {comparison.recommendation.aiRecommendation}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* AI Analysis Dialog */}
      <Dialog open={isAIAnalysisOpen} onOpenChange={setIsAIAnalysisOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Quote Analysis
            </DialogTitle>
            <DialogDescription>
              Comprehensive analysis using machine learning algorithms and historical data
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{aiRecommendation}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAIAnalysisOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
