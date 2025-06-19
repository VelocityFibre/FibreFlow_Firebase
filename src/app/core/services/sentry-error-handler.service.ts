import { Injectable, ErrorHandler, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';

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
export class SentryErrorHandlerService implements ErrorHandler {
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private errors: AppError[] = [];

  constructor() {
    // Remove RemoteLoggerService injection to prevent circular dependency
    // This service should only use Sentry for error tracking
  }

  handleError(error: Error): void {
    const appError: AppError = {
      message: this.getErrorMessage(error),
      code: this.getErrorCode(error),
      context: this.getErrorContext(),
      timestamp: new Date(),
      url: this.router.url,
      stack: error.stack,
    };

    // Add context to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('errorCode', appError.code || 'unknown');
      scope.setContext('errorDetails', {
        url: appError.url,
        context: appError.context,
        timestamp: appError.timestamp.toISOString(),
      });

      // Send to Sentry
      Sentry.captureException(error);
    });

    // Remote logger removed to prevent circular dependency
    // All error tracking is handled by Sentry

    // Special handling for NG0200 errors (ExpressionChangedAfterItHasBeenCheckedError)
    if (
      error.message?.includes('NG0200') ||
      error.message?.includes('ExpressionChangedAfterItHasBeenCheckedError')
    ) {
      console.error('🔴 NG0200 ERROR DETECTED - Expression Changed After Check:');
      console.error('Full error message:', error.message);
      console.error('Error name:', error.name);
      console.error('Current URL:', this.router.url);
      console.error('Stack trace:', error.stack);
      console.error('Error object:', error);
      console.error(
        'Angular zone state:',
        typeof (window as unknown as { Zone?: { current?: { name?: string } } }).Zone !==
          'undefined'
          ? (window as unknown as { Zone: { current: { name: string } } }).Zone.current.name
          : 'Zone not available',
      );

      // Try to extract more information from the error
      const errorString = error.toString();
      const stackLines = error.stack?.split('\n') || [];
      console.error('Error toString():', errorString);
      console.error('Stack trace lines:', stackLines);

      // Log component information if available
      if ((error as unknown as { ngDebugContext?: unknown }).ngDebugContext) {
        console.error(
          'Angular debug context:',
          (error as unknown as { ngDebugContext: unknown }).ngDebugContext,
        );
      }

      // Log the specific expression that changed
      const match = error.message?.match(/Previous value: '(.*)'\. Current value: '(.*)'/);
      if (match) {
        console.error('Expression that changed:');
        console.error('  Previous value:', match[1]);
        console.error('  Current value:', match[2]);
      }

      // Parse stack trace to find the component
      const componentMatch = error.stack?.match(/at\s+(\w+Component)/);
      const _componentName = componentMatch ? componentMatch[1] : 'Unknown Component';

      // Detailed error logging handled by Sentry with proper context

      // Add NG0200 specific context to Sentry
      Sentry.withScope((scope) => {
        scope.setTag('errorType', 'NG0200');
        scope.setContext('ng0200Details', {
          fullMessage: error.message,
          errorName: error.name,
          url: this.router.url,
          zoneState:
            typeof (window as unknown as { Zone?: { current?: { name?: string } } }).Zone !==
            'undefined'
              ? (window as unknown as { Zone: { current: { name: string } } }).Zone.current.name
              : 'Zone not available',
        });
        Sentry.captureException(error);
      });

      // NG0200 error tracking handled by Sentry above
    }

    // Log to console in development
    console.error('Application Error:', appError);
    console.error('Raw error object:', error);
    console.error('Error stack:', error.stack);

    // Store error for potential reporting
    this.errors.push(appError);
    if (this.errors.length > 100) {
      this.errors.shift(); // Keep only last 100 errors
    }

    // Show user-friendly notification
    this.showErrorNotification(appError);
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
    const errorObj = error instanceof Error ? error : new Error(message);

    // Add context for manually logged errors
    Sentry.withScope((scope) => {
      scope.setTag('errorSource', 'manual');
      scope.setContext('manualError', {
        originalMessage: message,
        hasError: !!error,
      });
      Sentry.captureException(errorObj);
    });

    this.handleError(errorObj);
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
