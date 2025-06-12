"use client"

import { useParams } from "next/navigation"
import { BOQManagement } from "@/components/boq-management"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { mockProjects } from "@/lib/mock-data"

export default function ProjectBOQPage() {
  const params = useParams()
  const projectId = params.id as string
  const project = mockProjects.find((p) => p.id === projectId)

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => window.history.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BOQ Management - {project?.name || "Project"}</h1>
          <p className="text-sm text-muted-foreground">Bill of Quantities for {project?.location || "this project"}</p>
        </div>
      </div>

      <BOQManagement projectFilter={projectId} />
    </div>
  )
}
