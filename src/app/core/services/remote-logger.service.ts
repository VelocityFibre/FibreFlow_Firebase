import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
  CollectionReference,
} from '@angular/fire/firestore';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  component?: string;
  url?: string;
  userAgent?: string;
  timestamp?: any;
  data?: any;
  stack?: string;
  sessionId: string;
}

@Injectable({
  providedIn: 'root',
})
export class RemoteLoggerService {
  private firestore = inject(Firestore);
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
    data?: any,
  ): Promise<void> {
    try {
      const logEntry: LogEntry = {
        level,
        message,
        component,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp(),
        data: data ? JSON.stringify(data) : undefined,
        sessionId: this.sessionId,
      };

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
      const logEntry: LogEntry = {
        level: 'error',
        message: `${context ? context + ': ' : ''}${error.message}`,
        component,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp(),
        stack: error.stack,
        data: JSON.stringify({
          name: error.name,
          context,
          isNG0200:
            error.message?.includes('NG0200') ||
            error.message?.includes('ExpressionChangedAfterItHasBeenCheckedError'),
        }),
        sessionId: this.sessionId,
      };

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
  info(message: string, component?: string, data?: any): Promise<void> {
    return this.log('info', message, component, data);
  }

  warn(message: string, component?: string, data?: any): Promise<void> {
    return this.log('warn', message, component, data);
  }

  error(message: string, component?: string, data?: any): Promise<void> {
    return this.log('error', message, component, data);
  }

  debug(message: string, component?: string, data?: any): Promise<void> {
    return this.log('debug', message, component, data);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}
