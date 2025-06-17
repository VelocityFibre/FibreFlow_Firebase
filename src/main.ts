import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import * as Sentry from '@sentry/angular';

// Initialize Sentry
Sentry.init({
  dsn: environment.sentry.dsn,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
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
      const error = hint.originalException;
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

bootstrapApplication(AppComponent, appConfig)
  .then(() => console.log('FibreFlow: Application bootstrapped successfully'))
  .catch((err) => {
    console.error('FibreFlow: Bootstrap error:', err);
    // Display error in the browser
    document.body.innerHTML = `<div style="padding: 20px; color: red;">
      <h1>Application Error</h1>
      <p>Failed to start FibreFlow. Check browser console for details.</p>
      <pre>${err}</pre>
    </div>`;
  });
