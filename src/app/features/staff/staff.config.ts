import { InjectionToken } from '@angular/core';

export interface StaffModuleConfig {
  enableOfflineMode?: boolean;
  maxConcurrentTasks?: number;
  defaultAvailabilityStatus?: string;
  enableActivityTracking?: boolean;
}

export const STAFF_MODULE_CONFIG = new InjectionToken<StaffModuleConfig>('StaffModuleConfig');

export const defaultStaffConfig: StaffModuleConfig = {
  enableOfflineMode: false,
  maxConcurrentTasks: 5,
  defaultAvailabilityStatus: 'available',
  enableActivityTracking: true
};