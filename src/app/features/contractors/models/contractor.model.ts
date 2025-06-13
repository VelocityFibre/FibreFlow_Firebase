import { Timestamp } from '@angular/fire/firestore';

export interface Contractor {
  id?: string;
  
  // Basic Information
  companyName: string;
  registrationNumber: string;
  vatNumber?: string;
  
  // Contact Details
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  
  // Address
  physicalAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  
  // Capabilities
  capabilities: {
    services: ContractorService[];
    maxTeams: number;
    equipment: string[];
    certifications: Certification[];
  };
  
  // Compliance
  compliance: {
    insurancePolicy?: string;
    insuranceExpiry?: Timestamp;
    insuranceDocUrl?: string;
    safetyRating?: number;
    bbbeeLevel?: number;
    bbbeeDocUrl?: string;
  };
  
  // Financial
  financial: {
    bankName: string;
    accountNumber: string;
    branchCode: string;
    accountType: 'current' | 'savings';
    paymentTerms: number; // days
    creditLimit?: number;
  };
  
  // Status
  status: ContractorStatus;
  onboardingStatus: OnboardingStatus;
  suspensionReason?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Timestamp;
}

export type ContractorService = 
  | 'trenching' 
  | 'pole_planting' 
  | 'fiber_stringing' 
  | 'splicing' 
  | 'home_connections';

export type ContractorStatus = 
  | 'pending_approval' 
  | 'active' 
  | 'suspended' 
  | 'blacklisted';

export type OnboardingStatus = 
  | 'documents_pending' 
  | 'under_review' 
  | 'approved' 
  | 'rejected';

export interface Certification {
  name: string;
  issuer: string;
  validUntil: Timestamp;
  documentUrl?: string;
}

export interface ContractorTeam {
  id?: string;
  teamCode: string;
  teamName: string;
  
  // Team Composition
  teamLead: {
    name: string;
    phone: string;
    email?: string;
    employeeId?: string;
  };
  
  members: TeamMember[];
  
  // Capabilities
  primarySkill: ContractorService;
  secondarySkills: string[];
  
  // Availability
  currentProjectId?: string;
  availableFrom?: Timestamp;
  
  // Performance
  performanceScore: number;
  completedProjects: number;
  
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeamMember {
  name: string;
  role: 'technician' | 'helper' | 'driver' | 'supervisor';
  skills: string[];
}

// Form helpers
export const CONTRACTOR_SERVICES: { value: ContractorService; label: string }[] = [
  { value: 'trenching', label: 'Trenching' },
  { value: 'pole_planting', label: 'Pole Planting' },
  { value: 'fiber_stringing', label: 'Fiber Stringing' },
  { value: 'splicing', label: 'Splicing' },
  { value: 'home_connections', label: 'Home Connections' }
];

export const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape'
];

export const BANKS = [
  'ABSA',
  'Capitec Bank',
  'FNB',
  'Investec',
  'Nedbank',
  'Standard Bank'
];