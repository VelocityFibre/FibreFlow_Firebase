import { Injectable, inject, ErrorHandler } from '@angular/core';
import { NotificationService } from './notification.service';

export interface AppError {
  message: string;
  code?: string;
  context?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorHandler implements ErrorHandler {
  private notificationService = inject(NotificationService);

  handleError(error: any): void {
    const appError = this.parseError(error);

    // Log to console for development
    console.error('Global Error:', appError, error);

    // Log to Sentry in production
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          error: {
            message: appError.message,
            code: appError.code,
            context: appError.context,
            severity: appError.severity,
          },
        },
      });
    }

    // Show user-friendly notification
    this.showUserNotification(appError);
  }

  private parseError(error: any): AppError {
    // Angular HTTP errors
    if (error?.status) {
      return {
        message: this.getHttpErrorMessage(error.status),
        code: `HTTP_${error.status}`,
        context: error.url || 'Unknown endpoint',
        severity: error.status >= 500 ? 'critical' : 'medium',
      };
    }

    // Firebase errors
    if (error?.code?.startsWith('auth/') || error?.code?.startsWith('firestore/')) {
      return {
        message: this.getFirebaseErrorMessage(error.code),
        code: error.code,
        context: 'Firebase',
        severity: 'medium',
      };
    }

    // JavaScript runtime errors
    if (error instanceof Error) {
      return {
        message: 'An unexpected error occurred',
        code: 'RUNTIME_ERROR',
        context: error.name,
        severity: 'high',
      };
    }

    // Unknown errors
    return {
      message: 'Something went wrong',
      code: 'UNKNOWN_ERROR',
      context: 'Application',
      severity: 'medium',
    };
  }

  private getHttpErrorMessage(status: number): string {
    switch (status) {
      case 0:
        return 'No internet connection. Please check your network.';
      case 400:
        return 'Invalid request. Please try again.';
      case 401:
        return 'Authentication required. Please sign in.';
      case 403:
        return "Access denied. You don't have permission.";
      case 404:
        return 'Resource not found.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable.';
      default:
        return `Request failed with status ${status}`;
    }
  }

  private getFirebaseErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'firestore/permission-denied':
        return 'Access denied. Please check your permissions.';
      case 'firestore/unavailable':
        return 'Database temporarily unavailable.';
      default:
        return 'Service error. Please try again.';
    }
  }

  private showUserNotification(error: AppError): void {
    // Only show notifications for medium and high severity errors
    if (error.severity === 'low') return;

    const duration = error.severity === 'critical' ? 8000 : 5000;

    try {
      this.notificationService.showError(error.message, duration);
    } catch (notificationError) {
      // Fallback if notification service fails
      console.error('Failed to show error notification:', notificationError);
    }
  }

  // Public method for manual error reporting
  reportError(message: string, context?: string, severity: AppError['severity'] = 'medium'): void {
    const error: AppError = {
      message,
      code: 'MANUAL_REPORT',
      context,
      severity,
    };

    this.handleError(error);
  }
}
