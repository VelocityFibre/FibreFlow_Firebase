import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PoleTrackerService } from '../../features/pole-tracker/services/pole-tracker.service';

/**
 * Data Integrity Validators (SPEC-DATA-001)
 *
 * Async validators for enforcing pole-drop relationship rules:
 * - Pole numbers must be globally unique
 * - Drop numbers must be globally unique
 * - Poles cannot exceed 12 drops capacity
 * - Drops must reference existing poles
 */

export class DataIntegrityValidator {
  /**
   * Validates pole number uniqueness across all pole collections
   * @param poleService - PoleTrackerService instance
   * @param excludeId - Optional ID to exclude from validation (for updates)
   * @returns AsyncValidatorFn
   */
  static uniquePoleNumber(poleService: PoleTrackerService, excludeId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null); // Don't validate empty values
      }

      const poleNumber = control.value.toString().trim();

      if (poleNumber.length < 3 || poleNumber.length > 20) {
        return of({
          poleNumberFormat: {
            message: 'Pole number must be between 3 and 20 characters',
          },
        });
      }

      return new Observable((observer) => {
        poleService
          .validatePoleNumberUniqueness(poleNumber, excludeId)
          .then((isUnique) => {
            if (isUnique) {
              observer.next(null);
            } else {
              observer.next({
                poleNumberExists: {
                  message: `Pole number ${poleNumber} already exists`,
                },
              });
            }
            observer.complete();
          })
          .catch((error) => {
            console.error('Error validating pole number:', error);
            observer.next({
              validationError: {
                message: 'Error validating pole number',
              },
            });
            observer.complete();
          });
      });
    };
  }

  /**
   * Validates drop number uniqueness across all drop collections
   * @param poleService - PoleTrackerService instance
   * @param excludeId - Optional ID to exclude from validation (for updates)
   * @returns AsyncValidatorFn
   */
  static uniqueDropNumber(poleService: PoleTrackerService, excludeId?: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null); // Don't validate empty values
      }

      const dropNumber = control.value.toString().trim();

      if (dropNumber.length < 3 || dropNumber.length > 20) {
        return of({
          dropNumberFormat: {
            message: 'Drop number must be between 3 and 20 characters',
          },
        });
      }

      return new Observable((observer) => {
        poleService
          .validateDropNumberUniqueness(dropNumber, excludeId)
          .then((isUnique) => {
            if (isUnique) {
              observer.next(null);
            } else {
              observer.next({
                dropNumberExists: {
                  message: `Drop number ${dropNumber} already exists`,
                },
              });
            }
            observer.complete();
          })
          .catch((error) => {
            console.error('Error validating drop number:', error);
            observer.next({
              validationError: {
                message: 'Error validating drop number',
              },
            });
            observer.complete();
          });
      });
    };
  }

  /**
   * Validates that a pole exists for drop assignment
   * @param poleService - PoleTrackerService instance
   * @returns AsyncValidatorFn
   */
  static poleExists(poleService: PoleTrackerService): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null); // Don't validate empty values
      }

      const poleNumber = control.value.toString().trim();

      return new Observable((observer) => {
        poleService
          .validatePoleExists(poleNumber)
          .then((exists) => {
            if (exists) {
              observer.next(null);
            } else {
              observer.next({
                poleNotFound: {
                  message: `Pole ${poleNumber} does not exist`,
                },
              });
            }
            observer.complete();
          })
          .catch((error) => {
            console.error('Error validating pole existence:', error);
            observer.next({
              validationError: {
                message: 'Error validating pole existence',
              },
            });
            observer.complete();
          });
      });
    };
  }

  /**
   * Validates that a pole has capacity for additional drops
   * @param poleService - PoleTrackerService instance
   * @returns AsyncValidatorFn
   */
  static poleHasCapacity(poleService: PoleTrackerService): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null); // Don't validate empty values
      }

      const poleNumber = control.value.toString().trim();

      return new Observable((observer) => {
        poleService
          .checkPoleCapacity(poleNumber)
          .then((capacity) => {
            if (capacity.canAddMore) {
              observer.next(null);
            } else {
              observer.next({
                poleCapacityExceeded: {
                  message: `Pole ${poleNumber} already has maximum 12 drops`,
                  currentCount: capacity.count,
                },
              });
            }
            observer.complete();
          })
          .catch((error) => {
            console.error('Error checking pole capacity:', error);
            observer.next({
              validationError: {
                message: 'Error checking pole capacity',
              },
            });
            observer.complete();
          });
      });
    };
  }

  /**
   * Combined validator for pole-drop relationship
   * Validates that pole exists AND has capacity
   * @param poleService - PoleTrackerService instance
   * @returns AsyncValidatorFn
   */
  static validPoleForDrop(poleService: PoleTrackerService): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null); // Don't validate empty values
      }

      const poleNumber = control.value.toString().trim();

      return new Observable((observer) => {
        // First check if pole exists
        poleService
          .validatePoleExists(poleNumber)
          .then((exists) => {
            if (!exists) {
              observer.next({
                poleNotFound: {
                  message: `Pole ${poleNumber} does not exist`,
                },
              });
              observer.complete();
              return;
            }

            // Then check capacity
            return poleService.checkPoleCapacity(poleNumber);
          })
          .then((capacity) => {
            if (capacity && capacity.canAddMore) {
              observer.next(null);
            } else if (capacity) {
              observer.next({
                poleCapacityExceeded: {
                  message: `Pole ${poleNumber} already has maximum 12 drops`,
                  currentCount: capacity.count,
                },
              });
            }
            observer.complete();
          })
          .catch((error) => {
            console.error('Error validating pole for drop:', error);
            observer.next({
              validationError: {
                message: 'Error validating pole for drop assignment',
              },
            });
            observer.complete();
          });
      });
    };
  }

  /**
   * Get user-friendly error message from validation errors
   * @param errors - ValidationErrors object
   * @returns string - User-friendly error message
   */
  static getErrorMessage(errors: ValidationErrors): string {
    if (errors['poleNumberExists']) {
      return errors['poleNumberExists'].message;
    }
    if (errors['dropNumberExists']) {
      return errors['dropNumberExists'].message;
    }
    if (errors['poleNotFound']) {
      return errors['poleNotFound'].message;
    }
    if (errors['poleCapacityExceeded']) {
      return errors['poleCapacityExceeded'].message;
    }
    if (errors['poleNumberFormat']) {
      return errors['poleNumberFormat'].message;
    }
    if (errors['dropNumberFormat']) {
      return errors['dropNumberFormat'].message;
    }
    if (errors['validationError']) {
      return errors['validationError'].message;
    }
    return 'Validation error occurred';
  }

  /**
   * Check if field has data integrity validation errors
   * @param control - Form control to check
   * @returns boolean - True if has data integrity errors
   */
  static hasDataIntegrityErrors(control: AbstractControl): boolean {
    if (!control.errors) return false;

    const dataIntegrityErrors = [
      'poleNumberExists',
      'dropNumberExists',
      'poleNotFound',
      'poleCapacityExceeded',
      'poleNumberFormat',
      'dropNumberFormat',
    ];

    return dataIntegrityErrors.some((errorKey) => control.errors![errorKey]);
  }
}
