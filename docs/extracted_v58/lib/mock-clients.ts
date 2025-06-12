export type Client = {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: string
  status: "Active" | "Inactive" | "Pending"
  projectsCount: number
  totalValue: number
  lastProjectDate: string
  clientType: "Enterprise" | "SMB" | "Residential"
  industry?: string
}

export const mockClients: Client[] = [
  {
    id: "CLI-001",
    name: "TechCorp Solutions",
    contactPerson: "Sarah Johnson",
    email: "sarah.johnson@techcorp.com",
    phone: "+27 11 123 4567",
    address: "123 Business Park, Sandton, Johannesburg",
    status: "Active",
    projectsCount: 5,
    totalValue: 2500000,
    lastProjectDate: "2024-01-15",
    clientType: "Enterprise",
    industry: "Technology",
  },
  {
    id: "CLI-002",
    name: "Green Valley Estate",
    contactPerson: "Michael Chen",
    email: "m.chen@greenvalley.co.za",
    phone: "+27 21 987 6543",
    address: "456 Valley Road, Cape Town",
    status: "Active",
    projectsCount: 2,
    totalValue: 1200000,
    lastProjectDate: "2024-02-20",
    clientType: "Residential",
    industry: "Real Estate",
  },
  {
    id: "CLI-003",
    name: "Metro Manufacturing",
    contactPerson: "Lisa Williams",
    email: "lisa.w@metromanuf.com",
    phone: "+27 31 555 7890",
    address: "789 Industrial Ave, Durban",
    status: "Active",
    projectsCount: 3,
    totalValue: 1800000,
    lastProjectDate: "2024-01-30",
    clientType: "Enterprise",
    industry: "Manufacturing",
  },
  {
    id: "CLI-004",
    name: "Sunrise Medical Center",
    contactPerson: "Dr. James Smith",
    email: "j.smith@sunrisemedical.co.za",
    phone: "+27 12 444 3333",
    address: "321 Health Street, Pretoria",
    status: "Pending",
    projectsCount: 1,
    totalValue: 800000,
    lastProjectDate: "2024-03-01",
    clientType: "SMB",
    industry: "Healthcare",
  },
  {
    id: "CLI-005",
    name: "Coastal Retail Group",
    contactPerson: "Emma Davis",
    email: "emma.davis@coastalretail.com",
    phone: "+27 41 222 1111",
    address: "654 Shopping Center, Port Elizabeth",
    status: "Active",
    projectsCount: 4,
    totalValue: 1500000,
    lastProjectDate: "2024-02-10",
    clientType: "SMB",
    industry: "Retail",
  },
  {
    id: "CLI-006",
    name: "University of Innovation",
    contactPerson: "Prof. Robert Taylor",
    email: "r.taylor@uoi.ac.za",
    phone: "+27 11 888 9999",
    address: "987 Campus Drive, Johannesburg",
    status: "Inactive",
    projectsCount: 2,
    totalValue: 950000,
    lastProjectDate: "2023-11-15",
    clientType: "Enterprise",
    industry: "Education",
  },
]
