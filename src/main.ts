import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

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
