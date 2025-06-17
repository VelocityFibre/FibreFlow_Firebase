/**
 * Public API Surface of the Staff Module
 * Only these exports should be used by external modules
 */

// Facade service - the main entry point
export { StaffFacadeService } from './services/staff-facade.service';

// Public models/interfaces that other modules need
export type { StaffMember, StaffGroup, AvailabilityStatus } from './models/staff.model';

// Note: We do NOT export:
// - Internal services (StaffService, etc.)
// - Internal components
// - Internal guards
// These remain private to the module
