import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StaffService } from './staff.service';
import { StaffMember, StaffFilter, StaffGroup, AvailabilityStatus } from '../models';

/**
 * Facade service that provides the public API for the Staff module.
 * This is the ONLY service that should be used by external modules.
 * All internal services remain private to the module.
 */
@Injectable({
  providedIn: 'root'
})
export class StaffFacadeService {
  constructor(private staffService: StaffService) {}

  // Public API methods - these are the "endpoints" for other modules
  
  /**
   * Get list of staff members with optional filtering
   */
  getStaffList(filter?: StaffFilter): Observable<StaffMember[]> {
    return this.staffService.getStaff(filter);
  }

  /**
   * Get a specific staff member by ID
   */
  getStaffById(id: string): Observable<StaffMember | undefined> {
    return this.staffService.getStaffById(id);
  }

  /**
   * Get available staff for task assignment
   */
  getAvailableStaff(requiredSkills?: string[]): Observable<StaffMember[]> {
    return this.staffService.getAvailableStaff(requiredSkills);
  }

  /**
   * Update staff availability status
   */
  updateAvailability(staffId: string, status: AvailabilityStatus): Observable<void> {
    return this.staffService.updateStaffAvailability(staffId, status);
  }

  /**
   * Get staff by group/role
   */
  getStaffByGroup(group: StaffGroup): Observable<StaffMember[]> {
    return this.staffService.getStaffByGroup(group);
  }

  // Note: Create, Update, Delete operations are NOT exposed here
  // They should only be available within the Staff module UI
}