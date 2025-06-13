import { Injectable, ErrorHandler, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

export interface AppError {
  message: string;
  code?: string;
  context?: string;
  timestamp: Date;
  url?: string;
  stack?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService implements ErrorHandler {
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private errors: AppError[] = [];

  handleError(error: Error): void {
    const appError: AppError = {
      message: this.getErrorMessage(error),
      code: this.getErrorCode(error),
      context: this.getErrorContext(),
      timestamp: new Date(),
      url: this.router.url,
      stack: error.stack,
    };

    // Log to console in development
    console.error('Application Error:', appError);

    // Store error for potential reporting
    this.errors.push(appError);
    if (this.errors.length > 100) {
      this.errors.shift(); // Keep only last 100 errors
    }

    // Show user-friendly notification
    this.showErrorNotification(appError);

    // TODO: Send to logging service (Firebase Crashlytics/Analytics)
  }

  private getErrorMessage(error: unknown): string {
    // Firebase errors
    if ((error as { code?: string })?.code) {
      switch ((error as { code: string }).code) {
        case 'permission-denied':
          return 'You do not have permission to perform this action';
        case 'not-found':
          return 'The requested resource was not found';
        case 'already-exists':
          return 'This item already exists';
        case 'failed-precondition':
          return 'Operation failed. Please try again';
        case 'unauthenticated':
          return 'Please log in to continue';
        case 'unavailable':
          return 'Service temporarily unavailable. Please try again later';
        default:
          return (error as { message?: string }).message || 'An unexpected error occurred';
      }
    }

    // HTTP errors
    if ((error as { status?: number })?.status) {
      switch ((error as { status: number }).status) {
        case 400:
          return 'Invalid request. Please check your input';
        case 401:
          return 'Please log in to continue';
        case 403:
          return 'You do not have permission to access this resource';
        case 404:
          return 'The requested resource was not found';
        case 500:
          return 'Server error. Please try again later';
        default:
          return (error as { message?: string }).message || 'An unexpected error occurred';
      }
    }

    return (error as { message?: string })?.message || 'An unexpected error occurred';
  }

  private getErrorCode(error: unknown): string | undefined {
    return (error as { code?: string })?.code || (error as { status?: number })?.status?.toString();
  }

  private getErrorContext(): string {
    // You can expand this to include more context
    return window.location.pathname;
  }

  private showErrorNotification(error: AppError): void {
    this.snackBar.open(error.message, 'Dismiss', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar'],
    });
  }

  // Method to manually log errors from services
  logError(message: string, error?: unknown): void {
    console.error(message, error);
    this.handleError(new Error(message));
  }

  // Get recent errors for debugging
  getRecentErrors(): AppError[] {
    return [...this.errors];
  }

  // Clear error history
  clearErrors(): void {
    this.errors = [];
  }
}
