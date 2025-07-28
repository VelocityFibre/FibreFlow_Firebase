import { Timestamp } from '@angular/fire/firestore';

export type StaffGroup =
  | 'Management'
  | 'Regional Project Manager'
  | 'Project Manager'
  | 'Site Supervisor'
  | 'Senior Technician'
  | 'Assistant Technician'
  | 'Planner';

export type AvailabilityStatus = 'available' | 'busy' | 'offline' | 'vacation';

export interface WorkingHours {
  [day: string]: {
    start: string;
    end: string;
    isWorkingDay: boolean;
  } | null;
}

export interface VacationPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  approvedBy?: string;
  approvedAt?: Timestamp;
}

export interface StaffAvailability {
  status: AvailabilityStatus;
  workingHours: WorkingHours;
  vacationDates?: VacationPeriod[];
  currentTaskCount: number;
  maxConcurrentTasks: number;
  nextAvailableSlot?: Timestamp;
}

export interface StaffActivity {
  lastLogin: Timestamp | null;
  lastActive: Timestamp | null;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFlagged: number;
  totalProjectsWorked: number;
  averageTaskCompletionTime: number; // in hours
  performanceRating?: number; // 1-5 scale
}

export interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;

  primaryGroup: StaffGroup;
  additionalPermissions?: string[];

  availability: StaffAvailability;
  activity: StaffActivity;

  skills?: string[];
  certifications?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy?: string;
}

export interface StaffFilter {
  groups?: StaffGroup[];
  availabilityStatus?: AvailabilityStatus[];
  isActive?: boolean;
  searchTerm?: string;
  skills?: string[];
}

export interface StaffSortOptions {
  field: 'name' | 'email' | 'group' | 'status' | 'lastActive' | 'tasksCompleted';
  direction: 'asc' | 'desc';
}
