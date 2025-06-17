# Error Tracking and Monitoring Guide

## Overview

FibreFlow uses **Sentry** for comprehensive error tracking, performance monitoring, and debugging in production. This provides real-time insights into application health and user experience issues.

## Features

### 🚨 Error Tracking
- **Automatic Error Capture**: All unhandled errors are automatically captured
- **Source Maps**: Full stack traces with original TypeScript code
- **Error Grouping**: Similar errors are automatically grouped
- **Custom Context**: User info, browser details, and app state included
- **Real-time Alerts**: Immediate notification of critical errors

### 🎥 Session Replay
- **100% on Errors**: Full session replay when errors occur
- **User Journey**: See exact user actions leading to errors
- **Network Activity**: View API calls and responses
- **Console Logs**: Access browser console output

### 📊 Performance Monitoring
- **Transaction Tracking**: Monitor page loads and API calls
- **Web Vitals**: Track Core Web Vitals (LCP, FID, CLS)
- **Sampling Rates**: 100% in dev, 10% in production
- **Slow Query Detection**: Identify performance bottlenecks

## Configuration

### Environment Setup

```typescript
// src/environments/environment.ts
export const environment = {
  sentry: {
    dsn: 'https://YOUR_DSN@ingest.us.sentry.io/YOUR_PROJECT_ID',
    environment: 'development',
    tracesSampleRate: 1.0,      // 100% in dev
    replaysSessionSampleRate: 0.5,  // 50% general sessions
    replaysOnErrorSampleRate: 1.0   // 100% on errors
  }
};
```

### Integration Points

1. **Main Application** (`src/main.ts`):
   - Sentry SDK initialization
   - Browser tracing setup
   - Session replay configuration

2. **Error Handler** (`src/app/core/services/sentry-error-handler.service.ts`):
   - Custom error handling logic
   - User-friendly error messages
   - Special handling for Angular errors

3. **App Config** (`src/app/app.config.ts`):
   - Sentry trace service provider
   - Global error handler override

## Testing Errors

### Debug Page

Navigate to `/debug/sentry-test` to access the error testing interface:

- **Throw Unhandled Error**: Simulates a basic JavaScript error
- **Throw Type Error**: Tests null reference errors
- **Throw Async Error**: Tests asynchronous error handling
- **Send Test Message**: Sends an info-level message
- **Send Custom Error**: Tests errors with custom context

### Verifying Integration

1. Click any test button on the debug page
2. Check browser DevTools Network tab for requests to `ingest.us.sentry.io`
3. Visit your Sentry dashboard to see captured errors
4. Verify stack traces show original TypeScript code

## Error Handling Best Practices

### 1. Structured Error Handling

```typescript
try {
  // Risky operation
  await this.apiService.fetchData();
} catch (error) {
  // Will be automatically captured by Sentry
  console.error('Failed to fetch data:', error);
  
  // Add custom context
  Sentry.withScope(scope => {
    scope.setContext('api_call', {
      endpoint: '/api/data',
      userId: this.currentUser.id
    });
    Sentry.captureException(error);
  });
}
```

### 2. Custom Error Messages

```typescript
// Add user-friendly messages while preserving technical details
if (error.code === 'permission-denied') {
  this.notificationService.error('You don\'t have permission to perform this action');
  // Technical error still goes to Sentry
}
```

### 3. Error Context

```typescript
// Add relevant context for debugging
Sentry.setUser({
  id: user.uid,
  email: user.email,
  role: user.role
});

Sentry.setTag('feature', 'contractor-management');
Sentry.setContext('action', {
  type: 'form_submission',
  form: 'contractor_onboarding'
});
```

## Production Monitoring

### Dashboard Access

1. Log into [Sentry.io](https://sentry.io)
2. Navigate to your organization
3. Select the FibreFlow project

### Key Metrics to Monitor

- **Error Rate**: Errors per minute/hour
- **Affected Users**: Unique users experiencing errors
- **Performance Score**: Based on Web Vitals
- **Crash Free Rate**: Percentage of error-free sessions

### Alert Configuration

Set up alerts for:
- New error types
- Error rate spikes
- Performance degradation
- Specific error patterns

## Troubleshooting

### Common Issues

1. **Errors Not Appearing**:
   - Check DSN configuration
   - Verify network connectivity
   - Check browser ad blockers

2. **Missing Source Maps**:
   - Ensure production builds include source maps
   - Verify source map upload during deployment

3. **Performance Impact**:
   - Adjust sampling rates if needed
   - Disable session replay for specific pages

## Privacy and Security

- **PII Scrubbing**: Sensitive data is automatically redacted
- **GDPR Compliance**: User consent for session replay
- **Data Retention**: 30-day default retention
- **Encryption**: All data transmitted via HTTPS

## Alternative: Firebase Crashlytics

While Sentry is implemented, Firebase Crashlytics is available as a free alternative:

**Pros**:
- Completely free
- Native Firebase integration
- Good for basic crash reporting

**Cons**:
- Limited web support
- No session replay
- Basic error context
- No performance monitoring

To implement Crashlytics instead, see the [Firebase Crashlytics documentation](https://firebase.google.com/docs/crashlytics).

## Resources

- [Sentry Angular Documentation](https://docs.sentry.io/platforms/javascript/guides/angular/)
- [Sentry Dashboard](https://sentry.io)
- [Error Testing Page](/debug/sentry-test)
- [Setup Guide](../SENTRY_SETUP.md)