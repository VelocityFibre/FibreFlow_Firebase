import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';
import * as Sentry from '@sentry/angular';

// Enable production mode to avoid dev-mode change detection issues
if (environment.production) {
  enableProdMode();
}

// Initialize Sentry
Sentry.init({
  dsn: environment.sentry.dsn,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  // Performance Monitoring
  tracesSampleRate: environment.production ? 0.1 : 1.0, // 10% in production, 100% in development
  // Session Replay
  replaysSessionSampleRate: environment.production ? 0.1 : 0.5, // Lower rate in production
  replaysOnErrorSampleRate: 1.0, // Always capture replay on errors
  // Release tracking
  environment: environment.sentry.environment,
  beforeSend(event, hint) {
    // Filter out certain errors if needed
    if (event.exception && environment.production) {
      const _error = hint.originalException;
      // You can filter errors here
    }
    return event;
  },
});

console.log('FibreFlow: Starting application bootstrap...');

// Add error handler for unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('FibreFlow: Unhandled promise rejection:', event.reason);
});

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('FibreFlow: Global error:', event.error);
});

// Only bootstrap if we're in the browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bootstrapApplication(AppComponent, appConfig)
    .then(() => {
      console.log('FibreFlow: Application bootstrapped successfully');
      // Log Angular version and environment
      console.log('FibreFlow: Angular environment:', {
        production: environment.production,
        angularVersion: (window as any).ng?.VERSION?.full || 'Unknown',
        hydrationEnabled: false,
        platform: 'browser'
      });
    })
    .catch((err) => {
      console.error('FibreFlow: Bootstrap error:', err);
      console.error('FibreFlow: Full error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code
      });
      // Display error in the browser
      document.body.innerHTML = `<div style="padding: 20px; color: red;">
        <h1>Application Error</h1>
        <p>Failed to start FibreFlow. Check browser console for details.</p>
        <pre>${err}</pre>
      </div>`;
    });
} else {
  console.error('FibreFlow: Not in browser environment, skipping bootstrap');
}
