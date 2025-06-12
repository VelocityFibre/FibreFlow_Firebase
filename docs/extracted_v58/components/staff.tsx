"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { mockStaff } from "@/lib/mock-staff"
import {
  Search,
  Plus,
  UserCog,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"

interface StaffProps {
  setActiveModule: (module: string) => void
}

export function Staff({ setActiveModule }: StaffProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all")
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false)

  // Filter staff based on search query and filters
  const filteredStaff = mockStaff.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.department.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === "all" || staff.role === roleFilter
    const matchesAvailability = availabilityFilter === "all" || staff.availability === availabilityFilter

    return matchesSearch && matchesRole && matchesAvailability
  })

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "Available":
        return "bg-green-500 hover:bg-green-600"
      case "Busy":
        return "bg-orange-500 hover:bg-orange-600"
      case "On Leave":
        return "bg-red-500 hover:bg-red-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const getAvailabilityIcon = (availability: string) => {
    switch (availability) {
      case "Available":
        return <CheckCircle2 className="h-4 w-4 mr-1" />
      case "Busy":
        return <Clock className="h-4 w-4 mr-1" />
      case "On Leave":
        return <AlertCircle className="h-4 w-4 mr-1" />
      default:
        return null
    }
  }

  const handleStaffCardClick = (staffId: string) => {
    // Navigate to staff detail page
    window.location.href = `/staff/${staffId}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Staff</h2>
          <p className="text-muted-foreground">Manage your team members and their assignments</p>
        </div>
        <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Enter the details of the new staff member. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Project Manager">Project Manager</SelectItem>
                      <SelectItem value="Technician">Technician</SelectItem>
                      <SelectItem value="Engineer">Engineer</SelectItem>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                      <SelectItem value="Field Worker">Field Worker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john.doe@velocityfibre.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+44 7700 900123" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" placeholder="Project Management" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="London, UK" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="skills">Skills (comma separated)</Label>
                <Input id="skills" placeholder="Project Planning, Team Leadership, Budget Management" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" placeholder="Brief description of experience and expertise" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddStaffDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddStaffDialogOpen(false)}>Save Staff</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff by name, email, or department..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Project Manager">Project Manager</SelectItem>
            <SelectItem value="Technician">Technician</SelectItem>
            <SelectItem value="Engineer">Engineer</SelectItem>
            <SelectItem value="Administrator">Administrator</SelectItem>
            <SelectItem value="Field Worker">Field Worker</SelectItem>
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Availability</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Busy">Busy</SelectItem>
            <SelectItem value="On Leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Staff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((staff) => (
          <Card
            key={staff.id}
            className="cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => handleStaffCardClick(staff.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={staff.avatar || "/placeholder.svg"} alt={staff.name} />
                    <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{staff.name}</CardTitle>
                    <CardDescription className="flex items-center">
                      <UserCog className="h-3.5 w-3.5 mr-1" />
                      {staff.role}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={`${getAvailabilityColor(staff.availability)} text-white`}>
                  {getAvailabilityIcon(staff.availability)}
                  {staff.availability}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <Briefcase className="h-4 w-4 mr-2" />
                  {staff.department}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2" />
                  {staff.email}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2" />
                  {staff.phone}
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  {staff.location}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{staff.assignedTasks.length}</span> Active Tasks
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{staff.activeProjects.length}</span> Projects
              </div>
              <div className="text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 inline mr-1" />
                Since {new Date(staff.startDate).getFullYear()}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No staff members found matching your filters.</p>
        </div>
      )}
    </div>
  )
}
