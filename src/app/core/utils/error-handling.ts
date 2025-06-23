import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Standard error types for the application
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK = 'NETWORK',
  FIREBASE = 'FIREBASE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Standard error response structure
 */
export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: unknown;
  timestamp: Date;
}

/**
 * Create a standardized error
 */
export function createError(
  type: ErrorType,
  message: string,
  code?: string,
  details?: unknown,
): AppError {
  return {
    type,
    message,
    code,
    details,
    timestamp: new Date(),
  };
}

/**
 * Standard error handler for observables
 */
export function handleError<T>(
  operation: string,
  fallbackValue?: T,
): (error: any) => Observable<T> {
  return (error: any): Observable<T> => {
    // Log the error
    console.error(`${operation} failed:`, error);

    // Determine error type
    let errorType = ErrorType.UNKNOWN;
    let message = error.message || 'An unknown error occurred';
    const code = error.code;

    // Firebase specific errors
    if (error.code) {
      if (error.code.startsWith('permission-denied')) {
        errorType = ErrorType.PERMISSION_DENIED;
        message = 'You do not have permission to perform this action';
      } else if (error.code.startsWith('not-found')) {
        errorType = ErrorType.NOT_FOUND;
        message = 'The requested resource was not found';
      } else if (error.code.includes('network')) {
        errorType = ErrorType.NETWORK;
        message = 'Network error. Please check your connection';
      } else {
        errorType = ErrorType.FIREBASE;
      }
    }

    const appError = createError(errorType, message, code, error);

    // If we have a fallback value, return it
    if (fallbackValue !== undefined) {
      return of(fallbackValue);
    }

    // Otherwise, re-throw the error
    return throwError(() => appError);
  };
}

/**
 * RxJS operator for consistent error handling
 */
export function handleErrorOperator<T>(operation: string, fallbackValue?: T) {
  return catchError(handleError(operation, fallbackValue));
}

/**
 * Extract user-friendly message from error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    if (err.message) return err.message;
    if (err.error?.message) return err.error.message;
    if (err.statusText) return err.statusText;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if an error is a specific type
 */
export function isErrorType(error: unknown, type: ErrorType): boolean {
  return (error as AppError)?.type === type;
}
