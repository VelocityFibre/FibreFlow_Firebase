import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
  CollectionReference,
  Timestamp,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  component?: string;
  url?: string;
  userAgent?: string;
  timestamp?: Date | Timestamp;
  data?: Record<string, unknown>;
  stack?: string;
  sessionId: string;
  // User information
  userId?: string;
  userEmail?: string;
  userDisplayName?: string;
  userRole?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RemoteLoggerService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private sessionId = this.generateSessionId();
  private logsCollection?: CollectionReference;

  constructor() {
    // Initialize without immediate Firebase logging to avoid dependency injection issues
    setTimeout(() => {
      this.log('info', 'RemoteLoggerService initialized', 'RemoteLoggerService');
    }, 100);
  }

  private getLogsCollection(): CollectionReference {
    if (!this.logsCollection) {
      this.logsCollection = collection(this.firestore, 'debug-logs');
    }
    return this.logsCollection;
  }

  async log(
    level: LogEntry['level'],
    message: string,
    component?: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Get current user information
      const currentUser = this.authService.currentUser();
      const currentUserProfile = this.authService.currentUserProfile();
      
      const logEntry: LogEntry = {
        level,
        message,
        component,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp() as any,
        sessionId: this.sessionId,
      };

      // Add user information if available
      if (currentUser) {
        logEntry.userId = currentUser.uid;
        logEntry.userEmail = currentUser.email;
        logEntry.userDisplayName = currentUser.displayName;
      }
      
      if (currentUserProfile) {
        logEntry.userRole = currentUserProfile.userGroup;
      }

      // Only add data field if it exists
      if (data && Object.keys(data).length > 0) {
        logEntry.data = data;
      }

      // Also log to console for immediate debugging
      const consoleMessage = `🟦 [${component || 'App'}] ${message}`;
      switch (level) {
        case 'error':
          console.error(consoleMessage, data);
          break;
        case 'warn':
          console.warn(consoleMessage, data);
          break;
        case 'debug':
          console.debug(consoleMessage, data);
          break;
        default:
          console.log(consoleMessage, data);
      }

      // Store in Firebase
      await addDoc(this.getLogsCollection(), logEntry);
    } catch (error) {
      // Fallback to console if Firebase fails
      console.error('Failed to log to Firebase:', error);
      console.log(`Fallback log [${level}] ${component}: ${message}`, data);
    }
  }

  async logError(error: Error, component?: string, context?: string): Promise<void> {
    try {
      // Get current user information
      const currentUser = this.authService.currentUser();
      const currentUserProfile = this.authService.currentUserProfile();
      
      const logEntry: LogEntry = {
        level: 'error',
        message: `${context ? context + ': ' : ''}${error.message}`,
        component,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp() as any,
        stack: error.stack,
        data: {
          name: error.name,
          context,
          isNG0200:
            error.message?.includes('NG0200') ||
            error.message?.includes('ExpressionChangedAfterItHasBeenCheckedError'),
        },
        sessionId: this.sessionId,
      };

      // Add user information if available
      if (currentUser) {
        logEntry.userId = currentUser.uid;
        logEntry.userEmail = currentUser.email;
        logEntry.userDisplayName = currentUser.displayName;
      }
      
      if (currentUserProfile) {
        logEntry.userRole = currentUserProfile.userGroup;
      }

      // Enhanced console logging for errors
      console.error(`🔴 [${component || 'App'}] ERROR: ${logEntry.message}`, {
        error,
        context,
        stack: error.stack,
      });

      // Store in Firebase
      await addDoc(this.getLogsCollection(), logEntry);
    } catch (fbError) {
      console.error('Failed to log error to Firebase:', fbError);
      console.error('Original error:', error);
    }
  }

  // Convenience methods
  info(message: string, component?: string, data?: Record<string, unknown>): Promise<void> {
    return this.log('info', message, component, data);
  }

  warn(message: string, component?: string, data?: Record<string, unknown>): Promise<void> {
    return this.log('warn', message, component, data);
  }

  error(message: string, component?: string, data?: Record<string, unknown>): Promise<void> {
    return this.log('error', message, component, data);
  }

  debug(message: string, component?: string, data?: Record<string, unknown>): Promise<void> {
    return this.log('debug', message, component, data);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
