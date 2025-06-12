"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" // If needed for budget notes
import { mockProjectDetails } from "@/lib/mock-project-details"
import type { Project } from "@/lib/types"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function EditBudgetPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [projectData, setProjectData] = useState<Partial<Project> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const project = mockProjectDetails.find((p) => p.id === projectId)
    if (project) {
      setProjectData({
        budget: project.budget,
        // You might want to add more detailed budget fields here
        // e.g., budgetBreakdown: project.budgetBreakdown || []
        budgetNotes: project.budgetNotes || "",
      })
    }
    setIsLoading(false)
  }, [projectId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const val = name === "budget" ? Number.parseFloat(value) || 0 : value
    setProjectData((prev) => (prev ? { ...prev, [name]: val } : null))
  }

  const handleSave = () => {
    console.log("Saving budget info:", projectData)
    router.push(`/projects/${projectId}`)
  }

  if (isLoading) return <div>Loading project budget...</div>
  if (!projectData) return <div>Project not found.</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Edit Project Budget</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Allocation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="budget">Total Allocated Budget ($)</Label>
            <Input
              id="budget"
              name="budget"
              type="number"
              value={projectData.budget || 0}
              onChange={handleChange}
              min="0"
              step="100"
            />
          </div>
          {/* Placeholder for more detailed budget breakdown */}
          {/* 
          <div className="grid gap-2">
            <Label>Budget Breakdown (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Future: Add line items for labor, materials, equipment, etc.
            </p>
          </div> 
          */}
          <div className="grid gap-2">
            <Label htmlFor="budgetNotes">Budget Notes</Label>
            <Textarea
              id="budgetNotes"
              name="budgetNotes"
              placeholder="Any specific notes about the budget..."
              value={projectData.budgetNotes || ""}
              onChange={handleChange}
              rows={4}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
