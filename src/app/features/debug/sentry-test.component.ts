import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import * as Sentry from '@sentry/angular';

@Component({
  selector: 'app-sentry-test',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
    <mat-card class="sentry-test-card">
      <mat-card-header>
        <mat-card-title>Sentry Error Testing</mat-card-title>
        <mat-card-subtitle>Test error tracking integration</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="button-group">
          <button mat-raised-button color="warn" (click)="throwError()">
            Throw Unhandled Error
          </button>
          <button mat-raised-button color="warn" (click)="throwTypeError()">
            Throw Type Error
          </button>
          <button mat-raised-button color="warn" (click)="throwAsyncError()">
            Throw Async Error
          </button>
          <button mat-raised-button color="primary" (click)="captureMessage()">
            Send Test Message
          </button>
          <button mat-raised-button color="primary" (click)="captureCustomError()">
            Send Custom Error
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .sentry-test-card {
      margin: 20px;
      max-width: 600px;
    }
    .button-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  `]
})
export class SentryTestComponent {
  throwError(): void {
    throw new Error('Test error from Sentry test component');
  }

  throwTypeError(): void {
    // This will cause a type error
    const obj: any = null;
    obj.nonExistentMethod();
  }

  throwAsyncError(): void {
    setTimeout(() => {
      throw new Error('Async error from Sentry test component');
    }, 100);
  }

  captureMessage(): void {
    Sentry.captureMessage('Test message from FibreFlow', 'info');
    alert('Test message sent to Sentry');
  }

  captureCustomError(): void {
    const error = new Error('Custom error with context');
    Sentry.withScope((scope) => {
      scope.setTag('component', 'SentryTestComponent');
      scope.setContext('customData', {
        testType: 'manual',
        timestamp: new Date().toISOString(),
        user: 'test-user'
      });
      scope.setLevel('error');
      Sentry.captureException(error);
    });
    alert('Custom error sent to Sentry with context');
  }
}